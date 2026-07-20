import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import dataDocument from "../../data/machines/astroclock.json";
import type {
  IKinematicGraph,
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
  collisionWhitelist: [
    ...partsDocument.collisionWhitelist,
    ["tower-shell", "chime-tier-1"],
    ["tower-shell", "chime-tier-2"],
    ["tower-shell", "chime-tier-3"],
    ["tower-shell", "chime-tier-4"],
    ["tower-shell", "chime-tier-5"],
    ["shulun", "celestial-column"],
    ["celestial-column", "escapement-linkage"],
    ["hour-drum-wheel", "celestial-transmission-links"],
    ["day-night-wheel", "celestial-transmission-links"],
    ["celestial-globe", "celestial-transmission-links"],
    ["armillary-sphere", "celestial-transmission-links"],
    ["guanshe", "escapement-linkage"],
    ["tiansuo-l", "escapement-linkage"],
    ["tiansuo-r", "escapement-linkage"],
    ["tier-placard-2", "reporting-drive-links"],
    ["tier-placard-5", "reporting-drive-links"],
    ["escapement-linkage", "celestial-transmission-links"],
    ["escapement-linkage", "reporting-drive-links"],
  ],
} as unknown as MachineSpec;

const fixedScoop = fixedScoopDocument as unknown as SchemePatch;
const combridgeHinged = combridgeHingedDocument as unknown as SchemePatch;
const stepRad = (Math.PI * 2) / 36;
const escapementSwingRad = 0.35;
const scoopPreloadRad = stepRad / 10;
const verticalHandoffRad = stepRad * 0.55;
const reportingJackPoses: ReadonlyArray<readonly [string, number]> = [
  ["jack-01", 1],
  ["jack-02", -1],
  ["jack-03", 1],
  ["jack-04", -1],
  ["jack-05", 1],
  ["jack-06", -1],
  ["jack-07", 1],
  ["jack-08", 0.75],
  ["jack-09", -1],
  ["jack-10", 1],
  ["jack-11", -1],
];

function emitWaterCircuit(emit: (type: string, part: string) => void): void {
  emit("caption:reservoir", "water-reservoir");
  emit("caption:constant-head", "constant-level-tank");
  emit("caption:return", "water-lift-wheel");
}

function runEscapementBeat(
  graph: IKinematicGraph,
  emit: (type: string, part: string) => void,
  highlightFork: boolean,
): void {
  const startRad = graph.state().shulun;

  graph.setInput("water-flow-indicator", 0);
  graph.setInput("loaded-scoop-indicator", 0);
  graph.setInput("escapement-linkage", 0);
  graph.setInput("celestial-transmission-links", 0);
  graph.setInput("reporting-drive-links", 0);
  for (const [jackId] of reportingJackPoses) graph.setInput(jackId, 0);
  emit("phase:start", "water-flow-indicator");

  graph.setInput("water-flow-indicator", 3);
  emit("phase:water-arrival", "water-flow-indicator");

  graph.setInput("shulun", startRad + scoopPreloadRad);
  graph.setInput("scoop-01", escapementSwingRad);
  graph.setInput("water-flow-indicator", 0);
  graph.setInput("loaded-scoop-indicator", 0.08);
  graph.setInput("escapement-linkage", -0.45);
  emit("phase:scoop-loaded", "loaded-scoop-indicator");
  emit("caption:fill", "scoop-01");
  emitWaterCircuit(emit);

  if (highlightFork) emit("highlight", "gecha");
  graph.setInput("gecha", -escapementSwingRad);
  graph.setInput("tianguan", -escapementSwingRad);
  graph.setInput("escapement-linkage", -1);
  emit("phase:escapement-yield", "gecha");
  emit("caption:yield", "gecha");

  graph.setInput("guanshe", escapementSwingRad);
  graph.setInput("tianguan", escapementSwingRad);
  graph.setInput("tiansuo-l", escapementSwingRad);
  graph.setInput("tiansuo-r", -escapementSwingRad);
  graph.setInput("escapement-linkage", 1);
  emit("phase:escapement-release", "guanshe");
  emit("caption:open", "guanshe");

  graph.setInput("escapement-linkage", 0);
  graph.setInput("shulun", startRad + verticalHandoffRad);
  graph.setInput("scoop-01", -escapementSwingRad);
  graph.setInput("celestial-transmission-links", 1);
  emit("phase:vertical-transmission", "celestial-column");

  graph.setInput("shulun", startRad + stepRad);
  graph.setInput("celestial-transmission-links", 0);
  emit("phase:celestial-output", "armillary-sphere");

  graph.setInput("reporting-drive-links", 1);
  for (const [jackId, pose] of reportingJackPoses) {
    graph.setInput(jackId, pose);
  }
  emit("phase:reporting-output", "tier-placard-1");
  emit("caption:advance", "shulun");

  graph.setInput("water-flow-indicator", 0);
  graph.setInput("loaded-scoop-indicator", 0);
  graph.setInput("scoop-01", 0);
  graph.setInput("gecha", 0);
  graph.setInput("guanshe", 0);
  graph.setInput("tianguan", 0);
  graph.setInput("tiansuo-l", -escapementSwingRad);
  graph.setInput("tiansuo-r", escapementSwingRad);
  emit("caption:relock", "tiansuo-r");
  emit("phase:end", "tiansuo-r");
}

function mergedGeometry(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Unable to merge astroclock display geometry");
  return geometry;
}

function installGeometryAnimation(
  geometry: THREE.BufferGeometry,
  pose: (point: THREE.Vector3, stateRad: number) => void,
  applyAtZero = false,
): void {
  const position = geometry.getAttribute("position");
  const restPositions = Float32Array.from(
    position.array as ArrayLike<number>,
  );
  const point = new THREE.Vector3();
  geometry.userData.mechanicaAnimation = {
    currentStateRad: Number.NaN,
  };
  geometry.userData.mechanicaUpdate = (stateRad: number) => {
    for (let index = 0; index < position.count; index += 1) {
      point.set(
        restPositions[index * 3],
        restPositions[index * 3 + 1],
        restPositions[index * 3 + 2],
      );
      if (stateRad !== 0 || applyAtZero) pose(point, stateRad);
      position.setXYZ(index, point.x, point.y, point.z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.mechanicaAnimation.currentStateRad = stateRad;
  };
}

function installPivotAnimation(
  geometry: THREE.BufferGeometry,
  axis: "y" | "z",
  pivot: [number, number, number],
  radiansPerState: number,
): void {
  const pivotPoint = new THREE.Vector3(...pivot);
  const rotationAxis =
    axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  installGeometryAnimation(geometry, (point, stateRad) => {
    point
      .sub(pivotPoint)
      .applyAxisAngle(rotationAxis, stateRad * radiansPerState)
      .add(pivotPoint);
  });
}

function translatedBox(
  size: [number, number, number],
  position: [number, number, number],
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.translate(...position);
  return geometry;
}

function rotatedBox(
  size: [number, number, number],
  position: [number, number, number],
  rotation: [number, number, number],
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.rotateX(rotation[0]);
  geometry.rotateY(rotation[1]);
  geometry.rotateZ(rotation[2]);
  geometry.translate(...position);
  return geometry;
}

function translatedCylinder(
  radius: number,
  length: number,
  position: [number, number, number],
): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
  geometry.translate(...position);
  return geometry;
}

function cylinderBetween(
  radius: number,
  start: [number, number, number],
  end: [number, number, number],
): THREE.BufferGeometry {
  const startPoint = new THREE.Vector3(...start);
  const endPoint = new THREE.Vector3(...end);
  const direction = endPoint.clone().sub(startPoint);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    direction.length(),
    12,
  );
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    ),
  );
  const midpoint = startPoint.add(endPoint).multiplyScalar(0.5);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}

