import { describe, expect, it } from "vitest";

import spec from "../../src/machines/seismoscope/parts.json";
import {
  sampleTremorDisplacement,
  TREMOR_DURATION_SECONDS,
  tremorForChannel,
  tremorFromPoint,
} from "../../src/ui/viewer/exploreTremor";

const RIGHT = [1, 0, 0] as const;
const UP = [0, 0, 1] as const;

describe("exploration tremor input", () => {
  it("matches every channel to the authored ball position", () => {
    for (let channel = 0; channel < 8; channel += 1) {
      const part = spec.parts.find(({ id }) => id === `ball-${channel}`)!;
      const [x, , z] = part.position;
      const gesture = tremorFromPoint([x * 100, -z * 100], RIGHT, UP);
      expect(gesture.channel).toBe(channel);
      expect(gesture.direction[0]).toBeCloseTo(x / Math.hypot(x, z));
      expect(gesture.direction[1]).toBe(0);
      expect(gesture.direction[2]).toBeCloseTo(z / Math.hypot(x, z));
      const keyboard = tremorForChannel(channel);
      expect(keyboard.direction[0]).toBeCloseTo(gesture.direction[0]);
      expect(keyboard.direction[2]).toBeCloseTo(gesture.direction[2]);
    }
  });

  it("follows the orbit view, including DOM's downward y axis", () => {
    const rotatedRight = [0, 0, -2] as const;
    const rotatedUp = [3, 4, 0] as const;
    expect(tremorFromPoint([100, 0], rotatedRight, rotatedUp).channel).toBe(4);
    expect(tremorFromPoint([0, -100], rotatedRight, rotatedUp).channel).toBe(2);
    expect(tremorFromPoint([0, 100], rotatedRight, rotatedUp).channel).toBe(6);
    expect(tremorFromPoint([100, -100], rotatedRight, rotatedUp).channel).toBe(3);
  });

  it("keeps the selected bearing within the center area, including its boundary", () => {
    for (const displacement of [[0, 0], [16, 16], [24, 0]] as const) {
      expect(tremorFromPoint(displacement, RIGHT, UP, 5)).toEqual(
        tremorForChannel(5, 0.65),
      );
    }
    expect(tremorFromPoint([0, 0], RIGHT, UP).channel).toBe(1);
    expect(tremorFromPoint([24.01, 0], RIGHT, UP, 5).channel).toBe(2);
  });

  it("uses the same display strength regardless of tap distance or direction", () => {
    for (const displacement of [
      [0, 0],
      [25, 0],
      [76, 0],
      [140, 0],
      [-1000, 0],
      [0, 1000],
    ] as const) {
      expect(tremorFromPoint(displacement, RIGHT, UP).strength).toBe(0.65);
    }
    expect(tremorFromPoint([25, 0], RIGHT, UP)).toEqual(
      tremorFromPoint([1000, 0], RIGHT, UP),
    );
  });

  it("selects the nearest channel across angular boundaries and north wraparound", () => {
    const atDegrees = (degrees: number) => {
      const angle = (degrees * Math.PI) / 180;
      return tremorFromPoint(
        [100 * Math.sin(angle), -100 * Math.cos(angle)],
        RIGHT,
        UP,
      );
    };
    expect(atDegrees(22.49).channel).toBe(0);
    expect(atDegrees(22.51).channel).toBe(1);
    expect(atDegrees(337.49).channel).toBe(7);
    expect(atDegrees(337.51).channel).toBe(0);
    expect(atDegrees(22.51).direction).toEqual(tremorForChannel(1).direction);
  });

  it("keeps the selected bearing when a point or camera basis cannot define a direction", () => {
    const fallback = tremorForChannel(6, 0.65);
    expect(tremorFromPoint([NaN, 100], RIGHT, UP, 6)).toEqual(fallback);
    expect(tremorFromPoint([100, Infinity], RIGHT, UP, 6)).toEqual(fallback);
    expect(tremorFromPoint([100, 0], [0, 1, 0], UP, 6)).toEqual(fallback);
    expect(tremorFromPoint([100, 100], RIGHT, RIGHT, 6)).toEqual(fallback);
    expect(tremorFromPoint([100, 0], [NaN, 0, 1], UP, 6)).toEqual(fallback);
    for (const invalidChannel of [-1, 8, 0.5, NaN]) {
      expect(tremorFromPoint([0, 0], RIGHT, UP, invalidChannel)).toEqual(
        tremorForChannel(1, 0.65),
      );
    }
    expect(
      tremorFromPoint([Number.MAX_VALUE, -Number.MAX_VALUE], RIGHT, UP),
    ).toEqual(tremorForChannel(1, 0.65));
  });

  it("validates explicit channel input and clamps relative display strength", () => {
    for (const channel of [-1, 8, 0.5, NaN]) {
      expect(() => tremorForChannel(channel)).toThrow(RangeError);
    }
    expect(() => tremorForChannel(0, Infinity)).toThrow(RangeError);
    expect(tremorForChannel(0, -1).strength).toBe(0);
    expect(tremorForChannel(0, 2).strength).toBe(1);
  });
});

describe("exploration tremor display", () => {
  it("returns to exact rest after the pulse, including dropped animation frames", () => {
    const tremor = tremorForChannel(1, 1);
    for (const time of [-1, 0, TREMOR_DURATION_SECONDS, 10, Infinity, NaN]) {
      expect(sampleTremorDisplacement(tremor, time)).toEqual([0, 0, 0]);
    }
    expect(sampleTremorDisplacement(tremor, 0.12)).not.toEqual([0, 0, 0]);
    expect(sampleTremorDisplacement(tremorForChannel(1, 0), 0.12)).toEqual([0, 0, 0]);
  });

  it("stays horizontal, bounded, and proportional to relative display strength", () => {
    const strong = tremorForChannel(1, 1);
    const weak = tremorForChannel(1, 0.25);
    const original = structuredClone(strong);
    let earlyPeak = 0;
    let latePeak = 0;
    let positive = false;
    let negative = false;
    for (let step = 1; step < 180; step += 1) {
      const time = step / 100;
      const displacement = sampleTremorDisplacement(strong, time);
      const weakerDisplacement = sampleTremorDisplacement(weak, time);
      const distance = Math.hypot(...displacement);
      expect(displacement[1]).toBe(0);
      expect(displacement[0]).toBeCloseTo(displacement[2]);
      expect(distance).toBeLessThanOrEqual(0.065);
      expect(weakerDisplacement[0]).toBeCloseTo(displacement[0] * 0.25);
      expect(weakerDisplacement[2]).toBeCloseTo(displacement[2] * 0.25);
      if (time < 0.5) earlyPeak = Math.max(earlyPeak, distance);
      if (time > 1) latePeak = Math.max(latePeak, distance);
      positive ||= displacement[0] > 0;
      negative ||= displacement[0] < 0;
    }
    expect(earlyPeak).toBeGreaterThan(latePeak * 4);
    expect(positive && negative).toBe(true);
    expect(strong).toEqual(original);
  });
});
