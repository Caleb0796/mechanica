import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataJson from "../../data/machines/seismoscope.json";
import type {
  IKinematicGraph,
  MachineData,
  MachineModule,
  MachineSpec,
  MechanismScript,
  SchemePatch,
} from "../../sim/types";
import partsJson from "./parts.json";
import fengruiJson from "./schemes/fengrui.json";
import wangzhenduoJson from "./schemes/wangzhenduo.json";

const DIRECTION_COUNT = 8;
const WEST_BEARING = 6;
const BALL_DROP = 0.65;

const spec = partsJson as unknown as MachineSpec;
const data = dataJson as unknown as MachineData;
const wangzhenduo = wangzhenduoJson as unknown as SchemePatch;
const fengrui = fengruiJson as unknown as SchemePatch;

function placeGeometry(
  geometry: THREE.BufferGeometry,
  scale: readonly [number, number, number],
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.BufferGeometry {
  geometry.scale(...scale);
  geometry.rotateX(rotation[0]);
  geometry.rotateY(rotation[1]);
  geometry.rotateZ(rotation[2]);
  geometry.translate(...position);
  return geometry;
}

function mergeComposite(
  parts: THREE.BufferGeometry[],
  envelope: readonly [number, number, number],
): THREE.BufferGeometry {
  const composite = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!composite) throw new Error("Unable to merge seismoscope geometry");
  composite.computeBoundingBox();
  const bounds = composite.boundingBox;
  if (!bounds) throw new Error("Unable to measure seismoscope geometry");
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  composite.translate(-center.x, -center.y, -center.z);
  composite.scale(
    envelope[0] / size.x,
    envelope[1] / size.y,
    envelope[2] / size.z,
  );
  composite.computeVertexNormals();
  composite.computeBoundingBox();
  composite.computeBoundingSphere();
  return composite;
}

function droppedBearing(graph: IKinematicGraph): number | undefined {
  const state = graph.state();
  for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
    if (state[`ball-${bearing}`] > 0) return bearing;
  }
  return undefined;
}

function releaseBall(graph: IKinematicGraph, bearing: number): void {
  graph.setInput(`ball-${bearing}`, BALL_DROP);
}

function respondToPulse(
  graph: IKinematicGraph,
  bearing: number,
  emit: (type: string, part: string) => void,
): boolean {
  if (droppedBearing(graph) !== undefined) {
    emit("locked", `dragon-${bearing}`);
    return false;
  }
  if ("wang-chute-0" in graph.state()) {
    graph.setInput("duzhu", 0.02);
    emit("inert", "duzhu");
    return false;
  }
  if ("duzhu" in graph.state()) graph.setInput("duzhu", 0.14);
  releaseBall(graph, bearing);
  emit("releaseBall", `dragon-${bearing}`);
  return true;
}

const mechanism: MechanismScript = {
  triggers: [
    {
      id: "spotlight",
      label: {
        zh: "巧思聚光：首发互锁",
        en: "Spotlight: first-event interlock",
      },
      run(graph, emit) {
        graph.setInput("vessel", (WEST_BEARING * Math.PI) / 4);
        emit("camera", "vessel");
        emit("highlight", "duzhu");
        emit("drive", "vessel");
        if (respondToPulse(graph, WEST_BEARING, emit)) {
          for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
            if (bearing !== WEST_BEARING) emit("locked", `dragon-${bearing}`);
          }
        }
        emit("source", "houfeng-196");
        emit("spotlight:done", "seismoscope");
      },
    },
    {
      id: "quake",
      label: { zh: "注入地震方位脉冲", en: "Inject a quake-bearing pulse" },
      run(graph, emit, param) {
        const bearing =
          typeof param === "number" &&
          Number.isInteger(param) &&
          param >= 0 &&
          param < DIRECTION_COUNT
            ? param
            : 0;
        graph.setInput("vessel", (bearing * Math.PI) / 4);
        emit("pulse", "vessel");
        respondToPulse(graph, bearing, emit);
      },
    },
  ],
};

