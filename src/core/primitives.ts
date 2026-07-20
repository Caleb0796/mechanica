import * as THREE from "three";

import type { GeometryDef } from "../sim/types";
import { buildGearGeometry } from "./gears";
import { ensureBoxProjectedUvs } from "./geometryUvs";

export type PartGeometry = THREE.BufferGeometry | THREE.BufferGeometry[];

export type CustomBuilderRegistry = Record<
  string,
  (params: Record<string, number>) => unknown
>;

const MAX_COMPOSITE_GEOMETRIES = 4;

interface MechanicaInstanceBounds {
  box: THREE.Box3;
  sphere: THREE.Sphere;
}

interface MechanicaInstancePayload {
  bounds?: MechanicaInstanceBounds;
  matrices?: unknown;
}

export function partGeometryEntries(
  geometry: PartGeometry,
): readonly THREE.BufferGeometry[] {
  return Array.isArray(geometry) ? geometry : [geometry];
}

export function singlePartGeometry(
  geometry: PartGeometry,
): THREE.BufferGeometry {
  if (Array.isArray(geometry)) {
    throw new Error("Expected one geometry but received a composite part");
  }
  return geometry;
}

export function disposePartGeometry(geometry: PartGeometry): void {
  for (const entry of partGeometryEntries(geometry)) entry.dispose();
}

export function getMechanicaInstanceMatrices(
  geometry: THREE.BufferGeometry,
): readonly number[][] | null {
  const payload = geometry.userData.mechanicaInstances as
    | MechanicaInstancePayload
    | undefined;
  if (payload === undefined) return null;
  if (
    !Array.isArray(payload.matrices) ||
    payload.matrices.length === 0 ||
    payload.matrices.some(
      (matrix) =>
        !Array.isArray(matrix) ||
        matrix.length !== 16 ||
        matrix.some(
          (value) => typeof value !== "number" || !Number.isFinite(value),
        ),
    )
  ) {
    throw new Error(
      "Custom geometry mechanicaInstances must contain finite 4x4 matrices",
    );
  }
  return payload.matrices as number[][];
}

function prepareMechanicaInstanceBounds(
  geometry: THREE.BufferGeometry,
): MechanicaInstanceBounds | null {
  const payload = geometry.userData.mechanicaInstances as
    | MechanicaInstancePayload
    | undefined;
  if (!payload) return null;
  if (payload.bounds) return payload.bounds;
  const matrices = getMechanicaInstanceMatrices(geometry);
  if (!matrices) return null;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingBox) {
    throw new Error("Instanced geometry must provide finite position bounds");
  }
  const box = new THREE.Box3();
  const matrix = new THREE.Matrix4();
  for (const values of matrices) {
    box.union(
      geometry.boundingBox.clone().applyMatrix4(matrix.fromArray(values)),
    );
  }
  payload.bounds = {
    box,
    sphere: box.getBoundingSphere(new THREE.Sphere()),
  };
  return payload.bounds;
}

export function applyMechanicaInstanceMatrices(
  mesh: THREE.InstancedMesh,
  matrices: readonly number[][],
): void {
  if (mesh.count !== matrices.length) {
    throw new Error(
      `Instanced mesh count ${mesh.count} does not match ${matrices.length} matrices`,
    );
  }
  const matrix = new THREE.Matrix4();
  matrices.forEach((values, index) => {
    mesh.setMatrixAt(index, matrix.fromArray(values));
  });
  mesh.instanceMatrix.needsUpdate = true;
  const bounds = prepareMechanicaInstanceBounds(mesh.geometry);
  if (!mesh.boundingBox && bounds) mesh.boundingBox = bounds.box.clone();
  if (!mesh.boundingSphere && bounds) {
    mesh.boundingSphere = bounds.sphere.clone();
  }
  mesh.frustumCulled =
    typeof mesh.geometry.userData.mechanicaUpdate !== "function";
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

function assertSize(size: readonly number[], label: string): void {
  if (
    size.length !== 3 ||
    size.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error(`${label} must contain three positive finite dimensions`);
  }
}

function mergeGeometries(
  geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const prepared = geometries.map((source) =>
    source.index ? source.toNonIndexed() : source.clone(),
  );
  const projectionBounds = new THREE.Box3();
  for (const geometry of prepared) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) projectionBounds.union(geometry.boundingBox);
  }

  for (const preparedGeometry of prepared) {
    const geometry = ensureBoxProjectedUvs(preparedGeometry, projectionBounds);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < position.count; i += 1) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      if (normal) {
        normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      }
      if (uv) {
        uvs.push(uv.getX(i), uv.getY(i));
      }
    }
  }
  for (const geometry of prepared) geometry.dispose();

  const merged = new THREE.BufferGeometry();
  merged.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  if (normals.length === positions.length) {
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    merged.computeVertexNormals();
  }
  if (uvs.length * 3 === positions.length * 2) {
    merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function buildWheel(
  radius: number,
  width: number,
  spokeCount: number,
): THREE.BufferGeometry {
  assertPositive(radius, "Wheel radius");
  assertPositive(width, "Wheel width");
  if (!Number.isInteger(spokeCount) || spokeCount < 1) {
    throw new Error("Wheel spokes must be a positive integer");
  }
  if (width >= radius * 2) {
    throw new Error("Wheel width must be smaller than its diameter");
  }

  const tube = Math.min(width / 2, radius / 2);
  const rim = new THREE.TorusGeometry(radius - tube, tube, 8, 32);
  rim.rotateX(Math.PI / 2);
  const geometries: THREE.BufferGeometry[] = [rim];
  const spokeLength = Math.max(radius - width, width);

  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const geometry = new THREE.BoxGeometry(
      spokeLength,
      Math.min(width, radius * 0.25),
      Math.min(width * 0.35, radius * 0.15),
    );
    geometry.translate(spokeLength / 2, 0, 0);
    geometry.rotateY((spoke * Math.PI * 2) / spokeCount);
    geometries.push(geometry);
  }

  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) {
    geometry.dispose();
  }
  return merged;
}

