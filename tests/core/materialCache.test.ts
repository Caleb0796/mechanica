import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acquireMaterial,
  disposeMaterialCache,
  getMaterial,
  materialCacheStats,
  materialVariantKey,
  sweepMaterialCache,
} from "../../src/core/materialCache";
import {
  applyStandardMaterialPresentation,
  standardMaterial,
} from "../../src/core/materials";

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
      textureVariant: "none",
    };
    const variant = materialVariantKey(presentation);
    const first = getMaterial("bronze", variant, () =>
      standardMaterial("bronze", presentation),
    );
    const second = getMaterial("bronze", variant, () =>
      standardMaterial("bronze", {
        color: "#ffffff",
        textureVariant: "none",
      }),
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

  it("keeps vertex-colored bronze separate from ordinary bronze", () => {
    const plain = { textureVariant: "bronze:fresh" };
    const colored = { ...plain, vertexColors: true };
    const plainKey = materialVariantKey(plain);
    const coloredKey = materialVariantKey(colored);
    const plainMaterial = getMaterial("bronze", plainKey, () =>
      standardMaterial("bronze", plain),
    );
    const coloredMaterial = getMaterial("bronze", coloredKey, () =>
      standardMaterial("bronze", colored),
    );

    expect(coloredKey).not.toBe(plainKey);
    expect(coloredKey).not.toBe(
      materialVariantKey({ ...plain, vertexColors: false }),
    );
    expect(coloredMaterial).not.toBe(plainMaterial);
    expect(plainMaterial.vertexColors).toBe(false);
    expect(coloredMaterial.vertexColors).toBe(true);
    expect(coloredMaterial.map).not.toBeNull();
    expect(coloredMaterial.map).toBe(plainMaterial.map);
    expect(coloredMaterial.normalMap).toBe(plainMaterial.normalMap);
    expect(coloredMaterial.roughnessMap).toBe(plainMaterial.roughnessMap);
    expect(coloredMaterial.color.getHexString()).toBe("ffffff");
    expect(coloredMaterial.metalness).toBe(plainMaterial.metalness);
    expect(coloredMaterial.roughness).toBe(plainMaterial.roughness);
    expect(getMaterial("bronze", coloredKey)).toBe(coloredMaterial);
  });

  it("recompiles only when vertex-color support changes on a textured material", () => {
    const material = standardMaterial("bronze");
    const map = material.map;
    const initialVersion = material.version;

    applyStandardMaterialPresentation(material, { vertexColors: true }, false);
    expect(material.vertexColors).toBe(true);
    expect(material.version).toBe(initialVersion + 1);

    applyStandardMaterialPresentation(material, { vertexColors: true }, false);
    expect(material.version).toBe(initialVersion + 1);

    applyStandardMaterialPresentation(material, { roughness: 0.1 }, false);
    expect(material.vertexColors).toBe(true);
    expect(material.roughness).toBe(1);

    applyStandardMaterialPresentation(material, { vertexColors: false }, false);
    expect(material.vertexColors).toBe(false);
    expect(material.version).toBe(initialVersion + 2);
    expect(material.map).toBe(map);
    material.dispose();
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
