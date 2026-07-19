import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MachineGeometryCache,
  machineGeometryCache,
} from "../../src/core/geometryCache";
import bellows from "../../src/machines/bellows/build";
import {
  CompareGeometryCache,
  compareGeometryCache,
} from "../../src/ui/compare/geometryCache";

describe("machine geometry cache", () => {
  beforeEach(() => {
    machineGeometryCache.dispose();
  });

  afterEach(() => {
    machineGeometryCache.dispose();
  });

  it("retains immutable geometry across sequential rendering modes", () => {
    const cache = new MachineGeometryCache();
    const part = bellows.spec.parts.find(
      (candidate) => candidate.geometry.type === "shaft",
    );
    if (!part) throw new Error("Bellows shaft fixture is missing");

    const viewer = cache.prepare(bellows, part.geometry);
    const viewerRelease = viewer.retain();
    const dispose = vi.spyOn(viewer.geometry, "dispose");
    viewerRelease();

    const story = cache.prepare(bellows, part.geometry);
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
    const part = bellows.spec.parts.find(
      (candidate) => candidate.geometry.type === "shaft",
    );
    if (!part) throw new Error("Bellows shaft fixture is missing");

    const abandoned = cache.prepare(bellows, part.geometry);
    const committed = cache.prepare(bellows, part.geometry);
    const dispose = vi.spyOn(abandoned.geometry, "dispose");
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
    const part = bellows.spec.parts.find(
      (candidate) => candidate.id === "rocker",
    );
    if (!part) throw new Error("Bellows rocker fixture is missing");

    const first = cache.prepare(bellows, part.geometry, {
      consumerKey: "viewer",
    });
    const second = cache.prepare(bellows, part.geometry, {
      consumerKey: "compare",
    });
    const firstDispose = vi.spyOn(first.geometry, "dispose");
    const secondDispose = vi.spyOn(second.geometry, "dispose");
    const firstRelease = first.retain();
    const secondRelease = second.retain();

    expect(first.geometry.userData.mechanicaUpdate).toBeTypeOf("function");
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
    const part = bellows.spec.parts.find(
      (candidate) => candidate.id === "rocker",
    );
    if (!part) throw new Error("Bellows rocker fixture is missing");

    for (let mount = 0; mount < 1_000; mount += 1) {
      const resource = cache.prepare(bellows, part.geometry, {
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
    const part = bellows.spec.parts.find(
      (candidate) => candidate.id === "rocker",
    );
    if (!part) throw new Error("Bellows rocker fixture is missing");

    expect(() => cache.prepare(bellows, part.geometry)).toThrow(
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
    const part = bellows.spec.parts.find(
      (candidate) => candidate.geometry.type === "shaft",
    );
    if (!part) throw new Error("Bellows shaft fixture is missing");
    const replacementModule = { ...bellows };

    const first = cache.prepare(bellows, part.geometry);
    const second = cache.prepare(replacementModule, part.geometry);

    expect(second.geometry).not.toBe(first.geometry);
    expect(cache.stats().entries).toBe(2);
    expect(cache.dispose()).toBe(2);
  });

  it("keeps semantic variants separate while sharing each variant", () => {
    const cache = new MachineGeometryCache();
    const part = bellows.spec.parts.find(
      (candidate) => candidate.geometry.type === "shaft",
    );
    if (!part) throw new Error("Bellows shaft fixture is missing");

    const primitive = cache.prepare(bellows, part.geometry);
    const semantic = cache.prepare(bellows, part.geometry, {
      factory: () => primitive.geometry.clone(),
      variant: "semantic:fixture",
    });
    const repeated = cache.prepare(bellows, part.geometry, {
      factory: () => primitive.geometry.clone(),
      variant: "semantic:fixture",
    });

    expect(semantic.geometry).not.toBe(primitive.geometry);
    expect(repeated.geometry).toBe(semantic.geometry);
    expect(cache.stats().entries).toBe(2);
    expect(cache.dispose()).toBe(2);
  });

  it("only sweeps idle entries", () => {
    const cache = new MachineGeometryCache();
    const idle = cache.prepare(bellows, { type: "box", size: [1, 1, 1] });
    const active = cache.prepare(bellows, { type: "box", size: [2, 1, 1] });
    const idleDispose = vi.spyOn(idle.geometry, "dispose");
    const activeDispose = vi.spyOn(active.geometry, "dispose");
    const release = active.retain();

    expect(cache.sweep(0)).toBe(1);
    expect(idleDispose).toHaveBeenCalledOnce();
    expect(activeDispose).not.toHaveBeenCalled();
    release();
    expect(cache.sweep(0)).toBe(1);
    expect(activeDispose).toHaveBeenCalledOnce();
  });

  it("keeps the compare compatibility exports on the shared core cache", () => {
    expect(compareGeometryCache).toBe(machineGeometryCache);
    expect(CompareGeometryCache).toBe(MachineGeometryCache);
  });
});