function wheelSpoke(
  length: number,
  width: number,
  depth: number,
  angle: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(length, width, depth);
  geometry.translate(length / 2, 0, 0);
  geometry.rotateY(angle);
  return geometry;
}

function towerCutaway(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const top = params.topHalfWidth;
  const bottom = params.bottomHalfWidth;
  const height = params.height;
  const halfHeight = height / 2;
  const storeyCount = 5;
  const storeyHeight = height / (storeyCount + 1);
  const halfWidthAt = (y: number) =>
    bottom + ((top - bottom) * (y + halfHeight)) / height;
  const posts: THREE.BufferGeometry[] = [];
  const eaves: THREE.BufferGeometry[] = [];
  const roof: THREE.BufferGeometry[] = [];
  const panels: THREE.BufferGeometry[] = [];
  const postWidth = 0.16;

  for (let storey = 0; storey <= storeyCount; storey += 1) {
    const y = -halfHeight + storeyHeight * (storey + 0.5);
    const width = halfWidthAt(y) - postWidth;
    for (const x of [-width, width]) {
      for (const z of [-width, width]) {
        posts.push(
          translatedBox(
            [postWidth, storeyHeight * 0.94, postWidth],
            [x, y, z],
          ),
        );
      }
    }

    const eaveY = Math.min(halfHeight - 0.1, y + storeyHeight / 2);
    const eaveHalfWidth = Math.min(bottom - 0.14, halfWidthAt(eaveY) + 0.2);
    const beamLength = eaveHalfWidth * 2;
    eaves.push(
      translatedBox(
        [beamLength, 0.14, 0.24],
        [0, eaveY, -eaveHalfWidth],
      ),
      translatedBox(
        [beamLength, 0.14, 0.24],
        [0, eaveY, eaveHalfWidth],
      ),
      translatedBox(
        [0.24, 0.14, beamLength],
        [-eaveHalfWidth, eaveY, 0],
      ),
      translatedBox(
        [0.24, 0.14, beamLength],
        [eaveHalfWidth, eaveY, 0],
      ),
      rotatedBox(
        [beamLength, 0.1, 0.46],
        [0, eaveY + 0.08, -eaveHalfWidth + 0.18],
        [-0.2, 0, 0],
      ),
      rotatedBox(
        [0.46, 0.1, beamLength],
        [-eaveHalfWidth + 0.18, eaveY + 0.08, 0],
        [0, 0, -0.2],
      ),
      rotatedBox(
        [0.46, 0.1, beamLength],
        [eaveHalfWidth - 0.18, eaveY + 0.08, 0],
        [0, 0, 0.2],
      ),
    );

    const panelWidth = Math.max(0.4, width * 2 - postWidth * 2);
    panels.push(
      translatedBox(
        [panelWidth, storeyHeight * 0.78, 0.06],
        [0, y, -width],
      ),
    );
  }

  const armillaryPlatformY = halfHeight - storeyHeight * 1.41;
  eaves.push(
    translatedBox([2.2, 0.18, 0.35], [0, armillaryPlatformY, 0]),
    translatedBox([0.35, 0.18, 2.2], [0, armillaryPlatformY, 0]),
  );

  roof.push(
    rotatedBox([5.55, 0.12, 1.7], [0, 6.25, -1.9], [-0.38, 0, 0]),
    rotatedBox([5.55, 0.12, 1.7], [0, 6.25, 1.9], [0.38, 0, 0]),
    rotatedBox([1.7, 0.12, 5.55], [-1.9, 6.25, 0], [0, 0, 0.38]),
    rotatedBox([1.7, 0.12, 5.55], [1.9, 6.25, 0], [0, 0, -0.38]),
    translatedBox([1.5, 0.16, 1.5], [0, 6.57, 0]),
  );

  const architecture = mergedGeometry([...posts, ...eaves, ...roof]);
  architecture.userData.mechanicaSemantic =
    "subordinate-open-timber-pavilion-with-hipped-roof";
  architecture.userData.mechanicaSemanticLayers = [
    "open-timber-frame",
    "stacked-storey-eaves",
    "hipped-pavilion-roof",
  ];
  architecture.userData.mechanicaMaterial = {
    color: "#654534",
    metalness: 0.03,
    roughness: 0.78,
  };
  const rearCurtain = mergedGeometry(panels);
  rearCurtain.userData.mechanicaSemantic = "faded-rear-cutaway-panels";
  rearCurtain.userData.mechanicaSemanticLayers = ["open-south-cutaway"];
  rearCurtain.userData.mechanicaMaterial = {
    color: "#51382d",
    depthWrite: false,
    metalness: 0.01,
    opacity: 0.12,
    roughness: 0.9,
    transparent: true,
  };
  return [architecture, rearCurtain];
}

function waterCircuitLinks(): THREE.BufferGeometry[] {
  const pipes = [
    cylinderBetween(0.075, [-2.25, -3.56, -1.55], [-2.25, 2.98, -1.55]),
    cylinderBetween(0.075, [-2.25, 2.98, -1.55], [-2.25, 3.0, -0.55]),
    cylinderBetween(0.065, [-2.25, 3.0, -0.55], [-1.65, 2.68, -0.45]),
    cylinderBetween(0.065, [-1.65, 2.02, -0.45], [-2.18, -1.12, 0.12]),
    cylinderBetween(0.065, [-2.18, -1.12, 0.12], [-2.2, -1.4, 0.25]),
    cylinderBetween(0.075, [-2.25, -4.82, 0.35], [-2.25, -4.79, 0.35]),
    cylinderBetween(0.075, [-2.96, -3.6, 0.35], [-2.25, -3.56, -1.55]),
  ];
  const conduit = mergedGeometry(pipes);
  conduit.userData.mechanicaSemantic =
    "continuous-reservoir-tank-scoop-wheel-water-path";
  conduit.userData.mechanicaMaterial = {
    color: "#3f9fb5",
    metalness: 0.16,
    roughness: 0.22,
  };

  const beadPositions: Array<[number, number, number]> = [
    [-1.95, 2.84, -0.5],
    [-1.75, 1.62, -0.28],
    [-1.93, 0.3, -0.04],
    [-2.11, -0.92, 0.16],
    [-2.2, -1.32, 0.24],
  ];
  const beads = beadPositions.map((position) => {
    const bead = new THREE.SphereGeometry(0.075, 10, 8);
    bead.translate(...position);
    return bead;
  });
  const visibleFlow = mergedGeometry(beads);
  visibleFlow.userData.mechanicaSemantic = "water-arrival-flow-markers";
  visibleFlow.userData.mechanicaMaterial = {
    color: "#8ad8e7",
    emissive: "#19566a",
    emissiveIntensity: 0.32,
    metalness: 0.04,
    roughness: 0.18,
  };
  return [conduit, visibleFlow];
}

