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
const PROGRAM_PHASE_PER_HOOK = (Math.PI * 2) / 0.02;
const PROGRAM_CONSTRAINT_INDEXES = Array.from(
  { length: HEDDLE_COUNT },
  (_, index) => index + 2,
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
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function loomFrame(params: Record<string, number>): THREE.BufferGeometry {
  const { beam, height, length, width } = params;
  const crossRailY = height * (params.crossRailRatio ?? 0.32);
  const selectorGuideInset = params.selectorGuideInset ?? 1.2;
  const selectorX = -length * (params.selectorXRatio ?? 0.19);
  const railX = (): THREE.BoxGeometry =>
    new THREE.BoxGeometry(length, beam, beam);
  const railZ = (): THREE.BoxGeometry =>
    new THREE.BoxGeometry(beam, beam, width);
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
    for (const y of [-height / 2 + beam / 2, height / 2 - beam / 2]) {
      geometries.push(railZ().translate(x, y, 0));
    }
  }
  for (const x of [-length * 0.28, length * 0.16]) {
    geometries.push(
      new THREE.BoxGeometry(beam, beam, width - 2 * beam).translate(
        x,
        crossRailY,
        0,
      ),
    );
  }
  const selectorGuideHeight = height * 0.28;
  const selectorGuideY = height * 0.3;
  for (const z of [
    -width / 2 + beam * selectorGuideInset,
    width / 2 - beam * selectorGuideInset,
  ]) {
    geometries.push(
      new THREE.BoxGeometry(beam, selectorGuideHeight, beam).translate(
        selectorX,
        selectorGuideY,
        z,
      ),
    );
  }
  for (const y of [height * 0.17, height * 0.47]) {
    geometries.push(
      new THREE.BoxGeometry(beam, beam, width - beam * 2.4).translate(
        selectorX,
        y,
        0,
      ),
    );
  }
  return merged(geometries);
}

