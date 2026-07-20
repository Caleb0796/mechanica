import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
const FIGURE_STRIKE_HOLD = 0.14;
const UPPER_FIGURE_STRIKE_HOLD = 0.18;
const DRUM_RESPONSE_HOLD = 0.16;
const CHIME_RESPONSE_HOLD = 0.35;

const parts = partsJson as unknown as PartDef[];
const ludaolong = ludaolongJson as unknown as SchemePatch;

function mergeOdometerGeometry(
  geometries: THREE.BufferGeometry[],
  label: string,
): THREE.BufferGeometry {
  const geometry = mergeGeometries(geometries);
  for (const item of geometries) item.dispose();
  if (!geometry) {
    throw new Error(`Odometer ${label} geometry could not be merged`);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function translatedBox(
  size: [number, number, number],
  position: [number, number, number],
): THREE.BufferGeometry {
  return new THREE.BoxGeometry(...size).translate(...position);
}

function odometerUnderframe(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const {
    length,
    width,
    height,
    railWidth,
    gearClearance,
    whirlwindClearance,
    whirlwindOffset,
    crossMemberOffset,
    bearingWidth,
    bearingHeight,
    bearingDepth,
    bearingOffset,
  } = params;
  const halfLength = length / 2;
  const centerBayEdge = gearClearance / 2;
  const whirlwindBayStart = whirlwindOffset - whirlwindClearance / 2;
  const whirlwindBayEnd = whirlwindOffset + whirlwindClearance / 2;
  const negativeRailLength = halfLength - centerBayEdge;
  const middleRailLength = whirlwindBayStart - centerBayEdge;
  const positiveRailLength = halfLength - whirlwindBayEnd;
  const driveRailZ = -width / 2 + railWidth / 2;
  const geometry = mergeOdometerGeometry(
    [
      translatedBox(
        [negativeRailLength, height, railWidth],
        [-(centerBayEdge + negativeRailLength / 2), 0, driveRailZ],
      ),
      translatedBox(
        [middleRailLength, height, railWidth],
        [centerBayEdge + middleRailLength / 2, 0, driveRailZ],
      ),
      translatedBox(
        [positiveRailLength, height, railWidth],
        [whirlwindBayEnd + positiveRailLength / 2, 0, driveRailZ],
      ),
      translatedBox(
        [length, height, railWidth],
        [0, 0, width / 2 - railWidth / 2],
      ),
      translatedBox([height, height, width], [crossMemberOffset, 0, 0]),
      translatedBox([height, height, width], [-crossMemberOffset, 0, 0]),
      translatedBox(
        [bearingWidth, bearingHeight, bearingDepth],
        [0, -height * 0.45, -bearingOffset],
      ),
      translatedBox(
        [bearingWidth, bearingHeight, bearingDepth],
        [0, -height * 0.45, bearingOffset],
      ),
    ],
    "underframe",
  );
  geometry.userData.mechanicaSemantic = {
    kind: "carriage-underframe",
    axleSupported: true,
    centralDriveGearClearance: true,
    whirlwindGearClearance: true,
    twinLongitudinalRails: true,
  };
  geometry.userData.mechanicaMaterialRole = "carriage-pavilion";
  geometry.userData.mechanicaMaterial = {
    color: "#6f231c",
    metalness: 0.03,
    roughness: 0.68,
    textureVariant: "none",
  };
  return geometry;
}

function odometerPavilion(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const {
    width,
    depth,
    skirtHeight,
    lowerHeight,
    upperHeight,
    post,
    panel,
    railHeight,
    wheelWellWidth,
    wheelWellDepth,
    upperGearClearance,
    upperGearOffset,
  } = params;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const halfWheelWellWidth = wheelWellWidth / 2;
  const halfWheelWellDepth = wheelWellDepth / 2;
  const rearBayStart = Math.max(
    -halfWheelWellWidth,
    upperGearOffset - upperGearClearance / 2,
  );
  const rearPanelWidth = rearBayStart + halfWheelWellWidth;
  const sidePanelWidth = (width - wheelWellWidth) / 2;
  const sidePanelX = halfWheelWellWidth + sidePanelWidth / 2;
  const lowerDeckY = skirtHeight;
  const upperDeckY = lowerDeckY + lowerHeight;
  const roofDeckY = upperDeckY + upperHeight;
  const panelBand = Math.max(panel * 2, skirtHeight * 0.16);
  const panels = mergeOdometerGeometry(
    [
      translatedBox(
        [rearPanelWidth, skirtHeight, panel],
        [
          -halfWheelWellWidth + rearPanelWidth / 2,
          skirtHeight / 2,
          -halfWheelWellDepth + panel / 2,
        ],
      ),
      translatedBox(
        [sidePanelWidth, skirtHeight, panel],
        [-sidePanelX, skirtHeight / 2, -halfDepth + panel / 2],
      ),
      translatedBox(
        [sidePanelWidth, skirtHeight, panel],
        [sidePanelX, skirtHeight / 2, -halfDepth + panel / 2],
      ),
      translatedBox(
        [panel, skirtHeight, depth - panel * 2],
        [-halfWidth + panel / 2, skirtHeight / 2, 0],
      ),
      translatedBox(
        [wheelWellWidth, panelBand, panel],
        [0, panelBand / 2, halfWheelWellDepth - panel / 2],
      ),
      translatedBox(
        [wheelWellWidth, panelBand, panel],
        [0, skirtHeight - panelBand / 2, halfWheelWellDepth - panel / 2],
      ),
      translatedBox(
        [sidePanelWidth, panelBand, panel],
        [-sidePanelX, panelBand / 2, halfDepth - panel / 2],
      ),
      translatedBox(
        [sidePanelWidth, panelBand, panel],
        [sidePanelX, panelBand / 2, halfDepth - panel / 2],
      ),
      translatedBox(
        [sidePanelWidth, panelBand, panel],
        [-sidePanelX, skirtHeight - panelBand / 2, halfDepth - panel / 2],
      ),
      translatedBox(
        [sidePanelWidth, panelBand, panel],
        [sidePanelX, skirtHeight - panelBand / 2, halfDepth - panel / 2],
      ),
      translatedBox(
        [panel, panelBand, depth - panel * 2],
        [halfWidth - panel / 2, panelBand / 2, 0],
      ),
      translatedBox(
        [panel, panelBand, depth - panel * 2],
        [halfWidth - panel / 2, skirtHeight - panelBand / 2, 0],
      ),
    ],
    "pavilion skirt",
  );
  panels.userData.mechanicaSemantic = {
    kind: "painted-carriage-skirt",
    frontAndSideMechanismBays: true,
    pairedRoadWheelWells: true,
    recordedRedBody: true,
    upperReductionGearBay: true,
  };
  panels.userData.mechanicaMaterialRole = "carriage-pavilion";
  panels.userData.mechanicaMaterial = {
    color: "#8f2d23",
    depthWrite: true,
    metalness: 0.02,
    opacity: 1,
    roughness: 0.62,
    textureVariant: "none",
    transparent: false,
  };

  const frameParts: THREE.BufferGeometry[] = [
    translatedBox([wheelWellWidth, 0.12, wheelWellDepth], [0, lowerDeckY, 0]),
    translatedBox([sidePanelWidth, 0.12, depth], [-sidePanelX, lowerDeckY, 0]),
    translatedBox([sidePanelWidth, 0.12, depth], [sidePanelX, lowerDeckY, 0]),
    translatedBox([width * 0.88, 0.11, depth * 0.86], [0, upperDeckY, 0]),
    translatedBox([width * 0.76, 0.1, depth * 0.74], [0, roofDeckY, 0]),
  ];
  for (const [deckY, storeyHeight, inset] of [
    [lowerDeckY, lowerHeight, 0.08],
    [upperDeckY, upperHeight, 0.18],
  ] as const) {
    const postX = halfWidth * (1 - inset);
    const postZ = halfDepth * (1 - inset);
    for (const x of [-postX, postX]) {
      for (const z of [-postZ, postZ]) {
        frameParts.push(
          translatedBox(
            [post, storeyHeight, post],
            [x, deckY + storeyHeight / 2, z],
          ),
        );
      }
    }
    frameParts.push(
      translatedBox(
        [postX * 2 + post, post, post],
        [0, deckY + storeyHeight - post / 2, -postZ],
      ),
      translatedBox(
        [postX * 2 + post, post, post],
        [0, deckY + storeyHeight - post / 2, postZ],
      ),
      translatedBox(
        [post, post, postZ * 2 + post],
        [-postX, deckY + storeyHeight - post / 2, 0],
      ),
      translatedBox(
        [post, post, postZ * 2 + post],
        [postX, deckY + storeyHeight - post / 2, 0],
      ),
    );
  }
  const frame = mergeOdometerGeometry(frameParts, "pavilion frame");
  frame.userData.mechanicaSemantic = {
    kind: "double-storey-pavilion-frame",
    storeys: 2,
    coherentPostAndBeamBays: true,
  };
  frame.userData.mechanicaMaterialRole = "carriage-pavilion";
  frame.userData.mechanicaMaterial = {
    color: "#54251d",
    metalness: 0.02,
    roughness: 0.74,
    textureVariant: "none",
  };

  const railingParts: THREE.BufferGeometry[] = [];
  for (const [deckY, inset] of [
    [lowerDeckY, 0.1],
    [upperDeckY, 0.2],
  ] as const) {
    const railX = halfWidth * (1 - inset);
    const railZ = halfDepth * (1 - inset);
    const railY = deckY + railHeight;
    railingParts.push(
      translatedBox([railX * 2, post * 0.45, post * 0.45], [0, railY, -railZ]),
      translatedBox([railX * 2, post * 0.45, post * 0.45], [0, railY, railZ]),
      translatedBox([post * 0.45, post * 0.45, railZ * 2], [-railX, railY, 0]),
      translatedBox([post * 0.45, post * 0.45, railZ * 2], [railX, railY, 0]),
    );
    for (let index = -4; index <= 4; index += 1) {
      const x = (railX * index) / 4;
      railingParts.push(
        translatedBox(
          [post * 0.35, railHeight, post * 0.35],
          [x, deckY + railHeight / 2, -railZ],
        ),
        translatedBox(
          [post * 0.35, railHeight, post * 0.35],
          [x, deckY + railHeight / 2, railZ],
        ),
      );
    }
    for (let index = -2; index <= 2; index += 1) {
      const z = (railZ * index) / 2;
      railingParts.push(
        translatedBox(
          [post * 0.35, railHeight, post * 0.35],
          [-railX, deckY + railHeight / 2, z],
        ),
        translatedBox(
          [post * 0.35, railHeight, post * 0.35],
          [railX, deckY + railHeight / 2, z],
        ),
      );
    }
  }
  const railings = mergeOdometerGeometry(railingParts, "pavilion railings");
  railings.userData.mechanicaSemantic = {
    kind: "double-tier-goulan-railings",
    storeys: 2,
    openBalustrade: true,
  };
  railings.userData.mechanicaMaterialRole = "carriage-pavilion";
  railings.userData.mechanicaMaterial = {
    color: "#bd5a2f",
    metalness: 0.04,
    roughness: 0.54,
    textureVariant: "none",
  };

  const bracketParts: THREE.BufferGeometry[] = [];
  for (const y of [upperDeckY - 0.1, roofDeckY - 0.1]) {
    for (const x of [-halfWidth * 0.32, 0, halfWidth * 0.32]) {
      bracketParts.push(
        translatedBox([0.16, 0.14, 0.16], [x, y, -halfDepth * 0.72]),
        translatedBox([0.16, 0.14, 0.16], [x, y, halfDepth * 0.72]),
      );
    }
  }
  const brackets = mergeOdometerGeometry(bracketParts, "pavilion brackets");
  brackets.userData.mechanicaSemantic = {
    kind: "pierced-bracket-registers",
    storeys: 2,
  };
  brackets.userData.mechanicaMaterialRole = "carriage-pavilion";
  brackets.userData.mechanicaMaterial = {
    color: "#d09748",
    metalness: 0.08,
    roughness: 0.48,
    textureVariant: "none",
  };
  return [panels, frame, railings, brackets];
}

function odometerHipRoof(params: Record<string, number>): THREE.BufferGeometry {
  const { width, depth, rise, thickness, ridgeLength, ridgeRadius } = params;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const halfRidge = ridgeLength / 2;
  const roof = new THREE.BufferGeometry();
  roof.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -halfWidth,
        0,
        -halfDepth,
        halfWidth,
        0,
        -halfDepth,
        halfWidth,
        0,
        halfDepth,
        -halfWidth,
        0,
        halfDepth,
        -halfRidge,
        rise,
        0,
        halfRidge,
        rise,
        0,
      ],
      3,
    ),
  );
  roof.setIndex([0, 1, 5, 0, 5, 4, 3, 4, 5, 3, 5, 2, 0, 4, 3, 1, 2, 5]);
  roof.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      [0, 0, 1, 0, 1, 1, 0, 1, 0.3, 0.5, 0.7, 0.5],
      2,
    ),
  );
  roof.computeVertexNormals();
  const ridge = new THREE.CylinderGeometry(
    ridgeRadius,
    ridgeRadius,
    ridgeLength + ridgeRadius * 3,
    16,
  ).rotateZ(Math.PI / 2);
  ridge.translate(0, rise + ridgeRadius * 0.4, 0);
  const geometry = mergeOdometerGeometry(
    [
      roof,
      translatedBox([width, thickness, depth], [0, -thickness / 2, 0]),
      ridge,
    ],
    "hip roof",
  );
  geometry.userData.mechanicaSemantic = {
    kind: "ceremonial-hip-roof",
    ridge: true,
    overhangingEaves: true,
  };
  geometry.userData.mechanicaMaterialRole = "carriage-pavilion";
  geometry.userData.mechanicaMaterial = {
    color: "#8f2d23",
    metalness: 0.04,
    roughness: 0.52,
    textureVariant: "lacquer:red",
  };
  return geometry;
}

