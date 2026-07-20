import {
  Box3,
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { MeshBVH } from "three-mesh-bvh";
import {
  buildPartGeometry,
  disposePartGeometry,
  getMechanicaInstanceMatrices,
  partGeometryEntries,
} from "../core/primitives";
import { planarCrankRodPose } from "../sim/edges";
import { attitudeQuaternion, KinematicGraph } from "../sim/graph";
import type {
  IKinematicGraph,
  MachineModule,
  MachineSpec,
  PartDef,
} from "../sim/types";
import type { ValidationCheck } from "./report";
import { primaryDriveId, sampleAngles, type SamplingPlan } from "./sampling";

type GraphLike = IKinematicGraph;

interface CollisionPart {
  part: PartDef;
  mesh: Mesh<BufferGeometry>;
  bvh: MeshBVH;
  localBoundingCenter: Vector3;
  boundingRadius: number;
  localBoundingBox: Box3;
  localBoundingObb: OBB;
}

interface WorldBound {
  center: Vector3;
  radius: number;
  box: Box3;
  obb: OBB;
}

interface TransformNode {
  part: PartDef;
  parentIndex: number | null;
  base: Matrix4;
  crankRod: {
    crankRadius: number;
    rodLength: number;
    wheelId: string;
    wheelPosition: [number, number, number];
  } | null;
  axis: Vector3;
  joint: Matrix4;
  local: Matrix4;
  world: Matrix4;
  moving: boolean;
}

interface WorldTransforms {
  nodes: TransformNode[];
  order: number[];
  byId: Map<string, Matrix4>;
  movingIndices: number[];
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function createWorldTransforms(spec: MachineSpec): WorldTransforms {
  const parts = spec.parts;
  const indexById = new Map(parts.map((part, index) => [part.id, index]));
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const crankByRod = new Map(
    spec.constraints.flatMap((constraint) =>
      constraint.type === "crank"
        ? ([[constraint.rod, constraint]] as const)
        : [],
    ),
  );
  const nodes = parts.map((part): TransformNode => {
    const rotationEuler = part.rotationEuler ?? [0, 0, 0];
    const base = new Matrix4()
      .makeTranslation(part.position[0], part.position[1], part.position[2])
      .multiply(
        new Matrix4().makeRotationFromEuler(
          new Euler(rotationEuler[0], rotationEuler[1], rotationEuler[2]),
        ),
      );
    const crank = crankByRod.get(part.id);
    const wheel = crank ? partsById.get(crank.wheel) : undefined;
    return {
      part,
      parentIndex: part.parent ? (indexById.get(part.parent) ?? null) : null,
      base,
      crankRod:
        crank && wheel
          ? {
              crankRadius: crank.crankRadius,
              rodLength: crank.rodLength,
              wheelId: crank.wheel,
              wheelPosition: wheel.position,
            }
          : null,
      axis: new Vector3(...(part.joint?.axis ?? [0, 1, 0])).normalize(),
      joint: new Matrix4(),
      local: new Matrix4(),
      world: new Matrix4(),
      moving: false,
    };
  });
  const order: number[] = [];
  const visited = new Set<number>();
  const visiting = new Set<string>();

  const visit = (index: number): void => {
    if (visited.has(index)) return;
    const node = nodes[index];
    if (visiting.has(node.part.id)) {
      throw new Error(`scene parent cycle at ${node.part.id}`);
    }
    visiting.add(node.part.id);
    if (node.parentIndex !== null) visit(node.parentIndex);
    visiting.delete(node.part.id);
    visited.add(index);
    order.push(index);
  };

  for (let index = 0; index < nodes.length; index += 1) visit(index);
  for (const index of order) {
    const node = nodes[index];
    const parentMoves =
      node.parentIndex === null ? false : nodes[node.parentIndex].moving;
    node.moving =
      parentMoves ||
      node.crankRod !== null ||
      (node.part.joint !== undefined && node.part.joint.kind !== "fixed");
  }

  return {
    nodes,
    order,
    byId: new Map(nodes.map((node) => [node.part.id, node.world])),
    movingIndices: nodes.flatMap((node, index) => (node.moving ? [index] : [])),
  };
}

function updateWorldTransforms(
  transforms: WorldTransforms,
  state: Record<string, number>,
): Map<string, Matrix4> {
  for (const index of transforms.order) {
    const node = transforms.nodes[index];
    const value = state[node.part.id] ?? 0;
    const attitude = attitudeQuaternion(state, node.part.id);
    if (node.crankRod) {
      const pose = planarCrankRodPose(
        state[node.crankRod.wheelId] ?? 0,
        node.crankRod.wheelPosition,
        node.crankRod.crankRadius,
        node.crankRod.rodLength,
      );
      node.local.makeRotationZ(pose.rotationZ).setPosition(...pose.center);
    } else if (attitude) {
      node.local
        .makeRotationFromQuaternion(new Quaternion(...attitude).normalize())
        .setPosition(...node.part.position);
    } else {
      node.local.copy(node.base);
    }
    if (!node.crankRod && !attitude && node.part.joint?.kind === "revolute") {
      node.joint.makeRotationAxis(node.axis, value);
      node.local.multiply(node.joint);
    } else if (
      !node.crankRod &&
      !attitude &&
      node.part.joint?.kind === "prismatic"
    ) {
      node.joint.makeTranslation(
        node.axis.x * value,
        node.axis.y * value,
        node.axis.z * value,
      );
      node.local.premultiply(node.joint);
    }
    if (node.parentIndex === null) {
      node.world.copy(node.local);
    } else {
      node.world
        .copy(transforms.nodes[node.parentIndex].world)
        .multiply(node.local);
    }
  }
  return transforms.byId;
}

function directlyFixed(partA: PartDef, partB: PartDef): boolean {
  if (partA.parent === partB.id) return partA.joint?.kind === "fixed";
  if (partB.parent === partA.id) return partB.joint?.kind === "fixed";
  return false;
}

function createWorldBounds(collisionParts: CollisionPart[]): WorldBound[] {
  return collisionParts.map(() => ({
    center: new Vector3(),
    radius: 0,
    box: new Box3(),
    obb: new OBB(),
  }));
}

function updateWorldBounds(
  collisionParts: CollisionPart[],
  worlds: Map<string, Matrix4>,
  bounds: WorldBound[],
  indices?: number[],
): void {
  const length = indices?.length ?? collisionParts.length;
  for (let offset = 0; offset < length; offset += 1) {
    const index = indices?.[offset] ?? offset;
    const collisionPart = collisionParts[index];
    const world = worlds.get(collisionPart.part.id)!;
    bounds[index].center
      .copy(collisionPart.localBoundingCenter)
      .applyMatrix4(world);
    bounds[index].radius =
      collisionPart.boundingRadius * world.getMaxScaleOnAxis();
    bounds[index].box.copy(collisionPart.localBoundingBox).applyMatrix4(world);
    bounds[index].obb.copy(collisionPart.localBoundingObb).applyMatrix4(world);
    bounds[index].obb.center
      .copy(collisionPart.localBoundingObb.center)
      .applyMatrix4(world);
  }
}

function broadPhaseIntersects(a: WorldBound, b: WorldBound): boolean {
  const radius = a.radius + b.radius;
  return (
    a.center.distanceToSquared(b.center) <= radius * radius &&
    a.box.intersectsBox(b.box) &&
    a.obb.intersectsOBB(b.obb)
  );
}

function shaftRadiallySeparated(
  shaft: CollisionPart,
  shaftWorld: Matrix4,
  otherBound: WorldBound,
): boolean {
  if (shaft.part.geometry.type !== "shaft") return false;
  const origin = new Vector3().setFromMatrixPosition(shaftWorld);
  const axis = new Vector3(0, 1, 0).transformDirection(shaftWorld);
  const offset = otherBound.center.clone().sub(origin);
  const axial = offset.dot(axis);
  const radialDistanceSquared = Math.max(0, offset.lengthSq() - axial * axial);
  const radialLimit =
    shaft.part.geometry.radius * shaftWorld.getMaxScaleOnAxis() +
    otherBound.radius;
  return radialDistanceSquared > radialLimit * radialLimit;
}

function bvhIntersects(
  a: CollisionPart,
  b: CollisionPart,
  aWorld: Matrix4,
  bWorld: Matrix4,
  aBound: WorldBound,
  bBound: WorldBound,
): boolean {
  if (!broadPhaseIntersects(aBound, bBound)) return false;
  if (
    shaftRadiallySeparated(a, aWorld, bBound) ||
    shaftRadiallySeparated(b, bWorld, aBound)
  )
    return false;
  const bToA = aWorld.clone().invert().multiply(bWorld);
  return a.bvh.intersectsGeometry(b.mesh.geometry, bToA);
}

function gearParameters(part: PartDef): {
  addendum: number;
  module: number;
  pitchRadius: number;
  teeth: number;
  thickness: number;
  toothStyle: "involute" | "trapezoid" | "pin";
} | null {
  if (part.geometry.type !== "gear") return null;
  return {
    addendum: part.geometry.module,
    module: part.geometry.module,
    pitchRadius: (part.geometry.module * part.geometry.teeth) / 2,
    teeth: part.geometry.teeth,
    thickness: part.geometry.thickness,
    toothStyle: part.geometry.toothStyle,
  };
}

function centerVector(aWorld: Matrix4, bWorld: Matrix4): Vector3 {
  const a = new Vector3().setFromMatrixPosition(aWorld);
  const b = new Vector3().setFromMatrixPosition(bWorld);
  return b.sub(a);
}

function gearAxis(part: PartDef, world: Matrix4): Vector3 {
  return new Vector3(...(part.joint?.axis ?? [0, 1, 0]))
    .normalize()
    .transformDirection(world);
}

function analyticGearFailure(
  a: PartDef,
  b: PartDef,
  aWorld: Matrix4,
  bWorld: Matrix4,
): string | null {
  const gearA = gearParameters(a);
  const gearB = gearParameters(b);
  if (!gearA || !gearB)
    return "collision whitelist endpoints must both be gears";
  const axisA = gearAxis(a, aWorld);
  const axisB = gearAxis(b, bWorld);
  const axisDot = Math.abs(axisA.dot(axisB));
  const parallel = axisDot >= Math.cos(Math.PI / 180);
  const rightAnglePinMesh =
    axisDot <= Math.sin(Math.PI / 180) &&
    (gearA.toothStyle === "pin" || gearB.toothStyle === "pin");
  if (!parallel && !rightAnglePinMesh) {
    return `gear axes are incompatible (absolute dot ${axisDot})`;
  }
  if (
    Math.abs(gearA.module - gearB.module) >
    0.01 * Math.min(gearA.module, gearB.module)
  ) {
    return `gear modules ${gearA.module}/${gearB.module} differ by more than 1%`;
  }

  const delta = centerVector(aWorld, bWorld);
  let distance: number;
  if (parallel) {
    const axialOffset = Math.abs(delta.dot(axisA));
    if (axialOffset >= (gearA.thickness + gearB.thickness) / 2) {
      return `gear faces have no axial overlap (offset ${axialOffset})`;
    }
    distance = delta.clone().addScaledVector(axisA, -delta.dot(axisA)).length();
  } else {
    if (
      Math.abs(delta.dot(axisA)) > 0.15 * gearA.module ||
      Math.abs(delta.dot(axisB)) > 0.15 * gearB.module
    ) {
      return "right-angle pin mesh centers do not lie in both gear planes";
    }
    distance = delta.length();
  }
  const pitchSum = gearA.pitchRadius + gearB.pitchRadius;
  const conservativeModule = Math.min(gearA.module, gearB.module);
  if (!(distance < pitchSum + gearA.addendum + gearB.addendum)) {
    return `gear addenda do not engage (center distance ${distance})`;
  }
  if (!(distance - pitchSum > 0)) {
    return `gear backlash must be positive (radial allowance ${distance - pitchSum})`;
  }
  if (!(Math.abs(distance - pitchSum) < 0.15 * conservativeModule)) {
    return `gear center distance ${distance} exceeds 0.15 module tolerance`;
  }
  return null;
}

function appendCollisionTriangles(
  source: BufferGeometry,
  positions: number[],
  transform?: Matrix4,
): void {
  const position = source.getAttribute("position");
  const index = source.getIndex();
  const vertexCount = index?.count ?? position?.count ?? 0;
  if (!position || vertexCount === 0 || vertexCount % 3 !== 0) {
    throw new Error("Collision geometry must contain complete triangles");
  }
  const vertex = new Vector3();
  for (let offset = 0; offset < vertexCount; offset += 1) {
    const vertexIndex = index ? index.getX(offset) : offset;
    vertex.fromBufferAttribute(position, vertexIndex);
    if (transform) vertex.applyMatrix4(transform);
    positions.push(vertex.x, vertex.y, vertex.z);
  }
}

export function buildPartCollisionGeometry(
  module: MachineModule,
  part: PartDef,
): BufferGeometry {
  const built = buildPartGeometry(part.geometry, module.customBuilders);
  const positions: number[] = [];
  try {
    for (const entry of partGeometryEntries(built)) {
      const instanceMatrices = getMechanicaInstanceMatrices(entry);
      if (instanceMatrices) {
        for (const values of instanceMatrices) {
          appendCollisionTriangles(
            entry,
            positions,
            new Matrix4().fromArray(values),
          );
        }
      } else {
        appendCollisionTriangles(entry, positions);
      }
    }
  } finally {
    disposePartGeometry(built);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

function buildCollisionParts(module: MachineModule): CollisionPart[] {
  return module.spec.parts.map((part) => {
    const geometry = buildPartCollisionGeometry(module, part);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    const boundingSphere = geometry.boundingSphere;
    const boundingBox = geometry.boundingBox;
    if (!boundingSphere || !boundingBox) {
      throw new Error(`Part ${part.id} has no collision bounds`);
    }
    return {
      part,
      mesh: new Mesh(geometry),
      bvh: new MeshBVH(geometry),
      localBoundingCenter: boundingSphere.center.clone(),
      boundingRadius: boundingSphere.radius,
      localBoundingBox: boundingBox.clone(),
      localBoundingObb: new OBB().fromBox3(boundingBox),
    };
  });
}

function reachableRatio(
  module: MachineModule,
  graph: GraphLike,
  drive: string,
  part: string,
): number {
  const hasTrigger = module.mechanism?.triggers.some(
    (candidate) => candidate.id === `drive:${drive}`,
  );
  if (!hasTrigger) {
    const direct = graph.ratioBetween(drive, part);
    if (direct !== null) return Math.abs(direct);
  }

  graph.setInput(drive, 0);
  const atZero = graph.state()[part] ?? 0;
  setDriveAngle(module, graph, drive, 0, 1);
  const atUnit = graph.state()[part] ?? 0;
  setDriveAngle(module, graph, drive, 1, 0);
  return Math.abs(atUnit - atZero);
}

function setDriveAngle(
  module: MachineModule,
  graph: GraphLike,
  drive: string,
  current: number,
  target: number,
): void {
  const trigger = module.mechanism?.triggers.find(
    (candidate) => candidate.id === `drive:${drive}`,
  );
  if (trigger) trigger.run(graph, () => undefined, target - current);
  else graph.setInput(drive, target);
}

function collisionDriveIds(module: MachineModule): string[] {
  const triggerIds = new Set(
    (module.mechanism?.triggers ?? []).map((trigger) => trigger.id),
  );
  const primary = primaryDriveId(module.spec);
  const graph = new KinematicGraph(module.spec);
  return [
    ...new Set([
      primary,
      ...module.spec.driveNodes.filter(
        (drive) =>
          triggerIds.has(`drive:${drive}`) ||
          graph.ratioBetween(primary, drive) === null,
      ),
    ]),
  ];
}

function validateWhitelistedPairs(
  module: MachineModule,
  whitelist: Array<[string, string]>,
  collisionParts: CollisionPart[],
  plan: SamplingPlan,
  transforms: WorldTransforms,
): ValidationCheck[] {
  const parts = new Map(module.spec.parts.map((part) => [part.id, part]));
  const collisionById = new Map(
    collisionParts.map((part) => [part.part.id, part]),
  );
  const collisionIndexById = new Map(
    collisionParts.map((part, index) => [part.part.id, index]),
  );
  const bounds = createWorldBounds(collisionParts);
  const drive = primaryDriveId(module.spec);
  const results = new Map<
    string,
    { failure: string | null; failureAngle: number; gearPair: boolean }
  >();
  const gearPairs: Array<{
    a: PartDef;
    aCollision: CollisionPart;
    aIndex: number;
    b: PartDef;
    bCollision: CollisionPart;
    bIndex: number;
    drive: string;
    faster: PartDef;
    ratio: number;
  }> = [];
  const contactPairs: Array<{
    a: CollisionPart;
    aIndex: number;
    b: CollisionPart;
    bIndex: number;
    contactSeen: boolean;
  }> = [];

  for (const [aId, bId] of whitelist) {
    const a = parts.get(aId);
    const b = parts.get(bId);
    const key = pairKey(aId, bId);
    if (!a || !b) {
      results.set(key, {
        failure: `Collision whitelist pair ${aId}/${bId} is unresolved`,
        failureAngle: 0,
        gearPair: false,
      });
      continue;
    }
    const gearPair = a.geometry.type === "gear" && b.geometry.type === "gear";
    const collisionA = collisionById.get(aId);
    const collisionB = collisionById.get(bId);
    const collisionAIndex = collisionIndexById.get(aId);
    const collisionBIndex = collisionIndexById.get(bId);
    if (
      !collisionA ||
      !collisionB ||
      collisionAIndex === undefined ||
      collisionBIndex === undefined
    ) {
      results.set(key, {
        failure: "whitelisted collision geometry is unavailable",
        failureAngle: 0,
        gearPair,
      });
      continue;
    }

    try {
      if (gearPair) {
        let selected:
          | { coverage: number; drive: string; ratioA: number; ratioB: number }
          | undefined;
        for (const candidate of new Set([drive, ...module.spec.driveNodes])) {
          const ratioA = reachableRatio(
            module,
            new KinematicGraph(module.spec),
            candidate,
            aId,
          );
          const ratioB = reachableRatio(
            module,
            new KinematicGraph(module.spec),
            candidate,
            bId,
          );
          const coverage = Number(ratioA > 0) + Number(ratioB > 0);
          if (
            !selected ||
            coverage > selected.coverage ||
            (coverage === selected.coverage &&
              Math.min(ratioA, ratioB) >
                Math.min(selected.ratioA, selected.ratioB))
          ) {
            selected = { coverage, drive: candidate, ratioA, ratioB };
          }
        }
        const ratioA = selected?.ratioA ?? 0;
        const ratioB = selected?.ratioB ?? 0;
        const faster =
          ratioA >= ratioB
            ? { part: a, ratio: ratioA }
            : { part: b, ratio: ratioB };
        if (faster.ratio <= 0) {
          results.set(key, {
            failure:
              "whitelisted pair is not reachable from any declared drive",
            failureAngle: 0,
            gearPair,
          });
          continue;
        }
        gearPairs.push({
          a,
          aCollision: collisionA,
          aIndex: collisionAIndex,
          b,
          bCollision: collisionB,
          bIndex: collisionBIndex,
          drive: selected?.drive ?? drive,
          faster: faster.part,
          ratio: faster.ratio,
        });
      } else {
        contactPairs.push({
          a: collisionA,
          aIndex: collisionAIndex,
          b: collisionB,
          bIndex: collisionBIndex,
          contactSeen: false,
        });
      }
    } catch (error) {
      results.set(key, {
        failure: error instanceof Error ? error.message : String(error),
        failureAngle: 0,
        gearPair,
      });
    }
  }

  for (const pair of gearPairs) {
    const key = pairKey(pair.a.id, pair.b.id);
    let failure: string | null = null;
    let failureAngle = 0;
    let contactSeen = false;
    let currentAngle = 0;
    const pairGraph = new KinematicGraph(module.spec);
    try {
      let worlds = updateWorldTransforms(transforms, pairGraph.state());
      updateWorldBounds(collisionParts, worlds, bounds);
      const gearSamples = Math.max(
        4,
        (pair.faster.geometry.type === "gear"
          ? pair.faster.geometry.teeth
          : 1) * 4,
      );
      for (let sample = 0; sample < gearSamples; sample += 1) {
        const angle = (((Math.PI * 2) / pair.ratio) * sample) / gearSamples;
        setDriveAngle(module, pairGraph, pair.drive, currentAngle, angle);
        currentAngle = angle;
        worlds = updateWorldTransforms(transforms, pairGraph.state());
        updateWorldBounds(
          collisionParts,
          worlds,
          bounds,
          transforms.movingIndices,
        );
        failure = analyticGearFailure(
          pair.a,
          pair.b,
          worlds.get(pair.a.id)!,
          worlds.get(pair.b.id)!,
        );
        if (failure) {
          failureAngle = angle;
          break;
        }
        if (
          bvhIntersects(
            pair.aCollision,
            pair.bCollision,
            worlds.get(pair.a.id)!,
            worlds.get(pair.b.id)!,
            bounds[pair.aIndex],
            bounds[pair.bIndex],
          )
        )
          contactSeen = true;
      }
      if (!failure && !contactSeen)
        failure = "the complete motion sweep is contact-free in 3D";
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    } finally {
      try {
        setDriveAngle(module, pairGraph, pair.drive, currentAngle, 0);
      } catch {
        // The emitted check preserves the useful validation failure.
      }
    }
    results.set(key, { failure, failureAngle, gearPair: true });
  }

  if (contactPairs.length > 0) {
    let sweepFailure: string | null = null;
    for (const contactDrive of collisionDriveIds(module)) {
      const contactGraph = new KinematicGraph(module.spec);
      let currentAngle = 0;
      try {
        let worlds = updateWorldTransforms(transforms, contactGraph.state());
        updateWorldBounds(collisionParts, worlds, bounds);
        for (const angle of sampleAngles(plan)) {
          setDriveAngle(
            module,
            contactGraph,
            contactDrive,
            currentAngle,
            angle,
          );
          currentAngle = angle;
          worlds = updateWorldTransforms(transforms, contactGraph.state());
          updateWorldBounds(
            collisionParts,
            worlds,
            bounds,
            transforms.movingIndices,
          );
          for (const pair of contactPairs) {
            if (pair.contactSeen) continue;
            if (
              bvhIntersects(
                pair.a,
                pair.b,
                worlds.get(pair.a.part.id)!,
                worlds.get(pair.b.part.id)!,
                bounds[pair.aIndex],
                bounds[pair.bIndex],
              )
            )
              pair.contactSeen = true;
          }
          if (contactPairs.every((pair) => pair.contactSeen)) break;
        }
      } catch (error) {
        sweepFailure = error instanceof Error ? error.message : String(error);
      } finally {
        try {
          setDriveAngle(module, contactGraph, contactDrive, currentAngle, 0);
        } catch {
          // The emitted check preserves the useful validation failure.
        }
      }
      if (sweepFailure || contactPairs.every((pair) => pair.contactSeen)) break;
    }
    for (const pair of contactPairs) {
      results.set(pairKey(pair.a.part.id, pair.b.part.id), {
        failure:
          sweepFailure ??
          (pair.contactSeen
            ? null
            : "the complete motion sweep is contact-free in 3D"),
        failureAngle: 0,
        gearPair: false,
      });
    }
  }

  return whitelist.map(([aId, bId]) => {
    const result = results.get(pairKey(aId, bId)) ?? {
      failure: "whitelist validation produced no result",
      failureAngle: 0,
      gearPair: false,
    };
    return {
      id: `collision:whitelist:${aId}:${bId}`,
      status: result.failure ? "fail" : "pass",
      message: result.failure
        ? `Whitelisted pair ${aId}/${bId} fails at drive angle ${result.failureAngle} rad: ${result.failure}`
        : result.gearPair
          ? `Whitelisted gear pair ${aId}/${bId} passes module, axis, plane-overlap, signed-clearance, and 3D tooth-contact checks.`
          : `Whitelisted contact pair ${aId}/${bId} intersects during its complete motion sweep.`,
    } satisfies ValidationCheck;
  });
}

export function validateCollisions(
  module: MachineModule,
  graph: GraphLike,
  plan: SamplingPlan,
): ValidationCheck[] {
  const whitelist = module.spec.collisionWhitelist ?? [];
  const whitelisted = new Set(whitelist.map(([a, b]) => pairKey(a, b)));
  const drive = primaryDriveId(module.spec);
  let collisionParts: CollisionPart[];

  try {
    collisionParts = buildCollisionParts(module);
  } catch (error) {
    return [
      {
        id: "collision:geometry",
        status: "fail",
        message: `Collision geometry could not be constructed: ${error instanceof Error ? error.message : String(error)}`,
      },
    ];
  }
  const transforms = createWorldTransforms(module.spec);
  const checks = validateWhitelistedPairs(
    module,
    whitelist,
    collisionParts,
    plan,
    transforms,
  );
  let failure: { a: string; b: string; angle: number; drive: string } | null =
    null;
  try {
    for (const collisionDrive of collisionDriveIds(module)) {
      const collisionGraph =
        collisionDrive === drive ? graph : new KinematicGraph(module.spec);
      const bounds = createWorldBounds(collisionParts);
      let currentAngle = collisionGraph.state()[collisionDrive] ?? 0;
      try {
        setDriveAngle(module, collisionGraph, collisionDrive, currentAngle, 0);
        currentAngle = 0;
        let worlds = updateWorldTransforms(transforms, collisionGraph.state());
        updateWorldBounds(collisionParts, worlds, bounds);

        for (const angle of sampleAngles(plan)) {
          setDriveAngle(
            module,
            collisionGraph,
            collisionDrive,
            currentAngle,
            angle,
          );
          currentAngle = angle;
          worlds = updateWorldTransforms(transforms, collisionGraph.state());
          updateWorldBounds(
            collisionParts,
            worlds,
            bounds,
            transforms.movingIndices,
          );
          for (
            let aIndex = 0;
            aIndex < collisionParts.length && !failure;
            aIndex += 1
          ) {
            const a = collisionParts[aIndex];
            for (
              let bIndex = aIndex + 1;
              bIndex < collisionParts.length;
              bIndex += 1
            ) {
              const b = collisionParts[bIndex];
              if (
                whitelisted.has(pairKey(a.part.id, b.part.id)) ||
                directlyFixed(a.part, b.part)
              )
                continue;
              if (
                bvhIntersects(
                  a,
                  b,
                  worlds.get(a.part.id)!,
                  worlds.get(b.part.id)!,
                  bounds[aIndex],
                  bounds[bIndex],
                )
              ) {
                failure = {
                  a: a.part.id,
                  b: b.part.id,
                  angle,
                  drive: collisionDrive,
                };
                break;
              }
            }
          }
          if (failure) break;
        }
      } finally {
        try {
          setDriveAngle(
            module,
            collisionGraph,
            collisionDrive,
            currentAngle,
            0,
          );
        } catch {
          // The emitted check preserves the useful validation failure.
        }
      }
      if (failure) break;
    }
  } catch (error) {
    checks.push({
      id: "collision:bvh",
      status: "fail",
      message: `BVH collision sampling failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return checks;
  }

  checks.push({
    id: failure ? `collision:${failure.a}:${failure.b}` : "collision:bvh",
    status: failure ? "fail" : "pass",
    message: failure
      ? `Parts ${failure.a} and ${failure.b} collide while driving ${failure.drive} at angle ${failure.angle} rad.`
      : plan.capped
        ? `No issue found at ${plan.resolutionDeg}° resolution; the sampling cap prevents an exact collision-free claim.`
        : `No issue found at ${plan.resolutionDeg}° resolution.`,
  });
  return checks;
}

export function collisionPairsAtAngle(
  module: MachineModule,
  graph: GraphLike,
  angle: number,
): Array<[string, string]> {
  const drive = primaryDriveId(module.spec);
  const whitelist = new Set(
    (module.spec.collisionWhitelist ?? []).map(([a, b]) => pairKey(a, b)),
  );
  const collisionParts = buildCollisionParts(module);
  const transforms = createWorldTransforms(module.spec);
  const currentAngle = graph.state()[drive] ?? 0;
  setDriveAngle(module, graph, drive, currentAngle, angle);
  const worlds = updateWorldTransforms(transforms, graph.state());
  const bounds = createWorldBounds(collisionParts);
  updateWorldBounds(collisionParts, worlds, bounds);
  const collisions: Array<[string, string]> = [];
  for (let aIndex = 0; aIndex < collisionParts.length; aIndex += 1) {
    const a = collisionParts[aIndex];
    for (let bIndex = aIndex + 1; bIndex < collisionParts.length; bIndex += 1) {
      const b = collisionParts[bIndex];
      if (
        whitelist.has(pairKey(a.part.id, b.part.id)) ||
        directlyFixed(a.part, b.part)
      )
        continue;
      if (
        bvhIntersects(
          a,
          b,
          worlds.get(a.part.id)!,
          worlds.get(b.part.id)!,
          bounds[aIndex],
          bounds[bIndex],
        )
      ) {
        collisions.push([a.part.id, b.part.id]);
      }
    }
  }
  return collisions;
}
