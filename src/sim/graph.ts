import {
  camFollowerPosition,
  crankSliderDerivative,
  crankSliderPosition,
  isLinearConstraint,
  linearRatio,
  type LinearConstraint,
} from "./edges";
import type {
  IKinematicGraph,
  MachineSpec,
  SchemePatch,
  SolveResult,
} from "./types";

type Constraint = MachineSpec["constraints"][number];
type Part = MachineSpec["parts"][number];
type Event = SolveResult["events"][number];

interface LinearEdge {
  to: string;
  ratio: number;
}

const RATIO_EPSILON = 1e-9;
const DERIVATIVE_EPSILON = 1e-10;
const CRANK_POSITION_EPSILON = 1e-12;

export class OverConstrainedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverConstrainedError";
  }
}

export class KinematicGraph implements IKinematicGraph {
  private readonly baseSpec: MachineSpec;
  private spec: MachineSpec;
  private values: Record<string, number> = {};
  private parts = new Map<string, Part>();
  private adjacency = new Map<string, LinearEdge[]>();
  private component = new Map<string, number>();
  private factor = new Map<string, number>();
  private eventTime = 0;

  constructor(spec: MachineSpec) {
    this.baseSpec = cloneSpec(spec);
    this.spec = cloneSpec(spec);
    this.rebuild({});
  }

  drive(nodeId: string, deltaRad: number): SolveResult {
    this.requireNode(nodeId);
    return this.solveInput(nodeId, this.values[nodeId] + deltaRad);
  }

  setInput(nodeId: string, absoluteRad: number): SolveResult {
    this.requireNode(nodeId);
    return this.solveInput(nodeId, absoluteRad);
  }

  setAttitude(
    nodeId: string,
    quaternion: [number, number, number, number],
  ): SolveResult {
    this.requireNode(nodeId);
    const gimbal = this.spec.constraints.find(
      (constraint) => constraint.type === "gimbal" && constraint.outer === nodeId,
    );
    if (!gimbal || gimbal.type !== "gimbal") {
      throw new Error(`Part is not a gimbal outer shell: ${nodeId}`);
    }

    const normalized = normalizeQuaternion(quaternion);
    const localUp = rotateVectorByQuaternion(
      [0, 1, 0],
      conjugateQuaternion(normalized),
    );

    // Convention: outer is a local-Z yaw and middle is a local-X pitch.
    // Rz(outer) * Rx(middle) maps local up to the shell's world-up vector.
    this.values[gimbal.outer] = Math.atan2(-localUp[0], localUp[1]);
    this.values[gimbal.middle] = Math.asin(clamp(localUp[2], -1, 1));
    // The inner value is the stabilized bowl's own rotation and is invariant.

    return this.result([]);
  }

  ratioBetween(from: string, to: string): number | null {
    if (!this.parts.has(from) || !this.parts.has(to)) {
      return null;
    }
    if (this.component.get(from) !== this.component.get(to)) {
      return null;
    }
    const fromFactor = this.factor.get(from);
    const toFactor = this.factor.get(to);
    if (fromFactor === undefined || toFactor === undefined) {
      return null;
    }
    return toFactor / fromFactor;
  }

  setScheme(patch?: SchemePatch): void {
    const previous = this.values;
    this.spec = applyScheme(this.baseSpec, patch);
    this.rebuild(previous);
  }

  state(): Record<string, number> {
    return { ...this.values };
  }

  private solveInput(nodeId: string, value: number): SolveResult {
    const events: Event[] = [];
    const reverseCrank = this.spec.constraints.find(
      (constraint) => constraint.type === "crank" && constraint.slider === nodeId,
    );

    if (reverseCrank?.type === "crank") {
      const currentTheta = this.values[reverseCrank.wheel];
      const theta = this.invertCrank(
        reverseCrank.slider,
        value,
        currentTheta,
        reverseCrank.crankRadius,
        reverseCrank.rodLength,
        events,
      );
      this.values[reverseCrank.wheel] = theta;
      this.propagateLinear(reverseCrank.wheel);
    } else {
      this.values[nodeId] = value;
      this.propagateLinear(nodeId);
    }

    this.evaluateFunctions();
    return this.result(events);
  }

