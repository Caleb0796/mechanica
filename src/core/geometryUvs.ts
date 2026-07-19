import * as THREE from "three";

const UV_EPSILON = 1e-6;

function projectedCoordinates(
  axis: "x" | "y" | "z",
  negative: boolean,
  x: number,
  y: number,
  z: number,
  bounds: THREE.Box3,
  scale: number,
): [number, number] {
  let u: number;
  let v: number;
  if (axis === "x") {
    u = (z - bounds.min.z) / scale;
    v = (y - bounds.min.y) / scale;
  } else if (axis === "y") {
    u = (x - bounds.min.x) / scale;
    v = (z - bounds.min.z) / scale;
  } else {
    u = (x - bounds.min.x) / scale;
    v = (y - bounds.min.y) / scale;
  }
  return [negative ? 1 - u : u, v];
}

export function ensureBoxProjectedUvs(
  source: THREE.BufferGeometry,
  projectionBounds?: THREE.Box3,
): THREE.BufferGeometry {
  const position = source.getAttribute("position");
  const existingUv = source.getAttribute("uv");
  if (existingUv?.count === position?.count) return source;
  if (!position || position.count === 0) return source;

  const geometry = source.index ? source.toNonIndexed() : source;
  if (geometry !== source) {
    geometry.userData = { ...source.userData };
  }
  const projectedPosition = geometry.getAttribute("position");
  const bounds = projectionBounds?.clone() ?? new THREE.Box3();
  if (!projectionBounds) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.copy(geometry.boundingBox);
  }
  const size = bounds.getSize(new THREE.Vector3());
  const scale = Math.max(size.x, size.y, size.z, UV_EPSILON);
  const uvs = new Float32Array(projectedPosition.count * 2);
  const first = new THREE.Vector3();
  const second = new THREE.Vector3();
  const third = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let start = 0; start < projectedPosition.count; start += 3) {
    const end = Math.min(start + 3, projectedPosition.count);
    first.fromBufferAttribute(projectedPosition, start);
    second.fromBufferAttribute(projectedPosition, Math.min(start + 1, end - 1));
    third.fromBufferAttribute(projectedPosition, Math.min(start + 2, end - 1));
    edgeA.subVectors(second, first);
    edgeB.subVectors(third, first);
    normal.crossVectors(edgeA, edgeB).normalize();
    const absoluteX = Math.abs(normal.x);
    const absoluteY = Math.abs(normal.y);
    const absoluteZ = Math.abs(normal.z);
    const axis =
      absoluteX >= absoluteY && absoluteX >= absoluteZ
        ? "x"
        : absoluteY >= absoluteZ
          ? "y"
          : "z";
    const negative = normal[axis] < 0;

    for (let vertex = start; vertex < end; vertex += 1) {
      const [u, v] = projectedCoordinates(
        axis,
        negative,
        projectedPosition.getX(vertex),
        projectedPosition.getY(vertex),
        projectedPosition.getZ(vertex),
        bounds,
        scale,
      );
      uvs[vertex * 2] = u;
      uvs[vertex * 2 + 1] = v;
    }
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geometry;
}