function loomTreadles(params: Record<string, number>): THREE.BufferGeometry[] {
  const count = Math.floor(params.count);
  const treadles: THREE.BufferGeometry[] = [];
  for (let index = 0; index < count; index += 1) {
    const z =
      count === 1
        ? 0
        : -params.spread / 2 + (params.spread * index) / (count - 1);
    treadles.push(
      new THREE.BoxGeometry(params.length, params.width, params.depth)
        .rotateZ(-0.055)
        .translate(params.length / 2, 0, z),
      new THREE.BoxGeometry(
        params.length * 0.22,
        params.width * 2.4,
        params.depth * 1.8,
      )
        .rotateZ(-0.055)
        .translate(params.length * 0.86, 0, z),
    );
  }
  const treadleBank = merged(treadles);
  const restPositions = Float32Array.from(
    treadleBank.getAttribute("position").array as ArrayLike<number>,
  );
  treadleBank.userData.mechanicaAnimation = {
    currentStateRad: Number.NaN,
  };
  treadleBank.userData.mechanicaUpdate = (stateRad: number) => {
    const depression = -0.26 * (0.5 - 0.5 * Math.cos(stateRad * 4));
    const cosine = Math.cos(depression);
    const sine = Math.sin(depression);
    const positions = treadleBank.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      const x = restPositions[index * 3];
      const y = restPositions[index * 3 + 1];
      positions.setXYZ(
        index,
        x * cosine - y * sine,
        x * sine + y * cosine,
        restPositions[index * 3 + 2],
      );
    }
    positions.needsUpdate = true;
    treadleBank.computeVertexNormals();
    treadleBank.computeBoundingBox();
    treadleBank.computeBoundingSphere();
    treadleBank.userData.mechanicaAnimation.currentStateRad = stateRad;
  };

  const mounting: THREE.BufferGeometry[] = [
    new THREE.CylinderGeometry(
      params.width,
      params.width,
      params.spread + params.depth,
      10,
    )
      .rotateX(Math.PI / 2)
      .translate(0, 0, 0),
  ];
  const cordHeight = Math.min(
    params.length * (params.cordHeightRatio ?? 0.58),
    params.length * 0.86,
  );
  const selectorHeight = params.length * 0.6;
  const harnessX = params.length * 0.44;
  for (let index = 0; index < count; index += 1) {
    const z =
      count === 1
        ? 0
        : -params.spread / 2 + (params.spread * index) / (count - 1);
    mounting.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(params.length * 0.78, params.width, z),
          new THREE.Vector3(params.length * 0.38, selectorHeight * 0.45, z),
          new THREE.Vector3(0, selectorHeight, z),
          new THREE.Vector3(harnessX * 0.42, cordHeight * 0.82, z * 0.9),
          new THREE.Vector3(harnessX, cordHeight, z * 0.76),
        ]),
        20,
        params.width * 0.18,
        6,
        false,
      ),
    );
  }
  mounting.push(
    new THREE.CylinderGeometry(
      params.width * 0.6,
      params.width * 0.6,
      params.spread + params.depth,
      10,
    )
      .rotateX(Math.PI / 2)
      .translate(0, selectorHeight, 0),
    new THREE.CylinderGeometry(
      params.width * 0.48,
      params.width * 0.48,
      params.spread * 0.78,
      10,
    )
      .rotateX(Math.PI / 2)
      .translate(harnessX, cordHeight, 0),
  );
  const routedCords = merged(mounting);
  routedCords.userData.mechanicaMaterial = {
    color: "#d7ad55",
    emissive: "#241604",
    emissiveIntensity: 0.04,
    metalness: 0.18,
    roughness: 0.48,
    textureVariant: "none",
  };
  routedCords.userData.mechanicaSemantic = {
    kind: "treadle-selector-harness",
    features: ["treadle-cords", "selector-crossbar", "heddle-harness"],
  };

  const selectorPull = new THREE.BoxGeometry(
    params.width * 2.8,
    params.width * 2.2,
    params.spread * 0.92,
  ).translate(0, selectorHeight, 0);
  const pullRestPositions = Float32Array.from(
    selectorPull.getAttribute("position").array as ArrayLike<number>,
  );
  selectorPull.userData.mechanicaAnimation = {
    currentStateRad: Number.NaN,
  };
  selectorPull.userData.mechanicaUpdate = (stateRad: number) => {
    const pull = -0.028 * (0.5 - 0.5 * Math.cos(stateRad * 4));
    const positions = selectorPull.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      positions.setXYZ(
        index,
        pullRestPositions[index * 3],
        pullRestPositions[index * 3 + 1] + pull,
        pullRestPositions[index * 3 + 2],
      );
    }
    positions.needsUpdate = true;
    selectorPull.computeVertexNormals();
    selectorPull.computeBoundingBox();
    selectorPull.computeBoundingSphere();
    selectorPull.userData.mechanicaAnimation.currentStateRad = stateRad;
  };
  selectorPull.userData.mechanicaMaterial = {
    color: "#f0ca6e",
    emissive: "#3a2508",
    emissiveIntensity: 0.08,
    metalness: 0.45,
    roughness: 0.32,
    textureVariant: "none",
  };
  selectorPull.userData.mechanicaSemantic = {
    kind: "selector-pull-witness",
    features: ["treadle-motion", "selector-handoff"],
  };
  selectorPull.userData.mechanicaUpdate(0);
  return [routedCords, treadleBank, selectorPull];
}

function loomBeam(params: Record<string, number>): THREE.BufferGeometry {
  const { length, radius } = params;
  return merged([
    new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, length, 18),
    new THREE.CylinderGeometry(radius, radius, radius * 0.32, 18).translate(
      0,
      -length / 2 + radius * 0.16,
      0,
    ),
    new THREE.CylinderGeometry(radius, radius, radius * 0.32, 18).translate(
      0,
      length / 2 - radius * 0.16,
      0,
    ),
    new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, length, 12),
  ]);
}