const module: MachineModule = {
  spec,
  data,
  mechanism,
  schemes: {
    wangzhenduo,
    fengrui,
  },
  defaultSchemeId: "wangzhenduo",
  customBuilders: {
    seismoscopeDragon(params) {
      const radius = params.radius;
      return mergeComposite(
        [
          placeGeometry(
            new THREE.SphereGeometry(radius, 16, 10),
            [0.95, 0.65, 0.7],
            [0, radius * 0.02, -radius * 0.12],
          ),
          placeGeometry(
            new THREE.BoxGeometry(radius * 1.08, radius * 0.38, radius * 0.9),
            [1, 1, 1],
            [0, -radius * 0.02, radius * 0.56],
          ),
          placeGeometry(
            new THREE.BoxGeometry(radius * 0.94, radius * 0.22, radius * 0.82),
            [1, 1, 1],
            [0, -radius * 0.39, radius * 0.58],
          ),
          placeGeometry(
            new THREE.CylinderGeometry(
              radius * 0.58,
              radius * 0.72,
              radius * 0.5,
              10,
            ),
            [1, 1, 1],
            [0, 0, -radius * 0.58],
            [Math.PI / 2, 0, 0],
          ),
          placeGeometry(
            new THREE.ConeGeometry(radius * 0.16, radius * 0.58, 6),
            [1, 1, 1],
            [-radius * 0.48, radius * 0.67, -radius * 0.26],
            [0, 0, -0.2],
          ),
          placeGeometry(
            new THREE.ConeGeometry(radius * 0.16, radius * 0.58, 6),
            [1, 1, 1],
            [radius * 0.48, radius * 0.67, -radius * 0.26],
            [0, 0, 0.2],
          ),
        ],
        [radius * 2.7, radius * 1.4, radius * 1.7],
      );
    },
    seismoscopeToad(params) {
      const radius = params.radius;
      return mergeComposite(
        [
          placeGeometry(
            new THREE.SphereGeometry(radius, 16, 10),
            [0.95, 0.42, 0.72],
            [0, -radius * 0.02, radius * 0.18],
          ),
          placeGeometry(
            new THREE.SphereGeometry(radius, 16, 10),
            [0.78, 0.4, 0.55],
            [0, radius * 0.03, -radius * 0.55],
          ),
          placeGeometry(
            new THREE.SphereGeometry(radius, 10, 8),
            [0.23, 0.23, 0.23],
            [-radius * 0.4, radius * 0.43, -radius * 0.77],
          ),
          placeGeometry(
            new THREE.SphereGeometry(radius, 10, 8),
            [0.23, 0.23, 0.23],
            [radius * 0.4, radius * 0.43, -radius * 0.77],
          ),
          placeGeometry(
            new THREE.CapsuleGeometry(radius * 0.12, radius * 0.55, 4, 8),
            [1, 1, 1],
            [-radius * 0.78, -radius * 0.1, -radius * 0.42],
            [Math.PI / 2, -2.35, 0],
          ),
          placeGeometry(
            new THREE.CapsuleGeometry(radius * 0.12, radius * 0.55, 4, 8),
            [1, 1, 1],
            [radius * 0.78, -radius * 0.1, -radius * 0.42],
            [Math.PI / 2, 2.35, 0],
          ),
          placeGeometry(
            new THREE.CapsuleGeometry(radius * 0.12, radius * 0.55, 4, 8),
            [1, 1, 1],
            [-radius * 0.78, -radius * 0.1, radius * 0.42],
            [Math.PI / 2, -0.8, 0],
          ),
          placeGeometry(
            new THREE.CapsuleGeometry(radius * 0.12, radius * 0.55, 4, 8),
            [1, 1, 1],
            [radius * 0.78, -radius * 0.1, radius * 0.42],
            [Math.PI / 2, 0.8, 0],
          ),
          placeGeometry(
            new THREE.BoxGeometry(radius * 0.68, radius * 0.12, radius * 0.14),
            [1, 1, 1],
            [0, radius * 0.02, -radius * 1.06],
          ),
          placeGeometry(
            new THREE.BoxGeometry(radius * 0.62, radius * 0.12, radius * 0.14),
            [1, 1, 1],
            [0, -radius * 0.2, -radius * 1.06],
          ),
        ],
        [radius * 2.5, radius * 1.3, radius * 2],
      );
    },
    seismoscopeBall(params) {
      return new THREE.SphereGeometry(params.radius, 16, 12);
    },
    seismoscopeTrack(params) {
      return new THREE.BoxGeometry(params.length, params.height, params.width);
    },
  },
};

export default module;
