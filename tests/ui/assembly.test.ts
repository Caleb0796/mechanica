import { describe, expect, it } from "vitest";

import gimbal from "../../src/machines/gimbal/build";
import odometer from "../../src/machines/odometer/build";
import type { PartDef } from "../../src/sim/types";
import {
  ASSEMBLY_MAX_DURATION_MS,
  ASSEMBLY_MIN_DURATION_MS,
  ASSEMBLY_SNAP_RATIO,
  assemblyCurrentPartId,
  assemblyDurationMs,
  assemblyFlightOffset,
  assemblyPartAppearance,
  assemblyPartLocalProgress,
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
        isPartVisibleInAssemblyStep(plan, state, partId, 0),
      ),
    ).toEqual([false, false, false, false]);
    expect(
      plan.orderedPartIds.map((partId) =>
        isPartVisibleInAssemblyStep(plan, state, partId, 0.01),
      ),
    ).toEqual([true, false, false, false]);

    state = reduceAssembly(plan, state, { type: "step-next" });
    expect(assemblyCurrentPartId(plan, state)).toBe(plan.orderedPartIds[1]);
    expect(
      plan.orderedPartIds.map((partId) =>
        isPartVisibleInAssemblyStep(plan, state, partId, 0.26),
      ),
    ).toEqual([true, true, false, false]);
  });

  it("clamps assembly duration from the runtime part count", () => {
    expect(assemblyDurationMs(1)).toBe(ASSEMBLY_MIN_DURATION_MS);
    expect(assemblyDurationMs(20)).toBe(5_600);
    expect(assemblyDurationMs(100)).toBe(ASSEMBLY_MAX_DURATION_MS);
  });

  it("staggers local progress by ordered part index", () => {
    const parts = gimbal.spec.parts.slice(0, 3).map((part) => ({
      ...part,
      parent: undefined,
    }));
    const plan = createAssemblyPlan(parts);

    expect(assemblyPartLocalProgress(plan, 0, plan.orderedPartIds[0])).toBe(0);
    expect(assemblyPartLocalProgress(plan, 0.25, plan.orderedPartIds[0])).toBe(
      0.75,
    );
    expect(assemblyPartLocalProgress(plan, 0.25, plan.orderedPartIds[1])).toBe(
      0,
    );
    expect(assemblyPartLocalProgress(plan, 0.5, plan.orderedPartIds[1])).toBe(
      0.5,
    );
    expect(assemblyPartLocalProgress(plan, 1, plan.orderedPartIds[2])).toBe(1);
  });

  it("eases each part flight and fades its first fifteen percent", () => {
    const part = {
      ...gimbal.spec.parts[0],
      explodeVector: [1, 0, 0] as [number, number, number],
    };

    expect(assemblyFlightOffset(part, 0)).toEqual([2, 0.3, 0]);
    expect(assemblyFlightOffset(part, 0.5)).toEqual([0.25, 0.0375, 0]);
    expect(assemblyFlightOffset(part, 1)).toEqual([0, 0, 0]);
    expect(assemblyPartAppearance(0)).toBe(0);
    expect(assemblyPartAppearance(0.075)).toBe(0.875);
    expect(assemblyPartAppearance(0.15)).toBe(1);
  });

  it("grounds and scale-spaces every staging part on the machine plane", () => {
    const plan = createAssemblyPlan(gimbal.spec.parts);
    expect(plan.stagingByPartId.size).toBe(plan.orderedPartIds.length);
    for (const slot of plan.stagingByPartId.values()) {
      expect(slot.position[1] - slot.groundOffset).toBeCloseTo(
        plan.stagingGroundY,
        10,
      );
    }
    const xPositions = [
      ...new Set(
        [...plan.stagingByPartId.values()].map((slot) => slot.position[0]),
      ),
    ].sort((a, b) => a - b);
    expect(xPositions[1] - xPositions[0]).toBeLessThan(0.2);
    expect(plan.stagingByPartId.get("outer-shell")?.radius).toBeCloseTo(
      0.0225,
      10,
    );
    expect(plan.stagingByPartId.get("inner-ring")?.radius).toBeCloseTo(
      0.0168,
      10,
    );
  });
});
