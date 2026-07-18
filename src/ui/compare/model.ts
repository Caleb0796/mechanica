import { applySchemePatch } from "../../sim/graph";
import type {
  IKinematicGraph,
  MachineModule,
  MachineSpec,
  PartDef,
} from "../../sim/types";

export type CompareSide = "left" | "right";

export interface SchemeTransitionMetadata {
  previousSchemeId?: string;
  nextSchemeId?: string;
  startedAt: number;
  durationMs: 1000;
  oldPartIds: string[];
  newPartIds: string[];
  oldPartTint: "#d95c5c";
  newPartTint: "#2aa7a1";
  ghostOpacity: 0.38;
}

export interface SchemeGhostPresentation {
  color?: string;
  opacity: number;
  progress: number;
  visible: boolean;
}

function partSignature(part: PartDef): string {
  return JSON.stringify({
    geometry: part.geometry,
    material: part.material,
    position: part.position,
    rotationEuler: part.rotationEuler,
    parent: part.parent,
    joint: part.joint,
  });
}

export function specForScheme(
  module: MachineModule,
  schemeId?: string,
): MachineSpec {
  return applySchemePatch(
    module.spec,
    schemeId ? module.schemes?.[schemeId] : undefined,
  );
}

export function differencePartIds(
  left: MachineSpec,
  right: MachineSpec,
): ReadonlySet<string> {
  const leftParts = new Map(left.parts.map((part) => [part.id, part]));
  const rightParts = new Map(right.parts.map((part) => [part.id, part]));
  const differences = new Set<string>();
  for (const id of new Set([...leftParts.keys(), ...rightParts.keys()])) {
    const leftPart = leftParts.get(id);
    const rightPart = rightParts.get(id);
    if (
      !leftPart ||
      !rightPart ||
      partSignature(leftPart) !== partSignature(rightPart)
    ) {
      differences.add(id);
    }
  }
  return differences;
}

export function createSchemeTransition(
  module: MachineModule,
  previousSchemeId?: string,
  nextSchemeId?: string,
  startedAt = performance.now(),
): SchemeTransitionMetadata {
  const previous = specForScheme(module, previousSchemeId);
  const next = specForScheme(module, nextSchemeId);
  const differences = differencePartIds(previous, next);
  const previousIds = new Set(previous.parts.map((part) => part.id));
  const nextIds = new Set(next.parts.map((part) => part.id));
  return {
    previousSchemeId,
    nextSchemeId,
    startedAt,
    durationMs: 1000,
    oldPartIds: [...differences].filter((id) => previousIds.has(id)).sort(),
    newPartIds: [...differences].filter((id) => nextIds.has(id)).sort(),
    oldPartTint: "#d95c5c",
    newPartTint: "#2aa7a1",
    ghostOpacity: 0.38,
  };
}

export function schemeGhostPresentation(
  transition: SchemeTransitionMetadata,
  layer: "old" | "new",
  now = performance.now(),
): SchemeGhostPresentation {
  const progress = Math.max(
    0,
    Math.min(1, (now - transition.startedAt) / transition.durationMs),
  );
  if (layer === "old") {
    return {
      color: transition.oldPartTint,
      opacity: transition.ghostOpacity * (1 - progress),
      progress,
      visible: progress < 1,
    };
  }
  return {
    color: progress < 1 ? transition.newPartTint : undefined,
    opacity: transition.ghostOpacity + (1 - transition.ghostOpacity) * progress,
    progress,
    visible: true,
  };
}

export function driveNodeForSpec(spec: MachineSpec): string {
  const partIds = new Set(spec.parts.map((part) => part.id));
  for (const candidate of [spec.primaryDrive, ...spec.driveNodes]) {
    if (partIds.has(candidate)) return candidate;
  }
  const interactive = spec.parts.find((part) => part.interactive);
  if (interactive) return interactive.id;
  const movable = spec.parts.find(
    (part) => part.joint && part.joint.kind !== "fixed",
  );
  if (movable) return movable.id;
  throw new Error(`Scheme ${spec.slug} has no driveable part`);
}

export function driveComparedGraphs(
  graphs: readonly [IKinematicGraph, IKinematicGraph],
  driveNodes: readonly [string, string],
  deltaRad: number,
): void {
  if (!Number.isFinite(deltaRad)) {
    throw new Error("Compare drive delta must be finite");
  }
  graphs[0].drive(driveNodes[0], deltaRad);
  graphs[1].drive(driveNodes[1], deltaRad);
}

function driveComparedMachineGraph(
  module: MachineModule,
  graph: IKinematicGraph,
  driveNode: string,
  deltaRad: number,
): void {
  if (module.spec.slug === "chariot") {
    const trigger = module.mechanism?.triggers.find(
      (candidate) => candidate.id === `drive:${driveNode}`,
    );
    if (trigger) {
      trigger.run(graph, () => undefined, deltaRad);
      return;
    }
  }

  if (module.spec.slug === "seismoscope") {
    const trigger = module.mechanism?.triggers.find(
      (candidate) => candidate.id === "quake",
    );
    if (trigger) {
      const nextAngle = (graph.state()[driveNode] ?? 0) + deltaRad;
      const bearing = ((Math.round(nextAngle / (Math.PI / 4)) % 8) + 8) % 8;
      trigger.run(graph, () => undefined, bearing);
      graph.setInput(driveNode, nextAngle);
      return;
    }
  }

  graph.drive(driveNode, deltaRad);
}

export function driveComparedMachineGraphs(
  module: MachineModule,
  graphs: readonly [IKinematicGraph, IKinematicGraph],
  driveNodes: readonly [string, string],
  deltaRad: number,
): void {
  if (!Number.isFinite(deltaRad)) {
    throw new Error("Compare drive delta must be finite");
  }
  driveComparedMachineGraph(module, graphs[0], driveNodes[0], deltaRad);
  driveComparedMachineGraph(module, graphs[1], driveNodes[1], deltaRad);
}

export function tintForDifference(
  side: CompareSide,
  partId: string,
  differences: ReadonlySet<string>,
  hoveredPartId?: string,
): { color?: string; emissive?: string; opacity: number } {
  const different = differences.has(partId);
  const linkedHover = hoveredPartId === partId;
  if (!different && !linkedHover) return { opacity: 1 };
  const color = side === "left" ? "#d95c5c" : "#2aa7a1";
  return {
    color: different ? color : undefined,
    emissive: linkedHover ? color : undefined,
    opacity: different ? 0.72 : 1,
  };
}
