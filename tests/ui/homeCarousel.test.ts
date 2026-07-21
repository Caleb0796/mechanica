import { describe, expect, it } from "vitest";

import type { MachineSlug } from "../../src/sim/types";
import {
  createHomeCarouselState,
  transitionHomeCarousel,
} from "../../src/ui/homeCarousel";

const slugs = [
  "astroclock",
  "seismoscope",
  "odometer",
  "loom",
] as const satisfies readonly MachineSlug[];

describe("home carousel state", () => {
  it("advances one machine through exit and enter phases", () => {
    const exiting = transitionHomeCarousel(
      createHomeCarouselState(),
      { type: "cycle" },
      slugs,
    ).state;
    expect(exiting).toMatchObject({ pendingIndex: 1, phase: "exiting" });

    const entering = transitionHomeCarousel(
      exiting,
      { type: "exit-complete" },
      slugs,
    ).state;
    expect(entering).toMatchObject({
      activeIndex: 1,
      pendingIndex: null,
      phase: "entering",
    });

    expect(
      transitionHomeCarousel(
        entering,
        { type: "enter-complete" },
        slugs,
      ).state.phase,
    ).toBe("idle");
  });

  it("pauses cycling while hovered and resumes afterward", () => {
    const paused = transitionHomeCarousel(
      createHomeCarouselState(),
      { type: "hover", paused: true },
      slugs,
    ).state;
    expect(
      transitionHomeCarousel(paused, { type: "cycle" }, slugs).state,
    ).toBe(paused);

    const resumed = transitionHomeCarousel(
      paused,
      { type: "hover", paused: false },
      slugs,
    ).state;
    expect(
      transitionHomeCarousel(resumed, { type: "cycle" }, slugs).state.phase,
    ).toBe("exiting");
  });

  it("routes activation to the current machine", () => {
    const state = {
      ...createHomeCarouselState(),
      activeIndex: 2,
    };
    expect(
      transitionHomeCarousel(state, { type: "activate" }, slugs).navigateTo,
    ).toBe("#/m/odometer");
  });
});
