import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataJson from "../../data/machines/chainpump.json";
import type {
  MachineData,
  MachineModule,
  MachineSpec,
  MechanismScript,
} from "../../sim/types";
import partsJson from "./parts.json";

export const PALLET_COUNT = 32;
export const PATH_STRAIGHT_LENGTH = 5.7;
export const PATH_RADIUS = 0.18;
const SPOTLIGHT_TURN = Math.PI / 2;

export type PalletPathSegment =
  "upper-straight" | "head-arc" | "lower-straight" | "foot-arc";

export interface PalletPathPose {
  position: [number, number, number];
  tangent: [number, number, number];
  rotationZ: number;
  segment: PalletPathSegment;
}

export interface PalletLoopAnimationMetadata {
  kind: "chainpump-path-phase";
  stateUnit: "rad";
  phasePerStateUnit: number;
  currentStateRad: number;
  basePhase: number;
  palletCount: number;
  straightLength: number;
  radius: number;
  matrices: number[][];
}

function merged(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(geometries);
  for (const item of geometries) item.dispose();
  if (!geometry) {
    throw new Error("Chain-pump custom geometry could not be merged");
  }
  return geometry;
}

export function palletPathPose(
  progress: number,
  straightLength = PATH_STRAIGHT_LENGTH,
  radius = PATH_RADIUS,
): PalletPathPose {
  if (!Number.isFinite(progress)) {
    throw new Error("Pallet progress must be finite");
  }
  if (!Number.isFinite(straightLength) || straightLength <= 0) {
    throw new Error("Pallet path straight length must be positive");
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error("Pallet path radius must be positive");
  }

  const wrapped = ((progress % 1) + 1) % 1;
  const circumference = Math.PI * radius;
  const perimeter = straightLength * 2 + circumference * 2;
  let distance = wrapped * perimeter;
  const halfStraight = straightLength / 2;

  if (distance < straightLength) {
    return {
      position: [-halfStraight + distance, radius, 0],
      tangent: [1, 0, 0],
      rotationZ: 0,
      segment: "upper-straight",
    };
  }
  distance -= straightLength;

  if (distance < circumference) {
    const angle = Math.PI / 2 - distance / radius;
    const tangent: [number, number, number] = [
      Math.sin(angle),
      -Math.cos(angle),
      0,
    ];
    return {
      position: [
        halfStraight + radius * Math.cos(angle),
        radius * Math.sin(angle),
        0,
      ],
      tangent,
      rotationZ: Math.atan2(tangent[1], tangent[0]),
      segment: "head-arc",
    };
  }
  distance -= circumference;

  if (distance < straightLength) {
    return {
      position: [halfStraight - distance, -radius, 0],
      tangent: [-1, 0, 0],
      rotationZ: Math.PI,
      segment: "lower-straight",
    };
  }
  distance -= straightLength;

  const angle = -Math.PI / 2 - distance / radius;
  const tangent: [number, number, number] = [
    Math.sin(angle),
    -Math.cos(angle),
    0,
  ];
  return {
    position: [
      -halfStraight + radius * Math.cos(angle),
      radius * Math.sin(angle),
      0,
    ],
    tangent,
    rotationZ: Math.atan2(tangent[1], tangent[0]),
    segment: "foot-arc",
  };
}

export function palletLoopAnimationMetadata(
  geometry: THREE.BufferGeometry,
): PalletLoopAnimationMetadata {
  const metadata = geometry.userData
    .mechanicaAnimation as PalletLoopAnimationMetadata;
  if (metadata?.kind !== "chainpump-path-phase") {
    throw new Error("Geometry has no chain-pump path animation metadata");
  }
  return metadata;
}

export function updatePalletLoopGeometry(
  geometry: THREE.BufferGeometry,
  stateRad: number,
): void {
  if (!Number.isFinite(stateRad)) {
    throw new Error("Pallet-loop animation state must be finite");
  }
  const metadata = palletLoopAnimationMetadata(geometry);
  const phase = metadata.basePhase + stateRad * metadata.phasePerStateUnit;
  const matrix = new THREE.Matrix4();

  for (let pallet = 0; pallet < metadata.palletCount; pallet += 1) {
    const pose = palletPathPose(
      pallet / metadata.palletCount + phase,
      metadata.straightLength,
      metadata.radius,
    );
    matrix.makeRotationZ(pose.rotationZ).setPosition(...pose.position);
    matrix.toArray(metadata.matrices[pallet]);
  }

  metadata.currentStateRad = stateRad;
}

