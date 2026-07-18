import type { MachineSpec } from '../sim/types'
import type { ValidationCheck } from './report'

const RATIO_TOLERANCE = 1e-9

type GraphLike = {
  ratioBetween(from: string, to: string): number | null
}

function expectedRatios(spec: MachineSpec): Record<string, unknown>[] {
  const value = (spec as unknown as Record<string, unknown>).expectedRatios
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    : []
}

function endpoint(entry: Record<string, unknown>, names: string[]): string | null {
  for (const name of names) {
    if (typeof entry[name] === 'string') return entry[name]
  }
  return null
}

export function validateRatios(spec: MachineSpec, graph: GraphLike): ValidationCheck[] {
  return expectedRatios(spec).map((entry, index) => {
    const from = endpoint(entry, ['from', 'input', 'driver'])
    const to = endpoint(entry, ['to', 'output', 'driven'])
    const expected = typeof entry.ratio === 'number'
      ? entry.ratio
      : typeof entry.expected === 'number'
        ? entry.expected
        : Number.NaN
    const sourceRef = typeof entry.sourceRef === 'string' ? entry.sourceRef : undefined
    const id = typeof entry.id === 'string' ? entry.id : `ratio-${index + 1}`

    if (!from || !to || !Number.isFinite(expected)) {
      return {
        id,
        status: 'fail',
        message: 'Expected ratio has invalid endpoints or expected value.',
        sourceRef,
      }
    }

    try {
      const measured = graph.ratioBetween(from, to)
      if (typeof measured !== 'number' || !Number.isFinite(measured)) {
        return {
          id,
          status: 'fail',
          expected,
          message: `Ratio ${from} → ${to} is unreachable or non-finite.`,
          sourceRef,
        }
      }

      const actual = measured
      const target = expected
      const passed = Math.abs(actual - target) <= RATIO_TOLERANCE
      return {
        id,
        status: passed ? 'pass' : 'fail',
        expected: target,
        actual,
        message: passed
          ? `Signed ratio ${from} → ${to} matches the declared value.`
          : `Signed ratio ${from} → ${to} differs from the declared value.`,
        sourceRef,
      }
    } catch (error) {
      return {
        id,
        status: 'fail',
        expected,
        message: `Ratio ${from} → ${to} could not be evaluated: ${error instanceof Error ? error.message : String(error)}`,
        sourceRef,
      }
    }
  })
}
