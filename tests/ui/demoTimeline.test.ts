import { describe, expect, it } from "vitest";

import astroclock from "../../src/machines/astroclock/build";
import loom from "../../src/machines/loom/build";
import odometer from "../../src/machines/odometer/build";
import seismoscope from "../../src/machines/seismoscope/build";
import { KinematicGraph } from "../../src/sim/graph";
import { buildDemoTimeline } from "../../src/ui/viewer/demoTimeline";

const differ = (a: Record<string, number>, b: Record<string, number>) =>
  JSON.stringify(a) !== JSON.stringify(b);

describe("buildDemoTimeline", () => {
  const s0 = { shulun: 0 };
  const s1 = { shulun: 0.17 };
  const captured = [
    { type: "camera", part: "shulun", state: s0 },
    { type: "caption:fill", part: "scoop-01", state: s0 },
    { type: "drive", part: "shulun", state: s1 },
    { type: "caption:fill", part: "scoop-01", state: s1 }, // repeat caption
  ];
  const captionOf = (type: string) =>
    type === "caption:fill" ? "Water reaches the receiving scoop" : "";

  it("camera events get motion time but no reading dwell", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[0].kind).toBe("camera");
    expect(tl[0].motionMs).toBe(900);
    expect(tl[0].dwellMs).toBe(0);
  });

  it("captioned events dwell long enough to read (>=1600ms, 85ms/char, cap 4200)", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[1].kind).toBe("caption");
    const len = "Water reaches the receiving scoop".length;
    expect(tl[1].dwellMs).toBe(Math.min(4200, Math.max(1600, 85 * len)));
  });

  it("state-changing drive events keep motion pacing", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[2].kind).toBe("motion");
    expect(tl[2].motionMs).toBe(420);
  });

  it("repeated caption text does not dwell twice", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[3].dwellMs).toBe(120);
  });

  it("normalizes long demos under 48 seconds without shrinking fresh captions below 1300ms", () => {
    const longCaptured = Array.from({ length: 17 }, (_, index) => ({
      type: `caption:phase-${index}`,
      part: `part-${index}`,
      state: s0,
    }));
    const longCaptionOf = (type: string) =>
      `${type} describes a deliberately long mechanism handoff for visitors`;
    const tl = buildDemoTimeline(longCaptured, longCaptionOf, differ, s0);
    const total = tl.reduce(
      (duration, entry) => duration + entry.motionMs + entry.dwellMs,
      0,
    );

    expect(total).toBeLessThanOrEqual(48_000);
    expect(tl.every((entry) => entry.dwellMs >= 1300)).toBe(true);
  });
});

describe("viewer demo trigger inventory", () => {
  it.each([astroclock, loom, odometer, seismoscope])(
    "fires every $data.slug trigger exposed as a button",
    (machine) => {
      for (const trigger of machine.mechanism?.triggers ?? []) {
        if (trigger.id.startsWith("drive:")) continue;
        const graph = new KinematicGraph(machine.spec);
        const schemeId =
          machine.data.slug === "seismoscope"
            ? "fengrui"
            : machine.defaultSchemeId;
        if (schemeId && machine.schemes?.[schemeId]) {
          graph.setScheme(machine.schemes[schemeId]);
        }
        const events: Array<{ part: string; type: string }> = [];

        trigger.run(
          graph,
          (type, part) => events.push({ part, type }),
          trigger.id === "quake" || trigger.id === "quake:arm" ? 6 : undefined,
        );

        expect(events, trigger.id).not.toHaveLength(0);
      }
    },
  );
});
