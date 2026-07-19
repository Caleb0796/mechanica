import * as THREE from "three";

import type { PartDef } from "../sim/types";
import { defaultTextureVariant, getMaterialTextureSet } from "./textures";

export interface StandardMaterialPresentation {
  alphaTest?: number;
  color?: THREE.ColorRepresentation;
  depthWrite?: boolean;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  metalness?: number;
  opacity?: number;
  roughness?: number;
  shaderFeatureHash?: string;
  textureVariant?: string;
  transparent?: boolean;
}

export function applyStandardMaterialPresentation(
  material: THREE.MeshStandardMaterial,
  presentation?: StandardMaterialPresentation,
  applySurface = true,
): void {
  if (!presentation) return;
  if (applySurface && presentation.color !== undefined) {
    material.color.set(presentation.color);
  }
  if (presentation.emissive !== undefined) {
    material.emissive.set(presentation.emissive);
  }
  if (Number.isFinite(presentation.emissiveIntensity)) {
    material.emissiveIntensity = presentation.emissiveIntensity!;
  }
  if (applySurface && Number.isFinite(presentation.metalness)) {
    material.metalness = presentation.metalness!;
  }
  if (Number.isFinite(presentation.opacity)) {
    material.opacity = presentation.opacity!;
  }
  if (applySurface && Number.isFinite(presentation.roughness)) {
    material.roughness = presentation.roughness!;
  }
  if (Number.isFinite(presentation.alphaTest)) {
    material.alphaTest = presentation.alphaTest!;
  }
  if (typeof presentation.depthWrite === "boolean") {
    material.depthWrite = presentation.depthWrite;
  }
  if (typeof presentation.transparent === "boolean") {
    material.transparent = presentation.transparent;
  }
}

export function standardMaterial(
  kind: PartDef["material"],
  ...presentations: Array<StandardMaterialPresentation | undefined>
): THREE.MeshStandardMaterial {
  let material: THREE.MeshStandardMaterial;
  switch (kind) {
    case "wood":
      material = new THREE.MeshStandardMaterial({
        color: 0x704526,
        roughness: 0.8,
      });
      break;
    case "bronze":
      material = new THREE.MeshStandardMaterial({
        color: 0xb08d57,
        metalness: 0.9,
        roughness: 0.35,
      });
      break;
    case "iron":
      material = new THREE.MeshStandardMaterial({
        color: 0x3b3f42,
        metalness: 0.8,
        roughness: 0.55,
      });
      break;
    case "silver":
      material = new THREE.MeshStandardMaterial({
        color: 0xf1f3f4,
        metalness: 1,
        roughness: 0.22,
      });
      break;
    case "silk":
      material = new THREE.MeshStandardMaterial({
        color: 0xe8ded0,
        roughness: 0.65,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      });
      break;
    case "clay":
      material = new THREE.MeshStandardMaterial({
        color: 0x9b5f3f,
        roughness: 0.9,
      });
      break;
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unsupported material: ${String(exhaustive)}`);
    }
  }

  let textureVariant: string = defaultTextureVariant(kind);
  for (const presentation of presentations) {
    if (presentation?.textureVariant !== undefined) {
      textureVariant = presentation.textureVariant;
    }
  }
  const textures = getMaterialTextureSet(textureVariant);
  material.userData.mechanicaTextureVariant = textureVariant;
  if (textures) {
    material.alphaMap = textures.alphaMap ?? null;
    material.alphaTest = Math.max(material.alphaTest, textures.alphaTest ?? 0);
    material.color.set(0xffffff);
    material.map = textures.map;
    material.metalness = textures.metalness;
    material.normalMap = textures.normalMap;
    material.normalScale.setScalar(textures.normalScale);
    material.roughness = 1;
    material.roughnessMap = textures.roughnessMap;
    material.needsUpdate = true;
  }
  for (const presentation of presentations) {
    applyStandardMaterialPresentation(material, presentation, !textures);
  }
  return material;
}
