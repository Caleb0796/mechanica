import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Box3, Sphere, Vector3 } from "three";

import type { PartDef } from "../../sim/types";

export const ASSEMBLY_SNAP_RATIO = 0.15;
export const ASSEMBLY_PART_DURATION_MS = 280;
export const ASSEMBLY_MIN_DURATION_MS = 2_500;
export const ASSEMBLY_MAX_DURATION_MS = 20_000;
export const ASSEMBLY_COMPLETION_DURATION_MS = 600;

export type AssemblyMode = "idle" | "step" | "reassemble";

export type AssemblyHint =
  | {
      kind: "parent-required";
      partId: string;
      requiredPartId: string;
    }
  | {
      kind: "move-closer";
      partId: string;
      distanceFromHome: number;
      snapDistance: number;
    };

export type AssemblyAttempt =
  | { kind: "seated"; partId: string }
  | { kind: "already-seated"; partId: string }
  | { kind: "rejected"; partId: string; requiredPartId: string }
  | {
      kind: "missed";
      partId: string;
      distanceFromHome: number;
      snapDistance: number;
    };

export interface AssemblyStagingSlot {
  groundOffset: number;
  position: readonly [number, number, number];
  radius: number;
}

export interface AssemblyPlan {
  durationMs: number;
  parts: readonly PartDef[];
  orderedPartIds: readonly string[];
  orderIndexByPartId: ReadonlyMap<string, number>;
  partById: ReadonlyMap<string, PartDef>;
  dependencyCyclePartIds: readonly string[];
  stagingByPartId: ReadonlyMap<string, AssemblyStagingSlot>;
  stagingGroundY: number;
}

export interface AssemblyState {
  mode: AssemblyMode;
  seatedPartIds: ReadonlySet<string>;
  stepIndex: number;
  selectedPartId: string | null;
  draggingPartId: string | null;
  errorPartId: string | null;
  hint: AssemblyHint | null;
  feedbackToken: number;
  lastAttempt: AssemblyAttempt | null;
  complete: boolean;
  transmissionEnabled: boolean;
  completionEffectToken: number;
}

export type AssemblyAction =
  | { type: "sync-parts" }
  | { type: "enter-step" }
  | { type: "enter-exploded" }
  | { type: "exit" }
  | { type: "step-next" }
  | { type: "step-previous" }
  | { type: "select"; partId: string | null }
  | { type: "drag-start"; partId: string }
  | { type: "drag-end" }
  | {
      type: "attempt-seat";
      partId: string;
      distanceFromHome: number;
      partRadius: number;
    }
  | { type: "clear-feedback"; token?: number };

interface IndexedPart {
  part: PartDef;
  index: number;
}

function indexedPartOrder(a: IndexedPart, b: IndexedPart): number {
  const aStep = a.part.assemblyStep ?? Number.POSITIVE_INFINITY;
  const bStep = b.part.assemblyStep ?? Number.POSITIVE_INFINITY;
  return aStep - bStep || a.index - b.index;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}

export function assemblyDurationMs(partCount: number): number {
  return clamp(
    Math.max(0, partCount) * ASSEMBLY_PART_DURATION_MS,
    ASSEMBLY_MIN_DURATION_MS,
    ASSEMBLY_MAX_DURATION_MS,
  );
}

export function assemblyEaseOutCubic(progress: number): number {
  const bounded = clamp(progress, 0, 1);
  return 1 - (1 - bounded) ** 3;
}

export function assemblyPartLocalProgress(
  plan: AssemblyPlan,
  progress: number,
  partId: string,
): number {
  const orderIndex = plan.orderIndexByPartId.get(partId);
  if (orderIndex === undefined) return 0;
  return clamp(progress * plan.orderedPartIds.length - orderIndex, 0, 1);
}

export function assemblyPartAppearance(progress: number): number {
  return assemblyEaseOutCubic(clamp(progress / 0.15, 0, 1));
}

function radialExplodeComponents(part: PartDef): [number, number, number] {
  if (part.explodeVector) return [...part.explodeVector];
  const [x, y, z] = part.position;
  const length = Math.hypot(x, y, z);
  if (length < 0.01) return [0, 0.25, 0];
  return [(x / length) * 0.25, (y / length) * 0.25, (z / length) * 0.25];
}

