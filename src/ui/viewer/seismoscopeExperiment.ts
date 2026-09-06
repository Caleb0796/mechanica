import { Box3, Vector3 } from "three";

import type { MachineSpec } from "../../sim/types";
import type { FreeMoveOffset } from "./freeMove";
import { settledLidOffset } from "./freeMoveLanding";

export const MOVABLE_PART_IDS = [
  "lid",
  "duzhu",
  ...Array.from({ length: 8 }, (_, channel) => `ball-${channel}`),
  ...Array.from({ length: 8 }, (_, channel) => `toad-${channel}`),
] as const;

/** Offsets are world-space translations from the assembled, neutral pose. */
export type ExperimentOffsets = Readonly<Record<string, FreeMoveOffset>>;

export interface ExperimentAttachment {
  kind: "dragon" | "toad";
  channel: number;
}

export interface ExperimentChannel {
  channel: number;
  dragonId: string;
  toadId: string;
  ballId: string;
  dragonSeat: FreeMoveOffset;
  toadMouth: FreeMoveOffset;
  ballRadius: number;
}

export interface SeismoscopeExperiment {
  spec: MachineSpec;
  homeBounds: Readonly<Record<string, Box3>>;
  assemblyBounds: Box3;
  floorY: number;
  partIds: string[];
  channels: ExperimentChannel[];
}

export interface ExperimentRelease {
  offset: FreeMoveOffset;
  surface: "home" | "dragon" | "toad" | "ground";
  attachment?: ExperimentAttachment;
}

export type ExperimentQuake =
  | { kind: "no-trigger"; channel: number }
  | { kind: "empty"; channel: number }
  | {
      kind: "caught";
      channel: number;
      ballId: string;
      toadId: string;
      from: FreeMoveOffset;
      to: FreeMoveOffset;
    }
  | {
      kind: "missed";
      channel: number;
      ballId: string;
      reason: "toad-moved" | "toad-occupied";
      from: FreeMoveOffset;
      to: FreeMoveOffset;
    };

// These are forgiving interaction tolerances, not historical dimensions or
// a physical simulation. Source geometry and its dimensions remain unchanged.
const ATTACHMENT_EPSILON = 1e-4;
const HOME_SNAP_DISTANCE = 0.22;
const SENSOR_SEATED_DISTANCE = 0.03;
const BALL_SNAP_RADII = 2.2;
const CATCH_ALIGNMENT_RADII = 0.9;

function offsetFor(offsets: ExperimentOffsets, partId: string): FreeMoveOffset {
  return offsets[partId] ?? [0, 0, 0];
}

function vector(values: FreeMoveOffset): Vector3 {
  return new Vector3(...values);
}

function tuple(value: Vector3): FreeMoveOffset {
  return [value.x, value.y, value.z];
}

function ballPosition(
  model: SeismoscopeExperiment,
  ballId: string,
  offsets: ExperimentOffsets,
): Vector3 | undefined {
  const channel = model.channels.find((entry) => entry.ballId === ballId);
  return channel
    ? vector(channel.dragonSeat).add(vector(offsetFor(offsets, ballId)))
    : undefined;
}

function mouthPosition(
  channel: ExperimentChannel,
  offsets: ExperimentOffsets,
): Vector3 {
  return vector(channel.toadMouth).add(
    vector(offsetFor(offsets, channel.toadId)),
  );
}

