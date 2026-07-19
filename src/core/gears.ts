import * as THREE from 'three'

import type { GeometryDef } from '../sim/types'
import { ensureBoxProjectedUvs } from './geometryUvs'

type GearDef = Extract<GeometryDef, { type: 'gear' }>

const FLANK_SAMPLES = 8
const ROOT_ARC_SAMPLES = 4

function assertGearDefinition(def: GearDef): void {
  if (!Number.isFinite(def.module) || def.module <= 0) {
    throw new Error('Gear module must be a positive finite number')
  }
  if (!Number.isInteger(def.teeth) || def.teeth < 3) {
    throw new Error('Gear teeth must be an integer of at least 3')
  }
  if (!Number.isFinite(def.thickness) || def.thickness <= 0) {
    throw new Error('Gear thickness must be a positive finite number')
  }
  if (
    def.pressureAngleDeg !== undefined &&
    (!Number.isFinite(def.pressureAngleDeg) ||
      def.pressureAngleDeg <= 0 ||
      def.pressureAngleDeg >= 45)
  ) {
    throw new Error('Gear pressure angle must be between 0 and 45 degrees')
  }
  if (
    def.innerRadius !== undefined &&
    (!Number.isFinite(def.innerRadius) || def.innerRadius < 0)
  ) {
    throw new Error('Gear inner radius must be a non-negative finite number')
  }
}

export function pitchRadius(module: number, teeth: number): number {
  return (module * teeth) / 2
}

function pointOnRadius(radius: number, angle: number): [number, number] {
  return [radius * Math.cos(angle), radius * Math.sin(angle)]
}

function involutePoint(baseRadius: number, roll: number): [number, number] {
  return [
    baseRadius * (Math.cos(roll) + roll * Math.sin(roll)),
    baseRadius * (Math.sin(roll) - roll * Math.cos(roll)),
  ]
}

function involutePolarAngle(baseRadius: number, roll: number): number {
  const [x, y] = involutePoint(baseRadius, roll)
  return Math.atan2(y, x)
}

function addRootArc(
  shape: THREE.Shape,
  radius: number,
  startAngle: number,
  endAngle: number,
): void {
  for (let sample = 1; sample <= ROOT_ARC_SAMPLES; sample += 1) {
    const angle =
      startAngle + ((endAngle - startAngle) * sample) / ROOT_ARC_SAMPLES
    const [x, y] = pointOnRadius(radius, angle)
    shape.lineTo(x, y)
  }
}

function buildInvoluteShape(
  def: GearDef,
  rootRadius: number,
  baseRadius: number,
  addendumRadius: number,
  pressureAngle: number,
): THREE.Shape {
  if (rootRadius >= addendumRadius) {
    throw new Error('Gear inner radius leaves no room for a tooth profile')
  }

  const toothPitchAngle = (Math.PI * 2) / def.teeth
  const halfToothAngle =
    Math.PI / (2 * def.teeth) + Math.tan(pressureAngle) - pressureAngle
  const minimumRoll =
    rootRadius > baseRadius
      ? Math.sqrt(rootRadius ** 2 - baseRadius ** 2) / baseRadius
      : 0
  const maximumRoll =
    Math.sqrt(Math.max(addendumRadius ** 2 - baseRadius ** 2, 0)) /
    baseRadius

  if (minimumRoll >= maximumRoll) {
    throw new Error('Gear root radius leaves no room for an involute flank')
  }

  const firstRootAngle = -halfToothAngle
  const [firstX, firstY] = pointOnRadius(rootRadius, firstRootAngle)
  const shape = new THREE.Shape()
  shape.moveTo(firstX, firstY)

  for (let tooth = 0; tooth < def.teeth; tooth += 1) {
    const centerAngle = tooth * toothPitchAngle

    for (let sample = 0; sample < FLANK_SAMPLES; sample += 1) {
      const roll =
        minimumRoll +
        ((maximumRoll - minimumRoll) * sample) / (FLANK_SAMPLES - 1)
      const radius = baseRadius * Math.sqrt(1 + roll ** 2)
      const angle =
        centerAngle -
        halfToothAngle +
        involutePolarAngle(baseRadius, roll)
      const [x, y] = pointOnRadius(radius, angle)
      shape.lineTo(x, y)
    }

    for (let sample = FLANK_SAMPLES - 1; sample >= 0; sample -= 1) {
      const roll =
        minimumRoll +
        ((maximumRoll - minimumRoll) * sample) / (FLANK_SAMPLES - 1)
      const radius = baseRadius * Math.sqrt(1 + roll ** 2)
      const angle =
        centerAngle +
        halfToothAngle -
        involutePolarAngle(baseRadius, roll)
      const [x, y] = pointOnRadius(radius, angle)
      shape.lineTo(x, y)
    }

    const rightRootAngle = centerAngle + halfToothAngle
    const [rightRootX, rightRootY] = pointOnRadius(
      rootRadius,
      rightRootAngle,
    )
    shape.lineTo(rightRootX, rightRootY)
    addRootArc(
      shape,
      rootRadius,
      rightRootAngle,
      centerAngle + toothPitchAngle - halfToothAngle,
    )
  }

  shape.closePath()
  return shape
}

