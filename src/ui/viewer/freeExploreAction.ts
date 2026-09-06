import { KinematicGraph } from "../../sim/graph";
import type { MachineModule, MachineSpec } from "../../sim/types";

type DisplayState = Readonly<Record<string, number>>;

export interface ExploreActionClip {
  readonly channel: number;
  readonly canRelease: boolean;
  readonly durationSeconds: number;
  readonly releaseSeconds: number;
  readonly neutralState: DisplayState;
  readonly armedState: DisplayState;
  readonly releasedState: DisplayState;
}

export interface ExploreActionSample {
  state: Record<string, number>;
  phase: "sensing" | "release" | "settled";
  /** A threshold flag. Consume it once; it remains true after completion. */
  release: boolean;
  done: boolean;
}

// These times and the smoothing below are display pacing, not historical or
// physical measurements. Every joint target comes from the machine's script.
const ARM_SECONDS = 0.3;
const RELEASE_SECONDS = 0.65;
const RETURN_SECONDS = 1.05;
const DURATION_SECONDS = 1.8;

export function createExploreAction(
  module: MachineModule,
  spec: MachineSpec,
  channel: number,
): ExploreActionClip {
  const neutralState = Object.fromEntries(
    spec.parts.map((part) => [part.id, 0]),
  );
  let armedState = { ...neutralState };
  let releasedState = { ...neutralState };
  let canRelease = false;
  const trigger = module.mechanism?.triggers.find(
    (candidate) => candidate.id === "quake",
  );

  if (
    module.spec.slug === "seismoscope" &&
    spec.slug === "seismoscope" &&
    Number.isInteger(channel) &&
    channel >= 0 &&
    channel < 8 &&
    trigger
  ) {
    // Use a fresh graph so this preview cannot reset the live scene or inherit
    // a previous ball's first-event interlock. A Wang clip never emits release.
    const graph = new KinematicGraph(spec);
    const capture = () => {
      const source = graph.state();
      return Object.fromEntries(
        spec.parts.map((part) => [
          part.id,
          /^(ball|toad)-/.test(part.id) ? 0 : (source[part.id] ?? 0),
        ]),
      );
    };
    trigger.run(
      graph,
      (type, part) => {
        if (type === "drive" && part === `gate-${channel}`) {
          armedState = capture();
        }
        if (type === "releaseBall" && part === `dragon-${channel}`) {
          releasedState = capture();
          canRelease = true;
        }
      },
      channel,
    );
  }

  return {
    channel,
    canRelease,
    durationSeconds: DURATION_SECONDS,
    releaseSeconds: RELEASE_SECONDS,
    neutralState,
    armedState,
    releasedState,
  };
}

function blend(
  before: DisplayState,
  after: DisplayState,
  progress: number,
): Record<string, number> {
  const fraction = Math.max(0, Math.min(1, progress));
  const eased = fraction * fraction * (3 - 2 * fraction);
  return Object.fromEntries(
    Object.entries(before).map(([id, value]) => [
      id,
      value + ((after[id] ?? 0) - value) * eased,
    ]),
  );
}

export function sampleExploreAction(
  clip: ExploreActionClip,
  elapsedSeconds: number,
): ExploreActionSample {
  const elapsed = Number.isNaN(elapsedSeconds)
    ? 0
    : Math.max(0, elapsedSeconds);
  const release = clip.canRelease && elapsed >= clip.releaseSeconds;
  if (!clip.canRelease || elapsed >= clip.durationSeconds) {
    return {
      state: { ...clip.neutralState },
      phase: "settled",
      release,
      done: true,
    };
  }

  const state =
    elapsed <= ARM_SECONDS
      ? blend(clip.neutralState, clip.armedState, elapsed / ARM_SECONDS)
      : elapsed < clip.releaseSeconds
        ? blend(
            clip.armedState,
            clip.releasedState,
            (elapsed - ARM_SECONDS) / (clip.releaseSeconds - ARM_SECONDS),
          )
        : elapsed <= RETURN_SECONDS
          ? { ...clip.releasedState }
          : blend(
              clip.releasedState,
              clip.neutralState,
              (elapsed - RETURN_SECONDS) /
                (clip.durationSeconds - RETURN_SECONDS),
            );
  return {
    state,
    phase: release ? "release" : "sensing",
    release,
    done: false,
  };
}
