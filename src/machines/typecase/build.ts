import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataJson from "../../data/machines/typecase.json";
import type {
  IKinematicGraph,
  MachineData,
  MachineModule,
  MachineSpec,
  MechanismScript,
} from "../../sim/types";
import partsJson from "./parts.json";

const TYPE_SECTOR = (Math.PI * 2) / 16;

const spec = partsJson as unknown as MachineSpec;
const data = dataJson as unknown as MachineData;

function merged(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(geometries);
  for (const item of geometries) item.dispose();
  if (!geometry)
    throw new Error("Typecase custom geometry could not be merged");
  return geometry;
}

function instancedTypeGrid(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const count = Math.max(1, Math.floor(params.count));
  const columns = Math.max(1, Math.floor(params.columns));
  const rows = Math.ceil(count / columns);
  const pitch = params.cell + params.gap;
  const width = (columns - 1) * pitch;
  const depth = (rows - 1) * pitch;
  const geometry = new THREE.BoxGeometry(
    params.cell,
    params.thickness,
    params.cell,
  );
  const matrices: number[][] = [];
  const matrix = new THREE.Matrix4();

  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    matrices.push(
      matrix
        .makeTranslation(column * pitch - width / 2, 0, row * pitch - depth / 2)
        .toArray(),
    );
  }
  geometry.userData.mechanicaInstances = { matrices };
  return geometry;
}

function typecaseForme(params: Record<string, number>): THREE.BufferGeometry {
  const innerDepth = params.depth - 2 * params.bar;
  return merged([
    new THREE.BoxGeometry(params.width, params.height, params.bar).translate(
      0,
      0,
      -params.depth / 2 + params.bar / 2,
    ),
    new THREE.BoxGeometry(params.width, params.height, params.bar).translate(
      0,
      0,
      params.depth / 2 - params.bar / 2,
    ),
    new THREE.BoxGeometry(params.bar, params.height, innerDepth).translate(
      -params.width / 2 + params.bar / 2,
      0,
      0,
    ),
    new THREE.BoxGeometry(params.bar, params.height, innerDepth).translate(
      params.width / 2 - params.bar / 2,
      0,
      0,
    ),
  ]);
}

const PROCESS_EVENTS = [
  ["process:pick", "picked-type"],
  ["process:set-forme", "iron-forme"],
  ["process:heat-resin", "resin-bed"],
  ["process:press-flat", "flat-press"],
  ["process:print", "print-sheet"],
] as const;

function setPrintStage(graph: IKinematicGraph, step: number, target = 1): void {
  graph.setInput("rhyme-wheel", step === 0 ? 0 : TYPE_SECTOR * target);
  graph.setInput("picked-type", step === 1 ? 0.05 : 0);
  graph.setInput("heater", step >= 3 ? 0.02 : 0);
  graph.setInput("flat-press", step >= 4 ? 0.1 : 0);
  graph.setInput("print-sheet", step >= 5 ? 0.12 : 0);
}

function runPrintStep(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
  step: number,
  target = 1,
): void {
  setPrintStage(graph, step, target);
  const [type, part] = PROCESS_EVENTS[step - 1];
  emit(type, part);
}

function runPrintCycle(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
  target = 1,
): void {
  for (let step = 1; step <= PROCESS_EVENTS.length; step += 1) {
    runPrintStep(graph, emit, step, target);
  }
}

const mechanism: MechanismScript = {
  triggers: [
    {
      id: "spotlight",
      label: {
        zh: "巧思聚光：转轮拣字并印刷",
        en: "Spotlight: turn, pick, and print",
      },
      run(graph, emit) {
        emit("camera:focus", "rhyme-wheel");
        emit("highlight:on", "type-grid");
        graph.setInput("rhyme-wheel", TYPE_SECTOR);
        emit("drive:slow", "rhyme-wheel");
        runPrintCycle(graph, emit);
        emit("highlight:on", "iron-forme");
        emit("source", "nongshu-zaolun");
        emit("source", "mengxi-bisheng");
        emit("highlight:off", "type-grid");
        emit("highlight:off", "iron-forme");
        emit("spotlight:done", "typecase");
      },
    },
    {
      id: "process",
      label: {
        zh: "演示五步印刷",
        en: "Run the five-step print cycle",
      },
      run(graph, emit, param) {
        if (param === undefined) {
          runPrintCycle(graph, emit);
          return;
        }
        const step = Number.isFinite(param)
          ? Math.max(0, Math.min(PROCESS_EVENTS.length, Math.trunc(param)))
          : 0;
        if (step === 0) {
          setPrintStage(graph, 0);
          emit("process:reset", "typecase");
          return;
        }
        runPrintStep(graph, emit, step);
      },
    },
  ],
};

const machine: MachineModule = {
  spec,
  data,
  mechanism,
  customBuilders: {
    instancedTypeGrid,
    typecaseForme,
  },
};

export default machine;
