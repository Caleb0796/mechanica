import { describe, expect, it } from "vitest";

import {
  createExploreDoubleTapRecognizer,
  type ExploreTapEvent,
} from "../../src/ui/viewer/exploreDoubleTap";

type Recognizer = ReturnType<typeof createExploreDoubleTapRecognizer>;

function input(
  recognizer: Recognizer,
  type: ExploreTapEvent["type"],
  time: number,
  overrides: Partial<ExploreTapEvent> = {},
) {
  return recognizer.handle({
    type,
    time,
    pointerId: 1,
    pointerType: "touch",
    x: 100,
    y: 200,
    ...overrides,
  });
}

function tap(
  recognizer: Recognizer,
  time: number,
  overrides: Partial<ExploreTapEvent> = {},
) {
  input(recognizer, "down", time, overrides);
  return input(recognizer, "up", time + 30, overrides);
}

describe("exploration double tap", () => {
  it.each(["mouse", "pen", "touch"])(
    "recognizes two stationary %s taps, returning the second tap position",
    (pointerType) => {
      const recognizer = createExploreDoubleTapRecognizer();
      expect(tap(recognizer, 0, { pointerType })).toBeNull();
      expect(tap(recognizer, 100, { pointerType, x: 111 })).toEqual({
        x: 111,
        y: 200,
      });
    },
  );

  it("consumes a pair, so a triple tap fires only once", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    const results = [0, 100, 200].map((time) => tap(recognizer, time));
    expect(results).toEqual([null, { x: 100, y: 200 }, null]);
  });

  it("allows small touch jitter within each tap", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    input(recognizer, "move", 120, { x: 108 });
    expect(input(recognizer, "up", 140, { x: 107 })).toEqual({
      x: 107,
      y: 200,
    });
  });

  it("rejects dragging out and back even when the release matches the start", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    input(recognizer, "move", 110, { x: 125 });
    input(recognizer, "move", 120);
    expect(input(recognizer, "up", 130)).toBeNull();
    expect(tap(recognizer, 200)).toBeNull();
  });

  it("rejects movement that appears only on release", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    expect(input(recognizer, "up", 130, { y: 209 })).toBeNull();
  });

  it("rejects long presses and does not pair a later tap with one", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    expect(input(recognizer, "up", 401)).toBeNull();
    expect(tap(recognizer, 450)).toBeNull();
  });

  it("starts a new pair when taps are too far apart in time or space", () => {
    for (const second of [
      { time: 351, x: 100 },
      { time: 100, x: 125 },
    ]) {
      const recognizer = createExploreDoubleTapRecognizer();
      tap(recognizer, 0);
      expect(tap(recognizer, second.time, { x: second.x })).toBeNull();
      expect(
        tap(recognizer, second.time + 100, { x: second.x }),
      ).toEqual({ x: second.x, y: 200 });
    }
  });

  it("never pairs taps from different input devices", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0, { pointerType: "touch" });
    expect(tap(recognizer, 100, { pointerType: "mouse" })).toBeNull();
    expect(tap(recognizer, 200, { pointerType: "mouse" })).not.toBeNull();
  });

  it("cancellation clears the pending pair", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    input(recognizer, "cancel", 110);
    expect(input(recognizer, "up", 120)).toBeNull();
    expect(tap(recognizer, 150)).toBeNull();
  });

  it("blocks a pinch until every finger is released, including non-primary ones", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    input(recognizer, "down", 110, {
      pointerId: 2,
      isPrimary: false,
      eligible: false,
    });
    expect(input(recognizer, "up", 120)).toBeNull();
    // A new primary press while finger two remains down is still part of it.
    input(recognizer, "down", 130);
    expect(input(recognizer, "up", 140, { pointerId: 2 })).toBeNull();
    expect(input(recognizer, "up", 150)).toBeNull();
    expect(tap(recognizer, 200)).toBeNull();
    expect(tap(recognizer, 300)).toEqual({ x: 100, y: 200 });
  });

  it("keeps the other finger blocked when one finger is cancelled", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    input(recognizer, "down", 0);
    input(recognizer, "down", 10, { pointerId: 2, isPrimary: false });
    input(recognizer, "cancel", 20, { pointerId: 2 });
    expect(input(recognizer, "up", 30)).toBeNull();
    expect(tap(recognizer, 100)).toBeNull();
  });

  it.each([{ eligible: false }, { button: 2 }, { isPrimary: false }])(
    "ignores ineligible presses and clears a prior tap: %j",
    (overrides) => {
      const recognizer = createExploreDoubleTapRecognizer();
      tap(recognizer, 0);
      expect(tap(recognizer, 100, overrides)).toBeNull();
      expect(tap(recognizer, 200)).toBeNull();
    },
  );

  it("reset discards a tap and an active pointer, as blur or disabling does", () => {
    const recognizer = createExploreDoubleTapRecognizer();
    tap(recognizer, 0);
    input(recognizer, "down", 100);
    recognizer.reset();
    expect(input(recognizer, "up", 120)).toBeNull();
    expect(tap(recognizer, 150)).toBeNull();
    expect(tap(recognizer, 250)).not.toBeNull();
  });
});