function odometerDrawbar(params: Record<string, number>): THREE.BufferGeometry {
  const { length, radius, rise, yokeWidth, headRadius } = params;
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(length * 0.38, -rise * 0.28, 0),
    new THREE.Vector3(length * 0.72, rise * 0.15, 0),
    new THREE.Vector3(length, rise, 0),
  ]);
  const shaft = new THREE.TubeGeometry(path, 28, radius, 10, false);
  const yoke = new THREE.CylinderGeometry(
    radius * 0.72,
    radius * 0.72,
    yokeWidth,
    12,
  ).rotateX(Math.PI / 2);
  yoke.translate(length * 0.78, rise * 0.35, 0);
  const head = new THREE.SphereGeometry(headRadius, 16, 10).scale(
    1.25,
    0.9,
    0.8,
  );
  head.translate(length, rise + headRadius * 0.55, 0);
  const beak = new THREE.ConeGeometry(headRadius * 0.36, headRadius, 10)
    .rotateZ(-Math.PI / 2)
    .translate(length + headRadius * 1.05, rise + headRadius * 0.48, 0);
  const crest = new THREE.ConeGeometry(headRadius * 0.42, headRadius * 1.2, 8)
    .rotateZ(Math.PI)
    .translate(length - headRadius * 0.22, rise + headRadius * 1.35, 0);
  const geometry = mergeOdometerGeometry(
    [shaft, yoke, head, beak, crest],
    "drawbar",
  );
  geometry.userData.mechanicaSemantic = {
    kind: "single-phoenix-headed-drawbar",
    integratedYoke: true,
  };
  geometry.userData.mechanicaMaterialRole = "carriage-pavilion";
  geometry.userData.mechanicaMaterial = {
    color: "#7f281f",
    metalness: 0.03,
    roughness: 0.58,
    textureVariant: "lacquer:red",
  };
  return geometry;
}

