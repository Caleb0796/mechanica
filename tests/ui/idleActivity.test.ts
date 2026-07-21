import { describe, expect, it } from "vitest";

import {
  transitionViewerIdle,
  VIEWER_IDLE_TIMEOUT_MS,
  type ViewerIdleState,
} from "../../src/ui/viewer/idleActivity";

const activeState: ViewerIdleState = {
  autoPaused: false,
  demand: false,
  paused: false,
  timelineActive: true,
};

describe("viewer idle activity", () => {
  it("does not pause when idle elapses during an active timeline", () => {
    expect(transitionViewerIdle(activeState, { type: "idle-elapsed" })).toEqual(
      { executeInteraction: false, state: activeState },
    );
  });

  it("resumes an auto-paused viewer and still executes a trigger click", () => {
    const pausedState: ViewerIdleState = {
      autoPaused: true,
      demand: true,
      paused: true,
      timelineActive: false,
    };
    const transition = transitionViewerIdle(pausedState, {
      type: "interaction",
    });
    let demoRuns = 0;
    if (transition.executeInteraction) demoRuns += 1;

    expect(transition.state).toEqual({
      autoPaused: false,
      demand: false,
      paused: false,
      timelineActive: false,
    });
    expect(demoRuns).toBe(1);
  });

  it("keeps the idle threshold at thirty seconds or longer", () => {
    expect(VIEWER_IDLE_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
  });
});