export function assemblyFlightOffset(
  part: PartDef,
  progress: number,
): [number, number, number] {
  const radial = radialExplodeComponents(part);
  const remaining = 1 - assemblyEaseOutCubic(progress);
  return [
    radial[0] * 2 * remaining,
    (radial[1] * 2 + 0.3) * remaining,
    radial[2] * 2 * remaining,
  ];
}

function partBoundingRadius(part: PartDef): number {
  const geometry = part.geometry;
  switch (geometry.type) {
    case "gear":
      return Math.hypot(
        (geometry.module * geometry.teeth) / 2 + geometry.module,
        geometry.thickness / 2,
      );
    case "shaft":
      return Math.hypot(geometry.radius, geometry.length / 2);
    case "beam":
    case "box":
    case "scoop":
      return Math.hypot(...geometry.size) / 2;
    case "wheel":
      return Math.hypot(geometry.radius, geometry.width / 2);
    case "shell":
      return geometry.radius;
    case "ring":
      return geometry.radius + geometry.tube;
    case "link":
      return Math.hypot(geometry.length, geometry.width) / 2;
    case "custom":
      return Math.max(
        0.001,
        ...Object.entries(geometry.params)
          .filter(
            ([key]) =>
              !/(?:count|columns|index|phase|segments|spokes|teeth)/i.test(key),
          )
          .map(([key, value]) =>
            /radius/i.test(key) ? Math.abs(value) : Math.abs(value) / 2,
          ),
      );
  }
}

function partGroundOffset(part: PartDef): number {
  const geometry = part.geometry;
  switch (geometry.type) {
    case "gear":
      return (geometry.module * geometry.teeth) / 2 + geometry.module;
    case "shaft":
      return geometry.length / 2;
    case "beam":
    case "box":
    case "scoop":
      return geometry.size[1] / 2;
    case "wheel":
      return geometry.width / 2;
    case "shell":
      return geometry.radius;
    case "ring":
      return geometry.tube;
    case "link":
      return geometry.width / 2;
    case "custom":
      if (geometry.params.height !== undefined) {
        return Math.abs(geometry.params.height) / 2;
      }
      if (geometry.params.depth !== undefined) {
        return Math.abs(geometry.params.depth) / 2;
      }
      return Math.max(
        0.001,
        ...Object.entries(geometry.params)
          .filter(([key]) => /radius/i.test(key))
          .map(([, value]) => Math.abs(value)),
      );
  }
}

function createStagingLayout(parts: readonly PartDef[]): {
  groundY: number;
  slots: ReadonlyMap<string, AssemblyStagingSlot>;
} {
  if (parts.length === 0) return { groundY: 0, slots: new Map() };
  const spheres = parts.map(
    (part) =>
      new Sphere(new Vector3(...part.position), partBoundingRadius(part)),
  );
  const machineBounds = new Box3();
  for (const sphere of spheres) {
    machineBounds.expandByPoint(
      sphere.center.clone().addScalar(-sphere.radius),
    );
    machineBounds.expandByPoint(sphere.center.clone().addScalar(sphere.radius));
  }
  const maximumRadius = Math.max(...spheres.map((sphere) => sphere.radius));
  const cellSize = Math.max(maximumRadius * 2.4, 0.001);
  const columns = Math.ceil(Math.sqrt(parts.length));
  const rows = Math.ceil(parts.length / columns);
  const groundY = Math.min(
    ...parts.map((part) => part.position[1] - partGroundOffset(part)),
  );
  const stagingStartX = machineBounds.max.x + cellSize;
  const stagingStartZ =
    machineBounds.getCenter(new Vector3()).z - ((rows - 1) * cellSize) / 2;
  const slots = new Map<string, AssemblyStagingSlot>();
  for (let index = 0; index < parts.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const radius = spheres[index].radius;
    const groundOffset = partGroundOffset(parts[index]);
    slots.set(parts[index].id, {
      groundOffset,
      position: [
        stagingStartX + column * cellSize,
        groundY + groundOffset,
        stagingStartZ + row * cellSize,
      ],
      radius,
    });
  }
  return { groundY, slots };
}