function buildScoop(
  size: readonly [number, number, number],
): THREE.BufferGeometry {
  assertSize(size, "Scoop size");
  const [width, height, depth] = size;
  const wall = Math.min(width, height, depth) * 0.08;
  const bottom = new THREE.BoxGeometry(width, wall, depth);
  bottom.translate(0, -height / 2 + wall / 2, 0);
  const back = new THREE.BoxGeometry(width, height, wall);
  back.translate(0, 0, -depth / 2 + wall / 2);
  const left = new THREE.BoxGeometry(wall, height, depth);
  left.translate(-width / 2 + wall / 2, 0, 0);
  const right = new THREE.BoxGeometry(wall, height, depth);
  right.translate(width / 2 - wall / 2, 0, 0);
  const geometries = [bottom, back, left, right];
  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) {
    geometry.dispose();
  }
  return merged;
}

export function buildPartGeometry(
  def: GeometryDef,
  registry: CustomBuilderRegistry = {},
): PartGeometry {
  switch (def.type) {
    case "gear":
      return buildGearGeometry(def);
    case "shaft":
      assertPositive(def.radius, "Shaft radius");
      assertPositive(def.length, "Shaft length");
      return new THREE.CylinderGeometry(def.radius, def.radius, def.length, 24);
    case "beam":
      assertSize(def.size, "Beam size");
      return new THREE.BoxGeometry(...def.size);
    case "wheel":
      return buildWheel(def.radius, def.width, def.spokes ?? 8);
    case "scoop":
      return buildScoop(def.size);
    case "shell":
      assertPositive(def.radius, "Shell radius");
      return new THREE.SphereGeometry(
        def.radius,
        32,
        16,
        0,
        def.cutaway ? Math.PI : Math.PI * 2,
        0,
        Math.PI,
      );
    case "ring": {
      assertPositive(def.radius, "Ring radius");
      assertPositive(def.tube, "Ring tube");
      const geometry = new THREE.TorusGeometry(def.radius, def.tube, 12, 32);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }
    case "link":
      assertPositive(def.length, "Link length");
      assertPositive(def.width, "Link width");
      return new THREE.BoxGeometry(def.length, def.width, def.width);
    case "box":
      assertSize(def.size, "Box size");
      return new THREE.BoxGeometry(...def.size);
    case "custom": {
      const builder = registry[def.builder];
      if (!builder) {
        throw new Error(`Unknown custom geometry builder "${def.builder}"`);
      }
      const built = builder(def.params);
      const composite = Array.isArray(built);
      const geometries = composite ? built : [built];
      if (
        geometries.length === 0 ||
        geometries.length > MAX_COMPOSITE_GEOMETRIES ||
        geometries.some(
          (geometry) =>
            !geometry ||
            typeof geometry !== "object" ||
            !("isBufferGeometry" in geometry) ||
            geometry.isBufferGeometry !== true,
        )
      ) {
        for (const geometry of geometries) {
          if (
            geometry &&
            typeof geometry === "object" &&
            "isBufferGeometry" in geometry &&
            geometry.isBufferGeometry === true
          ) {
            (geometry as THREE.BufferGeometry).dispose();
          }
        }
        throw new Error(
          `Custom geometry builder "${def.builder}" must return one to ${MAX_COMPOSITE_GEOMETRIES} THREE.BufferGeometry entries`,
        );
      }
      const bufferGeometries = geometries as THREE.BufferGeometry[];
      if (
        composite &&
        bufferGeometries.some(
          (geometry) => geometry.userData.mechanicaInstances !== undefined,
        )
      ) {
        for (const geometry of bufferGeometries) geometry.dispose();
        throw new Error(
          `Composite custom geometry builder "${def.builder}" cannot contain mechanicaInstances`,
        );
      }
      bufferGeometries.forEach((geometry, index) => {
        const entry = ensureBoxProjectedUvs(geometry);
        if (entry !== geometry) geometry.dispose();
        bufferGeometries[index] = entry;
      });
      for (const geometry of bufferGeometries) {
        prepareMechanicaInstanceBounds(geometry);
      }
      return composite ? bufferGeometries : bufferGeometries[0];
    }
    default: {
      const exhaustive: never = def;
      throw new Error(`Unsupported geometry definition: ${String(exhaustive)}`);
    }
  }
}
