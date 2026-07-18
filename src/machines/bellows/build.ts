import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataJson from "../../data/machines/bellows.json";
import type {
  MachineData,
  MachineModule,
  MachineSpec,
  PartDef,
} from "../../sim/types";
import partsJson from "./parts.json";

const WATERWHEEL_RADIUS = 3.0;
const DRUM_RADIUS = 0.6;
const CRANK_RADIUS = 0.24;
const ROD_LENGTH = 1.2;
const STROKE = CRANK_RADIUS * 2;
const ROCKER_HALF_LENGTH = 1.0;

const parts = partsJson as unknown as PartDef[];

function merged(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(geometries);
  for (const item of geometries) item.dispose();
  if (!geometry) throw new Error("Bellows custom geometry could not be merged");
  return geometry;
}

function bellowsTwistedCord(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const halfRun = params.run / 2;
  const halfRise = params.rise / 2;
  const spans = [-1, 1].map((side) => {
    const start = new THREE.Vector3(
      -halfRun,
      -halfRise,
      side * params.waterSpread,
    );
    const end = new THREE.Vector3(
      halfRun,
      halfRise + side * params.drumSpread,
      0,
    );
    const curve = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(
        -halfRun + params.run * 0.28,
        -halfRise + params.rise * 0.18,
        side * params.waterSpread * 0.72,
      ),
      new THREE.Vector3(
        halfRun - params.run * 0.25,
        halfRise - params.rise * 0.18 + side * params.drumSpread * 0.65,
        side * params.drumSpread * 0.35,
      ),
      end,
    ]);
    return new THREE.TubeGeometry(curve, 32, params.radius, 8, false);
  });
  return merged(spans);
}

interface RockerAnimationMetadata {
  kind: "bellows-rocker";
  currentStateRad: number;
  halfLength: number;
  positions: number[];
  normals: number[];
}

export function bellowsRockerAngle(
  displacement: number,
  halfLength = ROCKER_HALF_LENGTH,
): number {
  if (!Number.isFinite(displacement) || !Number.isFinite(halfLength)) {
    throw new Error("Bellows rocker inputs must be finite");
  }
  if (halfLength <= 0 || Math.abs(displacement) > halfLength) {
    throw new Error("Bellows rocker displacement exceeds its arm length");
  }
  return -Math.asin(displacement / halfLength);
}

function updateBellowsRocker(
  geometry: THREE.BufferGeometry,
  displacement: number,
): void {
  const metadata = geometry.userData
    .mechanicaAnimation as RockerAnimationMetadata;
  const angle = bellowsRockerAngle(displacement, metadata.halfLength);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const offset = vertex * 3;
    const x = metadata.positions[offset];
    const y = metadata.positions[offset + 1];
    positions.setXYZ(
      vertex,
      x * cosine - y * sine,
      x * sine + y * cosine,
      metadata.positions[offset + 2],
    );
    if (normals) {
      const normalX = metadata.normals[offset];
      const normalY = metadata.normals[offset + 1];
      normals.setXYZ(
        vertex,
        normalX * cosine - normalY * sine,
        normalX * sine + normalY * cosine,
        metadata.normals[offset + 2],
      );
    }
  }
  positions.needsUpdate = true;
  if (normals) normals.needsUpdate = true;
  metadata.currentStateRad = displacement;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function bellowsRocker(params: Record<string, number>): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(
    params.length,
    params.width,
    params.depth,
  );
  const metadata: RockerAnimationMetadata = {
    kind: "bellows-rocker",
    currentStateRad: 0,
    halfLength: params.length / 2,
    positions: Array.from(geometry.getAttribute("position").array),
    normals: Array.from(geometry.getAttribute("normal").array),
  };
  geometry.userData.mechanicaAnimation = metadata;
  geometry.userData.mechanicaUpdate = (displacement: number): void => {
    updateBellowsRocker(geometry, displacement);
  };
  return geometry;
}

