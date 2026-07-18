import { describe, expect, it } from "vitest";

import machine from "../../src/machines/seismoscope/build";
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

describe("seismoscope machine module", () => {
  it("covers every part and numeric geometry field with provenance", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));

    for (const part of allDeclaredParts()) {
      expect(["wenxian", "wenwu", "tuice"]).toContain(part.provenance.kind);
      expect(part.provenance.ref.trim()).not.toBe("");
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref)).toBe(true);
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
    }
  });

  it("constructs the base graph and both scholar schemes", () => {
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    expect(
      machine.spec.parts
        .filter((part) => part.interactive)
        .map((part) => part.id),
    ).toEqual(["vessel"]);

    const graph = new KinematicGraph(machine.spec);
    for (const id of ["wangzhenduo", "fengrui"]) {
      expect(() => graph.setScheme(scheme(id))).not.toThrow();
      expect(graph.state()).toHaveProperty("duzhu");
    }

    expect(machine.defaultSchemeId).toBe("wangzhenduo");
    expect(Object.keys(machine.schemes ?? {})).toEqual([
      "wangzhenduo",
      "fengrui",
    ]);
  });

  it("models the two internal schemes with one stable duzhu id", () => {
    const wang = scheme("wangzhenduo");
    const feng = scheme("fengrui");
    const wangDuzhu = wang.addParts?.find((part) => part.id === "duzhu");
    const fengDuzhu = feng.addParts?.find((part) => part.id === "duzhu");

    expect(wangDuzhu?.joint).toMatchObject({
      kind: "revolute",
      limits: [-0.12, 0.12],
    });
    expect(fengDuzhu?.joint).toMatchObject({
      kind: "revolute",
      limits: [-0.2, 0.2],
    });
    expect(
      wang.addParts?.filter((part) => part.id.startsWith("wang-chute-")),
    ).toHaveLength(8);
    expect(
      feng.addParts?.filter((part) => part.id.startsWith("feng-track-")),
    ).toHaveLength(8);
  });

  it("declares no expected ratios because this is a discrete trigger", () => {
    expect(machine.spec.expectedRatios).toEqual([]);
    const graph = new KinematicGraph(machine.spec);
    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(ratio.from, ratio.to)).toBeCloseTo(
        ratio.ratio,
        12,
      );
    }
  });

  it("runs the complete spotlight choreography and closes its done state", () => {
    const graph = new KinematicGraph(machine.spec);
    const events: Array<{ type: string; part: string }> = [];
    const spotlight = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "spotlight",
    );

    expect(spotlight).toBeDefined();
    spotlight?.run(graph, (type, part) => events.push({ type, part }));

    expect(events).toEqual(
      expect.arrayContaining([
        { type: "camera", part: "vessel" },
        { type: "highlight", part: "duzhu" },
        { type: "drive", part: "vessel" },
        { type: "releaseBall", part: "dragon-6" },
        { type: "source", part: "houfeng-196" },
      ]),
    );
    expect(events.at(-1)).toEqual({
      type: "spotlight:done",
      part: "seismoscope",
    });
    expect(graph.state()["ball-6"]).toBe(0.65);
  });

  it("keeps the Wang spotlight inert and never bypasses the latch", () => {
    const spotlight = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "spotlight",
    )!;
    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(scheme("wangzhenduo"));
    const events: Array<{ type: string; part: string }> = [];

    spotlight.run(graph, (type, part) => events.push({ type, part }));
    spotlight.run(graph, (type, part) => events.push({ type, part }));

    expect(events.filter((event) => event.type === "inert")).toHaveLength(2);
    expect(
      Object.entries(graph.state()).filter(
        ([id, value]) => id.startsWith("ball-") && value > 0,
      ),
    ).toEqual([]);
  });

  it("releases only bearing 3 and leaves the other seven dragons motionless", () => {
    const graph = new KinematicGraph(machine.spec);
    const before = graph.state();
    const events: Array<{ type: string; part: string }> = [];
    const quake = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "quake",
    );

    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "quake",
    ]);
    expect(quake).toBeDefined();
    quake?.run(graph, (type, part) => events.push({ type, part }), 3);

    expect(events).toEqual([
      { type: "pulse", part: "vessel" },
      { type: "releaseBall", part: "dragon-3" },
    ]);

    const after = graph.state();
    for (const bearing of [0, 1, 2, 4, 5, 6, 7]) {
      expect(after[`ball-${bearing}`]).toBe(before[`ball-${bearing}`]);
    }
    expect(after["ball-3"]).toBe(0.65);

    const locked: Array<{ type: string; part: string }> = [];
    quake?.run(graph, (type, part) => locked.push({ type, part }), 5);
    expect(locked).toEqual([
      { type: "pulse", part: "vessel" },
      { type: "locked", part: "dragon-5" },
    ]);
    expect(graph.state()["ball-5"]).toBe(0);
  });

  it("distinguishes the inert standing-column scheme from the suspended pendulum", () => {
    const quake = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "quake",
    )!;
    const wang = new KinematicGraph(machine.spec);
    wang.setScheme(scheme("wangzhenduo"));
    const wangEvents: Array<{ type: string; part: string }> = [];
    quake.run(wang, (type, part) => wangEvents.push({ type, part }), 6);
    expect(wangEvents).toEqual([
      { type: "pulse", part: "vessel" },
      { type: "inert", part: "duzhu" },
    ]);
    expect(wang.state()["ball-6"]).toBe(0);

    const feng = new KinematicGraph(machine.spec);
    feng.setScheme(scheme("fengrui"));
    const fengEvents: Array<{ type: string; part: string }> = [];
    quake.run(feng, (type, part) => fengEvents.push({ type, part }), 6);
    expect(fengEvents).toEqual([
      { type: "pulse", part: "vessel" },
      { type: "releaseBall", part: "dragon-6" },
    ]);
    expect(feng.state()["ball-6"]).toBe(0.65);
    expect(feng.state().duzhu).toBe(0.14);
  });
});
