import { describe, expect, it } from "vitest";

import machine from "../../src/machines/loom/build";
import { KinematicGraph } from "../../src/sim/graph";
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

function activeParts(patch: SchemePatch): PartDef[] {
  const removed = new Set(patch.removePartIds ?? []);
  const overrides = new Map(
    (patch.overrideParts ?? []).map((part) => [part.id, part]),
  );
  const parts = machine.spec.parts
    .filter((part) => !removed.has(part.id))
    .map((part) => ({ ...part, ...(overrides.get(part.id) ?? {}) }) as PartDef);
  for (const part of patch.addParts ?? []) {
    const index = parts.findIndex((candidate) => candidate.id === part.id);
    if (index >= 0) parts[index] = part;
    else parts.push(part);
  }
  return parts;
}

function provenanceFor(part: PartDef, path: string): Provenance | undefined {
  return part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"];
}

function referencesResolve(reference: string, sources: Set<string>): boolean {
  return reference.split("+").every((item) => sources.has(item.trim()));
}

describe("loom machine module", () => {
  it("constructs the base graph and both scholar schemes", () => {
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    const graph = new KinematicGraph(machine.spec);

    for (const id of ["sliding-frame", "linkage"]) {
      expect(() => graph.setScheme(scheme(id))).not.toThrow();
      expect(graph.state()).toHaveProperty("heddle-7");
    }

    expect(machine.defaultSchemeId).toBe("sliding-frame");
    expect(Object.keys(machine.schemes ?? {})).toEqual([
      "sliding-frame",
      "linkage",
    ]);
  });

  it("covers every active part and numeric geometry field with provenance", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));

    for (const id of ["sliding-frame", "linkage"]) {
      for (const part of activeParts(scheme(id))) {
        expect(["wenxian", "wenwu", "tuice"]).toContain(part.provenance.kind);
        expect(part.provenance.ref.trim()).not.toBe("");
        if (part.provenance.kind !== "tuice") {
          expect(
            referencesResolve(part.provenance.ref, sourceIds),
            part.id,
          ).toBe(true);
        }
        expect(part.assemblyStep, `${id}:${part.id}.assemblyStep`).toBeTypeOf(
          "number",
        );
        expect(
          part.explodeVector,
          `${id}:${part.id}.explodeVector`,
        ).toHaveLength(3);

        const paths = numericPaths(part.geometry);
        if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");
        for (const path of paths) {
          const provenance = provenanceFor(part, path);
          expect(provenance, `${id}:${part.id}.${path}`).toBeDefined();
          expect(provenance?.ref.trim(), `${id}:${part.id}.${path}`).not.toBe(
            "",
          );
          if (part.dimensionProvenance[path] === undefined) {
            expect(provenance?.kind, `${id}:${part.id}.${path} @rest`).toBe(
              "tuice",
            );
          }
        }
      }
    }
  });

  it("preserves the measured envelopes and declared representative counts", () => {
    const slidingFrame = machine.spec.parts.find(
      (part) => part.id === "loom-frame",
    );
    const linkageFrame = activeParts(scheme("linkage")).find(
      (part) => part.id === "loom-frame",
    );
    const treadles = machine.spec.parts.find(
      (part) => part.id === "treadle-bank",
    );
    const threads = machine.spec.parts.filter((part) =>
      part.id.startsWith("warp-shed"),
    );

    expect(slidingFrame?.geometry).toMatchObject({
      type: "custom",
      params: { length: 0.85, width: 0.26, height: 0.5 },
    });
    expect(linkageFrame?.geometry).toMatchObject({
      type: "custom",
      params: { length: 0.63, width: 0.19, height: 0.37 },
    });
    expect(treadles?.geometry).toMatchObject({
      type: "custom",
      params: { count: 12 },
    });
    expect(threads).toHaveLength(2);
    expect(
      threads.reduce(
        (sum, part) =>
          sum +
          (part.geometry.type === "custom" ? part.geometry.params.count : 0),
        0,
      ),
    ).toBe(48);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("heddle-")),
    ).toHaveLength(8);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("selector-cam-")),
    ).toHaveLength(8);
    expect(machine.spec.collisionWhitelist).toEqual([
      ["warp-shed", "woven-cloth"],
      ["warp-shed-odd", "heddle-2"],
      ["warp-shed-odd", "heddle-3"],
      ["warp-shed-odd", "heddle-4"],
      ["warp-shed-odd", "heddle-7"],
    ]);
    expect(scheme("linkage").collisionWhitelist).toEqual([
      ["warp-shed", "woven-cloth"],
      ["warp-shed-odd", "heddle-1"],
      ["warp-shed-odd", "heddle-2"],
      ["warp-shed-odd", "heddle-3"],
      ["warp-shed-odd", "heddle-4"],
      ["warp-shed-odd", "heddle-6"],
    ]);
    for (const id of [
      "treadle-bank",
      "warp-shed",
      "warp-shed-odd",
      "beater",
      "shuttle",
      "single-hook",
      "weft-counter",
    ]) {
      expect(
        machine.spec.parts.find((part) => part.id === id)?.joint,
        id,
      ).toBeDefined();
    }
  });

  it("keeps expected ratios empty for the reciprocating machine", () => {
    expect(machine.spec.expectedRatios).toEqual([]);
    const graph = new KinematicGraph(machine.spec);
    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(ratio.from, ratio.to)).toBeCloseTo(
        ratio.ratio,
        12,
      );
    }
  });

  it("gives the two selectors different stored programs", () => {
    const sliding = new KinematicGraph(machine.spec);
    sliding.setScheme(scheme("sliding-frame"));
    const linked = new KinematicGraph(machine.spec);
    linked.setScheme(scheme("linkage"));

    expect(sliding.ratioBetween("treadle-bank", "selector-cam-0")).toBe(1);
    expect(linked.ratioBetween("treadle-bank", "selector-cam-0")).toBe(8);
    expect(
      activeParts(scheme("sliding-frame")).some(
        (part) => part.id === "selector-carriage",
      ),
    ).toBe(true);
    expect(
      activeParts(scheme("linkage")).some(
        (part) => part.id === "selector-carriage",
      ),
    ).toBe(false);
    expect(
      activeParts(scheme("linkage")).filter((part) =>
        part.id.startsWith("linkage-"),
      ),
    ).toHaveLength(3);

    for (const phase of [Math.PI / 32, Math.PI / 16, (3 * Math.PI) / 32]) {
      sliding.setInput("treadle-bank", phase);
      linked.setInput("treadle-bank", phase);
      const slidingPattern = Array.from(
        { length: 8 },
        (_, index) => sliding.state()[`heddle-${index}`],
      );
      const linkagePattern = Array.from(
        { length: 8 },
        (_, index) => linked.state()[`heddle-${index}`],
      );
      expect(slidingPattern, `phase ${phase}`).not.toEqual(linkagePattern);
    }
  });

  it("cycles all eight heddles without exceeding the 0.05 m lift", () => {
    for (const id of ["sliding-frame", "linkage"]) {
      const graph = new KinematicGraph(machine.spec);
      graph.setScheme(scheme(id));
      const maxima = Array.from({ length: 8 }, () => 0);

      for (let sample = 0; sample <= 256; sample += 1) {
        graph.setInput("treadle-bank", (Math.PI * 2 * sample) / 256);
        for (let index = 0; index < 8; index += 1) {
          const lift = graph.state()[`heddle-${index}`];
          expect(lift, `${id}:heddle-${index}`).toBeGreaterThanOrEqual(0);
          expect(lift, `${id}:heddle-${index}`).toBeLessThanOrEqual(
            0.05 + 1e-12,
          );
          maxima[index] = Math.max(maxima[index], lift);
        }
      }
      for (const maximum of maxima) expect(maximum).toBeGreaterThan(0.049);
    }
  });

  it("runs every trigger, inserts weft, and advances the counter", () => {
    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "reorder-heddles",
      "weft-insertion",
    ]);

    for (const trigger of machine.mechanism?.triggers ?? []) {
      const graph = new KinematicGraph(machine.spec);
      graph.setScheme(scheme("sliding-frame"));
      const events: Array<{ type: string; part: string }> = [];
      trigger.run(graph, (type, part) => events.push({ type, part }), 2);
      expect(events.length).toBeGreaterThan(0);
      if (trigger.id === "spotlight") {
        expect(events).toEqual(
          expect.arrayContaining([
            { type: "program:active", part: "program-a" },
            { type: "program:reorder", part: "program-b" },
            {
              type: "pattern:contrast",
              part: "program-a/program-b",
            },
          ]),
        );
        expect(events.at(-1)).toEqual({ type: "spotlight:done", part: "loom" });
      }
      if (trigger.id === "reorder-heddles") {
        expect(events.slice(0, 3)).toEqual([
          { type: "program:reorder", part: "program-b" },
          { type: "program:order", part: "8-6-4-2-7-5-3-1" },
          { type: "program:scheme", part: "sliding-frame" },
        ]);
        expect(graph.state()).toHaveProperty("selector-carriage");
        expect(graph.state()).not.toHaveProperty("linkage-crank");
        expect(graph.ratioBetween("treadle-bank", "selector-cam-0")).toBe(8);
      }
      expect(events).toEqual(
        expect.arrayContaining([
          { type: "treadle:press", part: "treadle-bank" },
          { type: "shed:open", part: "warp-shed" },
          { type: "weft:insert", part: "shuttle" },
          { type: "beat-up", part: "beater" },
          { type: "weft:count", part: "weft-counter" },
        ]),
      );
      expect(graph.state()["weft-counter"]).toBe(
        trigger.id === "spotlight"
          ? 4
          : trigger.id === "weft-insertion"
            ? 2
            : 1,
      );
      expect(Math.abs(graph.state().shuttle)).toBe(0.12);
    }
  });

  it("reorders the program without changing the linkage reconstruction", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(scheme("linkage"));
    const reorder = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "reorder-heddles",
    );
    const events: Array<{ type: string; part: string }> = [];

    reorder?.run(graph, (type, part) => events.push({ type, part }));

    expect(events.slice(0, 3)).toEqual([
      { type: "program:reorder", part: "program-a" },
      { type: "program:order", part: "1-3-5-7-2-4-6-8" },
      { type: "program:scheme", part: "linkage" },
    ]);
    expect(graph.state()).toHaveProperty("linkage-crank");
    expect(graph.state()).not.toHaveProperty("selector-carriage");
    expect(graph.ratioBetween("treadle-bank", "selector-cam-0")).toBe(1);
  });
});
