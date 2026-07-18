import { describe, expect, it } from "vitest";

import { KinematicGraph, OverConstrainedError } from "../../src/sim/graph";
import type { MachineSpec } from "../../src/sim/types";

type Part = MachineSpec["parts"][number];
type Constraint = MachineSpec["constraints"][number];

const provenance = { kind: "wenxian" as const, ref: "Mechanica test fixture" };

function gear(id: string, teeth: number, module = 0.01): Part {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: "gear", teeth, module, thickness: 0.01, bore: 0.002 },
    material: "bronze",
    position: [0, 0, 0],
    provenance,
    dimensionProvenance: provenance,
  } as unknown as Part;
}

function wheel(id: string, radius: number): Part {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: "wheel", radius, width: 0.01 },
    material: "wood",
    position: [0, 0, 0],
    provenance,
    dimensionProvenance: provenance,
  } as unknown as Part;
}

function plain(id: string): Part {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: "beam", size: [0.1, 0.1, 0.1] },
    material: "wood",
    position: [0, 0, 0],
    provenance,
    dimensionProvenance: provenance,
  } as unknown as Part;
}

function spec(parts: Part[], constraints: Constraint[], primaryDrive?: string): MachineSpec {
  const drive = primaryDrive ?? parts[0].id;
  return {
    slug: "sim-test",
    parts,
    constraints,
    driveNodes: parts.map((part) => part.id),
    primaryDrive: drive,
    cycleRad: Math.PI * 2,
  };
}

describe("KinematicGraph linear layers", () => {
  it("reproduces the odometer's 1/100 and 1/1000 absolute ratios", () => {
    const parts = [
      gear("zulun", 1),
      gear("lilun18", 18),
      gear("xiapinglun54", 54),
      gear("xuanfenglun3", 3),
      gear("zhongpinglun100", 100),
      gear("xiaopinglun10", 10),
      gear("shangpinglun100", 100),
    ];
    const constraints: Constraint[] = [
      { type: "lockstep", a: "zulun", b: "lilun18", ratio: 1 },
      { type: "mesh", a: "lilun18", b: "xiapinglun54" },
      { type: "lockstep", a: "xiapinglun54", b: "xuanfenglun3", ratio: 1 },
      { type: "mesh", a: "xuanfenglun3", b: "zhongpinglun100" },
      { type: "lockstep", a: "zhongpinglun100", b: "xiaopinglun10", ratio: 1 },
      { type: "mesh", a: "xiaopinglun10", b: "shangpinglun100" },
    ];
    const graph = new KinematicGraph(spec(parts, constraints, "zulun"));

    expect(Math.abs(graph.ratioBetween("zulun", "zhongpinglun100")!)).toBeCloseTo(
      1 / 100,
      12,
    );
    expect(Math.abs(graph.ratioBetween("zulun", "shangpinglun100")!)).toBeCloseTo(
      1 / 1000,
      12,
    );
    graph.setInput("shangpinglun100", 0.001);
    expect(Math.abs(graph.state().zulun)).toBeCloseTo(1, 12);
    expect([18, 54, 3, 100, 10, 100].reduce((sum, teeth) => sum + teeth, 0)).toBe(
      285,
    );
  });

  it("computes the chariot 12/48 reduction as 90 degrees", () => {
    const graph = new KinematicGraph(
      spec(
        [gear("drive12", 12), gear("driven48", 48)],
        [{ type: "mesh", a: "drive12", b: "driven48" }],
      ),
    );
    graph.setInput("drive12", Math.PI * 2);
    expect(Math.abs((graph.state().driven48 * 180) / Math.PI)).toBeCloseTo(90, 12);
  });

  it("propagates open and crossed belts in both directions", () => {
    const open = new KinematicGraph(
      spec(
        [wheel("large", 0.4), wheel("small", 0.1)],
        [{ type: "belt", a: "large", b: "small" }],
      ),
    );
    open.setInput("small", 4);
    expect(open.state().large).toBeCloseTo(1, 12);

    const crossed = new KinematicGraph(
      spec(
        [wheel("large", 0.4), wheel("small", 0.1)],
        [{ type: "belt", a: "large", b: "small", crossed: true }],
      ),
    );
    expect(crossed.ratioBetween("large", "small")).toBe(-4);
  });

  it("rejects inconsistent cycles", () => {
    expect(
      () =>
        new KinematicGraph(
          spec(
            [gear("a", 10), gear("b", 10), gear("c", 10)],
            [
              { type: "lockstep", a: "a", b: "b", ratio: 2 },
              { type: "lockstep", a: "b", b: "c", ratio: 3 },
              { type: "lockstep", a: "c", b: "a", ratio: 0.2 },
            ],
          ),
        ),
    ).toThrow(OverConstrainedError);
  });

  it("rejects a mesh with a non-gear endpoint", () => {
    expect(
      () =>
        new KinematicGraph(
          spec(
            [gear("gear", 12), plain("beam")],
            [{ type: "mesh", a: "gear", b: "beam" }],
          ),
        ),
    ).toThrow(/must both be gears/);
  });
});

