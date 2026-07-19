import type { MeshStandardMaterial } from "three";

import type { PartDef } from "../sim/types";
import {
  standardMaterial,
  type StandardMaterialPresentation,
} from "./materials";
import { textureShaderFeatureHash } from "./textures";

type MaterialKind = PartDef["material"];
type MaterialFactory = () => MeshStandardMaterial;

interface MaterialCacheEntry {
  lastUsed: number;
  material: MeshStandardMaterial;
  refs: number;
}

const RETAINED_ENTRY_LIMIT = 96;
const materialCache = new Map<string, MaterialCacheEntry>();
let deferredSweep: ReturnType<typeof setTimeout> | undefined;
let useRevision = 0;

function entryKey(kind: MaterialKind, variantKey: string): string {
  return `${kind}\u0000${variantKey}`;
}

function normalizedPresentation(
  presentation?: StandardMaterialPresentation,
): Record<string, boolean | number | string> {
  if (!presentation) return {};
  const normalized: Record<string, boolean | number | string> = {};
  for (const key of [
    "alphaTest",
    "color",
    "depthWrite",
    "emissive",
    "emissiveIntensity",
    "metalness",
    "opacity",
    "roughness",
    "shaderFeatureHash",
    "textureVariant",
    "transparent",
  ] as const) {
    const value = presentation[key];
    if (
      typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string"
    ) {
      normalized[key] = value;
    }
  }
  if (
    typeof normalized.textureVariant === "string" &&
    normalized.shaderFeatureHash === undefined
  ) {
    normalized.shaderFeatureHash = textureShaderFeatureHash(
      normalized.textureVariant,
    );
  }
  return normalized;
}

function hashVariant(serialized: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}-${serialized.length.toString(36)}`;
}

export function materialVariantKey(
  ...presentations: Array<StandardMaterialPresentation | undefined>
): string {
  const serialized = JSON.stringify(presentations.map(normalizedPresentation));
  return `${hashVariant(serialized)}:${serialized}`;
}

function cancelDeferredSweep(): void {
  if (deferredSweep === undefined) return;
  clearTimeout(deferredSweep);
  deferredSweep = undefined;
}

function scheduleDeferredSweep(): void {
  if (deferredSweep !== undefined) return;
  deferredSweep = setTimeout(() => {
    deferredSweep = undefined;
    const activeRefs = [...materialCache.values()].reduce(
      (total, entry) => total + entry.refs,
      0,
    );
    sweepMaterialCache(activeRefs === 0 ? 0 : RETAINED_ENTRY_LIMIT);
  }, 0);
}

export function getMaterial(
  kind: MaterialKind,
  variantKey: string,
  factory: MaterialFactory = () => standardMaterial(kind),
): MeshStandardMaterial {
  const key = entryKey(kind, variantKey);
  const cached = materialCache.get(key);
  if (cached) {
    cached.lastUsed = ++useRevision;
    return cached.material;
  }

  const material = factory();
  material.userData.mechanicaMaterialCacheKey = key;
  materialCache.set(key, {
    lastUsed: ++useRevision,
    material,
    refs: 0,
  });
  return material;
}

export function acquireMaterial(
  kind: MaterialKind,
  variantKey: string,
  factory?: MaterialFactory,
): { material: MeshStandardMaterial; release: () => void } {
  cancelDeferredSweep();
  const key = entryKey(kind, variantKey);
  const material = getMaterial(kind, variantKey, factory);
  const entry = materialCache.get(key);
  if (!entry) throw new Error(`Material cache entry missing: ${variantKey}`);
  entry.refs += 1;
  entry.lastUsed = ++useRevision;
  if (materialCache.size > RETAINED_ENTRY_LIMIT) {
    sweepMaterialCache(RETAINED_ENTRY_LIMIT);
  }

  let released = false;
  return {
    material,
    release: () => {
      if (released) return;
      released = true;
      entry.refs = Math.max(0, entry.refs - 1);
      entry.lastUsed = ++useRevision;
      scheduleDeferredSweep();
    },
  };
}

export function sweepMaterialCache(maxEntries = RETAINED_ENTRY_LIMIT): number {
  const candidates = [...materialCache.entries()]
    .filter(([, entry]) => entry.refs === 0)
    .sort((left, right) => left[1].lastUsed - right[1].lastUsed);
  let disposed = 0;
  for (const [key, entry] of candidates) {
    if (materialCache.size <= Math.max(0, maxEntries)) break;
    materialCache.delete(key);
    entry.material.dispose();
    disposed += 1;
  }
  return disposed;
}

export function materialCacheStats(): {
  activeRefs: number;
  entries: number;
  idleEntries: number;
} {
  let activeRefs = 0;
  let idleEntries = 0;
  for (const entry of materialCache.values()) {
    activeRefs += entry.refs;
    if (entry.refs === 0) idleEntries += 1;
  }
  return { activeRefs, entries: materialCache.size, idleEntries };
}

export function disposeMaterialCache(): number {
  cancelDeferredSweep();
  return sweepMaterialCache(0);
}
