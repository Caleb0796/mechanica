import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataJson from "../../data/machines/loom.json";
import type {
  IKinematicGraph,
  MachineData,
  MachineModule,
  MachineSpec,
  MechanismScript,
  SchemePatch,
} from "../../sim/types";
import partsJson from "./parts.json";
import linkageJson from "./schemes/linkage.json";
import slidingFrameJson from "./schemes/sliding-frame.json";

const HEDDLE_COUNT = 8;
const PROGRAM_STEP = Math.PI / 8;
const PROGRAM_CONSTRAINT_INDEXES = Array.from(
  { length: HEDDLE_COUNT },
  (_, index) => index,
);

interface HeddleProgram {
  id: string;
  order: string;
  ratios: number[];
}

const PROGRAM_A: HeddleProgram = {
  id: "program-a",
  order: "1-3-5-7-2-4-6-8",
  ratios: [1, 3, 5, 7, 2, 4, 6, 8],
};
const PROGRAM_B: HeddleProgram = {
  id: "program-b",
  order: "8-6-4-2-7-5-3-1",
  ratios: [8, 6, 4, 2, 7, 5, 3, 1],
};

const spec = partsJson as unknown as MachineSpec;
const data = dataJson as unknown as MachineData;
const slidingFrame = slidingFrameJson as unknown as SchemePatch;
const linkage = linkageJson as unknown as SchemePatch;

function merged(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(geometries);
  for (const item of geometries) item.dispose();
  if (!geometry) throw new Error("Loom custom geometry could not be merged");
  return geometry;
}

function loomFrame(params: Record<string, number>): THREE.BufferGeometry {
  const { beam, height, length, width } = params;
  const railX = (): THREE.BoxGeometry =>
    new THREE.BoxGeometry(length, beam, beam);
  const post = (): THREE.BoxGeometry =>
    new THREE.BoxGeometry(beam, height - 2 * beam, beam);
  const geometries: THREE.BufferGeometry[] = [];

  for (const y of [-height / 2 + beam / 2, height / 2 - beam / 2]) {
    for (const z of [-width / 2 + beam / 2, width / 2 - beam / 2]) {
      geometries.push(railX().translate(0, y, z));
    }
  }
  for (const x of [-length / 2 + beam / 2, length / 2 - beam / 2]) {
    for (const z of [-width / 2 + beam / 2, width / 2 - beam / 2]) {
      geometries.push(post().translate(x, 0, z));
    }
  }
  return merged(geometries);
}

function loomTreadles(params: Record<string, number>): THREE.BufferGeometry {
  const count = Math.floor(params.count);
  const geometries: THREE.BufferGeometry[] = [];
  for (let index = 0; index < count; index += 1) {
    const z =
      count === 1
        ? 0
        : -params.spread / 2 + (params.spread * index) / (count - 1);
    geometries.push(
      new THREE.BoxGeometry(
        params.length,
        params.width,
        params.depth,
      ).translate(0, 0, z),
    );
  }
  return merged(geometries);
}

function loomThreads(params: Record<string, number>): THREE.BufferGeometry {
  const count = Math.floor(params.count);
  const indexOffset = Math.floor(params.indexOffset ?? 0);
  const indexStep = Math.floor(params.indexStep ?? 1);
  const totalCount = Math.floor(params.totalCount ?? count);
  const geometries: THREE.BufferGeometry[] = [];
  for (let index = 0; index < count; index += 1) {
    const threadIndex = indexOffset + index * indexStep;
    const z =
      totalCount === 1
        ? 0
        : -params.spread / 2 + (params.spread * threadIndex) / (totalCount - 1);
    const thread = new THREE.CylinderGeometry(
      params.radius,
      params.radius,
      params.length,
      5,
    );
    thread.rotateZ(Math.PI / 2);
    thread.translate(0, 0, z);
    geometries.push(thread);
  }
  return merged(geometries);
}

function emitLiftedHeddles(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
): void {
  const state = graph.state();
  for (let index = 0; index < HEDDLE_COUNT; index += 1) {
    const id = `heddle-${index}`;
    if (state[id] > 1e-9) emit("heddle:lift", id);
  }
}

