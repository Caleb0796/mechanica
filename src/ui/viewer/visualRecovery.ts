import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { MachineSlug, PartDef } from "../../sim/types";

export interface ViewerProfile {
  direction: readonly [number, number, number];
  margin: number;
  explodedMargin: number;
  targetOffset?: readonly [number, number, number];
  focusPartIds?: readonly string[];
}

export const VIEWER_PROFILES: Record<MachineSlug, ViewerProfile> = {
  astroclock: {
    direction: [1, 0.72, 1.4],
    margin: 1.65,
    explodedMargin: 1.75,
    targetOffset: [0, -0.1, 0],
  },
  seismoscope: {
    direction: [1, 0.5, 1.35],
    margin: 1.45,
    explodedMargin: 1.5,
    targetOffset: [0, -0.08, 0],
  },
  chariot: {
    direction: [1.35, 0.55, 1],
    margin: 1.4,
    explodedMargin: 1.5,
    targetOffset: [0, -0.1, 0],
  },
  odometer: {
    direction: [1.25, 0.65, 1.1],
    margin: 1.55,
    explodedMargin: 1.65,
    targetOffset: [0, -0.08, 0],
  },
  "wooden-ox": {
    direction: [1.45, 0.55, 0.9],
    margin: 1.05,
    explodedMargin: 1.4,
    targetOffset: [0, -0.04, 0],
  },
  loom: {
    direction: [1.2, 0.52, 1.3],
    margin: 1.25,
    explodedMargin: 1.35,
    targetOffset: [0, -0.08, 0],
  },
  typecase: {
    direction: [1.25, 0.6, 1.1],
    margin: 1,
    explodedMargin: 1.15,
    targetOffset: [0, -0.06, 0],
  },
  chainpump: {
    direction: [1.3, 0.65, 1],
    margin: 0.9,
    explodedMargin: 1,
    targetOffset: [0.04, 0, 0],
  },
  bellows: {
    direction: [1.35, 0.62, 1],
    margin: 1.1,
    explodedMargin: 1.2,
    targetOffset: [0, -0.1, 0],
  },
  gimbal: {
    direction: [1, 0.42, 1.35],
    margin: 1.8,
    explodedMargin: 1.85,
    targetOffset: [0, -0.05, 0],
  },
};

export interface VisualMaterialPresentation {
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  opacity?: number;
  roughness?: number;
  transparent?: boolean;
}

const DARK_WOOD: VisualMaterialPresentation = {
  color: "#3a271d",
  metalness: 0.08,
  roughness: 0.72,
};
const LIGHT_WOOD: VisualMaterialPresentation = {
  color: "#a86a38",
  metalness: 0.08,
  roughness: 0.52,
};
const FIGURE_ACCENT: VisualMaterialPresentation = {
  color: "#c57d3d",
  emissive: "#2a1003",
  emissiveIntensity: 0.08,
  metalness: 0.14,
  roughness: 0.46,
};
const WARM_BRONZE: VisualMaterialPresentation = {
  color: "#b96f35",
  emissive: "#2a1003",
  emissiveIntensity: 0.12,
  metalness: 0.72,
  roughness: 0.35,
};

function matches(id: string, pattern: RegExp): boolean {
  return pattern.test(id);
}

function movingMaterialFor(part: PartDef): VisualMaterialPresentation {
  switch (part.material) {
    case "bronze":
      return WARM_BRONZE;
    case "iron":
      return {
        color: "#737d82",
        metalness: 0.72,
        roughness: 0.4,
      };
    case "silver":
      return {
        color: "#c8d0d4",
        metalness: 0.82,
        roughness: 0.26,
      };
    case "clay":
      return { color: "#b87343", metalness: 0.04, roughness: 0.68 };
    case "silk":
      return {
        color: "#d9d1b8",
        metalness: 0,
        opacity: 0.84,
        roughness: 0.72,
        transparent: true,
      };
    case "wood":
      return LIGHT_WOOD;
  }
}

