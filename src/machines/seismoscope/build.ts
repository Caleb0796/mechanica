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
const BALL_DROP = 0.61;
const FIRED_DRAGON_NOD = 0.24;
const LOCKED_DRAGON_LIFT = -0.18;
const RECEIVING_TOAD_LIFT = 0.44;
const ARMED_GATE_EXTENSION = 0.07;
const SELECTED_GATE_EXTENSION = 0.18;
const LOCKED_GATE_RETRACTION = -0.1;
const CLEARED_LOCK_PAWL = -0.18;
const LOCKED_PAWL_DROP = 0.32;
const ARMED_LOCK_PAWL = -0.08;

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
  envelope?: readonly [number, number, number],
  targetCenter: readonly [number, number, number] = [0, 0, 0],
): THREE.BufferGeometry {
  const composite = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!composite) throw new Error("Unable to merge seismoscope geometry");
  if (!envelope) {
    composite.computeVertexNormals();
    composite.computeBoundingBox();
    composite.computeBoundingSphere();
    return composite;
  }
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
  composite.translate(...targetCenter);
  composite.computeVertexNormals();
  composite.computeBoundingBox();
  composite.computeBoundingSphere();
  return composite;
}

function cylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  radialSegments = 8,
): THREE.BufferGeometry {
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    direction.length(),
    radialSegments,
  );
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    ),
  );
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}

function taperedTubeAlong(
  points: THREE.Vector3[],
  startRadius: number,
  endRadius: number,
  tubularSegments = 20,
  radialSegments = 10,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.45);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const indices: number[] = [];

  for (let segment = 0; segment <= tubularSegments; segment += 1) {
    const t = segment / tubularSegments;
    const center = curve.getPointAt(t);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, t);
    for (let side = 0; side < radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2;
      const offset = frames.normals[segment]
        .clone()
        .multiplyScalar(Math.cos(angle) * radius)
        .add(
          frames.binormals[segment]
            .clone()
            .multiplyScalar(Math.sin(angle) * radius),
        );
      positions.push(
        center.x + offset.x,
        center.y + offset.y,
        center.z + offset.z,
      );
    }
  }
  for (let segment = 0; segment < tubularSegments; segment += 1) {
    for (let side = 0; side < radialSegments; side += 1) {
      const nextSide = (side + 1) % radialSegments;
      const lower = segment * radialSegments + side;
      const lowerNext = segment * radialSegments + nextSide;
      const upper = (segment + 1) * radialSegments + side;
      const upperNext = (segment + 1) * radialSegments + nextSide;
      indices.push(lower, upper, lowerNext, lowerNext, upper, upperNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      new Array((positions.length / 3) * 2).fill(0),
      2,
    ),
  );
  return geometry;
}

function orientAlong(
  geometry: THREE.BufferGeometry,
  fromAxis: THREE.Vector3,
  direction: THREE.Vector3,
): THREE.BufferGeometry {
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      fromAxis,
      direction.clone().normalize(),
    ),
  );
  return geometry;
}

function pitchAround(
  geometry: THREE.BufferGeometry,
  pivot: THREE.Vector3,
  angle: number,
): THREE.BufferGeometry {
  geometry.translate(-pivot.x, -pivot.y, -pivot.z);
  geometry.rotateX(angle);
  geometry.translate(pivot.x, pivot.y, pivot.z);
  return geometry;
}

function flaredMountCollar(
  radius: number,
  centerY: number,
  surfaceZ: number,
): THREE.BufferGeometry {
  const radialSegments = 18;
  const neckRadius = radius * 0.77;
  const baseRadiusX = neckRadius * 1.3;
  const baseRadiusY = neckRadius * 1.18;
  const depth = radius * 0.28;
  const positions = [0, centerY, surfaceZ];
  const indices: number[] = [];

  const rings = [
    { radiusX: baseRadiusX, radiusY: baseRadiusY, rise: 0 },
    {
      radiusX: neckRadius * 1.12,
      radiusY: neckRadius * 1.02,
      rise: depth * 0.62,
    },
    { radiusX: neckRadius, radiusY: neckRadius * 0.9, rise: depth },
  ];
  for (const [ringIndex, ring] of rings.entries()) {
    for (let side = 0; side < radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2;
      const x = Math.cos(angle) * ring.radiusX;
      const y = Math.sin(angle) * ring.radiusY;
      const curvatureSag =
        ringIndex === 0
          ? Math.min(
              (x * x) / (radius * 10.8) +
                (y * y) / (radius * 8.2),
              radius * 0.025,
            )
          : 0;
      positions.push(x, centerY + y, surfaceZ + ring.rise - curvatureSag);
    }
  }
  const topCenter = 1 + radialSegments * rings.length;
  positions.push(0, centerY, surfaceZ + depth);
  for (let side = 0; side < radialSegments; side += 1) {
    const nextSide = (side + 1) % radialSegments;
    const base = 1 + side;
    const baseNext = 1 + nextSide;
    indices.push(0, baseNext, base);
    for (let ring = 0; ring < rings.length - 1; ring += 1) {
      const lower = 1 + ring * radialSegments + side;
      const lowerNext = 1 + ring * radialSegments + nextSide;
      const upper = lower + radialSegments;
      const upperNext = lowerNext + radialSegments;
      indices.push(lower, lowerNext, upper, upper, lowerNext, upperNext);
    }
    const top = 1 + (rings.length - 1) * radialSegments + side;
    const topNext = 1 + (rings.length - 1) * radialSegments + nextSide;
    indices.push(topCenter, top, topNext);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      new Array((positions.length / 3) * 2).fill(0),
      2,
    ),
  );
  return geometry;
}

