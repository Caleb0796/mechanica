import * as THREE from "three";

import dataJson from "../../data/machines/gimbal.json";
import { attitudeQuaternion } from "../../sim/graph";
import type {
  MachineData,
  MachineModule,
  MachineSpec,
  PartDef,
} from "../../sim/types";
import partsJson from "./parts.json";

const parts = partsJson as unknown as PartDef[];

const spec: MachineSpec = {
  slug: "gimbal",
  parts,
  constraints: [
    {
      type: "gimbal",
      outer: "outer-shell",
      middle: "outer-ring",
      inner: "inner-ring",
    },
  ],
  driveNodes: ["outer-shell"],
  primaryDrive: "outer-shell",
  cycleRad: Math.PI * 2,
  expectedRatios: [],
  collisionWhitelist: [["hanger-arm", "suspension-chain"]],
};

function buildCutawayShell(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(
    params.radius,
    32,
    16,
    0,
    Math.PI,
    0,
    Math.PI,
  );
  geometry.rotateY(Math.PI);
  return geometry;
}

function buildInnerRing(params: Record<string, number>): THREE.BufferGeometry {
  return new THREE.TorusGeometry(params.radius, params.tube, 12, 40);
}

function buildBowl(params: Record<string, number>): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(
    params.radius,
    params.baseRadius,
    params.depth,
    32,
    1,
    false,
  );
}

function buildFlame(params: Record<string, number>): THREE.BufferGeometry {
  return new THREE.ConeGeometry(params.radius, params.height, 16);
}

function multiplyQuaternions(
  left: [number, number, number, number],
  right: [number, number, number, number],
): [number, number, number, number] {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

const machine: MachineModule = {
  spec,
  data: dataJson as unknown as MachineData,
  mechanism: {
    triggers: [
      {
        id: "spotlight",
        label: {
          zh: "巧思聚光：无源自稳",
          en: "Spotlight: passive stabilization",
        },
        run(graph, emit) {
          emit("camera:focus", "outer-shell");
          emit("highlight:on", "outer-shell");
          emit("highlight:on", "outer-ring");
          emit("highlight:on", "inner-ring");
          graph.setAttitude("outer-shell", [0.34, -0.21, 0.27, 0.87]);
          emit("drive:attitude", "outer-shell");
          emit("stabilize", "incense-bowl");
          emit("highlight:on", "incense-bowl");
          graph.setAttitude("outer-shell", [-0.28, 0.31, -0.16, 0.89]);
          emit("drive:attitude", "outer-shell");
          emit("deviation", "<0.5-deg");
          emit("source", "xijingzaji-dinghuan");
          emit("highlight:off", "outer-ring");
          emit("highlight:off", "inner-ring");
          emit("highlight:off", "outer-shell");
          emit("spotlight:done", "gimbal");
        },
      },
      {
        id: "drive:outer-shell",
        label: { zh: "转动外壳", en: "Turn the outer shell" },
        run(graph, emit, param) {
          const delta =
            typeof param === "number" && Number.isFinite(param) ? param : 0;
          const half = delta / 2;
          const rotation: [number, number, number, number] = [
            Math.sin(half),
            0,
            0,
            Math.cos(half),
          ];
          const current = attitudeQuaternion(graph.state(), "outer-shell") ?? [
            0, 0, 0, 1,
          ];
          graph.setAttitude(
            "outer-shell",
            multiplyQuaternions(rotation, current),
          );
          emit("drive:attitude", "outer-shell");
          emit("stabilize", "incense-bowl");
        },
      },
    ],
  },
  customBuilders: {
    gimbalCutawayShell: buildCutawayShell,
    gimbalInnerRing: buildInnerRing,
    gimbalBowl: buildBowl,
    gimbalFlame: buildFlame,
  },
};

export default machine;