function escapementLinks(): THREE.BufferGeometry[] {
  const supports: THREE.BufferGeometry[] = [];
  for (const x of [-1.95, 1.95]) {
    supports.push(
      translatedBox(
        [0.16, x < 0 ? 3.33 : 3.9, 0.2],
        [x, x < 0 ? -1.065 : -1.35, 0.35],
      ),
      translatedBox([0.34, 0.34, 0.48], [x, -1.5, 0.35]),
    );
  }
  supports.push(
    translatedBox([4.1, 0.16, 0.2], [0, -2.65, 0.35]),
    cylinderBetween(0.055, [-1.95, -2.65, 0.35], [-1.55, -0.25, 0.65]),
    cylinderBetween(0.055, [1.95, -2.65, 0.35], [1.55, -0.25, 0.65]),
  );
  const frame = mergedGeometry(supports);
  frame.userData.mechanicaSemantic = "open-escapement-bearing-cradle";
  frame.userData.mechanicaMaterial = {
    color: "#53636a",
    metalness: 0.76,
    roughness: 0.28,
  };

  const z = 1.62;
  const rods = mergedGeometry([
    cylinderBetween(0.06, [1.84, -1.5, 0.32], [1.48, -2.5, 1.9]),
    cylinderBetween(0.06, [1.48, -2.5, 1.9], [-1.34, -2.5, 1.9]),
    cylinderBetween(0.06, [-1.34, -2.5, 1.9], [-1.05, -2, 1.48]),
    cylinderBetween(0.055, [-1.05, -2, 1.48], [0, -1.9, z]),
    cylinderBetween(0.055, [0, -1.9, z], [1.05, -2, 1.48]),
    cylinderBetween(0.05, [-1.05, -2, 1.48], [-0.58, -1.15, 1.5]),
    cylinderBetween(0.05, [1.05, -2, 1.48], [0.58, -1.15, 1.5]),
    translatedBox([0.2, 0.34, 0.1], [1.84, -1.5, 0.32]),
  ]);
  rods.userData.mechanicaSemantic =
    "scoop-gecha-guanshe-tianguan-tiansuo-handoff-rods";
  rods.userData.mechanicaHandoffAnchors = [
    "scoop-01",
    "gecha",
    "guanshe",
    "tianguan",
    "tiansuo-l",
    "tiansuo-r",
  ];
  rods.userData.mechanicaMaterial = {
    color: "#9ec7c9",
    emissive: "#163e45",
    emissiveIntensity: 0.36,
    metalness: 0.66,
    roughness: 0.18,
  };

  const pivotPositions: Array<[number, number, number]> = [
    [-1.05, -2, 1.48],
    [0, -1.9, z],
    [1.05, -2, 1.48],
    [-0.58, -1.15, 1.5],
    [0.58, -1.15, 1.5],
  ];
  const pivots = pivotPositions.map((position) => {
    const pivot = new THREE.TorusGeometry(0.12, 0.025, 8, 20);
    pivot.translate(...position);
    return pivot;
  });
  const handoffPivots = mergedGeometry(pivots);
  handoffPivots.userData.mechanicaSemantic = "five-stage-escapement-pivots";
  handoffPivots.userData.mechanicaMaterial = {
    color: "#d0a34b",
    metalness: 0.7,
    roughness: 0.22,
  };
  const spineHandoff = mergedGeometry([
    cylinderBetween(0.065, [-0.58, -1.15, 1.5], [0, -0.72, 1.76]),
    cylinderBetween(0.065, [0, -0.72, 1.76], [1.46, -1.15, 0.34]),
    cylinderBetween(0.065, [0.58, -1.15, 1.5], [0.86, -0.72, 1.76]),
    cylinderBetween(0.065, [0.86, -0.72, 1.76], [1.46, -1.15, 0.34]),
  ]);
  spineHandoff.userData.mechanicaSemantic =
    "tiansuo-to-celestial-column-rising-link";
  spineHandoff.userData.mechanicaHandoffAnchors = [
    "tiansuo-l",
    "tiansuo-r",
    "celestial-column",
  ];
  spineHandoff.userData.mechanicaMaterial = {
    color: "#70d5df",
    emissive: "#123f48",
    emissiveIntensity: 0.58,
    metalness: 0.58,
    roughness: 0.2,
  };
  const spineAnchor = new THREE.Vector3(1.46, -1.15, 0.34);
  installGeometryAnimation(spineHandoff, (point, stateRad) => {
    const influence = Math.min(1, point.distanceTo(spineAnchor) / 2.8);
    point.y += influence * stateRad * 0.5;
  });
  return [frame, rods, handoffPivots, spineHandoff];
}

