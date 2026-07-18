import { describe, expect, it } from "vitest";

import gimbal from "../../src/machines/gimbal/build";
import odometer from "../../src/machines/odometer/build";
import type { PartDef } from "../../src/sim/types";
import {
  ASSEMBLY_SNAP_RATIO,
  assemblyCurrentPartId,
  createAssemblyPlan,
  createAssemblyState,
  isPartVisibleInAssemblyStep,
  reduceAssembly,
} from "../../src/ui/viewer/assembly";

function exerciseDependencyRecovery(parts: readonly PartDef[]) {
  const plan = createAssemblyPlan(parts);
  let state = reduceAssembly(plan, createAssemblyState(plan), {
    type: "enter-exploded",
  });
  const child = parts.find((part) => {
    if (!part.parent) return false;
    return !plan.partById.get(part.parent)?.parent;
  });
  if (!child?.parent) throw new Error("Expected a child with a root parent");

  state = reduceAssembly(plan, state, {
    type: "attempt-seat",
    partId: child.id,
    distanceFromHome: 0,
    partRadius: 1,
  });
  expect(state.errorPartId).toBe(child.id);
  expect(state.hint).toEqual({
    kind: "parent-required",
    partId: child.id,
    requiredPartId: child.parent,
  });
  expect(state.transmissionEnabled).toBe(false);

  for (const partId of plan.orderedPartIds) {
    state = reduceAssembly(plan, state, {
      type: "attempt-seat",
      partId,
      distanceFromHome: 0,
      partRadius: 1,
    });
  }

  expect(state.complete).toBe(true);
  expect(state.errorPartId).toBeNull();
  expect(state.transmissionEnabled).toBe(true);
  expect(state.completionEffectToken).toBe(1);
}

describe("assembly controller", () => {
  it("rejects out-of-order parts and restores gimbal transmission", () => {
    exerciseDependencyRecovery(gimbal.spec.parts);
  });

  it("rejects out-of-order parts and restores odometer transmission", () => {
    exerciseDependencyRecovery(odometer.spec.parts);
  });

  it("snaps only within fifteen percent of the part radius", () => {
    const plan = createAssemblyPlan([gimbal.spec.parts[0]]);
    let state = reduceAssembly(plan, createAssemblyState(plan), {
      type: "enter-exploded",
    });
    state = reduceAssembly(plan, state, {
      type: "attempt-seat",
      partId: plan.orderedPartIds[0],
      distanceFromHome: ASSEMBLY_SNAP_RATIO + 0.001,
      partRadius: 1,
    });
    expect(state.lastAttempt?.kind).toBe("missed");
    state = reduceAssembly(plan, state, {
      type: "attempt-seat",
      partId: plan.orderedPartIds[0],
      distanceFromHome: ASSEMBLY_SNAP_RATIO,
      partRadius: 1,
    });
    expect(state.lastAttempt?.kind).toBe("seated");
  });

  it("uses ordered part progress for visibility across sparse repeated steps", () => {
    const parts = gimbal.spec.parts.slice(0, 4).map((part, index) => ({
      ...part,
      assemblyStep: [0, 4, 4, 9][index],
      parent: undefined,
    }));
    const plan = createAssemblyPlan(parts);
    let state = reduceAssembly(plan, createAssemblyState(plan), {
      type: "enter-step",
    });

    expect(assemblyCurrentPartId(plan, state)).toBe(plan.orderedPartIds[0]);
    expect(
      plan.orderedPartIds.map((partId) =>
        isPartVisibleInAssemblyStep(plan, state, partId),
      ),
    ).toEqual([true, false, false, false]);

    state = reduceAssembly(plan, state, { type: "step-next" });
    expect(assemblyCurrentPartId(plan, state)).toBe(plan.orderedPartIds[1]);
    expect(
      plan.orderedPartIds.map((partId) =>
        isPartVisibleInAssemblyStep(plan, state, partId),
      ),
    ).toEqual([true, true, false, false]);
  });
});
