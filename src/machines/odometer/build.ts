import dataJson from "../../data/machines/odometer.json";
import type {
  MachineData,
  MachineModule,
  MachineSpec,
  PartDef,
  SchemePatch,
} from "../../sim/types";
import partsJson from "./parts.json";
import ludaolongJson from "./schemes/ludaolong.json";

const TWO_PI = Math.PI * 2;
const ROAD_TURNS_PER_LI = 100;
const ROAD_TURNS_PER_FULL_CYCLE = ROAD_TURNS_PER_LI * 10;

const parts = partsJson as unknown as PartDef[];
const ludaolong = ludaolongJson as unknown as SchemePatch;

const constraints: MachineSpec["constraints"] = [
  {
    type: "lockstep",
    a: "zulun",
    b: "road-axle",
    ratio: 1,
    provenance: {
      kind: "tuice",
      ref: "songshi-ludaolong",
      note: "The reconstructed road wheels and axle rotate as one assembly.",
    },
  },
  {
    type: "lockstep",
    a: "zulun",
    b: "lilun",
    ratio: 1,
    provenance: { kind: "wenxian", ref: "songshi-ludaolong" },
  },
  { type: "mesh", a: "lilun", b: "xiapinglun" },
  {
    type: "lockstep",
    a: "xiapinglun",
    b: "xuanfenglun",
    ratio: 1,
    provenance: { kind: "wenxian", ref: "songshi-ludaolong" },
  },
  { type: "mesh", a: "xuanfenglun", b: "zhongpinglun" },
  {
    type: "lockstep",
    a: "zhongpinglun",
    b: "xiaopinglun",
    ratio: 1,
    provenance: { kind: "wenxian", ref: "songshi-ludaolong" },
  },
  { type: "mesh", a: "xiaopinglun", b: "shangpinglun" },
  {
    type: "cam",
    cam: "zhongpinglun",
    follower: "lower-figure",
    profile: "lift",
    liftHeight: 0.28,
    dwellRatio: 0.08,
    provenance: {
      kind: "tuice",
      ref: "songshi-waiguan",
      note: "The source records the strike but not the reconstructed cam profile or lift.",
    },
  },
  {
    type: "cam",
    cam: "shangpinglun",
    follower: "upper-figure",
    profile: "lift",
    liftHeight: 0.28,
    dwellRatio: 0.08,
    provenance: {
      kind: "tuice",
      ref: "songshi-waiguan",
      note: "The source records the strike but not the reconstructed cam profile or lift.",
    },
  },
];

const spec: MachineSpec = {
  slug: "odometer",
  parts,
  constraints,
  driveNodes: ["zulun", "zhongpinglun", "shangpinglun"],
  primaryDrive: "zulun",
  cycleRad: TWO_PI * ROAD_TURNS_PER_FULL_CYCLE,
  expectedRatios: [
    {
      from: "zulun",
      to: "zhongpinglun",
      ratio: 1 / 100,
      sourceRef: "songshi-ludaolong",
    },
    {
      from: "zulun",
      to: "shangpinglun",
      ratio: -1 / 1000,
      sourceRef: "songshi-ludaolong",
    },
  ],
  collisionWhitelist: [
    ["lilun", "xiapinglun"],
    ["xuanfenglun", "zhongpinglun"],
    ["xiaopinglun", "shangpinglun"],
  ],
};

function completedTurns(angle: number): number {
  return Math.floor((Math.abs(angle) + 1e-10) / TWO_PI);
}

function emitCrossedStrikes(
  before: Record<string, number>,
  after: Record<string, number>,
  emit: (type: string, part: string) => void,
): void {
  const drumCrossings =
    completedTurns(after.zhongpinglun) - completedTurns(before.zhongpinglun);
  const chimeCrossings =
    completedTurns(after.shangpinglun) - completedTurns(before.shangpinglun);
  for (let crossing = 0; crossing < drumCrossings; crossing += 1) {
    emit("drum", "lower-figure");
  }
  for (let crossing = 0; crossing < chimeCrossings; crossing += 1) {
    emit("chime", "upper-figure");
  }
}

function driveTransmission(
  graph: Parameters<
    NonNullable<MachineModule["mechanism"]>["triggers"][number]["run"]
  >[0],
  emit: (type: string, part: string) => void,
  nodeId: string,
  delta: number,
): void {
  const before = graph.state();
  graph.drive(nodeId, delta);
  const li = Math.abs(graph.state().zulun) / (ROAD_TURNS_PER_LI * TWO_PI);
  emit("odometer:update", li.toFixed(2));
  emitCrossedStrikes(before, graph.state(), emit);
}

const machine: MachineModule = {
  spec,
  data: dataJson as unknown as MachineData,
  mechanism: {
    triggers: [
      {
        id: "spotlight",
        label: {
          zh: "巧思聚光：十进制里程",
          en: "Spotlight: decimal distance",
        },
        run(graph, emit) {
          graph.setInput("zulun", 99 * TWO_PI);
          emit("camera:focus", "xuanfenglun");
          emit("highlight:on", "xuanfenglun");
          emit("highlight:on", "zhongpinglun");
          emit("odometer:readout", "0.99-li");
          const before = graph.state();
          emit("drive:slow", "zulun");
          graph.drive("zulun", TWO_PI / 2);
          emit("mallet:raise", "lower-figure");
          graph.drive("zulun", TWO_PI / 2);
          emitCrossedStrikes(before, graph.state(), emit);
          emit("odometer:readout", "1.00-li");
          emit("source", "songshi-ludaolong");
          emit("highlight:off", "xuanfenglun");
          emit("highlight:off", "zhongpinglun");
          emit("spotlight:done", "odometer");
        },
      },
      {
        id: "drive:zulun",
        label: { zh: "拖动足轮", en: "Drag road wheel" },
        run(graph, emit, param) {
          driveTransmission(
            graph,
            emit,
            "zulun",
            typeof param === "number" && Number.isFinite(param) ? param : 0,
          );
        },
      },
      {
        id: "drive:zhongpinglun",
        label: { zh: "拖动中平轮", en: "Drag middle wheel" },
        run(graph, emit, param) {
          driveTransmission(
            graph,
            emit,
            "zhongpinglun",
            typeof param === "number" && Number.isFinite(param) ? param : 0,
          );
        },
      },
      {
        id: "drive:shangpinglun",
        label: { zh: "拖动上平轮", en: "Drag upper wheel" },
        run(graph, emit, param) {
          driveTransmission(
            graph,
            emit,
            "shangpinglun",
            typeof param === "number" && Number.isFinite(param) ? param : 0,
          );
        },
      },
      {
        id: "advance",
        label: { zh: "前进里程", en: "Advance distance" },
        run(graph, emit, param) {
          const li =
            typeof param === "number" && Number.isFinite(param)
              ? Math.max(0, param)
              : 1;
          emit("drive", "zulun");
          driveTransmission(
            graph,
            emit,
            "zulun",
            li * ROAD_TURNS_PER_LI * TWO_PI,
          );
        },
      },
    ],
  },
  schemes: {
    ludaolong,
  },
  defaultSchemeId: "ludaolong",
};

export default machine;
