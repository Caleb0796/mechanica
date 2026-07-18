import { describe, expect, it } from "vitest";

import machine from "../../src/machines/odometer/build";
import { KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance } from "../../src/sim/types";
import { captureSpotlightState } from "../../src/ui/viewer/MachineViewer";

function numericPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "number") return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      numericPaths(entry, prefix ? `${prefix}.${index}` : String(index)),
    );
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    numericPaths(entry, prefix ? `${prefix}.${key}` : key),
  );
}

function expectProvenance(provenance: Provenance | undefined): void {
  expect(provenance).toBeDefined();
  expect(["wenxian", "wenwu", "tuice"]).toContain(provenance?.kind);
  expect(provenance?.ref.trim()).not.toBe("");
}

function expectPartCoverage(part: PartDef): void {
  expectProvenance(part.provenance);
  const paths = numericPaths(part.geometry);
  if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");

  for (const path of paths) {
    const direct = part.dimensionProvenance[path];
    const provenance = direct ?? part.dimensionProvenance["@rest"];
    expect(provenance, `${part.id}.${path}`).toBeDefined();
    if (!direct) {
      expect(provenance?.kind, `${part.id}.${path} fallback`).toBe("tuice");
    }
  }

  expect(Number.isInteger(part.assemblyStep), `${part.id}.assemblyStep`).toBe(
    true,
  );
  expect(part.explodeVector, `${part.id}.explodeVector`).toHaveLength(3);
  expect(
    part.explodeVector?.some((component) => Math.abs(component) > 0),
    `${part.id}.explodeVector direction`,
  ).toBe(true);
  expect(
    part.dimensionNotes?.length,
    `${part.id}.dimensionNotes`,
  ).toBeGreaterThan(0);
}

