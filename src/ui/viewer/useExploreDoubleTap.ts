import { useEffect, useRef, type RefObject } from "react";

import {
  createExploreDoubleTapRecognizer,
  type ExploreTapEvent,
} from "./exploreDoubleTap";

interface ExploreDoubleTapOptions {
  stageRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onDoubleTap: (x: number, y: number) => void;
}

/** Observe taps alongside orbit and part dragging; never capture or consume them. */
export function useExploreDoubleTap(options: ExploreDoubleTapOptions): void {
  const latest = useRef(options);
  latest.current = options;
  const { stageRef, enabled } = options;

  useEffect(() => {
    const stage = stageRef.current;
    if (!enabled || !stage) return;

    const recognizer = createExploreDoubleTapRecognizer();
    let pendingFrame: number | null = null;
    const reset = () => {
      recognizer.reset();
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
    };
    const sample = (
      event: PointerEvent,
      type: ExploreTapEvent["type"],
    ): ExploreTapEvent => ({
      type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      eligible:
        event.target instanceof HTMLCanvasElement &&
        stage.contains(event.target),
      isPrimary: event.isPrimary,
      button: event.button,
    });
    const onDown = (event: PointerEvent) => {
      // A new drag or second finger takes precedence over a queued quake,
      // including when a slow render delays the frame after the second tap.
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
      recognizer.handle(sample(event, "down"));
    };
    const onMove = (event: PointerEvent) => {
      for (const coalesced of event.getCoalescedEvents?.() ?? []) {
        recognizer.handle(sample(coalesced, "move"));
      }
      recognizer.handle(sample(event, "move"));
    };
    const onUp = (event: PointerEvent) => {
      const point = recognizer.handle(sample(event, "up"));
      if (!point) return;
      if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
      // Part dragging releases its pointer and state during this same event.
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;
        if (latest.current.enabled) {
          latest.current.onDoubleTap(point.x, point.y);
        }
      });
    };
    const onCancel = (event: PointerEvent) => {
      recognizer.handle(sample(event, "cancel"));
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) reset();
    };
    // Window capture also sees a second finger outside the canvas and releases
    // outside its bounds, without taking pointer ownership from other controls.
    const listenerOptions = { capture: true, passive: true };
    window.addEventListener("pointerdown", onDown, listenerOptions);
    window.addEventListener("pointermove", onMove, listenerOptions);
    window.addEventListener("pointerup", onUp, listenerOptions);
    window.addEventListener("pointercancel", onCancel, listenerOptions);
    window.addEventListener("wheel", reset, listenerOptions);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      reset();
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
      window.removeEventListener("wheel", reset, true);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, stageRef]);
}