export function createAssemblyPlan(parts: readonly PartDef[]): AssemblyPlan {
  const copiedParts = [...parts];
  const partById = new Map(copiedParts.map((part) => [part.id, part]));
  const remaining = copiedParts
    .map((part, index) => ({ part, index }))
    .sort(indexedPartOrder);
  const orderedPartIds: string[] = [];
  const emitted = new Set<string>();
  let dependencyCyclePartIds: string[] = [];

  while (remaining.length > 0) {
    const readyIndex = remaining.findIndex(({ part }) => {
      if (!part.parent || !partById.has(part.parent)) return true;
      return emitted.has(part.parent);
    });
    if (readyIndex < 0) {
      dependencyCyclePartIds = remaining.map(({ part }) => part.id);
      orderedPartIds.push(...dependencyCyclePartIds);
      break;
    }
    const [{ part }] = remaining.splice(readyIndex, 1);
    orderedPartIds.push(part.id);
    emitted.add(part.id);
  }

  const orderIndexByPartId = new Map(
    orderedPartIds.map((partId, index) => [partId, index]),
  );
  const staging = createStagingLayout(
    orderedPartIds.flatMap((partId) => {
      const part = partById.get(partId);
      return part ? [part] : [];
    }),
  );

  return {
    durationMs: assemblyDurationMs(orderedPartIds.length),
    parts: copiedParts,
    orderedPartIds,
    orderIndexByPartId,
    partById,
    dependencyCyclePartIds,
    stagingByPartId: staging.slots,
    stagingGroundY: staging.groundY,
  };
}

export function createAssemblyState(plan: AssemblyPlan): AssemblyState {
  const seatedPartIds = new Set(plan.orderedPartIds);
  return {
    mode: "idle",
    seatedPartIds,
    stepIndex: plan.orderedPartIds.length,
    selectedPartId: null,
    draggingPartId: null,
    errorPartId: null,
    hint: null,
    feedbackToken: 0,
    lastAttempt: null,
    complete: true,
    transmissionEnabled: true,
    completionEffectToken: 0,
  };
}

function enterAssemblyMode(
  plan: AssemblyPlan,
  state: AssemblyState,
  mode: Exclude<AssemblyMode, "idle">,
): AssemblyState {
  const complete = plan.orderedPartIds.length === 0;
  return {
    ...state,
    mode,
    seatedPartIds: new Set(),
    stepIndex: 0,
    selectedPartId: null,
    draggingPartId: null,
    errorPartId: null,
    hint: null,
    lastAttempt: null,
    complete,
    transmissionEnabled: complete,
  };
}

function stepState(
  plan: AssemblyPlan,
  state: AssemblyState,
  stepIndex: number,
): AssemblyState {
  const boundedIndex = Math.max(
    0,
    Math.min(stepIndex, plan.orderedPartIds.length),
  );
  const seatedPartIds = new Set(plan.orderedPartIds.slice(0, boundedIndex));
  const complete = boundedIndex === plan.orderedPartIds.length;
  const newlyCompleted = complete && !state.complete;
  const lastPartId = plan.orderedPartIds[boundedIndex - 1];
  return {
    ...state,
    seatedPartIds,
    stepIndex: boundedIndex,
    selectedPartId: null,
    draggingPartId: null,
    errorPartId: null,
    hint: null,
    lastAttempt: lastPartId ? { kind: "seated", partId: lastPartId } : null,
    complete,
    transmissionEnabled: complete,
    completionEffectToken:
      state.completionEffectToken + (newlyCompleted ? 1 : 0),
  };
}

function finiteDistance(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : Number.POSITIVE_INFINITY;
}

