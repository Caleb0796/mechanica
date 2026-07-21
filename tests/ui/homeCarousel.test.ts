import { describe, expect, it } from "vitest";

import type { MachineSlug } from "../../src/sim/types";
import {
  activeHomeCarouselIndex,
  createHomeCarouselState,
  transitionHomeCarousel,
} from "../../src/ui/homeCarousel";

const slugs = [
  "astroclock",
  "seismoscope",
  "odometer",
  "loom",
] as const satisfies readonly MachineSlug[];

describe("home turntable state", () => {
  it("advances one physical quarter-turn at a time", () => {
    const first = transitionHomeCarousel(
      createHomeCarouselState(),
      { type: "advance" },
      slugs,
    ).state;
    const second = transitionHomeCarousel(
      first,
      { type: "advance" },
      slugs,
    ).state;

    expect(first.step).toBe(1);
    expect(activeHomeCarouselIndex(first.step, slugs.length)).toBe(1);
    expect(second.step).toBe(2);
    expect(activeHomeCarouselIndex(second.step, slugs.length)).toBe(2);
  });

  it("pauses automatic stepping and resumes afterward", () => {
    const paused = transitionHomeCarousel(
      createHomeCarouselState(),
      { type: "hover", paused: true },
      slugs,
    ).state;
    expect(
      transitionHomeCarousel(paused, { type: "advance" }, slugs).state,
    ).toBe(paused);

    const resumed = transitionHomeCarousel(
      paused,
      { type: "hover", paused: false },
      slugs,
    ).state;
    expect(
      transitionHomeCarousel(resumed, { type: "advance" }, slugs).state.step,
    ).toBe(1);
  });

  it("selects pills by the shortest turn and routes any clicked machine", () => {
    const selected = transitionHomeCarousel(
      createHomeCarouselState(),
      { type: "select", index: 3 },
      slugs,
    ).state;
    expect(selected.step).toBe(-1);
    expect(activeHomeCarouselIndex(selected.step, slugs.length)).toBe(3);
    expect(
      transitionHomeCarousel(selected, { type: "activate", index: 1 }, slugs)
        .navigateTo,
    ).toBe("#/m/seismoscope");
  });
});