function loomCloth(params: Record<string, number>): THREE.BufferGeometry[] {
  const { length, thickness, width } = params;
  const ground = new THREE.BoxGeometry(
    length,
    thickness * 0.5,
    width,
  ).translate(0, -thickness * 0.25, 0);
  ground.computeBoundingBox();
  ground.computeBoundingSphere();
  ground.userData.mechanicaMaterial = {
    color: "#8f2e2a",
    metalness: 0,
    roughness: 0.55,
    textureVariant: "none",
  };
  const groundRestPositions = Float32Array.from(
    ground.getAttribute("position").array as ArrayLike<number>,
  );
  const clothProgress = (state: number): number =>
    state <= 0.5
      ? THREE.MathUtils.clamp(state / 0.18, 0, 1)
      : THREE.MathUtils.clamp((1 - state) / 0.18, 0, 1);
  const advancedX = (x: number, progress: number): number => {
    const takeUpEdge = length / 2;
    const visibleScale = 0.78 + 0.22 * progress;
    return takeUpEdge - (takeUpEdge - x) * visibleScale;
  };
  ground.userData.mechanicaAnimation = {
    currentStateRad: Number.NaN,
  };
  ground.userData.mechanicaUpdate = (state: number) => {
    const progress = clothProgress(state);
    const positions = ground.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      positions.setXYZ(
        index,
        advancedX(groundRestPositions[index * 3], progress),
        groundRestPositions[index * 3 + 1],
        groundRestPositions[index * 3 + 2],
      );
    }
    positions.needsUpdate = true;
    ground.computeVertexNormals();
    ground.computeBoundingBox();
    ground.computeBoundingSphere();
    ground.userData.mechanicaAnimation.currentStateRad = state;
  };
  const motifGeometry = (angles: readonly number[]) => {
    const motifs: THREE.BufferGeometry[] = [];
    for (const x of [-0.36, -0.18, 0, 0.18, 0.36]) {
      for (const angle of angles) {
        motifs.push(
          new THREE.BoxGeometry(length * 0.17, thickness * 0.5, width * 0.032)
            .rotateY(angle)
            .translate(x * length, thickness * 0.25, 0),
        );
      }
    }
    return merged(motifs);
  };
  const programAPattern = motifGeometry([-Math.PI / 4, Math.PI / 4]);
  const programBPattern = motifGeometry([0, Math.PI / 2]);
  const advanceBand = new THREE.BoxGeometry(
    length * 0.08,
    thickness * 0.9,
    width * 0.96,
  ).translate(-length * 0.2, thickness * 0.35, 0);
  advanceBand.computeBoundingBox();
  advanceBand.computeBoundingSphere();
  const advanceBandRestPositions = Float32Array.from(
    advanceBand.getAttribute("position").array as ArrayLike<number>,
  );
  advanceBand.userData.mechanicaAnimation = {
    currentStateRad: Number.NaN,
  };
  advanceBand.userData.mechanicaUpdate = (state: number) => {
    const translation = length * 0.52 * clothProgress(state);
    const positions = advanceBand.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      positions.setXYZ(
        index,
        advanceBandRestPositions[index * 3] + translation,
        advanceBandRestPositions[index * 3 + 1],
        advanceBandRestPositions[index * 3 + 2],
      );
    }
    positions.needsUpdate = true;
    advanceBand.computeVertexNormals();
    advanceBand.computeBoundingBox();
    advanceBand.computeBoundingSphere();
    advanceBand.userData.mechanicaAnimation.currentStateRad = state;
  };
  advanceBand.userData.mechanicaMaterial = {
    color: "#f5e5a6",
    metalness: 0,
    roughness: 0.35,
    textureVariant: "none",
  };
  const configurePattern = (
    pattern: THREE.BufferGeometry,
    program: "a" | "b",
    color: string,
  ) => {
    const restPositions = Float32Array.from(
      pattern.getAttribute("position").array as ArrayLike<number>,
    );
    pattern.userData.mechanicaAnimation = {
      currentStateRad: Number.NaN,
    };
    pattern.userData.mechanicaUpdate = (state: number) => {
      const progress = clothProgress(state);
      const blend = THREE.MathUtils.smoothstep(
        Math.max(0, Math.min(1, state)),
        0.32,
        0.68,
      );
      const active = program === "a" ? 1 - blend : blend;
      const hiddenOffset = -thickness * 2.25 * (1 - active);
      const positions = pattern.getAttribute("position");
      for (let index = 0; index < positions.count; index += 1) {
        positions.setXYZ(
          index,
          advancedX(restPositions[index * 3], progress),
          restPositions[index * 3 + 1] + hiddenOffset,
          restPositions[index * 3 + 2],
        );
      }
      positions.needsUpdate = true;
      pattern.computeVertexNormals();
      pattern.computeBoundingBox();
      pattern.computeBoundingSphere();
      pattern.userData.mechanicaAnimation.currentStateRad = state;
    };
    pattern.userData.mechanicaMaterial = {
      color,
      metalness: 0.05,
      roughness: 0.45,
      textureVariant: "none",
    };
    pattern.userData.mechanicaUpdate(0);
  };
  ground.userData.mechanicaUpdate(0);
  advanceBand.userData.mechanicaUpdate(0);
  configurePattern(programAPattern, "a", "#d6a844");
  configurePattern(programBPattern, "b", "#86d0ba");
  return [ground, advanceBand, programAPattern, programBPattern];
}

