import { describe, expect, it } from "vitest";

import { EscapementSim } from "../../src/sim/escapement";
import type { EscapementDef } from "../../src/sim/types";

const definition: EscapementDef = {
  wheel: "celestial-wheel",
  scoops: 36,
  fillSecondsPerScoop: 2,
  stepRad: Math.PI / 18,
  leverParts: {
    tianguan: "tianguan",
    gecha: "gecha",
    guanshe: "guanshe",
    tiansuoL: "tiansuo-left",
    tiansuoR: "tiansuo-right",
  },
};

describe("EscapementSim", () => {
  it("progresses filling, release, locked, then filling deterministically", () => {
    const escapement = new EscapementSim(definition);
    expect(escapement.tick(1)).toMatchObject({ advancedRad: 0, phase: "filling" });
    const released = escapement.tick(1);
    expect(released.advancedRad).toBe(definition.stepRad);
    expect(released.phase).toBe("filling");
    expect(released.events.map((event) => event.part)).toEqual([
      "celestial-wheel",
      "tianguan",
      "gecha",
      "guanshe",
      "tiansuo-right",
    ]);
  });

  it("is independent of timestep partitioning and retains fractional fill", () => {
    const whole = new EscapementSim(definition);
    const partitioned = new EscapementSim(definition);
    const wholeTick = whole.tick(5);
    let partitionedAdvance = 0;
    for (const dt of [1, 0.5, 1.5, 0.75, 1.25]) {
      partitionedAdvance += partitioned.tick(dt).advancedRad;
    }

    expect(wholeTick.advancedRad).toBeCloseTo(partitionedAdvance, 12);
    expect(wholeTick.phase).toBe("filling");
    expect(whole.drainEvents()).toEqual(partitioned.drainEvents());
    expect(whole.tick(1).advancedRad).toBe(definition.stepRad);
    expect(partitioned.tick(1).advancedRad).toBe(definition.stepRad);
  });

  it("allows a forward force step and exposes the right-lock reverse block", () => {
    const escapement = new EscapementSim(definition);
    expect(escapement.forceStep(1)).toBe(definition.stepRad);
    expect(escapement.forceStep(-1)).toBe(0);
    expect(escapement.drainEvents()).toEqual([
      expect.objectContaining({ type: "forced", part: "tianguan" }),
      expect.objectContaining({ type: "blocked", part: "tiansuo-right" }),
    ]);
    expect(escapement.lastEvents()).toEqual([]);
  });
});
