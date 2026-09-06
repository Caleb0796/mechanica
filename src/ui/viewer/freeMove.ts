import { Matrix4, Plane, Quaternion, Ray, Vector3 } from "three";

export type FreeMoveOffset = [number, number, number];

function offsetByWorldDelta(
  offset: FreeMoveOffset,
  worldDelta: Vector3,
  parentWorldMatrix: Matrix4,
): FreeMoveOffset | null {
  const determinant = parentWorldMatrix.determinant();
  if (!Number.isFinite(determinant) || determinant === 0) return null;

  const inverse = parentWorldMatrix.clone().invert();
  const localOrigin = new Vector3().applyMatrix4(inverse);
  const localDelta = worldDelta.clone().applyMatrix4(inverse).sub(localOrigin);
  const result: FreeMoveOffset = [
    offset[0] + localDelta.x,
    offset[1] + localDelta.y,
    offset[2] + localDelta.z,
  ];
  return result.every(Number.isFinite) ? result : null;
}

/** Keep the grabbed point under the pointer without constraining its direction. */
export function freeMoveOffsetFromRay(
  ray: Ray,
  plane: Plane,
  startWorld: Vector3,
  startOffset: FreeMoveOffset,
  parentWorldMatrix: Matrix4,
): FreeMoveOffset | null {
  const hit = ray.intersectPlane(plane, new Vector3());
  if (!hit) return null;
  return offsetByWorldDelta(
    startOffset,
    hit.sub(startWorld),
    parentWorldMatrix,
  );
}

/** Horizontal/right and vertical/up distances are world meters on the screen plane. */
export function nudgeFreeMoveOffset(
  offset: FreeMoveOffset,
  cameraWorldQuaternion: Quaternion,
  parentWorldMatrix: Matrix4,
  horizontal: number,
  vertical: number,
): FreeMoveOffset | null {
  const worldDelta = new Vector3(horizontal, vertical, 0).applyQuaternion(
    cameraWorldQuaternion,
  );
  return offsetByWorldDelta(offset, worldDelta, parentWorldMatrix);
}
