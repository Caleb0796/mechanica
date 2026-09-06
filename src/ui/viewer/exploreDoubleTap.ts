export interface ExploreTapPoint {
  x: number;
  y: number;
}

export interface ExploreTapEvent extends ExploreTapPoint {
  type: "down" | "move" | "up" | "cancel";
  pointerId: number;
  pointerType: string;
  time: number;
  /** A tap must begin on the exploration canvas. Other pointers still block it. */
  eligible?: boolean;
  isPrimary?: boolean;
  button?: number;
}

interface PointerStart extends ExploreTapPoint {
  time: number;
  pointerType: string;
  moved: boolean;
}

interface CompletedTap extends ExploreTapPoint {
  time: number;
  pointerType: string;
}

const MAX_TAP_DURATION_MS = 300;
const MAX_TAP_INTERVAL_MS = 350;
const MAX_TAP_MOVEMENT_PX = 8;
const MAX_TAP_SEPARATION_PX = 24;

/** Recognizes pairs of short stationary releases without consuming any input. */
export function createExploreDoubleTapRecognizer() {
  const active = new Map<number, PointerStart>();
  let previous: CompletedTap | null = null;
  let blocked = false;

  const reset = () => {
    active.clear();
    previous = null;
    blocked = false;
  };

  const handle = (event: ExploreTapEvent): ExploreTapPoint | null => {
    if (event.type === "cancel") {
      active.delete(event.pointerId);
      previous = null;
      blocked = active.size > 0;
      return null;
    }

    if (event.type === "down") {
      const repeatedDown = active.has(event.pointerId);
      active.set(event.pointerId, {
        x: event.x,
        y: event.y,
        time: event.time,
        pointerType: event.pointerType,
        moved: false,
      });
      if (
        repeatedDown ||
        active.size > 1 ||
        event.eligible === false ||
        event.isPrimary === false ||
        (event.button !== undefined && event.button !== 0)
      ) {
        blocked = true;
        previous = null;
      } else if (previous?.pointerType !== event.pointerType) {
        previous = null;
      }
      return null;
    }

    const start = active.get(event.pointerId);
    if (!start) return null;

    // Remember every excursion: dragging out and back is still a drag.
    if (
      Math.hypot(event.x - start.x, event.y - start.y) >
        MAX_TAP_MOVEMENT_PX ||
      event.time < start.time ||
      !Number.isFinite(event.x + event.y + event.time)
    ) {
      start.moved = true;
      previous = null;
    }
    if (event.type === "move") return null;

    active.delete(event.pointerId);
    if (blocked) {
      if (active.size === 0) blocked = false;
      return null;
    }
    if (
      start.moved ||
      event.time - start.time > MAX_TAP_DURATION_MS ||
      start.pointerType !== event.pointerType
    ) {
      previous = null;
      return null;
    }

    const tap: CompletedTap = {
      x: event.x,
      y: event.y,
      time: event.time,
      pointerType: event.pointerType,
    };
    if (
      previous &&
      tap.pointerType === previous.pointerType &&
      tap.time >= previous.time &&
      tap.time - previous.time <= MAX_TAP_INTERVAL_MS &&
      Math.hypot(tap.x - previous.x, tap.y - previous.y) <=
        MAX_TAP_SEPARATION_PX
    ) {
      // Consume both taps, so a triple tap produces only one earthquake.
      previous = null;
      return { x: tap.x, y: tap.y };
    }
    previous = tap;
    return null;
  };

  return { handle, reset };
}
