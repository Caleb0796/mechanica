import { describe, expect, it } from "vitest";
import { InstancedMesh, Matrix4, MeshBasicMaterial } from "three";

import {
  applyMechanicaInstanceMatrices,
  buildPartGeometry,
  getMechanicaInstanceMatrices,
} from "../../src/core/primitives";
import machine from "../../src/machines/typecase/build";
import { KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance } from "../../src/sim/types";

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

function provenanceFor(part: PartDef, path: string): Provenance | undefined {
  return part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"];
}

function referencesResolve(reference: string, sources: Set<string>): boolean {
  return reference.split("+").every((item) => sources.has(item.trim()));
}

function trigger(id: string) {
  const found = machine.mechanism?.triggers.find((item) => item.id === id);
  if (!found) throw new Error(`Missing trigger ${id}`);
  return found;
}

function runTrigger(
  id: string,
  param?: number,
): {
  graph: KinematicGraph;
  events: Array<{ type: string; part: string }>;
} {
  const graph = new KinematicGraph(machine.spec);
  const events: Array<{ type: string; part: string }> = [];
  trigger(id).run(graph, (type, part) => events.push({ type, part }), param);
  return { graph, events };
}

describe("typecase machine module", () => {
  it("constructs a 15-part graph with two hand-driven wheels", () => {
    expect(machine.spec.parts).toHaveLength(15);
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    expect(machine.spec.driveNodes).toEqual(["rhyme-wheel", "misc-wheel"]);
    expect(machine.spec.primaryDrive).toBe("rhyme-wheel");
    expect(machine.spec.cycleRad).toBeCloseTo(Math.PI * 2, 12);
    expect(machine.spec.collisionWhitelist).toEqual([]);
    expect(machine.customBuilders).toEqual({
      instancedTypeGrid: expect.any(Function),
      typecaseForme: expect.any(Function),
    });
  });

  it("covers every part and numeric model field with provenance", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));

    for (const part of machine.spec.parts) {
      expect(["wenxian", "wenwu", "tuice"]).toContain(part.provenance.kind);
      expect(referencesResolve(part.provenance.ref, sourceIds), part.id).toBe(
        true,
      );
      expect(part.assemblyStep, `${part.id}.assemblyStep`).toBeTypeOf("number");
      expect(part.explodeVector, `${part.id}.explodeVector`).toHaveLength(3);

      const paths = [
        ...numericPaths(part.geometry),
        ...numericPaths(part.position, "position"),
        ...numericPaths(part.rotationEuler, "rotationEuler"),
        ...numericPaths(part.joint?.axis, "joint.axis"),
        ...numericPaths(part.joint?.limits, "joint.limits"),
      ];
      for (const path of paths) {
        const provenance = provenanceFor(part, path);
        expect(provenance, `${part.id}.${path}`).toBeDefined();
        expect(provenance?.ref.trim(), `${part.id}.${path}`).not.toBe("");
        expect(
          referencesResolve(provenance?.ref ?? "", sourceIds),
          `${part.id}.${path}`,
        ).toBe(true);
        if (part.dimensionProvenance[path] === undefined) {
          expect(provenance?.kind, `${part.id}.${path} @rest`).toBe("tuice");
        }
      }
    }
  });

  it("preserves the textual wheel dimensions and one 320-type grid", () => {
    const wheels = machine.spec.parts.filter((part) =>
      ["rhyme-wheel", "misc-wheel"].includes(part.id),
    );
    expect(wheels).toHaveLength(2);
    for (const wheel of wheels) {
      expect(wheel.geometry).toMatchObject({
        type: "wheel",
        radius: 1.1025,
      });
      expect(wheel.position[1]).toBe(0.945);
    }

    const grids = machine.spec.parts.filter(
      (part) =>
        part.geometry.type === "custom" &&
        part.geometry.builder === "instancedTypeGrid",
    );
    expect(grids).toHaveLength(1);
    const grid = grids[0];
    expect(grid.geometry).toMatchObject({
      type: "custom",
      params: { count: 320, thickness: 0.0025 },
    });
    if (grid.geometry.type !== "custom") throw new Error("Expected type grid");
    expect(grid.geometry.params.count).toBeGreaterThanOrEqual(300);
    const geometry = buildPartGeometry(grid.geometry, machine.customBuilders);
    const matrices = getMechanicaInstanceMatrices(geometry);
    expect(geometry.getAttribute("position").count).toBeLessThan(100);
    expect(matrices).toHaveLength(320);
    const material = new MeshBasicMaterial();
    const rendered = new InstancedMesh(geometry, material, matrices!.length);
    applyMechanicaInstanceMatrices(rendered, matrices!);
    expect(rendered.isInstancedMesh).toBe(true);
    expect(rendered.count).toBe(320);
    const first = new Matrix4();
    const last = new Matrix4();
    rendered.getMatrixAt(0, first);
    rendered.getMatrixAt(319, last);
    expect(first.equals(last)).toBe(false);
    geometry.dispose();
    material.dispose();
  });

  it("derives only direct one-to-one hand-spun locksteps", () => {
    const graph = new KinematicGraph(machine.spec);
    const source = machine.data.sources.find(
      (item) => item.id === "nongshu-zaolun",
    );
    expect(source?.quote).toContain("左右俱可推轉摘字");

    const wheelTurns = 1;
    const attachedBoardTurns = 1;
    const directRatio = attachedBoardTurns / wheelTurns;
    expect(directRatio).toBe(1);
    expect(machine.spec.expectedRatios).toEqual([
      {
        from: "rhyme-wheel",
        to: "rhyme-index-board",
        ratio: directRatio,
        sourceRef: "nongshu-zaolun",
      },
      {
        from: "misc-wheel",
        to: "misc-index-board",
        ratio: directRatio,
        sourceRef: "nongshu-zaolun",
      },
    ]);
    for (const expected of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(expected.from, expected.to)).toBeCloseTo(
        expected.ratio,
        12,
      );
    }
  });

  it("runs the five print steps in exact order", () => {
    expect(machine.mechanism?.triggers.map((item) => item.id)).toEqual([
      "spotlight",
      "process",
    ]);
    const { graph, events } = runTrigger("process");
    expect(events).toEqual([
      { type: "process:pick", part: "picked-type" },
      { type: "process:set-forme", part: "iron-forme" },
      { type: "process:heat-resin", part: "resin-bed" },
      { type: "process:press-flat", part: "flat-press" },
      { type: "process:print", part: "print-sheet" },
    ]);
    expect(graph.state()["rhyme-wheel"]).toBeCloseTo(Math.PI / 8, 12);
    expect(graph.state()["rhyme-index-board"]).toBeCloseTo(Math.PI / 8, 12);
    expect(graph.state()["picked-type"]).toBe(0);
    expect(graph.state().heater).toBe(0.02);
    expect(graph.state()["flat-press"]).toBe(0.1);
    expect(graph.state()["print-sheet"]).toBe(0.12);
  });

  it("advances and resets the five-step UI contract one stage at a time", () => {
    const graph = new KinematicGraph(machine.spec);
    const expected = [
      { type: "process:pick", part: "picked-type" },
      { type: "process:set-forme", part: "iron-forme" },
      { type: "process:heat-resin", part: "resin-bed" },
      { type: "process:press-flat", part: "flat-press" },
      { type: "process:print", part: "print-sheet" },
    ];
    const process = trigger("process");
    expected.forEach((event, index) => {
      const events: typeof expected = [];
      process.run(
        graph,
        (type, part) => events.push({ type, part }),
        index + 1,
      );
      expect(events).toEqual([event]);
      expect(graph.state()["rhyme-wheel"]).toBeCloseTo(Math.PI / 8, 12);
      expect(graph.state()["picked-type"]).toBe(index === 0 ? 0.05 : 0);
      expect(graph.state().heater).toBe(index >= 2 ? 0.02 : 0);
      expect(graph.state()["flat-press"]).toBe(index >= 3 ? 0.1 : 0);
      expect(graph.state()["print-sheet"]).toBe(index >= 4 ? 0.12 : 0);
    });
    const resetEvents: typeof expected = [];
    process.run(graph, (type, part) => resetEvents.push({ type, part }), 0);
    expect(resetEvents).toEqual([{ type: "process:reset", part: "typecase" }]);
    expect(graph.state()["rhyme-wheel"]).toBe(0);
    expect(graph.state()["picked-type"]).toBe(0);
    expect(graph.state().heater).toBe(0);
    expect(graph.state()["flat-press"]).toBe(0);
    expect(graph.state()["print-sheet"]).toBe(0);
  });

  it("runs the universal spotlight and closes only that flow", () => {
    const { events } = runTrigger("spotlight");
    expect(events).toEqual([
      { type: "camera:focus", part: "rhyme-wheel" },
      { type: "highlight:on", part: "type-grid" },
      { type: "drive:slow", part: "rhyme-wheel" },
      { type: "process:pick", part: "picked-type" },
      { type: "process:set-forme", part: "iron-forme" },
      { type: "process:heat-resin", part: "resin-bed" },
      { type: "process:press-flat", part: "flat-press" },
      { type: "process:print", part: "print-sheet" },
      { type: "highlight:on", part: "iron-forme" },
      { type: "source", part: "nongshu-zaolun" },
      { type: "source", part: "mengxi-bisheng" },
      { type: "highlight:off", part: "type-grid" },
      { type: "highlight:off", part: "iron-forme" },
      { type: "spotlight:done", part: "typecase" },
    ]);
    expect(events.at(-1)).toEqual({
      type: "spotlight:done",
      part: "typecase",
    });
    expect(runTrigger("process").events).not.toContainEqual({
      type: "spotlight:done",
      part: "typecase",
    });
  });

  it("keeps the documented periods and five-step source language visible", () => {
    expect(machine.data.era.en).toContain("1041–48");
    expect(machine.data.era.en).toContain("1298");
    const source = machine.data.sources.find(
      (item) => item.id === "mengxi-bisheng",
    );
    expect(source?.quote).toContain("乃密布字印");
    expect(source?.quote).toContain("持就火煬之");
    expect(source?.quote).toContain("以一平板按其面");
    expect(source?.quote).toContain("一板印刷");
  });
});