function odometerFigure(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const { height, shoulderWidth, depth } = params;
  const robe = new THREE.CylinderGeometry(
    shoulderWidth * 0.3,
    shoulderWidth * 0.46,
    height * 0.44,
    16,
  );
  robe.scale(1, 1, depth / (shoulderWidth * 0.92));
  robe.translate(0, -height * 0.24, 0);
  const torso = translatedBox(
    [shoulderWidth * 0.82, height * 0.32, depth * 0.74],
    [0, height * 0.09, 0],
  );
  const shoulders = translatedBox(
    [shoulderWidth, height * 0.085, depth * 0.82],
    [0, height * 0.19, 0],
  );
  const belt = new THREE.CylinderGeometry(
    shoulderWidth * 0.34,
    shoulderWidth * 0.34,
    height * 0.055,
    14,
  );
  belt.scale(1, 1, depth / (shoulderWidth * 0.68));
  belt.translate(0, -height * 0.06, 0);
  const body = mergeOdometerGeometry(
    [robe, torso, shoulders, belt],
    "figure body",
  );
  body.userData.mechanicaSemantic = {
    kind: "mounted-human-striker",
    robe: true,
    separatedShoulders: true,
  };
  body.userData.mechanicaMaterialRole = "figure";
  body.userData.mechanicaMaterial = {
    color: "#9f4d2f",
    metalness: 0.08,
    roughness: 0.54,
    textureVariant: "none",
  };

  const neck = new THREE.CylinderGeometry(
    height * 0.045,
    height * 0.05,
    height * 0.075,
    12,
  );
  neck.translate(0, height * 0.255, 0);
  const head = new THREE.SphereGeometry(height * 0.105, 18, 12);
  head.scale(0.9, 1.08, 0.88);
  head.translate(0, height * 0.35, 0);
  const nose = new THREE.SphereGeometry(height * 0.035, 10, 8);
  nose.scale(1.2, 0.65, 0.7);
  nose.translate(-height * 0.092, height * 0.36, 0);
  const headGeometry = mergeOdometerGeometry([neck, head, nose], "figure head");
  headGeometry.userData.mechanicaSemantic = {
    kind: "human-head-and-neck",
    distinctFromRobe: true,
    instrumentFacingAxis: "-x",
  };
  headGeometry.userData.mechanicaMaterialRole = "figure";
  headGeometry.userData.mechanicaMaterial = {
    color: "#ddb067",
    metalness: 0.04,
    roughness: 0.48,
    textureVariant: "none",
  };

  const hatBrim = new THREE.CylinderGeometry(
    height * 0.13,
    height * 0.13,
    height * 0.035,
    16,
  );
  hatBrim.translate(0, height * 0.435, 0);
  const hatCrown = new THREE.BoxGeometry(
    height * 0.13,
    height * 0.075,
    depth * 0.52,
  );
  hatCrown.translate(0, height * 0.48, 0);
  const hat = mergeOdometerGeometry([hatBrim, hatCrown], "figure hat");
  hat.userData.mechanicaSemantic = {
    kind: "striker-cap",
    contrastingBrim: true,
  };
  hat.userData.mechanicaMaterialRole = "figure";
  hat.userData.mechanicaMaterial = {
    color: "#32241d",
    metalness: 0.04,
    roughness: 0.72,
    textureVariant: "none",
  };

  const restingArm = new THREE.CylinderGeometry(
    height * 0.045,
    height * 0.045,
    height * 0.31,
    12,
  );
  restingArm.rotateZ(-0.24);
  restingArm.translate(shoulderWidth * 0.48, height * 0.035, 0);
  const feet = [
    translatedBox(
      [shoulderWidth * 0.3, height * 0.07, depth * 0.78],
      [-shoulderWidth * 0.2, -height * 0.45, depth * 0.08],
    ),
    translatedBox(
      [shoulderWidth * 0.3, height * 0.07, depth * 0.78],
      [shoulderWidth * 0.2, -height * 0.45, depth * 0.08],
    ),
  ];
  const limbs = mergeOdometerGeometry([restingArm, ...feet], "figure limbs");
  limbs.userData.mechanicaSemantic = {
    kind: "separated-arm-and-feet",
    humanSilhouette: true,
  };
  limbs.userData.mechanicaMaterialRole = "figure";
  limbs.userData.mechanicaMaterial = {
    color: "#c88a48",
    metalness: 0.04,
    roughness: 0.52,
    textureVariant: "none",
  };
  return [body, headGeometry, hat, limbs];
}