describe("KinematicGraph function layers", () => {
  it("keeps differential inputs independent and order-independent", () => {
    const definition = spec(
      [plain("carrier"), gear("sunA", 20), gear("sunB", 20)],
      [
        {
          type: "differential",
          carrier: "carrier",
          sunA: "sunA",
          sunB: "sunB",
          ratio: 1,
          provenance,
        },
      ],
      "sunA",
    );
    const first = new KinematicGraph(definition);
    first.setInput("sunA", 2);
    first.setInput("sunB", 4);
    const second = new KinematicGraph(definition);
    second.setInput("sunB", 4);
    second.setInput("sunA", 2);

    expect(first.state().carrier).toBeCloseTo(3, 12);
    expect(first.state().carrier).toBeCloseTo(second.state().carrier, 12);
    expect(first.ratioBetween("sunA", "carrier")).toBeNull();
  });

  it("solves crank endpoints and clamps reverse drive at dead center", () => {
    const graph = new KinematicGraph(
      spec(
        [gear("wheel", 20), plain("rod"), plain("slider")],
        [
          {
            type: "crank",
            wheel: "wheel",
            rod: "rod",
            slider: "slider",
            crankRadius: 0.24,
            rodLength: 0.6,
            axis: [1, 0, 0],
            provenance,
          },
        ],
      ),
    );
    expect(graph.setInput("wheel", 0).angles.slider).toBeCloseTo(0, 12);
    expect(graph.setInput("wheel", Math.PI).angles.slider).toBeCloseTo(0.48, 12);
    const reverse = graph.setInput("slider", 0.4);
    expect(reverse.angles.wheel).toBeCloseTo(Math.PI, 12);
    expect(reverse.events).toEqual([
      expect.objectContaining({ type: "deadcenter", part: "slider" }),
    ]);
  });

  it("preserves the crank branch and clamps reverse input to its stroke", () => {
    const definition = spec(
      [gear("wheel", 20), plain("rod"), plain("slider")],
      [{
        type: "crank",
        wheel: "wheel",
        rod: "rod",
        slider: "slider",
        crankRadius: 0.24,
        rodLength: 0.6,
        axis: [1, 0, 0],
        provenance,
      }],
    );
    const ascending = new KinematicGraph(definition);
    ascending.setInput("wheel", Math.PI / 3);
    const target = ascending.state().slider + 0.02;
    const ascendingTheta = ascending.setInput("slider", target).angles.wheel;

    const descending = new KinematicGraph(definition);
    descending.setInput("wheel", 2 * Math.PI - Math.PI / 3);
    const descendingTheta = descending.setInput("slider", target).angles.wheel;

    expect(ascendingTheta).toBeGreaterThan(0);
    expect(ascendingTheta).toBeLessThan(Math.PI);
    expect(descendingTheta).toBeGreaterThan(Math.PI);
    expect(descendingTheta).toBeLessThan(2 * Math.PI);
    const clamped = descending.setInput("slider", 1);
    expect(clamped.angles.slider).toBeCloseTo(0.48, 12);
    expect(clamped.events).toEqual([
      expect.objectContaining({ type: "deadcenter", part: "slider" }),
    ]);
  });

  it("evaluates lift and heddle cam profiles", () => {
    const graph = new KinematicGraph(
      spec(
        [gear("liftCam", 20), plain("liftFollower"), gear("heddleCam", 20), plain("heddleFollower")],
        [
          {
            type: "cam",
            cam: "liftCam",
            follower: "liftFollower",
            profile: "lift",
            liftHeight: 0.2,
            provenance,
          },
          {
            type: "cam",
            cam: "heddleCam",
            follower: "heddleFollower",
            profile: "heddle",
            liftHeight: 0.3,
            provenance,
          },
        ],
      ),
    );
    graph.setInput("liftCam", Math.PI);
    graph.setInput("heddleCam", Math.PI / 2);
    expect(graph.state().liftFollower).toBeCloseTo(0.2, 12);
    expect(graph.state().heddleFollower).toBeCloseTo(0.3, 12);
    graph.setInput("heddleCam", -Math.PI / 2);
    expect(graph.state().heddleFollower).toBe(0);
  });

  it("stabilizes world up over 50 deterministic attitudes", () => {
    const graph = new KinematicGraph(
      spec(
        [plain("outer"), plain("middle"), plain("inner")],
        [{ type: "gimbal", outer: "outer", middle: "middle", inner: "inner" }],
      ),
    );
    graph.setInput("inner", 0.37);

    for (let index = 0; index < 50; index += 1) {
      const angle = -1.2 + (2.4 * index) / 49;
      const axis = normalizeVector([
        Math.sin(index * 1.7) + 0.2,
        Math.cos(index * 0.9) + 0.3,
        Math.sin(index * 0.37 + 0.4) + 0.1,
      ]);
      const half = angle / 2;
      const scale = 1 + (index % 5);
      const quaternion: [number, number, number, number] = [
        axis[0] * Math.sin(half) * scale,
        axis[1] * Math.sin(half) * scale,
        axis[2] * Math.sin(half) * scale,
        Math.cos(half) * scale,
      ];
      graph.setAttitude("outer", quaternion);
      const state = graph.state();
      const localUp: [number, number, number] = [
        -Math.sin(state.outer) * Math.cos(state.middle),
        Math.cos(state.outer) * Math.cos(state.middle),
        Math.sin(state.middle),
      ];
      const worldUp = rotateVector(localUp, normalizeQuaternion(quaternion));
      const deviation =
        Math.acos(Math.max(-1, Math.min(1, worldUp[1]))) * (180 / Math.PI);
      expect(deviation).toBeLessThan(0.5);
      expect(state.inner).toBeCloseTo(0.37, 12);
    }
  });

  it("applies scheme patches from the immutable base and returns snapshots", () => {
    const graph = new KinematicGraph(
      spec(
        [gear("a", 10), gear("b", 20)],
        [{ type: "mesh", a: "a", b: "b" }],
      ),
    );
    graph.setInput("a", 2);
    const snapshot = graph.state();
    snapshot.a = 99;
    expect(graph.state().a).toBe(2);

    graph.setScheme({
      id: "without-b",
      scholar: { zh: "测试夹具", en: "Fixture" },
      year: 2026,
      summary: { zh: "移除从动齿轮", en: "Remove the driven gear" },
      removePartIds: ["b"],
      removeConstraintIndexes: [0],
    });
    expect(graph.state()).toEqual({ a: 2 });

    graph.setScheme();
    expect(graph.state().b).toBeCloseTo(-1, 12);
    expect(graph.ratioBetween("a", "b")).toBe(-0.5);
  });
});

function normalizeVector(vector: [number, number, number]): [number, number, number] {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length) as [number, number, number];
}

function normalizeQuaternion(
  quaternion: [number, number, number, number],
): [number, number, number, number] {
  const length = Math.hypot(...quaternion);
  return quaternion.map((value) => value / length) as [number, number, number, number];
}

function rotateVector(
  vector: [number, number, number],
  quaternion: [number, number, number, number],
): [number, number, number] {
  const [x, y, z, w] = quaternion;
  const [vx, vy, vz] = vector;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}
