import { Box3, Vector3 } from "three";

import type { FreeMoveOffset } from "./freeMove";

const SEAT_SNAP_DISTANCE = 0.22;
const FLOOR_CLEARANCE = 0.06;

function hasFiniteBounds(bounds: Box3): boolean {
  return (
    !bounds.isEmpty() &&
    [...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)
  );
}

/** Set a translated lid on the floor, keeping its chosen direction from the machine. */
export function settledLidOffset(
  offset: FreeMoveOffset,
  lidHomeBounds: Box3,
  assemblyBounds: Box3,
  floorY: number,
  snapHome = true,
): FreeMoveOffset {
  if (!offset.every(Number.isFinite)) return [0, 0, 0];
  if (
    !Number.isFinite(floorY) ||
    !hasFiniteBounds(lidHomeBounds) ||
    !hasFiniteBounds(assemblyBounds)
  ) {
    return [...offset];
  }
  if (snapHome && Math.hypot(...offset) < SEAT_SNAP_DISTANCE) return [0, 0, 0];

  const lidCenter = lidHomeBounds.getCenter(new Vector3());
  const assemblyCenter = assemblyBounds.getCenter(new Vector3());
  const lidSize = lidHomeBounds.getSize(new Vector3());
  const assemblySize = assemblyBounds.getSize(new Vector3());
  const clearDistance =
    Math.max(lidSize.x, lidSize.z) / 2 +
    Math.max(assemblySize.x, assemblySize.z) / 2 +
    FLOOR_CLEARANCE;
  const dx = lidCenter.x + offset[0] - assemblyCenter.x;
  const dz = lidCenter.z + offset[2] - assemblyCenter.z;
  const distance = Math.hypot(dx, dz);
  const result: FreeMoveOffset = [
    offset[0],
    floorY - lidHomeBounds.min.y,
    offset[2],
  ];

  if (distance < clearDistance) {
    const directionX = distance > 1e-9 ? dx / distance : 1;
    const directionZ = distance > 1e-9 ? dz / distance : 0;
    result[0] = assemblyCenter.x + directionX * clearDistance - lidCenter.x;
    result[2] = assemblyCenter.z + directionZ * clearDistance - lidCenter.z;
  }

  return result.every(Number.isFinite) ? result : [...offset];
}