function chainpumpPalletLoop(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const palletCount = Math.floor(params.palletCount);
  if (palletCount < 24) {
    throw new Error("The chain pump requires at least 24 dragon-bone pallets");
  }

  const geometry = new THREE.BoxGeometry(
    params.palletLength,
    params.palletHeight,
    params.palletWidth,
  );
  const perimeter = 2 * params.straightLength + 2 * Math.PI * params.radius;
  const matrices = Array.from({ length: palletCount }, () =>
    new THREE.Matrix4().toArray(),
  );
  const metadata: PalletLoopAnimationMetadata = {
    kind: "chainpump-path-phase",
    stateUnit: "rad",
    phasePerStateUnit: params.radius / perimeter,
    currentStateRad: 0,
    basePhase: params.phase,
    palletCount,
    straightLength: params.straightLength,
    radius: params.radius,
    matrices,
  };
  geometry.userData.mechanicaAnimation = metadata;
  geometry.userData.mechanicaInstances = { matrices };
  geometry.userData.mechanicaUpdate = (stateRad: number): void => {
    updatePalletLoopGeometry(geometry, stateRad);
  };
  updatePalletLoopGeometry(geometry, 0);
  return geometry;
}

function chainpumpTrough(params: Record<string, number>): THREE.BufferGeometry {
  const floor = new THREE.BoxGeometry(
    params.length,
    params.wall,
    params.width,
  ).translate(0, -params.height / 2 + params.wall / 2, 0);
  const side = (): THREE.BoxGeometry =>
    new THREE.BoxGeometry(params.length, params.height, params.wall);
  const nearSide = side().translate(0, 0, -params.width / 2 + params.wall / 2);
  const farSide = side().translate(0, 0, params.width / 2 - params.wall / 2);
  return merged([floor, nearSide, farSide]);
}

function chainpumpCrankSpurs(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const countPerEnd = Math.floor(params.countPerEnd);
  const spurs: THREE.BufferGeometry[] = [];
  for (const axleEnd of [-1, 1]) {
    for (let index = 0; index < countPerEnd; index += 1) {
      const angle = (index * Math.PI * 2) / countPerEnd;
      const spur = new THREE.BoxGeometry(
        params.spurLength,
        params.spurWidth,
        params.spurWidth,
      );
      spur.translate(params.radius + params.spurLength / 2, 0, 0);
      spur.rotateY(angle);
      spur.translate(0, (axleEnd * params.axleSpan) / 2, 0);
      spurs.push(spur);
    }
  }
  return merged(spurs);
}

function chainpumpWaterSurface(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(
    params.length,
    params.height,
    params.width,
  );
  geometry.userData.mechanicaMaterial = {
    color: "#2c82a8",
    metalness: 0.05,
    opacity: 0.58,
    roughness: 0.28,
    transparent: true,
  };
  return geometry;
}

const spec = partsJson as unknown as MachineSpec;

const mechanism: MechanismScript = {
  triggers: [
    {
      id: "spotlight",
      label: {
        zh: "巧思聚光：龙骨板即活塞",
        en: "Spotlight: every pallet is a piston",
      },
      run(graph, emit) {
        emit("camera", "trough");
        emit("highlight", "crank-spurs");
        graph.drive("crank-spurs", SPOTLIGHT_TURN);
        emit("drive", "crank-spurs");
        emit("highlight", "head-sprocket");
        emit("highlight", "pallet-chain");
        emit("highlight", "water-sheet");
        emit("spotlight:done", "pallet-chain");
      },
    },
    {
      id: "drive:crank-spurs",
      label: { zh: "踏动四拐曲柄", en: "Pedal the four-spur crank" },
      run(graph, emit, param) {
        const delta =
          typeof param === "number" && Number.isFinite(param)
            ? param
            : Math.PI / 8;
        graph.drive("crank-spurs", delta);
        emit("drive", "crank-spurs");
        emit("pallets:advance", "pallet-chain");
        emit("water:scrape", "water-sheet");
      },
    },
  ],
};

const machine: MachineModule = {
  spec,
  data: dataJson as unknown as MachineData,
  mechanism,
  customBuilders: {
    chainpumpCrankSpurs,
    chainpumpPalletLoop,
    chainpumpTrough,
    chainpumpWaterSurface,
  },
};

export default machine;
