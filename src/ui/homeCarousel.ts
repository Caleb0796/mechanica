const FULL_TURN = Math.PI * 2;

export const HOME_CAROUSEL_DRIFT_RADIANS_PER_SECOND = -FULL_TURN / 48;

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function wrappedAngle(value: number): number {
  return positiveModulo(value + Math.PI, FULL_TURN) - Math.PI;
}

export function activeHomeCarouselIndex(
  rotationY: number,
  machineCount: number,
): number {
  if (machineCount === 0) return 0;
  const quarter = FULL_TURN / machineCount;
  return positiveModulo(Math.round(-rotationY / quarter), machineCount);
}

export function homeCarouselDriftSpeed(
  paused: boolean,
  reducedMotion: boolean,
): number {
  return paused || reducedMotion
    ? 0
    : HOME_CAROUSEL_DRIFT_RADIANS_PER_SECOND;
}

export function homeMachineScale(
  rotationY: number,
  machineIndex: number,
  machineCount: number,
): number {
  if (machineCount === 0) return 1;
  const quarter = FULL_TURN / machineCount;
  const distance = Math.abs(
    wrappedAngle(rotationY + machineIndex * quarter),
  );
  const proximity = Math.max(0, 1 - distance / quarter);
  const emphasis = proximity * proximity * (3 - 2 * proximity);
  return 1 + emphasis * 0.12;
}

export function targetHomeCarouselRotation(
  rotationY: number,
  machineIndex: number,
  machineCount: number,
): number {
  if (machineCount === 0) return rotationY;
  const quarter = FULL_TURN / machineCount;
  const canonical = -machineIndex * quarter;
  const revolutions = Math.round((rotationY - canonical) / FULL_TURN);
  return canonical + revolutions * FULL_TURN;
}
