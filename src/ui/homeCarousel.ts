import type { MachineSlug } from "../sim/types";

export interface HomeCarouselState {
  paused: boolean;
  step: number;
}

export type HomeCarouselEvent =
  | { type: "activate"; index?: number }
  | { type: "advance"; delta?: -1 | 1 }
  | { type: "hover"; paused: boolean }
  | { type: "select"; index: number };

export interface HomeCarouselTransition {
  navigateTo?: string;
  state: HomeCarouselState;
}

export function activeHomeCarouselIndex(
  step: number,
  machineCount: number,
): number {
  if (machineCount === 0) return 0;
  return ((step % machineCount) + machineCount) % machineCount;
}

export function createHomeCarouselState(): HomeCarouselState {
  return { paused: false, step: 0 };
}

export function transitionHomeCarousel(
  state: HomeCarouselState,
  event: HomeCarouselEvent,
  slugs: readonly MachineSlug[],
): HomeCarouselTransition {
  if (event.type === "activate") {
    const index =
      event.index ?? activeHomeCarouselIndex(state.step, slugs.length);
    return { navigateTo: `#/m/${slugs[index]}`, state };
  }
  if (event.type === "hover") {
    return { state: { ...state, paused: event.paused } };
  }
  if (event.type === "advance") {
    if (state.paused || slugs.length < 2) return { state };
    return { state: { ...state, step: state.step + (event.delta ?? 1) } };
  }
  if (slugs.length < 2) return { state };
  const activeIndex = activeHomeCarouselIndex(state.step, slugs.length);
  let delta = (event.index - activeIndex + slugs.length) % slugs.length;
  if (delta > slugs.length / 2) delta -= slugs.length;
  return { state: { ...state, step: state.step + delta } };
}
