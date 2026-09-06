import { Matrix4, Plane, Quaternion, Ray, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  freeMoveOffsetFromRay,
  nudgeFreeMoveOffset,
} from "../../src/ui/viewer/freeMove";

describe("free part movement", () => {
  const screenPlane = new Plane(new Vector3(0, 0, 1), 0);

  it("keeps the grabbed point fixed at pointer down and accumulates later drags", () => {
    const startWorld = new Vector3(3, 2, 0);
    const offset: [number, number, number] = [1, -0.5, 0];
    const parent = new Matrix4();
    expect(
      freeMoveOffsetFromRay(
        new Ray(new Vector3(3, 2, 10), new Vector3(0, 0, -1)),
        screenPlane,
        startWorld,
        offset,
        parent,
      ),
    ).toEqual(offset);
    expect(
      freeMoveOffsetFromRay(
        new Ray(new Vector3(4, 4, 10), new Vector3(0, 0, -1)),
        screenPlane,
        startWorld,
        offset,
        parent,
      ),
    ).toEqual([2, 1.5, 0]);
  });

  it("converts world displacement through a translated, rotated, scaled parent", () => {
    const parent = new Matrix4().compose(
      new Vector3(4, -2, 7),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
      new Vector3(2, 3, 4),
    );
    const startWorld = new Vector3(1, 2, 3).applyMatrix4(parent);
    const endWorld = new Vector3(1.75, 1.5, 3).applyMatrix4(parent);
    const normal = new Vector3(1, 0, 0);
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, startWorld);
    const result = freeMoveOffsetFromRay(
      new Ray(
        endWorld.clone().addScaledVector(normal, 10),
        normal.clone().negate(),
      ),
      plane,
      startWorld,
      [0.1, 0.2, 0.3],
      parent,
    );
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(0.85);
    expect(result?.[1]).toBeCloseTo(-0.3);
    expect(result?.[2]).toBeCloseTo(0.3);
  });

  it("does not move for an unreachable plane or a singular parent transform", () => {
    for (const ray of [
      new Ray(new Vector3(0, 0, 10), new Vector3(1, 0, 0)),
      new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, 1)),
    ]) {
      expect(
        freeMoveOffsetFromRay(
          ray,
          screenPlane,
          new Vector3(),
          [0, 0, 0],
          new Matrix4(),
        ),
      ).toBeNull();
    }
    expect(
      freeMoveOffsetFromRay(
        new Ray(new Vector3(1, 2, 10), new Vector3(0, 0, -1)),
        screenPlane,
        new Vector3(),
        [0, 0, 0],
        new Matrix4().makeScale(0, 1, 1),
      ),
    ).toBeNull();
  });

  it("nudges along the camera's screen axes with the parent's scale accounted for", () => {
    const result = nudgeFreeMoveOffset(
      [0.5, 0, 0],
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2),
      new Matrix4().makeScale(2, 4, 1),
      0.2,
      0.1,
    );
    expect(result?.[0]).toBeCloseTo(0.45);
    expect(result?.[1]).toBeCloseTo(0.05);
    expect(result?.[2]).toBeCloseTo(0);
  });
});
