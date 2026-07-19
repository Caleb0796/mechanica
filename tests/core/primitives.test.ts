import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { ensureBoxProjectedUvs } from "../../src/core/geometryUvs";
import { buildPartGeometry } from "../../src/core/primitives";

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
    const geometry = buildPartGeometry(
      { builder: "uvless", params: {}, type: "custom" },
      { uvless: () => uvlessQuad() },
    );

    expectFiniteUnitUvs(geometry);
    expect(geometry.userData.fixture).toBe("uvless");
  });
});
