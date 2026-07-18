import { describe, expect, it } from 'vitest'
import type { MachineModule, PartDef, Provenance } from '../../src/sim/types'
import { KinematicGraph } from '../../src/sim/graph'
import { collisionPairsAtAngle } from '../../src/validate/collision'
import { isMissingMachineBuild } from '../../src/validate/imports'
import { validateProvenanceAndIntegrity } from '../../src/validate/provenance'
import { runValidation } from '../../src/validate/report'
import { createSamplingPlan } from '../../src/validate/sampling'

const cited: Provenance = { kind: 'wenxian', ref: 'source-1' }
const inferred: Provenance = { kind: 'tuice', ref: 'test-fixture' }

function gearPart(id: string, teeth: number, position: [number, number, number]): PartDef {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: 'gear', module: 0.02, teeth, thickness: 0.02, toothStyle: 'involute' },
    material: 'wood',
    position,
    joint: { kind: 'revolute', axis: [0, 1, 0] },
    provenance: cited,
    dimensionProvenance: {
      module: cited,
      teeth: cited,
      thickness: cited,
    },
  }
}

function boxPart(id: string, position: [number, number, number]): PartDef {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: 'box', size: [0.1, 0.1, 0.1] },
    material: 'wood',
    position,
    joint: { kind: 'fixed', axis: [0, 0, 1] },
    provenance: inferred,
    dimensionProvenance: {
      'size.0': inferred,
      'size.1': inferred,
      'size.2': inferred,
    },
    schemeTags: ['test'],
  }
}

function miniModule(): MachineModule {
  return {
    spec: {
      slug: 'chariot',
      parts: [gearPart('g20', 20, [0, 0, 0]), gearPart('g40', 40, [0.601, 0, 0])],
      constraints: [{ type: 'mesh', a: 'g20', b: 'g40' }],
      driveNodes: ['g20'],
      primaryDrive: 'g20',
      cycleRad: Math.PI * 2,
      expectedRatios: [{ from: 'g20', to: 'g40', ratio: -0.5, sourceRef: 'source-1' }],
      collisionWhitelist: [['g20', 'g40']],
    },
    data: {
      slug: 'chariot',
      names: { zh: '测试', en: 'Test' },
      era: { zh: '测试', en: 'Test' },
      inventors: [{ zh: '测试', en: 'Test' }],
      oneLiner: { zh: '测试', en: 'Test' },
      principle: { zh: '测试', en: 'Test' },
      sources: [{
        id: 'source-1',
        book: 'Test source',
        quote: 'Test quote',
        url: 'https://example.test/source',
      }],
      dimensions: [],
      schemes: [],
      controversies: [],
      museums: [],
      images: [],
      ingenuity: {
        hook: { zh: '钩子', en: 'Hook' },
        demo: { zh: '演示', en: 'Demo' },
        echo: { zh: '回声', en: 'Echo' },
      },
    },
    mechanism: {
      triggers: [{
        id: 'spotlight',
        label: { zh: '聚光', en: 'Spotlight' },
        run: () => undefined,
      }],
    },
  }
}

function integrity(module: MachineModule) {
  return validateProvenanceAndIntegrity(module, { allowMissingSnapshots: true })
}

