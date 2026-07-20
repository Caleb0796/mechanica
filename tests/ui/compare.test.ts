import { describe, expect, it } from "vitest";

import { KinematicGraph } from "../../src/sim/graph";
import chariot from "../../src/machines/chariot/build";
import seismoscope from "../../src/machines/seismoscope/build";
import {
  createSchemeTransition,
  differencePartIds,
  driveComparedGraphs,
  driveComparedMachineGraphs,
  driveNodeForSpec,
  schemeGhostPresentation,
  specForScheme,
  tintForDifference,
} from "../../src/ui/compare/model";

describe("scheme comparison", () => {
  it("identifies changed parts and presents a one-second red/teal handoff", () => {
    const schemeIds = Object.keys(chariot.schemes ?? {});
    const transition = createSchemeTransition(
      chariot,
      schemeIds[0],
      schemeIds[1],
      100,
    );
    const oldLayer = schemeGhostPresentation(transition, "old", 600);
    const newLayer = schemeGhostPresentation(transition, "new", 600);

    expect(transition.durationMs).toBe(1000);
    expect([
      ...transition.oldPartIds,
      ...transition.newPartIds,
    ]).not.toHaveLength(0);
    expect(oldLayer).toMatchObject({ color: "#d95c5c", progress: 0.5 });
    expect(newLayer).toMatchObject({ color: "#2aa7a1", progress: 0.5 });
    expect(oldLayer.opacity).toBeLessThan(newLayer.opacity);
  });

  it("drives both reconstruction graphs from the linked control", () => {
    const [leftSchemeId, rightSchemeId] = Object.keys(chariot.schemes ?? {});
    const leftSpec = specForScheme(chariot, leftSchemeId);
    const rightSpec = specForScheme(chariot, rightSchemeId);
    const leftGraph = new KinematicGraph(leftSpec);
    const rightGraph = new KinematicGraph(rightSpec);
    const driveNodes = [
      driveNodeForSpec(leftSpec),
      driveNodeForSpec(rightSpec),
    ] as const;

    expect(differencePartIds(leftSpec, rightSpec).size).toBeGreaterThan(0);
    driveComparedGraphs([leftGraph, rightGraph], driveNodes, Math.PI / 12);
    expect(leftGraph.state()[driveNodes[0]]).toBeCloseTo(Math.PI / 12, 8);
    expect(rightGraph.state()[driveNodes[1]]).toBeCloseTo(Math.PI / 12, 8);
  });

  it("keeps red and teal difference tints opaque in the live comparison", () => {
    expect(tintForDifference("left", "changed", new Set(["changed"]))).toMatchObject(
      {
        color: "#d95c5c",
        opacity: 1,
      },
    );
    expect(
      tintForDifference("right", "changed", new Set(["changed"])),
    ).toMatchObject({ color: "#2aa7a1", opacity: 1 });
  });

  it("routes chariot comparison input through both heading mechanisms", () => {
    const leftSpec = specForScheme(chariot, "yansu-clutch");
    const rightSpec = specForScheme(chariot, "lanchester-diff");
    const leftGraph = new KinematicGraph(leftSpec);
    const rightGraph = new KinematicGraph(rightSpec);
    const driveNodes = [
      driveNodeForSpec(leftSpec),
      driveNodeForSpec(rightSpec),
    ] as const;

    driveComparedMachineGraphs(
      chariot,
      [leftGraph, rightGraph],
      driveNodes,
      Math.PI / 12,
    );

    for (const graph of [leftGraph, rightGraph]) {
      const state = graph.state();
      expect(state["chassis-pivot"]).not.toBeCloseTo(0, 8);
      expect(state["figure-turntable"]).toBeCloseTo(-state["chassis-pivot"], 8);
    }
  });

  it("routes seismoscope comparison input through the shared quake pulse", () => {
    const leftSpec = specForScheme(seismoscope, "wangzhenduo");
    const rightSpec = specForScheme(seismoscope, "fengrui");
    const leftGraph = new KinematicGraph(leftSpec);
    const rightGraph = new KinematicGraph(rightSpec);
    const driveNodes = [
      driveNodeForSpec(leftSpec),
      driveNodeForSpec(rightSpec),
    ] as const;

    driveComparedMachineGraphs(
      seismoscope,
      [leftGraph, rightGraph],
      driveNodes,
      Math.PI / 12,
    );

    expect(leftGraph.state()[driveNodes[0]]).toBeCloseTo(Math.PI / 12, 8);
    expect(rightGraph.state()[driveNodes[1]]).toBeCloseTo(Math.PI / 12, 8);
    expect(leftGraph.state()["duzhu"]).toBeCloseTo(0.02, 8);
    expect(leftGraph.state()["ball-0"]).toBeCloseTo(0, 8);
    expect(rightGraph.state()["duzhu"]).toBeCloseTo(0.14, 8);
    expect(rightGraph.state()["ball-0"]).toBeCloseTo(0.65, 8);
  });
});
