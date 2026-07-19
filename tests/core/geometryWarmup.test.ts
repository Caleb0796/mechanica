import { BoxGeometry } from "three";
import { describe, expect, it, vi } from "vitest";

import { MachineGeometryCache } from "../../src/core/geometryCache";
import {
  type GeometryWarmupScheduler,
  geometrySizeProxy,
  warmMachine,
} from "../../src/core/geometryWarmup";
import { buildPartGeometry } from "../../src/core/primitives";
import bellows from "../../src/machines/bellows/build";
import type {
  GeometryDef,
  MachineModule,
  MachineSpec,
  PartDef,
} from "../../src/sim/types";

const provenance = { kind: "tuice", ref: "geometry-warmup-test" } as const;

function part(id: string, geometry: GeometryDef): PartDef {
  return {
    assemblyStep: 0,
    dimensionProvenance: {},
    geometry,
    id,
    material: "wood",
    name: { en: id, zh: id },
    position: [0, 0, 0],
    provenance,
  };
}

function fixture(
  parts: PartDef[],
  builders: MachineModule["customBuilders"] = {},
): { module: MachineModule; spec: MachineSpec } {
  const spec: MachineSpec = {
    constraints: [],
    cycleRad: Math.PI * 2,
    driveNodes: [],
    parts,
    primaryDrive: "",
    slug: "warmup-fixture",
  };
  return {
    module: {
      customBuilders: builders,
      data: { slug: "bellows" } as MachineModule["data"],
      spec,
    },
    spec,
  };
}

function queuedScheduler(cancellationWorks = true): {
  pending: () => number;
  runNext: () => void;
  scheduler: GeometryWarmupScheduler;
} {
  const queue: Array<{ callback: () => void }> = [];
  return {
    pending: () => queue.length,
    runNext: () => queue.shift()?.callback(),
    scheduler: (callback) => {
      const task = { callback };
      queue.push(task);
      return () => {
        if (cancellationWorks) {
          task.callback = () => undefined;
        }
      };
    },
  };
}

