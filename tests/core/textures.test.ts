import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { standardMaterial } from "../../src/core/materials";
import {
  disposeMaterialTextureCache,
  getMaterialTextureSet,
  materialTextureStats,
  warmMaterialTextures,
} from "../../src/core/textures";

describe("procedural material textures", () => {
  beforeEach(() => {
    disposeMaterialTextureCache();
  });

  afterEach(() => {
    disposeMaterialTextureCache();
  });

  it("generates and shares a configured CanvasTexture triplet", () => {
    const first = getMaterialTextureSet("wood:dark");
    const second = getMaterialTextureSet("wood:dark");

    expect(second).toBe(first);
    expect(first?.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(first?.map.image).toMatchObject({ height: 512, width: 512 });
    expect(first?.normalMap.image).toMatchObject({ height: 256, width: 256 });
    expect(first?.roughnessMap.image).toMatchObject({
      height: 256,
      width: 256,
    });
    expect(first?.map.wrapS).toBe(THREE.RepeatWrapping);
    expect(first?.map.wrapT).toBe(THREE.RepeatWrapping);
    expect(first?.map.anisotropy).toBe(4);
    expect(first?.map.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(first?.normalMap.colorSpace).toBe(THREE.NoColorSpace);
    expect(materialTextureStats()).toMatchObject({ entries: 1, textures: 3 });
  });

  it("warms every bounded variant and disposes each texture once", () => {
    const stats = warmMaterialTextures();
    const wood = getMaterialTextureSet("wood:dark");
    const dispose = vi.spyOn(wood!.map, "dispose");

    expect(stats.entries).toBe(10);
    expect(stats.textures).toBe(31);
    expect(stats.generationMs).toBeGreaterThan(0);
    expect(disposeMaterialTextureCache()).toBe(31);
    expect(dispose).toHaveBeenCalledOnce();
    expect(disposeMaterialTextureCache()).toBe(0);
  });

  it("keeps flat compare colors separate from corrected PBR palettes", () => {
    const fresh = standardMaterial("bronze", {
      color: "#4e7c66",
      metalness: 0.1,
      roughness: 0.9,
      textureVariant: "bronze:fresh",
    });
    const gilded = standardMaterial("bronze", {
      textureVariant: "bronze:gilded",
    });
    const castIron = standardMaterial("iron", {
      textureVariant: "iron:cast",
    });
    const flat = standardMaterial("bronze", {
      color: "#4e7c66",
      textureVariant: "none",
    });

    expect(fresh.map).not.toBeNull();
    expect(fresh.color.getHexString()).toBe("ffffff");
    expect(fresh.metalness).toBe(0.9);
    expect(fresh.roughness).toBe(1);
    expect(gilded.map).not.toBeNull();
    expect(gilded.metalness).toBe(1);
    expect(castIron.map).not.toBeNull();
    expect(castIron.metalness).toBe(0.8);
    expect(flat.map).toBeNull();
    expect(flat.color.getHexString()).toBe("4e7c66");
  });

  it("keeps silk transparent and equips openwork with alpha testing", () => {
    const silk = standardMaterial("silk", {
      textureVariant: "silk:natural",
    });
    const openwork = standardMaterial("silver", {
      alphaTest: 0.42,
      color: "#78998a",
      metalness: 0.72,
      opacity: 1,
      roughness: 0.38,
      textureVariant: "bronze:openwork",
      transparent: false,
    });

    expect(silk.map).not.toBeNull();
    expect(silk.transparent).toBe(true);
    expect(silk.side).toBe(THREE.DoubleSide);
    expect(openwork.alphaMap).not.toBeNull();
    expect(openwork.alphaTest).toBeGreaterThan(0);
    expect(openwork.color.getHexString()).toBe("ffffff");
    expect(openwork.metalness).toBe(0.84);
    expect(openwork.opacity).toBe(1);
    expect(openwork.roughness).toBe(1);
    expect(openwork.transparent).toBe(false);
  });

  it("shares texture references with transient and instanced materials", () => {
    const material = standardMaterial("wood", {
      textureVariant: "wood:light",
    });
    const transient = material.clone();
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      material,
      2,
    );

    expect(transient.map).toBe(material.map);
    expect(transient.normalMap).toBe(material.normalMap);
    expect(mesh.material).toBe(material);
    expect(mesh.geometry.getAttribute("uv").count).toBe(
      mesh.geometry.getAttribute("position").count,
    );
  });
});
