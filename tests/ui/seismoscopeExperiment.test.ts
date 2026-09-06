import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import machine from "../../src/machines/seismoscope/build";
import { applySchemePatch } from "../../src/sim/graph";
import type { FreeMoveOffset } from "../../src/ui/viewer/freeMove";
import {
  coupledToadMove,
  createSeismoscopeExperiment,
  experimentBallAttachment,
  experimentQuake,
  resolveExperimentRelease,
  type ExperimentOffsets,
  type SeismoscopeExperiment,
} from "../../src/ui/viewer/seismoscopeExperiment";

function modelFor(schemeId: string): SeismoscopeExperiment {
  const spec = applySchemePatch(machine.spec, machine.schemes![schemeId]);
  const homeBounds: Record<string, Box3> = {};
  const fixedBounds = new Box3();
  for (const part of spec.parts) {
    if (part.geometry.type !== "custom")
      throw new Error("Expected custom geometry");
    const built = machine.customBuilders![part.geometry.builder](
      part.geometry.params,
    );
    const geometries = Array.isArray(built) ? built : [built];
    const matrix = new Matrix4().compose(
      new Vector3(...part.position),
      new Quaternion().setFromEuler(
        new Euler(...(part.rotationEuler ?? [0, 0, 0])),
      ),
      new Vector3(1, 1, 1),
    );
    homeBounds[part.id] = new Box3();
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      homeBounds[part.id].union(
        geometry.boundingBox!.clone().applyMatrix4(matrix),
      );
      geometry.dispose();
    }
    if (!/^(lid|duzhu|ball-\d|toad-\d)$/.test(part.id))
      fixedBounds.union(homeBounds[part.id]);
  }
  return createSeismoscopeExperiment(
    spec,
    homeBounds,
    fixedBounds,
    fixedBounds.min.y,
  );
}

const feng = modelFor("fengrui");
const wang = modelFor("wangzhenduo");

function offsetTo(
  model: SeismoscopeExperiment,
  ballId: string,
  target: FreeMoveOffset,
): FreeMoveOffset {
  const home = model.channels.find(
    (channel) => channel.ballId === ballId,
  )!.dragonSeat;
  return [target[0] - home[0], target[1] - home[1], target[2] - home[2]];
}

