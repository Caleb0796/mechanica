import { describe, expect, it } from 'vitest'

import type { GeometryDef } from '../../src/sim/types'
import { buildGearGeometry, pitchRadius } from '../../src/core/gears'

type GearDef = Extract<GeometryDef, { type: 'gear' }>

function involuteGear(teeth: number, module: number): GearDef {
  return {
    type: 'gear',
    module,
    teeth,
    thickness: module * 0.8,
    toothStyle: 'involute',
  }
}

function expectFinitePositions(geometry: ReturnType<typeof buildGearGeometry>): void {
  const positions = geometry.getAttribute('position')
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    expect(Number.isFinite(positions.getX(vertex))).toBe(true)
    expect(Number.isFinite(positions.getY(vertex))).toBe(true)
    expect(Number.isFinite(positions.getZ(vertex))).toBe(true)
  }
}

function expectFiniteUvs(geometry: ReturnType<typeof buildGearGeometry>): void {
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  expect(uvs.count).toBe(positions.count)
  for (let vertex = 0; vertex < uvs.count; vertex += 1) {
    expect(Number.isFinite(uvs.getX(vertex))).toBe(true)
    expect(Number.isFinite(uvs.getY(vertex))).toBe(true)
  }
}

describe('buildGearGeometry', () => {
  it('creates a detailed finite involute profile for 48 teeth', () => {
    const geometry = buildGearGeometry(involuteGear(48, 0.1))
    const positions = geometry.getAttribute('position')

    expect(positions.count).toBeGreaterThan(48 * 4)
    expectFinitePositions(geometry)
    expectFiniteUvs(geometry)
  })

  it('keeps the 24-tooth bounds between pitch and addendum tolerance', () => {
    const module = 0.1
    const teeth = 24
    const geometry = buildGearGeometry(involuteGear(teeth, module))
    geometry.computeBoundingSphere()

    const radius = geometry.boundingSphere?.radius
    expect(radius).toBeDefined()
    expect(radius as number).toBeGreaterThan(pitchRadius(module, teeth))
    expect(radius as number).toBeLessThan(
      pitchRadius(module, teeth) + 2.5 * module,
    )
  })

  it('avoids empty or non-finite geometry at twelve teeth', () => {
    const geometry = buildGearGeometry(involuteGear(12, 0.1))
    const positions = geometry.getAttribute('position')

    expect(positions.count).toBeGreaterThan(0)
    expectFinitePositions(geometry)
  })

  it('rejects a pin-gear hole that reaches the pin circle', () => {
    expect(() => buildGearGeometry({
      type: 'gear',
      module: 0.1,
      teeth: 12,
      thickness: 0.08,
      toothStyle: 'pin',
      innerRadius: 0.58,
    })).toThrow(/clearance behind the pins/)
  })

  it('keeps finite UVs on a composite pin gear', () => {
    const geometry = buildGearGeometry({
      type: 'gear',
      module: 0.1,
      teeth: 12,
      thickness: 0.08,
      toothStyle: 'pin',
      innerRadius: 0.08,
    })

    expectFiniteUvs(geometry)
  })
})