const constraints: MachineSpec["constraints"] = [
  {
    type: "belt",
    a: "waterwheel",
    b: "small-drum",
    crossed: false,
  },
  {
    type: "lockstep",
    a: "small-drum",
    b: "crank-wheel",
    ratio: 1,
    provenance: {
      kind: "tuice",
      ref: "nongshu-shuipai",
      note: "The reconstructed forward drum and crank branch share one angular position.",
    },
  },
  {
    type: "crank",
    wheel: "crank-wheel",
    rod: "connecting-rod",
    slider: "front-upright",
    crankRadius: CRANK_RADIUS,
    rodLength: ROD_LENGTH,
    axis: [0, 1, 0],
    provenance: {
      kind: "tuice",
      ref: "nongshu-shuipai",
      note: "The 0.24 m crank and 1.2 m rod are inferred dimensions for the recorded crank-and-beam path.",
    },
  },
  {
    type: "lockstep",
    a: "front-upright",
    b: "rocker",
    ratio: 1,
    provenance: {
      kind: "tuice",
      ref: "nongshu-shuipai",
      note: "The rocker carries the solved slider displacement as a scalar; its custom geometry converts that value to an exact one-meter-arm angle.",
    },
  },
  {
    type: "lockstep",
    a: "rocker",
    b: "bellows-board",
    ratio: 1,
    provenance: {
      kind: "tuice",
      ref: "nongshu-shuipai",
      note: "Equal scalar travel and the board's opposing joint axis reproduce the two rocker endpoints' mirrored displacement.",
    },
  },
];

const spec: MachineSpec = {
  slug: "bellows",
  parts,
  constraints,
  driveNodes: ["waterwheel"],
  primaryDrive: "waterwheel",
  cycleRad: Math.PI * 2,
  expectedRatios: [
    {
      from: "waterwheel",
      to: "small-drum",
      ratio: WATERWHEEL_RADIUS / DRUM_RADIUS,
      sourceRef: "nongshu-shuipai",
    },
    {
      from: "waterwheel",
      to: "crank-wheel",
      ratio: WATERWHEEL_RADIUS / DRUM_RADIUS,
      sourceRef: "nongshu-shuipai",
    },
  ],
  collisionWhitelist: [
    ["waterwheel", "drive-cord"],
    ["drive-cord", "small-drum"],
    ["crank-wheel", "connecting-rod"],
    ["connecting-rod", "front-upright"],
    ["connecting-rod", "rocker"],
    ["front-upright", "rocker"],
    ["rocker", "bellows-board"],
  ],
};

const machine: MachineModule = {
  spec,
  data: dataJson as unknown as MachineData,
  mechanism: {
    triggers: [
      {
        id: "spotlight",
        label: {
          zh: "巧思聚光：镜像瓦特传动链",
          en: "Spotlight: the mirrored Watt chain",
        },
        run(graph, emit) {
          graph.setInput("waterwheel", 0);
          emit("camera:focus", "waterwheel");
          emit("highlight:on", "waterwheel");
          graph.drive("waterwheel", Math.PI / 5);
          emit("drive", "waterwheel");
          emit("camera:focus", "drive-cord");
          emit("highlight:on", "drive-cord");
          emit("camera:focus", "small-drum");
          emit("highlight:on", "small-drum");
          emit("camera:focus", "crank-wheel");
          emit("highlight:on", "crank-wheel");
          emit("camera:focus", "connecting-rod");
          emit("highlight:on", "connecting-rod");
          emit("camera:focus", "rocker");
          emit("highlight:on", "rocker");
          emit("camera:focus", "bellows-board");
          emit("highlight:on", "bellows-board");
          emit("comparison:mirrored-watt", "bellows-board");
          emit("source", "nongshu-shuipai");
          emit("highlight:off", "bellows-board");
          emit("highlight:off", "rocker");
          emit("highlight:off", "connecting-rod");
          emit("highlight:off", "crank-wheel");
          emit("highlight:off", "small-drum");
          emit("highlight:off", "drive-cord");
          emit("highlight:off", "waterwheel");
          emit("spotlight:done", "bellows");
        },
      },
    ],
  },
  customBuilders: {
    bellowsRocker,
    bellowsTwistedCord,
  },
};

export default machine;