function celestialTransmissionLinks(): THREE.BufferGeometry[] {
  const takeoffs = mergedGeometry([
    cylinderBetween(0.065, [0.15, -1.15, 0.72], [1.44, -1.15, 0.34]),
    cylinderBetween(0.06, [1.43, 0.55, 0.3], [1.39, 0.55, 0.3]),
    cylinderBetween(0.055, [-0.68, 0.7, 0.55], [-0.42, 0.7, 0.55]),
    cylinderBetween(0.055, [1.55, 2.15, 0.37], [1.55, 2.15, 0.51]),
    cylinderBetween(0.055, [1.55, 3.6, 0.55], [1.55, 3.72, 0.92]),
    cylinderBetween(0.06, [1.55, 3.72, 0.92], [0.48, 4.4, 0.92]),
    cylinderBetween(0.06, [0.48, 4.4, 0.92], [0.42, 4.4, 0.3]),
  ]);
  takeoffs.userData.mechanicaSemantic =
    "shulun-column-hour-day-ladder-armillary-handoffs";
  takeoffs.userData.mechanicaHandoffAnchors = [
    "shulun",
    "celestial-column",
    "hour-drum-wheel",
    "day-night-wheel",
    "celestial-ladder-lower",
    "celestial-globe",
    "armillary-sphere",
  ];
  takeoffs.userData.mechanicaMaterial = {
    color: "#d1a853",
    emissive: "#49340f",
    emissiveIntensity: 0.28,
    metalness: 0.7,
    roughness: 0.2,
  };

  const chain: THREE.BufferGeometry[] = [];
  for (const x of [1.35, 1.75]) {
    chain.push(translatedBox([0.05, 1.18, 0.05], [x, 2.7, 0.76]));
  }
  for (let link = 0; link <= 8; link += 1) {
    chain.push(
      translatedBox(
        [0.46, 0.032, 0.032],
        [1.55, 2.15 + link * 0.1375, 0.76],
      ),
    );
  }
  const ladder = mergedGeometry(chain);
  ladder.userData.mechanicaSemantic = "visible-celestial-ladder-chain";
  ladder.userData.mechanicaMaterial = {
    color: "#4f8fa4",
    metalness: 0.48,
    roughness: 0.24,
  };
  installGeometryAnimation(ladder, (point, stateRad) => {
    point.y += stateRad * 0.62;
  });
  const verticalWitness = mergedGeometry([
    translatedBox([0.28, 0.72, 0.16], [1.72, 2.42, 0.92]),
    new THREE.ConeGeometry(0.2, 0.34, 12).translate(1.72, 2.95, 0.92),
  ]);
  verticalWitness.userData.mechanicaSemantic =
    "amplified-vertical-transmission-witness";
  verticalWitness.userData.mechanicaMaterial = {
    color: "#5ee4ff",
    emissive: "#0b6479",
    emissiveIntensity: 0.72,
    metalness: 0.28,
    roughness: 0.18,
  };
  installGeometryAnimation(verticalWitness, (point, stateRad) => {
    point.y += stateRad * 1.2;
  });
  const upperOutputWitness = mergedGeometry([
    translatedBox([0.4, 0.14, 0.16], [1.38, 3.68, 1.04]),
    new THREE.SphereGeometry(0.13, 12, 8).translate(1.18, 3.83, 1.04),
  ]);
  upperOutputWitness.userData.mechanicaSemantic =
    "column-to-armillary-output-witness";
  upperOutputWitness.userData.mechanicaMaterial = {
    color: "#72e4ee",
    emissive: "#145767",
    emissiveIntensity: 0.7,
    metalness: 0.34,
    roughness: 0.16,
  };
  installGeometryAnimation(upperOutputWitness, (point, stateRad) => {
    point.x -= stateRad * 0.88;
    point.y += stateRad * 0.62;
  });
  return [takeoffs, ladder, verticalWitness, upperOutputWitness];
}

function reportingDriveLinks(): THREE.BufferGeometry[] {
  const shaftParts = [
    translatedCylinder(0.065, 8.15, [-2.14, -0.65, 2.38]),
    cylinderBetween(0.085, [1.55, -1.15, 0.37], [1.55, -1.15, 1.15]),
    cylinderBetween(0.085, [1.55, -1.15, 1.15], [0.2, -1.15, 1.15]),
    cylinderBetween(0.075, [0.2, -1.15, 1.15], [0.72, -1.9, 1.15]),
    cylinderBetween(0.075, [0.72, -1.9, 1.15], [-2.14, -3.95, 2.38]),
  ];
  const outputParts: THREE.BufferGeometry[] = [];
  const camHeights = [-4.7, -2.7, -0.7, 1.3, 3.3];
  const camDepths = [3.65, 3.48, 3.3, 3.12, 2.94];
  for (let tier = 0; tier < camHeights.length; tier += 1) {
    const height = camHeights[tier];
    const depth = camDepths[tier];
    const collar = new THREE.TorusGeometry(0.13, 0.035, 8, 20);
    collar.rotateX(Math.PI / 2);
    collar.translate(-2.14, height, 2.38);
    shaftParts.push(
      collar,
      cylinderBetween(
        0.045,
        [-2.14, height, 2.38],
        [-1.72, height, depth - 0.34],
      ),
    );
    outputParts.push(
      cylinderBetween(
        0.052,
        [-1.38, height, depth - 0.34],
        [0, height, depth - 0.34],
      ),
      cylinderBetween(
        0.052,
        [0, height, depth - 0.34],
        [1.16, height, depth - 0.34],
      ),
      cylinderBetween(
        0.052,
        [1.16, height, depth - 0.34],
        [1.25, height, depth - 0.14],
      ),
    );
    const outputHead = new THREE.SphereGeometry(0.1, 12, 8);
    outputHead.translate(1.25, height, depth - 0.14);
    outputParts.push(outputHead);
  }
  const camshaft = mergedGeometry(shaftParts);
  camshaft.userData.mechanicaSemantic =
    "vertical-spine-to-five-tier-reporting-camshaft";
  camshaft.userData.mechanicaHandoffAnchors = [
    "celestial-column",
    "tier-cam-1",
    "tier-cam-2",
    "tier-cam-3",
    "tier-cam-4",
    "tier-cam-5",
  ];
  camshaft.userData.mechanicaMaterial = {
    color: "#78a9b2",
    emissive: "#183f47",
    emissiveIntensity: 0.34,
    metalness: 0.66,
    roughness: 0.2,
  };
  const outputs = mergedGeometry(outputParts);
  outputs.userData.mechanicaSemantic = "cam-to-jack-and-placard-output-rods";
  outputs.userData.mechanicaMaterial = {
    color: "#66d3df",
    emissive: "#104e58",
    emissiveIntensity: 0.48,
    metalness: 0.5,
    roughness: 0.2,
  };
  installGeometryAnimation(outputs, (point, stateRad) => {
    const progress = Math.min(1, Math.max(0, (point.x + 1.38) / 2.63));
    const influence = Math.sin(progress * Math.PI);
    point.y += stateRad * influence * 0.18;
    point.z += stateRad * influence * 0.45;
  });
  const handoffWitness = mergedGeometry([
    new THREE.SphereGeometry(0.13, 12, 8).translate(1.12, -1.15, 1.15),
    translatedBox([0.42, 0.14, 0.14], [0.82, -1.15, 1.15]),
  ]);
  handoffWitness.userData.mechanicaSemantic =
    "amplified-reporting-handoff-witness";
  handoffWitness.userData.mechanicaMaterial = {
    color: "#73e2eb",
    emissive: "#155462",
    emissiveIntensity: 0.72,
    metalness: 0.36,
    roughness: 0.16,
  };
  installGeometryAnimation(handoffWitness, (point, stateRad) => {
    point.x -= stateRad * 0.82;
    point.z += stateRad * 0.36;
  });
  return [camshaft, outputs, handoffWitness];
}