export function visualMaterialFor(
  slug: MachineSlug,
  part: PartDef,
): VisualMaterialPresentation | undefined {
  const id = part.id.toLowerCase();

  switch (slug) {
    case "astroclock":
      if (id.startsWith("jack-")) return FIGURE_ACCENT;
      if (matches(id, /gear|wheel|shaft|escap|arm|link|drum|cam/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /tower|frame|base|case|housing|support/)
        ? DARK_WOOD
        : undefined;
    case "seismoscope":
      if (matches(id, /dragon|toad/)) return WARM_BRONZE;
      if (matches(id, /ball/)) {
        return {
          color: "#e7b84d",
          emissive: "#3b2504",
          emissiveIntensity: 0.16,
          metalness: 0.82,
          roughness: 0.24,
        };
      }
      if (matches(id, /vessel|body|shell|bowl/)) {
        return { color: "#477c70", metalness: 0.76, roughness: 0.43 };
      }
      return matches(id, /pendulum|lever|chute|trigger|column/)
        ? movingMaterialFor(part)
        : undefined;
    case "chariot":
      if (matches(id, /figure|person|head|arm|pointer/)) return FIGURE_ACCENT;
      if (matches(id, /gear|wheel|shaft|axle|link/)) {
        return movingMaterialFor(part);
      }
      return matches(
        id,
        /chassis|canopy|frame|platform|body|drawbar|housing|support/,
      )
        ? DARK_WOOD
        : undefined;
    case "odometer":
      if (matches(id, /figure/)) return FIGURE_ACCENT;
      if (matches(id, /gear|wheel|shaft|cam|drum|striker/)) {
        return movingMaterialFor(part);
      }
      return matches(
        id,
        /canopy|chassis|case|frame|platform|post|housing|support/,
      )
        ? DARK_WOOD
        : undefined;
    case "wooden-ox":
      if (id === "curved-head" || matches(id, /ear|horn|muzzle/)) {
        return { color: "#a96835", metalness: 0.08, roughness: 0.58 };
      }
      if (matches(id, /wheel|shaft|axle|lever|link|ratchet|pawl/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /body|frame|bed|support|chest|box/)
        ? DARK_WOOD
        : undefined;
    case "loom":
      if (matches(id, /heddle|reed|shuttle|warp|weft|cloth|beam/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /frame|post|base|support/) ? DARK_WOOD : undefined;
    case "typecase":
      if (matches(id, /type|rack|gear|wheel|shaft|carriage|tray/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /case|stand|frame|table|base|support|housing/)
        ? DARK_WOOD
        : undefined;
    case "chainpump":
      if (matches(id, /water/)) {
        return {
          color: "#39bfd3",
          emissive: "#063943",
          emissiveIntensity: 0.12,
          metalness: 0.08,
          opacity: 0.58,
          roughness: 0.2,
          transparent: true,
        };
      }
      if (matches(id, /pallet|sprocket|chain|wheel|shaft|axle|crank/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /trough|frame|base|support|housing/)
        ? DARK_WOOD
        : undefined;
    case "bellows":
      if (matches(id, /bellows|lid|nozzle/)) {
        return { color: "#985637", metalness: 0.12, roughness: 0.57 };
      }
      if (matches(id, /wheel|shaft|cam|rod|link|crank|axle/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /frame|base|support|housing|furnace/)
        ? DARK_WOOD
        : undefined;
    case "gimbal":
      if (matches(id, /stand|support|base|post|frame|hanger/)) return DARK_WOOD;
      if (matches(id, /shell/)) {
        return {
          color: "#78998a",
          metalness: 0.72,
          opacity: 0.3,
          roughness: 0.38,
          transparent: true,
        };
      }
      if (id === "outer-ring") {
        return {
          color: "#cbd3d7",
          metalness: 0.84,
          roughness: 0.22,
        };
      }
      if (matches(id, /ring|axis|shaft/)) {
        return {
          color: "#d9c17a",
          emissive: "#2a2108",
          emissiveIntensity: 0.08,
          metalness: 0.82,
          roughness: 0.25,
        };
      }
      if (matches(id, /bowl|lamp|cup/)) return WARM_BRONZE;
      if (matches(id, /flame/)) {
        return {
          color: "#ff9f32",
          emissive: "#ff5a12",
          emissiveIntensity: 1.4,
          metalness: 0,
          roughness: 0.24,
        };
      }
      return undefined;
  }
}

type Vector3Tuple = readonly [number, number, number];

function transformGeometry(
  geometry: THREE.BufferGeometry,
  position: Vector3Tuple,
  rotation: Vector3Tuple = [0, 0, 0],
  scale: Vector3Tuple = [1, 1, 1],
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

function mergeSemanticGeometry(
  geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry | null {
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) return null;
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function fitSemanticEnvelope(
  geometry: THREE.BufferGeometry | null,
  envelope: readonly [number, number, number],
): THREE.BufferGeometry | null {
  if (!geometry) return null;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(
    envelope[0] / size.x,
    envelope[1] / size.y,
    envelope[2] / size.z,
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildJack(
  size: readonly [number, number, number],
): THREE.BufferGeometry | null {
  const [width, height, depth] = size;
  const headRadius = Math.min(width, depth) * 0.16;
  const armRadius = Math.min(width, depth) * 0.055;
  const armLength = width * 0.38;
  return mergeSemanticGeometry([
    transformGeometry(
      new THREE.SphereGeometry(1, 16, 12),
      [0, height * 0.29, 0],
      [0, 0, 0],
      [headRadius, headRadius * 1.08, headRadius],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.32, height * 0.44, depth * 0.34),
      [0, -height * 0.03, 0],
    ),
    transformGeometry(
      new THREE.CylinderGeometry(armRadius, armRadius, armLength, 10),
      [-width * 0.2, height * 0.08, 0],
      [0, 0, -0.78],
    ),
    transformGeometry(
      new THREE.CylinderGeometry(armRadius, armRadius, armLength, 10),
      [width * 0.2, height * 0.08, 0],
      [0, 0, 0.78],
    ),
  ]);
}

function buildStrikingFigure(
  size: readonly [number, number, number],
): THREE.BufferGeometry | null {
  const [width, height, depth] = size;
  const headRadius = Math.min(width, depth) * 0.16;
  const limbRadius = Math.min(width, depth) * 0.055;
  return mergeSemanticGeometry([
    transformGeometry(
      new THREE.SphereGeometry(1, 16, 12),
      [0, height * 0.31, 0],
      [0, 0, 0],
      [headRadius, headRadius * 1.08, headRadius],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.34, height * 0.42, depth * 0.34),
      [0, height * 0.02, 0],
    ),
    transformGeometry(
      new THREE.CylinderGeometry(limbRadius, limbRadius, height * 0.25, 10),
      [-width * 0.1, -height * 0.27, 0],
      [0, 0, -0.08],
    ),
    transformGeometry(
      new THREE.CylinderGeometry(limbRadius, limbRadius, height * 0.25, 10),
      [width * 0.1, -height * 0.27, 0],
      [0, 0, 0.08],
    ),
    transformGeometry(
      new THREE.CylinderGeometry(limbRadius, limbRadius, height * 0.42, 10),
      [width * 0.2, height * 0.15, 0],
      [0, 0, -0.56],
    ),
    transformGeometry(
      new THREE.SphereGeometry(1, 12, 8),
      [width * 0.32, height * 0.32, 0],
      [0, 0, 0],
      [limbRadius * 1.7, limbRadius * 1.7, limbRadius * 1.7],
    ),
  ]);
}

function buildOxHead(
  size: readonly [number, number, number],
): THREE.BufferGeometry | null {
  const [width, height, depth] = size;
  return mergeSemanticGeometry([
    transformGeometry(
      new THREE.BoxGeometry(width * 0.28, height * 0.62, depth * 0.58),
      [-width * 0.28, -height * 0.05, 0],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.4, height * 0.42, depth * 0.66),
      [-width * 0.02, height * 0.03, 0],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.46, height * 0.25, depth * 0.42),
      [width * 0.28, -height * 0.08, 0],
    ),
    transformGeometry(
      new THREE.ConeGeometry(depth * 0.085, height * 0.28, 10),
      [-width * 0.03, height * 0.29, depth * 0.25],
      [0.14, 0, -0.18],
    ),
    transformGeometry(
      new THREE.ConeGeometry(depth * 0.085, height * 0.28, 10),
      [-width * 0.03, height * 0.29, -depth * 0.25],
      [-0.14, 0, 0.18],
    ),
    transformGeometry(
      new THREE.SphereGeometry(1, 12, 8),
      [-width * 0.1, height * 0.16, depth * 0.32],
      [0, 0, 0],
      [width * 0.11, height * 0.07, depth * 0.16],
    ),
    transformGeometry(
      new THREE.SphereGeometry(1, 12, 8),
      [-width * 0.1, height * 0.16, -depth * 0.32],
      [0, 0, 0],
      [width * 0.11, height * 0.07, depth * 0.16],
    ),
  ]);
}

function buildBellowsChest(
  size: readonly [number, number, number],
): THREE.BufferGeometry | null {
  const [width, height, depth] = size;
  const nozzleRadius = Math.min(height, depth) * 0.11;
  return mergeSemanticGeometry([
    transformGeometry(
      new THREE.BoxGeometry(width * 0.68, height * 0.25, depth * 0.72),
      [-width * 0.08, height * 0.17, 0],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.68, height * 0.25, depth * 0.72),
      [-width * 0.08, -height * 0.17, 0],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.68, height * 0.05, depth * 0.76),
      [-width * 0.08, height * 0.32, 0],
      [0, 0, 0.08],
    ),
    transformGeometry(
      new THREE.BoxGeometry(width * 0.68, height * 0.05, depth * 0.76),
      [-width * 0.08, -height * 0.32, 0],
      [0, 0, -0.08],
    ),
    transformGeometry(
      new THREE.CylinderGeometry(
        nozzleRadius * 0.62,
        nozzleRadius,
        width * 0.25,
        12,
      ),
      [width * 0.37, 0, 0],
      [0, 0, -Math.PI / 2],
    ),
  ]);
}

export function buildSemanticPartGeometry(
  slug: MachineSlug,
  part: PartDef,
): THREE.BufferGeometry | null {
  if (part.geometry.type !== "box" && part.geometry.type !== "beam")
    return null;

  if (slug === "astroclock" && part.id.startsWith("jack-")) {
    return fitSemanticEnvelope(
      buildJack(part.geometry.size),
      part.geometry.size,
    );
  }
  if (
    slug === "odometer" &&
    (part.id === "lower-figure" || part.id === "upper-figure")
  ) {
    return fitSemanticEnvelope(
      buildStrikingFigure(part.geometry.size),
      part.geometry.size,
    );
  }
  if (slug === "wooden-ox" && part.id === "curved-head") {
    return fitSemanticEnvelope(
      buildOxHead(part.geometry.size),
      part.geometry.size,
    );
  }
  if (slug === "bellows" && part.id === "bellows-chest") {
    return fitSemanticEnvelope(
      buildBellowsChest(part.geometry.size),
      part.geometry.size,
    );
  }
  return null;
}