function taperedWedge(
  sections: Array<{
    center: THREE.Vector3;
    halfWidth: number;
    halfHeight: number;
  }>,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (const section of sections) {
    positions.push(
      section.center.x - section.halfWidth,
      section.center.y - section.halfHeight,
      section.center.z,
      section.center.x + section.halfWidth,
      section.center.y - section.halfHeight,
      section.center.z,
      section.center.x + section.halfWidth,
      section.center.y + section.halfHeight,
      section.center.z,
      section.center.x - section.halfWidth,
      section.center.y + section.halfHeight,
      section.center.z,
    );
  }
  indices.push(0, 2, 1, 0, 3, 2);
  for (let section = 0; section < sections.length - 1; section += 1) {
    const base = section * 4;
    const next = base + 4;
    for (let side = 0; side < 4; side += 1) {
      const nextSide = (side + 1) % 4;
      indices.push(
        base + side,
        next + side,
        base + nextSide,
        base + nextSide,
        next + side,
        next + nextSide,
      );
    }
  }
  const end = (sections.length - 1) * 4;
  indices.push(end, end + 1, end + 2, end, end + 2, end + 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      new Array((positions.length / 3) * 2).fill(0),
      2,
    ),
  );
  return geometry;
}

function openFrustumBetween(
  throat: THREE.Vector3,
  mouth: THREE.Vector3,
  throatRadius: number,
  mouthRadius: number,
  radialSegments = 20,
): THREE.BufferGeometry {
  const direction = mouth.clone().sub(throat);
  const geometry = new THREE.CylinderGeometry(
    mouthRadius,
    throatRadius,
    direction.length(),
    radialSegments,
    1,
    true,
  );
  orientAlong(geometry, new THREE.Vector3(0, 1, 0), direction);
  const midpoint = throat.clone().add(mouth).multiplyScalar(0.5);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}

function setGeometryPresentation(
  geometry: THREE.BufferGeometry,
  material: Record<string, unknown>,
  semantic: Record<string, unknown>,
): THREE.BufferGeometry {
  geometry.userData.mechanicaMaterial = material;
  geometry.userData.mechanicaSemantic = semantic;
  return geometry;
}

function seismoscopeVessel(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const { radius, wallThickness } = params;
  const profile = [
    [radius * 0.56, -0.9],
    [radius * 0.63, -0.82],
    [radius * 0.67, -0.68],
    [radius * 0.9, -0.42],
    [radius, -0.2],
    [radius * 0.93, 0.06],
    [radius * 0.79, 0.28],
    [radius * 0.7, 0.48],
    [radius * 0.76, 0.58],
  ] as const;
  const points = [
    ...profile.map(([profileRadius, height]) =>
      new THREE.Vector2(profileRadius, height),
    ),
    ...profile
      .slice()
      .reverse()
      .map(([profileRadius, height]) =>
        new THREE.Vector2(profileRadius - wallThickness, height),
      ),
  ];
  const body = new THREE.LatheGeometry(points, 64);
  const bands = [-0.42, -0.05, 0.3].map((height) =>
    placeGeometry(
      new THREE.TorusGeometry(
        height === -0.42 ? radius * 0.9 : radius * 0.8,
        0.012,
        6,
        64,
      ),
      [1, 1, 1],
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    ),
  );
  return setGeometryPresentation(
    mergeComposite([body, ...bands]),
    {
      color: "#60765f",
      metalness: 0.78,
      roughness: 0.58,
      textureVariant: "bronze:excavated",
    },
    {
      kind: "zun-vessel",
      features: ["ring-foot", "bulged-belly", "shoulder", "neck", "rim"],
      recordedDiameter: radius * 2,
    },
  );
}

function seismoscopeLid(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const dome = new THREE.LatheGeometry(
    [
      new THREE.Vector2(params.radius, 0),
      new THREE.Vector2(params.radius * 0.96, params.height * 0.16),
      new THREE.Vector2(params.radius * 0.78, params.height * 0.5),
      new THREE.Vector2(params.radius * 0.42, params.height * 0.82),
      new THREE.Vector2(params.apertureRadius, params.height),
    ],
    64,
  );
  const rim = new THREE.TorusGeometry(params.radius, 0.025, 8, 64).rotateX(
    Math.PI / 2,
  );
  const apertureRim = new THREE.TorusGeometry(
    params.apertureRadius,
    params.knobRadius * 0.16,
    8,
    32,
  )
    .rotateX(Math.PI / 2)
    .translate(0, params.height, 0);
  const sleeveHeight = params.knobRadius;
  const finialStem = new THREE.LatheGeometry(
    [
      new THREE.Vector2(params.apertureRadius, params.height),
      new THREE.Vector2(params.knobRadius * 1.25, params.height),
      new THREE.Vector2(
        params.knobRadius * 1.08,
        params.height + sleeveHeight,
      ),
      new THREE.Vector2(
        params.apertureRadius,
        params.height + sleeveHeight,
      ),
      new THREE.Vector2(params.apertureRadius, params.height),
    ],
    32,
  );
  const finial = new THREE.TorusGeometry(
    params.knobRadius * 1.2,
    params.knobRadius * 0.26,
    10,
    32,
  )
    .rotateX(Math.PI / 2)
    .translate(0, params.height + params.knobRadius * 1.62, 0);
  return setGeometryPresentation(
    mergeComposite([dome, rim, apertureRim, finialStem, finial]),
    {
      color: "#60765f",
      metalness: 0.8,
      roughness: 0.52,
      textureVariant: "bronze:excavated",
    },
    {
      kind: "domed-zun-lid",
      features: [
        "domed-cover",
        "central-bearing-aperture",
        "annular-finial",
      ],
    },
  );
}

