import { describe, expect, it } from "vitest";

import machine from "../../src/machines/astroclock/build";
import { KinematicGraph } from "../../src/sim/graph";

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

function trigger(id: string) {
  const found = machine.mechanism?.triggers.find(
    (candidate) => candidate.id === id,
  );
  expect(found, `missing trigger ${id}`).toBeDefined();
  return found!;
}

function runTrigger(id: string, param?: number) {
  const graph = new KinematicGraph(machine.spec);
  const events: Array<{ type: string; part: string }> = [];
  const eventStates: Array<{
    type: string;
    part: string;
    state: Record<string, number>;
  }> = [];
  trigger(id).run(
    graph,
    (type, part) => {
      events.push({ type, part });
      eventStates.push({ type, part, state: graph.state() });
    },
    param,
  );
  return { events, eventStates, graph };
}

describe("astroclock machine module", () => {
  it("constructs the complete sourced escapement exhibit", () => {
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    expect(machine.spec.parts).toHaveLength(80);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("scoop-")),
    ).toHaveLength(36);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("jack-")),
    ).toHaveLength(11);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("chime-tier-")),
    ).toHaveLength(5);
    expect(
      [1, 2, 3, 4, 5].map(
        (tier) =>
          machine.spec.parts.filter(
            (part) =>
              part.parent === `chime-tier-${tier}` &&
              part.id.startsWith("jack-"),
          ).length,
      ),
    ).toEqual([2, 2, 2, 3, 2]);
    expect(
      machine.spec.parts.find((part) => part.id === "tower-shell")?.geometry,
    ).toMatchObject({
      type: "custom",
      builder: "astroclockTowerCutaway",
    });
    expect(machine.customBuilders).toHaveProperty("astroclockTowerCutaway");
    expect(machine.customBuilders).toHaveProperty("astroclockArmillary");
    expect(
      ["water-reservoir", "constant-level-tank", "armillary-sphere"].every(
        (id) => machine.spec.parts.some((part) => part.id === id),
      ),
    ).toBe(true);

    const shulun = machine.spec.parts.find((part) => part.id === "shulun");
    expect(shulun?.geometry.type).toBe("wheel");
    if (shulun?.geometry.type === "wheel")
      expect(shulun.geometry.spokes).toBe(72);
    expect(machine.spec.escapement).toEqual({
      wheel: "shulun",
      scoops: 36,
      fillSecondsPerScoop: 24,
      stepRad: (Math.PI * 2) / 36,
      leverParts: {
        tianguan: "tianguan",
        gecha: "gecha",
        guanshe: "guanshe",
        tiansuoL: "tiansuo-l",
        tiansuoR: "tiansuo-r",
      },
    });
  });

  it("implements every declared transmission ratio", () => {
    const graph = new KinematicGraph(machine.spec);
    expect(machine.spec.expectedRatios).toHaveLength(3);
    for (const expected of machine.spec.expectedRatios ?? []) {
      expect(
        graph.ratioBetween(expected.from, expected.to),
        `${expected.from} → ${expected.to}`,
      ).toBeCloseTo(expected.ratio, 12);
    }
    expect(machine.spec.expectedRatios?.[0]).toMatchObject({
      from: "shulun",
      to: "hour-drum-wheel",
      ratio: 36 / 100,
      sourceRef: "xyxfy-shulun+xyxfy-baoshi",
    });
    expect(machine.spec.expectedRatios?.[2]).toMatchObject({
      from: "celestial-ladder-lower",
      to: "celestial-globe",
      ratio: 1,
      sourceRef: "xyxfy-baoshi",
    });
    expect(
      graph.ratioBetween("celestial-globe", "armillary-sphere"),
    ).toBeCloseTo(1, 12);

    for (const id of [
      "day-night-wheel",
      "celestial-ladder-lower",
      "celestial-globe",
    ]) {
      expect(
        machine.spec.parts.find((part) => part.id === id)?.provenance.ref,
      ).toBe("xyxfy-baoshi");
    }
  });

  it("covers every part and numeric geometry field with provenance", () => {
    for (const part of machine.spec.parts) {
      expect(part.provenance.kind, part.id).toMatch(/^(wenxian|wenwu|tuice)$/);
      expect(part.provenance.ref, part.id).not.toBe("");
      const paths = numericPaths(part.geometry);
      if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");
      for (const path of paths) {
        const explicit = part.dimensionProvenance[path];
        const fallback = part.dimensionProvenance["@rest"];
        expect(explicit ?? fallback, `${part.id}.${path}`).toBeDefined();
        if (!explicit)
          expect(fallback?.kind, `${part.id}.${path} @rest`).toBe("tuice");
      }
      if (part.dimensionProvenance["@rest"]) {
        expect(part.dimensionProvenance["@rest"].kind, `${part.id}.@rest`).toBe(
          "tuice",
        );
      }
    }
  });

  it("runs the spotlight through one beat and closes with a done state", () => {
    const { events, eventStates, graph } = runTrigger("spotlight");
    expect(events).toEqual([
      { type: "camera", part: "tower-shell" },
      { type: "highlight", part: "scoop-01" },
      { type: "caption:fill", part: "scoop-01" },
      { type: "caption:reservoir", part: "water-reservoir" },
      { type: "caption:constant-head", part: "constant-level-tank" },
      { type: "caption:return", part: "water-lift-wheel" },
      { type: "highlight", part: "gecha" },
      { type: "caption:yield", part: "gecha" },
      { type: "caption:open", part: "guanshe" },
      { type: "caption:advance", part: "shulun" },
      { type: "caption:relock", part: "tiansuo-r" },
      { type: "highlight", part: "celestial-globe" },
      { type: "spotlight:done", part: "shulun" },
    ]);
    const stateAt = (type: string) =>
      eventStates.find((event) => event.type === type)!.state;
    expect(stateAt("caption:fill")["scoop-01"]).toBeCloseTo(0.35, 12);
    expect(stateAt("caption:fill").shulun).toBeCloseTo(
      (Math.PI * 2) / 36 / 10,
      12,
    );
    expect(stateAt("caption:yield").gecha).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:yield").tianguan).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:open").guanshe).toBeCloseTo(0.35, 12);
    expect(stateAt("caption:open")["tiansuo-l"]).toBeCloseTo(0.35, 12);
    expect(stateAt("caption:open")["tiansuo-r"]).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:advance").shulun).toBeCloseTo(
      (Math.PI * 2) / 36,
      12,
    );
    expect(stateAt("caption:advance")["scoop-01"]).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:relock")).toMatchObject({
      "scoop-01": 0,
      gecha: 0,
      guanshe: 0,
      tianguan: 0,
      "tiansuo-l": -0.35,
      "tiansuo-r": 0.35,
    });
    expect(graph.state().shulun).toBeCloseTo((Math.PI * 2) / 36, 12);
    expect(events.at(-1)?.type).toBe("spotlight:done");
  });

  it("emits the required source-caption escapement sequence", () => {
    const { events, graph } = runTrigger("escapement-captions");
    expect(events).toEqual([
      { type: "caption:fill", part: "scoop-01" },
      { type: "caption:reservoir", part: "water-reservoir" },
      { type: "caption:constant-head", part: "constant-level-tank" },
      { type: "caption:return", part: "water-lift-wheel" },
      { type: "caption:yield", part: "gecha" },
      { type: "caption:open", part: "guanshe" },
      { type: "caption:advance", part: "shulun" },
      { type: "caption:relock", part: "tiansuo-r" },
    ]);
    expect(graph.state()["hour-drum-wheel"]).toBeCloseTo(
      (((Math.PI * 2) / 36) * 36) / 100,
      12,
    );
  });

  it("advances forward by one cell and blocks reverse drag at the right lock", () => {
    const forward = runTrigger("drag-shulun", 1);
    expect(forward.events).toEqual([{ type: "advance", part: "shulun" }]);
    expect(forward.graph.state().shulun).toBeCloseTo((Math.PI * 2) / 36, 12);

    const reverse = runTrigger("drag-shulun", -1);
    expect(reverse.events).toEqual([{ type: "blocked", part: "tiansuo-r" }]);
    expect(reverse.graph.state().shulun).toBe(0);
  });

  it("emits all five cam-driven placard events", () => {
    expect(runTrigger("chime-placards").events).toEqual([
      { type: "placard", part: "tier-placard-1" },
      { type: "placard", part: "tier-placard-2" },
      { type: "placard", part: "tier-placard-3" },
      { type: "placard", part: "tier-placard-4" },
      { type: "placard", part: "tier-placard-5" },
    ]);
    const graph = new KinematicGraph(machine.spec);
    const events: Array<{ type: string; part: string }> = [];
    const chime = trigger("chime-placards");
    chime.run(graph, (type, part) => events.push({ type, part }));
    chime.run(graph, (type, part) => events.push({ type, part }));
    expect(events).toHaveLength(5);
    expect(machine.mechanism?.triggers.map((item) => item.id)).toEqual([
      "spotlight",
      "escapement-captions",
      "drag-shulun",
      "chime-placards",
    ]);
  });

  it("constructs and drives both scholarly schemes independently", () => {
    expect(machine.defaultSchemeId).toBe("fixed-scoop");
    expect(Object.keys(machine.schemes ?? {})).toEqual([
      "fixed-scoop",
      "combridge-hinged",
    ]);

    for (const [id, scheme] of Object.entries(machine.schemes ?? {})) {
      const graph = new KinematicGraph(machine.spec);
      expect(() => graph.setScheme(scheme), id).not.toThrow();
      expect(graph.ratioBetween("shulun", "hour-drum-wheel"), id).toBeCloseTo(
        0.36,
        12,
      );
      expect(() => graph.drive("shulun", (Math.PI * 2) / 36), id).not.toThrow();
    }

    const fixed = machine.schemes?.["fixed-scoop"];
    const hinged = machine.schemes?.["combridge-hinged"];
    expect(fixed?.overrideParts).toHaveLength(36);
    expect(fixed?.overrideParts?.[0].joint?.kind).toBe("fixed");
    expect(hinged?.overrideParts).toHaveLength(36);
    expect(hinged?.overrideParts?.[0].joint?.kind).toBe("revolute");
    expect(hinged?.addConstraints).toHaveLength(1);

    const fixedGraph = new KinematicGraph(machine.spec);
    fixedGraph.setScheme(fixed);
    fixedGraph.drive("shulun", Math.PI);
    expect(fixedGraph.state()["scoop-01"]).toBe(0);

    const hingedGraph = new KinematicGraph(machine.spec);
    hingedGraph.setScheme(hinged);
    hingedGraph.drive("shulun", Math.PI);
    expect(hingedGraph.state()["scoop-01"]).toBeCloseTo(0.35, 12);
  });
});
