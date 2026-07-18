import dataJson from "../../data/machines/chariot.json";
import type {
  IKinematicGraph,
  MachineData,
  MachineModule,
  MachineSpec,
  PartDef,
  SchemePatch,
} from "../../sim/types";
import partsJson from "./parts.json";
import lanchesterDiffJson from "./schemes/lanchester-diff.json";
import yansuClutchJson from "./schemes/yansu-clutch.json";

const parts = partsJson as unknown as PartDef[];
const yansuClutch = yansuClutchJson as unknown as SchemePatch;
const lanchesterDiff = lanchesterDiffJson as unknown as SchemePatch;

const constraints: MachineSpec["constraints"] = [
  {
    type: "lockstep",
    a: "chassis-pivot",
    b: "figure-turntable",
    ratio: -1,
    provenance: {
      kind: "wenxian",
      ref: "songshi-turn",
      note: "Equal-and-opposite counter-rotation preserves the figure's world heading.",
    },
  },
  {
    type: "mesh",
    a: "left-sub-wheel",
    b: "left-small-wheel",
  },
  {
    type: "mesh",
    a: "left-small-wheel",
    b: "great-wheel",
  },
  {
    type: "mesh",
    a: "right-sub-wheel",
    b: "right-small-wheel",
  },
  {
    type: "mesh",
    a: "right-small-wheel",
    b: "great-wheel",
  },
  {
    type: "lockstep",
    a: "chassis-pivot",
    b: "great-wheel",
    ratio: -1,
    provenance: {
      kind: "wenxian",
      ref: "songshi-turn",
      note: "The quarter-turn closure makes the visible great wheel counter-rotate with chassis yaw.",
    },
  },
];

function driveRoadWheel(
  graph: IKinematicGraph,
  wheelId: "left-road-wheel" | "right-road-wheel",
  delta: number,
): void {
  graph.drive(wheelId, delta);
  const state = graph.state();
  if (!("left-clutch-dog" in state)) return;

  const yaw = state["left-road-wheel"] - state["right-road-wheel"];
  graph.setInput("chassis-pivot", yaw);
  const engagement = Math.abs(yaw) < 1e-9 ? 0 : 0.08;
  graph.setInput("left-clutch-dog", yaw > 0 ? engagement : 0);
  graph.setInput("right-clutch-dog", yaw < 0 ? engagement : 0);
  graph.setInput("clutch-yoke", Math.sign(yaw) * engagement);
}

const spec: MachineSpec = {
  slug: "chariot",
  parts,
  constraints,
  driveNodes: ["left-road-wheel", "right-road-wheel", "great-wheel"],
  primaryDrive: "left-road-wheel",
  cycleRad: Math.PI * 2,
  expectedRatios: [
    {
      from: "left-sub-wheel",
      to: "left-small-wheel",
      ratio: -2,
      sourceRef: "songshi-yansu",
    },
    {
      from: "left-small-wheel",
      to: "great-wheel",
      ratio: -0.25,
      sourceRef: "songshi-yansu",
    },
    {
      from: "right-sub-wheel",
      to: "right-small-wheel",
      ratio: -2,
      sourceRef: "songshi-yansu",
    },
    {
      from: "right-small-wheel",
      to: "great-wheel",
      ratio: -0.25,
      sourceRef: "songshi-yansu",
    },
  ],
  collisionWhitelist: [
    ["left-sub-wheel", "left-small-wheel"],
    ["left-small-wheel", "great-wheel"],
    ["right-sub-wheel", "right-small-wheel"],
    ["right-small-wheel", "great-wheel"],
    ["platform", "central-shaft"],
    ["great-wheel", "central-shaft"],
    ["left-clutch-dog", "clutch-yoke"],
    ["right-clutch-dog", "clutch-yoke"],
  ],
};

const machine: MachineModule = {
  spec,
  data: dataJson as unknown as MachineData,
  mechanism: {
    triggers: [
      {
        id: "drive:left-road-wheel",
        label: { zh: "左轮离合驱动", en: "Left clutch drive" },
        run(graph, emit, param) {
          driveRoadWheel(graph, "left-road-wheel", param ?? 0);
          emit("drive", "left-road-wheel");
        },
      },
      {
        id: "drive:right-road-wheel",
        label: { zh: "右轮离合驱动", en: "Right clutch drive" },
        run(graph, emit, param) {
          driveRoadWheel(graph, "right-road-wheel", param ?? 0);
          emit("drive", "right-road-wheel");
        },
      },
      {
        id: "spotlight",
        label: { zh: "转向指南", en: "South-pointing turn" },
        run(graph, emit, param) {
          const turn = param ?? Math.PI / 2;
          emit("camera:focus", "chariot");
          emit("highlight:on", "left-road-wheel");
          driveRoadWheel(graph, "left-road-wheel", turn);
          emit("drive", "left-road-wheel");
          emit("highlight:on", "left-sub-wheel");
          emit("highlight:on", "left-small-wheel");
          emit("highlight:on", "great-wheel");
          emit("camera:orbit", "south-figure-body");
          emit("highlight:off", "left-road-wheel");
          emit("highlight:off", "left-sub-wheel");
          emit("highlight:off", "left-small-wheel");
          emit("highlight:off", "great-wheel");
          emit("spotlight:done", "chariot");
        },
      },
    ],
  },
  schemes: {
    "yansu-clutch": yansuClutch,
    "lanchester-diff": lanchesterDiff,
  },
  defaultSchemeId: "yansu-clutch",
};

export default machine;
