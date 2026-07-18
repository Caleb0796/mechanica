import * as THREE from "three";

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
      return new THREE.SphereGeometry(params.radius, 16, 10).scale(
        1.35,
        0.7,
        0.85,
      );
    },
    seismoscopeToad(params) {
      return new THREE.SphereGeometry(params.radius, 16, 10).scale(
        1.25,
        0.65,
        1,
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
