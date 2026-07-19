import type { BufferGeometry } from "three";

import type {
  GeometryDef,
  MachineModule,
  MachineSpec,
  PartDef,
} from "../sim/types";
import {
  type MachineGeometryCache,
  machineGeometryCache,
} from "./geometryCache";

const SLICE_BUDGET_MS = 8;
const defaultWarmupOwners = new WeakMap<
  MachineGeometryCache,
  WeakMap<MachineModule, object>
>();

export interface GeometryWarmupProgress {
  built: number;
  total: number;
}

export interface GeometryWarmupResult extends GeometryWarmupProgress {
  status: "cancelled" | "completed";
}

export interface GeometryWarmupPartOptions {
  factory?: () => BufferGeometry;
  variant?: string;
}

export type GeometryWarmupScheduler = (callback: () => void) => () => void;

export interface GeometryWarmupOptions {
  cache?: MachineGeometryCache;
  clock?: () => number;
  /** Omit for the exclusive stable viewer owner; pass a scope for deliberate concurrent sharing. */
  consumerScope?: string;
  customSizeProxy?: (
    definition: Extract<GeometryDef, { type: "custom" }>,
  ) => number;
  geometryOptions?: (part: PartDef) => GeometryWarmupPartOptions | undefined;
  scheduler?: GeometryWarmupScheduler;
}

export interface GeometryWarmupController {
  cancel: () => void;
  done: Promise<GeometryWarmupResult>;
  release: () => void;
}

interface RankedPart {
  index: number;
  part: PartDef;
  size: number;
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.abs(value) : 0;
}

function gridSizeProxy(params: Record<string, number>): number {
  const count = Math.floor(positive(params.count ?? 0));
  const columns = Math.floor(positive(params.columns ?? 0));
  const cell = positive(params.cell ?? 0);
  const gap = positive(params.gap ?? 0);
  if (count < 1 || columns < 1 || cell === 0) return 0;
  const usedColumns = Math.min(count, columns);
  const rows = Math.ceil(count / columns);
  const width = usedColumns * cell + Math.max(0, usedColumns - 1) * gap;
  const depth = rows * cell + Math.max(0, rows - 1) * gap;
  return Math.max(width, depth);
}

function pathSizeProxy(params: Record<string, number>): number {
  const spreadEntries = Object.entries(params).filter(([key]) =>
    /spread$/i.test(key),
  );
  const run = positive(params.run ?? 0);
  const rise = positive(params.rise ?? 0);
  if ((run === 0 && rise === 0) || spreadEntries.length === 0) return 0;
  const waterSpread = positive(params.waterSpread ?? 0);
  const drumSpread = positive(params.drumSpread ?? 0);
  const unnamedSpreads = spreadEntries
    .filter(([key]) => !/^(water|drum)spread$/i.test(key))
    .map(([, value]) => positive(value));
  const fallbackSpread = Math.max(0, ...unnamedSpreads);
  const lateralSpread = waterSpread || fallbackSpread;
  const elevatedSpread = drumSpread || fallbackSpread;
  return (
    Math.hypot(run, rise + elevatedSpread, lateralSpread) +
    positive(params.radius ?? 0) * 2
  );
}

function acquireDefaultWarmupOwnership(
  cache: MachineGeometryCache,
  module: MachineModule,
): () => void {
  let moduleOwners = defaultWarmupOwners.get(cache);
  if (!moduleOwners) {
    moduleOwners = new WeakMap();
    defaultWarmupOwners.set(cache, moduleOwners);
  }
  if (moduleOwners.has(module)) {
    throw new Error(
      "Default geometry warmup already owns this cache and module; pass an explicit consumerScope for concurrent warmup",
    );
  }
  const owner = {};
  moduleOwners.set(module, owner);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (moduleOwners?.get(module) === owner) moduleOwners.delete(module);
  };
}

export function geometrySizeProxy(
  definition: GeometryDef,
  customSizeProxy?: (
    definition: Extract<GeometryDef, { type: "custom" }>,
  ) => number,
): number {
  switch (definition.type) {
    case "gear":
      return Math.max(
        positive(definition.module * (definition.teeth + 2)),
        positive(definition.thickness),
      );
    case "shaft":
      return Math.max(
        positive(definition.radius) * 2,
        positive(definition.length),
      );
    case "beam":
    case "box":
    case "scoop":
      return Math.max(...definition.size.map(positive));
    case "wheel":
      return Math.max(
        positive(definition.radius) * 2,
        positive(definition.width),
      );
    case "shell":
      return positive(definition.radius) * 2;
    case "ring":
      return 2 * (positive(definition.radius) + positive(definition.tube));
    case "link":
      return Math.max(positive(definition.length), positive(definition.width));
    case "custom": {
      if (customSizeProxy) return positive(customSizeProxy(definition));
      const gridSize = gridSizeProxy(definition.params);
      const pathSize = pathSizeProxy(definition.params);
      const dimensions = Object.entries(definition.params)
        .filter(
          ([key]) =>
            /(radius|diameter|length|width|height|depth|size|span|thickness|tube)/i.test(
              key,
            ) &&
            !/(count|columns?|rows?|segments?|index|phase|steps?|teeth)/i.test(
              key,
            ),
        )
        .map(([key, value]) => {
          const normalizedKey = key.replace(/[^a-z]/gi, "");
          const extent = positive(value);
          const halfExtent = /half(width|height|depth|length|size|span)$/i.test(
            normalizedKey,
          );
          return (
            extent * (/radius$/i.test(normalizedKey) || halfExtent ? 2 : 1)
          );
        });
      return Math.max(gridSize, pathSize, ...dimensions);
    }
    default: {
      const exhaustive: never = definition;
      return exhaustive;
    }
  }
}