function odometerMalletArm(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const {
    length,
    thickness,
    handle,
    head,
    direction,
    planeOffset = 0,
    contactDepth = head * 1.5,
    contactOffset = 0,
  } = params;
  const arm = new THREE.CylinderGeometry(
    thickness,
    thickness,
    length,
    12,
  ).rotateZ((direction * Math.PI) / 2);
  arm.translate((direction * length) / 2, 0, planeOffset);
  const shoulderBridge =
    planeOffset > 0
      ? new THREE.CylinderGeometry(
          thickness * 0.72,
          thickness * 0.72,
          planeOffset,
          12,
        )
          .rotateX(Math.PI / 2)
          .translate(0, 0, planeOffset / 2)
      : null;
  const strikerArm = shoulderBridge
    ? mergeOdometerGeometry([arm, shoulderBridge], "outboard striker arm")
    : arm;
  strikerArm.computeVertexNormals();
  strikerArm.computeBoundingBox();
  strikerArm.computeBoundingSphere();
  strikerArm.userData.mechanicaSemantic = {
    kind: "instrument-facing-striker-arm",
    direction,
    outboardShoulderBridge: planeOffset > 0,
    readableStrikePath: true,
    shoulderPivotAtOrigin: true,
  };
  strikerArm.userData.mechanicaMaterialRole = "figure";
  strikerArm.userData.mechanicaMaterial = {
    color: "#e0a34e",
    metalness: 0.06,
    roughness: 0.42,
    textureVariant: "none",
  };
  const malletHandle = new THREE.CylinderGeometry(
    thickness * 0.46,
    thickness * 0.46,
    handle,
    10,
  );
  malletHandle.translate(direction * length, -handle / 2, planeOffset);
  const malletHead = new THREE.CylinderGeometry(head, head, contactDepth, 12)
    .rotateX(Math.PI / 2)
    .translate(direction * length, -handle, planeOffset - contactOffset);
  const mallet = mergeOdometerGeometry(
    [malletHandle, malletHead],
    "mallet head and handle",
  );
  mallet.userData.mechanicaSemantic = {
    kind: "separate-mallet-head-and-handle",
    instrumentFacingAxis: direction < 0 ? "-x" : "+x",
    contactDepth,
    contactOffset,
    strikePlaneOffset: planeOffset,
  };
  mallet.userData.mechanicaMaterialRole = "instrument-striker";
  mallet.userData.mechanicaMaterial = {
    color: "#f0c96b",
    emissive: "#2b1804",
    emissiveIntensity: 0.06,
    metalness: 0.28,
    roughness: 0.38,
    textureVariant: "none",
  };
  return [strikerArm, mallet];
}

