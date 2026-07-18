import type * as THREE from "three";

import { buildPartGeometry } from "../../core/primitives";
import type { GeometryDef, MachineModule } from "../../sim/types";

interface CacheEntry {
  geometry: THREE.BufferGeometry;
  users: number;
}

function geometryKey(module: MachineModule, definition: GeometryDef): string {
  return `${module.spec.slug}:${JSON.stringify(definition)}`;
}

export class CompareGeometryCache {
  private readonly entries = new Map<string, CacheEntry>();

  acquire(
    module: MachineModule,
    definition: GeometryDef,
  ): THREE.BufferGeometry {
    const key = geometryKey(module, definition);
    const cached = this.entries.get(key);
    if (cached) {
      cached.users += 1;
      return cached.geometry;
    }
    const geometry = buildPartGeometry(definition, module.customBuilders);
    if (typeof geometry.userData.mechanicaUpdate === "function") {
      return geometry;
    }
    this.entries.set(key, { geometry, users: 1 });
    return geometry;
  }

  release(
    module: MachineModule,
    definition: GeometryDef,
    unsharedGeometry?: THREE.BufferGeometry,
  ): void {
    const key = geometryKey(module, definition);
    const cached = this.entries.get(key);
    if (!cached) {
      unsharedGeometry?.dispose();
      return;
    }
    cached.users -= 1;
    if (cached.users <= 0) {
      cached.geometry.dispose();
      this.entries.delete(key);
    }
  }

  dispose(): void {
    for (const cached of this.entries.values()) cached.geometry.dispose();
    this.entries.clear();
  }
}

export const compareGeometryCache = new CompareGeometryCache();