function rankedParts(
  spec: MachineSpec,
  customSizeProxy?: GeometryWarmupOptions["customSizeProxy"],
): RankedPart[] {
  return spec.parts
    .map((part, index) => ({
      index,
      part,
      size: geometrySizeProxy(part.geometry, customSizeProxy),
    }))
    .sort((left, right) => right.size - left.size || left.index - right.index);
}

const defaultClock = (): number => performance.now();

const defaultScheduler: GeometryWarmupScheduler = (callback) => {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(callback, { timeout: 16 });
    return () => cancelIdleCallback(handle);
  }
  const handle = setTimeout(callback, 0);
  return () => clearTimeout(handle);
};

export function warmMachine(
  module: MachineModule,
  spec: MachineSpec,
  onProgress: (progress: GeometryWarmupProgress) => void,
  options: GeometryWarmupOptions = {},
): GeometryWarmupController {
  const cache = options.cache ?? machineGeometryCache;
  const clock = options.clock ?? defaultClock;
  const geometryOptions = options.geometryOptions;
  const parts = rankedParts(spec, options.customSizeProxy);
  const releaseDefaultOwnership =
    options.consumerScope === undefined
      ? acquireDefaultWarmupOwnership(cache, module)
      : () => undefined;
  const consumerScope = options.consumerScope ?? "viewer";
  const scheduler = options.scheduler ?? defaultScheduler;
  const releases: Array<() => void> = [];
  let built = 0;
  let cancelScheduled: (() => void) | undefined;
  let leasesReleased = false;
  let settled = false;
  let state: "cancelled" | "completed" | "failed" | "running" = "running";
  let resolveDone: (result: GeometryWarmupResult) => void = () => undefined;
  let rejectDone: (reason: unknown) => void = () => undefined;
  const done = new Promise<GeometryWarmupResult>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const settle = (result: GeometryWarmupResult): void => {
    if (settled) return;
    settled = true;
    resolveDone(result);
  };
  const releaseLeases = (): void => {
    if (leasesReleased) return;
    leasesReleased = true;
    for (const release of releases.splice(0)) release();
  };
  const cancelPendingSlice = (): void => {
    const cancelPending = cancelScheduled;
    cancelScheduled = undefined;
    if (!cancelPending) return;
    try {
      cancelPending();
    } catch {
      return;
    }
  };
  const cancel = (): void => {
    if (state === "running") {
      state = "cancelled";
      cancelPendingSlice();
      releaseLeases();
      releaseDefaultOwnership();
      settle({ built, status: "cancelled", total: parts.length });
      return;
    }
    releaseLeases();
    releaseDefaultOwnership();
  };
  const release = (): void => {
    if (state === "running") {
      cancel();
      return;
    }
    releaseLeases();
    releaseDefaultOwnership();
  };
  const fail = (error: unknown): void => {
    if (state !== "running") return;
    state = "failed";
    cancelPendingSlice();
    releaseLeases();
    releaseDefaultOwnership();
    if (settled) return;
    settled = true;
    rejectDone(error);
  };

  const scheduleSlice = (): void => {
    if (state !== "running") return;
    try {
      cancelScheduled = scheduler(runSlice);
    } catch (error) {
      fail(error);
    }
  };

  const runSlice = (): void => {
    cancelScheduled = undefined;
    if (state !== "running") return;
    let builtThisSlice = 0;
    try {
      const startedAt = clock();
      while (built < parts.length) {
        if (builtThisSlice > 0 && clock() - startedAt >= SLICE_BUDGET_MS) {
          break;
        }
        const part = parts[built].part;
        const partOptions = geometryOptions?.(part);
        const resource = cache.prepare(module, part.geometry, {
          consumerKey: `${consumerScope}:${part.id}`,
          factory: partOptions?.factory,
          variant: partOptions?.variant,
        });
        const releaseGeometry = resource.retain();
        if (state !== "running" || leasesReleased) {
          releaseGeometry();
          return;
        }
        releases.push(releaseGeometry);
        built += 1;
        builtThisSlice += 1;
        onProgress({ built, total: parts.length });
        if (state !== "running") return;
      }
    } catch (error) {
      fail(error);
      return;
    }

    if (built === parts.length) {
      state = "completed";
      settle({ built, status: "completed", total: parts.length });
      return;
    }
    scheduleSlice();
  };

  try {
    onProgress({ built, total: parts.length });
  } catch (error) {
    fail(error);
    return { cancel, done, release };
  }
  scheduleSlice();

  return { cancel, done, release };
}