function odometerRotationWitness(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const {
    length,
    width,
    thickness,
    direction = 1,
    couplingLength = 0,
    couplingRadius = width * 1.6,
  } = params;
  const bar = translatedBox(
    [length, thickness, width],
    [(direction * length) / 2, 0, 0],
  );
  const hub = new THREE.CylinderGeometry(
    width * 0.72,
    width * 0.72,
    thickness,
    14,
  );
  const pointer = new THREE.ConeGeometry(width * 0.9, width * 1.8, 8)
    .rotateZ(direction > 0 ? -Math.PI / 2 : Math.PI / 2)
    .translate(direction * (length - width * 0.9), 0, 0);
  const counterweight = translatedBox(
    [length * 0.28, thickness * 1.15, width * 1.3],
    [-direction * length * 0.14, 0, 0],
  );
  const index = mergeOdometerGeometry(
    [bar, hub, pointer, counterweight],
    "rotation transfer index",
  );
  index.userData.mechanicaSemantic = {
    kind: "road-to-gear-rotation-witness",
    radialIndex: true,
    visibleProgression: true,
    pointsTowardMesh: true,
  };
  index.userData.mechanicaMaterialRole = "transmission-witness";
  index.userData.mechanicaMaterial = {
    color: "#f0c96b",
    emissive: "#2b1804",
    emissiveIntensity: 0.12,
    metalness: 0.48,
    roughness: 0.3,
    textureVariant: "bronze:fresh",
  };

  const flag = translatedBox(
    [width * 1.4, thickness * 2.4, width * 2.5],
    [
      direction * (length - width * 0.9),
      0,
      direction * width * 1.05,
    ],
  );
  flag.computeVertexNormals();
  flag.computeBoundingBox();
  flag.computeBoundingSphere();
  flag.userData.mechanicaSemantic = {
    kind: "asymmetric-moving-index-flag",
    screenshotReadable: true,
    pointsTowardMesh: true,
  };
  flag.userData.mechanicaMaterialRole = "transmission-witness-accent";
  flag.userData.mechanicaMaterial = {
    color: "#ef6a4b",
    emissive: "#381008",
    emissiveIntensity: 0.18,
    metalness: 0.36,
    roughness: 0.28,
    textureVariant: "none",
  };

  const geometries = [index, flag];
  if (couplingLength > 0) {
    const sleeve = new THREE.CylinderGeometry(
      couplingRadius,
      couplingRadius,
      couplingLength,
      16,
    );
    sleeve.translate(0, -couplingLength / 2 - thickness / 2, 0);
    const collarOffset = couplingLength / 2;
    const nearCollar = new THREE.CylinderGeometry(
      couplingRadius,
      couplingRadius,
      thickness * 1.8,
      16,
    );
    nearCollar.translate(0, -thickness * 0.9, 0);
    const farCollar = new THREE.CylinderGeometry(
      couplingRadius,
      couplingRadius,
      thickness * 1.8,
      16,
    );
    farCollar.translate(0, -couplingLength - thickness * 0.1, 0);
    const key = translatedBox(
      [width * 0.9, couplingLength * 0.82, width * 0.9],
      [couplingRadius + width * 0.15, -collarOffset - thickness / 2, 0],
    );
    const coupling = mergeOdometerGeometry(
      [sleeve, nearCollar, farCollar, key],
      "keyed road-axle coupling",
    );
    coupling.userData.mechanicaSemantic = {
      kind:
        direction > 0
          ? "keyed-road-axle-coupling"
          : "keyed-lower-wheel-shaft-coupling",
      continuousWithDriveShaft: true,
      exposesGearHandoff: true,
      rotationKey: true,
    };
    coupling.userData.mechanicaMaterialRole = "transmission-shaft";
    coupling.userData.mechanicaMaterial = {
      color: "#b9c8c4",
      emissive: "#101817",
      emissiveIntensity: 0.06,
      metalness: 0.78,
      roughness: 0.3,
      textureVariant: "iron:cast",
    };
    geometries.push(coupling);
  }
  return geometries;
}

function odometerTripShaft(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const {
    radius,
    length,
    collarOffsetA,
    collarOffsetB,
    collarRadius,
    collarHeight,
  } = params;
  const shaft = new THREE.CylinderGeometry(radius, radius, length, 16);
  shaft.computeVertexNormals();
  shaft.computeBoundingBox();
  shaft.computeBoundingSphere();
  shaft.userData.mechanicaSemantic = {
    kind: "continuous-vertical-trip-shaft",
    gearToTripContinuity: true,
    passesThroughDecks: true,
  };
  shaft.userData.mechanicaMaterialRole = "transmission-link";
  shaft.userData.mechanicaMaterial = {
    color: "#b9c8c4",
    emissive: "#101817",
    emissiveIntensity: 0.05,
    metalness: 0.78,
    roughness: 0.32,
    textureVariant: "iron:cast",
  };
  const collarGeometry = mergeOdometerGeometry(
    [collarOffsetA, collarOffsetB].map((offset) => {
      const collar = new THREE.CylinderGeometry(
        collarRadius,
        collarRadius,
        collarHeight,
        16,
      );
      collar.translate(0, offset, 0);
      return collar;
    }),
    "trip-shaft deck collars",
  );
  collarGeometry.userData.mechanicaSemantic = {
    kind: "trip-shaft-deck-collars",
    deckPassagesReadable: true,
    separatesTransmissionFromStructure: true,
  };
  collarGeometry.userData.mechanicaMaterialRole = "transmission-trigger";
  collarGeometry.userData.mechanicaMaterial = {
    color: "#f0c96b",
    emissive: "#2b1804",
    emissiveIntensity: 0.1,
    metalness: 0.58,
    roughness: 0.28,
    textureVariant: "bronze:fresh",
  };
  return [shaft, collarGeometry];
}

function odometerInstrumentStand(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const { width, height, depth, bar } = params;
  const uprightX = width / 2 - bar / 2;
  const geometries = [
    new THREE.BoxGeometry(bar, height, bar).translate(-uprightX, 0, 0),
    new THREE.BoxGeometry(bar, height, bar).translate(uprightX, 0, 0),
    new THREE.BoxGeometry(width, bar, bar).translate(
      0,
      height / 2 - bar / 2,
      -depth / 2 + bar / 2,
    ),
    new THREE.BoxGeometry(bar, bar, depth / 2).translate(
      -uprightX,
      height / 2 - bar / 2,
      -depth / 4,
    ),
    new THREE.BoxGeometry(bar, bar, depth / 2).translate(
      uprightX,
      height / 2 - bar / 2,
      -depth / 4,
    ),
    new THREE.BoxGeometry(bar, bar, depth).translate(
      -uprightX,
      -height / 2 + bar / 2,
      0,
    ),
    new THREE.BoxGeometry(bar, bar, depth).translate(
      uprightX,
      -height / 2 + bar / 2,
      0,
    ),
  ];
  const geometry = mergeOdometerGeometry(geometries, "instrument stand");
  geometry.userData.mechanicaSemantic = {
    kind: "struck-instrument-support",
    openFrame: true,
  };
  geometry.userData.mechanicaMaterialRole = "instrument";
  geometry.userData.mechanicaMaterial = {
    color: "#4c2b20",
    metalness: 0.03,
    roughness: 0.72,
    textureVariant: "none",
  };
  return geometry;
}

