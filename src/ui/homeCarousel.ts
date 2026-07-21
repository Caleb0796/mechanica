import type { MachineSlug } from "../sim/types";

export type HomeCarouselPhase = "idle" | "exiting" | "entering";

export interface HomeCarouselState {
  activeIndex: number;
  paused: boolean;
  pendingIndex: number | null;
  phase: HomeCarouselPhase;
}

export type HomeCarouselEvent =
  | { type: "activate" }
  | { type: "cycle" }
  | { type: "enter-complete" }
  | { type: "exit-complete" }
  | { type: "hover"; paused: boolean };

export interface HomeCarouselTransition {
  navigateTo?: string;
  state: HomeCarouselState;
}

export function createHomeCarouselState(): HomeCarouselState {
  return {
    activeIndex: 0,
    paused: false,
    pendingIndex: null,
    phase: "idle",
  };
}

export function transitionHomeCarousel(
  state: HomeCarouselState,
  event: HomeCarouselEvent,
  slugs: readonly MachineSlug[],
): HomeCarouselTransition {
  if (event.type === "activate") {
    return {
      navigateTo: `#/m/${slugs[state.activeIndex]}`,
      state,
    };
  }
  if (event.type === "hover") {
    return { state: { ...state, paused: event.paused } };
  }
  if (event.type === "cycle") {
    if (state.paused || state.phase !== "idle" || slugs.length < 2) {
      return { state };
    }
    return {
      state: {
        ...state,
        pendingIndex: (state.activeIndex + 1) % slugs.length,
        phase: "exiting",
      },
    };
  }
  if (event.type === "exit-complete") {
    if (state.phase !== "exiting" || state.pendingIndex === null) {
      return { state };
    }
    return {
      state: {
        ...state,
        activeIndex: state.pendingIndex,
        pendingIndex: null,
        phase: "entering",
      },
    };
  }
  if (state.phase !== "entering") return { state };
  return { state: { ...state, phase: "idle" } };
}
