import { describe, expect, it } from "vitest";

import {
  buildPartGeometry,
  singlePartGeometry,
} from "../../src/core/primitives";
import machine, { bellowsRockerAngle } from "../../src/machines/bellows/build";
import { KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance } from "../../src/sim/types";

const CRANK_RADIUS = 0.24;
const ROD_LENGTH = 1.2;

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
  const paths = [
    ...numericPaths(part.geometry),
    ...numericPaths(part.position, "position"),
    ...numericPaths(part.rotationEuler, "rotationEuler"),
    ...numericPaths(part.joint, "joint"),
  ];

  for (const path of paths) {
    const direct = part.dimensionProvenance[path];
    const provenance = direct ?? part.dimensionProvenance["@rest"];
    expect(provenance, `${part.id}.${path}`).toBeDefined();
    expectProvenance(provenance);
    if (!direct) {
      expect(provenance?.kind, `${part.id}.${path} fallback`).toBe("tuice");
      expect(
        provenance?.note?.trim(),
        `${part.id}.${path} fallback note`,
      ).not.toBe("");
    }
  }

  const rest = part.dimensionProvenance["@rest"];
  if (rest) {
    expect(rest.kind, `${part.id}.@rest kind`).toBe("tuice");
    expect(rest.note?.trim(), `${part.id}.@rest note`).not.toBe("");
  }
  expect(Number.isInteger(part.assemblyStep), `${part.id}.assemblyStep`).toBe(
    true,
  );
  expect(part.explodeVector, `${part.id}.explodeVector`).toHaveLength(3);
  expect(
    part.explodeVector?.some((component) => Math.abs(component) > 0),
    `${part.id}.explodeVector direction`,
  ).toBe(true);
}

function analyticStroke(theta: number): number {
  return (
    ROD_LENGTH +
    CRANK_RADIUS -
    (CRANK_RADIUS * Math.cos(theta) +
      Math.sqrt(
        ROD_LENGTH * ROD_LENGTH -
          CRANK_RADIUS * CRANK_RADIUS * Math.sin(theta) ** 2,
      ))
  );
}

