import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { settledLidOffset } from "../../src/ui/viewer/freeMoveLanding";

describe("free lid landing", () => {
  const lid = new Box3(new Vector3(-0.5, 2, -0.5), new Vector3(0.5, 2.2, 0.5));
  const assembly = new Box3(new Vector3(-1, 0, -1), new Vector3(1, 2.2, 1));

  it("rests the bottom on the floor and preserves a clear chosen placement", () => {
    const offset: [number, number, number] = [-2.4, 0.9, 1.7];
    const result = settledLidOffset(offset, lid, assembly, -0.15);

    expect(lid.min.y + result[1]).toBeCloseTo(-0.15);
    expect(result[0]).toBe(offset[0]);
    expect(result[2]).toBe(offset[2]);
    expect(offset).toEqual([-2.4, 0.9, 1.7]);
  });

  it("clears the machine without changing the user's radial direction", () => {
    const result = settledLidOffset([0.3, 0.7, -0.4], lid, assembly, 0);

    expect(Math.hypot(result[0], result[2])).toBeCloseTo(1.56);
    expect(result[0] / result[2]).toBeCloseTo(0.3 / -0.4);
    expect(lid.min.y + result[1]).toBe(0);
  });

  it("uses actual footprint centers and the larger horizontal dimensions", () => {
    const shiftedLid = new Box3(
      new Vector3(2, 3, 3.8),
      new Vector3(3.2, 3.3, 4.2),
    );
    const shiftedAssembly = new Box3(
      new Vector3(1, -1, 3),
      new Vector3(3, 3.3, 6),
    );
    const offset: [number, number, number] = [-0.4, 0.8, 0.8];
    const result = settledLidOffset(offset, shiftedLid, shiftedAssembly, -1);
    const landedCenter = shiftedLid
      .getCenter(new Vector3())
      .add(new Vector3(...result));
    const machineCenter = shiftedAssembly.getCenter(new Vector3());
    const dx = landedCenter.x - machineCenter.x;
    const dz = landedCenter.z - machineCenter.z;

    expect(Math.hypot(dx, dz)).toBeCloseTo(0.6 + 1.5 + 0.06);
    expect(dx / dz).toBeCloseTo(0.2 / 0.3);
    expect(shiftedLid.min.y + result[1]).toBe(-1);
  });

  it("provides a stable clear landing for a purely vertical lift", () => {
    const result = settledLidOffset([0, 1, 0], lid, assembly, 0);

    expect(result).toEqual([1.56, -2, 0]);
    expect(settledLidOffset(result, lid, assembly, 0)).toEqual(result);
  });

  it("snaps only offsets within the original seat tolerance", () => {
    expect(settledLidOffset([0.1, 0.1, 0.1], lid, assembly, 0)).toEqual([
      0, 0, 0,
    ]);
    const atThreshold = settledLidOffset([0.22, 0, 0], lid, assembly, 0);
    expect(atThreshold[0]).toBeCloseTo(1.56);
    expect(atThreshold[1]).toBe(-2);
    expect(settledLidOffset([0, -0.23, 0], lid, assembly, 0)[1]).toBe(-2);
  });

  it("lands a small keyboard nudge when snapping home is disabled", () => {
    const result = settledLidOffset([0.08, 0, -0.06], lid, assembly, 0, false);

    expect(lid.min.y + result[1]).toBe(0);
    expect(Math.hypot(result[0], result[2])).toBeCloseTo(1.56);
    expect(result[0] / result[2]).toBeCloseTo(0.08 / -0.06);
  });

  it("does not invent a landing when floor or bounds are unavailable", () => {
    const offset: [number, number, number] = [0.4, 0.7, -0.2];
    const invalidBounds = new Box3(
      new Vector3(-1, NaN, -1),
      new Vector3(1, 2, 1),
    );
    expect(settledLidOffset(offset, new Box3(), assembly, 0)).toEqual(offset);
    expect(settledLidOffset(offset, lid, invalidBounds, 0)).toEqual(offset);
    expect(settledLidOffset(offset, lid, assembly, Infinity)).toEqual(offset);
    expect(settledLidOffset([NaN, 0, 0], lid, assembly, 0)).toEqual([0, 0, 0]);
  });
});
