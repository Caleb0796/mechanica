import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataDocument from "../../data/machines/astroclock.json";
import type {
  MachineData,
  MachineModule,
  MachineSpec,
  MechanismScript,
  SchemePatch,
} from "../../sim/types";
import partsDocument from "./parts.json";
import combridgeHingedDocument from "./schemes/combridge-hinged.json";
import fixedScoopDocument from "./schemes/fixed-scoop.json";

const spec = {
  slug: "astroclock",
  ...partsDocument,
} as unknown as MachineSpec;

const fixedScoop = fixedScoopDocument as unknown as SchemePatch;
const combridgeHinged = combridgeHingedDocument as unknown as SchemePatch;
const stepRad = (Math.PI * 2) / 36;

function emitWaterCircuit(emit: (type: string, part: string) => void): void {
  emit("caption:reservoir", "water-reservoir");
  emit("caption:constant-head", "constant-level-tank");
  emit("caption:return", "water-lift-wheel");
}

function towerCutaway(params: Record<string, number>): THREE.BufferGeometry {
  const top = params.topHalfWidth;
  const bottom = params.bottomHalfWidth;
  const halfHeight = params.height / 2;
  const vertices = [
    -bottom,
    -halfHeight,
    -bottom,
    bottom,
    -halfHeight,
    -bottom,
    bottom,
    -halfHeight,
    bottom,
    -bottom,
    -halfHeight,
    bottom,
    -top,
    halfHeight,
    -top,
    top,
    halfHeight,
    -top,
    top,
    halfHeight,
    top,
    -top,
    halfHeight,
    top,
  ];
  const outward = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7];
  const inward: number[] = [];
  for (let index = 0; index < outward.length; index += 3) {
    inward.push(outward[index], outward[index + 2], outward[index + 1]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex([...outward, ...inward]);
  geometry.computeVertexNormals();
  return geometry;
}

function armillary(params: Record<string, number>): THREE.BufferGeometry {
  const rings = [
    new THREE.TorusGeometry(params.radius, params.tube, 8, 48),
    new THREE.TorusGeometry(params.radius, params.tube, 8, 48),
    new THREE.TorusGeometry(params.radius, params.tube, 8, 48),
  ];
  rings[1].rotateX(Math.PI / 2);
  rings[2].rotateY(Math.PI / 2);
  const geometry = mergeGeometries(rings);
  for (const ring of rings) ring.dispose();
  return geometry;
}

const mechanism: MechanismScript = {
  triggers: [
    {
      id: "spotlight",
      label: {
        zh: "看见擒纵的一个节拍",
        en: "See one escapement beat",
      },
      run: (graph, emit) => {
        emit("camera", "tower-shell");
        emit("highlight", "scoop-01");
        emit("caption:fill", "scoop-01");
        emitWaterCircuit(emit);
        emit("highlight", "gecha");
        emit("caption:yield", "gecha");
        emit("caption:open", "guanshe");
        graph.drive("shulun", stepRad);
        emit("caption:advance", "shulun");
        emit("caption:relock", "tiansuo-r");
        emit("highlight", "celestial-globe");
        emit("spotlight:done", "shulun");
      },
    },
    {
      id: "escapement-captions",
      label: {
        zh: "逐句播放擒纵周期",
        en: "Caption one escapement cycle",
      },
      run: (graph, emit) => {
        emit("caption:fill", "scoop-01");
        emitWaterCircuit(emit);
        emit("caption:yield", "gecha");
        emit("caption:open", "guanshe");
        graph.drive("shulun", stepRad);
        emit("caption:advance", "shulun");
        emit("caption:relock", "tiansuo-r");
      },
    },
    {
      id: "drag-shulun",
      label: {
        zh: "拖动枢轮",
        en: "Drag the scoop wheel",
      },
      run: (graph, emit, direction = 1) => {
        if (direction < 0) {
          emit("blocked", "tiansuo-r");
          return;
        }
        graph.drive("shulun", stepRad);
        emit("advance", "shulun");
      },
    },
    {
      id: "chime-placards",
      label: {
        zh: "五层报时",
        en: "Five-tier reporting",
      },
      run: (graph, emit) => {
        const before = graph.state();
        graph.drive("shulun", stepRad);
        for (let tier = 1; tier <= 5; tier += 1) {
          const part = `tier-placard-${tier}`;
          if (
            (before[part] ?? 0) <= 1e-9 &&
            (graph.state()[part] ?? 0) > 1e-9
          ) {
            emit("placard", part);
          }
        }
      },
    },
  ],
};

const machine: MachineModule = {
  spec,
  data: dataDocument as unknown as MachineData,
  mechanism,
  schemes: {
    [fixedScoop.id]: fixedScoop,
    [combridgeHinged.id]: combridgeHinged,
  },
  defaultSchemeId: fixedScoop.id,
  customBuilders: {
    astroclockTowerCutaway: towerCutaway,
    astroclockArmillary: armillary,
  },
};

export default machine;