describe('independent machine validation', () => {
  it('passes the declared 20/40 gear ratio', () => {
    const report = runValidation(miniModule(), {
      allowMissingSnapshots: true,
      when: '2026-01-01T00:00:00.000Z',
    })
    expect(report.checks.find((check) => check.id === 'base:ratio-1')).toMatchObject({
      status: 'pass',
      expected: -0.5,
      actual: -0.5,
    })
  })

  it('fails a corrupted expected ratio', () => {
    const module = miniModule()
    module.spec.expectedRatios![0].ratio = 0.75
    const report = runValidation(module, { allowMissingSnapshots: true })
    expect(report.checks.find((check) => check.id === 'base:ratio-1')?.status).toBe('fail')
  })

  it('fails an expected ratio with the opposite sign', () => {
    const module = miniModule()
    module.spec.expectedRatios![0].ratio = 0.5
    const report = runValidation(module, { allowMissingSnapshots: true })
    expect(report.checks.find((check) => check.id === 'base:ratio-1')?.status).toBe('fail')
  })

  it('fails a whitelisted gear pair whose axial gap prevents 3D contact', () => {
    const module = miniModule()
    module.spec.parts[1].position = [0.601, 0.04, 0]
    const report = runValidation(module, { allowMissingSnapshots: true })
    expect(report.checks.find((check) => check.id === 'base:collision:whitelist:g20:g40')).toMatchObject({
      status: 'fail',
      message: expect.stringContaining('contact-free in 3D'),
    })
  })

  it('fails overlapping non-whitelisted boxes', () => {
    const module = miniModule()
    module.spec.parts.push(boxPart('box-a', [2, 0, 0]), boxPart('box-b', [2.04, 0, 0]))
    const report = runValidation(module, { allowMissingSnapshots: true })
    expect(report.checks.find((check) => check.id === 'base:collision:box-a:box-b')).toMatchObject({
      status: 'fail',
    })
  })

  it('fails an unmapped geometry number', () => {
    const module = miniModule()
    delete module.spec.parts[0].dimensionProvenance.module
    expect(integrity(module).some((check) => (
      check.id === 'provenance:dimension:g20:module' && check.status === 'fail'
    ))).toBe(true)
  })

  it('rejects wenxian provenance used through @rest', () => {
    const module = miniModule()
    module.spec.parts[0].dimensionProvenance = { '@rest': cited }
    expect(integrity(module).some((check) => check.id.endsWith(':@rest') && check.status === 'fail')).toBe(true)
  })

  it('accepts inferred part provenance with its own note', () => {
    const module = miniModule()
    module.spec.parts[0].provenance = { kind: 'tuice', ref: 'test', note: 'Fixture inference.' }
    module.spec.parts[0].schemeTags = undefined
    expect(integrity(module).find((check) => check.id === 'provenance:part:g20')?.status).toBe('pass')
  })

  it('accepts inferred part provenance with a dimension-note provenance note', () => {
    const module = miniModule()
    module.spec.parts[0].provenance = { kind: 'tuice', ref: 'test' }
    module.spec.parts[0].schemeTags = undefined
    module.spec.parts[0].dimensionNotes = [{
      value: 0.02,
      unit: 'm',
      provenance: { kind: 'tuice', ref: 'test', note: 'Measured from the reconstruction.' },
    }]
    expect(integrity(module).find((check) => check.id === 'provenance:part:g20')?.status).toBe('pass')
  })

  it('accepts inferred part provenance with a scheme tag only', () => {
    const module = miniModule()
    module.spec.parts[0].provenance = { kind: 'tuice', ref: 'test' }
    module.spec.parts[0].schemeTags = ['test-scheme']
    expect(integrity(module).find((check) => check.id === 'provenance:part:g20')?.status).toBe('pass')
  })

  it('fails inferred part provenance with neither a note nor a scheme tag', () => {
    const module = miniModule()
    module.spec.parts[0].provenance = { kind: 'tuice', ref: 'test' }
    module.spec.parts[0].schemeTags = undefined
    module.spec.parts[0].dimensionNotes = undefined
    expect(integrity(module).find((check) => check.id === 'provenance:part:g20')?.status).toBe('fail')
  })

  it('fails a crank constraint without provenance', () => {
    const module = miniModule()
    module.spec.constraints.push({
      type: 'crank',
      wheel: 'g20',
      rod: 'g40',
      slider: 'g40',
      crankRadius: 0.1,
      rodLength: 0.4,
      axis: [1, 0, 0],
      provenance: undefined as unknown as Provenance,
    })
    expect(integrity(module).some((check) => (
      check.id.includes('constraint:2:provenance') && check.status === 'fail'
    ))).toBe(true)
  })

  it('fails a CC-BY-SA local image without attribution', () => {
    const module = miniModule()
    module.data.images.push({
      file: 'public/test-image.jpg',
      title: 'Test',
      angle: 'front',
      license: 'CC-BY-SA',
      sourceUrl: 'https://example.test/image',
    })
    expect(integrity(module).some((check) => (
      check.id.endsWith(':attribution') && check.status === 'fail'
    ))).toBe(true)
  })

  it('fails a missing local image asset', () => {
    const module = miniModule()
    module.data.images.push({
      file: 'public/definitely-missing-mechanica-test.jpg',
      title: 'Missing',
      angle: 'front',
      license: 'PD',
      sourceUrl: 'https://example.test/image',
    })
    expect(integrity(module).some((check) => (
      check.id.endsWith(':asset') && check.status === 'fail'
    ))).toBe(true)
  })

  it('derives a half-degree-or-finer shared sampling plan', () => {
    const module = miniModule()
    const graph = new KinematicGraph(module.spec)
    const plan = createSamplingPlan(module.spec, graph)
    expect(plan.steps).toBeGreaterThanOrEqual(720)
    expect(plan.resolutionDeg).toBeLessThanOrEqual(0.5)
  })

  it('detects an orbital collision confined to less than two degrees', () => {
    const module = miniModule()
    const rotor = boxPart('orbit-rotor', [0, 0, 0])
    rotor.geometry = { type: 'box', size: [0.01, 0.01, 0.01] }
    rotor.joint = { kind: 'revolute', axis: [0, 0, 1] }
    const pin = boxPart('orbit-pin', [1, 0, 0])
    pin.geometry = { type: 'box', size: [0.01, 0.01, 0.01] }
    pin.parent = rotor.id
    const target = boxPart('orbit-target', [1, 0, 0])
    target.geometry = { type: 'box', size: [0.01, 0.01, 0.01] }
    module.spec = {
      ...module.spec,
      parts: [rotor, pin, target],
      constraints: [],
      driveNodes: [rotor.id],
      primaryDrive: rotor.id,
      expectedRatios: [],
      collisionWhitelist: [],
    }
    const graph = new KinematicGraph(module.spec)
    expect(collisionPairsAtAngle(module, graph, 0)).toContainEqual(['orbit-pin', 'orbit-target'])
    expect(collisionPairsAtAngle(module, graph, Math.PI / 60)).toEqual([])
    const report = runValidation(module, { allowMissingSnapshots: true })
    expect(report.checks.find((check) => (
      check.id === 'base:collision:orbit-pin:orbit-target'
    ))?.status).toBe('fail')
  })

  it('classifies only a missing target build as a missing manifest module', () => {
    expect(isMissingMachineBuild({
      code: 'ERR_MODULE_NOT_FOUND',
      message: "Cannot find module '/repo/src/machines/loom/build.ts' imported from /repo/scripts/validate.mts",
    }, 'loom')).toBe(true)
    expect(isMissingMachineBuild({
      code: 'ERR_MODULE_NOT_FOUND',
      message: "Cannot find package 'broken-transitive' imported from /repo/src/machines/loom/build.ts",
    }, 'loom')).toBe(false)
    expect(isMissingMachineBuild(new SyntaxError('Unexpected token'), 'loom')).toBe(false)
  })
})