function odometerDrum(params: Record<string, number>): THREE.BufferGeometry[] {
  const { radius, length, hoop } = params;
  const shell = new THREE.LatheGeometry(
    [
      new THREE.Vector2(radius * 0.87, -length / 2),
      new THREE.Vector2(radius * 0.98, -length * 0.24),
      new THREE.Vector2(radius, 0),
      new THREE.Vector2(radius * 0.98, length * 0.24),
      new THREE.Vector2(radius * 0.87, length / 2),
    ],
    24,
  ).rotateX(Math.PI / 2);
  shell.userData.mechanicaSemantic = {
    kind: "barrel-drum-shell",
    mountedInstrument: true,
  };
  shell.userData.mechanicaMaterialRole = "instrument";
  shell.userData.mechanicaMaterial = {
    color: "#b8572c",
    metalness: 0.03,
    roughness: 0.46,
    textureVariant: "lacquer:red",
  };
  const hoops = mergeOdometerGeometry(
    [
      new THREE.TorusGeometry(radius * 0.91, hoop, 10, 24).translate(
        0,
        0,
        -length / 2,
      ),
      new THREE.TorusGeometry(radius * 0.91, hoop, 10, 24).translate(
        0,
        0,
        length / 2,
      ),
    ],
    "drum hoops",
  );
  hoops.userData.mechanicaSemantic = "drum-rim-hoops";
  hoops.userData.mechanicaMaterialRole = "instrument";
  hoops.userData.mechanicaMaterial = {
    color: "#d5ad62",
    metalness: 0.56,
    roughness: 0.34,
    textureVariant: "bronze:fresh",
  };
  const drumheads = mergeOdometerGeometry(
    [
      new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, hoop * 0.72, 24)
        .rotateX(Math.PI / 2)
        .translate(0, 0, -length / 2 - hoop * 0.28),
      new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, hoop * 0.72, 24)
        .rotateX(Math.PI / 2)
        .translate(0, 0, length / 2 + hoop * 0.28),
    ],
    "drumheads",
  );
  drumheads.userData.mechanicaSemantic = {
    kind: "paired-drumheads",
    barrelDepthReadable: true,
  };
  drumheads.userData.mechanicaMaterialRole = "instrument";
  drumheads.userData.mechanicaMaterial = {
    color: "#e4c68b",
    metalness: 0.02,
    roughness: 0.68,
    textureVariant: "silk:natural",
  };
  return [shell, hoops, drumheads];
}

function odometerChime(params: Record<string, number>): THREE.BufferGeometry {
  const { radius, height, loopRadius } = params;
  const bell = new THREE.LatheGeometry(
    [
      new THREE.Vector2(radius * 0.12, height / 2),
      new THREE.Vector2(radius * 0.52, height * 0.34),
      new THREE.Vector2(radius * 0.72, -height * 0.08),
      new THREE.Vector2(radius, -height / 2),
      new THREE.Vector2(radius * 0.78, -height * 0.42),
      new THREE.Vector2(radius * 0.58, -height * 0.04),
      new THREE.Vector2(radius * 0.4, height * 0.26),
      new THREE.Vector2(radius * 0.12, height * 0.42),
    ],
    24,
  );
  const loop = new THREE.TorusGeometry(loopRadius, loopRadius * 0.24, 8, 16);
  loop.translate(0, height / 2 + loopRadius * 0.72, 0);
  const geometry = mergeOdometerGeometry([bell, loop], "chime");
  geometry.userData.mechanicaSemantic = {
    kind: "hanging-bell-chime",
    openMouth: true,
    mountedInstrument: true,
  };
  geometry.userData.mechanicaMaterialRole = "instrument";
  geometry.userData.mechanicaMaterial = {
    color: "#c68a3c",
    metalness: 0.82,
    roughness: 0.3,
    textureVariant: "bronze:fresh",
  };
  return geometry;
}

