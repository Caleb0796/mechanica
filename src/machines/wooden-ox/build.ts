import dataJson from "../../data/machines/wooden-ox.json";
import type {
  IKinematicGraph,
  MachineData,
  MachineModule,
  MachineSpec,
  PartDef,
  SchemePatch,
} from "../../sim/types";
import partsJson from "./parts.json";
import walkerJson from "./schemes/walker.json";
import wheelbarrowJson from "./schemes/wheelbarrow.json";

const parts = partsJson as unknown as PartDef[];
const wheelbarrow = wheelbarrowJson as unknown as SchemePatch;
const walker = walkerJson as unknown as SchemePatch;

function driveInput(graph: IKinematicGraph, delta: number): void {
  graph.drive("drive-axle", delta);
}

function runWalkerGait(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
): void {
  graph.setInput("drive-axle", 0);
  for (let leg = 0; leg < 4; leg += 1) {
    emit("highlight:on", `walker-leg-${leg}`);
    emit("phase", `walker-crank-${leg}`);
  }
  for (let step = 0; step < 4; step += 1) {
    driveInput(graph, Math.PI / 2);
    emit("drive:step", "drive-axle");
  }
  for (let leg = 0; leg < 4; leg += 1) {
    emit("highlight:off", `walker-leg-${leg}`);
  }
  emit("source", "sgz-muniu");
}

const spec: MachineSpec = {
  slug: "wooden-ox",
  parts,
  constraints: [],
  driveNodes: ["drive-axle"],
  primaryDrive: "drive-axle",
  cycleRad: Math.PI * 2,
  expectedRatios: [],
  collisionWhitelist: [],
};

const machine: MachineModule = {
  spec,
  data: dataJson as unknown as MachineData,
  mechanism: {
    triggers: [
      {
        id: "drive:drive-axle",
        label: { zh: "驱动人力轴", en: "Drive human-power axle" },
        run(graph, emit, param) {
          driveInput(
            graph,
            typeof param === "number" && Number.isFinite(param) ? param : 0,
          );
          emit("drive", "drive-axle");
        },
      },
      {
        id: "spotlight",
        label: { zh: "承重与步态", en: "Load path and walking gait" },
        run(graph, emit) {
          const state = graph.state();
          emit("camera:focus", "wooden-ox");

          if ("walker-crank-0" in state) {
            runWalkerGait(graph, emit);
          } else {
            emit("highlight:on", "cargo-pod-left");
            emit("highlight:on", "cargo-pod-right");
            if ("central-big-wheel" in state) {
              emit("force:load", "cargo-pod-left");
              emit("force:load", "cargo-pod-right");
              emit("force:support", "central-big-wheel");
              driveInput(graph, Math.PI / 2);
              emit("drive", "central-big-wheel");
            }
            emit("highlight:off", "cargo-pod-left");
            emit("highlight:off", "cargo-pod-right");
            emit("source", "shiwujiyuan");
            graph.setScheme(walker);
            emit("scheme:switch", "walker");
            runWalkerGait(graph, emit);
          }

          emit("spotlight:done", "wooden-ox");
        },
      },
    ],
  },
  schemes: {
    wheelbarrow,
    walker,
  },
  defaultSchemeId: "wheelbarrow",
};

export default machine;
