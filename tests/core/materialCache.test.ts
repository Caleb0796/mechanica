import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acquireMaterial,
  disposeMaterialCache,
  getMaterial,
  materialCacheStats,
  materialVariantKey,
  sweepMaterialCache,
} from "../../src/core/materialCache";
import { standardMaterial } from "../../src/core/materials";

describe("material cache", () => {
  beforeEach(() => {
    disposeMaterialCache();
  });

  afterEach(() => {
    disposeMaterialCache();
  });

  it("shares a configured immutable base material for the same variant", () => {
    const presentation = {
      color: "#b96f35",
      metalness: 0.72,
      roughness: 0.35,
    };
    const variant = materialVariantKey(presentation);
    const first = getMaterial("bronze", variant, () =>
      standardMaterial("bronze", presentation),
    );
    const second = getMaterial("bronze", variant, () =>
      standardMaterial("bronze", { color: "#ffffff" }),
    );

    expect(second).toBe(first);
    expect(first.color.getHexString()).toBe("b96f35");
    expect(first.metalness).toBe(0.72);
    expect(first.roughness).toBe(0.35);
    expect(materialCacheStats()).toEqual({
      activeRefs: 0,
      entries: 1,
      idleEntries: 1,
    });
  });

  it("survives a StrictMode setup-cleanup-setup cycle", () => {
    vi.useFakeTimers();
    const first = acquireMaterial("wood", "strict-mode");
    const dispose = vi.spyOn(first.material, "dispose");

    first.release();
    first.release();
    const second = acquireMaterial("wood", "strict-mode");
    vi.runAllTimers();

    expect(second.material).toBe(first.material);
    expect(sweepMaterialCache(0)).toBe(0);
    expect(dispose).not.toHaveBeenCalled();
    expect(materialCacheStats().activeRefs).toBe(1);

    second.release();
    vi.runAllTimers();
    expect(dispose).toHaveBeenCalledOnce();
    expect(materialCacheStats().entries).toBe(0);
    vi.useRealTimers();
  });

  it("keeps the transient pool flat across twenty state toggles", () => {
    for (let toggle = 0; toggle < 20; toggle += 1) {
      const state = toggle % 2 === 0 ? "spotlight" : "base";
      const lease = acquireMaterial("iron", `state:${state}`);
      lease.release();
    }

    expect(materialCacheStats()).toEqual({
      activeRefs: 0,
      entries: 2,
      idleEntries: 2,
    });
  });

  it("hashes visual and shader-affecting variants deterministically", () => {
    const presentation = {
      alphaTest: 0.4,
      color: "#d4af37",
      shaderFeatureHash: "map+normal+roughness",
      textureVariant: "bronze:gilded",
    };

    expect(materialVariantKey(presentation)).toBe(
      materialVariantKey({ ...presentation }),
    );
    expect(materialVariantKey(presentation)).not.toBe(
      materialVariantKey({ ...presentation, alphaTest: 0.5 }),
    );
  });
});
