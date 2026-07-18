import { describe, expect, it } from "vitest";

import machine from "../../src/machines/wooden-ox/build";
import { planarCrankRodPose } from "../../src/sim/edges";
import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance, SchemePatch } from "../../src/sim/types";

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

function scheme(id: string): SchemePatch {
  const patch = machine.schemes?.[id];
  if (!patch) throw new Error(`Missing scheme ${id}`);
  return patch;
}

function allDeclaredParts(): PartDef[] {
  return [
    ...machine.spec.parts,
    ...Object.values(machine.schemes ?? {}).flatMap(
      (patch) => patch.addParts ?? [],
    ),
  ];
}

function provenanceFor(part: PartDef, path: string): Provenance | undefined {
  return part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"];
}

function driveInput(graph: KinematicGraph, delta: number): void {
  const trigger = machine.mechanism?.triggers.find(
    (candidate) => candidate.id === "drive:drive-axle",
  );
  expect(trigger).toBeDefined();
  trigger?.run(graph, () => undefined, delta);
}

describe("wooden ox and gliding horse", () => {
  it("constructs the base graph and both open reconstructions", () => {
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    expect(machine.spec.driveNodes).toEqual(["drive-axle"]);
    expect(machine.spec.primaryDrive).toBe("drive-axle");
    expect(machine.defaultSchemeId).toBe("wheelbarrow");
    expect(Object.keys(machine.schemes ?? {})).toEqual([
      "wheelbarrow",
      "walker",
    ]);

    for (const id of ["wheelbarrow", "walker"]) {
      const graph = new KinematicGraph(machine.spec);
      expect(() => graph.setScheme(scheme(id)), id).not.toThrow();
    }
    expect(scheme("wheelbarrow").year).toBe(1996);
    expect(scheme("walker").year).toBe(1985);
    expect(machine.data.schemes.map(({ id, year }) => [id, year])).toEqual([
      ["wheelbarrow", 1996],
      ["walker", 1985],
    ]);
  });

  it("covers every declared part and numeric geometry field with provenance", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));

    for (const part of allDeclaredParts()) {
      expect(["wenxian", "wenwu", "tuice"]).toContain(part.provenance.kind);
      expect(part.provenance.ref.trim(), `${part.id}.provenance`).not.toBe("");
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref), part.id).toBe(true);
      }

      const paths = numericPaths(part.geometry);
      if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");
      for (const path of paths) {
        const provenance = provenanceFor(part, path);
        expect(provenance, `${part.id}.${path}`).toBeDefined();
        expect(provenance?.ref.trim(), `${part.id}.${path}`).not.toBe("");
        if (part.dimensionProvenance[path] === undefined) {
          expect(provenance?.kind, `${part.id}.${path} @rest`).toBe("tuice");
        }
      }

      expect(
        Number.isInteger(part.assemblyStep),
        `${part.id}.assemblyStep`,
      ).toBe(true);
      expect(part.explodeVector, `${part.id}.explodeVector`).toHaveLength(3);
      expect(
        part.explodeVector?.some((component) => Math.abs(component) > 0),
        `${part.id}.explodeVector direction`,
      ).toBe(true);
    }
  });

  it("shares two exactly dimensioned grain pods between schemes", () => {
    const pods = machine.spec.parts.filter((part) =>
      part.id.startsWith("cargo-pod-"),
    );
    expect(pods).toHaveLength(2);
    for (const pod of pods) {
      expect(pod.geometry).toEqual({
        type: "box",
        size: [0.653, 0.399, 0.387],
      });
      expect(pod.dimensionProvenance["size.0"]).toMatchObject({
        kind: "wenxian",
        ref: "sgz-liuma",
      });
      expect(pod.dimensionProvenance["size.1"]).toMatchObject({
        kind: "wenxian",
        ref: "sgz-liuma",
      });
      expect(pod.dimensionProvenance["size.2"]).toMatchObject({
        kind: "wenxian",
        ref: "sgz-liuma",
      });
    }
  });

  it("preserves the measured rib length, width, and thickness", () => {
    for (const id of ["rib-left", "rib-right"]) {
      expect(
        machine.spec.parts.find((part) => part.id === id)?.geometry,
      ).toEqual({
        type: "box",
        size: [0.847, 0.0726, 0.05324],
      });
    }
  });

  it("models the wheelbarrow as a central wheel with raised twin shafts", () => {
    const patch = scheme("wheelbarrow");
    expect(patch.addParts?.map((part) => part.id)).toEqual([
      "central-big-wheel",
    ]);
    for (const id of ["twin-shaft-left", "twin-shaft-right"]) {
      expect(
        machine.spec.parts.some((part) => part.id === id),
        id,
      ).toBe(true);
    }
    expect(
      machine.spec.parts.length + (patch.addParts?.length ?? 0),
    ).toBeGreaterThanOrEqual(15);

    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(patch);
    graph.setInput("drive-axle", Math.PI / 2);
    expect(graph.state()["central-big-wheel"]).toBeCloseTo(Math.PI / 2, 12);
  });

  it("models four quarter-cycle-spaced crank linkages for the walker", () => {
    const patch = scheme("walker");
    const cranks =
      patch.addParts?.filter((part) => part.id.startsWith("walker-crank-")) ??
      [];
    const rods =
      patch.addParts?.filter((part) => part.id.startsWith("walker-rod-")) ?? [];
    const legs =
      patch.addParts?.filter((part) => part.id.startsWith("walker-leg-")) ?? [];

    expect(cranks).toHaveLength(4);
    expect(rods).toHaveLength(4);
    expect(legs).toHaveLength(4);
    expect(cranks.map((part) => part.rotationEuler)).toEqual(
      Array.from({ length: 4 }, () => [Math.PI / 2, 0, 0]),
    );
    expect(cranks.map((part) => part.joint?.axis)).toEqual(
      Array.from({ length: 4 }, () => [0, 1, 0]),
    );
    expect(rods.map((part) => part.position[1])).toEqual([
      0.49, 0.49, 0.49, 0.49,
    ]);
    expect(rods.map((part) => part.rotationEuler)).toEqual(
      Array.from({ length: 4 }, () => [0, 0, Math.PI / 2]),
    );
    expect(
      patch.addConstraints?.filter((constraint) => constraint.type === "crank"),
    ).toHaveLength(4);
    const phaseLocks =
      patch.addConstraints?.filter(
        (constraint) => constraint.type === "lockstep",
      ) ?? [];
    expect(phaseLocks).toHaveLength(4);
    expect(phaseLocks.map((constraint) => constraint.phase)).toEqual([
      0,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
    ]);
    expect(machine.spec.collisionWhitelist).toEqual([]);
    const walkerWhitelist = patch.collisionWhitelist;
    expect(walkerWhitelist).toEqual([
      ...Array.from({ length: 4 }, (_, leg) => [
        `walker-crank-${leg}`,
        `walker-rod-${leg}`,
      ]),
      ...Array.from({ length: 4 }, (_, leg) => [
        `walker-rod-${leg}`,
        `walker-leg-${leg}`,
      ]),
    ]);
    expect(applySchemePatch(machine.spec, patch).collisionWhitelist).toEqual(
      walkerWhitelist,
    );
    expect(
      machine.spec.parts.length + (patch.addParts?.length ?? 0),
    ).toBeLessThanOrEqual(30);

    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(patch);
    graph.setInput("drive-axle", 0);
    const expectedPhases = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const initialLegs = [0, 0.08043519433502008, 0.14, 0.08043519433502008];
    for (let leg = 0; leg < 4; leg += 1) {
      expect(graph.state()[`walker-crank-${leg}`]).toBeCloseTo(
        expectedPhases[leg],
        12,
      );
      expect(graph.state()[`walker-leg-${leg}`]).toBeCloseTo(
        initialLegs[leg],
        12,
      );
      expect(graph.state()[`walker-rod-${leg}`]).toBeCloseTo(
        Math.asin((0.07 / 0.24) * Math.sin(expectedPhases[leg])),
        12,
      );
      const crank = cranks[leg];
      const rod = rods[leg];
      const walkerLeg = legs[leg];
      const pose = planarCrankRodPose(
        graph.state()[crank.id],
        crank.position,
        0.07,
        0.24,
      );
      const sliderTop =
        walkerLeg.position[1] +
        (walkerLeg.geometry.type === "beam"
          ? walkerLeg.geometry.size[1] / 2
          : 0) +
        graph.state()[walkerLeg.id];
      expect(pose.sliderPin[1]).toBeCloseTo(sliderTop, 12);
      expect(
        Math.hypot(
          pose.sliderPin[0] - pose.crankPin[0],
          pose.sliderPin[1] - pose.crankPin[1],
        ),
      ).toBeCloseTo(rod.geometry.type === "link" ? rod.geometry.length : 0, 12);
    }
    graph.setInput("drive-axle", Math.PI * 2);
    for (let leg = 0; leg < 4; leg += 1) {
      expect(graph.state()[`walker-leg-${leg}`]).toBeCloseTo(
        initialLegs[leg],
        12,
      );
    }
  });

  it("declares no exact continuous ratio for the disputed mechanism", () => {
    expect(machine.spec.expectedRatios).toEqual([]);
    const graph = new KinematicGraph(machine.spec);
    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(ratio.from, ratio.to)).toBeCloseTo(
        ratio.ratio,
        12,
      );
    }
  });

  it("runs the load-path and full-gait spotlight branches", () => {
    const spotlight = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "spotlight",
    );
    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "drive:drive-axle",
      "spotlight",
    ]);
    expect(spotlight).toBeDefined();

    const wheelbarrow = new KinematicGraph(machine.spec);
    wheelbarrow.setScheme(scheme("wheelbarrow"));
    const wheelbarrowEvents: Array<[string, string]> = [];
    spotlight?.run(wheelbarrow, (type, part) =>
      wheelbarrowEvents.push([type, part]),
    );
    expect(wheelbarrowEvents.slice(0, 11)).toEqual([
      ["camera:focus", "wooden-ox"],
      ["highlight:on", "cargo-pod-left"],
      ["highlight:on", "cargo-pod-right"],
      ["force:load", "cargo-pod-left"],
      ["force:load", "cargo-pod-right"],
      ["force:support", "central-big-wheel"],
      ["drive", "central-big-wheel"],
      ["highlight:off", "cargo-pod-left"],
      ["highlight:off", "cargo-pod-right"],
      ["source", "shiwujiyuan"],
      ["scheme:switch", "walker"],
    ]);
    expect(
      wheelbarrowEvents.filter(
        ([type, part]) => type === "drive:step" && part === "drive-axle",
      ),
    ).toHaveLength(4);
    expect(wheelbarrowEvents).toContainEqual(["source", "sgz-muniu"]);
    expect(wheelbarrowEvents.at(-1)).toEqual(["spotlight:done", "wooden-ox"]);
    expect(wheelbarrow.state()).toHaveProperty("walker-crank-3");
    expect(wheelbarrow.state()).not.toHaveProperty("central-big-wheel");

    const walker = new KinematicGraph(machine.spec);
    walker.setScheme(scheme("walker"));
    const walkerEvents: Array<[string, string]> = [];
    spotlight?.run(walker, (type, part) => walkerEvents.push([type, part]));
    expect(walkerEvents[0]).toEqual(["camera:focus", "wooden-ox"]);
    for (let leg = 0; leg < 4; leg += 1) {
      expect(walkerEvents).toContainEqual([
        "highlight:on",
        `walker-leg-${leg}`,
      ]);
      expect(walkerEvents).toContainEqual(["phase", `walker-crank-${leg}`]);
      expect(walkerEvents).toContainEqual([
        "highlight:off",
        `walker-leg-${leg}`,
      ]);
    }
    expect(
      walkerEvents.filter(
        ([type, part]) => type === "drive:step" && part === "drive-axle",
      ),
    ).toHaveLength(4);
    expect(walkerEvents).toContainEqual(["source", "sgz-muniu"]);
    expect(walkerEvents.at(-1)).toEqual(["spotlight:done", "wooden-ox"]);
  });
});