function seismoscopePlinth(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const lowerBottom = -params.height * 0.5;
  const tierBreak = params.height * 0.02;
  const upperTop = params.height * 0.5;
  const lower = new THREE.LatheGeometry(
    [
      new THREE.Vector2(params.boreRadius, lowerBottom),
      new THREE.Vector2(params.radius, lowerBottom),
      new THREE.Vector2(params.radius, tierBreak),
      new THREE.Vector2(params.boreRadius, tierBreak),
      new THREE.Vector2(params.boreRadius, lowerBottom),
    ],
    64,
  );
  const upper = new THREE.LatheGeometry(
    [
      new THREE.Vector2(params.boreRadius, tierBreak),
      new THREE.Vector2(params.radius * 0.9, tierBreak),
      new THREE.Vector2(params.radius * 0.86, upperTop),
      new THREE.Vector2(params.boreRadius, upperTop),
      new THREE.Vector2(params.boreRadius, tierBreak),
    ],
    64,
  );
  const bearingRing = new THREE.TorusGeometry(
    params.radius * 0.9,
    params.height * 0.035,
    6,
    64,
  )
    .rotateX(Math.PI / 2)
    .translate(0, params.height * 0.51, 0);
  const wellRim = new THREE.TorusGeometry(
    params.boreRadius,
    params.height * 0.045,
    6,
    32,
  )
    .rotateX(Math.PI / 2)
    .translate(0, upperTop, 0);
  return setGeometryPresentation(
    mergeComposite([lower, upper, bearingRing, wellRim]),
    {
      color: "#4f604e",
      metalness: 0.58,
      roughness: 0.68,
      textureVariant: "bronze:excavated",
    },
    {
      kind: "stepped-plinth",
      features: [
        "lower-tier",
        "toad-tier",
        "bearing-ring",
        "central-duzhu-well",
      ],
    },
  );
}

function seismoscopeFloor(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const halfThickness = params.thickness / 2;
  const plate = new THREE.LatheGeometry(
    [
      new THREE.Vector2(params.boreRadius, -halfThickness),
      new THREE.Vector2(params.radius, -halfThickness),
      new THREE.Vector2(params.radius, halfThickness),
      new THREE.Vector2(params.boreRadius, halfThickness),
      new THREE.Vector2(params.boreRadius, -halfThickness),
    ],
    48,
  );
  const bossHeight = params.thickness * 1.8;
  const boss = new THREE.LatheGeometry(
    [
      new THREE.Vector2(params.boreRadius, 0),
      new THREE.Vector2(params.bossRadius * 1.18, 0),
      new THREE.Vector2(params.bossRadius, bossHeight),
      new THREE.Vector2(params.boreRadius, bossHeight),
      new THREE.Vector2(params.boreRadius, 0),
    ],
    24,
  );
  return setGeometryPresentation(
    mergeComposite([plate, boss]),
    {
      color: "#765f3f",
      metalness: 0.7,
      roughness: 0.62,
      textureVariant: "bronze:openwork",
    },
    {
      kind: "mechanism-floor",
      features: [
        "annular-floor-plate",
        "central-bearing-bore",
        "central-pivot-boss",
      ],
    },
  );
}

function seismoscopeLinkage(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(
      params.innerRadius * 0.65,
      params.rodRadius * 1.3,
      6,
      32,
    )
      .rotateX(Math.PI / 2)
      .translate(0, params.baseHeight, 0),
  ];
  for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
    const angle = (bearing * Math.PI) / 4;
    const radial = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const witnessStart = radial.clone().multiplyScalar(params.innerRadius * 0.72);
    witnessStart.y = params.baseHeight;
    const witnessEnd = radial.clone().multiplyScalar(params.innerRadius * 0.94);
    witnessEnd.y = params.baseHeight;
    parts.push(
      cylinderBetween(witnessStart, witnessEnd, params.rodRadius * 0.72),
      new THREE.SphereGeometry(params.rodRadius * 1.2, 8, 6).translate(
        witnessEnd.x,
        witnessEnd.y,
        witnessEnd.z,
      ),
    );
  }
  return setGeometryPresentation(
    mergeComposite(parts),
    {
      color: "#6f6046",
      metalness: 0.72,
      roughness: 0.58,
      textureVariant: "bronze:openwork",
    },
    {
      kind: "eight-direction-selector-collar",
      features: [
        "central-collar",
        "eight-direction-witness-stubs",
        "separated-gate-sockets",
      ],
      pathCount: DIRECTION_COUNT,
    },
  );
}

function seismoscopeGateLink(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const start = new THREE.Vector3(0, params.baseHeight, params.rodRadius * 2.25);
  const pivot = new THREE.Vector3(
    0,
    params.baseHeight + params.gateRise,
    params.gateRadius - params.innerRadius,
  );
  const end = new THREE.Vector3(
    0,
    params.pushrodTop,
    params.wallRadius - params.innerRadius,
  );
  const vane = placeGeometry(
    new THREE.BoxGeometry(
      params.rodRadius * 6.8,
      params.rodRadius * 9,
      params.rodRadius * 3.6,
    ),
    [1, 1, 1],
    [0, end.y, end.z],
  );
  const signalBoss = new THREE.SphereGeometry(
    params.rodRadius * 1.9,
    12,
    8,
  ).translate(0, end.y, end.z + params.rodRadius);
  return setGeometryPresentation(
    mergeComposite([
      cylinderBetween(start, pivot, params.rodRadius),
      cylinderBetween(pivot, end, params.rodRadius * 0.72),
      new THREE.SphereGeometry(params.rodRadius * 1.8, 10, 6).translate(
        pivot.x,
        pivot.y,
        pivot.z,
      ),
      vane,
      signalBoss,
    ]),
    {
      color: "#d8aa48",
      metalness: 0.94,
      roughness: 0.24,
      textureVariant: "bronze:gilded",
    },
    {
      kind: "directional-gate-pushrod",
      forward: [0, 0, 1],
      features: [
        "gate-input-rod",
        "directional-hinge",
        "dragon-release-pushrod",
        "visible-output-vane",
        "high-contrast-signal-boss",
      ],
    },
  );
}