function programConstraints(
  program: HeddleProgram,
): MachineSpec["constraints"] {
  return program.ratios.map((ratio, index) => ({
    type: "lockstep",
    a: "treadle-bank",
    b: `selector-cam-${index}`,
    ratio,
    provenance: {
      kind: "tuice",
      ref: `${program.id} eight-heddle simplification`,
      note: "Stored demonstration order; not an excavated cam ratio.",
    },
  }));
}

function withProgram(
  reconstruction: SchemePatch,
  program: HeddleProgram,
): SchemePatch {
  const structuralConstraints = (reconstruction.addConstraints ?? []).filter(
    (constraint) =>
      !(
        constraint.type === "lockstep" &&
        constraint.a === "treadle-bank" &&
        constraint.b.startsWith("selector-cam-")
      ),
  );
  return {
    ...reconstruction,
    removeConstraintIndexes: Array.from(
      new Set([
        ...(reconstruction.removeConstraintIndexes ?? []),
        ...PROGRAM_CONSTRAINT_INDEXES,
      ]),
    ),
    addConstraints: [...structuralConstraints, ...programConstraints(program)],
  };
}

function currentProgram(graph: IKinematicGraph): HeddleProgram {
  return Math.abs(
    (graph.ratioBetween("treadle-bank", "selector-cam-0") ?? 0) - 1,
  ) < 1e-9
    ? PROGRAM_A
    : PROGRAM_B;
}

function swapProgram(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
): HeddleProgram {
  const reconstruction = Object.hasOwn(graph.state(), "linkage-crank")
    ? linkage
    : slidingFrame;
  const next = currentProgram(graph) === PROGRAM_A ? PROGRAM_B : PROGRAM_A;
  graph.setScheme(withProgram(reconstruction, next));
  emit("program:reorder", next.id);
  emit("program:order", next.order);
  emit("program:scheme", reconstruction.id);
  return next;
}

function insertWeft(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
  steps = 1,
): void {
  for (let step = 0; step < steps; step += 1) {
    graph.drive("treadle-bank", PROGRAM_STEP);
    emit("treadle:press", "treadle-bank");
    emitLiftedHeddles(graph, emit);
    emit("shed:open", "warp-shed");
    const shuttleTarget = graph.state().shuttle <= 0 ? 0.12 : -0.12;
    graph.setInput("shuttle", shuttleTarget);
    emit("weft:insert", "shuttle");
    graph.drive("weft-counter", 1);
    emit("beat-up", "beater");
    emit("weft:count", "weft-counter");
  }
}

const mechanism: MechanismScript = {
  triggers: [
    {
      id: "spotlight",
      label: {
        zh: "巧思聚光：把图案写进织机",
        en: "Spotlight: write the pattern into the loom",
      },
      run(graph, emit) {
        emit("camera", "loom-frame");
        emit("highlight", "treadle-bank");
        const before = currentProgram(graph);
        emit("program:active", before.id);
        insertWeft(graph, emit, 2);
        const after = swapProgram(graph, emit);
        insertWeft(graph, emit, 2);
        emit("pattern:contrast", `${before.id}/${after.id}`);
        emit("highlight", "single-hook");
        emit("source", "kaogu-laoguanshan");
        emit("spotlight:done", "loom");
      },
    },
    {
      id: "reorder-heddles",
      label: {
        zh: "交换八综程序",
        en: "Swap the eight-heddle program",
      },
      run(graph, emit) {
        swapProgram(graph, emit);
        insertWeft(graph, emit);
      },
    },
    {
      id: "weft-insertion",
      label: {
        zh: "踏下一步并引纬",
        en: "Tread one program step and insert weft",
      },
      run(graph, emit, param) {
        const steps =
          typeof param === "number" && Number.isInteger(param) && param > 0
            ? param
            : 1;
        insertWeft(graph, emit, steps);
      },
    },
  ],
};

const machine: MachineModule = {
  spec,
  data,
  mechanism,
  schemes: {
    "sliding-frame": slidingFrame,
    linkage,
  },
  defaultSchemeId: "sliding-frame",
  customBuilders: {
    loomFrame,
    loomTreadles,
    loomThreads,
  },
};

export default machine;