/** Read the resolved scheme; do not substitute positions from a raw base spec. */
export function createSeismoscopeExperiment(
  spec: MachineSpec,
  homeBounds: Readonly<Record<string, Box3>>,
  assemblyBounds: Box3,
  floorY: number,
): SeismoscopeExperiment {
  const parts = new Map(spec.parts.map((part) => [part.id, part]));
  const channels: ExperimentChannel[] = [];
  for (let channel = 0; channel < 8; channel += 1) {
    const ball = parts.get(`ball-${channel}`);
    const toad = parts.get(`toad-${channel}`);
    const dragon = parts.get(`dragon-${channel}`);
    if (!ball || !toad || !dragon || ball.joint?.kind !== "prismatic") continue;
    const drop = ball.joint.limits?.[1];
    if (drop === undefined) continue;
    // This is the reconstruction's existing received-ball target from build.ts
    // and parts.json, not a newly claimed historical mouth measurement. The
    // normal exhibit raises the receiving toad during that display trajectory.
    const toadMouth = vector(ball.position).addScaledVector(
      vector(ball.joint.axis),
      drop,
    );
    const measuredSize = homeBounds[ball.id]?.getSize(new Vector3());
    const ballRadius = measuredSize
      ? Math.max(measuredSize.x, measuredSize.y, measuredSize.z) / 2
      : ball.geometry.type === "custom"
        ? ball.geometry.params.radius
        : undefined;
    if (!(ballRadius && ballRadius > 0)) continue;
    channels.push({
      channel,
      dragonId: dragon.id,
      toadId: toad.id,
      ballId: ball.id,
      dragonSeat: [...ball.position],
      toadMouth: tuple(toadMouth),
      ballRadius,
    });
  }
  return {
    spec,
    homeBounds: Object.fromEntries(
      Object.entries(homeBounds).map(([id, bounds]) => [id, bounds.clone()]),
    ),
    assemblyBounds: assemblyBounds.clone(),
    floorY,
    partIds: MOVABLE_PART_IDS.filter((id) => parts.has(id)),
    channels,
  };
}

/** Only a settled, snapped ball counts as loaded or caught. */
export function experimentBallAttachment(
  model: SeismoscopeExperiment,
  ballId: string,
  offsets: ExperimentOffsets,
): ExperimentAttachment | undefined {
  const position = ballPosition(model, ballId, offsets);
  if (!position) return undefined;
  for (const channel of model.channels) {
    if (position.distanceTo(vector(channel.dragonSeat)) <= ATTACHMENT_EPSILON) {
      return { kind: "dragon", channel: channel.channel };
    }
  }
  for (const channel of model.channels) {
    if (
      position.distanceTo(mouthPosition(channel, offsets)) <= ATTACHMENT_EPSILON
    ) {
      return { kind: "toad", channel: channel.channel };
    }
  }
  return undefined;
}

function occupyingBall(
  model: SeismoscopeExperiment,
  attachment: ExperimentAttachment,
  offsets: ExperimentOffsets,
  exceptBallId?: string,
): string | undefined {
  return model.channels.find(({ ballId }) => {
    if (ballId === exceptBallId) return false;
    const current = experimentBallAttachment(model, ballId, offsets);
    return (
      current?.kind === attachment.kind &&
      current.channel === attachment.channel
    );
  })?.ballId;
}

/** Release to a vacant seat or the real floor; the rest of the scene is untouched. */
export function resolveExperimentRelease(
  model: SeismoscopeExperiment,
  partId: string,
  proposedOffset: FreeMoveOffset,
  offsets: ExperimentOffsets,
  options: { snapHome?: boolean } = {},
): ExperimentRelease {
  const bounds = model.homeBounds[partId];
  if (!bounds || !proposedOffset.every(Number.isFinite)) {
    return { offset: [...offsetFor(offsets, partId)], surface: "ground" };
  }
  const ownChannel = model.channels.find((entry) => entry.ballId === partId);
  // Keyboard pickup can move less than the forgiving snap radius. Disabling
  // snapping must let a ball leave either a dragon or a toad on that first move.
  if (ownChannel && options.snapHome !== false) {
    const position = vector(ownChannel.dragonSeat).add(vector(proposedOffset));
    const candidates = model.channels.flatMap((channel) =>
      (["dragon", "toad"] as const).map((kind) => {
        const attachment = { kind, channel: channel.channel };
        const point =
          kind === "dragon"
            ? vector(channel.dragonSeat)
            : mouthPosition(channel, offsets);
        return {
          attachment,
          point,
          distance: point.distanceTo(position),
          occupied: occupyingBall(model, attachment, offsets, partId),
        };
      }),
    );
    const target = candidates
      .filter(
        (entry) =>
          !entry.occupied &&
          entry.distance <= ownChannel.ballRadius * BALL_SNAP_RADII,
      )
      .sort((a, b) => a.distance - b.distance)[0];
    if (target) {
      return {
        offset: tuple(target.point.sub(vector(ownChannel.dragonSeat))),
        surface: target.attachment.kind,
        attachment: target.attachment,
      };
    }
  } else if (
    options.snapHome !== false &&
    Math.hypot(...proposedOffset) < HOME_SNAP_DISTANCE
  ) {
    return { offset: [0, 0, 0], surface: "home" };
  }
  return {
    offset: settledLidOffset(
      proposedOffset,
      bounds,
      model.assemblyBounds,
      model.floorY,
      false,
    ),
    surface: "ground",
  };
}