function reportingCam(params: Record<string, number>): THREE.BufferGeometry[] {
  const radius = params.radius;
  const width = params.width;
  const tier = Math.round(params.tier);
  const disc = new THREE.CylinderGeometry(
    radius * 0.72,
    radius * 0.72,
    width,
    24,
  );
  const lobe = new THREE.SphereGeometry(radius * 0.3, 12, 8);
  lobe.scale(1, 0.6, 1);
  lobe.translate(radius * 0.62, 0, 0);
  const cam = mergedGeometry([disc, lobe]);
  cam.userData.mechanicaSemantic = `tier-${tier}-eccentric-reporting-cam`;
  cam.userData.mechanicaMaterial = {
    color: "#b8863b",
    metalness: 0.72,
    roughness: 0.24,
  };

  const pin = translatedBox(
    [radius * 0.4, width * 0.7, width * 0.7],
    [radius * 0.55, 0, 0],
  );
  pin.userData.mechanicaSemantic = "visible-reporting-cam-phase-pin";
  pin.userData.mechanicaMaterial = {
    color: "#e2bd67",
    metalness: 0.66,
    roughness: 0.2,
  };
  return [cam, pin];
}

function waterIndicator(params: Record<string, number>): THREE.BufferGeometry {
  const radius = params.radius;
  const kind = Math.round(params.kind);
  let geometry: THREE.BufferGeometry;
  if (kind === 0) {
    const upperDrop = new THREE.SphereGeometry(radius * 1.35, 12, 8);
    upperDrop.translate(0, 1.72, 0.96);
    const middleDrop = new THREE.SphereGeometry(radius * 1.2, 12, 8);
    middleDrop.translate(1.55, 0.17, 0.66);
    const lowerDrop = new THREE.SphereGeometry(radius * 1.4, 12, 8);
    lowerDrop.translate(3.34, -0.3, 0.31);
    geometry = mergedGeometry([
      cylinderBetween(radius * 1.1, [0, 3, 0.42], [0, 2.7, 0.96]),
      cylinderBetween(radius * 1.2, [0, 2.7, 0.96], [0, 0.58, 0.96]),
      cylinderBetween(
        radius * 1.1,
        [0, 0.58, 0.96],
        [3.5, -0.35, 0.28],
      ),
      upperDrop,
      middleDrop,
      lowerDrop,
    ]);
    const outlet = new THREE.Vector3(0, 0, 0.42);
    installGeometryAnimation(
      geometry,
      (point, stateRad) => {
        const progress =
          0.06 + 0.94 * Math.min(1, Math.max(0, stateRad / 3));
        point.sub(outlet).multiplyScalar(progress).add(outlet);
      },
      true,
    );
    geometry.userData.mechanicaUpdate(0);
  } else {
    const surface = new THREE.SphereGeometry(radius, 16, 10);
    surface.scale(1.52, 0.65, 0.7);
    geometry = mergedGeometry([
      translatedBox(
        [radius * 3.18, radius * 1.3, radius],
        [0, -radius * 0.04, 0],
      ),
      surface,
    ]);
    const bottom = -radius * 0.58;
    const pivot = new THREE.Vector3(0, bottom, 0);
    const axis = new THREE.Vector3(1, 0, 0);
    installGeometryAnimation(
      geometry,
      (point, stateRad) => {
        const fill = 0.1 + 0.9 * Math.min(1, Math.max(0, stateRad / 0.08));
        const footprint = 0.04 + fill * 0.96;
        point.x *= footprint;
        point.z *= footprint;
        point.y = bottom + (point.y - bottom) * fill;
        point
          .sub(pivot)
          .applyAxisAngle(axis, stateRad * -4.375)
          .add(pivot);
      },
      true,
    );
    geometry.userData.mechanicaUpdate(0);
  }
  geometry.userData.mechanicaSemantic =
    kind === 0 ? "descending-water-pulse" : "loaded-scoop-water";
  geometry.userData.mechanicaMaterialRole = "working-fluid";
  geometry.userData.mechanicaMaterial = {
    color: "#5ee4ff",
    depthWrite: true,
    emissive: "#0f95b8",
    emissiveIntensity: 1.3,
    metalness: 0,
    opacity: 1,
    roughness: 0.08,
    textureVariant: "none",
    transparent: false,
  };
  return geometry;
}

function jackBay(params: Record<string, number>): THREE.BufferGeometry[] {
  const width = params.width;
  const depth = params.depth;
  const height = params.height;
  const tier = Math.round(params.tier);
  const postInset = width * 0.42;
  const deck = translatedBox([width, 0.1, depth], [0, 0, 0]);
  deck.userData.mechanicaSemantic = "jack-bay-deck";
  deck.userData.mechanicaMaterial = {
    color: "#9b5932",
    metalness: 0.02,
    roughness: 0.68,
  };
  const canopyParts = [
    translatedBox([width + 0.28, 0.08, depth + 0.22], [0, height, 0]),
    translatedBox(
      [0.07, height * 0.82, 0.07],
      [-postInset, height * 0.52, -depth * 0.29],
    ),
    translatedBox(
      [0.07, height * 0.82, 0.07],
      [postInset, height * 0.52, -depth * 0.29],
    ),
    translatedBox(
      [0.07, height * 0.82, 0.07],
      [-postInset, height * 0.52, depth * 0.32],
    ),
    translatedBox(
      [0.07, height * 0.82, 0.07],
      [postInset, height * 0.52, depth * 0.32],
    ),
    translatedBox(
      [width * 0.88, 0.055, 0.055],
      [0, height * 0.34, depth * 0.38],
    ),
  ];
  const canopy = mergedGeometry(canopyParts);
  canopy.userData.mechanicaSemantic = "jack-bay-eave";
  canopy.userData.mechanicaMaterial = {
    color: "#c17a3e",
    metalness: 0.02,
    roughness: 0.56,
  };

  const instrumentParts: THREE.BufferGeometry[] = [];
  if (tier === 1) {
    const bell = new THREE.CylinderGeometry(0.1, 0.22, 0.38, 16, 1, true);
    bell.translate(0, height * 0.58, 0.02);
    instrumentParts.push(
      bell,
      translatedCylinder(0.035, 0.2, [0, height * 0.34, 0.02]),
    );
  } else if (tier === 2) {
    const drum = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 18);
    drum.rotateX(Math.PI / 2);
    drum.translate(0, height * 0.54, 0.04);
    const rim = new THREE.TorusGeometry(0.2, 0.025, 8, 24);
    rim.translate(0, height * 0.54, depth * 0.19);
    instrumentParts.push(drum, rim);
  } else if (tier === 3) {
    const gong = new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20);
    gong.rotateX(Math.PI / 2);
    gong.translate(0, height * 0.55, 0.08);
    const rim = new THREE.TorusGeometry(0.22, 0.025, 8, 24);
    rim.translate(0, height * 0.55, depth * 0.14);
    instrumentParts.push(gong, rim);
  } else if (tier === 4) {
    instrumentParts.push(
      translatedBox([0.78, 0.055, 0.055], [0, height * 0.78, 0]),
    );
    for (let chime = 0; chime < 5; chime += 1) {
      instrumentParts.push(
        translatedBox(
          [0.055, 0.2 + chime * 0.035, 0.055],
          [-0.28 + chime * 0.14, height * 0.54, 0],
        ),
      );
    }
  } else {
    instrumentParts.push(
      translatedBox([0.62, 0.42, 0.055], [0, height * 0.56, 0]),
      translatedBox([0.055, 0.32, 0.055], [0, height * 0.25, 0]),
    );
  }
  const instrument = mergedGeometry(instrumentParts);
  instrument.userData.mechanicaSemantic = [
    "bell-reporting-station",
    "drum-reporting-station",
    "gong-reporting-station",
    "chime-reporting-station",
    "placard-reporting-station",
  ][tier - 1];
  instrument.userData.mechanicaMaterial = {
    color: tier === 5 ? "#ead4a0" : "#d3a13f",
    metalness: tier === 5 ? 0.06 : 0.58,
    roughness: tier === 5 ? 0.48 : 0.24,
  };
  return [deck, canopy, instrument];
}

