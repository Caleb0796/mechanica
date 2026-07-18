import type { MachineSpec } from "./types";

type Constraint = MachineSpec["constraints"][number];
type Part = MachineSpec["parts"][number];

export type LinearConstraint = Extract<
  Constraint,
  { type: "mesh" | "belt" | "lockstep" }
>;

export type FunctionConstraint = Exclude<Constraint, LinearConstraint>;

export function isLinearConstraint(
  constraint: Constraint,
): constraint is LinearConstraint {
  return (
    constraint.type === "mesh" ||
    constraint.type === "belt" ||
    constraint.type === "lockstep"
  );
}

export function isFunctionConstraint(
  constraint: Constraint,
): constraint is FunctionConstraint {
  return !isLinearConstraint(constraint);
}

export function pitchRadius(part: Part): number | null {
  if (part.geometry.type === "gear") {
    const radius = (part.geometry.module * part.geometry.teeth) / 2;
    return Number.isFinite(radius) && radius > 0 ? radius : null;
  }
  if (part.geometry.type === "wheel") {
    return Number.isFinite(part.geometry.radius) && part.geometry.radius > 0
      ? part.geometry.radius
      : null;
  }
  return null;
}

export function linearRatio(
  constraint: LinearConstraint,
  parts: ReadonlyMap<string, Part>,
): number {
  if (constraint.type === "lockstep") {
    return constraint.ratio;
  }

  const partA = requiredPart(parts, constraint.a);
  const partB = requiredPart(parts, constraint.b);

  if (constraint.type === "mesh") {
    if (partA.geometry.type !== "gear" || partB.geometry.type !== "gear") {
      throw new Error(
        `Mesh endpoints must both be gears: ${constraint.a}, ${constraint.b}`,
      );
    }
    if (
      !Number.isFinite(partA.geometry.teeth) ||
      !Number.isFinite(partB.geometry.teeth) ||
      partA.geometry.teeth <= 0 ||
      partB.geometry.teeth <= 0
    ) {
      throw new Error(
        `Mesh endpoints must have positive tooth counts: ${constraint.a}, ${constraint.b}`,
      );
    }
    const direction = constraint.internal ? 1 : -1;
    return direction * (partA.geometry.teeth / partB.geometry.teeth);
  }

  const radiusA = pitchRadius(partA);
  const radiusB = pitchRadius(partB);
  if (radiusA === null || radiusB === null) {
    throw new Error(
      `Belt endpoints must be wheels or gears: ${constraint.a}, ${constraint.b}`,
    );
  }
  const direction = constraint.crossed ? -1 : 1;
  return direction * (radiusA / radiusB);
}

export function crankSliderPosition(
  theta: number,
  crankRadius: number,
  rodLength: number,
): number {
  const sinTheta = Math.sin(theta);
  const radicand = Math.max(
    0,
    rodLength * rodLength - crankRadius * crankRadius * sinTheta * sinTheta,
  );
  return (
    rodLength +
    crankRadius -
    (crankRadius * Math.cos(theta) + Math.sqrt(radicand))
  );
}

export function crankRodAngle(
  theta: number,
  crankRadius: number,
  rodLength: number,
): number {
  return Math.asin(
    Math.max(-1, Math.min(1, (crankRadius / rodLength) * Math.sin(theta))),
  );
}

export interface PlanarCrankRodPose {
  center: [number, number, number];
  crankPin: [number, number, number];
  rotationZ: number;
  sliderPin: [number, number, number];
}

export function planarCrankRodPose(
  theta: number,
  wheelPosition: [number, number, number],
  crankRadius: number,
  rodLength: number,
): PlanarCrankRodPose {
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const root = Math.sqrt(
    Math.max(
      0,
      rodLength * rodLength - crankRadius * crankRadius * sinTheta * sinTheta,
    ),
  );
  const crankPin: [number, number, number] = [
    wheelPosition[0] + crankRadius * sinTheta,
    wheelPosition[1] - crankRadius * cosTheta,
    wheelPosition[2],
  ];
  const sliderPin: [number, number, number] = [
    wheelPosition[0],
    wheelPosition[1] - crankRadius * cosTheta - root,
    wheelPosition[2],
  ];
  return {
    center: [
      (crankPin[0] + sliderPin[0]) / 2,
      (crankPin[1] + sliderPin[1]) / 2,
      wheelPosition[2],
    ],
    crankPin,
    rotationZ: Math.atan2(
      sliderPin[1] - crankPin[1],
      sliderPin[0] - crankPin[0],
    ),
    sliderPin,
  };
}

export function crankSliderDerivative(
  theta: number,
  crankRadius: number,
  rodLength: number,
): number {
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const radicand = Math.max(
    0,
    rodLength * rodLength - crankRadius * crankRadius * sinTheta * sinTheta,
  );
  const root = Math.sqrt(radicand);
  if (root === 0) {
    return crankRadius * sinTheta;
  }
  return (
    crankRadius * sinTheta +
    (crankRadius * crankRadius * sinTheta * cosTheta) / root
  );
}

export function camFollowerPosition(
  theta: number,
  profile: "lift" | "heddle",
  liftHeight: number,
): number {
  if (profile === "heddle") {
    return liftHeight * Math.max(0, Math.sin(theta)) ** 3;
  }
  return (liftHeight * (1 - Math.cos(theta))) / 2;
}

function requiredPart(parts: ReadonlyMap<string, Part>, id: string): Part {
  const part = parts.get(id);
  if (!part) {
    throw new Error(`Constraint references unknown part: ${id}`);
  }
  return part;
}
