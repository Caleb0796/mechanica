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
