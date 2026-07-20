import { Sphere, Vector3 } from "three";

import type { StandardMaterialPresentation } from "../../core/materials";
import type { ExhibitData, MachineSlug, PartDef } from "../../sim/types";

type V3 = readonly [number, number, number];

export interface ViewerProfile {
  direction: V3;
  margin: number;
  explodedMargin: number;
  homePose?: {
    position: V3;
    target: V3;
    fov?: number;
  };
  minDistanceFactor?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  targetOffset?: V3;
  focusPartIds?: readonly string[];
}

export function safeHomePose<
  T extends {
    position: readonly [number, number, number];
    target: readonly [number, number, number];
  },
>(pose: T, modelSphere: Sphere): T | null {
  const camera = new Vector3(...pose.position);
  if (camera.distanceTo(modelSphere.center) < modelSphere.radius * 1.15) {
    return null;
  }
  return pose;
}

export const VIEWER_PROFILES: Record<MachineSlug, ViewerProfile> = {
  astroclock: {
    direction: [1, 0.72, 1.4],
    margin: 1.35,
    explodedMargin: 1.5,
    homePose: {
      position: [20.762, 18.809, 26.049],
      target: [2.8, 5.875, 0.9],
      fov: 36,
    },
    minDistanceFactor: 2,
    minAzimuthAngle: 0.27,
    maxAzimuthAngle: 0.97,
    minPolarAngle: 1.1,
    maxPolarAngle: 1.45,
    targetOffset: [0, -0.03, 0],
  },
  seismoscope: {
    direction: [1, 0.5, 1.35],
    margin: 1.45,
    explodedMargin: 1.5,
    homePose: {
      position: [6.835, 3.166, 9.225],
      target: [0, -0.25, 0],
      fov: 36,
    },
    minDistanceFactor: 1.7,
    targetOffset: [0, -0.08, 0],
  },
  odometer: {
    direction: [1.25, 0.65, 1.1],
    margin: 1.8,
    explodedMargin: 2.35,
    homePose: {
      position: [11.818, 7.326, 9.321],
      target: [1.225, 1.818, 0],
      fov: 36,
    },
    minDistanceFactor: 1.7,
    minPolarAngle: 0.9,
    maxPolarAngle: 1.45,
    targetOffset: [0, -0.13, 0],
  },
  loom: {
    direction: [1.2, 0.52, 1.3],
    margin: 1.55,
    explodedMargin: 2.1,
    homePose: {
      position: [1.588, 0.868, 1.72],
      target: [0, 0.18, 0],
      fov: 36,
    },
    minDistanceFactor: 1.7,
    minPolarAngle: 0.9,
    maxPolarAngle: 1.45,
    targetOffset: [0, -0.13, 0],
  },
};

export const DEMO_VIEWER_PROFILE: ViewerProfile = {
  direction: [1, 0.6, 1.2],
  margin: 1.35,
  explodedMargin: 1.45,
  minDistanceFactor: 1.7,
};

export type VisualMaterialPresentation = StandardMaterialPresentation;

const DARK_WOOD: VisualMaterialPresentation = {
  color: "#3a271d",
  metalness: 0.08,
  roughness: 0.72,
  textureVariant: "wood:dark",
};
const LIGHT_WOOD: VisualMaterialPresentation = {
  color: "#a86a38",
  metalness: 0.08,
  roughness: 0.52,
  textureVariant: "wood:light",
};
const FIGURE_ACCENT: VisualMaterialPresentation = {
  color: "#c57d3d",
  emissive: "#2a1003",
  emissiveIntensity: 0.02,
  metalness: 0.14,
  roughness: 0.46,
  textureVariant: "lacquer:red",
};
const WARM_BRONZE: VisualMaterialPresentation = {
  color: "#b96f35",
  emissive: "#2a1003",
  emissiveIntensity: 0,
  metalness: 0.72,
  roughness: 0.35,
  textureVariant: "bronze:fresh",
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
        textureVariant: "iron:cast",
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
        textureVariant: "silk:natural",
        transparent: true,
      };
    case "wood":
      return LIGHT_WOOD;
  }
}

export function visualMaterialFor(
  slug: ExhibitData["slug"],
  part: PartDef,
): VisualMaterialPresentation | undefined {
  const id = part.id.toLowerCase();

  switch (slug) {
    case "demo":
      return movingMaterialFor(part);
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
          emissiveIntensity: 0.04,
          metalness: 0.82,
          roughness: 0.24,
          textureVariant: "bronze:gilded",
        };
      }
      if (matches(id, /vessel|body|shell|bowl/)) {
        return {
          color: "#477c70",
          metalness: 0.68,
          roughness: 0.46,
          textureVariant: "bronze:excavated",
        };
      }
      return matches(id, /pendulum|lever|chute|trigger|column/)
        ? movingMaterialFor(part)
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
    case "loom":
      if (id === "woven-cloth") {
        return {
          color: "#9f352d",
          metalness: 0,
          roughness: 0.48,
        };
      }
      if (id === "warp-shed-odd") {
        return {
          color: "#b65b48",
          metalness: 0,
          opacity: 0.92,
          roughness: 0.62,
          transparent: true,
        };
      }
      if (id === "warp-shed") {
        return {
          color: "#d8c58d",
          metalness: 0,
          opacity: 0.92,
          roughness: 0.62,
          transparent: true,
        };
      }
      if (matches(id, /heddle|selector|hook|cam|counter/)) {
        return movingMaterialFor(part);
      }
      if (matches(id, /beater|shuttle|beam|treadle/)) {
        return movingMaterialFor(part);
      }
      return matches(id, /frame|post|base|support/) ? DARK_WOOD : undefined;
  }
}
