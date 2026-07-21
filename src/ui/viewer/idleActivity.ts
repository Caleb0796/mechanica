export const VIEWER_IDLE_TIMEOUT_MS = 30_000;

export interface ViewerIdleState {
  autoPaused: boolean;
  demand: boolean;
  paused: boolean;
  timelineActive: boolean;
}

export type ViewerIdleEvent =
  | { type: "idle-elapsed" }
  | { type: "interaction" }
  | { type: "timeline-change"; active: boolean };

export interface ViewerIdleTransition {
  executeInteraction: boolean;
  state: ViewerIdleState;
}

export function transitionViewerIdle(
  state: ViewerIdleState,
  event: ViewerIdleEvent,
): ViewerIdleTransition {
  if (event.type === "idle-elapsed") {
    if (state.timelineActive) {
      return { executeInteraction: false, state };
    }
    return {
      executeInteraction: false,
      state: {
        ...state,
        autoPaused: !state.paused,
        demand: true,
        paused: true,
      },
    };
  }
  if (event.type === "timeline-change") {
    return {
      executeInteraction: false,
      state: {
        ...state,
        autoPaused: event.active ? false : state.autoPaused,
        demand: event.active ? false : state.demand,
        paused: event.active && state.autoPaused ? false : state.paused,
        timelineActive: event.active,
      },
    };
  }
  return {
    executeInteraction: true,
    state: {
      ...state,
      autoPaused: false,
      demand: false,
      paused: state.autoPaused ? false : state.paused,
    },
  };
}