/** A caught ball travels with its catcher until the user picks up that ball. */
export function coupledToadMove(
  model: SeismoscopeExperiment,
  toadId: string,
  previousOffsets: ExperimentOffsets,
  nextOffset: FreeMoveOffset,
): Record<string, FreeMoveOffset> {
  const result: Record<string, FreeMoveOffset> = {
    ...previousOffsets,
    [toadId]: [...nextOffset],
  };
  const channel = model.channels.find((entry) => entry.toadId === toadId);
  if (!channel) return result;
  const delta = vector(nextOffset).sub(
    vector(offsetFor(previousOffsets, toadId)),
  );
  for (const { ballId } of model.channels) {
    const attachment = experimentBallAttachment(model, ballId, previousOffsets);
    if (attachment?.kind === "toad" && attachment.channel === channel.channel) {
      result[ballId] = tuple(
        vector(offsetFor(previousOffsets, ballId)).add(delta),
      );
    }
  }
  return result;
}

/** Resolve one pulse against the user's arrangement; never reload or reset parts. */
export function experimentQuake(
  model: SeismoscopeExperiment,
  channelNumber: number,
  offsets: ExperimentOffsets,
): ExperimentQuake {
  const channel = model.channels.find(
    (entry) => entry.channel === channelNumber,
  );
  if (!channel)
    throw new RangeError(`Unknown seismoscope channel ${channelNumber}`);
  if (
    !model.partIds.includes("duzhu") ||
    Math.hypot(...offsetFor(offsets, "duzhu")) > SENSOR_SEATED_DISTANCE
  ) {
    return { kind: "no-trigger", channel: channelNumber };
  }
  const ballId = occupyingBall(
    model,
    { kind: "dragon", channel: channelNumber },
    offsets,
  );
  if (!ballId) return { kind: "empty", channel: channelNumber };
  const ballHome = model.channels.find((entry) => entry.ballId === ballId)!;
  const catchPoint = mouthPosition(channel, offsets);
  const occupied = occupyingBall(
    model,
    { kind: "toad", channel: channelNumber },
    offsets,
    ballId,
  );
  const aligned =
    catchPoint.distanceTo(vector(channel.toadMouth)) <=
    channel.ballRadius * CATCH_ALIGNMENT_RADII;
  const from: FreeMoveOffset = [...offsetFor(offsets, ballId)];
  if (aligned && !occupied) {
    return {
      kind: "caught",
      channel: channelNumber,
      ballId,
      toadId: channel.toadId,
      from,
      to: tuple(catchPoint.sub(vector(ballHome.dragonSeat))),
    };
  }
  // Keep a miss on its original channel. Unsupported balls roll clear of the
  // fixed reconstruction before resting on the actual floor, not its Box3 top.
  const proposed = tuple(
    vector(channel.toadMouth).sub(vector(ballHome.dragonSeat)),
  );
  return {
    kind: "missed",
    channel: channelNumber,
    ballId,
    reason: occupied ? "toad-occupied" : "toad-moved",
    from,
    to: settledLidOffset(
      proposed,
      model.homeBounds[ballId],
      model.assemblyBounds,
      model.floorY,
      false,
    ),
  };
}