function seismoscopeLockPawl(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const axle = placeGeometry(
    new THREE.CylinderGeometry(
      params.pinRadius,
      params.pinRadius,
      params.width,
      10,
    ),
    [1, 1, 1],
    [0, 0, 0],
    [0, 0, Math.PI / 2],
  );
  const pawl = placeGeometry(
    new THREE.BoxGeometry(
      params.width * 0.86,
      params.height * 1.1,
      params.depth * 0.48,
    ),
    [1, 1, 1],
    [0, -params.height * 0.12, 0],
  );
  const hook = placeGeometry(
    new THREE.BoxGeometry(
      params.width * 1.12,
      params.height * 0.36,
      params.depth * 1.1,
    ),
    [1, 1, 1],
    [0, -params.height * 0.57, params.depth * 0.2],
  );
  return setGeometryPresentation(
    mergeComposite([axle, pawl, hook]),
    {
      color: "#303438",
      metalness: 0.62,
      roughness: 0.66,
      textureVariant: "iron:cast",
    },
    {
      kind: "directional-lock-pawl",
      forward: [0, 0, 1],
      features: [
        "guide-crossbar",
        "drop-pawl",
        "deep-drop-hook",
        "gate-retaining-hook",
      ],
    },
  );
}

function seismoscopeDragon(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const radius = params.radius;
  const length = radius * 3.5;
  const headPitch = THREE.MathUtils.degToRad(27);
  const headPivot = new THREE.Vector3(0, radius * 0.16, -radius * 0.12);
  const jawAngle = THREE.MathUtils.degToRad(19);
  const jawLength = length * 0.35;
  const jawHinge = new THREE.Vector3(0, radius * 0.3, radius * 0.3);
  const jawNormal = new THREE.Vector3(
    0,
    Math.cos(jawAngle),
    Math.sin(jawAngle),
  );
  const mountCenterY = -radius * 0.34;
  const mountSurfaceZ = -radius * 2.155;
  const mountCrownZ = mountSurfaceZ + radius * 0.28;
  const jawTip = jawHinge
    .clone()
    .add(
      new THREE.Vector3(
        0,
        -Math.sin(jawAngle) * jawLength,
        Math.cos(jawAngle) * jawLength,
      ),
    );
  const lipCenter = jawHinge
    .clone()
    .lerp(jawTip, 0.88)
    .addScaledVector(jawNormal, radius * 0.17);
  const parts = [
    flaredMountCollar(radius, mountCenterY, mountSurfaceZ),
    taperedTubeAlong(
      [
        new THREE.Vector3(0, mountCenterY, mountCrownZ),
        new THREE.Vector3(radius * 0.12, -radius * 0.76, -radius * 0.86),
        new THREE.Vector3(-radius * 0.12, -radius * 0.12, -radius * 0.44),
        new THREE.Vector3(0, radius * 0.16, -radius * 0.12),
      ],
      length * 0.22,
      length * 0.16,
      28,
      12,
    ),
    pitchAround(
      placeGeometry(
        new THREE.SphereGeometry(1, 20, 14),
        [length * 0.2185, radius * 0.62, length * 0.225],
        [0, radius * 0.48, -radius * 0.02],
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedWedge([
        {
          center: new THREE.Vector3(0, radius * 0.38, -radius * 0.1),
          halfWidth: radius * 0.67,
          halfHeight: radius * 0.34,
        },
        {
          center: new THREE.Vector3(0, radius * 0.38, radius * 0.78),
          halfWidth: radius * 0.56,
          halfHeight: radius * 0.29,
        },
        {
          center: new THREE.Vector3(0, radius * 0.34, radius * 1.68),
          halfWidth: radius * 0.43,
          halfHeight: radius * 0.18,
        },
      ]),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedWedge([
        {
          center: jawHinge,
          halfWidth: radius * 0.62,
          halfHeight: radius * 0.12,
        },
        {
          center: jawHinge.clone().lerp(jawTip, 0.55),
          halfWidth: radius * 0.56,
          halfHeight: radius * 0.135,
        },
        {
          center: jawTip,
          halfWidth: radius * 0.48,
          halfHeight: radius * 0.14,
        },
      ]),
      headPivot,
      headPitch,
    ),
    ...[-1, 1].map((side) =>
      pitchAround(
        placeGeometry(
          new THREE.BoxGeometry(radius * 0.08, radius * 0.1, radius * 0.3),
          [1, 1, 1],
          [side * radius * 0.52, lipCenter.y, lipCenter.z],
          [jawAngle, 0, 0],
        ),
        headPivot,
        headPitch,
      ),
    ),
    pitchAround(
      cylinderBetween(
        jawHinge
          .clone()
          .lerp(jawTip, 0.46)
          .add(new THREE.Vector3(-radius * 0.52, 0, 0)),
        jawTip.clone().add(new THREE.Vector3(-radius * 0.48, 0, 0)),
        radius * 0.06,
        8,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      cylinderBetween(
        jawHinge
          .clone()
          .lerp(jawTip, 0.46)
          .add(new THREE.Vector3(radius * 0.52, 0, 0)),
        jawTip.clone().add(new THREE.Vector3(radius * 0.48, 0, 0)),
        radius * 0.06,
        8,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      placeGeometry(
        new THREE.SphereGeometry(radius * 0.12, 12, 8),
        [1, 1, 1],
        [-radius * 0.43, radius * 0.82, radius * 0.55],
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      placeGeometry(
        new THREE.SphereGeometry(radius * 0.12, 12, 8),
        [1, 1, 1],
        [radius * 0.43, radius * 0.82, radius * 0.55],
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedTubeAlong(
        [
          new THREE.Vector3(-radius * 0.63, radius * 0.88, radius * 0.2),
          new THREE.Vector3(-radius * 0.46, radius * 0.98, radius * 0.48),
          new THREE.Vector3(-radius * 0.23, radius * 0.91, radius * 0.75),
        ],
        length * 0.05,
        length * 0.04,
        12,
        8,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedTubeAlong(
        [
          new THREE.Vector3(radius * 0.63, radius * 0.88, radius * 0.2),
          new THREE.Vector3(radius * 0.46, radius * 0.98, radius * 0.48),
          new THREE.Vector3(radius * 0.23, radius * 0.91, radius * 0.75),
        ],
        length * 0.05,
        length * 0.04,
        12,
        8,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      placeGeometry(
        new THREE.SphereGeometry(length * 0.04, 10, 8),
        [1, 0.72, 1],
        [-radius * 0.27, radius * 0.34, radius * 1.6],
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      placeGeometry(
        new THREE.SphereGeometry(length * 0.04, 10, 8),
        [1, 0.72, 1],
        [radius * 0.27, radius * 0.34, radius * 1.6],
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedTubeAlong(
        [
          new THREE.Vector3(-radius * 0.5, radius * 0.78, -radius * 0.1),
          new THREE.Vector3(-radius * 0.7, radius * 0.86, -radius * 0.54),
          new THREE.Vector3(-radius * 0.85, radius * 0.85, -radius * 0.9),
        ],
        length * 0.05,
        radius * 0.03,
        18,
        9,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedTubeAlong(
        [
          new THREE.Vector3(radius * 0.5, radius * 0.78, -radius * 0.1),
          new THREE.Vector3(radius * 0.7, radius * 0.86, -radius * 0.54),
          new THREE.Vector3(radius * 0.85, radius * 0.85, -radius * 0.9),
        ],
        length * 0.05,
        radius * 0.03,
        18,
        9,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedTubeAlong(
        [
          new THREE.Vector3(-radius * 0.45, radius * 0.18, radius * 1.05),
          new THREE.Vector3(-radius * 0.78, radius * 0.04, radius * 0.92),
          new THREE.Vector3(-radius * 1.05, -radius * 0.05, radius * 0.75),
        ],
        radius * 0.035,
        radius * 0.008,
        12,
        7,
      ),
      headPivot,
      headPitch,
    ),
    pitchAround(
      taperedTubeAlong(
        [
          new THREE.Vector3(radius * 0.45, radius * 0.18, radius * 1.05),
          new THREE.Vector3(radius * 0.78, radius * 0.04, radius * 0.92),
          new THREE.Vector3(radius * 1.05, -radius * 0.05, radius * 0.75),
        ],
        radius * 0.035,
        radius * 0.008,
        12,
        7,
      ),
      headPivot,
      headPitch,
    ),
  ];
  return setGeometryPresentation(
    mergeComposite(parts),
    {
      color: "#a9783f",
      metalness: 0.9,
      roughness: 0.34,
      textureVariant: "bronze:fresh",
    },
    {
      kind: "chinese-dragon-head",
      forward: [0, 0, 1],
      envelope: [radius * 3.5, radius * 2.8, radius * 3.73],
      headPitchDeg: 27,
      jawAngleDeg: 19,
      jawGapRatio: 0.34,
      maneFinCount: 0,
      sideLipCount: 2,
      snoutLengthRatio: 0.51,
      features: [
        "connected-neck-root",
        "connected-neck-flare",
        "solid-mount-plate",
        "integrated-gold-dome",
        "cranial-mass",
        "down-pitched-head",
        "upper-jaw",
        "elongated-upper-snout",
        "deep-open-jaw-gap",
        "long-cranial-axis",
        "swept-neck-profile",
        "jaw-hinge",
        "open-lower-jaw",
        "ball-cradle",
        "side-lip-plates",
        "backward-horns",
        "whiskers",
        "short-curved-whiskers",
        "brow-eyes",
        "arched-brows",
        "paired-nostrils",
        "visible-tongue",
        "side-ears",
      ],
    },
  );
}

function seismoscopeToad(
  params: Record<string, number>,
): THREE.BufferGeometry[] {
  const radius = params.radius;
  const height = radius * 2;
  const mouth = new THREE.Vector3(0, radius * 0.27, -radius * 0.94);
  const mouthDirection = new THREE.Vector3(
    0,
    Math.sin(THREE.MathUtils.degToRad(35)),
    -Math.cos(THREE.MathUtils.degToRad(35)),
  );
  const throat = mouth.clone().addScaledVector(mouthDirection, -radius * 0.62);
  const rimThroat = mouth
    .clone()
    .addScaledVector(mouthDirection, -radius * 0.08);
  const parts = [
    placeGeometry(
      new THREE.SphereGeometry(1, 20, 14),
      [height * 0.5, height * 0.275, radius * 0.68],
      [0, -radius * 0.32, -radius * 0.2],
      [THREE.MathUtils.degToRad(15), 0, 0],
    ),
    openFrustumBetween(throat, mouth, radius * 0.32, radius * 0.565, 24),
    openFrustumBetween(
      rimThroat,
      mouth,
      radius * 0.565,
      radius * 0.65,
      24,
    ),
    placeGeometry(
      new THREE.SphereGeometry(height * 0.09, 12, 9),
      [1, 1, 0.88],
      [-radius * 0.42, radius * 0.42, -radius * 0.55],
    ),
    placeGeometry(
      new THREE.SphereGeometry(height * 0.09, 12, 9),
      [1, 1, 0.88],
      [radius * 0.42, radius * 0.42, -radius * 0.55],
    ),
    placeGeometry(
      new THREE.SphereGeometry(1, 16, 10),
      [radius * 0.32, height * 0.125, radius * 0.38],
      [-radius * 0.78, -radius * 0.62, radius * 0.05],
    ),
    placeGeometry(
      new THREE.SphereGeometry(1, 16, 10),
      [radius * 0.32, height * 0.125, radius * 0.38],
      [radius * 0.78, -radius * 0.62, radius * 0.05],
    ),
    cylinderBetween(
      new THREE.Vector3(-radius * 0.5, -radius * 0.04, -radius * 0.45),
      new THREE.Vector3(-radius * 0.62, -radius * 0.74, -radius * 0.72),
      height * 0.075,
      10,
    ),
    cylinderBetween(
      new THREE.Vector3(radius * 0.5, -radius * 0.04, -radius * 0.45),
      new THREE.Vector3(radius * 0.62, -radius * 0.74, -radius * 0.72),
      height * 0.075,
      10,
    ),
  ];
  const goldSculpt = setGeometryPresentation(
    mergeComposite(parts),
    {
      color: "#a9783f",
      metalness: 0.86,
      roughness: 0.42,
      textureVariant: "bronze:fresh",
    },
    {
      kind: "open-mouthed-toad",
      forward: [0, 0, -1],
      catchAxis: mouthDirection.toArray(),
      features: [
        "crouched-body",
        "single-dome-body",
        "raised-chest",
        "upturned-open-mouth",
        "funnel-mouth",
        "flared-funnel-rim",
        "broad-lower-lip",
        "eyes",
        "haunches",
        "front-props",
        "folded-hind-haunches",
        "planted-feet",
        "four-limb-crouch",
      ],
    },
  );
  const shadowCenter = throat.clone().addScaledVector(mouthDirection, radius * 0.02);
  const mouthShadow = orientAlong(
    new THREE.CircleGeometry(radius * 0.3, 24),
    new THREE.Vector3(0, 0, 1),
    mouthDirection,
  ).translate(shadowCenter.x, shadowCenter.y, shadowCenter.z);
  setGeometryPresentation(
    mouthShadow,
    {
      color: "#17120f",
      metalness: 0.18,
      roughness: 0.82,
      textureVariant: "iron:cast",
    },
    {
      kind: "toad-mouth-shadow",
      forward: mouthDirection.toArray(),
    },
  );
  return [goldSculpt, mouthShadow];
}

function seismoscopeStandingDuzhu(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const shaft = new THREE.CylinderGeometry(
    params.radius * 0.72,
    params.radius,
    params.length,
    16,
  );
  const pivot = new THREE.SphereGeometry(params.radius * 1.35, 12, 8).translate(
    0,
    -params.length / 2,
    0,
  );
  const capital = new THREE.CylinderGeometry(
    params.capitalRadius,
    params.capitalRadius * 0.8,
    params.capitalRadius * 0.42,
    18,
  ).translate(0, params.length * 0.38, 0);
  const crown = new THREE.SphereGeometry(
    params.capitalRadius * 0.7,
    16,
    10,
  ).translate(0, params.length * 0.43, 0);
  return setGeometryPresentation(
    mergeComposite([shaft, pivot, capital, crown]),
    {
      color: "#7d6748",
      metalness: 0.82,
      roughness: 0.42,
      textureVariant: "bronze:openwork",
    },
    {
      kind: "standing-inverted-pendulum",
      features: ["floor-pivot", "tapered-column", "top-heavy-capital"],
    },
  );
}

function seismoscopeSuspendedDuzhu(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const rod = new THREE.CylinderGeometry(
    params.radius * 0.45,
    params.radius * 0.45,
    params.length,
    12,
  );
  const bob = new THREE.SphereGeometry(params.bobRadius, 20, 12)
    .scale(1, 1.4, 1)
    .translate(0, -params.length * 0.34, 0);
  const beam = new THREE.BoxGeometry(
    params.beamWidth,
    params.radius * 1.5,
    params.radius * 1.5,
  ).translate(0, params.length / 2 + params.beamLift, 0);
  const suspensionExtension = new THREE.CylinderGeometry(
    params.radius * 0.45,
    params.radius * 0.45,
    params.beamLift,
    12,
  ).translate(0, params.length / 2 + params.beamLift / 2, 0);
  const hook = new THREE.TorusGeometry(
    params.radius * 1.1,
    params.radius * 0.22,
    6,
    18,
    Math.PI * 1.5,
  )
    .rotateZ(Math.PI / 2)
    .translate(0, params.length / 2 + params.beamLift * 0.82, 0);
  return setGeometryPresentation(
    mergeComposite([rod, bob, beam, suspensionExtension, hook]),
    {
      color: "#b28b42",
      metalness: 0.9,
      roughness: 0.3,
      textureVariant: "bronze:gilded",
    },
    {
      kind: "suspended-pendulum",
      features: [
        "suspension-crossbeam",
        "raised-suspension-crossbeam",
        "through-aperture-suspension-extension",
        "hook",
        "thin-rod",
        "low-heavy-bob",
      ],
    },
  );
}

function seismoscopeTrack(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const floor = new THREE.BoxGeometry(
    params.length,
    params.height * 0.3,
    params.width,
  ).translate(0, -params.height * 0.35, 0);
  const railOffset = params.width * 0.41;
  const left = new THREE.BoxGeometry(
    params.length,
    params.height,
    params.width * 0.18,
  ).translate(0, 0, -railOffset);
  const right = new THREE.BoxGeometry(
    params.length,
    params.height,
    params.width * 0.18,
  ).translate(0, 0, railOffset);
  return setGeometryPresentation(
    mergeComposite([floor, left, right]),
    {
      color: "#796145",
      metalness: 0.76,
      roughness: 0.48,
      textureVariant: "bronze:openwork",
    },
    {
      kind: "directional-u-channel",
      features: ["channel-floor", "raised-rails"],
    },
  );
}

function seismoscopeWangChute(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const geometry = seismoscopeTrack(params);
  geometry.userData.mechanicaMaterial = {
    color: "#765f3f",
    metalness: 0.76,
    roughness: 0.54,
    textureVariant: "bronze:openwork",
  };
  geometry.userData.mechanicaSemantic = {
    kind: "wang-standing-column-chute",
    features: ["broad-u-channel", "standing-column-stop"],
  };
  return geometry;
}

function seismoscopeFengTrack(
  params: Record<string, number>,
): THREE.BufferGeometry {
  const geometry = seismoscopeTrack(params);
  geometry.userData.mechanicaMaterial = {
    color: "#c09a4d",
    metalness: 0.9,
    roughness: 0.28,
    textureVariant: "bronze:gilded",
  };
  geometry.userData.mechanicaSemantic = {
    kind: "feng-suspended-pendulum-track",
    features: ["paired-ball-rails", "suspended-pendulum-path"],
  };
  return geometry;
}

function droppedBearing(graph: IKinematicGraph): number | undefined {
  const state = graph.state();
  for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
    if (state[`ball-${bearing}`] > 0) return bearing;
  }
  return undefined;
}

function releaseBall(graph: IKinematicGraph, bearing: number): void {
  const state = graph.state();
  if ("linkage-crown" in state) graph.setInput("linkage-crown", 0.08);
  graph.setInput(`dragon-${bearing}`, FIRED_DRAGON_NOD);
  graph.setInput(`toad-${bearing}`, RECEIVING_TOAD_LIFT);
  if (`gate-${bearing}` in state) {
    graph.setInput(`gate-${bearing}`, SELECTED_GATE_EXTENSION);
  }
  if (`lock-${bearing}` in state) {
    graph.setInput(`lock-${bearing}`, CLEARED_LOCK_PAWL);
  }
  graph.setInput(`ball-${bearing}`, BALL_DROP);
}

function lockOtherDirections(
  graph: IKinematicGraph,
  firedBearing: number,
  emit: (type: string, part: string) => void,
): void {
  const state = graph.state();
  for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
    if (bearing === firedBearing) continue;
    graph.setInput(`dragon-${bearing}`, LOCKED_DRAGON_LIFT);
    if (`gate-${bearing}` in state) {
      graph.setInput(`gate-${bearing}`, LOCKED_GATE_RETRACTION);
    }
    if (`lock-${bearing}` in state) {
      graph.setInput(`lock-${bearing}`, LOCKED_PAWL_DROP);
    }
    emit("locked", `lock-${bearing}`);
  }
}

function armBearing(graph: IKinematicGraph, bearing: number): void {
  const state = graph.state();
  graph.setInput("vessel", (bearing * Math.PI) / 4);
  if ("linkage-crown" in state) graph.setInput("linkage-crown", 0.04);
  if ("duzhu" in state) {
    graph.setInput("duzhu", "wang-chute-0" in state ? 0.02 : 0.08);
  }
  for (let direction = 0; direction < DIRECTION_COUNT; direction += 1) {
    if (`gate-${direction}` in state) {
      graph.setInput(
        `gate-${direction}`,
        direction === bearing ? ARMED_GATE_EXTENSION : 0,
      );
    }
    if (`lock-${direction}` in state) {
      graph.setInput(
        `lock-${direction}`,
        direction === bearing ? ARMED_LOCK_PAWL : 0,
      );
    }
  }
}

function armedBearing(graph: IKinematicGraph): number | undefined {
  const state = graph.state();
  for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
    if (
      Math.abs((state[`gate-${bearing}`] ?? 0) - ARMED_GATE_EXTENSION) < 1e-9
    ) {
      return bearing;
    }
  }
  return undefined;
}

function resetBearingState(graph: IKinematicGraph): void {
  const state = graph.state();
  graph.setInput("vessel", 0);
  if ("linkage-crown" in state) graph.setInput("linkage-crown", 0);
  if ("duzhu" in state) graph.setInput("duzhu", 0);
  for (let bearing = 0; bearing < DIRECTION_COUNT; bearing += 1) {
    graph.setInput(`dragon-${bearing}`, 0);
    graph.setInput(`toad-${bearing}`, 0);
    graph.setInput(`ball-${bearing}`, 0);
    if (`gate-${bearing}` in state) graph.setInput(`gate-${bearing}`, 0);
    if (`lock-${bearing}` in state) graph.setInput(`lock-${bearing}`, 0);
  }
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
  emit("highlight:on", `gate-${bearing}`);
  emit("highlight:on", `ball-${bearing}`);
  emit("highlight:on", `toad-${bearing}`);
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
        armBearing(graph, WEST_BEARING);
        emit("drive", `gate-${WEST_BEARING}`);
        emit("pulse", "duzhu");
        if (respondToPulse(graph, WEST_BEARING, emit)) {
          emit("caption:quake-report", `dragon-${WEST_BEARING}`);
          lockOtherDirections(graph, WEST_BEARING, emit);
          emit("caption:quake-reset-hint", "linkage-crown");
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
          armedBearing(graph) ??
          (typeof param === "number" &&
            Number.isInteger(param) &&
            param >= 0 &&
            param < DIRECTION_COUNT
            ? param
            : WEST_BEARING);
        graph.setInput("vessel", (bearing * Math.PI) / 4);
        emit("pulse", "vessel");
        if (droppedBearing(graph) === undefined) {
          armBearing(graph, bearing);
          emit("drive", `gate-${bearing}`);
        }
        if (respondToPulse(graph, bearing, emit)) {
          emit("caption:quake-report", `dragon-${bearing}`);
          lockOtherDirections(graph, bearing, emit);
          emit("caption:quake-reset-hint", "linkage-crown");
        }
      },
    },
    {
      id: "quake:arm",
      label: { zh: "预备方位关机", en: "Arm a directional gate" },
      run(graph, emit, param) {
        const bearing =
          typeof param === "number" &&
          Number.isInteger(param) &&
          param >= 0 &&
          param < DIRECTION_COUNT
            ? param
            : WEST_BEARING;
        armBearing(graph, bearing);
        emit("drive", `gate-${bearing}`);
        emit("pulse", "duzhu");
      },
    },
    {
      id: "quake:reset",
      label: { zh: "复位八向关机", en: "Reset all eight directions" },
      run(graph, emit) {
        resetBearingState(graph);
        emit("reset", "linkage-crown");
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
  aids: [
    {
      kind: "cutaway",
      partIds: ["vessel"],
      label: { zh: "透视尊内八道关机", en: "Reveal the eight internal gates" },
    },
    {
      kind: "powerPath",
      sequence: [
        "duzhu",
        "linkage-crown",
        "gate-6",
        "lock-6",
        "dragon-6",
        "ball-6",
        "toad-6",
      ],
      dwellMs: 520,
    },
    {
      kind: "flowParticles",
      pathPartIds: [
        "linkage-crown",
        "gate-6",
        "lock-6",
        "dragon-6",
        "ball-6",
        "toad-6",
      ],
      rate: 18,
      flavor: "sparks",
    },
    {
      kind: "callouts",
      anchors: [
        {
          partId: "duzhu",
          label: { zh: "都柱感震", en: "Duzhu senses the pulse" },
        },
        {
          partId: "linkage-crown",
          label: { zh: "方位圈分送脉冲", en: "Selector collar routes the pulse" },
        },
        {
          partId: "gate-6",
          label: { zh: "西向关机伸出", en: "West gate extends its pushrod" },
        },
        {
          partId: "lock-6",
          label: { zh: "西向锁爪让位", en: "West lock pawl clears the path" },
        },
        {
          partId: "dragon-6",
          label: { zh: "西龙俯首吐丸", en: "West dragon releases" },
        },
        {
          partId: "toad-6",
          label: { zh: "西蟾仰口承丸", en: "West toad receives the ball" },
        },
      ],
    },
    {
      kind: "subDemo",
      triggerId: "quake",
      caption: {
        zh: "西向脉冲依次驱动都柱、关机、龙首、铜丸与蟾蜍。",
        en: "A west pulse drives the duzhu, gate, dragon, ball, and toad in sequence.",
      },
    },
  ],
  customBuilders: {
    seismoscopeVessel,
    seismoscopeLid,
    seismoscopePlinth,
    seismoscopeFloor,
    seismoscopeLinkage,
    seismoscopeGateLink,
    seismoscopeLockPawl,
    seismoscopeDragon,
    seismoscopeToad,
    seismoscopeStandingDuzhu,
    seismoscopeSuspendedDuzhu,
    seismoscopeBall(params) {
      const geometry = new THREE.SphereGeometry(params.radius, 20, 14);
      const position = geometry.getAttribute("position");
      const basePositions = Float32Array.from(position.array);
      const restSeatDrop = params.radius * 0.18;
      const releaseBlendDistance = BALL_DROP * 0.12;
      setGeometryPresentation(
        geometry,
        {
          color: "#3f7466",
          metalness: 0.78,
          roughness: 0.52,
          textureVariant: "bronze:excavated",
        },
        {
          kind: "bronze-alarm-ball",
          restSeatOffset: [0, -restSeatDrop, 0],
          releaseOrigin: [0, 0, 0],
          features: [
            "jaw-rest",
            "nested-mouth-seat",
            "release-origin-preserved",
            "high-contrast-silhouette",
            "gravity-drop",
          ],
        },
      );
      geometry.userData.mechanicaAnimation = {
        currentStateRad: Number.NaN,
      };
      geometry.userData.mechanicaUpdate = (state: number) => {
        const seated =
          1 - THREE.MathUtils.clamp(state / releaseBlendDistance, 0, 1);
        for (let vertex = 0; vertex < position.count; vertex += 1) {
          position.setY(
            vertex,
            basePositions[vertex * 3 + 1] - restSeatDrop * seated,
          );
        }
        position.needsUpdate = true;
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.userData.mechanicaAnimation.currentStateRad = state;
      };
      geometry.userData.mechanicaUpdate(0);
      return geometry;
    },
    seismoscopeTrack,
    seismoscopeWangChute,
    seismoscopeFengTrack,
  },
};

export default module;
