import type * as THREE from "three";

import type { GeometryDef, MachineModule } from "../sim/types";
import {
  buildPartGeometry,
  disposePartGeometry,
  partGeometryEntries,
  type PartGeometry,
} from "./primitives";

interface CacheEntry {
  geometry: PartGeometry;
  lastUsed: number;
  users: number;
}

interface PrepareGeometryOptions {
  consumerKey?: string;
  factory?: () => PartGeometry;
  variant?: string;
}

export interface PreparedGeometry {
  geometry: PartGeometry;
  retain: () => () => void;
}

export class MachineGeometryCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly moduleIds = new WeakMap<MachineModule, number>();
  private moduleRevision = 0;
  private useRevision = 0;

  prepare(
    module: MachineModule,
    definition: GeometryDef,
    options: PrepareGeometryOptions = {},
  ): PreparedGeometry {
    const baseKey = this.geometryKey(module, definition, options.variant);
    const consumerKey = options.consumerKey
      ? `${baseKey}\u0000consumer:${options.consumerKey}`
      : undefined;
    const cached =
      (consumerKey ? this.entries.get(consumerKey) : undefined) ??
      this.entries.get(baseKey);
    if (cached) {
      cached.lastUsed = ++this.useRevision;
      const key = this.entries.get(baseKey) === cached ? baseKey : consumerKey;
      if (!key) throw new Error("Prepared geometry cache key is missing");
      return this.preparedResource(key, cached);
    }

    const geometry = options.factory
      ? options.factory()
      : buildPartGeometry(definition, module.customBuilders);
    const stateful = partGeometryEntries(geometry).some(
      (entry) => typeof entry.userData.mechanicaUpdate === "function",
    );
    if (stateful && !consumerKey) {
      disposePartGeometry(geometry);
      throw new Error("Stateful geometry requires a stable consumer key");
    }
    const key = stateful ? consumerKey : baseKey;
    if (!key) throw new Error("Prepared geometry cache key is missing");
    const entry = {
      geometry,
      lastUsed: ++this.useRevision,
      users: 0,
    };
    this.entries.set(key, entry);
    return this.preparedResource(key, entry);
  }

  stats(): { activeRefs: number; entries: number; idleEntries: number } {
    let activeRefs = 0;
    let idleEntries = 0;
    for (const entry of this.entries.values()) {
      activeRefs += entry.users;
      if (entry.users === 0) idleEntries += 1;
    }
    return { activeRefs, entries: this.entries.size, idleEntries };
  }

  sweep(maxEntries = 0): number {
    const candidates = [...this.entries.entries()]
      .filter(([, entry]) => entry.users === 0)
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed);
    let disposed = 0;
    for (const [key, entry] of candidates) {
      if (this.entries.size <= Math.max(0, maxEntries)) break;
      this.entries.delete(key);
      disposePartGeometry(entry.geometry);
      disposed += 1;
    }
    return disposed;
  }

  dispose(): number {
    return this.sweep(0);
  }

  private geometryKey(
    module: MachineModule,
    definition: GeometryDef,
    variant = "primitive",
  ): string {
    let moduleId = this.moduleIds.get(module);
    if (moduleId === undefined) {
      moduleId = ++this.moduleRevision;
      this.moduleIds.set(module, moduleId);
    }
    return `${moduleId}\u0000${variant}\u0000${JSON.stringify(definition)}`;
  }

  private preparedResource(key: string, entry: CacheEntry): PreparedGeometry {
    return {
      geometry: entry.geometry,
      retain: () => {
        if (this.entries.get(key) !== entry) {
          throw new Error("Prepared geometry was evicted before retention");
        }
        entry.users += 1;
        entry.lastUsed = ++this.useRevision;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          if (this.entries.get(key) !== entry) return;
          entry.users = Math.max(0, entry.users - 1);
          entry.lastUsed = ++this.useRevision;
        };
      },
    };
  }
}

export const machineGeometryCache = new MachineGeometryCache();