function odometerTripLinkage(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const { reach, leverHeight, rodLength, rodRadius, pinLength, displayOffset } =
    params;
  const tripPin = translatedBox(
    [pinLength, leverHeight, leverHeight],
    [-pinLength / 2, 0, 0],
  );
  const planeBridge = new THREE.CylinderGeometry(
    leverHeight * 0.72,
    leverHeight * 0.72,
    displayOffset,
    12,
  ).rotateX(Math.PI / 2);
  planeBridge.translate(0, 0, displayOffset / 2);
  const leverY = leverHeight * 2.5;
  const leverRiser = new THREE.CylinderGeometry(
    leverHeight * 0.72,
    leverHeight * 0.72,
    leverY,
    12,
  );
  leverRiser.translate(0, leverY / 2, displayOffset);
  const lever = translatedBox(
    [reach, leverHeight, leverHeight],
    [-reach / 2, leverY, displayOffset],
  );
  const pivot = new THREE.CylinderGeometry(
    leverHeight * 0.72,
    leverHeight * 0.72,
    leverHeight * 2.2,
    12,
  ).rotateX(Math.PI / 2);
  pivot.translate(-reach * 0.42, leverY, displayOffset);
  const rod = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 10);
  rod.translate(-reach, leverY + rodLength / 2, displayOffset);
  const lowerClevis = new THREE.SphereGeometry(rodRadius * 1.9, 12, 8);
  lowerClevis.translate(-reach, leverY, displayOffset);
  const upperClevis = new THREE.SphereGeometry(rodRadius * 2.2, 12, 8);
  upperClevis.translate(-reach, leverY + rodLength, displayOffset);
  const travelFlag = translatedBox(
    [leverHeight * 1.6, leverHeight * 2.8, leverHeight * 0.9],
    [-reach, leverY + rodLength, displayOffset + leverHeight * 0.7],
  );
  const trigger = mergeOdometerGeometry(
    [tripPin, planeBridge, leverRiser, lever, pivot, travelFlag],
    "trip pin and lever",
  );
  trigger.userData.mechanicaSemantic = {
    kind: "trip-pin-and-lever",
    endpointTravelWitness: true,
    outboardDisplayPlane: displayOffset,
    shaftBridge: true,
    continuousPhysicalChain: true,
    visibleCausalHandoff: true,
  };
  trigger.userData.mechanicaMaterialRole = "transmission-trigger";
  trigger.userData.mechanicaMaterial = {
    color: "#d7a844",
    emissive: "#241603",
    emissiveIntensity: 0.1,
    metalness: 0.68,
    roughness: 0.3,
    textureVariant: "bronze:fresh",
  };
  const pullRod = mergeOdometerGeometry(
    [rod, lowerClevis, upperClevis],
    "clevis-ended pull rod",
  );
  pullRod.userData.mechanicaSemantic = {
    kind: "pull-rod-to-mallet",
    continuousFromLever: true,
    continuousToOutboardMallet: true,
    shoulderClevis: true,
  };
  pullRod.userData.mechanicaMaterialRole = "transmission-link";
  pullRod.userData.mechanicaMaterial = {
    color: "#d7e3df",
    emissive: "#101414",
    emissiveIntensity: 0.08,
    metalness: 0.76,
    roughness: 0.26,
    textureVariant: "iron:cast",
  };
  return [trigger, pullRod];
}

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
  {
    type: "lockstep",
    a: "xiapinglun",
    b: "guanxin-shaft-lower",
    ratio: 1,
    provenance: {
      kind: "wenxian",
      ref: "songshi-ludaolong",
      note: "The recorded through-center shaft turns with the lower wheel and bronze whirlwind wheel.",
    },
  },
  { type: "mesh", a: "xuanfenglun", b: "zhongpinglun" },
  {
    type: "lockstep",
    a: "zhongpinglun",
    b: "xiaopinglun",
    ratio: 1,
    provenance: { kind: "wenxian", ref: "songshi-ludaolong" },
  },
  {
    type: "lockstep",
    a: "zhongpinglun",
    b: "zhongping-shaft",
    ratio: 1,
    provenance: {
      kind: "tuice",
      ref: "songshi-ludaolong",
      note: "The reconstructed one-li trip shaft turns with the middle wheel.",
    },
  },
  { type: "mesh", a: "xiaopinglun", b: "shangpinglun" },
  {
    type: "lockstep",
    a: "shangpinglun",
    b: "shangping-shaft",
    ratio: 1,
    provenance: {
      kind: "tuice",
      ref: "songshi-ludaolong",
      note: "The reconstructed ten-li trip shaft turns with the upper wheel.",
    },
  },
  {
    type: "cam",
    cam: "zhongpinglun",
    follower: "trip-linkage-drum",
    profile: "lift",
    liftHeight: 0.24,
    dwellRatio: 0.08,
    provenance: {
      kind: "tuice",
      ref: "songshi-waiguan",
      note: "The reconstructed trip linkage visibly lifts with the recorded one-li strike cycle.",
    },
  },
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
    follower: "trip-linkage-chime",
    profile: "lift",
    liftHeight: 0.24,
    dwellRatio: 0.08,
    provenance: {
      kind: "tuice",
      ref: "songshi-waiguan",
      note: "The reconstructed trip linkage visibly lifts with the recorded ten-li strike cycle.",
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
    ["chassis-base", "road-axle"],
    ["chassis-base", "road-transfer-witness"],
    ["chassis-base", "platform"],
    ["platform", "canopy-roof"],
    ["platform", "lower-figure-body"],
    ["platform", "upper-figure-body"],
    ["chassis-base", "zhongping-shaft"],
    ["platform", "zhongping-shaft"],
    ["platform", "shangping-shaft"],
    ["platform", "ten-li-instrument-support"],
    ["xiapinglun", "guanxin-shaft-lower"],
    ["xuanfenglun", "guanxin-shaft-lower"],
    ["zhongpinglun", "guanxin-shaft-lower"],
    ["zhongpinglun", "zhongping-shaft"],
    ["xiaopinglun", "zhongping-shaft"],
    ["shangpinglun", "shangping-shaft"],
    ["zhongping-shaft", "trip-linkage-drum"],
    ["shangping-shaft", "trip-linkage-chime"],
    ["lower-figure-body", "trip-linkage-drum"],
    ["lower-figure", "trip-linkage-drum"],
    ["trip-linkage-chime", "upper-figure"],
    ["lower-figure-body", "lower-figure"],
    ["lower-figure", "drum"],
    ["upper-figure-body", "upper-figure"],
    ["upper-figure", "chime"],
    ["li-instrument-support", "drum"],
    ["ten-li-instrument-support", "chime"],
  ],
};

function completedTurns(angle: number): number {
  return Math.floor((Math.abs(angle) + 1e-10) / TWO_PI);
}