function jackFigure(params: Record<string, number>): THREE.BufferGeometry[] {
  const height = params.height;
  const shoulderWidth = params.shoulderWidth;
  const depth = params.depth;
  const headRadius = height * 0.145;
  const torsoHeight = height * 0.4;
  const torsoWidth = shoulderWidth * 0.46;
  const armLength = shoulderWidth * 0.52;
  const limbThickness = height * 0.085;
  const parts: THREE.BufferGeometry[] = [];
  const head = new THREE.SphereGeometry(headRadius, 12, 8);
  head.translate(0, height * 0.37, 0);
  parts.push(
    head,
    translatedCylinder(headRadius * 1.12, limbThickness * 0.24, [
      0,
      height * 0.5,
      0,
    ]),
    translatedBox(
      [torsoWidth, torsoHeight, depth * 0.62],
      [0, height * 0.08, 0],
    ),
  );
  for (const side of [-1, 1]) {
    const arm = translatedBox(
      [armLength, limbThickness, depth * 0.34],
      [side * shoulderWidth * 0.31, height * 0.1, 0],
    );
    arm.rotateZ(side * -0.34);
    parts.push(arm);
    parts.push(
      translatedBox(
        [limbThickness, height * 0.28, depth * 0.38],
        [side * torsoWidth * 0.28, -height * 0.27, 0],
      ),
    );
  }
  const robe = new THREE.CylinderGeometry(
    torsoWidth * 0.48,
    torsoWidth * 0.72,
    height * 0.34,
    8,
  );
  robe.translate(0, -height * 0.2, 0);
  parts.push(
    robe,
    translatedBox(
      [limbThickness * 0.9, limbThickness * 0.65, depth * 0.54],
      [-torsoWidth * 0.24, -height * 0.43, depth * 0.08],
    ),
    translatedBox(
      [limbThickness * 0.9, limbThickness * 0.65, depth * 0.54],
      [torsoWidth * 0.24, -height * 0.43, depth * 0.08],
    ),
  );
  const figure = mergedGeometry(parts);
  figure.userData.mechanicaSemantic = "human-reporting-jack-silhouette";
  figure.userData.mechanicaMaterial = {
    color: "#e8b16a",
    metalness: 0.06,
    roughness: 0.46,
  };
  installPivotAnimation(
    figure,
    "z",
    [0, -height * 0.43, 0],
    0.34,
  );

  const malletEnd: [number, number, number] = [
    shoulderWidth * 0.62,
    height * 0.24,
    depth * 0.12,
  ];
  const malletHead = new THREE.CylinderGeometry(
    height * 0.072,
    height * 0.072,
    shoulderWidth * 0.36,
    10,
  );
  malletHead.rotateZ(Math.PI / 2);
  malletHead.translate(...malletEnd);
  const implement = mergedGeometry([
    cylinderBetween(
      height * 0.032,
      [torsoWidth * 0.18, height * 0.14, depth * 0.12],
      malletEnd,
    ),
    malletHead,
  ]);
  implement.userData.mechanicaSemantic = "mounted-reporting-jack-mallet";
  implement.userData.mechanicaMaterial = {
    color: "#c9f0ec",
    emissive: "#164d50",
    emissiveIntensity: 0.38,
    metalness: 0.42,
    roughness: 0.2,
  };
  installPivotAnimation(
    implement,
    "z",
    [torsoWidth * 0.18, height * 0.14, depth * 0.12],
    -1.45,
  );
  return [figure, implement];
}

function armillary(params: Record<string, number>): THREE.BufferGeometry[] {
  const radius = params.radius;
  const tube = params.tube;
  const rings: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(radius, tube, 8, 48),
    new THREE.TorusGeometry(radius * 0.96, tube, 8, 48),
    new THREE.TorusGeometry(radius * 0.8, tube * 0.9, 8, 48),
    new THREE.TorusGeometry(radius * 0.62, tube * 0.85, 8, 48),
  ];
  rings[1].rotateX(Math.PI / 2);
  rings[2].rotateY(Math.PI / 2);
  rings[2].rotateX(0.42);
  rings[3].rotateY(Math.PI / 2);
  rings[3].rotateZ(-0.5);
  rings.push(
    translatedBox(
      [radius * 0.32, radius * 0.12, radius * 0.12],
      [radius * 0.56, radius * 0.22, radius * 0.28],
    ),
  );
  const instrument = mergedGeometry(rings);
  instrument.userData.mechanicaSemantic = "nested-armillary-rings";
  instrument.userData.mechanicaMaterial = {
    color: "#d6a84e",
    metalness: 0.72,
    roughness: 0.22,
  };

  const globe = new THREE.SphereGeometry(radius * 0.43, 24, 16);
  globe.scale(1, 0.98, 1);
  globe.userData.mechanicaSemantic = "celestial-globe";
  globe.userData.mechanicaMaterial = {
    color: "#214f68",
    metalness: 0.18,
    roughness: 0.54,
  };

  const sightingTube = new THREE.CylinderGeometry(
    tube * 1.15,
    tube * 1.15,
    radius * 1.42,
    12,
  );
  sightingTube.rotateZ(Math.PI / 2);
  const mount = mergedGeometry([
    translatedBox(
      [radius * 1.55, tube * 2.6, radius * 0.55],
      [0, -radius * 1.12, 0],
    ),
    translatedBox(
      [tube * 3.2, radius * 0.44, tube * 3.2],
      [-radius * 0.72, -radius * 0.9, 0],
    ),
    translatedBox(
      [tube * 3.2, radius * 0.44, tube * 3.2],
      [radius * 0.72, -radius * 0.9, 0],
    ),
    sightingTube,
  ]);
  mount.userData.mechanicaSemantic = "armillary-yoke-and-sighting-tube";
  mount.userData.mechanicaMaterial = {
    color: "#8d5a2b",
    metalness: 0.22,
    roughness: 0.46,
  };
  const motionWitness = mergedGeometry([
    translatedBox(
      [radius * 1.42, tube * 4.2, tube * 4.2],
      [radius * 0.19, radius * 0.5, 0],
    ),
    translatedBox(
      [tube * 6.4, radius * 0.42, tube * 5.2],
      [radius * 0.82, radius * 0.5, 0],
    ),
  ]);
  motionWitness.userData.mechanicaSemantic =
    "amplified-armillary-output-witness";
  motionWitness.userData.mechanicaMaterial = {
    color: "#5ee4ff",
    emissive: "#0b6479",
    emissiveIntensity: 0.72,
    metalness: 0.3,
    roughness: 0.16,
  };
  installPivotAnimation(motionWitness, "y", [0, 0, 0], 8);
  return [instrument, globe, mount, motionWitness];
}

