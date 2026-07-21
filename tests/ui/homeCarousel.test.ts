import { describe, expect, it } from "vitest";

import {
  activeHomeCarouselIndex,
  HOME_CAROUSEL_DRIFT_RADIANS_PER_SECOND,
  homeCarouselDriftSpeed,
  homeMachineScale,
  targetHomeCarouselRotation,
} from "../../src/ui/homeCarousel";

const machineCount = 4;
const quarter = Math.PI / 2;

describe("home turntable angle model", () => {
  it("maps continuous rotation through all four quadrants", () => {
    expect(activeHomeCarouselIndex(0, machineCount)).toBe(0);
    expect(activeHomeCarouselIndex(-quarter, machineCount)).toBe(1);
    expect(activeHomeCarouselIndex(-Math.PI, machineCount)).toBe(2);
    expect(activeHomeCarouselIndex(-quarter * 3, machineCount)).toBe(3);
    expect(activeHomeCarouselIndex(-Math.PI * 2, machineCount)).toBe(0);
    expect(activeHomeCarouselIndex(quarter, machineCount)).toBe(3);

    expect(homeMachineScale(0, 0, machineCount)).toBeCloseTo(1.12);
    expect(homeMachineScale(0, 1, machineCount)).toBeCloseTo(1);
    expect(homeMachineScale(-quarter / 2, 0, machineCount)).toBeCloseTo(1.06);
    expect(homeMachineScale(-quarter / 2, 1, machineCount)).toBeCloseTo(1.06);
  });

  it("targets the nearest equivalent angle for a pill tween", () => {
    const clockwiseTarget = targetHomeCarouselRotation(-0.2, 1, machineCount);
    const wrappedTarget = targetHomeCarouselRotation(-0.2, 3, machineCount);

    expect(clockwiseTarget).toBeCloseTo(-quarter);
    expect(wrappedTarget).toBeCloseTo(quarter);
    expect(activeHomeCarouselIndex(clockwiseTarget, machineCount)).toBe(1);
    expect(activeHomeCarouselIndex(wrappedTarget, machineCount)).toBe(3);
  });

  it("stops drift on hover and resumes at the authored speed", () => {
    expect(homeCarouselDriftSpeed(true, false)).toBe(0);
    expect(homeCarouselDriftSpeed(false, true)).toBe(0);
    expect(homeCarouselDriftSpeed(false, false)).toBe(
      HOME_CAROUSEL_DRIFT_RADIANS_PER_SECOND,
    );
    expect(HOME_CAROUSEL_DRIFT_RADIANS_PER_SECOND).toBeCloseTo(
      -(Math.PI * 2) / 48,
    );
  });
});
