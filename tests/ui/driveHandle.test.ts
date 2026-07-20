import { describe, expect, it } from "vitest";

import {
  beginPointerIntent,
  isPointerTap,
  pointerIntentDistance,
} from "../../src/ui/viewer/DriveHandle";

describe("pointer intent", () => {
  const start = {
    clientX: 10,
    clientY: 20,
    pointerId: 7,
    timeStamp: 100,
  };

  it("accepts a quick movement below five pixels as a tap", () => {
    const intent = beginPointerIntent(start);
    const end = { ...start, clientX: 13, clientY: 23, timeStamp: 399 };

    expect(pointerIntentDistance(intent, end)).toBeCloseTo(Math.sqrt(18));
    expect(isPointerTap(intent, end)).toBe(true);
  });

  it("rejects the five-pixel boundary, long presses, and other pointers", () => {
    const intent = beginPointerIntent(start);

    expect(isPointerTap(intent, { ...start, clientX: 13, clientY: 24 })).toBe(
      false,
    );
    expect(isPointerTap(intent, { ...start, timeStamp: 400 })).toBe(false);
    expect(isPointerTap(intent, { ...start, pointerId: 8 })).toBe(false);
  });
});
