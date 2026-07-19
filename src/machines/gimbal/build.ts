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
  geometry.userData.mechanicaMaterial = {
    color: "#7f9f99",
    metalness: 0.62,
    opacity: 0.48,
    roughness: 0.34,
    transparent: true,
  };
  return geometry;
}

function buildInnerRing(params: Record<string, number>): THREE.BufferGeometry {
  return new THREE.TorusGeometry(params.radius, params.tube, 12, 40);
}

function buildBowl(params: Record<string, number>): THREE.BufferGeometry {
  const halfDepth = params.depth / 2;
  const wall = Math.min(params.radius * 0.09, params.depth * 0.18);
  const profile = [
    new THREE.Vector2(0, -halfDepth),
    new THREE.Vector2(params.baseRadius, -halfDepth),
    new THREE.Vector2(params.radius * 0.82, -params.depth * 0.18),
    new THREE.Vector2(params.radius, halfDepth),
    new THREE.Vector2(params.radius - wall, halfDepth),
    new THREE.Vector2(params.radius * 0.7, -params.depth * 0.12),
    new THREE.Vector2(params.baseRadius * 0.55, -halfDepth + wall),
    new THREE.Vector2(0, -halfDepth + wall),
  ];
  return new THREE.LatheGeometry(profile, 32);
}

function buildFlame(params: Record<string, number>): THREE.BufferGeometry {
  const halfHeight = params.height / 2;
  const profile = [
    new THREE.Vector2(0, -halfHeight),
    new THREE.Vector2(params.radius * 0.78, -params.height * 0.28),
    new THREE.Vector2(params.radius, -params.height * 0.05),
    new THREE.Vector2(params.radius * 0.52, params.height * 0.22),
    new THREE.Vector2(0, halfHeight),
  ];
  const geometry = new THREE.LatheGeometry(profile, 20);
  geometry.userData.mechanicaMaterial = {
    color: "#d88932",
    metalness: 0.18,
    roughness: 0.32,
  };
  return geometry;
}

function buildAidPulseEmitter(params: Record<string, number>): THREE.Points {
  const count = Math.min(64, Math.max(8, Math.round(params.rate ?? 24)));
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.3999632297;
    const radius = 0.0014 * Math.sqrt((index + 0.5) / count);
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = ((index % 7) - 3) * 0.00035;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const sprite = new THREE.DataTexture(
    new Uint8Array([240, 201, 120, 255]),
    1,
    1,
  );
  sprite.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    fragmentShader: `
      uniform sampler2D sprite;
      void main() {
        gl_FragColor = texture2D(sprite, gl_PointCoord);
      }
    `,
    transparent: true,
    uniforms: { sprite: { value: sprite } },
    vertexShader: `
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 4.0;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
  });
  return new THREE.Points(geometry, material);
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
  aids: [
    {
      kind: "callouts",
      anchors: [
        {
          partId: "outer-ring",
          label: { zh: "外环", en: "Outer ring" },
        },
        {
          partId: "inner-ring",
          label: { zh: "内环", en: "Inner ring" },
        },
        {
          partId: "incense-bowl",
          label: { zh: "香盂", en: "Incense bowl" },
        },
      ],
    },
    {
      kind: "powerPath",
      sequence: ["outer-shell", "outer-ring", "inner-ring", "incense-bowl"],
      dwellMs: 650,
    },
    {
      kind: "flowParticles",
      flavor: "smoke",
      pathPartIds: ["incense-bowl", "flame"],
      rate: 28,
    },
    {
      kind: "cutaway",
      partIds: ["outer-shell"],
      label: {
        zh: "隐去外壳以观察三环",
        en: "Fade the shell to inspect the three rings",
      },
    },
    {
      kind: "flowParticles",
      flavor: "custom",
      emitter: "gimbalAidPulse",
      pathPartIds: [
        "hanger-arm",
        "suspension-chain",
        "outer-shell",
        "incense-bowl",
      ],
      rate: 20,
    },
    {
      kind: "subDemo",
      triggerId: "spotlight",
      caption: {
        zh: "演示三环无源自稳",
        en: "Demonstrate passive three-ring stabilization",
      },
    },
  ],
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
  customSceneBuilders: {
    gimbalAidPulse: buildAidPulseEmitter,
  },
};

export default machine;
