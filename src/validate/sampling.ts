import type { MachineSpec } from "../sim/types";

const HALF_DEGREE = Math.PI / 360;
const DEFAULT_CYCLE = Math.PI * 2;
const MAX_STEPS = 200_000;
const FUNCTION_PROBE_STEPS = 720;

type GraphLike = {
  ratioBetween(from: string, to: string): number | null;
  setInput(id: string, value: number): void;
  state(): Record<string, number>;
};

export interface SamplingPlan {
  cycleRad: number;
  maxSpeedRatio: number;
  steps: number;
  resolutionDeg: number;
  capped: boolean;
}

function specRecord(spec: MachineSpec): Record<string, unknown> {
  return spec as unknown as Record<string, unknown>;
}

function nodeIds(spec: MachineSpec): string[] {
  const record = specRecord(spec);
  const parts = Array.isArray(record.parts) ? record.parts : [];
  const joints = Array.isArray(record.joints) ? record.joints : [];
  const ids = new Set<string>();

  for (const item of [...parts, ...joints]) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    for (const key of ["id", "node", "child", "partId"]) {
      if (typeof entry[key] === "string") ids.add(entry[key]);
    }
  }

  return [...ids].sort();
}

export function primaryDriveId(spec: MachineSpec): string {
  const record = specRecord(spec);
  const candidate =
    record.primaryDrive ?? record.primaryDriveId ?? record.drive;
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new Error("machine spec has no primary drive");
  }
  return candidate;
}

export function cycleRadians(spec: MachineSpec): number {
  const record = specRecord(spec);
  const candidate = record.cycleRad ?? record.cycleRadians;
  return typeof candidate === "number" &&
    Number.isFinite(candidate) &&
    candidate > 0
    ? candidate
    : DEFAULT_CYCLE;
}

function finiteRatio(
  graph: GraphLike,
  drive: string,
  node: string,
): number | null {
  try {
    const ratio = graph.ratioBetween(drive, node);
    return typeof ratio === "number" && Number.isFinite(ratio)
      ? Math.abs(ratio)
      : null;
  } catch {
    return null;
  }
}

function functionDrivers(spec: MachineSpec): string[] {
  const drivers = new Set<string>();
  for (const constraint of spec.constraints) {
    if (constraint.type === "crank") drivers.add(constraint.wheel);
    else if (constraint.type === "cam") drivers.add(constraint.cam);
    else if (constraint.type === "differential") {
      drivers.add(constraint.carrier);
      drivers.add(constraint.sunA);
      drivers.add(constraint.sunB);
    }
  }
  return [...drivers];
}

export function createSamplingPlan(
  spec: MachineSpec,
  graph: GraphLike,
): SamplingPlan {
  const drive = primaryDriveId(spec);
  const cycleRad = cycleRadians(spec);
  const nodes = nodeIds(spec);
  let maxSpeedRatio = 1;

  for (const node of nodes) {
    const ratio = finiteRatio(graph, drive, node);
    if (ratio !== null) maxSpeedRatio = Math.max(maxSpeedRatio, ratio);
  }

  // Linear ratios are exact. Probe one bounded phase cycle for each function
  // input instead of walking an arbitrarily long machine cycle.
  const probeSpans = new Map<string, number>();
  for (const node of functionDrivers(spec)) {
    const ratio = finiteRatio(graph, drive, node);
    if (ratio === null || ratio === 0) continue;
    const span = (Math.PI * 2) / ratio;
    probeSpans.set(span.toPrecision(12), span);
  }
  for (const span of probeSpans.values()) {
    graph.setInput(drive, 0);
    let previousAngle = 0;
    let previousState = graph.state();
    for (let index = 1; index <= FUNCTION_PROBE_STEPS; index += 1) {
      const angle = (span * index) / FUNCTION_PROBE_STEPS;
      graph.setInput(drive, angle);
      const state = graph.state();
      for (const node of nodes) {
        const before = previousState[node];
        const after = state[node];
        if (
          typeof before === "number" &&
          Number.isFinite(before) &&
          typeof after === "number" &&
          Number.isFinite(after)
        ) {
          // A small margin makes the finite-difference estimate conservative
          // between probe points without changing deterministic behavior.
          maxSpeedRatio = Math.max(
            maxSpeedRatio,
            1.05 * Math.abs((after - before) / (angle - previousAngle)),
          );
        }
      }
      previousAngle = angle;
      previousState = state;
    }
  }
  graph.setInput(drive, 0);

  const requiredSteps = Math.max(
    720,
    Math.ceil((cycleRad * maxSpeedRatio) / HALF_DEGREE),
  );
  const steps = Math.min(MAX_STEPS, requiredSteps);

  return {
    cycleRad,
    maxSpeedRatio,
    steps,
    resolutionDeg: ((cycleRad * maxSpeedRatio) / steps) * (180 / Math.PI),
    capped: requiredSteps > MAX_STEPS,
  };
}

export function* sampleAngles(plan: SamplingPlan): Generator<number> {
  for (let index = 0; index <= plan.steps; index += 1) {
    yield (plan.cycleRad * index) / plan.steps;
  }
}

export function* sampleAnglesBetween(
  start: number,
  end: number,
  increments: number,
): Generator<number> {
  for (let index = 0; index <= increments; index += 1) {
    yield start + ((end - start) * index) / increments;
  }
}
