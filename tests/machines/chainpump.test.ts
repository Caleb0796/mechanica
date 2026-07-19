import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";

import {
  buildPartGeometry,
  getMechanicaInstanceMatrices,
  singlePartGeometry,
} from "../../src/core/primitives";
import machine, {
  PALLET_COUNT,
  PATH_RADIUS,
  PATH_STRAIGHT_LENGTH,
  palletPathPose,
  palletLoopAnimationMetadata,
} from "../../src/machines/chainpump/build";
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

function dimensionProvenance(
  part: PartDef,
  path: string,
): Provenance | undefined {
  return part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"];
}

function trigger(id: string) {
  const found = machine.mechanism?.triggers.find(
    (candidate) => candidate.id === id,
  );
  expect(found, `missing trigger ${id}`).toBeDefined();
  return found!;
}

describe("chain pump machine module", () => {
  it("constructs the sourced 15-part chain-pump exhibit without schemes", () => {
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    expect(machine.spec.parts).toHaveLength(15);
    expect(machine.spec.parts.length).toBeGreaterThanOrEqual(8);
    expect(machine.spec.parts.length).toBeLessThanOrEqual(20);
    expect(machine.schemes).toBeUndefined();
    expect(machine.defaultSchemeId).toBeUndefined();
    expect(machine.spec.driveNodes).toEqual([
      "crank-spurs",
      "head-sprocket",
      "foot-sprocket",
    ]);
    expect(machine.spec.primaryDrive).toBe("crank-spurs");
    expect(machine.spec.cycleRad).toBeCloseTo(Math.PI * 2, 12);
  });

  it("preserves the trough envelope and four crank spurs at each axle end", () => {
    const trough = machine.spec.parts.find((part) => part.id === "trough");
    const crank = machine.spec.parts.find((part) => part.id === "crank-spurs");
    expect(trough?.geometry).toMatchObject({
      type: "custom",
      builder: "chainpumpTrough",
      params: { length: 6.3, width: 0.18, height: 0.315 },
    });
    expect(
      trough?.geometry.type === "custom"
        ? trough.geometry.params.width
        : undefined,
    ).toBeGreaterThanOrEqual(0.126);
    expect(
      trough?.geometry.type === "custom"
        ? trough.geometry.params.width
        : undefined,
    ).toBeLessThanOrEqual(0.22);
    expect(crank?.geometry).toMatchObject({
      type: "custom",
      builder: "chainpumpCrankSpurs",
      params: { countPerEnd: 4 },
    });
    expect(crank?.interactive).toBe(true);

    const source = machine.data.sources.find(
      (item) => item.id === "nongshu-fanche",
    );
    expect(source?.quote).toContain("兩端各帶拐木四莖");
    expect(source?.quote).toContain("龍骨板隨轉");
    expect(source?.quote).toContain("循環行道板刮水上岸");
  });

  it("builds at least 24 pallets around two straights and two arcs", () => {
    const chain = machine.spec.parts.find((part) => part.id === "pallet-chain");
    expect(PALLET_COUNT).toBeGreaterThanOrEqual(24);
    expect(chain?.geometry).toMatchObject({
      type: "custom",
      builder: "chainpumpPalletLoop",
      params: {
        palletCount: PALLET_COUNT,
        straightLength: PATH_STRAIGHT_LENGTH,
        radius: PATH_RADIUS,
      },
    });
    expect(machine.customBuilders).toHaveProperty("chainpumpPalletLoop");

    if (!chain) throw new Error("Missing pallet chain");
    const geometry = singlePartGeometry(
      buildPartGeometry(chain.geometry, machine.customBuilders),
    );
    expect(geometry.getAttribute("position").count).toBeLessThan(100);
    expect(getMechanicaInstanceMatrices(geometry)).toHaveLength(PALLET_COUNT);
    geometry.dispose();

    const perimeter = PATH_STRAIGHT_LENGTH * 2 + Math.PI * PATH_RADIUS * 2;
    const upper = palletPathPose(0);
    const head = palletPathPose(
      (PATH_STRAIGHT_LENGTH + (Math.PI * PATH_RADIUS) / 2) / perimeter,
    );
    const lower = palletPathPose(
      (PATH_STRAIGHT_LENGTH * 1.5 + Math.PI * PATH_RADIUS) / perimeter,
    );
    const foot = palletPathPose(
      (PATH_STRAIGHT_LENGTH * 2 + Math.PI * PATH_RADIUS * 1.5) / perimeter,
    );

    expect(upper).toMatchObject({
      position: [-PATH_STRAIGHT_LENGTH / 2, PATH_RADIUS, 0],
      tangent: [1, 0, 0],
      segment: "upper-straight",
    });
    expect(head.position[0]).toBeCloseTo(
      PATH_STRAIGHT_LENGTH / 2 + PATH_RADIUS,
      12,
    );
    expect(head.position[1]).toBeCloseTo(0, 12);
    expect(head.segment).toBe("head-arc");
    expect(lower.position[0]).toBeCloseTo(0, 12);
    expect(lower.position[1]).toBeCloseTo(-PATH_RADIUS, 12);
    expect(lower.segment).toBe("lower-straight");
    expect(foot.position[0]).toBeCloseTo(
      -PATH_STRAIGHT_LENGTH / 2 - PATH_RADIUS,
      12,
    );
    expect(foot.position[1]).toBeCloseTo(0, 12);
    expect(foot.segment).toBe("foot-arc");
    expect(palletPathPose(1).position).toEqual(palletPathPose(0).position);
    expect(palletPathPose(-0.25).position).toEqual(
      palletPathPose(0.75).position,
    );
    for (const pose of [upper, head, lower, foot]) {
      expect(Math.hypot(...pose.tangent)).toBeCloseTo(1, 12);
    }
  });

  it("derives the direct transmissions from the upper axle and equal sprockets", () => {
    const graph = new KinematicGraph(machine.spec);
    expect(machine.spec.expectedRatios).toEqual([
      {
        from: "crank-spurs",
        to: "head-sprocket",
        ratio: 1,
        sourceRef: "nongshu-fanche",
      },
      {
        from: "head-sprocket",
        to: "foot-sprocket",
        ratio: 1,
        sourceRef: "nongshu-fanche",
      },
    ]);
    for (const expected of machine.spec.expectedRatios ?? []) {
      expect(
        graph.ratioBetween(expected.from, expected.to),
        `${expected.from} → ${expected.to}`,
      ).toBeCloseTo(expected.ratio, 12);
    }

    const crankLock = machine.spec.constraints.find(
      (constraint) =>
        constraint.type === "lockstep" &&
        constraint.a === "crank-spurs" &&
        constraint.b === "head-sprocket",
    );
    const chainBelt = machine.spec.constraints.find(
      (constraint) => constraint.type === "belt",
    );
    expect(crankLock).toMatchObject({ ratio: 1 });
    expect(chainBelt).toEqual({
      type: "belt",
      a: "head-sprocket",
      b: "foot-sprocket",
      crossed: false,
    });

    const sprockets = ["head-sprocket", "foot-sprocket"].map((id) =>
      machine.spec.parts.find((part) => part.id === id),
    );
    for (const sprocket of sprockets) {
      expect(sprocket?.geometry).toMatchObject({
        type: "gear",
        module: 0.015,
        teeth: 24,
      });
      expect(sprocket?.dimensionProvenance["@rest"]).toMatchObject({
        kind: "tuice",
        ref: "nongshu-fanche",
      });
    }
  });

  it("advances both sprockets and the displayed pallet phase from the crank", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.drive("crank-spurs", Math.PI / 2);
    expect(graph.state()["crank-spurs"]).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state()["head-sprocket"]).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state()["foot-sprocket"]).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state()["pallet-chain"]).toBeCloseTo(Math.PI / 2, 12);
  });

  it("moves every sampled pallet along the closed path without rotating the loop", () => {
    const chain = machine.spec.parts.find((part) => part.id === "pallet-chain");
    if (!chain) throw new Error("Missing pallet chain");
    expect(chain.joint?.kind).toBe("fixed");

    const geometry = singlePartGeometry(
      buildPartGeometry(chain.geometry, machine.customBuilders),
    );
    const metadata = palletLoopAnimationMetadata(geometry);
    expect(metadata).toMatchObject({
      kind: "chainpump-path-phase",
      stateUnit: "rad",
      palletCount: PALLET_COUNT,
      straightLength: PATH_STRAIGHT_LENGTH,
      radius: PATH_RADIUS,
    });
    const perimeter = PATH_STRAIGHT_LENGTH * 2 + Math.PI * PATH_RADIUS * 2;
    expect(metadata.phasePerStateUnit).toBeCloseTo(PATH_RADIUS / perimeter, 12);
    expect(geometry.userData.mechanicaUpdate).toBeTypeOf("function");

    const advanceRad = perimeter / (PATH_RADIUS * PALLET_COUNT);
    (geometry.userData.mechanicaUpdate as (stateRad: number) => void)(
      advanceRad,
    );
    expect(metadata.currentStateRad).toBe(advanceRad);
    expect(advanceRad * PATH_RADIUS).toBeCloseTo(perimeter / PALLET_COUNT, 12);
    expect(Math.PI * 2 * metadata.phasePerStateUnit * perimeter).toBeCloseTo(
      Math.PI * 2 * PATH_RADIUS,
      12,
    );

    const matrices = getMechanicaInstanceMatrices(geometry)!;
    for (const pallet of [0, 7, 15, 23, 31]) {
      const center = new Vector3().setFromMatrixPosition(
        new Matrix4().fromArray(matrices[pallet]),
      );
      const expected = palletPathPose((pallet + 1) / PALLET_COUNT);
      expect(center.x, `pallet ${pallet} x`).toBeCloseTo(
        expected.position[0],
        5,
      );
      expect(center.y, `pallet ${pallet} y`).toBeCloseTo(
        expected.position[1],
        5,
      );
      expect(center.z, `pallet ${pallet} z`).toBeCloseTo(
        expected.position[2],
        5,
      );
    }
    geometry.dispose();
  });

  it("covers every numeric geometry, placement, rotation, and joint field", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));
    for (const part of machine.spec.parts) {
      expect(["wenxian", "wenwu", "tuice"]).toContain(part.provenance.kind);
      expect(part.provenance.ref.trim(), part.id).not.toBe("");
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref), part.id).toBe(true);
      }
      expect(Number.isInteger(part.assemblyStep), part.id).toBe(true);
      expect(part.explodeVector, part.id).toHaveLength(3);

      const paths = [
        ...numericPaths(part.geometry),
        ...numericPaths(part.position, "position"),
        ...numericPaths(part.rotationEuler, "rotationEuler"),
        ...numericPaths(part.joint, "joint"),
      ];
      for (const path of paths) {
        const provenance = dimensionProvenance(part, path);
        expect(provenance, `${part.id}.${path}`).toBeDefined();
        expect(provenance?.ref.trim(), `${part.id}.${path}`).not.toBe("");
        if (part.dimensionProvenance[path] === undefined) {
          expect(provenance?.kind, `${part.id}.${path} @rest`).toBe("tuice");
          expect(
            provenance?.note?.trim(),
            `${part.id}.${path} @rest note`,
          ).not.toBe("");
        }
      }
      const rest = part.dimensionProvenance["@rest"];
      if (rest) {
        expect(rest.kind, `${part.id}.@rest`).toBe("tuice");
        expect(rest.note?.trim(), `${part.id}.@rest note`).not.toBe("");
      }
    }
  });

  it("runs the short spotlight with exact camera, drive, and highlight events", () => {
    const graph = new KinematicGraph(machine.spec);
    const events: Array<{ type: string; part: string }> = [];
    trigger("spotlight").run(graph, (type, part) =>
      events.push({ type, part }),
    );
    expect(events).toEqual([
      { type: "camera", part: "trough" },
      { type: "highlight", part: "crank-spurs" },
      { type: "drive", part: "crank-spurs" },
      { type: "highlight", part: "head-sprocket" },
      { type: "highlight", part: "pallet-chain" },
      { type: "highlight", part: "water-sheet" },
      { type: "spotlight:done", part: "pallet-chain" },
    ]);
    expect(events).toHaveLength(7);
    expect(graph.state()["head-sprocket"]).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state()["foot-sprocket"]).toBeCloseTo(Math.PI / 2, 12);
    expect(graph.state()["pallet-chain"]).toBeCloseTo(Math.PI / 2, 12);
  });

  it("exposes a direct drag trigger that advances pallets and water", () => {
    const graph = new KinematicGraph(machine.spec);
    const events: Array<{ type: string; part: string }> = [];
    trigger("drive:crank-spurs").run(
      graph,
      (type, part) => events.push({ type, part }),
      Math.PI,
    );
    expect(events).toEqual([
      { type: "drive", part: "crank-spurs" },
      { type: "pallets:advance", part: "pallet-chain" },
      { type: "water:scrape", part: "water-sheet" },
    ]);
    expect(graph.state()["head-sprocket"]).toBeCloseTo(Math.PI, 12);
    expect(graph.state()["pallet-chain"]).toBeCloseTo(Math.PI, 12);
  });
});
