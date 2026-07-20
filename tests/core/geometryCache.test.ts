import { BoxGeometry } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MachineGeometryCache,
  machineGeometryCache,
} from "../../src/core/geometryCache";
import {
  partGeometryEntries,
  singlePartGeometry,
} from "../../src/core/primitives";
import type { GeometryDef, MachineModule } from "../../src/sim/types";
import demo from "../../src/ui/demo";
import {
  CompareGeometryCache,
  compareGeometryCache,
} from "../../src/ui/compare/geometryCache";

const statefulGeometry = {
  type: "custom",
  builder: "statefulFixture",
  params: {},
} as const satisfies GeometryDef;
const fixtureModule: MachineModule = {
  ...demo,
  customBuilders: {
    ...demo.customBuilders,
    statefulFixture: () => {
      const geometry = new BoxGeometry(1, 1, 1);
      geometry.userData.mechanicaUpdate = () => undefined;
      return geometry;
    },
  },
};
const shaftPart = fixtureModule.spec.parts.find(
  (candidate) => candidate.geometry.type === "shaft",
);
if (!shaftPart) throw new Error("Shaft fixture is missing");

describe("machine geometry cache", () => {
  beforeEach(() => {
    machineGeometryCache.dispose();
  });

  afterEach(() => {
    machineGeometryCache.dispose();
  });

  it("retains immutable geometry across sequential rendering modes", () => {
    const cache = new MachineGeometryCache();
    const viewer = cache.prepare(fixtureModule, shaftPart.geometry);
    const viewerRelease = viewer.retain();
    const dispose = vi.spyOn(singlePartGeometry(viewer.geometry), "dispose");
    viewerRelease();

    const story = cache.prepare(fixtureModule, shaftPart.geometry);
    const storyRelease = story.retain();

    expect(story.geometry).toBe(viewer.geometry);
    expect(dispose).not.toHaveBeenCalled();
    expect(cache.stats()).toEqual({
      activeRefs: 1,
      entries: 1,
      idleEntries: 0,
    });
    storyRelease();
    expect(cache.sweep(0)).toBe(1);
    expect(dispose).toHaveBeenCalledOnce();
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 0,
      idleEntries: 0,
    });
  });

  it("keeps abandoned StrictMode preparations idle and sweepable", () => {
    const cache = new MachineGeometryCache();
    const abandoned = cache.prepare(fixtureModule, shaftPart.geometry);
    const committed = cache.prepare(fixtureModule, shaftPart.geometry);
    const dispose = vi.spyOn(singlePartGeometry(abandoned.geometry), "dispose");
    const release = committed.retain();

    expect(committed.geometry).toBe(abandoned.geometry);
    expect(dispose).not.toHaveBeenCalled();
    expect(cache.stats()).toEqual({
      activeRefs: 1,
      entries: 1,
      idleEntries: 0,
    });
    expect(cache.sweep(0)).toBe(0);
    release();
    release();
    expect(cache.sweep(0)).toBe(1);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps stateful mechanicaUpdate geometry private to each consumer", () => {
    const cache = new MachineGeometryCache();
    const first = cache.prepare(fixtureModule, statefulGeometry, {
      consumerKey: "viewer",
    });
    const second = cache.prepare(fixtureModule, statefulGeometry, {
      consumerKey: "compare",
    });
    const firstGeometry = singlePartGeometry(first.geometry);
    const secondGeometry = singlePartGeometry(second.geometry);
    const firstDispose = vi.spyOn(firstGeometry, "dispose");
    const secondDispose = vi.spyOn(secondGeometry, "dispose");
    const firstRelease = first.retain();
    const secondRelease = second.retain();

    expect(firstGeometry.userData.mechanicaUpdate).toBeTypeOf("function");
    expect(second.geometry).not.toBe(first.geometry);
    expect(cache.stats()).toEqual({
      activeRefs: 2,
      entries: 2,
      idleEntries: 0,
    });
    firstRelease();
    firstRelease();
    secondRelease();
    expect(cache.sweep(0)).toBe(2);
    expect(firstDispose).toHaveBeenCalledOnce();
    expect(secondDispose).toHaveBeenCalledOnce();
  });

  it("reuses stateful geometry when a stable consumer remounts", () => {
    const cache = new MachineGeometryCache();
    for (let mount = 0; mount < 1_000; mount += 1) {
      const resource = cache.prepare(fixtureModule, statefulGeometry, {
        consumerKey: "viewer:rocker",
      });
      resource.retain()();
    }

    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
  });

  it("rejects stateful geometry without a stable consumer key", () => {
    const cache = new MachineGeometryCache();
    expect(() => cache.prepare(fixtureModule, statefulGeometry)).toThrow(
      "Stateful geometry requires a stable consumer key",
    );
    expect(cache.stats()).toEqual({
      activeRefs: 0,
      entries: 0,
      idleEntries: 0,
    });
  });

  it("does not alias separate module instances with the same slug", () => {
    const cache = new MachineGeometryCache();
    const replacementModule = { ...fixtureModule };

    const first = cache.prepare(fixtureModule, shaftPart.geometry);
    const second = cache.prepare(replacementModule, shaftPart.geometry);

    expect(second.geometry).not.toBe(first.geometry);
    expect(cache.stats().entries).toBe(2);
    expect(cache.dispose()).toBe(2);
  });

  it("keeps semantic variants separate while sharing each variant", () => {
    const cache = new MachineGeometryCache();
    const primitive = cache.prepare(fixtureModule, shaftPart.geometry);
    const primitiveGeometry = singlePartGeometry(primitive.geometry);
    const semantic = cache.prepare(fixtureModule, shaftPart.geometry, {
      factory: () => primitiveGeometry.clone(),
      variant: "semantic:fixture",
    });
    const repeated = cache.prepare(fixtureModule, shaftPart.geometry, {
      factory: () => primitiveGeometry.clone(),
      variant: "semantic:fixture",
    });

    expect(semantic.geometry).not.toBe(primitive.geometry);
    expect(repeated.geometry).toBe(semantic.geometry);
    expect(cache.stats().entries).toBe(2);
    expect(cache.dispose()).toBe(2);
  });

  it("only sweeps idle entries", () => {
    const cache = new MachineGeometryCache();
    const idle = cache.prepare(fixtureModule, { type: "box", size: [1, 1, 1] });
    const active = cache.prepare(fixtureModule, { type: "box", size: [2, 1, 1] });
    const idleDispose = vi.spyOn(singlePartGeometry(idle.geometry), "dispose");
    const activeDispose = vi.spyOn(
      singlePartGeometry(active.geometry),
      "dispose",
    );
    const release = active.retain();

    expect(cache.sweep(0)).toBe(1);
    expect(idleDispose).toHaveBeenCalledOnce();
    expect(activeDispose).not.toHaveBeenCalled();
    release();
    expect(cache.sweep(0)).toBe(1);
    expect(activeDispose).toHaveBeenCalledOnce();
  });

  it("retains and disposes a composite as one cache resource", () => {
    const cache = new MachineGeometryCache();
    const compositeModule = {
      ...fixtureModule,
      customBuilders: {
        ...fixtureModule.customBuilders,
        cacheComposite: () => [
          new BoxGeometry(1, 1, 1),
          new BoxGeometry(0.5, 0.5, 0.5),
        ],
      },
    };
    const resource = cache.prepare(compositeModule, {
      type: "custom",
      builder: "cacheComposite",
      params: {},
    });
    const entries = partGeometryEntries(resource.geometry);
    const disposals = entries.map((entry) => vi.spyOn(entry, "dispose"));
    const release = resource.retain();

    expect(entries).toHaveLength(2);
    expect(cache.sweep(0)).toBe(0);
    release();
    expect(cache.sweep(0)).toBe(1);
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps the compare compatibility exports on the shared core cache", () => {
    expect(compareGeometryCache).toBe(machineGeometryCache);
    expect(CompareGeometryCache).toBe(MachineGeometryCache);
  });
});