function buildTrapezoidShape(
  def: GearDef,
  rootRadius: number,
  addendumRadius: number,
): THREE.Shape {
  if (rootRadius >= addendumRadius) {
    throw new Error('Gear inner radius leaves no room for a tooth profile')
  }

  const toothPitchAngle = (Math.PI * 2) / def.teeth
  const rootWidth = (0.6 * Math.PI * 2 * rootRadius) / (2 * def.teeth)
  const tipWidth = 0.55 * rootWidth
  const rootHalfAngle = rootWidth / (2 * rootRadius)
  const tipHalfAngle = tipWidth / (2 * addendumRadius)
  const [firstX, firstY] = pointOnRadius(rootRadius, -rootHalfAngle)
  const shape = new THREE.Shape()
  shape.moveTo(firstX, firstY)

  for (let tooth = 0; tooth < def.teeth; tooth += 1) {
    const centerAngle = tooth * toothPitchAngle
    const corners: [number, number][] = [
      pointOnRadius(addendumRadius, centerAngle - tipHalfAngle),
      pointOnRadius(addendumRadius, centerAngle + tipHalfAngle),
      pointOnRadius(rootRadius, centerAngle + rootHalfAngle),
    ]
    for (const [x, y] of corners) {
      shape.lineTo(x, y)
    }
    addRootArc(
      shape,
      rootRadius,
      centerAngle + rootHalfAngle,
      centerAngle + toothPitchAngle - rootHalfAngle,
    )
  }

  shape.closePath()
  return shape
}

function addInnerHole(shape: THREE.Shape, innerRadius: number): void {
  if (innerRadius === 0) {
    return
  }
  const hole = new THREE.Path()
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true)
  shape.holes.push(hole)
}

function extrudeGearShape(shape: THREE.Shape, thickness: number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 4,
  })
  geometry.center()
  geometry.rotateX(Math.PI / 2)
  geometry.computeBoundingSphere()
  return geometry
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const prepared = geometries.map((source) =>
    source.index ? source.toNonIndexed() : source.clone(),
  )
  const projectionBounds = new THREE.Box3()
  for (const geometry of prepared) {
    geometry.computeBoundingBox()
    if (geometry.boundingBox) projectionBounds.union(geometry.boundingBox)
  }

  for (const preparedGeometry of prepared) {
    const geometry = ensureBoxProjectedUvs(
      preparedGeometry,
      projectionBounds,
    )
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const uv = geometry.getAttribute('uv')

    for (let i = 0; i < position.count; i += 1) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i))
      if (normal) {
        normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
      }
      if (uv) {
        uvs.push(uv.getX(i), uv.getY(i))
      }
    }
  }
  for (const geometry of prepared) geometry.dispose()

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length === positions.length) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  } else {
    merged.computeVertexNormals()
  }
  if (uvs.length * 3 === positions.length * 2) {
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  }
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function buildPinGeometry(
  def: GearDef,
  rootRadius: number,
  pitch: number,
  innerRadius: number,
): THREE.BufferGeometry {
  const pinRadius = def.module * 0.32
  if (innerRadius + pinRadius >= pitch) {
    throw new Error('Gear inner radius leaves no clearance behind the pins')
  }
  const rimRadius = Math.max(rootRadius, pitch - def.module * 0.2)
  if (innerRadius >= rimRadius) {
    throw new Error('Gear inner radius leaves no room for the pin-gear rim')
  }

  const rimShape = new THREE.Shape()
  rimShape.absarc(0, 0, rimRadius, 0, Math.PI * 2, false)
  addInnerHole(rimShape, innerRadius)
  const geometries = [extrudeGearShape(rimShape, def.thickness)]

  for (let pin = 0; pin < def.teeth; pin += 1) {
    const angle = (pin * Math.PI * 2) / def.teeth
    const geometry = new THREE.CylinderGeometry(
      pinRadius,
      pinRadius,
      def.thickness,
      8,
    )
    geometry.translate(pitch * Math.cos(angle), 0, pitch * Math.sin(angle))
    geometries.push(geometry)
  }

  const merged = mergeGeometries(geometries)
  for (const geometry of geometries) {
    geometry.dispose()
  }
  return merged
}

export function buildGearGeometry(def: GearDef): THREE.BufferGeometry {
  assertGearDefinition(def)

  const pressureAngle = ((def.pressureAngleDeg ?? 20) * Math.PI) / 180
  const pitch = pitchRadius(def.module, def.teeth)
  const baseRadius = pitch * Math.cos(pressureAngle)
  const addendumRadius = pitch + def.module
  const innerRadius = def.innerRadius ?? 0
  const rootRadius = Math.max(
    pitch - 1.25 * def.module,
    baseRadius * 0.98,
    innerRadius + 0.5 * def.module,
  )

  if (def.toothStyle === 'pin') {
    return buildPinGeometry(def, rootRadius, pitch, innerRadius)
  }

  const shape =
    def.toothStyle === 'involute'
      ? buildInvoluteShape(
          def,
          rootRadius,
          baseRadius,
          addendumRadius,
          pressureAngle,
        )
      : buildTrapezoidShape(def, rootRadius, addendumRadius)
  addInnerHole(shape, innerRadius)
  return extrudeGearShape(shape, def.thickness)
}
