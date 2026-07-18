import type { MachineSpec } from '../sim/types'
import type { ValidationCheck } from './report'
import { primaryDriveId, sampleAngles, type SamplingPlan } from './sampling'

type GraphLike = {
  setInput(id: string, value: number): void
  state(): Record<string, unknown>
}

function partsWithLimits(spec: MachineSpec): Record<string, unknown>[] {
  const value = (spec as unknown as Record<string, unknown>).parts
  if (!Array.isArray(value)) return []
  return value.filter((part): part is Record<string, unknown> => {
    if (!part || typeof part !== 'object') return false
    const joint = (part as Record<string, unknown>).joint
    if (!joint || typeof joint !== 'object') return false
    const limits = (joint as Record<string, unknown>).limits
    return Array.isArray(limits) && limits.length === 2
  })
}

function scalarState(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function validateRanges(
  spec: MachineSpec,
  graph: GraphLike,
  plan: SamplingPlan,
): ValidationCheck[] {
  const checks: ValidationCheck[] = []
  const drive = primaryDriveId(spec)

  for (const part of partsWithLimits(spec)) {
    const node = typeof part.id === 'string' ? part.id : null
    const joint = part.joint as Record<string, unknown>
    const limits = joint.limits as unknown[]
    const lower = limits[0]
    const upper = limits[1]
    const id = node ?? 'unnamed-joint'

    if (!node || typeof lower !== 'number' || typeof upper !== 'number' || lower > upper) {
      checks.push({
        id: `range:${id}`,
        status: 'fail',
        message: `Joint ${id} has invalid limits or no state node.`,
      })
      continue
    }

    let violation: { angle: number; value: number } | null = null
    let stateMissing = false
    try {
      for (const angle of sampleAngles(plan)) {
        graph.setInput(drive, angle)
        const state = graph.state()
        const value = scalarState(state[node])
        if (value === null) {
          stateMissing = true
          break
        }
        if (value < lower - 1e-12 || value > upper + 1e-12) {
          violation = { angle, value }
          break
        }
      }
    } catch (error) {
      checks.push({
        id: `range:${id}`,
        status: 'fail',
        message: `Joint ${id} range sampling failed: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    } finally {
      try {
        graph.setInput(drive, 0)
      } catch {
        // The primary failure above is more useful than a reset failure.
      }
    }

    if (stateMissing) {
      checks.push({
        id: `range:${id}`,
        status: 'fail',
        message: `Joint ${id} has limits but no numeric sampled state.`,
      })
    } else if (violation) {
      checks.push({
        id: `range:${id}`,
        status: 'fail',
        expected: violation.value < lower ? lower : upper,
        actual: violation.value,
        message: `Joint ${id} violates [${lower}, ${upper}] at drive angle ${violation.angle} rad.`,
      })
    } else {
      checks.push({
        id: `range:${id}`,
        status: 'pass',
        message: `Joint ${id} remains within [${lower}, ${upper}] over the sampled cycle.`,
      })
    }
  }

  return checks
}