  private invertCrank(
    sliderId: string,
    target: number,
    currentTheta: number,
    crankRadius: number,
    rodLength: number,
    events: Event[],
  ): number {
    const currentPosition = crankSliderPosition(
      currentTheta,
      crankRadius,
      rodLength,
    );
    const currentDerivative = Math.abs(crankSliderDerivative(
      currentTheta,
      crankRadius,
      rodLength,
    ));
    const boundedTarget = clamp(target, 0, 2 * crankRadius);

    if (
      currentDerivative < DERIVATIVE_EPSILON &&
      Math.abs(boundedTarget - currentPosition) > CRANK_POSITION_EPSILON
    ) {
      events.push(this.event("deadcenter", sliderId));
      return currentTheta;
    }

    const y = rodLength + crankRadius - boundedTarget;
    const denominator = 2 * y * crankRadius;
    let principal: number;
    if (boundedTarget <= CRANK_POSITION_EPSILON) {
      principal = 0;
    } else if (2 * crankRadius - boundedTarget <= CRANK_POSITION_EPSILON) {
      principal = Math.PI;
    } else if (Math.abs(denominator) <= CRANK_POSITION_EPSILON) {
      events.push(this.event("deadcenter", sliderId));
      return currentTheta;
    } else {
      const cosine =
        (y * y - rodLength * rodLength + crankRadius * crankRadius) /
        denominator;
      principal = Math.acos(clamp(cosine, -1, 1));
    }

    const candidates = equivalentCrankAngles(principal, currentTheta);
    const theta = candidates.reduce((nearest, candidate) =>
      Math.abs(candidate - currentTheta) < Math.abs(nearest - currentTheta)
        ? candidate
        : nearest,
    );
    if (
      target !== boundedTarget ||
      boundedTarget <= CRANK_POSITION_EPSILON ||
      2 * crankRadius - boundedTarget <= CRANK_POSITION_EPSILON
    ) {
      events.push(this.event("deadcenter", sliderId));
    }
    return theta;
  }

  private evaluateFunctions(): void {
    for (const constraint of this.spec.constraints) {
      if (constraint.type === "crank") {
        this.values[constraint.slider] = crankSliderPosition(
          this.values[constraint.wheel],
          constraint.crankRadius,
          constraint.rodLength,
        );
      } else if (constraint.type === "cam") {
        this.values[constraint.follower] = camFollowerPosition(
          this.values[constraint.cam],
          constraint.profile,
          constraint.liftHeight,
        );
      } else if (constraint.type === "differential") {
        this.values[constraint.carrier] =
          (constraint.ratio *
            (this.values[constraint.sunA] + this.values[constraint.sunB])) /
          2;
      }
    }
  }

  private propagateLinear(anchor: string): void {
    const anchorFactor = this.factor.get(anchor);
    const anchorComponent = this.component.get(anchor);
    if (anchorFactor === undefined || anchorComponent === undefined) {
      return;
    }
    const anchorValue = this.values[anchor];
    for (const [nodeId, component] of this.component) {
      if (component === anchorComponent) {
        this.values[nodeId] =
          anchorValue * (this.factor.get(nodeId)! / anchorFactor);
      }
    }
  }

  private rebuild(previous: Record<string, number>): void {
    this.parts = new Map(this.spec.parts.map((part) => [part.id, part]));
    this.values = Object.fromEntries(
      this.spec.parts.map((part) => [part.id, previous[part.id] ?? 0]),
    );
    this.adjacency = new Map(
      this.spec.parts.map((part) => [part.id, [] as LinearEdge[]]),
    );

    for (const constraint of this.spec.constraints) {
      this.validateConstraintParts(constraint);
      if (isLinearConstraint(constraint)) {
        this.addLinearConstraint(constraint);
      }
    }

    this.buildComponents();
    const propagatedComponents = new Set<number>();
    const anchors = [
      this.spec.primaryDrive,
      ...this.spec.driveNodes,
      ...this.spec.parts.map((part) => part.id),
    ];
    for (const anchor of anchors) {
      const component = this.component.get(anchor);
      if (component !== undefined && !propagatedComponents.has(component)) {
        this.propagateLinear(anchor);
        propagatedComponents.add(component);
      }
    }
    this.evaluateFunctions();
  }

  private addLinearConstraint(constraint: LinearConstraint): void {
    const ratio = linearRatio(constraint, this.parts);
    if (!Number.isFinite(ratio) || ratio === 0) {
      throw new Error(`Linear constraint has invalid ratio: ${ratio}`);
    }
    this.adjacency.get(constraint.a)!.push({ to: constraint.b, ratio });
    this.adjacency.get(constraint.b)!.push({
      to: constraint.a,
      ratio: 1 / ratio,
    });
  }

