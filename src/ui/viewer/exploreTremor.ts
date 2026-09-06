type Vector3Tuple = readonly [number, number, number];

export interface ExploreTremor {
  readonly channel: number;
  /** Relative display strength, not a seismic magnitude or historical calibration. */
  readonly strength: number;
  readonly direction: [number, number, number];
}

export const TREMOR_DURATION_SECONDS = 1.8;
const CENTER_RADIUS_PIXELS = 24;
const DOUBLE_TAP_STRENGTH = 0.65;
const MAX_DISPLAY_DISPLACEMENT = 0.065;

function horizontalUnit(vector: Vector3Tuple): [number, number, number] | null {
  if (!vector.every(Number.isFinite)) return null;
  const scale = Math.max(Math.abs(vector[0]), Math.abs(vector[2]));
  if (scale <= 1e-8) return null;
  const x = vector[0] / scale;
  const z = vector[2] / scale;
  const length = Math.hypot(x, z);
  return [x / length, 0, z / length];
}

/**
 * A double tap's position relative to the projected machine center selects the
 * nearest authored channel: north is +Z, east is +X. DOM y points down, so the
 * camera's ground up axis is inverted. Taps near the center keep the current
 * bearing; their distance never changes the pulse's display strength.
 */
export function tremorFromPoint(
  displacementFromProjectedCenter: readonly [number, number],
  groundRight: Vector3Tuple,
  groundUp: Vector3Tuple,
  fallbackChannel = 1,
): ExploreTremor {
  const fallback = tremorForChannel(
    Number.isInteger(fallbackChannel) &&
      fallbackChannel >= 0 &&
      fallbackChannel <= 7
      ? fallbackChannel
      : 1,
    DOUBLE_TAP_STRENGTH,
  );
  if (!displacementFromProjectedCenter.every(Number.isFinite)) return fallback;
  if (Math.hypot(...displacementFromProjectedCenter) <= CENTER_RADIUS_PIXELS) {
    return fallback;
  }
  const right = horizontalUnit(groundRight);
  const up = horizontalUnit(groundUp);
  if (!right || !up || Math.abs(right[0] * up[2] - right[2] * up[0]) < 1e-8) {
    return fallback;
  }
  const scale = Math.max(...displacementFromProjectedCenter.map(Math.abs));
  const dx = displacementFromProjectedCenter[0] / scale;
  const dy = displacementFromProjectedCenter[1] / scale;
  const direction = horizontalUnit([
    right[0] * dx - up[0] * dy,
    0,
    right[2] * dx - up[2] * dy,
  ]);
  if (!direction) return fallback;
  const channel =
    (Math.round(Math.atan2(direction[0], direction[2]) / (Math.PI / 4)) + 8) % 8;
  return tremorForChannel(channel, DOUBLE_TAP_STRENGTH);
}

/** An equivalent input for keyboard controls and the existing direction picker. */
export function tremorForChannel(channel: number, strength = 0.5): ExploreTremor {
  if (!Number.isInteger(channel) || channel < 0 || channel > 7) {
    throw new RangeError(`Unknown seismoscope channel ${channel}`);
  }
  if (!Number.isFinite(strength)) {
    throw new RangeError("Tremor strength must be finite");
  }
  const angle = (channel * Math.PI) / 4;
  return {
    channel,
    strength: Math.max(0, Math.min(1, strength)),
    direction: [Math.sin(angle), 0, Math.cos(angle)],
  };
}

/**
 * A temporary display translation; it never writes to the arrangement or to
 * source joint values. The envelope begins and ends at rest, without drift.
 */
export function sampleTremorDisplacement(
  tremor: ExploreTremor,
  elapsedSeconds: number,
): [number, number, number] {
  if (
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds <= 0 ||
    elapsedSeconds >= TREMOR_DURATION_SECONDS
  ) {
    return [0, 0, 0];
  }
  const direction = horizontalUnit(tremor.direction);
  if (!direction || !Number.isFinite(tremor.strength)) return [0, 0, 0];
  const progress = elapsedSeconds / TREMOR_DURATION_SECONDS;
  const envelope =
    Math.min(elapsedSeconds / 0.08, 1) *
    Math.exp(-2.4 * elapsedSeconds) *
    (1 - progress) ** 2;
  const displacement =
    MAX_DISPLAY_DISPLACEMENT *
    Math.max(0, Math.min(1, tremor.strength)) *
    envelope *
    Math.sin(elapsedSeconds * 2 * Math.PI * 6);
  if (displacement === 0) return [0, 0, 0];
  return [direction[0] * displacement, 0, direction[2] * displacement];
}