function emitCrossedStrikes(
  before: Record<string, number>,
  after: Record<string, number>,
  emit: (type: string, part: string) => void,
  holdResult?: (type: "drum" | "chime") => void,
): void {
  const drumCrossings =
    completedTurns(after.zhongpinglun) - completedTurns(before.zhongpinglun);
  const chimeCrossings =
    completedTurns(after.shangpinglun) - completedTurns(before.shangpinglun);
  for (let crossing = 0; crossing < drumCrossings; crossing += 1) {
    holdResult?.("drum");
    emit("drum", "lower-figure");
  }
  for (let crossing = 0; crossing < chimeCrossings; crossing += 1) {
    holdResult?.("chime");
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
  customBuilders: {
    odometerUnderframe,
    odometerPavilion,
    odometerHipRoof,
    odometerDrawbar,
    odometerFigure,
    odometerMalletArm,
    odometerRotationWitness,
    odometerTripShaft,
    odometerInstrumentStand,
    odometerDrum,
    odometerChime,
    odometerTripLinkage,
  },
  aids: [
    {
      kind: "cutaway",
      partIds: ["chassis-base", "platform"],
      label: {
        zh: "剖开车架与裙板，观察里程轮系",
        en: "Open the chassis and skirt to reveal the distance train",
      },
    },
    {
      kind: "powerPath",
      sequence: [
        "zulun",
        "road-axle",
        "lilun",
        "road-transfer-witness",
        "xiapinglun",
        "guanxin-shaft-lower",
        "lower-gear-witness",
        "xuanfenglun",
        "zhongpinglun",
        "zhongping-shaft",
        "trip-linkage-drum",
        "lower-figure",
        "drum",
      ],
      dwellMs: 520,
    },
    {
      kind: "powerPath",
      sequence: [
        "zulun",
        "road-axle",
        "lilun",
        "road-transfer-witness",
        "xiapinglun",
        "guanxin-shaft-lower",
        "lower-gear-witness",
        "xuanfenglun",
        "zhongpinglun",
        "zhongping-shaft",
        "xiaopinglun",
        "shangpinglun",
        "shangping-shaft",
        "trip-linkage-chime",
        "upper-figure",
        "chime",
      ],
      dwellMs: 520,
    },
    {
      kind: "callouts",
      anchors: [
        {
          partId: "lilun",
          label: { zh: "足轮附十八齿立轮", en: "18-tooth road-wheel gear" },
        },
        {
          partId: "road-transfer-witness",
          label: {
            zh: "足轮轴键套与转动标",
            en: "Keyed axle coupling and motion index",
          },
        },
        {
          partId: "lower-gear-witness",
          label: { zh: "下平轮转动标", en: "Lower-wheel rotation index" },
        },
        {
          partId: "xuanfenglun",
          label: { zh: "三齿旋风轮", en: "3-tooth whirlwind pinion" },
        },
        {
          partId: "trip-linkage-drum",
          label: { zh: "一里拨子与引杆", en: "One-li trip and pull rod" },
        },
        {
          partId: "trip-linkage-chime",
          label: { zh: "十里拨子与引杆", en: "Ten-li trip and pull rod" },
        },
        {
          partId: "drum",
          label: { zh: "每里击鼓", en: "Drum struck each li" },
        },
        {
          partId: "chime",
          label: { zh: "每十里击镯", en: "Chime struck each ten li" },
        },
      ],
    },
    {
      kind: "subDemo",
      triggerId: "spotlight",
      caption: {
        zh: "观察 0.99 里至 1.00 里的下层击鼓路径",
        en: "Watch the lower drum path cross 0.99 to 1.00 li",
      },
    },
    {
      kind: "subDemo",
      triggerId: "ten-li-spotlight",
      caption: {
        zh: "观察 9.99 里至 10.00 里的上层击镯路径",
        en: "Watch the upper chime path cross 9.99 to 10.00 li",
      },
    },
  ],
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
          graph.setInput("lower-figure-body", 0);
          graph.setInput("drum", 0);
          emit("camera:focus", "xuanfenglun");
          emit("highlight:on", "xuanfenglun");
          emit("highlight:on", "zhongpinglun");
          emit("odometer:readout", "0.99-li");
          const before = graph.state();
          emit("drive:slow", "zulun");
          graph.drive("zulun", TWO_PI / 4);
          emit("transmission:advance", "xuanfenglun");
          graph.drive("zulun", TWO_PI / 4);
          emit("mallet:raise", "trip-linkage-drum");
          emit("mallet:raise", "lower-figure");
          graph.drive("zulun", TWO_PI / 2);
          emitCrossedStrikes(before, graph.state(), emit, (type) => {
            if (type !== "drum") return;
            graph.setInput("lower-figure-body", FIGURE_STRIKE_HOLD);
            graph.setInput("drum", DRUM_RESPONSE_HOLD);
          });
          emit("odometer:readout", "1.00-li");
          emit("source", "songshi-ludaolong");
          emit("highlight:off", "xuanfenglun");
          emit("highlight:off", "zhongpinglun");
          emit("spotlight:done", "odometer");
        },
      },
      {
        id: "ten-li-spotlight",
        label: {
          zh: "巧思聚光：十里击镯",
          en: "Spotlight: ten-li chime",
        },
        run(graph, emit) {
          graph.setInput("zulun", 999 * TWO_PI);
          graph.setInput("lower-figure-body", 0);
          graph.setInput("upper-figure-body", 0);
          graph.setInput("drum", 0);
          graph.setInput("chime", 0);
          emit("camera:focus", "shangpinglun");
          emit("highlight:on", "xiaopinglun");
          emit("highlight:on", "shangpinglun");
          emit("highlight:on", "trip-linkage-chime");
          emit("odometer:readout", "9.99-li");
          const before = graph.state();
          emit("drive:slow", "zulun");
          graph.drive("zulun", TWO_PI / 4);
          emit("transmission:advance", "xiaopinglun");
          graph.drive("zulun", TWO_PI / 4);
          emit("mallet:raise", "trip-linkage-chime");
          emit("mallet:raise", "upper-figure");
          graph.drive("zulun", TWO_PI / 2);
          emitCrossedStrikes(before, graph.state(), emit, (type) => {
            if (type === "drum") {
              graph.setInput("lower-figure-body", FIGURE_STRIKE_HOLD);
              graph.setInput("drum", DRUM_RESPONSE_HOLD);
              return;
            }
            graph.setInput("upper-figure-body", UPPER_FIGURE_STRIKE_HOLD);
            graph.setInput("chime", CHIME_RESPONSE_HOLD);
          });
          emit("odometer:readout", "10.00-li");
          emit("source", "songshi-ludaolong");
          emit("highlight:off", "xiaopinglun");
          emit("highlight:off", "shangpinglun");
          emit("highlight:off", "trip-linkage-chime");
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
