import {
  Euler,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { buildPartGeometry } from '../core/primitives'
import type { MachineModule, PartDef } from '../sim/types'
import type { ValidationCheck } from './report'
import {
  primaryDriveId,
  sampleAngles,
  type SamplingPlan,
} from './sampling'

type GraphLike = {
  ratioBetween(from: string, to: string): number | null
  setInput(id: string, value: number): void
  state(): Record<string, number>
}

interface CollisionPart {
  part: PartDef
  mesh: Mesh<BufferGeometry>
  bvh: MeshBVH
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`
}

function localMatrix(part: PartDef, state: number): Matrix4 {
  const translation = new Matrix4().makeTranslation(part.position[0], part.position[1], part.position[2])
  const rotationEuler = part.rotationEuler ?? [0, 0, 0]
  const rotation = new Matrix4().makeRotationFromEuler(
    new Euler(rotationEuler[0], rotationEuler[1], rotationEuler[2]),
  )
  const joint = new Matrix4()
  if (part.joint?.kind === 'revolute') {
    joint.makeRotationFromQuaternion(
      new Quaternion().setFromAxisAngle(
        new Vector3(part.joint.axis[0], part.joint.axis[1], part.joint.axis[2]).normalize(),
        state,
      ),
    )
  } else if (part.joint?.kind === 'prismatic') {
    const offset = new Vector3(part.joint.axis[0], part.joint.axis[1], part.joint.axis[2])
      .normalize()
      .multiplyScalar(state)
    joint.makeTranslation(offset.x, offset.y, offset.z)
  }
  return translation.multiply(rotation).multiply(joint)
}

function worldMatrices(parts: PartDef[], state: Record<string, number>): Map<string, Matrix4> {
  const byId = new Map(parts.map((part) => [part.id, part]))
  const result = new Map<string, Matrix4>()
  const visiting = new Set<string>()

  const visit = (part: PartDef): Matrix4 => {
    const known = result.get(part.id)
    if (known) return known
    if (visiting.has(part.id)) throw new Error(`scene parent cycle at ${part.id}`)
    visiting.add(part.id)
    const local = localMatrix(part, state[part.id] ?? 0)
    const parent = part.parent ? byId.get(part.parent) : undefined
    const world = parent ? visit(parent).clone().multiply(local) : local
    visiting.delete(part.id)
    result.set(part.id, world)
    return world
  }

  for (const part of parts) visit(part)
  return result
}

function directlyFixed(partA: PartDef, partB: PartDef): boolean {
  if (partA.parent === partB.id) return partA.joint?.kind === 'fixed'
  if (partB.parent === partA.id) return partB.joint?.kind === 'fixed'
  return false
}

function broadPhaseIntersects(
  a: CollisionPart,
  b: CollisionPart,
  aWorld: Matrix4,
  bWorld: Matrix4,
): boolean {
  a.mesh.geometry.computeBoundingSphere()
  b.mesh.geometry.computeBoundingSphere()
  const aSphere = a.mesh.geometry.boundingSphere?.clone().applyMatrix4(aWorld)
  const bSphere = b.mesh.geometry.boundingSphere?.clone().applyMatrix4(bWorld)
  return Boolean(aSphere && bSphere && aSphere.intersectsSphere(bSphere))
}

function bvhIntersects(
  a: CollisionPart,
  b: CollisionPart,
  aWorld: Matrix4,
  bWorld: Matrix4,
): boolean {
  if (!broadPhaseIntersects(a, b, aWorld, bWorld)) return false
  const bToA = aWorld.clone().invert().multiply(bWorld)
  return a.bvh.intersectsGeometry(b.mesh.geometry, bToA)
}

function gearParameters(part: PartDef): { module: number; teeth: number; pitchRadius: number; addendum: number } | null {
  if (part.geometry.type !== 'gear') return null
  return {
    module: part.geometry.module,
    teeth: part.geometry.teeth,
    pitchRadius: part.geometry.module * part.geometry.teeth / 2,
    addendum: part.geometry.module,
  }
}

function centerDistance(aWorld: Matrix4, bWorld: Matrix4): number {
  const a = new Vector3().setFromMatrixPosition(aWorld)
  const b = new Vector3().setFromMatrixPosition(bWorld)
  return a.distanceTo(b)
}

function analyticGearFailure(
  a: PartDef,
  b: PartDef,
  aWorld: Matrix4,
  bWorld: Matrix4,
): string | null {
  const gearA = gearParameters(a)
  const gearB = gearParameters(b)
  if (!gearA || !gearB) return 'collision whitelist endpoints must both be gears'
  const distance = centerDistance(aWorld, bWorld)
  const pitchSum = gearA.pitchRadius + gearB.pitchRadius
  const conservativeModule = Math.min(gearA.module, gearB.module)
  if (!(distance < pitchSum + gearA.addendum + gearB.addendum)) {
    return `gear addenda do not engage (center distance ${distance})`
  }
  if (!(Math.abs(distance - pitchSum) < 0.15 * conservativeModule)) {
    return `gear center distance ${distance} exceeds 0.15 module tolerance`
  }
  if (!(distance - pitchSum > 0)) {
    return `gear backlash must be positive (radial allowance ${distance - pitchSum})`
  }
  return null
}

function buildCollisionParts(module: MachineModule): CollisionPart[] {
  return module.spec.parts.map((part) => {
    const geometry = buildPartGeometry(part.geometry, module.customBuilders)
    return { part, mesh: new Mesh(geometry), bvh: new MeshBVH(geometry) }
  })
}

function validateWhitelistedGears(
  module: MachineModule,
  graph: GraphLike,
  whitelist: Array<[string, string]>,
  collisionParts: CollisionPart[],
): ValidationCheck[] {
  const checks: ValidationCheck[] = []
  const parts = new Map(module.spec.parts.map((part) => [part.id, part]))
  const collisionById = new Map(collisionParts.map((part) => [part.part.id, part]))
  const drive = primaryDriveId(module.spec)

  for (const [aId, bId] of whitelist) {
    const a = parts.get(aId)
    const b = parts.get(bId)
    const id = `collision:whitelist:${aId}:${bId}`
    if (!a || !b) {
      checks.push({ id, status: 'fail', message: `Collision whitelist pair ${aId}/${bId} is unresolved.` })
      continue
    }

    let failure: string | null = null
    let failureAngle = 0
    let contactSeen = false
    try {
      graph.setInput(drive, 0)
      let worlds = worldMatrices(module.spec.parts, graph.state())
      failure = analyticGearFailure(a, b, worlds.get(aId)!, worlds.get(bId)!)
      const ratioA = Math.abs(graph.ratioBetween(drive, aId) ?? 0)
      const ratioB = Math.abs(graph.ratioBetween(drive, bId) ?? 0)
      const faster = ratioA >= ratioB ? { part: a, ratio: ratioA } : { part: b, ratio: ratioB }
      if (!failure && faster.ratio <= 0) failure = 'whitelisted gear pair is not reachable from the primary drive'
      if (!failure) {
        const fasterRevolutionAtDrive = Math.PI * 2 / faster.ratio
        const samples = Math.max(
          4,
          (faster.part.geometry.type === 'gear' ? faster.part.geometry.teeth : 1) * 4,
        )
        for (let sample = 0; sample < samples; sample += 1) {
          const angle = fasterRevolutionAtDrive * sample / samples
          graph.setInput(drive, angle)
          worlds = worldMatrices(module.spec.parts, graph.state())
          failure = analyticGearFailure(a, b, worlds.get(aId)!, worlds.get(bId)!)
          if (failure) {
            failureAngle = angle
            break
          }
          const collisionA = collisionById.get(aId)
          const collisionB = collisionById.get(bId)
          if (!collisionA || !collisionB) {
            failure = 'whitelisted gear collision geometry is unavailable'
            failureAngle = angle
            break
          }
          if (bvhIntersects(
            collisionA,
            collisionB,
            worlds.get(aId)!,
            worlds.get(bId)!,
          )) contactSeen = true
        }
        // The simplified polygonal tooth profiles can alternate between exact
        // contact and tiny positive gaps. Require contact somewhere in the
        // complete quarter-tooth-step sweep rather than at every sample.
        if (!failure && !contactSeen) {
          failure = 'the complete faster-wheel sweep is contact-free in 3D'
          failureAngle = 0
        }
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    } finally {
      try {
        graph.setInput(drive, 0)
      } catch {
        // The emitted check preserves the useful validation failure.
      }
    }

    checks.push({
      id,
      status: failure ? 'fail' : 'pass',
      message: failure
        ? `Whitelisted gear pair ${aId}/${bId} fails at drive angle ${failureAngle} rad: ${failure}`
        : `Whitelisted gear pair ${aId}/${bId} passes analytic placement checks and exhibits 3D BVH contact during its quarter-tooth-step sweep; boolean contact does not measure interference depth.`,
    })
  }
  return checks
}

export function validateCollisions(
  module: MachineModule,
  graph: GraphLike,
  plan: SamplingPlan,
): ValidationCheck[] {
  const whitelist = module.spec.collisionWhitelist ?? []
  const whitelisted = new Set(whitelist.map(([a, b]) => pairKey(a, b)))
  const drive = primaryDriveId(module.spec)
  let collisionParts: CollisionPart[]

  try {
    collisionParts = buildCollisionParts(module)
  } catch (error) {
    return [{
      id: 'collision:geometry',
      status: 'fail',
      message: `Collision geometry could not be constructed: ${error instanceof Error ? error.message : String(error)}`,
    }]
  }
  const checks = validateWhitelistedGears(module, graph, whitelist, collisionParts)

  let failure: { a: string; b: string; angle: number } | null = null
  try {
    for (const angle of sampleAngles(plan)) {
      graph.setInput(drive, angle)
      const worlds = worldMatrices(module.spec.parts, graph.state())
      for (let aIndex = 0; aIndex < collisionParts.length && !failure; aIndex += 1) {
        const a = collisionParts[aIndex]
        for (let bIndex = aIndex + 1; bIndex < collisionParts.length; bIndex += 1) {
          const b = collisionParts[bIndex]
          if (whitelisted.has(pairKey(a.part.id, b.part.id)) || directlyFixed(a.part, b.part)) continue
          if (bvhIntersects(a, b, worlds.get(a.part.id)!, worlds.get(b.part.id)!)) {
            failure = { a: a.part.id, b: b.part.id, angle }
            break
          }
        }
      }
      if (failure) break
    }
  } catch (error) {
    checks.push({
      id: 'collision:bvh',
      status: 'fail',
      message: `BVH collision sampling failed: ${error instanceof Error ? error.message : String(error)}`,
    })
    return checks
  } finally {
    try {
      graph.setInput(drive, 0)
    } catch {
      // The emitted check preserves the useful validation failure.
    }
  }

  checks.push({
    id: failure ? `collision:${failure.a}:${failure.b}` : 'collision:bvh',
    status: failure ? 'fail' : 'pass',
    message: failure
      ? `Parts ${failure.a} and ${failure.b} collide at drive angle ${failure.angle} rad.`
      : plan.capped
        ? `No issue found at ${plan.resolutionDeg}° resolution; the sampling cap prevents an exact collision-free claim.`
        : `No issue found at ${plan.resolutionDeg}° resolution.`,
  })
  return checks
}

export function collisionPairsAtAngle(
  module: MachineModule,
  graph: GraphLike,
  angle: number,
): Array<[string, string]> {
  const drive = primaryDriveId(module.spec)
  const whitelist = new Set((module.spec.collisionWhitelist ?? []).map(([a, b]) => pairKey(a, b)))
  const collisionParts = buildCollisionParts(module)
  graph.setInput(drive, angle)
  const worlds = worldMatrices(module.spec.parts, graph.state())
  const collisions: Array<[string, string]> = []
  for (let aIndex = 0; aIndex < collisionParts.length; aIndex += 1) {
    const a = collisionParts[aIndex]
    for (let bIndex = aIndex + 1; bIndex < collisionParts.length; bIndex += 1) {
      const b = collisionParts[bIndex]
      if (whitelist.has(pairKey(a.part.id, b.part.id)) || directlyFixed(a.part, b.part)) continue
      if (bvhIntersects(a, b, worlds.get(a.part.id)!, worlds.get(b.part.id)!)) {
        collisions.push([a.part.id, b.part.id])
      }
    }
  }
  return collisions
}