function celestialColumn(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const radius = params.radius;
  const length = params.length;
  const shaft = translatedCylinder(radius, length, [0, 0, 0]);
  shaft.userData.mechanicaSemantic = "celestial-column-shaft";
  shaft.userData.mechanicaMaterial = {
    color: "#66767b",
    metalness: 0.78,
    roughness: 0.26,
  };
  const fittings: THREE.BufferGeometry[] = [];
  for (const [index, y] of [
    -length * 0.33,
    -length * 0.12,
    length * 0.16,
    length * 0.37,
  ].entries()) {
    const collar = new THREE.TorusGeometry(
      radius * (index === 1 ? 1.2 : 1.8),
      radius * (index === 1 ? 0.2 : 0.32),
      8,
      24,
    );
    collar.rotateX(Math.PI / 2);
    collar.translate(0, y, 0);
    fittings.push(
      collar,
      translatedBox(
        [radius * 1.15, radius * 0.28, radius * 0.34],
        [radius * 0.72, y, 0],
      ),
    );
  }
  const pinions = mergedGeometry(fittings);
  pinions.userData.mechanicaSemantic = "column-bearings-and-takeoffs";
  pinions.userData.mechanicaMaterial = {
    color: "#c19346",
    metalness: 0.68,
    roughness: 0.3,
  };
  return [shaft, pinions];
}

function reportingDrum(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const radius = params.radius;
  const width = params.width;
  const discs: THREE.BufferGeometry[] = [];
  const axialCenters = [-1.45, -1.3, -1.15, 1.15, 1.55, 1.95];
  for (let index = 0; index < 6; index += 1) {
    const disc = new THREE.CylinderGeometry(
      radius * (1 - index * 0.045),
      radius * (1 - index * 0.045),
      width * 0.7,
      24,
    );
    disc.translate(0, axialCenters[index] * width, 0);
    discs.push(disc);
  }
  discs.push(
    translatedBox(
      [radius * 0.72, width * 0.42, width * 0.55],
      [radius * 0.34, width * 2.15, 0],
    ),
  );
  const drum = mergedGeometry(discs);
  drum.userData.mechanicaSemantic = "six-register-reporting-drum";
  drum.userData.mechanicaMaterial = {
    color: "#a96735",
    metalness: 0.08,
    roughness: 0.55,
  };
  return drum;
}

function noriaWheel(params: Record<string, number>): THREE.BufferGeometry[] {
  const radius = params.radius;
  const width = params.width;
  const spokeCount = Math.round(params.spokes);
  const wheelParts: THREE.BufferGeometry[] = [];
  for (const y of [-width * 0.42, width * 0.42]) {
    const rim = new THREE.TorusGeometry(
      radius - width * 0.45,
      width * 0.28,
      8,
      40,
    );
    rim.rotateX(Math.PI / 2);
    rim.translate(0, y, 0);
    wheelParts.push(rim);
  }
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    wheelParts.push(
      wheelSpoke(
        radius - width * 0.35,
        width * 0.34,
        width * 0.34,
        (spoke * Math.PI * 2) / spokeCount,
      ),
    );
  }
  wheelParts.push(translatedCylinder(width * 0.55, width * 1.7, [0, 0, 0]));
  const wheel = mergedGeometry(wheelParts);
  wheel.userData.mechanicaSemantic = "water-lift-noria-wheel";
  wheel.userData.mechanicaMaterial = {
    color: "#9b663a",
    metalness: 0.05,
    roughness: 0.62,
  };

  const buckets: THREE.BufferGeometry[] = [];
  for (let bucket = 0; bucket < spokeCount; bucket += 1) {
    const angle = (bucket * Math.PI * 2) / spokeCount;
    buckets.push(
      rotatedBox(
        [width * 1.5, width * 0.62, width * 0.95],
        [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        [0, -angle, 0],
      ),
    );
  }
  const pots = mergedGeometry(buckets);
  pots.userData.mechanicaSemantic = "noria-lifting-pots";
  pots.userData.mechanicaMaterial = {
    color: "#d29a50",
    metalness: 0.08,
    roughness: 0.56,
  };
  return [wheel, pots];
}

function waterVessel(params: Record<string, number>): THREE.BufferGeometry[] {
  const sizeX = params.sizeX;
  const sizeY = params.sizeY;
  const sizeZ = params.sizeZ;
  const wall = Math.min(sizeX, sizeY, sizeZ) * 0.1;
  const pieces = [
    translatedBox([sizeX, wall, sizeZ], [0, -sizeY / 2 + wall / 2, 0]),
    translatedBox([wall, sizeY, sizeZ], [-sizeX / 2 + wall / 2, 0, 0]),
    translatedBox([wall, sizeY, sizeZ], [sizeX / 2 - wall / 2, 0, 0]),
    translatedBox([sizeX, sizeY, wall], [0, 0, -sizeZ / 2 + wall / 2]),
  ];
  if (params.variant !== 0) {
    pieces.push(
      translatedBox([sizeX, sizeY, wall], [0, 0, sizeZ / 2 - wall / 2]),
    );
  }
  const vessel = mergedGeometry(pieces);
  vessel.userData.mechanicaSemantic =
    params.variant === 0
      ? "open-water-return-trough"
      : params.variant === 1
        ? "header-reservoir"
        : "constant-level-tank-with-overflow";
  vessel.userData.mechanicaMaterial = {
    color: params.variant === 2 ? "#b78349" : "#805238",
    metalness: 0.03,
    roughness: 0.64,
  };
  const water = translatedBox(
    [sizeX - wall * 2.2, wall * 0.24, sizeZ - wall * 2.2],
    [0, sizeY / 2 - wall * 1.35, 0],
  );
  water.userData.mechanicaSemantic = "visible-water-surface";
  water.userData.mechanicaMaterial = {
    color: "#4d9cad",
    metalness: 0.14,
    opacity: 0.76,
    roughness: 0.22,
    transparent: true,
  };
  return [vessel, water];
}

