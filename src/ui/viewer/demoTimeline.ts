export type CapturedDemoEvent = {
  type: string;
  part: string;
  state: Record<string, number>;
};

export type TimelineEntry = {
  event: CapturedDemoEvent;
  kind: "camera" | "caption" | "motion";
  motionMs: number;
  dwellMs: number;
};

const DEMO_TARGET_MAX_MS = 48_000;

export function buildDemoTimeline(
  captured: CapturedDemoEvent[],
  captionOf: (type: string, part: string) => string,
  statesDiffer: (
    a: Record<string, number>,
    b: Record<string, number>,
  ) => boolean,
  initialState: Record<string, number>,
): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];
  let previousState = initialState;
  let previousCaption = "";
  for (const event of captured) {
    const changed = statesDiffer(previousState, event.state);
    if (event.type === "camera") {
      timeline.push({ event, kind: "camera", motionMs: 900, dwellMs: 0 });
      previousState = event.state;
      continue;
    }
    const caption = captionOf(event.type, event.part);
    const freshCaption = caption !== "" && caption !== previousCaption;
    if (caption !== "") previousCaption = caption;
    const motionMs = changed ? (event.type.includes("drive") ? 420 : 260) : 60;
    const dwellMs = freshCaption
      ? Math.min(4200, Math.max(1600, 85 * caption.length))
      : 120;
    timeline.push({
      event,
      kind: freshCaption ? "caption" : "motion",
      motionMs,
      dwellMs,
    });
    previousState = event.state;
  }
  const totalMotion = timeline.reduce(
    (total, entry) => total + entry.motionMs,
    0,
  );
  const totalDwell = timeline.reduce(
    (total, entry) => total + entry.dwellMs,
    0,
  );
  if (totalMotion + totalDwell > DEMO_TARGET_MAX_MS && totalDwell > 0) {
    const dwellScale = (DEMO_TARGET_MAX_MS - totalMotion) / totalDwell;
    for (const entry of timeline) {
      if (entry.kind === "camera") continue;
      const dwellFloor = entry.kind === "caption" ? 1300 : 120;
      entry.dwellMs = Math.max(
        dwellFloor,
        Math.floor(entry.dwellMs * dwellScale),
      );
    }
  }
  return timeline;
}

export function demoSpeedFromEnv(): number {
  return import.meta.env.VITE_E2E === "1" ? 8 : 1;
}