describe("water-powered blast bellows", () => {
  it("builds the default crank-and-rod path without a reconstruction scheme", () => {
    expect(machine.spec.parts.length).toBeGreaterThanOrEqual(8);
    expect(machine.spec.parts.length).toBeLessThanOrEqual(20);
    expect(machine.spec.driveNodes).toEqual(["waterwheel"]);
    expect(machine.spec.primaryDrive).toBe("waterwheel");
    expect(machine.spec.cycleRad).toBe(Math.PI * 2);
    expect(machine.schemes).toBeUndefined();
    expect(machine.defaultSchemeId).toBeUndefined();
    expect(machine.customBuilders).toEqual({
      bellowsRocker: expect.any(Function),
      bellowsTwistedCord: expect.any(Function),
    });
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
  });

  it("derives the 5:1 cord speed-up from the two wheel radii", () => {
    const waterwheel = machine.spec.parts.find(
      (part) => part.id === "waterwheel",
    );
    const drum = machine.spec.parts.find((part) => part.id === "small-drum");
    expect(waterwheel?.geometry.type).toBe("wheel");
    expect(drum?.geometry.type).toBe("wheel");
    if (
      waterwheel?.geometry.type !== "wheel" ||
      drum?.geometry.type !== "wheel"
    ) {
      throw new Error("Bellows belt endpoints must be wheels");
    }
    expect(waterwheel.geometry.radius).toBe(3);
    expect(drum.geometry.radius).toBe(0.6);
    expect(waterwheel.geometry.radius / drum.geometry.radius).toBe(5);

    const cord = machine.spec.parts.find((part) => part.id === "drive-cord");
    expect(cord?.geometry).toMatchObject({
      type: "custom",
      builder: "bellowsTwistedCord",
      params: { waterSpread: 0.18, drumSpread: 0.1 },
    });
    if (!cord) throw new Error("Missing quarter-turn drive cord");
    const cordGeometry = singlePartGeometry(
      buildPartGeometry(cord.geometry, machine.customBuilders),
    );
    cordGeometry.computeBoundingBox();
    expect(cordGeometry.getAttribute("position").count).toBeGreaterThan(100);
    expect(cordGeometry.boundingBox?.min.z).toBeLessThan(-0.15);
    expect(cordGeometry.boundingBox?.max.z).toBeGreaterThan(0.15);
    cordGeometry.dispose();

    const graph = new KinematicGraph(machine.spec);
    for (const expected of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(expected.from, expected.to)).toBeCloseTo(
        expected.ratio,
        12,
      );
    }
    expect(graph.ratioBetween("waterwheel", "small-drum")).toBeCloseTo(5, 12);
    expect(graph.ratioBetween("small-drum", "crank-wheel")).toBeCloseTo(1, 12);
    expect(graph.ratioBetween("waterwheel", "crank-wheel")).toBeCloseTo(5, 12);
  });

  it("covers every part and numeric dimension with provenance", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));
    for (const part of machine.spec.parts) {
      expectPartCoverage(part);
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref), part.id).toBe(true);
      }
    }

    for (const constraint of machine.spec.constraints) {
      if (constraint.type === "crank" || constraint.type === "lockstep") {
        expectProvenance(constraint.provenance);
      }
    }
    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(sourceIds.has(ratio.sourceRef), ratio.sourceRef).toBe(true);
    }
  });

  it("preserves the textual 0.94 m timber without overstating confidence", () => {
    const board = machine.spec.parts.find(
      (part) => part.id === "bellows-board",
    );
    expect(board?.geometry.type).toBe("beam");
    if (board?.geometry.type !== "beam") {
      throw new Error("Missing bellows board");
    }
    expect(board.geometry.size).toContain(0.94);
    expect(board.joint).toMatchObject({
      kind: "prismatic",
      axis: [0, -1, 0],
      limits: [0, 0.5],
    });
    expect(board.dimensionProvenance["size.1"]).toMatchObject({
      kind: "wenxian",
      ref: "nongshu-shuipai",
    });
  });

  it("speeds the drum and crank by 5:1 when the waterwheel is driven", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.drive("waterwheel", Math.PI / 7);
    expect(graph.state()["small-drum"]).toBeCloseTo((5 * Math.PI) / 7, 12);
    expect(graph.state()["crank-wheel"]).toBeCloseTo((5 * Math.PI) / 7, 12);
  });

  it("uses the analytic 0.48 m stroke and stays inside both slider limits", () => {
    expect(analyticStroke(0)).toBeCloseTo(0, 12);
    expect(analyticStroke(Math.PI)).toBeCloseTo(0.48, 12);
    expect(0.48).toBeLessThan(0.5);

    const crank = machine.spec.constraints.find(
      (constraint) => constraint.type === "crank",
    );
    expect(crank).toMatchObject({
      type: "crank",
      wheel: "crank-wheel",
      rod: "connecting-rod",
      slider: "front-upright",
      crankRadius: CRANK_RADIUS,
      rodLength: ROD_LENGTH,
      axis: [0, 1, 0],
    });

    const graph = new KinematicGraph(machine.spec);
    let minimumBoard = Number.POSITIVE_INFINITY;
    let maximumBoard = Number.NEGATIVE_INFINITY;
    for (let sample = 0; sample <= 360; sample += 1) {
      graph.setInput("waterwheel", (Math.PI * 2 * sample) / 360);
      const board = graph.state()["bellows-board"];
      minimumBoard = Math.min(minimumBoard, board);
      maximumBoard = Math.max(maximumBoard, board);
      expect(board).toBeGreaterThanOrEqual(-1e-12);
      expect(board).toBeLessThanOrEqual(0.5 + 1e-12);
    }
    expect(minimumBoard).toBeCloseTo(0, 12);
    expect(maximumBoard).toBeCloseTo(0.48, 12);

    graph.setInput("waterwheel", Math.PI / 5);
    expect(graph.state()["crank-wheel"]).toBeCloseTo(Math.PI, 12);
    expect(graph.state()["front-upright"]).toBeCloseTo(0.48, 12);
    expect(graph.state()["bellows-board"]).toBeCloseTo(0.48, 12);
    expect(graph.state().rocker).toBeCloseTo(0.48, 12);

    const rocker = machine.spec.parts.find((part) => part.id === "rocker");
    if (!rocker) throw new Error("Missing rocker");
    const rockerGeometry = singlePartGeometry(
      buildPartGeometry(rocker.geometry, machine.customBuilders),
    );
    expect(rockerGeometry.userData.mechanicaUpdate).toBeTypeOf("function");
    for (let sample = 0; sample <= 360; sample += 1) {
      const displacement = analyticStroke((Math.PI * 2 * sample) / 360);
      const angle = bellowsRockerAngle(displacement);
      expect(-Math.sin(angle), `left endpoint ${sample}`).toBeCloseTo(
        displacement,
        12,
      );
      expect(Math.sin(angle), `right endpoint ${sample}`).toBeCloseTo(
        -displacement,
        12,
      );
      (rockerGeometry.userData.mechanicaUpdate as (value: number) => void)(
        displacement,
      );
    }
    expect(
      rockerGeometry.userData.mechanicaAnimation.currentStateRad,
    ).toBeCloseTo(0, 12);
    rockerGeometry.dispose();
  });

  it("runs every trigger through the exact mirrored-Watt spotlight sequence", () => {
    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
    ]);
    const graph = new KinematicGraph(machine.spec);
    const events: Array<[string, string]> = [];
    machine.mechanism?.triggers[0]?.run(graph, (type, part) => {
      events.push([type, part]);
    });

    expect(events).toEqual([
      ["camera:focus", "waterwheel"],
      ["highlight:on", "waterwheel"],
      ["drive", "waterwheel"],
      ["camera:focus", "drive-cord"],
      ["highlight:on", "drive-cord"],
      ["camera:focus", "small-drum"],
      ["highlight:on", "small-drum"],
      ["camera:focus", "crank-wheel"],
      ["highlight:on", "crank-wheel"],
      ["camera:focus", "connecting-rod"],
      ["highlight:on", "connecting-rod"],
      ["camera:focus", "rocker"],
      ["highlight:on", "rocker"],
      ["camera:focus", "bellows-board"],
      ["highlight:on", "bellows-board"],
      ["comparison:mirrored-watt", "bellows-board"],
      ["source", "nongshu-shuipai"],
      ["highlight:off", "bellows-board"],
      ["highlight:off", "rocker"],
      ["highlight:off", "connecting-rod"],
      ["highlight:off", "crank-wheel"],
      ["highlight:off", "small-drum"],
      ["highlight:off", "drive-cord"],
      ["highlight:off", "waterwheel"],
      ["spotlight:done", "bellows"],
    ]);
    expect(graph.state()["waterwheel"]).toBeCloseTo(Math.PI / 5, 12);
    expect(graph.state()["small-drum"]).toBeCloseTo(Math.PI, 12);
    expect(graph.state()["bellows-board"]).toBeCloseTo(0.48, 12);
    expect(graph.state().rocker).toBeCloseTo(0.48, 12);
  });
});