describe("seismoscope free exploration", () => {
  it.each([feng, wang])(
    "uses the resolved reconstruction's seats, travel, and measured bounds",
    (model) => {
      expect(model.partIds).toHaveLength(18);
      expect(model.channels).toHaveLength(8);
      expect(model.homeBounds.duzhu.isEmpty()).toBe(false);
      for (const channel of model.channels) {
        const ball = model.spec.parts.find(
          (part) => part.id === channel.ballId,
        )!;
        const endpoint = new Vector3(...ball.position).addScaledVector(
          new Vector3(...ball.joint!.axis),
          ball.joint!.limits![1],
        );
        expect(channel.dragonSeat).toEqual(ball.position);
        expect(channel.toadMouth).toEqual(endpoint.toArray());
        expect(experimentBallAttachment(model, channel.ballId, {})).toEqual({
          kind: "dragon",
          channel: channel.channel,
        });
      }
    },
  );

  it.each(["lid", "duzhu", "toad-1", "ball-4"])(
    "grounds the whole %s geometry without changing a clear chosen direction",
    (partId) => {
      const proposed: FreeMoveOffset = [4.2, 1.5, 3.3];
      const released = resolveExperimentRelease(feng, partId, proposed, {});
      expect(released.surface).toBe("ground");
      expect(feng.homeBounds[partId].min.y + released.offset[1]).toBeCloseTo(
        feng.floorY,
      );
      expect(released.offset[0]).toBe(proposed[0]);
      expect(released.offset[2]).toBe(proposed[2]);
      expect(proposed).toEqual([4.2, 1.5, 3.3]);
    },
  );

  it("returns a toad or sensor to its own seat and can ground a small keyboard move", () => {
    for (const partId of ["toad-1", "duzhu"]) {
      expect(
        resolveExperimentRelease(feng, partId, [0.05, 0.06, 0], {}).offset,
      ).toEqual([0, 0, 0]);
      const moved = resolveExperimentRelease(
        feng,
        partId,
        [0.05, 0.06, 0],
        {},
        { snapHome: false },
      );
      expect(moved.surface).toBe("ground");
      expect(feng.homeBounds[partId].min.y + moved.offset[1]).toBeCloseTo(
        feng.floorY,
      );
    }
  });

  it("lets any ball reload a vacant dragon, but never stacks balls in an occupied seat", () => {
    const target = feng.channels[2].dragonSeat;
    const proposed = offsetTo(feng, "ball-0", target);
    const fullSeat = resolveExperimentRelease(feng, "ball-0", proposed, {});
    expect(fullSeat.surface).toBe("ground");
    const vacant: ExperimentOffsets = { "ball-2": [4, -1, 2] };
    const reloaded = resolveExperimentRelease(feng, "ball-0", proposed, vacant);
    expect(reloaded.attachment).toEqual({ kind: "dragon", channel: 2 });
    const moved: ExperimentOffsets = { ...vacant, "ball-0": reloaded.offset };
    const quake = experimentQuake(feng, 2, moved);
    expect(quake.kind).toBe("caught");
    if (quake.kind !== "caught")
      throw new Error("Expected the replacement ball to fall");
    expect(quake.ballId).toBe("ball-0");
    expect(quake.from).toEqual(proposed);
    expect(experimentQuake(feng, 0, moved).kind).toBe("empty");
  });

  it("accepts a ball in a moved toad and carries it with that catcher", () => {
    const toadOffset: FreeMoveOffset = [2.4, -0.3, 1.1];
    const mouth = new Vector3(...feng.channels[1].toadMouth).add(
      new Vector3(...toadOffset),
    );
    const released = resolveExperimentRelease(
      feng,
      "ball-0",
      offsetTo(feng, "ball-0", mouth.toArray()),
      { "toad-1": toadOffset },
    );
    expect(released.attachment).toEqual({ kind: "toad", channel: 1 });
    const previous: ExperimentOffsets = {
      "toad-1": toadOffset,
      "ball-0": released.offset,
    };
    const next = coupledToadMove(feng, "toad-1", previous, [3.4, -0.4, 1.5]);
    expect(next["ball-0"][0] - previous["ball-0"][0]).toBeCloseTo(1);
    expect(next["ball-0"][1] - previous["ball-0"][1]).toBeCloseTo(-0.1);
    expect(next["ball-0"][2] - previous["ball-0"][2]).toBeCloseTo(0.4);
    expect(experimentBallAttachment(feng, "ball-0", next)).toEqual({
      kind: "toad",
      channel: 1,
    });
    expect(previous["toad-1"]).toEqual(toadOffset);
    expect(experimentBallAttachment(feng, "ball-1", next)).toEqual({
      kind: "dragon",
      channel: 1,
    });
  });

  it("leaves a caught ball in place and an empty dragon empty on repeated pulses", () => {
    const quake = experimentQuake(feng, 0, {});
    expect(quake.kind).toBe("caught");
    if (quake.kind !== "caught") throw new Error("Expected a catch");
    expect(quake.from).toEqual([0, 0, 0]);
    expect(quake.toadId).toBe("toad-0");
    const after: ExperimentOffsets = { [quake.ballId]: quake.to };
    expect(experimentBallAttachment(feng, quake.ballId, after)).toEqual({
      kind: "toad",
      channel: 0,
    });
    expect(experimentQuake(feng, 0, after)).toEqual({
      kind: "empty",
      channel: 0,
    });
    expect(after[quake.ballId]).toEqual(quake.to);
  });

  it("cannot release a removed ball, or trigger without the central sensor seated", () => {
    expect(experimentQuake(feng, 0, { "ball-0": [3, -1, 0] })).toEqual({
      kind: "empty",
      channel: 0,
    });
    expect(experimentQuake(feng, 0, { duzhu: [0, 0.1, 0] })).toEqual({
      kind: "no-trigger",
      channel: 0,
    });
    expect(experimentQuake(feng, 0, { duzhu: [4, -1, 2] })).toEqual({
      kind: "no-trigger",
      channel: 0,
    });
  });

  it("misses a displaced catcher and lands along the selected channel on the real floor", () => {
    const before: ExperimentOffsets = { "toad-2": [2, -0.3, 1] };
    const quake = experimentQuake(feng, 2, before);
    expect(quake.kind).toBe("missed");
    if (quake.kind !== "missed") throw new Error("Expected a miss");
    expect(quake.reason).toBe("toad-moved");
    expect(feng.homeBounds[quake.ballId].min.y + quake.to[1]).toBeCloseTo(
      feng.floorY,
    );
    const landed = new Vector3(...feng.channels[2].dragonSeat).add(
      new Vector3(...quake.to),
    );
    expect(landed.x).toBeGreaterThan(feng.assemblyBounds.max.x);
    expect(landed.z).toBeCloseTo(0);
    expect(before).toEqual({ "toad-2": [2, -0.3, 1] });
  });

  it("does not put a second fired ball into an occupied mouth", () => {
    const offsets: ExperimentOffsets = {
      "ball-0": offsetTo(feng, "ball-0", feng.channels[0].toadMouth),
      "ball-1": offsetTo(feng, "ball-1", feng.channels[0].dragonSeat),
    };
    const quake = experimentQuake(feng, 0, offsets);
    expect(quake.kind).toBe("missed");
    if (quake.kind !== "missed") throw new Error("Expected a full catcher");
    expect(quake.ballId).toBe("ball-1");
    expect(quake.reason).toBe("toad-occupied");
    expect(feng.homeBounds[quake.ballId].min.y + quake.to[1]).toBeCloseTo(
      feng.floorY,
    );
    const release = resolveExperimentRelease(
      feng,
      "ball-2",
      offsetTo(feng, "ball-2", feng.channels[0].toadMouth),
      offsets,
    );
    expect(release.surface).toBe("ground");
  });

  it("does not classify a ball merely passing near a seat as loaded", () => {
    expect(
      experimentBallAttachment(feng, "ball-0", { "ball-0": [0, 0.05, 0] }),
    ).toBeUndefined();
    expect(experimentQuake(feng, 0, { "ball-0": [0, 0.05, 0] }).kind).toBe(
      "empty",
    );
  });

  it("lets a small keyboard pickup leave a dragon or a toad without snapping back", () => {
    const caughtOffset = offsetTo(feng, "ball-0", feng.channels[0].toadMouth);
    for (const startingOffset of [[0, 0, 0] as FreeMoveOffset, caughtOffset]) {
      const proposed: FreeMoveOffset = [
        startingOffset[0] + 0.12,
        startingOffset[1],
        startingOffset[2],
      ];
      const current = { "ball-0": proposed };
      const released = resolveExperimentRelease(
        feng,
        "ball-0",
        proposed,
        current,
        { snapHome: false },
      );
      expect(released.surface).toBe("ground");
      expect(released.attachment).toBeUndefined();
      expect(feng.homeBounds["ball-0"].min.y + released.offset[1]).toBeCloseTo(
        feng.floorY,
      );
      expect(
        experimentBallAttachment(feng, "ball-0", { "ball-0": released.offset }),
      ).toBeUndefined();
      // Pointer release still has its forgiving target for the same position.
      expect(
        resolveExperimentRelease(feng, "ball-0", proposed, current).attachment,
      ).toBeDefined();
    }
  });
});