function loomBeater(params: Record<string, number>): THREE.BufferGeometry {
  const { length, width } = params;
  const span = length;
  const geometries: THREE.BufferGeometry[] = [
    new THREE.BoxGeometry(length, width, width).translate(0, 0, -span / 2),
    new THREE.BoxGeometry(length, width, width).translate(0, 0, span / 2),
    new THREE.BoxGeometry(width, width, span).translate(-length / 2, 0, 0),
    new THREE.BoxGeometry(width, width, span).translate(length / 2, 0, 0),
  ];
  for (let index = 1; index < 9; index += 1) {
    geometries.push(
      new THREE.BoxGeometry(
        length * 0.82,
        width * 0.35,
        width * 0.35,
      ).translate(0, 0, -span / 2 + (span * index) / 9),
    );
  }
  const swordLength = length * 0.8;
  for (const z of [-span / 2, span / 2]) {
    geometries.push(
      new THREE.BoxGeometry(swordLength, width * 1.6, width * 1.6).translate(
        -length / 2 - swordLength / 2,
        0,
        z,
      ),
      new THREE.CylinderGeometry(width * 1.5, width * 1.5, width * 2.2, 10)
        .rotateX(Math.PI / 2)
        .translate(-length / 2 - swordLength, 0, z),
    );
  }
  geometries.push(
    new THREE.BoxGeometry(width * 3, width * 2.2, span * 1.08).translate(
      -length * 0.42,
      0,
      0,
    ),
  );
  return merged(geometries);
}

function loomShuttle(params: Record<string, number>): THREE.BufferGeometry[] {
  const { height, length, width } = params;
  const bodyLength = length * 0.72;
  const tipLength = (length - bodyLength) / 2;
  const hull = merged([
    new THREE.BoxGeometry(width * 0.82, height, bodyLength),
    new THREE.BoxGeometry(width, height * 0.42, bodyLength * 0.64),
    new THREE.ConeGeometry(width / 2, tipLength, 12)
      .scale(1, 1, height / width)
      .rotateX(Math.PI / 2)
      .translate(0, 0, -bodyLength / 2 - tipLength / 2),
    new THREE.ConeGeometry(width / 2, tipLength, 12)
      .scale(1, 1, height / width)
      .rotateX(-Math.PI / 2)
      .translate(0, 0, bodyLength / 2 + tipLength / 2),
  ]);
  hull.userData.mechanicaMaterial = {
    color: "#e7a33e",
    emissive: "#4a2204",
    emissiveIntensity: 0.18,
    metalness: 0.04,
    roughness: 0.4,
    textureVariant: "none",
  };
  hull.userData.mechanicaSemantic = {
    kind: "boat-shuttle-hull",
    features: ["pointed-bow", "pointed-stern", "weft-carrier"],
  };

  const bobbin = merged([
    new THREE.CylinderGeometry(
      height * 0.4,
      height * 0.4,
      length * 0.52,
      12,
    ).rotateX(Math.PI / 2),
    ...[-0.18, 0, 0.18].map((offset) =>
      new THREE.TorusGeometry(height * 0.42, height * 0.09, 6, 12).translate(
        0,
        0,
        length * offset,
      ),
    ),
  ]);
  bobbin.userData.mechanicaMaterial = {
    color: "#42e4d1",
    emissive: "#0b5b54",
    emissiveIntensity: 0.42,
    metalness: 0.02,
    roughness: 0.3,
    textureVariant: "none",
  };
  bobbin.userData.mechanicaSemantic = {
    kind: "moving-weft-bobbin",
    features: ["weft-package", "shuttle-motion-witness"],
  };
  return [hull, bobbin];
}

function loomHook(params: Record<string, number>): THREE.BufferGeometry {
  const { length, width } = params;
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-length / 2, 0, 0),
    new THREE.Vector3(-length * 0.08, 0, 0),
    new THREE.Vector3(length * 0.26, 0, 0),
    new THREE.Vector3(length * 0.42, width * 1.25, 0),
    new THREE.Vector3(length * 0.28, width * 2.3, 0),
    new THREE.Vector3(length * 0.08, width * 1.45, 0),
  ]);
  return merged([new THREE.TubeGeometry(path, 24, width * 0.34, 8, false)]);
}

