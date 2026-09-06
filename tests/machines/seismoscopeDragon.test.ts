import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { describe, expect, it } from "vitest";

import { standardMaterial } from "../../src/core/materials";
import {
  buildPartGeometry,
  singlePartGeometry,
} from "../../src/core/primitives";
import machine from "../../src/machines/seismoscope/build";
import { applySchemePatch } from "../../src/sim/graph";
import type { MachineSpec, PartDef, Provenance } from "../../src/sim/types";
import { buildPartCollisionGeometry } from "../../src/validate/collision";

const resolvedSpecs: Array<[string, MachineSpec]> = [
  ["base", machine.spec],
  ...Object.entries(machine.schemes ?? {}).map(
    ([id, patch]): [string, MachineSpec] => [
      id,
      applySchemePatch(machine.spec, patch),
    ],
  ),
];

function part(spec: MachineSpec, id: string): PartDef {
  const found = spec.parts.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing ${id}`);
  return found;
}

function worldPose(
  spec: MachineSpec,
  definition: PartDef,
  state: Readonly<Record<string, number>>,
): THREE.Matrix4 {
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...definition.position),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(...(definition.rotationEuler ?? [0, 0, 0])),
    ),
    new THREE.Vector3(1, 1, 1),
  );
  const joint = definition.joint;
  const value = state[definition.id] ?? 0;
  if (joint?.kind === "revolute") {
    local.multiply(
      new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(...joint.axis).normalize(),
        value,
      ),
    );
  } else if (joint?.kind === "prismatic") {
    const translation = new THREE.Vector3(...joint.axis)
      .normalize()
      .multiplyScalar(value);
    local.premultiply(
      new THREE.Matrix4().makeTranslation(...translation.toArray()),
    );
  }
  return definition.parent
    ? worldPose(spec, part(spec, definition.parent), state).multiply(local)
    : local;
}

function checkProvenance(provenance: Provenance | undefined): void {
  expect(provenance).toBeDefined();
  expect(["wenxian", "wenwu", "tuice"]).toContain(provenance?.kind);
  expect(provenance?.ref.trim()).not.toBe("");
  if (provenance && provenance.kind !== "tuice") {
    const sources = new Set(machine.data.sources.map((source) => source.id));
    for (const ref of provenance.ref.split("+").map((entry) => entry.trim())) {
      expect(sources.has(ref), `Unresolved source ${ref}`).toBe(true);
    }
  }
}

function checkMeshIntegrity(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  expect(position.itemSize).toBe(3);
  expect(position.count).toBeGreaterThan(0);
  expect(normal.itemSize).toBe(3);
  expect(normal.count).toBe(position.count);
  expect(index).not.toBeNull();
  expect(index!.count % 3).toBe(0);

  const invalidVertices: number[] = [];
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    if (
      ![
        position.getX(vertex),
        position.getY(vertex),
        position.getZ(vertex),
        normal.getX(vertex),
        normal.getY(vertex),
        normal.getZ(vertex),
      ].every(Number.isFinite)
    ) {
      invalidVertices.push(vertex);
    }
  }
  expect(invalidVertices, "Nonfinite mesh positions or normals").toEqual([]);

  const indices = Array.from(index!.array);
  expect(
    indices.every(
      (vertex) =>
        Number.isInteger(vertex) && vertex >= 0 && vertex < position.count,
    ),
    "Triangle indices must address existing vertices",
  ).toBe(true);

  // Primitive caps may leave unused pole vertices. Every vertex contributing
  // to a nondegenerate surface still needs a unit normal after merging/scaling.
  const activeVertices = new Set<number>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    a.fromBufferAttribute(position, indices[triangle]);
    b.fromBufferAttribute(position, indices[triangle + 1]).sub(a);
    c.fromBufferAttribute(position, indices[triangle + 2]).sub(a);
    if (b.cross(c).lengthSq() > 1e-24) {
      activeVertices.add(indices[triangle]);
      activeVertices.add(indices[triangle + 1]);
      activeVertices.add(indices[triangle + 2]);
    }
  }
  expect(activeVertices.size).toBeGreaterThan(0);
  const invalidNormals = [...activeVertices].filter((vertex) => {
    const length = Math.hypot(
      normal.getX(vertex),
      normal.getY(vertex),
      normal.getZ(vertex),
    );
    return Math.abs(length - 1) > 1e-4;
  });
  expect(invalidNormals, "Surface normals must remain normalized").toEqual([]);

  expect(geometry.boundingBox?.isEmpty()).toBe(false);
  expect(geometry.boundingSphere?.radius).toBeGreaterThan(0);
  const invalidBounds = [
    ...geometry.boundingBox!.min.toArray(),
    ...geometry.boundingBox!.max.toArray(),
    ...geometry.boundingSphere!.center.toArray(),
    geometry.boundingSphere!.radius,
  ].filter((value) => !Number.isFinite(value));
  expect(invalidBounds).toEqual([]);
}

describe.each(resolvedSpecs)(
  "seismoscope dragon geometry — %s",
  (_id, spec) => {
    it("preserves finite surfaces, fitted bounds, and material/provenance for all eight heads", () => {
      const dragons = spec.parts.filter((candidate) =>
        /^dragon-\d+$/.test(candidate.id),
      );
      expect(dragons).toHaveLength(8);

      for (const dragon of dragons) {
        if (dragon.geometry.type !== "custom") {
          throw new Error(`${dragon.id} no longer has custom geometry`);
        }
        const radius = dragon.geometry.params.radius;
        const geometry = singlePartGeometry(
          buildPartGeometry(dragon.geometry, machine.customBuilders),
        );
        const material = standardMaterial(
          dragon.material,
          geometry.userData.mechanicaMaterial,
        );
        try {
          checkMeshIntegrity(geometry);
          const measuredBounds = new THREE.Box3().setFromBufferAttribute(
            geometry.getAttribute("position") as THREE.BufferAttribute,
          );
          const size = measuredBounds.getSize(new THREE.Vector3());
          expect(geometry.boundingBox!.equals(measuredBounds)).toBe(true);
          // The approved face keeps its fitted silhouette; only the upstream
          // vessel-following contact collar extends farther behind the face.
          expect(size.x).toBeCloseTo(radius * 3.5, 6);
          expect(size.y).toBeCloseTo(radius * 2.8, 6);
          expect(measuredBounds.min.x).toBeCloseTo(-radius * 1.75, 6);
          expect(measuredBounds.max.x).toBeCloseTo(radius * 1.75, 6);
          expect(measuredBounds.min.y).toBeCloseTo(-radius * 1.52, 6);
          expect(measuredBounds.max.y).toBeCloseTo(radius * 1.28, 6);
          expect(measuredBounds.max.z).toBeCloseTo(radius * 1.65, 6);
          expect(measuredBounds.min.z).toBeLessThan(-radius * 1.85);
          expect(measuredBounds.min.z).toBeGreaterThanOrEqual(-0.405);
          expect(geometry.userData.mechanicaSemantic.faceEnvelope).toEqual([
            radius * 3.5,
            radius * 2.8,
            radius * 3.5,
          ]);
          for (let axis = 0; axis < 3; axis += 1) {
            expect(size.getComponent(axis)).toBeCloseTo(
              geometry.userData.mechanicaSemantic.envelope[axis],
              6,
            );
          }

          expect(material.userData.mechanicaTextureVariant).toBe(
            "bronze:fresh",
          );
          for (const value of [material.metalness, material.roughness]) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          }
          expect(material.color.toArray().every(Number.isFinite)).toBe(true);
          const color = geometry.getAttribute("color");
          expect(
            color,
            "Facial patina colors must survive the composite merge",
          ).toBeDefined();
          expect(color.itemSize).toBe(3);
          expect(color.count).toBe(geometry.getAttribute("position").count);
          expect(
            material.vertexColors,
            "The viewer material must use the facial colors",
          ).toBe(true);
          const colors = Array.from(color.array);
          expect(
            colors.every(
              (value) => Number.isFinite(value) && value >= 0 && value <= 1,
            ),
          ).toBe(true);
          const firstColor = [color.getX(0), color.getY(0), color.getZ(0)];
          expect(
            Array.from({ length: color.count }, (_, vertex) => vertex).some(
              (vertex) =>
                color.getX(vertex) !== firstColor[0] ||
                color.getY(vertex) !== firstColor[1] ||
                color.getZ(vertex) !== firstColor[2],
            ),
            "Facial details must retain contrast against the bronze surface",
          ).toBe(true);

          checkProvenance(dragon.provenance);
          checkProvenance(
            dragon.dimensionProvenance["params.radius"] ??
              dragon.dimensionProvenance["@rest"],
          );
          checkProvenance(
            dragon.dimensionProvenance["joint.limits.0"] ??
              dragon.dimensionProvenance["@rest"],
          );
          checkProvenance(
            dragon.dimensionProvenance["joint.limits.1"] ??
              dragon.dimensionProvenance["@rest"],
          );
        } finally {
          geometry.dispose();
          material.dispose();
        }
      }
    });

    it("keeps every ball seated in its mouth and clear after the declared release", () => {
      for (let bearing = 0; bearing < 8; bearing += 1) {
        const dragon = part(spec, `dragon-${bearing}`);
        const ball = part(spec, `ball-${bearing}`);
        const dragonGeometry = buildPartCollisionGeometry(machine, dragon);
        const ballGeometry = buildPartCollisionGeometry(machine, ball);
        try {
          const bvh = new MeshBVH(dragonGeometry);
          const intersects = (state: Readonly<Record<string, number>>) =>
            bvh.intersectsGeometry(
              ballGeometry,
              worldPose(spec, dragon, state)
                .invert()
                .multiply(worldPose(spec, ball, state)),
            );
          expect(
            intersects({}),
            `${dragon.id} must retain its resting ball`,
          ).toBe(true);
          const releasedState = {
            [dragon.id]: dragon.joint!.limits![1],
            [ball.id]: ball.joint!.limits![1],
          };
          expect(
            intersects(releasedState),
            `${dragon.id} must clear the ball at the resolved release pose`,
          ).toBe(false);
        } finally {
          dragonGeometry.dispose();
          ballGeometry.dispose();
        }
      }
    });
  },
);