describe("geometry warmup", () => {
  it("ranks declared geometry largest-first and yields at eight milliseconds", async () => {
    const order: string[] = [];
    let now = 0;
    const scheduler = queuedScheduler();
    const { module, spec } = fixture(
      [
        part("small", {
          type: "custom",
          builder: "small",
          params: { radius: 1 },
        }),
        part("large", {
          type: "custom",
          builder: "large",
          params: { radius: 3 },
        }),
        part("medium", {
          type: "custom",
          builder: "medium",
          params: { radius: 2 },
        }),
      ],
      Object.fromEntries(
        ["small", "large", "medium"].map((id) => [
          id,
          () => {
            order.push(id);
            now += 9;
            return new BoxGeometry(1, 1, 1);
          },
        ]),
      ),
    );
    const progress: string[] = [];
    const cache = new MachineGeometryCache();
    const controller = warmMachine(
      module,
      spec,
      ({ built, total }) => progress.push(`${built}/${total}`),
      {
        cache,
        clock: () => now,
        scheduler: scheduler.scheduler,
      },
    );

    expect(order).toEqual([]);
    expect(progress).toEqual(["0/3"]);
    scheduler.runNext();
    expect(order).toEqual(["large"]);
    expect(scheduler.pending()).toBe(1);
    scheduler.runNext();
    expect(order).toEqual(["large", "medium"]);
    expect(scheduler.pending()).toBe(1);
    scheduler.runNext();

    await expect(controller.done).resolves.toEqual({
      built: 3,
      status: "completed",
      total: 3,
    });
    expect(order).toEqual(["large", "medium", "small"]);
    expect(progress).toEqual(["0/3", "1/3", "2/3", "3/3"]);
    controller.release();
    cache.dispose();
  });

  it("keeps equal-size parts in declaration order", async () => {
    const order: string[] = [];
    const scheduler = queuedScheduler();
    const { module, spec } = fixture(
      ["first", "second", "third"].map((id) =>
        part(id, {
          builder: id,
          params: { columns: 100, width: 2 },
          type: "custom",
        }),
      ),
      Object.fromEntries(
        ["first", "second", "third"].map((id) => [
          id,
          () => {
            order.push(id);
            return new BoxGeometry(1, 1, 1);
          },
        ]),
      ),
    );
    const cache = new MachineGeometryCache();
    const controller = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: scheduler.scheduler,
    });

    scheduler.runNext();
    await controller.done;

    expect(order).toEqual(["first", "second", "third"]);
    expect(
      geometrySizeProxy({
        builder: "fixture",
        params: { columns: 1_000, width: 2 },
        type: "custom",
      }),
    ).toBe(2);
    controller.release();
    cache.dispose();
  });

  it("ranks a declared instance grid by physical span", async () => {
    const grid: GeometryDef = {
      builder: "grid",
      params: {
        cell: 0.045,
        columns: 20,
        count: 320,
        gap: 0.008,
        thickness: 0.0025,
      },
      type: "custom",
    };
    const forme: GeometryDef = {
      builder: "forme",
      params: { bar: 0.025, depth: 0.32, height: 0.035, width: 0.46 },
      type: "custom",
    };
    const order: string[] = [];
    const { module, spec } = fixture(
      [part("forme", forme), part("grid", grid)],
      {
        forme: () => {
          order.push("forme");
          return new BoxGeometry(1, 1, 1);
        },
        grid: () => {
          order.push("grid");
          return new BoxGeometry(1, 1, 1);
        },
      },
    );
    const cache = new MachineGeometryCache();
    const scheduler = queuedScheduler();
    const controller = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: scheduler.scheduler,
    });

    expect(geometrySizeProxy(grid)).toBeCloseTo(1.052);
    expect(geometrySizeProxy(forme)).toBe(0.46);
    scheduler.runNext();
    await controller.done;
    expect(order).toEqual(["grid", "forme"]);
    controller.release();
    cache.dispose();
  });

  it("ranks the real Bellows drive cord by its declared path envelope", async () => {
    const driveCord = bellows.spec.parts.find(
      (candidate) => candidate.id === "drive-cord",
    );
    const upright = bellows.spec.parts.find(
      (candidate) =>
        candidate.id.includes("upright") &&
        Math.abs(geometrySizeProxy(candidate.geometry) - 0.6) < 1e-9,
    );
    const wheel = bellows.spec.parts.find(
      (candidate) =>
        candidate.geometry.type === "wheel" &&
        Math.abs(geometrySizeProxy(candidate.geometry) - 0.56) < 1e-9,
    );
    if (!driveCord || driveCord.geometry.type !== "custom") {
      throw new Error("Bellows drive-cord fixture is missing");
    }
    if (!upright || !wheel) {
      throw new Error("Bellows upright or wheel fixture is missing");
    }
    const params = driveCord.geometry.params;
    const declaredSpan =
      Math.hypot(
        params.run,
        params.rise + params.drumSpread,
        params.waterSpread,
      ) +
      params.radius * 2;
    const order: string[] = [];
    const spec = {
      ...bellows.spec,
      parts: [upright, wheel, driveCord],
    };
    const cache = new MachineGeometryCache();
    const scheduler = queuedScheduler();
    const controller = warmMachine(bellows, spec, () => undefined, {
      cache,
      consumerScope: "cord-ranking-test",
      geometryOptions: (candidate) => ({
        factory: () => {
          order.push(candidate.id);
          return buildPartGeometry(candidate.geometry, bellows.customBuilders);
        },
        variant: `cord-ranking-test:${candidate.id}`,
      }),
      scheduler: scheduler.scheduler,
    });

    expect(geometrySizeProxy(driveCord.geometry)).toBeCloseTo(declaredSpan);
    expect(geometrySizeProxy(driveCord.geometry)).toBeGreaterThan(
      geometrySizeProxy(upright.geometry),
    );
    expect(geometrySizeProxy(driveCord.geometry)).toBeGreaterThan(
      geometrySizeProxy(wheel.geometry),
    );
    while (scheduler.pending() > 0) scheduler.runNext();
    await controller.done;
    expect(order[0]).toBe(driveCord.id);
    controller.release();
    cache.dispose();
  });

  it("counts duplicate definitions as parts but builds shared geometry once", async () => {
    const builder = vi.fn(() => new BoxGeometry(1, 1, 1));
    const definition: GeometryDef = {
      type: "custom",
      builder: "duplicate",
      params: { width: 2 },
    };
    const { module, spec } = fixture(
      [part("duplicate-a", definition), part("duplicate-b", definition)],
      { duplicate: builder },
    );
    const cache = new MachineGeometryCache();
    const scheduler = queuedScheduler();
    const progress = vi.fn();
    const controller = warmMachine(module, spec, progress, {
      cache,
      scheduler: scheduler.scheduler,
    });

    scheduler.runNext();
    await controller.done;

    expect(builder).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith({ built: 2, total: 2 });
    expect(cache.stats()).toEqual({
      activeRefs: 2,
      entries: 1,
      idleEntries: 0,
    });
    controller.release();
    controller.release();
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    cache.dispose();
  });

  it("cancels idempotently before the first slice and ignores stale callbacks", async () => {
    const builder = vi.fn(() => new BoxGeometry(1, 1, 1));
    const { module, spec } = fixture(
      [
        part("stateful", {
          type: "custom",
          builder: "stateful",
          params: { width: 1 },
        }),
      ],
      { stateful: builder },
    );
    const scheduler = queuedScheduler(false);
    const progress = vi.fn();
    const controller = warmMachine(module, spec, progress, {
      scheduler: scheduler.scheduler,
    });

    controller.cancel();
    controller.cancel();
    scheduler.runNext();

    await expect(controller.done).resolves.toEqual({
      built: 0,
      status: "cancelled",
      total: 1,
    });
    expect(builder).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledTimes(1);
    const retry = warmMachine(module, spec, () => undefined, {
      scheduler: queuedScheduler().scheduler,
    });
    retry.cancel();
  });

  it("releases default ownership after initial callback and schedule failures", async () => {
    const { module, spec } = fixture([
      part("fixture", { size: [1, 1, 1], type: "box" }),
    ]);
    const cache = new MachineGeometryCache();
    const callbackFailure = warmMachine(
      module,
      spec,
      () => {
        throw new Error("progress unavailable");
      },
      { cache, scheduler: queuedScheduler().scheduler },
    );
    await expect(callbackFailure.done).rejects.toThrow("progress unavailable");

    const scheduleFailure = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: () => {
        throw new Error("initial scheduler unavailable");
      },
    });
    await expect(scheduleFailure.done).rejects.toThrow(
      "initial scheduler unavailable",
    );

    const retry = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: queuedScheduler().scheduler,
    });
    retry.cancel();
  });

  it("stops during progress and releases the geometry already acquired", async () => {
    const cache = new MachineGeometryCache();
    const builder = vi.fn(() => new BoxGeometry(1, 1, 1));
    const { module, spec } = fixture(
      [
        part("first", {
          type: "custom",
          builder: "fixture",
          params: { width: 2 },
        }),
        part("second", {
          type: "custom",
          builder: "fixture",
          params: { width: 1 },
        }),
      ],
      { fixture: builder },
    );
    const scheduler = queuedScheduler(false);
    let controller: ReturnType<typeof warmMachine>;
    controller = warmMachine(
      module,
      spec,
      ({ built }) => {
        if (built === 1) controller.cancel();
      },
      { cache, scheduler: scheduler.scheduler },
    );

    scheduler.runNext();

    await expect(controller.done).resolves.toEqual({
      built: 1,
      status: "cancelled",
      total: 2,
    });
    expect(builder).toHaveBeenCalledOnce();
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    const retry = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: queuedScheduler().scheduler,
    });
    retry.cancel();
    cache.dispose();
  });

  it("rejects a failed build after releasing prior leases", async () => {
    const cache = new MachineGeometryCache();
    const { module, spec } = fixture(
      [
        part("first", {
          type: "custom",
          builder: "first",
          params: { width: 2 },
        }),
        part("failing", {
          type: "custom",
          builder: "failing",
          params: { width: 1 },
        }),
      ],
      {
        failing: () => {
          throw new Error("fixture build failed");
        },
        first: () => new BoxGeometry(1, 1, 1),
      },
    );
    const scheduler = queuedScheduler();
    const controller = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: scheduler.scheduler,
    });

    scheduler.runNext();

    await expect(controller.done).rejects.toThrow("fixture build failed");
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    const retry = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: queuedScheduler().scheduler,
    });
    retry.cancel();
    cache.dispose();
  });

  it("rejects and releases leases when scheduling the next slice fails", async () => {
    const cache = new MachineGeometryCache();
    let now = 0;
    const { module, spec } = fixture(
      [
        part("first", {
          type: "custom",
          builder: "fixture",
          params: { width: 2 },
        }),
        part("second", {
          type: "custom",
          builder: "fixture",
          params: { width: 1 },
        }),
      ],
      {
        fixture: () => {
          now += 9;
          return new BoxGeometry(1, 1, 1);
        },
      },
    );
    let scheduleCount = 0;
    let firstSlice: (() => void) | undefined;
    const controller = warmMachine(module, spec, () => undefined, {
      cache,
      clock: () => now,
      scheduler: (callback) => {
        scheduleCount += 1;
        if (scheduleCount === 2) throw new Error("scheduler unavailable");
        firstSlice = callback;
        return () => undefined;
      },
    });

    firstSlice?.();

    await expect(controller.done).rejects.toThrow("scheduler unavailable");
    controller.cancel();
    controller.release();
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    cache.dispose();
  });

  it("settles cancellation and releases leases when scheduler cleanup throws", async () => {
    const cache = new MachineGeometryCache();
    let now = 0;
    const { module, spec } = fixture(
      [
        part("first", {
          builder: "fixture",
          params: { width: 2 },
          type: "custom",
        }),
        part("second", {
          builder: "fixture",
          params: { width: 1 },
          type: "custom",
        }),
      ],
      {
        fixture: () => {
          now += 9;
          return new BoxGeometry(1, 1, 1);
        },
      },
    );
    const callbacks: Array<() => void> = [];
    const controller = warmMachine(module, spec, () => undefined, {
      cache,
      clock: () => now,
      scheduler: (callback) => {
        callbacks.push(callback);
        return () => {
          throw new Error("cancel failed");
        };
      },
    });
    callbacks.shift()?.();

    expect(() => controller.cancel()).not.toThrow();
    await expect(controller.done).resolves.toEqual({
      built: 1,
      status: "cancelled",
      total: 2,
    });
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    callbacks.shift()?.();
    expect(cache.stats().activeRefs).toBe(0);
    const retry = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: queuedScheduler().scheduler,
    });
    retry.cancel();
    cache.dispose();
  });

  it("rejects a later slice clock error after releasing prior leases", async () => {
    const cache = new MachineGeometryCache();
    let now = 0;
    let clockCalls = 0;
    const { module, spec } = fixture(
      [
        part("first", {
          builder: "fixture",
          params: { width: 2 },
          type: "custom",
        }),
        part("second", {
          builder: "fixture",
          params: { width: 1 },
          type: "custom",
        }),
      ],
      {
        fixture: () => {
          now += 9;
          return new BoxGeometry(1, 1, 1);
        },
      },
    );
    const scheduler = queuedScheduler();
    const controller = warmMachine(module, spec, () => undefined, {
      cache,
      clock: () => {
        clockCalls += 1;
        if (clockCalls === 3) throw new Error("clock unavailable");
        return now;
      },
      scheduler: scheduler.scheduler,
    });
    scheduler.runNext();
    scheduler.runNext();

    await expect(controller.done).rejects.toThrow("clock unavailable");
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    const retry = warmMachine(module, spec, () => undefined, {
      cache,
      scheduler: queuedScheduler().scheduler,
    });
    retry.cancel();
    cache.dispose();
  });

  it("completes an empty machine asynchronously", async () => {
    const { module, spec } = fixture([]);
    const scheduler = queuedScheduler();
    const progress = vi.fn();
    const controller = warmMachine(module, spec, progress, {
      scheduler: scheduler.scheduler,
    });
    let settled = false;
    void controller.done.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    expect(progress).toHaveBeenCalledOnce();
    scheduler.runNext();

    await expect(controller.done).resolves.toEqual({
      built: 0,
      status: "completed",
      total: 0,
    });
  });

  it("re-enters safely after StrictMode cancellation with deterministic stateful keys", async () => {
    const cache = new MachineGeometryCache();
    const builder = vi.fn(() => {
      const geometry = new BoxGeometry(1, 1, 1);
      geometry.userData.mechanicaUpdate = () => undefined;
      return geometry;
    });
    let now = 0;
    const { module, spec } = fixture(
      [
        part("first", {
          type: "custom",
          builder: "stateful",
          params: { width: 2 },
        }),
        part("second", {
          type: "custom",
          builder: "stateful",
          params: { width: 1 },
        }),
      ],
      {
        stateful: () => {
          now += 9;
          return builder();
        },
      },
    );
    const firstScheduler = queuedScheduler(false);
    const first = warmMachine(module, spec, () => undefined, {
      cache,
      clock: () => now,
      consumerScope: "story",
      scheduler: firstScheduler.scheduler,
    });
    firstScheduler.runNext();
    first.cancel();
    await expect(first.done).resolves.toMatchObject({
      built: 1,
      status: "cancelled",
    });
    firstScheduler.runNext();

    const secondScheduler = queuedScheduler();
    const second = warmMachine(module, spec, () => undefined, {
      cache,
      clock: () => now,
      consumerScope: "story",
      scheduler: secondScheduler.scheduler,
    });
    secondScheduler.runNext();
    secondScheduler.runNext();

    await expect(second.done).resolves.toEqual({
      built: 2,
      status: "completed",
      total: 2,
    });
    expect(builder).toHaveBeenCalledTimes(2);
    second.release();
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 2,
      idleEntries: 2,
    });
    cache.dispose();
  });

  it("release cancels an active owner and semantic options reach the shared cache", async () => {
    const cache = new MachineGeometryCache();
    const primitiveBuilder = vi.fn(() => new BoxGeometry(1, 1, 1));
    const semanticBuilder = vi.fn(() => new BoxGeometry(2, 2, 2));
    const { module, spec } = fixture(
      [
        part("figure", {
          type: "custom",
          builder: "primitive",
          params: { width: 1 },
        }),
      ],
      { primitive: primitiveBuilder },
    );
    const scheduler = queuedScheduler(false);
    const first = warmMachine(module, spec, () => undefined, {
      cache,
      consumerScope: "compare:left",
      geometryOptions: () => ({
        factory: semanticBuilder,
        variant: "semantic:figure",
      }),
      scheduler: scheduler.scheduler,
    });

    first.release();
    first.release();
    scheduler.runNext();
    await expect(first.done).resolves.toMatchObject({ status: "cancelled" });
    expect(semanticBuilder).not.toHaveBeenCalled();

    const retryScheduler = queuedScheduler();
    const retry = warmMachine(module, spec, () => undefined, {
      cache,
      consumerScope: "compare:left",
      geometryOptions: () => ({
        factory: semanticBuilder,
        variant: "semantic:figure",
      }),
      scheduler: retryScheduler.scheduler,
    });
    retryScheduler.runNext();
    await retry.done;

    expect(semanticBuilder).toHaveBeenCalledOnce();
    expect(primitiveBuilder).not.toHaveBeenCalled();
    retry.release();
    cache.dispose();
  });

  it("keeps a concurrent immutable lease alive when another owner cancels", async () => {
    const cache = new MachineGeometryCache();
    const builder = vi.fn(() => new BoxGeometry(1, 1, 1));
    const { module, spec } = fixture(
      [
        part("shared", {
          builder: "shared",
          params: { width: 1 },
          type: "custom",
        }),
      ],
      { shared: builder },
    );
    const leftScheduler = queuedScheduler();
    const rightScheduler = queuedScheduler();
    const left = warmMachine(module, spec, () => undefined, {
      cache,
      consumerScope: "compare:left",
      scheduler: leftScheduler.scheduler,
    });
    const right = warmMachine(module, spec, () => undefined, {
      cache,
      consumerScope: "compare:right",
      scheduler: rightScheduler.scheduler,
    });

    leftScheduler.runNext();
    rightScheduler.runNext();
    await Promise.all([left.done, right.done]);
    expect(builder).toHaveBeenCalledOnce();
    expect(cache.stats().activeRefs).toBe(2);

    left.cancel();
    left.cancel();
    expect(cache.stats().activeRefs).toBe(1);
    expect(cache.sweep(0)).toBe(0);
    right.release();
    expect(cache.sweep(0)).toBe(1);
  });

  it("keeps sequential default stateful warmups bounded on one stable scope", async () => {
    const rocker = bellows.spec.parts.find(
      (candidate) => candidate.id === "rocker",
    );
    if (!rocker || rocker.geometry.type !== "custom") {
      throw new Error("Bellows rocker fixture is missing");
    }
    const realBuilder = bellows.customBuilders?.[rocker.geometry.builder];
    if (!realBuilder) throw new Error("Bellows rocker builder is missing");
    const builder = vi.fn((params: Record<string, number>) =>
      realBuilder(params),
    );
    const module: MachineModule = {
      ...bellows,
      customBuilders: {
        ...bellows.customBuilders,
        [rocker.geometry.builder]: builder,
      },
    };
    const spec = { ...bellows.spec, parts: [rocker] };
    const cache = new MachineGeometryCache();

    for (let mount = 0; mount < 100; mount += 1) {
      const scheduler = queuedScheduler();
      const controller = warmMachine(module, spec, () => undefined, {
        cache,
        scheduler: scheduler.scheduler,
      });
      scheduler.runNext();
      await controller.done;
      controller.release();
    }

    expect(builder).toHaveBeenCalledOnce();
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    cache.dispose();
  });

  it("rejects concurrent default ownership until the completed owner releases", async () => {
    const rocker = bellows.spec.parts.find(
      (candidate) => candidate.id === "rocker",
    );
    if (!rocker) throw new Error("Bellows rocker fixture is missing");
    const spec = { ...bellows.spec, parts: [rocker] };
    const cache = new MachineGeometryCache();
    const firstScheduler = queuedScheduler();
    const first = warmMachine(bellows, spec, () => undefined, {
      cache,
      scheduler: firstScheduler.scheduler,
    });

    expect(() =>
      warmMachine(bellows, spec, () => undefined, {
        cache,
        scheduler: queuedScheduler().scheduler,
      }),
    ).toThrow("pass an explicit consumerScope");

    firstScheduler.runNext();
    await first.done;
    expect(() =>
      warmMachine(bellows, spec, () => undefined, {
        cache,
        scheduler: queuedScheduler().scheduler,
      }),
    ).toThrow("pass an explicit consumerScope");
    first.release();

    const retryScheduler = queuedScheduler();
    const retry = warmMachine(bellows, spec, () => undefined, {
      cache,
      scheduler: retryScheduler.scheduler,
    });
    retryScheduler.runNext();
    await retry.done;
    retry.release();

    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
    cache.dispose();
  });

  it("scopes default ownership independently by cache and module", () => {
    const definition: GeometryDef = {
      builder: "fixture",
      params: { width: 1 },
      type: "custom",
    };
    const firstFixture = fixture([part("first", definition)], {
      fixture: () => new BoxGeometry(1, 1, 1),
    });
    const secondFixture = fixture([part("second", definition)], {
      fixture: () => new BoxGeometry(1, 1, 1),
    });
    const firstCache = new MachineGeometryCache();
    const secondCache = new MachineGeometryCache();
    const first = warmMachine(
      firstFixture.module,
      firstFixture.spec,
      () => undefined,
      { cache: firstCache, scheduler: queuedScheduler().scheduler },
    );
    const differentCache = warmMachine(
      firstFixture.module,
      firstFixture.spec,
      () => undefined,
      { cache: secondCache, scheduler: queuedScheduler().scheduler },
    );
    const differentModule = warmMachine(
      secondFixture.module,
      secondFixture.spec,
      () => undefined,
      { cache: firstCache, scheduler: queuedScheduler().scheduler },
    );

    first.cancel();
    differentCache.cancel();
    differentModule.cancel();
  });

  it("computes finite declared-size proxies for every geometry kind", () => {
    const definitions: GeometryDef[] = [
      {
        module: 0.1,
        teeth: 20,
        thickness: 0.2,
        toothStyle: "involute",
        type: "gear",
      },
      { length: 2, radius: 0.1, type: "shaft" },
      { size: [1, 2, 3], type: "beam" },
      { radius: 1, type: "wheel", width: 0.2 },
      { size: [1, 2, 3], type: "scoop" },
      { radius: 1, type: "shell" },
      { radius: 1, tube: 0.1, type: "ring" },
      { length: 2, type: "link", width: 0.1 },
      { size: [1, 2, 3], type: "box" },
      { builder: "fixture", params: { radius: 1 }, type: "custom" },
    ];

    for (const definition of definitions) {
      expect(geometrySizeProxy(definition)).toBeGreaterThan(0);
    }
    expect(geometrySizeProxy(definitions[0])).toBeCloseTo(2.2);
    expect(geometrySizeProxy(definitions[1])).toBe(2);
    expect(geometrySizeProxy(definitions[2])).toBe(3);
    expect(geometrySizeProxy(definitions[3])).toBe(2);
    expect(geometrySizeProxy(definitions[5])).toBe(2);
    expect(geometrySizeProxy(definitions[6])).toBe(2.2);
    expect(geometrySizeProxy(definitions[7])).toBe(2);
    expect(geometrySizeProxy(definitions[9])).toBe(2);
    expect(
      geometrySizeProxy({
        builder: "fixture",
        params: {
          columns: 1_000,
          halfWidth: 3,
          phase: 2_000,
          radiusSegments: 3_000,
        },
        type: "custom",
      }),
    ).toBe(6);
    expect(
      geometrySizeProxy(
        {
          builder: "fixture",
          params: { columns: 100 },
          type: "custom",
        },
        () => 4,
      ),
    ).toBe(4);
  });
});