function loomCarriage(params: Record<string, number>): THREE.BufferGeometry {
  const { height, length, width } = params;
  const geometries: THREE.BufferGeometry[] = [
    new THREE.BoxGeometry(length * 0.28, height, width).translate(
      -length * 0.36,
      0,
      0,
    ),
    new THREE.BoxGeometry(length * 0.28, height, width).translate(
      length * 0.36,
      0,
      0,
    ),
  ];
  for (const z of [-0.42, -0.14, 0.14, 0.42]) {
    geometries.push(
      new THREE.BoxGeometry(length, height * 0.55, height * 0.55).translate(
        0,
        0,
        z * width,
      ),
    );
  }
  return merged(geometries);
}

function loomCam(params: Record<string, number>): THREE.BufferGeometry {
  const { length, radius } = params;
  const followerLength = radius * 13;
  return merged([
    new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, length, 12),
    new THREE.CylinderGeometry(
      radius,
      radius * 0.72,
      length * 0.66,
      16,
    ).translate(radius * 0.22, 0, 0),
    new THREE.CylinderGeometry(
      radius * 0.18,
      radius * 0.18,
      followerLength,
      6,
    ).translate(0, followerLength / 2, 0),
    new THREE.SphereGeometry(radius * 0.42, 10, 8).translate(
      0,
      followerLength,
      0,
    ),
  ]);
}

function loomHeddle(params: Record<string, number>): THREE.BufferGeometry {
  const { length, width } = params;
  const eyeRadius = width * 1.7;
  const eyeTube = width * 0.28;
  const rodLength = length / 2 - eyeRadius - eyeTube;
  const rodOffset = eyeRadius + eyeTube + rodLength / 2;
  const geometries: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(eyeRadius, eyeTube, 8, 18).rotateY(Math.PI / 2),
    new THREE.CylinderGeometry(
      width * 0.32,
      width * 0.32,
      rodLength,
      8,
    ).translate(0, rodOffset, 0),
    new THREE.CylinderGeometry(
      width * 0.32,
      width * 0.32,
      rodLength,
      8,
    ).translate(0, -rodOffset, 0),
  ];
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
    const thread = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-params.length / 2, 0.005, z),
        new THREE.Vector3(-params.length * 0.28, params.length * 0.08, z),
        new THREE.Vector3(-params.length * 0.12, params.length * 0.11, z),
        new THREE.Vector3(params.length * 0.02, params.length * 0.07, z * 0.92),
        new THREE.Vector3(params.length * 0.12, params.length * 0.04, z * 0.86),
      ]),
      10,
      params.radius * 1.35,
      5,
      false,
    );
    geometries.push(thread);
  }
  const threads = merged(geometries);
  const restPositions = Float32Array.from(
    threads.getAttribute("position").array as ArrayLike<number>,
  );
  const direction = indexOffset % 2 === 0 ? 1 : -1;
  threads.userData.mechanicaAnimation = {
    currentStateRad: Number.NaN,
  };
  threads.userData.mechanicaUpdate = (state: number) => {
    const normalizedLift = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(state / 0.0007, 0, 1),
      0,
      1,
    );
    const visualLift = 0.025 * normalizedLift;
    const geometryOffset = direction * Math.max(0, visualLift - state);
    const positions = threads.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      positions.setXYZ(
        index,
        restPositions[index * 3],
        restPositions[index * 3 + 1] + geometryOffset,
        restPositions[index * 3 + 2],
      );
    }
    positions.needsUpdate = true;
    threads.computeVertexNormals();
    threads.computeBoundingBox();
    threads.computeBoundingSphere();
    threads.userData.mechanicaAnimation.currentStateRad = state;
  };
  threads.userData.mechanicaUpdate(0);
  threads.userData.mechanicaMaterial = {
    color: indexOffset % 2 === 0 ? "#f1d58a" : "#c95c48",
    emissive: indexOffset % 2 === 0 ? "#2f240b" : "#35100c",
    emissiveIntensity: 0.05,
    metalness: 0,
    opacity: 0.96,
    roughness: 0.58,
    textureVariant: "none",
    transparent: true,
  };
  threads.userData.mechanicaSemantic = {
    kind: "tensioned-warp-layer",
    features: [
      indexOffset % 2 === 0 ? "upper-shed-layer" : "lower-shed-layer",
      "warp-beam-to-heddle",
      "heddle-to-cloth",
    ],
  };
  return threads;
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
    a: index === 0 ? "single-hook" : "selector-cam-0",
    b: `selector-cam-${index}`,
    ratio:
      index === 0 ? PROGRAM_PHASE_PER_HOOK * ratio : ratio / program.ratios[0],
    provenance: {
      kind: "tuice",
      ref: `${program.id} eight-heddle simplification`,
      note: "Stored demonstration order transmitted through the active selector; not an excavated cam ratio.",
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
    (graph.ratioBetween("single-hook", "selector-cam-0") ?? 0) /
      PROGRAM_PHASE_PER_HOOK -
      1,
  ) < 1e-9
    ? PROGRAM_A
    : PROGRAM_B;
}

