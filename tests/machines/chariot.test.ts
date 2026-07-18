import { describe, expect, it } from "vitest";

import machine from "../../src/machines/chariot/build";
import { KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance } from "../../src/sim/types";

function numericPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "number") {
    return [prefix];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      numericPaths(entry, prefix ? `${prefix}.${index}` : String(index)),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      numericPaths(entry, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [];
}

function expectProvenance(provenance: Provenance | undefined): void {
  expect(provenance).toBeDefined();
  expect(["wenxian", "wenwu", "tuice"]).toContain(provenance?.kind);
  expect(provenance?.ref.length).toBeGreaterThan(0);
}

function expectPartCoverage(part: PartDef): void {
  expectProvenance(part.provenance);

  for (const path of numericPaths(part.geometry)) {
    const provenance =
      part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"];
    expect(provenance, `${part.id}.${path}`).toBeDefined();
    if (!part.dimensionProvenance[path]) {
      expect(provenance?.kind, `${part.id}.${path} fallback`).toBe("tuice");
    }
  }
}

function expectAssemblyMetadata(part: PartDef): void {
  expect(Number.isInteger(part.assemblyStep), `${part.id}.assemblyStep`).toBe(
    true,
  );
  expect(part.explodeVector, `${part.id}.explodeVector`).toHaveLength(3);
  expect(
    part.explodeVector?.some((component) => Math.abs(component) > 0),
    `${part.id}.explodeVector direction`,
  ).toBe(true);
}

function driveRoadWheel(
  graph: KinematicGraph,
  wheel: "left-road-wheel" | "right-road-wheel",
  delta: number,
): void {
  const trigger = machine.mechanism?.triggers.find(
    (candidate) => candidate.id === `drive:${wheel}`,
  );
  expect(trigger).toBeDefined();
  trigger?.run(graph, () => undefined, delta);
}

describe("south-pointing chariot", () => {
  it("builds an S-tier assembly with the required drive nodes", () => {
    expect(machine.spec.parts.length).toBeGreaterThanOrEqual(25);
    expect(machine.spec.parts.length).toBeLessThanOrEqual(60);
    expect(machine.spec.driveNodes).toEqual([
      "left-road-wheel",
      "right-road-wheel",
      "great-wheel",
    ]);
    expect(machine.spec.primaryDrive).toBe("left-road-wheel");
    expect(machine.spec.collisionWhitelist).toEqual([
      ["left-sub-wheel", "left-small-wheel"],
      ["left-small-wheel", "great-wheel"],
      ["right-sub-wheel", "right-small-wheel"],
      ["right-small-wheel", "great-wheel"],
      ["platform", "central-shaft"],
      ["great-wheel", "central-shaft"],
      ["left-clutch-dog", "clutch-yoke"],
      ["right-clutch-dog", "clutch-yoke"],
    ]);
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
  });

  it("preserves the documented 24-to-12 and 12-to-48 gear ratios", () => {
    const graph = new KinematicGraph(machine.spec);

    expect(
      graph.ratioBetween("left-sub-wheel", "left-small-wheel"),
    ).toBeCloseTo(-24 / 12);
    expect(graph.ratioBetween("left-small-wheel", "great-wheel")).toBeCloseTo(
      -12 / 48,
    );
    expect(
      graph.ratioBetween("right-sub-wheel", "right-small-wheel"),
    ).toBeCloseTo(-24 / 12);
    expect(graph.ratioBetween("right-small-wheel", "great-wheel")).toBeCloseTo(
      -12 / 48,
    );

    expect(machine.spec.expectedRatios).toEqual([
      {
        from: "left-sub-wheel",
        to: "left-small-wheel",
        ratio: -2,
        sourceRef: "songshi-yansu",
      },
      {
        from: "left-small-wheel",
        to: "great-wheel",
        ratio: -0.25,
        sourceRef: "songshi-yansu",
      },
      {
        from: "right-sub-wheel",
        to: "right-small-wheel",
        ratio: -2,
        sourceRef: "songshi-yansu",
      },
      {
        from: "right-small-wheel",
        to: "great-wheel",
        ratio: -0.25,
        sourceRef: "songshi-yansu",
      },
    ]);
  });

  it("preserves the recorded three-cun upright wheels and central shaft", () => {
    for (const id of ["left-upright-wheel", "right-upright-wheel"]) {
      const part = machine.spec.parts.find((candidate) => candidate.id === id);
      expect(part?.geometry.type).toBe("wheel");
      if (part?.geometry.type === "wheel") {
        expect(part.geometry.radius).toBeCloseTo(0.0468, 12);
      }
    }

    const shaft = machine.spec.parts.find(
      (part) => part.id === "central-shaft",
    );
    expect(shaft?.geometry.type).toBe("shaft");
    if (shaft?.geometry.type === "shaft") {
      expect(shaft.geometry.radius).toBeCloseTo(0.0468, 12);
      expect(shaft.geometry.length).toBeCloseTo(2.496, 12);
    }
  });

  it("provides provenance for every part and numeric geometry field", () => {
    for (const part of machine.spec.parts) {
      expectPartCoverage(part);
      expectAssemblyMetadata(part);
    }

    for (const scheme of Object.values(machine.schemes ?? {})) {
      for (const part of scheme.addParts ?? []) {
        expectPartCoverage(part);
        expectAssemblyMetadata(part);
      }
    }
  });

  it("constructs both the clutch and continuous-differential schemes", () => {
    expect(machine.defaultSchemeId).toBe("yansu-clutch");
    expect(Object.keys(machine.schemes ?? {})).toEqual([
      "yansu-clutch",
      "lanchester-diff",
    ]);

    for (const scheme of Object.values(machine.schemes ?? {})) {
      const graph = new KinematicGraph(machine.spec);
      expect(() => graph.setScheme(scheme)).not.toThrow();
    }

    const differential = machine.schemes?.["lanchester-diff"];
    expect(
      machine.spec.constraints.some(
        (constraint) => constraint.type === "differential",
      ),
    ).toBe(false);
    expect(
      differential?.addConstraints?.some(
        (constraint) => constraint.type === "differential",
      ),
    ).toBe(true);
    expect(differential?.collisionWhitelist).toEqual([
      ["left-sub-wheel", "left-small-wheel"],
      ["left-small-wheel", "great-wheel"],
      ["right-sub-wheel", "right-small-wheel"],
      ["right-small-wheel", "great-wheel"],
      ["platform", "central-shaft"],
      ["great-wheel", "central-shaft"],
    ]);

    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(differential);
    expect(
      graph.ratioBetween("left-road-wheel", "right-road-wheel"),
    ).toBeNull();
    graph.setInput("left-road-wheel", 2);
    graph.setInput("right-road-wheel", 4);
    expect(graph.state()["chassis-pivot"]).toBeCloseTo(-2, 12);
    expect(graph.state()["differential-carrier"]).toBeCloseTo(-2, 12);
  });

  it("runs the spotlight with a deterministic camera, highlight, and drive sequence", () => {
    const graph = new KinematicGraph(machine.spec);
    const spotlight = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "spotlight",
    );
    const events: Array<[string, string]> = [];

    expect(spotlight).toBeDefined();
    spotlight?.run(
      graph,
      (type, part) => events.push([type, part]),
      Math.PI / 2,
    );

    expect(events).toEqual([
      ["camera:focus", "chariot"],
      ["highlight:on", "left-road-wheel"],
      ["drive", "left-road-wheel"],
      ["highlight:on", "left-sub-wheel"],
      ["highlight:on", "left-small-wheel"],
      ["highlight:on", "great-wheel"],
      ["camera:orbit", "south-figure-body"],
      ["highlight:off", "left-road-wheel"],
      ["highlight:off", "left-sub-wheel"],
      ["highlight:off", "left-small-wheel"],
      ["highlight:off", "great-wheel"],
      ["spotlight:done", "chariot"],
    ]);
    expect(graph.state()["right-road-wheel"]).toBe(0);
    expect(graph.state()["chassis-pivot"]).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state()["great-wheel"]).toBeCloseTo(-Math.PI / 2, 12);
    expect(graph.state()["figure-turntable"]).toBeCloseTo(-Math.PI / 2, 12);
  });

  it("keeps wheel inputs independent and cancels the figure's world yaw", () => {
    const graph = new KinematicGraph(machine.spec);
    const theta = Math.PI / 2;
    expect(
      graph.ratioBetween("left-road-wheel", "right-road-wheel"),
    ).toBeNull();
    driveRoadWheel(graph, "left-road-wheel", theta);
    const state = graph.state();
    const worldYaw = state["chassis-pivot"] + state["figure-turntable"];

    expect(state["right-road-wheel"]).toBe(0);
    expect(state["chassis-pivot"]).toBeCloseTo(theta, 12);
    expect(state["left-clutch-dog"]).toBeCloseTo(0.08, 12);
    expect(state["right-clutch-dog"]).toBe(0);
    expect(Math.abs(worldYaw)).toBeLessThan(1e-6);
    expect(
      machine.spec.parts.find((part) => part.id === "figure-turntable")?.parent,
    ).toBe("chassis-pivot");

    const straight = new KinematicGraph(machine.spec);
    driveRoadWheel(straight, "left-road-wheel", theta);
    driveRoadWheel(straight, "right-road-wheel", theta);
    expect(straight.state()["chassis-pivot"]).toBeCloseTo(0, 12);
    expect(straight.state()["left-clutch-dog"]).toBe(0);
    expect(straight.state()["right-clutch-dog"]).toBe(0);
  });
});