function finiteRadius(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function attemptSeat(
  plan: AssemblyPlan,
  state: AssemblyState,
  partId: string,
  distanceFromHome: number,
  partRadius: number,
): AssemblyState {
  if (state.mode !== "reassemble") return state;
  const part = plan.partById.get(partId);
  if (!part) return state;
  if (state.seatedPartIds.has(partId)) {
    return {
      ...state,
      draggingPartId: null,
      lastAttempt: { kind: "already-seated", partId },
    };
  }

  const requiredPartId = part.parent;
  if (
    requiredPartId &&
    plan.partById.has(requiredPartId) &&
    !state.seatedPartIds.has(requiredPartId)
  ) {
    return {
      ...state,
      draggingPartId: null,
      errorPartId: partId,
      hint: { kind: "parent-required", partId, requiredPartId },
      feedbackToken: state.feedbackToken + 1,
      lastAttempt: { kind: "rejected", partId, requiredPartId },
    };
  }

  const distance = finiteDistance(distanceFromHome);
  const snapDistance = finiteRadius(partRadius) * ASSEMBLY_SNAP_RATIO;
  if (distance > snapDistance) {
    return {
      ...state,
      draggingPartId: null,
      errorPartId: partId,
      hint: {
        kind: "move-closer",
        partId,
        distanceFromHome: distance,
        snapDistance,
      },
      feedbackToken: state.feedbackToken + 1,
      lastAttempt: {
        kind: "missed",
        partId,
        distanceFromHome: distance,
        snapDistance,
      },
    };
  }

  const seatedPartIds = new Set(state.seatedPartIds);
  seatedPartIds.add(partId);
  const complete = seatedPartIds.size === plan.orderedPartIds.length;
  return {
    ...state,
    seatedPartIds,
    selectedPartId: null,
    draggingPartId: null,
    errorPartId: null,
    hint: null,
    lastAttempt: { kind: "seated", partId },
    complete,
    transmissionEnabled: complete,
    completionEffectToken:
      state.completionEffectToken + (complete && !state.complete ? 1 : 0),
  };
}

export function assemblyCurrentPartId(
  plan: AssemblyPlan,
  state: AssemblyState,
): string | null {
  if (state.complete || state.mode === "idle") return null;
  if (state.mode === "step") {
    return plan.orderedPartIds[state.stepIndex] ?? null;
  }
  if (state.selectedPartId && !state.seatedPartIds.has(state.selectedPartId)) {
    return state.selectedPartId;
  }
  return (
    plan.orderedPartIds.find((partId) => {
      if (state.seatedPartIds.has(partId)) return false;
      const parentId = plan.partById.get(partId)?.parent;
      return (
        !parentId ||
        !plan.partById.has(parentId) ||
        state.seatedPartIds.has(parentId)
      );
    }) ?? null
  );
}

export function isPartVisibleInAssemblyStep(
  plan: AssemblyPlan,
  state: AssemblyState,
  partId: string,
  progress: number,
): boolean {
  if (state.mode !== "step") return true;
  return (
    state.seatedPartIds.has(partId) ||
    assemblyPartLocalProgress(plan, progress, partId) > 0
  );
}

export function reduceAssembly(
  plan: AssemblyPlan,
  state: AssemblyState,
  action: AssemblyAction,
): AssemblyState {
  switch (action.type) {
    case "sync-parts":
      return createAssemblyState(plan);
    case "enter-step":
      return enterAssemblyMode(plan, state, "step");
    case "enter-exploded":
      return enterAssemblyMode(plan, state, "reassemble");
    case "exit":
      return createAssemblyState(plan);
    case "step-next":
      return state.mode === "step"
        ? stepState(plan, state, state.stepIndex + 1)
        : state;
    case "step-previous":
      return state.mode === "step"
        ? stepState(plan, state, state.stepIndex - 1)
        : state;
    case "select": {
      const selectable =
        action.partId !== null &&
        plan.partById.has(action.partId) &&
        !state.seatedPartIds.has(action.partId);
      return state.mode === "reassemble"
        ? {
            ...state,
            selectedPartId: selectable ? action.partId : null,
            draggingPartId: null,
          }
        : state;
    }
    case "drag-start":
      return state.mode === "reassemble" &&
        plan.partById.has(action.partId) &&
        !state.seatedPartIds.has(action.partId)
        ? {
            ...state,
            selectedPartId: action.partId,
            draggingPartId: action.partId,
          }
        : state;
    case "drag-end":
      return { ...state, draggingPartId: null };
    case "attempt-seat":
      return attemptSeat(
        plan,
        state,
        action.partId,
        action.distanceFromHome,
        action.partRadius,
      );
    case "clear-feedback":
      return action.token !== undefined && action.token !== state.feedbackToken
        ? state
        : { ...state, errorPartId: null, hint: null };
  }
}

export interface AssemblyController {
  plan: AssemblyPlan;
  state: AssemblyState;
  orderedParts: readonly PartDef[];
  currentPartId: string | null;
  currentPart: PartDef | null;
  currentPartName: PartDef["name"] | null;
  currentPartCaption: PartDef["assemblyCaption"] | null;
  currentAssemblyStep: number | null;
  enterStepMode: () => void;
  enterExplodedMode: () => void;
  exitAssembly: () => void;
  advanceStep: () => void;
  previousStep: () => void;
  selectPart: (partId: string | null) => void;
  beginDrag: (partId: string) => void;
  endDrag: () => void;
  attemptSeat: (
    partId: string,
    distanceFromHome: number,
    partRadius: number,
  ) => void;
  attemptSeatSelected: (distanceFromHome: number, partRadius: number) => void;
  clearFeedback: (token?: number) => void;
}

export function useAssemblyController(
  parts: readonly PartDef[],
): AssemblyController {
  const plan = useMemo(() => createAssemblyPlan(parts), [parts]);
  const [state, dispatch] = useReducer(
    (current: AssemblyState, action: AssemblyAction) =>
      reduceAssembly(plan, current, action),
    plan,
    createAssemblyState,
  );

  useEffect(() => {
    dispatch({ type: "sync-parts" });
  }, [plan]);

  const currentPartId = assemblyCurrentPartId(plan, state);
  const currentPart = currentPartId
    ? (plan.partById.get(currentPartId) ?? null)
    : null;
  const orderedParts = useMemo(
    () =>
      plan.orderedPartIds.flatMap((partId) => {
        const part = plan.partById.get(partId);
        return part ? [part] : [];
      }),
    [plan],
  );

  const enterStepMode = useCallback(() => dispatch({ type: "enter-step" }), []);
  const enterExplodedMode = useCallback(
    () => dispatch({ type: "enter-exploded" }),
    [],
  );
  const exitAssembly = useCallback(() => dispatch({ type: "exit" }), []);
  const advanceStep = useCallback(() => dispatch({ type: "step-next" }), []);
  const previousStep = useCallback(
    () => dispatch({ type: "step-previous" }),
    [],
  );
  const selectPart = useCallback(
    (partId: string | null) => dispatch({ type: "select", partId }),
    [],
  );
  const beginDrag = useCallback(
    (partId: string) => dispatch({ type: "drag-start", partId }),
    [],
  );
  const endDrag = useCallback(() => dispatch({ type: "drag-end" }), []);
  const seatPart = useCallback(
    (partId: string, distanceFromHome: number, partRadius: number) =>
      dispatch({
        type: "attempt-seat",
        partId,
        distanceFromHome,
        partRadius,
      }),
    [],
  );
  const attemptSeatSelected = useCallback(
    (distanceFromHome: number, partRadius: number) => {
      if (state.selectedPartId) {
        seatPart(state.selectedPartId, distanceFromHome, partRadius);
      }
    },
    [seatPart, state.selectedPartId],
  );
  const clearFeedback = useCallback(
    (token?: number) => dispatch({ type: "clear-feedback", token }),
    [],
  );

  return {
    plan,
    state,
    orderedParts,
    currentPartId,
    currentPart,
    currentPartName: currentPart?.name ?? null,
    currentPartCaption: currentPart?.assemblyCaption ?? null,
    currentAssemblyStep: currentPart?.assemblyStep ?? null,
    enterStepMode,
    enterExplodedMode,
    exitAssembly,
    advanceStep,
    previousStep,
    selectPart,
    beginDrag,
    endDrag,
    attemptSeat: seatPart,
    attemptSeatSelected,
    clearFeedback,
  };
}
