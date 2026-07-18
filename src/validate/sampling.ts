import type { MachineSpec } from '../sim/types'

const HALF_DEGREE = Math.PI / 360
const DEFAULT_CYCLE = Math.PI * 2
const MAX_STEPS = 200_000

type GraphLike = {
  ratioBetween(from: string, to: string): number | null
  setInput(id: string, value: number): void
  state(): Record<string, number>
}

export interface SamplingPlan {
  cycleRad: number
  maxSpeedRatio: number
  steps: number
  resolutionDeg: number
  capped: boolean
}

function specRecord(spec: MachineSpec): Record<string, unknown> {
  return spec as unknown as Record<string, unknown>
}

function nodeIds(spec: MachineSpec): string[] {
  const record = specRecord(spec)
  const parts = Array.isArray(record.parts) ? record.parts : []
  const joints = Array.isArray(record.joints) ? record.joints : []
  const ids = new Set<string>()

  for (const item of [...parts, ...joints]) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    for (const key of ['id', 'node', 'child', 'partId']) {
      if (typeof entry[key] === 'string') ids.add(entry[key])
    }
  }

  return [...ids].sort()
}

export function primaryDriveId(spec: MachineSpec): string {
  const record = specRecord(spec)
  const candidate = record.primaryDrive ?? record.primaryDriveId ?? record.drive
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new Error('machine spec has no primary drive')
  }
  return candidate
}

export function cycleRadians(spec: MachineSpec): number {
  const record = specRecord(spec)
  const candidate = record.cycleRad ?? record.cycleRadians
  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0
    ? candidate
    : DEFAULT_CYCLE
}

function finiteRatio(graph: GraphLike, drive: string, node: string): number | null {
  try {
    const ratio = graph.ratioBetween(drive, node)
    return typeof ratio === 'number' && Number.isFinite(ratio) ? Math.abs(ratio) : null
  } catch {
    return null
  }
}

export function createSamplingPlan(spec: MachineSpec, graph: GraphLike): SamplingPlan {
  const drive = primaryDriveId(spec)
  const cycleRad = cycleRadians(spec)
  const nodes = nodeIds(spec)
  let maxSpeedRatio = 1

  for (const node of nodes) {
    const ratio = finiteRatio(graph, drive, node)
    if (ratio !== null) maxSpeedRatio = Math.max(maxSpeedRatio, ratio)
  }

  // Function constraints can have a local derivative larger than their average
  // ratio. Probe the complete drive cycle before choosing the final grid.
  const probeSteps = Math.max(720, Math.ceil(cycleRad / HALF_DEGREE))
  let previousAngle = 0
  let previousState: Record<string, number> | null = null
  for (let index = 0; index <= probeSteps; index += 1) {
    const angle = (cycleRad * index) / probeSteps
    graph.setInput(drive, angle)
    const state = graph.state()
    for (const node of nodes) {
      const ratio = finiteRatio(graph, drive, node)
      if (ratio !== null) maxSpeedRatio = Math.max(maxSpeedRatio, ratio)
      const before = previousState?.[node]
      const after = state[node]
      if (typeof before === 'number' && Number.isFinite(before)
        && typeof after === 'number' && Number.isFinite(after)
        && angle > previousAngle) {
        // A small margin makes the finite-difference estimate conservative
        // between probe points without changing deterministic behavior.
        maxSpeedRatio = Math.max(maxSpeedRatio, 1.05 * Math.abs((after - before) / (angle - previousAngle)))
      }
    }
    previousAngle = angle
    previousState = state
  }
  graph.setInput(drive, 0)

  const requiredSteps = Math.max(720, Math.ceil((cycleRad * maxSpeedRatio) / HALF_DEGREE))
  const steps = Math.min(MAX_STEPS, requiredSteps)

  return {
    cycleRad,
    maxSpeedRatio,
    steps,
    resolutionDeg: ((cycleRad * maxSpeedRatio) / steps) * (180 / Math.PI),
    capped: requiredSteps > MAX_STEPS,
  }
}

export function* sampleAngles(plan: SamplingPlan): Generator<number> {
  for (let index = 0; index <= plan.steps; index += 1) {
    yield (plan.cycleRad * index) / plan.steps
  }
}

export function* sampleAnglesBetween(
  start: number,
  end: number,
  increments: number,
): Generator<number> {
  for (let index = 0; index <= increments; index += 1) {
    yield start + ((end - start) * index) / increments
  }
}
