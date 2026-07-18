import { describe, expect, it } from "vitest";
import { Matrix4, Quaternion, Vector3 } from "three";

import machine from "../../src/machines/gimbal/build";
import {
  attitudeQuaternion,
  KinematicGraph,
} from "../../src/sim/graph";
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

function normalize(
  quaternion: [number, number, number, number],
): [number, number, number, number] {
  const length = Math.hypot(...quaternion);
  return quaternion.map((value) => value / length) as [
    number,
    number,
    number,
    number,
  ];
}

describe("gimbal incense burner", () => {
  it("builds the complete B-tier cutaway assembly", () => {
    expect(machine.spec.parts.length).toBeGreaterThanOrEqual(8);
    expect(machine.spec.parts.length).toBeLessThanOrEqual(20);
    expect(machine.spec.driveNodes).toEqual(["outer-shell"]);
    expect(machine.spec.primaryDrive).toBe("outer-shell");
    expect(machine.spec.expectedRatios).toEqual([]);
    expect(machine.spec.constraints).toEqual([
      {
        type: "gimbal",
        outer: "outer-shell",
        middle: "outer-ring",
        inner: "inner-ring",
      },
    ]);
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
  });

  it("preserves measured artifact dimensions and the mandatory cutaway", () => {
    const shell = machine.spec.parts.find((part) => part.id === "outer-shell");
    const bowl = machine.spec.parts.find((part) => part.id === "incense-bowl");
    const chain = machine.spec.parts.find(
      (part) => part.id === "suspension-chain",
    );

    expect(shell?.geometry).toEqual({
      type: "custom",
      builder: "gimbalCutawayShell",
      params: { radius: 0.0225 },
    });
    expect(shell?.name.en).toBe("Openwork outer shell");
    expect(shell?.interactive).toBe(true);
    expect(machine.customBuilders).toHaveProperty("gimbalCutawayShell");
    expect(bowl?.geometry.type).toBe("custom");
    if (bowl?.geometry.type === "custom") {
      expect(bowl.geometry.params.radius * 2).toBeCloseTo(0.028, 12);
    }
    expect(chain?.geometry.type).toBe("link");
    if (chain?.geometry.type === "link") {
      expect(chain.geometry.length).toBeCloseTo(0.075, 12);
    }
    expect(machine.customBuilders).toHaveProperty("gimbalInnerRing");
    expect(machine.customBuilders).toHaveProperty("gimbalBowl");
    expect(machine.customBuilders).toHaveProperty("gimbalFlame");
  });

  it("sources every part and numeric geometry field", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));
    for (const part of machine.spec.parts) {
      expectPartCoverage(part);
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref), part.id).toBe(true);
      }
    }
  });

  it("keeps the bowl world-up within half a degree across attitudes", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.setInput("incense-bowl", 0.23);
    expect(
      machine.spec.parts.find((part) => part.id === "outer-ring")?.parent,
    ).toBe("outer-shell");
    expect(
      machine.spec.parts.find((part) => part.id === "inner-ring")?.parent,
    ).toBe("outer-ring");
    expect(
      machine.spec.parts.find((part) => part.id === "incense-bowl")?.parent,
    ).toBe("inner-ring");

    for (let index = 0; index < 50; index += 1) {
      const angle = -1.2 + (2.4 * index) / 49;
      const axisLength = Math.hypot(
        Math.sin(index * 1.7) + 0.2,
        Math.cos(index * 0.9) + 0.3,
        Math.sin(index * 0.37 + 0.4) + 0.1,
      );
      const axis: [number, number, number] = [
        (Math.sin(index * 1.7) + 0.2) / axisLength,
        (Math.cos(index * 0.9) + 0.3) / axisLength,
        (Math.sin(index * 0.37 + 0.4) + 0.1) / axisLength,
      ];
      const half = angle / 2;
      const quaternion = normalize([
        axis[0] * Math.sin(half),
        axis[1] * Math.sin(half),
        axis[2] * Math.sin(half),
        Math.cos(half),
      ]);
      graph.setAttitude("outer-shell", quaternion);
      const state = graph.state();
      const renderedShell = attitudeQuaternion(state, "outer-shell");
      expect(renderedShell).not.toBeNull();
      const world = new Matrix4()
        .makeRotationFromQuaternion(new Quaternion(...renderedShell!))
        .multiply(new Matrix4().makeRotationZ(state["outer-ring"]))
        .multiply(new Matrix4().makeRotationX(state["inner-ring"]));
      const worldUp = new Vector3(0, 1, 0).transformDirection(world);
      const deviation =
        Math.acos(Math.max(-1, Math.min(1, worldUp.y))) * (180 / Math.PI);
      expect(deviation).toBeLessThan(0.5);
      expect(state["incense-bowl"]).toBeCloseTo(0.23, 12);
    }
  });

  it("runs the passive-stabilization spotlight in the exact order", () => {
    const graph = new KinematicGraph(machine.spec);
    const events: Array<[string, string]> = [];
    machine.mechanism?.triggers[0].run(graph, (type, part) =>
      events.push([type, part]),
    );

    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "drive:outer-shell",
    ]);
    expect(events).toEqual([
      ["camera:focus", "outer-shell"],
      ["highlight:on", "outer-shell"],
      ["highlight:on", "outer-ring"],
      ["highlight:on", "inner-ring"],
      ["drive:attitude", "outer-shell"],
      ["stabilize", "incense-bowl"],
      ["highlight:on", "incense-bowl"],
      ["drive:attitude", "outer-shell"],
      ["deviation", "<0.5-deg"],
      ["source", "xijingzaji-dinghuan"],
      ["highlight:off", "outer-ring"],
      ["highlight:off", "inner-ring"],
      ["highlight:off", "outer-shell"],
      ["spotlight:done", "gimbal"],
    ]);
    expect(graph.state()["incense-bowl"]).toBe(0);
  });

  it("drives the shell attitude while the nested bowl stays level", () => {
    const graph = new KinematicGraph(machine.spec);
    const events: Array<[string, string]> = [];
    machine.mechanism?.triggers[1].run(
      graph,
      (type, part) => events.push([type, part]),
      Math.PI / 3,
    );
    expect(events).toEqual([
      ["drive:attitude", "outer-shell"],
      ["stabilize", "incense-bowl"],
    ]);
    expect(attitudeQuaternion(graph.state(), "outer-shell")).not.toBeNull();
    expect(graph.state()["incense-bowl"]).toBe(0);
  });

  it("builds each custom geometry as a disposable buffer geometry", () => {
    for (const partId of [
      "outer-shell",
      "inner-ring",
      "incense-bowl",
      "flame",
    ]) {
      const part = machine.spec.parts.find(
        (candidate) => candidate.id === partId,
      );
      expect(part?.geometry.type).toBe("custom");
      if (part?.geometry.type !== "custom") continue;
      const geometry = machine.customBuilders?.[part.geometry.builder](
        part.geometry.params,
      ) as { isBufferGeometry?: boolean; dispose?: () => void };
      expect(geometry.isBufferGeometry, partId).toBe(true);
      geometry.dispose?.();
    }
  });
});