function currentReconstruction(graph: IKinematicGraph): SchemePatch {
  return Object.hasOwn(graph.state(), "linkage-crank") ? linkage : slidingFrame;
}

function prepareWeavingCycle(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
): void {
  const program = currentProgram(graph);
  graph.setInput("treadle-bank", 0);
  graph.setInput("shuttle", 0);
  graph.setInput("beater", 0);
  graph.setInput("weft-counter", 0);
  graph.setInput("woven-cloth", program === PROGRAM_A ? 0 : 1);
  emit("cycle:ready", "treadle-bank");
}

function swapProgram(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
): HeddleProgram {
  const reconstruction = currentReconstruction(graph);
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
    const program = currentProgram(graph);
    graph.setInput("beater", 0);
    graph.setInput("woven-cloth", program === PROGRAM_A ? 0 : 1);
    emit("cycle:start", "treadle-bank");
    graph.drive("treadle-bank", PROGRAM_STEP);
    emit("treadle:press", "treadle-bank");
    emitLiftedHeddles(graph, emit);
    emit("shed:open", "warp-shed");
    const shuttleTarget = graph.state().shuttle <= 0 ? 0.24 : 0;
    graph.setInput("shuttle", shuttleTarget);
    emit("weft:insert", "shuttle");
    graph.setInput("beater", 0.15);
    emit("beat-up:advance", "beater");
    graph.drive("weft-counter", 1);
    graph.setInput("woven-cloth", program === PROGRAM_A ? 0.18 : 0.82);
    emit("cloth:update", "woven-cloth");
    graph.setInput("beater", 0);
    emit("beat-up:return", "beater");
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
        graph.setScheme(withProgram(currentReconstruction(graph), PROGRAM_A));
        prepareWeavingCycle(graph, emit);
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
        prepareWeavingCycle(graph, emit);
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
        prepareWeavingCycle(graph, emit);
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
  aids: [
    {
      kind: "callouts",
      anchors: [
        {
          partId: "treadle-bank",
          label: { zh: "十二踏板程序输入", en: "Twelve-treadle program input" },
        },
        {
          partId: "selector-carriage",
          label: { zh: "滑框与一勾", en: "Sliding selector and single hook" },
        },
        {
          partId: "warp-shed",
          label: { zh: "开口经纱", en: "Opened warp shed" },
        },
        {
          partId: "shuttle",
          label: { zh: "引纬梭", en: "Weft shuttle" },
        },
        {
          partId: "woven-cloth",
          label: { zh: "成锦输出", en: "Woven output" },
        },
      ],
    },
    {
      kind: "powerPath",
      sequence: [
        "treadle-bank",
        "selector-carriage",
        "single-hook",
        "selector-cam-0",
        "heddle-0",
        "warp-shed",
        "shuttle",
        "beater",
        "woven-cloth",
        "cloth-beam",
      ],
      dwellMs: 520,
    },
    {
      kind: "flowParticles",
      flavor: "thread",
      pathPartIds: [
        "warp-beam",
        "warp-shed",
        "heddle-0",
        "shuttle",
        "beater",
        "woven-cloth",
        "cloth-beam",
      ],
      rate: 52,
    },
    {
      kind: "cutaway",
      partIds: ["loom-frame"],
      label: {
        zh: "淡化机架，显露程序、综片与织造路径",
        en: "Fade the frame to reveal program, heddles, and textile path",
      },
    },
    {
      kind: "subDemo",
      triggerId: "weft-insertion",
      caption: {
        zh: "踏板至卷布轴的一次完整织造循环",
        en: "One complete weaving cycle from treadle to cloth beam",
      },
    },
  ],
  customBuilders: {
    loomBeam,
    loomBeater,
    loomCam,
    loomCarriage,
    loomCloth,
    loomFrame,
    loomHeddle,
    loomHook,
    loomShuttle,
    loomTreadles,
    loomThreads,
  },
};

export default machine;
