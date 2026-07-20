import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { ensureBoxProjectedUvs } from "../../src/core/geometryUvs";
import {
  applyMechanicaInstanceMatrices,
  buildPartGeometry,
  getMechanicaInstanceMatrices,
  singlePartGeometry,
} from "../../src/core/primitives";

function uvlessQuad(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 4, 0, 0, 4, 1, 0, 0, 1, 0], 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.userData.fixture = "uvless";
  return geometry;
}

function expectFiniteUnitUvs(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  expect(uv.count).toBe(position.count);
  for (let vertex = 0; vertex < uv.count; vertex += 1) {
    expect(Number.isFinite(uv.getX(vertex))).toBe(true);
    expect(Number.isFinite(uv.getY(vertex))).toBe(true);
    expect(uv.getX(vertex)).toBeGreaterThanOrEqual(0);
    expect(uv.getX(vertex)).toBeLessThanOrEqual(1);
    expect(uv.getY(vertex)).toBeGreaterThanOrEqual(0);
    expect(uv.getY(vertex)).toBeLessThanOrEqual(1);
  }
}

describe("geometry UV preparation", () => {
  it("preserves an existing native UV attribute", () => {
    const geometry = new THREE.BoxGeometry(2, 1, 1);
    const nativeUv = geometry.getAttribute("uv");

    expect(ensureBoxProjectedUvs(geometry)).toBe(geometry);
    expect(geometry.getAttribute("uv")).toBe(nativeUv);
  });

  it("projects finite aspect-preserving UVs onto indexed geometry", () => {
    const source = uvlessQuad();
    const geometry = ensureBoxProjectedUvs(source);
    const uv = geometry.getAttribute("uv");

    expect(geometry).not.toBe(source);
    expect(geometry.index).toBeNull();
    expect(geometry.userData.fixture).toBe("uvless");
    expectFiniteUnitUvs(geometry);

    const uValues = Array.from({ length: uv.count }, (_, index) =>
      uv.getX(index),
    );
    const vValues = Array.from({ length: uv.count }, (_, index) =>
      uv.getY(index),
    );
    const uSpan = Math.max(...uValues) - Math.min(...uValues);
    const vSpan = Math.max(...vValues) - Math.min(...vValues);
    expect(uSpan / vSpan).toBeCloseTo(4, 5);
  });

  it("adds projected UVs to a custom builder result", () => {
    const geometry = singlePartGeometry(
      buildPartGeometry(
        { builder: "uvless", params: {}, type: "custom" },
        { uvless: () => uvlessQuad() },
      ),
    );

    expectFiniteUnitUvs(geometry);
    expect(geometry.userData.fixture).toBe("uvless");
  });
});

describe("instanced geometry bounds", () => {
  const matrices = [
    new THREE.Matrix4().makeTranslation(-2, 0, 0).toArray(),
    new THREE.Matrix4().makeTranslation(2, 0, 0).toArray(),
  ];

  function instancedGeometry(animated: boolean): THREE.BufferGeometry {
    return singlePartGeometry(
      buildPartGeometry(
        { builder: "instances", params: {}, type: "custom" },
        {
          instances: () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            geometry.userData.mechanicaInstances = { matrices };
            if (animated) geometry.userData.mechanicaUpdate = () => undefined;
            return geometry;
          },
        },
      ),
    );
  }

  it("reuses build-time bounds without mesh recomputation", () => {
    const geometry = instancedGeometry(false);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    const boxSpy = vi.spyOn(mesh, "computeBoundingBox");
    const sphereSpy = vi.spyOn(mesh, "computeBoundingSphere");

    applyMechanicaInstanceMatrices(
      mesh,
      getMechanicaInstanceMatrices(geometry)!,
    );
    const appliedBox = mesh.boundingBox;
    const appliedSphere = mesh.boundingSphere;
    applyMechanicaInstanceMatrices(
      mesh,
      getMechanicaInstanceMatrices(geometry)!,
    );

    expect(boxSpy).not.toHaveBeenCalled();
    expect(sphereSpy).not.toHaveBeenCalled();
    expect(mesh.boundingBox).toBe(appliedBox);
    expect(mesh.boundingSphere).toBe(appliedSphere);
    expect(mesh.boundingBox?.min.x).toBeCloseTo(-2.5);
    expect(mesh.boundingBox?.max.x).toBeCloseTo(2.5);
    expect(mesh.frustumCulled).toBe(true);
    geometry.dispose();
    material.dispose();
  });

  it("disables frustum culling for animated instance matrices", () => {
    const geometry = instancedGeometry(true);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);

    applyMechanicaInstanceMatrices(
      mesh,
      getMechanicaInstanceMatrices(geometry)!,
    );

    expect(mesh.frustumCulled).toBe(false);
    geometry.dispose();
    material.dispose();
  });
});
