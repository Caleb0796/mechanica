import { describe, expect, it } from "vitest";

import machine from "../../src/machines/seismoscope/build";
import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";
import {
  createExploreAction,
  sampleExploreAction,
} from "../../src/ui/viewer/freeExploreAction";

const feng = applySchemePatch(machine.spec, machine.schemes?.fengrui);
const wang = applySchemePatch(machine.spec, machine.schemes?.wangzhenduo);

describe("free exploration action", () => {
  it("uses the authored armed and release snapshots for each selected channel", () => {
    const trigger = machine.mechanism!.triggers.find(
      (candidate) => candidate.id === "quake",
    )!;
    for (let channel = 0; channel < 8; channel += 1) {
      const graph = new KinematicGraph(feng);
      let armed: Record<string, number> = {};
      let released: Record<string, number> = {};
      trigger.run(graph, (type, part) => {
        if (type === "drive" && part === `gate-${channel}`) {
          armed = graph.state();
        }
        if (type === "releaseBall" && part === `dragon-${channel}`) {
          released = graph.state();
        }
      }, channel);

      const clip = createExploreAction(machine, feng, channel);
      expect(clip.canRelease).toBe(true);
      for (const id of [
        "duzhu",
        "linkage-crown",
        `gate-${channel}`,
        `lock-${channel}`,
        `dragon-${channel}`,
      ]) {
        expect(clip.armedState[id]).toBe(armed[id]);
        expect(clip.releasedState[id]).toBe(released[id]);
      }
      expect(sampleExploreAction(clip, clip.releaseSeconds).state).toEqual(
        clip.releasedState,
      );
      for (let other = 0; other < 8; other += 1) {
        if (other === channel) continue;
        expect(clip.releasedState[`dragon-${other}`]).toBe(0);
        expect(clip.releasedState[`gate-${other}`]).toBe(0);
      }
    }
  });

  it("leaves every free ball and toad untouched and respects the resolved joints", () => {
    const clip = createExploreAction(machine, feng, 2);
    const ids = feng.parts.map((part) => part.id).sort();
    for (let step = 0; step <= 200; step += 1) {
      const { state } = sampleExploreAction(clip, step / 100);
      expect(Object.keys(state).sort()).toEqual(ids);
      for (const part of feng.parts) {
        expect(Number.isFinite(state[part.id])).toBe(true);
        if (/^(ball|toad)-/.test(part.id)) {
          expect(state[part.id]).toBe(0);
        }
        if (part.joint?.limits) {
          expect(state[part.id]).toBeGreaterThanOrEqual(
            part.joint.limits[0],
          );
          expect(state[part.id]).toBeLessThanOrEqual(part.joint.limits[1]);
        }
      }
    }
  });

  it("releases at the threshold and restores neutral joints without moving loose parts", () => {
    const clip = createExploreAction(machine, feng, 6);
    expect(sampleExploreAction(clip, -1).state).toEqual(clip.neutralState);
    expect(sampleExploreAction(clip, clip.releaseSeconds - 0.001)).toMatchObject({
      phase: "sensing",
      release: false,
      done: false,
    });
    expect(sampleExploreAction(clip, clip.releaseSeconds)).toMatchObject({
      phase: "release",
      release: true,
      done: false,
    });
    for (const time of [clip.durationSeconds, 5, Infinity]) {
      expect(sampleExploreAction(clip, time)).toEqual({
        state: clip.neutralState,
        phase: "settled",
        release: true,
        done: true,
      });
      expect(Object.values(sampleExploreAction(clip, time).state)).toEqual(
        feng.parts.map(() => 0),
      );
    }
  });

  it("does not synthesize a working release for Wang's inert scheme", () => {
    const clip = createExploreAction(machine, wang, 6);
    expect(clip.canRelease).toBe(false);
    for (const time of [0, 0.7, 2]) {
      expect(sampleExploreAction(clip, time)).toEqual({
        state: clip.neutralState,
        phase: "settled",
        release: false,
        done: true,
      });
    }
  });

  it("keeps sampling independent and rejects invalid channels", () => {
    const clip = createExploreAction(machine, feng, 1);
    const before = structuredClone(clip);
    const first = sampleExploreAction(clip, 0.8);
    first.state["dragon-1"] = 99;
    expect(sampleExploreAction(clip, 0.8).state["dragon-1"]).toBe(
      clip.releasedState["dragon-1"],
    );
    expect(clip).toEqual(before);
    for (const channel of [-1, 8, 1.5, NaN]) {
      expect(createExploreAction(machine, feng, channel).canRelease).toBe(false);
    }
  });
});