describe("odometer drum carriage", () => {
  it("builds the complete A-tier carriage and Lu Daolong scheme", () => {
    expect(machine.spec.parts.length).toBeGreaterThanOrEqual(15);
    expect(machine.spec.parts.length).toBeLessThanOrEqual(30);
    expect(machine.spec.driveNodes).toEqual([
      "zulun",
      "zhongpinglun",
      "shangpinglun",
    ]);
    expect(machine.spec.primaryDrive).toBe("zulun");
    expect(machine.defaultSchemeId).toBe("ludaolong");
    expect(Object.keys(machine.schemes ?? {})).toEqual(["ludaolong"]);
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();

    const graph = new KinematicGraph(machine.spec);
    expect(() => graph.setScheme(machine.schemes?.ludaolong)).not.toThrow();
  });

  it("preserves the seven required transmission ids and exact recorded teeth", () => {
    const required = {
      zulun: undefined,
      lilun: 18,
      xiapinglun: 54,
      xuanfenglun: 3,
      zhongpinglun: 100,
      xiaopinglun: 10,
      shangpinglun: 100,
    } as const;
    expect(
      Object.keys(required).every((id) =>
        machine.spec.parts.some((part) => part.id === id),
      ),
    ).toBe(true);

    const toothTotal = Object.entries(required).reduce((sum, [id, teeth]) => {
      if (teeth === undefined) return sum;
      const part = machine.spec.parts.find((candidate) => candidate.id === id);
      expect(part?.geometry.type).toBe("gear");
      if (part?.geometry.type === "gear") {
        expect(part.geometry.teeth, id).toBe(teeth);
        return sum + part.geometry.teeth;
      }
      return sum;
    }, 0);
    expect(toothTotal).toBe(285);
  });

  it("reproduces the 1/100 drum and 1/1000 chime reductions", () => {
    const graph = new KinematicGraph(machine.spec);

    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(ratio.from, ratio.to)).toBeCloseTo(
        ratio.ratio,
        12,
      );
    }
    expect(graph.ratioBetween("zulun", "zhongpinglun")).toBeCloseTo(
      1 / 100,
      12,
    );
    expect(graph.ratioBetween("zulun", "shangpinglun")).toBeCloseTo(
      -1 / 1000,
      12,
    );

    const reverse = new KinematicGraph(machine.spec);
    reverse.drive("shangpinglun", 0.001);
    expect(reverse.state().zulun).toBeCloseTo(-1, 12);
    expect(
      machine.spec.constraints.find(
        (constraint) =>
          constraint.type === "mesh" &&
          constraint.a === "xiaopinglun" &&
          constraint.b === "shangpinglun",
      ),
    ).toEqual({ type: "mesh", a: "xiaopinglun", b: "shangpinglun" });
    expect(machine.spec.cycleRad).toBe(Math.PI * 2 * 1000);
  });

  it("keeps the recorded diameters and ancient circumference basis visible", () => {
    const zulun = machine.spec.parts.find((part) => part.id === "zulun");
    const lilun = machine.spec.parts.find((part) => part.id === "lilun");
    const xiapinglun = machine.spec.parts.find(
      (part) => part.id === "xiapinglun",
    );
    const zhongpinglun = machine.spec.parts.find(
      (part) => part.id === "zhongpinglun",
    );

    expect(zulun?.geometry.type).toBe("wheel");
    if (zulun?.geometry.type === "wheel") {
      expect(zulun.geometry.radius * 2).toBeCloseTo(1.872, 12);
    }
    expect(zulun?.dimensionNotes?.[0].ancient).toContain("圍一丈八尺");

    for (const [part, diameter] of [
      [lilun, 0.431],
      [xiapinglun, 1.292],
      [zhongpinglun, 1.248],
    ] as const) {
      expect(part?.geometry.type).toBe("gear");
      if (part?.geometry.type === "gear") {
        expect(part.geometry.module * part.geometry.teeth).toBeCloseTo(
          diameter,
          3,
        );
      }
    }
  });

  it("sources every part and numeric geometry or range field", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));
    for (const part of machine.spec.parts) {
      expectPartCoverage(part);
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref), part.id).toBe(true);
      }
    }
  });

  it("links the middle and upper wheels to their striking cams", () => {
    const cams = machine.spec.constraints.filter(
      (constraint) => constraint.type === "cam",
    );
    expect(cams).toEqual([
      expect.objectContaining({
        cam: "zhongpinglun",
        follower: "lower-figure",
        liftHeight: 0.28,
      }),
      expect.objectContaining({
        cam: "shangpinglun",
        follower: "upper-figure",
        liftHeight: 0.28,
      }),
    ]);

    const graph = new KinematicGraph(machine.spec);
    graph.setInput("zhongpinglun", Math.PI);
    expect(graph.state()["lower-figure"]).toBeCloseTo(0.28, 12);
    graph.setInput("shangpinglun", Math.PI);
    expect(graph.state()["upper-figure"]).toBeCloseTo(0.28, 12);
  });

  it("runs every mechanism trigger and emits drum and chime thresholds", () => {
    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "drive:zulun",
      "drive:zhongpinglun",
      "drive:shangpinglun",
      "advance",
    ]);

    const spotlightGraph = new KinematicGraph(machine.spec);
    const spotlightEvents: Array<[string, string]> = [];
    let raisedMallet = 0;
    machine.mechanism?.triggers
      .find((trigger) => trigger.id === "spotlight")
      ?.run(spotlightGraph, (type, part) => {
        spotlightEvents.push([type, part]);
        if (type === "mallet:raise") {
          raisedMallet = captureSpotlightState(
            machine.spec,
            spotlightGraph.state(),
            type,
            part,
          )["lower-figure"];
        }
      });
    expect(spotlightEvents).toEqual([
      ["camera:focus", "xuanfenglun"],
      ["highlight:on", "xuanfenglun"],
      ["highlight:on", "zhongpinglun"],
      ["odometer:readout", "0.99-li"],
      ["drive:slow", "zulun"],
      ["mallet:raise", "lower-figure"],
      ["drum", "lower-figure"],
      ["odometer:readout", "1.00-li"],
      ["source", "songshi-ludaolong"],
      ["highlight:off", "xuanfenglun"],
      ["highlight:off", "zhongpinglun"],
      ["spotlight:done", "odometer"],
    ]);
    expect(raisedMallet).toBeCloseTo(0.28, 12);
    expect(spotlightGraph.state().zhongpinglun).toBeCloseTo(Math.PI * 2, 12);

    const advance = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "advance",
    );
    const oneLiGraph = new KinematicGraph(machine.spec);
    const oneLiEvents: Array<[string, string]> = [];
    advance?.run(oneLiGraph, (type, part) => oneLiEvents.push([type, part]), 1);
    expect(oneLiEvents).toEqual([
      ["drive", "zulun"],
      ["odometer:update", "1.00"],
      ["drum", "lower-figure"],
    ]);

    const tenLiGraph = new KinematicGraph(machine.spec);
    const tenLiEvents: Array<[string, string]> = [];
    advance?.run(
      tenLiGraph,
      (type, part) => tenLiEvents.push([type, part]),
      10,
    );
    expect(tenLiEvents).toEqual([
      ["drive", "zulun"],
      ["odometer:update", "10.00"],
      ...Array.from({ length: 10 }, () => ["drum", "lower-figure"]),
      ["chime", "upper-figure"],
    ]);

    const drag = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "drive:zulun",
    );
    const dragGraph = new KinematicGraph(machine.spec);
    const dragEvents: Array<[string, string]> = [];
    drag?.run(
      dragGraph,
      (type, part) => dragEvents.push([type, part]),
      Math.PI * 2,
    );
    expect(dragEvents).toEqual([["odometer:update", "0.01"]]);

    const middleDrag = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "drive:zhongpinglun",
    );
    const middleGraph = new KinematicGraph(machine.spec);
    const middleEvents: Array<[string, string]> = [];
    middleDrag?.run(
      middleGraph,
      (type, part) => middleEvents.push([type, part]),
      Math.PI * 2,
    );
    expect(middleEvents).toEqual([
      ["odometer:update", "1.00"],
      ["drum", "lower-figure"],
    ]);

    const upperDrag = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "drive:shangpinglun",
    );
    const upperGraph = new KinematicGraph(machine.spec);
    const upperEvents: Array<[string, string]> = [];
    upperDrag?.run(
      upperGraph,
      (type, part) => upperEvents.push([type, part]),
      Math.PI * 2,
    );
    expect(upperEvents).toEqual([
      ["odometer:update", "10.00"],
      ...Array.from({ length: 10 }, () => ["drum", "lower-figure"]),
      ["chime", "upper-figure"],
    ]);
  });
});