function escapementPart(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const length = params.length;
  const width = params.width;
  const kind = Math.round(params.kind);
  const pieces: THREE.BufferGeometry[] = [];
  if (kind === 0) {
    pieces.push(
      translatedBox([width * 1.5, length * 0.72, width], [0, length * 0.08, 0]),
      rotatedBox(
        [width * 1.25, length * 0.52, width],
        [-length * 0.17, length * 0.35, 0],
        [0, 0, -0.52],
      ),
      rotatedBox(
        [width * 1.25, length * 0.52, width],
        [length * 0.17, length * 0.35, 0],
        [0, 0, 0.52],
      ),
    );
  } else if (kind === 1) {
    pieces.push(
      rotatedBox([length, width * 1.4, width], [0, 0, 0], [0, 0, -0.22]),
      translatedCylinder(width * 1.2, width * 1.8, [-length * 0.42, 0, 0]),
    );
  } else if (kind === 2) {
    pieces.push(
      translatedBox([length, width * 1.4, width], [0, length * 0.22, 0]),
      translatedBox([width * 1.4, length * 0.55, width], [-length * 0.4, 0, 0]),
      translatedBox([width * 1.4, length * 0.55, width], [length * 0.4, 0, 0]),
    );
  } else {
    const direction = kind === 3 ? -1 : 1;
    pieces.push(
      rotatedBox(
        [width * 1.5, length * 0.78, width],
        [0, 0, 0],
        [0, 0, direction * 0.18],
      ),
      translatedBox(
        [length * 0.32, width * 1.5, width],
        [direction * length * 0.13, length * 0.37, 0],
      ),
    );
  }
  const body = mergedGeometry(pieces);
  body.userData.mechanicaSemantic = [
    "regulating-fork",
    "release-tongue",
    "celestial-gate-yoke",
    "left-celestial-lock",
    "right-celestial-lock",
  ][kind];
  body.userData.mechanicaMaterial = {
    color: "#728087",
    metalness: 0.74,
    roughness: 0.28,
  };
  const pivot = translatedCylinder(width * 1.45, width * 1.8, [0, 0, 0]);
  pivot.rotateX(Math.PI / 2);
  pivot.userData.mechanicaSemantic = "escapement-pivot";
  pivot.userData.mechanicaMaterial = {
    color: "#d5a44e",
    metalness: 0.7,
    roughness: 0.22,
  };
  return [body, pivot];
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
        emit("camera", "shulun");
        emit("highlight", "scoop-01");
        runEscapementBeat(graph, emit, true);
        emit("camera", "celestial-column");
        emit("highlight", "celestial-globe");
        emit("camera", "chime-tier-1");
        emit("camera", "tower-shell");
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
        runEscapementBeat(graph, emit, false);
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
  aids: [
    {
      kind: "callouts",
      anchors: [
        {
          partId: "shulun",
          label: { zh: "枢轮与受水壶", en: "Scoop escapement wheel" },
        },
        {
          partId: "gecha",
          label: { zh: "格叉擒纵", en: "Regulating fork escapement" },
        },
        {
          partId: "celestial-column",
          label: { zh: "天柱传动", en: "Celestial transmission column" },
        },
        {
          partId: "armillary-sphere",
          label: { zh: "浑仪与浑象", en: "Armillary and celestial display" },
        },
        {
          partId: "chime-tier-3",
          label: { zh: "五层报时木阁", en: "Five-tier reporting pavilion" },
        },
        {
          partId: "water-circuit-links",
          label: {
            zh: "连续调速水路",
            en: "Continuous regulated water circuit",
          },
        },
        {
          partId: "escapement-linkage",
          label: {
            zh: "五级擒纵接力",
            en: "Five-stage escapement handoff",
          },
        },
        {
          partId: "celestial-transmission-links",
          label: {
            zh: "纵向天文传动接力",
            en: "Vertical celestial handoffs",
          },
        },
        {
          partId: "reporting-drive-links",
          label: {
            zh: "五层凸轮与输出连杆",
            en: "Five-tier camshaft and output rods",
          },
        },
      ],
    },
    {
      kind: "powerPath",
      sequence: [
        "water-reservoir",
        "constant-level-tank",
        "water-flow-indicator",
        "loaded-scoop-indicator",
        "scoop-01",
        "shulun",
        "escapement-linkage",
        "celestial-column",
        "hour-drum-wheel",
        "day-night-wheel",
        "celestial-ladder-lower",
        "celestial-globe",
        "armillary-sphere",
        "reporting-drive-links",
        "tier-cam-1",
        "tier-placard-1",
      ],
      dwellMs: 520,
    },
    {
      kind: "flowParticles",
      flavor: "water",
      pathPartIds: [
        "water-reservoir",
        "water-circuit-links",
        "constant-level-tank",
        "water-flow-indicator",
        "scoop-01",
        "water-trough",
        "water-lift-wheel",
        "water-reservoir",
      ],
      rate: 32,
    },
    {
      kind: "cutaway",
      partIds: ["tower-shell"],
      label: {
        zh: "隐去台壳以观察水路、擒纵与天梯",
        en: "Fade the pavilion to inspect water, escapement, and chain",
      },
    },
    {
      kind: "subDemo",
      triggerId: "spotlight",
      caption: {
        zh: "由一壶水追踪至浑仪的一次节拍",
        en: "Trace one water beat from scoop to armillary",
      },
    },
  ],
  mechanism,
  schemes: {
    [fixedScoop.id]: fixedScoop,
    [combridgeHinged.id]: combridgeHinged,
  },
  defaultSchemeId: fixedScoop.id,
  customBuilders: {
    astroclockTowerCutaway: towerCutaway,
    astroclockArmillary: armillary,
    astroclockCelestialColumn: celestialColumn,
    astroclockReportingDrum: reportingDrum,
    astroclockNoriaWheel: noriaWheel,
    astroclockWaterVessel: waterVessel,
    astroclockEscapementPart: escapementPart,
    astroclockJackBay: jackBay,
    astroclockJackFigure: jackFigure,
    astroclockWaterCircuitLinks: waterCircuitLinks,
    astroclockEscapementLinks: escapementLinks,
    astroclockCelestialTransmissionLinks: celestialTransmissionLinks,
    astroclockReportingDriveLinks: reportingDriveLinks,
    astroclockReportingCam: reportingCam,
    astroclockWaterIndicator: waterIndicator,
  },
};

export default machine;