  private buildComponents(): void {
    this.component.clear();
    this.factor.clear();
    let componentId = 0;

    for (const part of this.spec.parts) {
      if (this.component.has(part.id)) {
        continue;
      }
      this.component.set(part.id, componentId);
      this.factor.set(part.id, 1);
      const queue = [part.id];

      for (let index = 0; index < queue.length; index += 1) {
        const from = queue[index];
        const fromFactor = this.factor.get(from)!;
        for (const edge of this.adjacency.get(from) ?? []) {
          const candidate = fromFactor * edge.ratio;
          const known = this.factor.get(edge.to);
          if (known === undefined) {
            this.factor.set(edge.to, candidate);
            this.component.set(edge.to, componentId);
            queue.push(edge.to);
          } else if (!ratiosAgree(known, candidate)) {
            throw new OverConstrainedError(
              `Inconsistent linear paths to ${edge.to}: ${known} vs ${candidate}`,
            );
          }
        }
      }
      componentId += 1;
    }
  }

  private validateConstraintParts(constraint: Constraint): void {
    for (const id of constraintPartIds(constraint)) {
      if (!this.parts.has(id)) {
        throw new Error(`Constraint references unknown part: ${id}`);
      }
    }
  }

  private requireNode(nodeId: string): void {
    if (!this.parts.has(nodeId)) {
      throw new Error(`Unknown kinematic node: ${nodeId}`);
    }
  }

  private event(type: string, part: string): Event {
    const event = { t: this.eventTime, type, part };
    this.eventTime += 1;
    return event;
  }

  private result(events: Event[]): SolveResult {
    return { angles: this.state(), events: [...events] };
  }
}

function applyScheme(base: MachineSpec, patch?: SchemePatch): MachineSpec {
  const spec = cloneSpec(base);
  if (!patch) {
    return spec;
  }

  const removedParts = new Set(patch.removePartIds ?? []);
  const overrides = new Map(
    (patch.overrideParts ?? []).map((part) => [part.id, part]),
  );
  const parts = spec.parts
    .filter((part) => !removedParts.has(part.id))
    .map((part) => ({ ...part, ...overrides.get(part.id) } as Part));
  for (const part of patch.addParts ?? []) {
    const existingIndex = parts.findIndex((candidate) => candidate.id === part.id);
    if (existingIndex === -1) {
      parts.push(part);
    } else {
      parts[existingIndex] = part;
    }
  }

  const removedConstraints = new Set(patch.removeConstraintIndexes ?? []);
  const constraints = spec.constraints.filter(
    (_, index) => !removedConstraints.has(index),
  );
  constraints.push(...(patch.addConstraints ?? []));

  return { ...spec, parts, constraints };
}

function cloneSpec(spec: MachineSpec): MachineSpec {
  return structuredClone(spec);
}

function ratiosAgree(a: number, b: number): boolean {
  return Math.abs(a - b) <= RATIO_EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
}

function constraintPartIds(constraint: Constraint): string[] {
  switch (constraint.type) {
    case "mesh":
    case "belt":
    case "lockstep":
      return [constraint.a, constraint.b];
    case "crank":
      return [constraint.wheel, constraint.rod, constraint.slider];
    case "cam":
      return [constraint.cam, constraint.follower];
    case "differential":
      return [constraint.carrier, constraint.sunA, constraint.sunB];
    case "gimbal":
      return [constraint.outer, constraint.middle, constraint.inner];
  }
}

function normalizeQuaternion(
  quaternion: [number, number, number, number],
): [number, number, number, number] {
  const length = Math.hypot(...quaternion);
  if (!Number.isFinite(length) || length === 0) {
    return [0, 0, 0, 1];
  }
  return quaternion.map((value) => value / length) as [
    number,
    number,
    number,
    number,
  ];
}

function conjugateQuaternion(
  quaternion: [number, number, number, number],
): [number, number, number, number] {
  return [-quaternion[0], -quaternion[1], -quaternion[2], quaternion[3]];
}

function rotateVectorByQuaternion(
  vector: [number, number, number],
  quaternion: [number, number, number, number],
): [number, number, number] {
  const [x, y, z, w] = quaternion;
  const [vx, vy, vz] = vector;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function equivalentCrankAngles(
  principal: number,
  currentTheta: number,
): number[] {
  const revolution = Math.PI * 2;
  const candidates: number[] = [];
  for (const branch of [principal, -principal]) {
    const nearestTurn = Math.round((currentTheta - branch) / revolution);
    for (let offset = -1; offset <= 1; offset += 1) {
      candidates.push(branch + (nearestTurn + offset) * revolution);
    }
  }
  return candidates;
}
