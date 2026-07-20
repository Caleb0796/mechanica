import { describe, expect, it } from "vitest";

import astroclock from "../../src/machines/astroclock/build";
import astroclockStory from "../../src/machines/astroclock/story";
import seismoscope from "../../src/machines/seismoscope/build";
import seismoscopeStory from "../../src/machines/seismoscope/story";
import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";
import type { MachineModule } from "../../src/sim/types";
import { storyStageState, type StoryStep } from "../../src/ui/story";

const stories: Array<{
  minimumSteps: number;
  module: MachineModule;
  steps: readonly StoryStep[];
}> = [
  { minimumSteps: 8, module: astroclock, steps: astroclockStory },
  { minimumSteps: 6, module: seismoscope, steps: seismoscopeStory },
];

describe("flagship stories", () => {
  it.each(stories)(
    "$module.data.slug satisfies the narrative contract",
    ({ minimumSteps, module, steps }) => {
      expect(steps.length).toBeGreaterThanOrEqual(minimumSteps);
      expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
      expect(
        steps.filter((step) => step.sourceId).length,
      ).toBeGreaterThanOrEqual(3);
      expect(steps.some((step) => step.spotlight)).toBe(true);
      expect(
        module.mechanism?.triggers.some(
          (trigger) => trigger.id === "spotlight",
        ),
      ).toBe(true);

      for (const step of steps) {
        expect(step.body.zh.length).toBeLessThanOrEqual(120);
        expect(step.body.en.length).toBeLessThanOrEqual(120);
        expect(
          [...step.camera.position, ...step.camera.target].every(
            Number.isFinite,
          ),
        ).toBe(true);
        if (step.explode !== undefined) {
          expect(step.explode).toBeGreaterThanOrEqual(0);
          expect(step.explode).toBeLessThanOrEqual(1);
        }
        if (step.sourceId) {
          expect(
            module.data.sources.some((source) => source.id === step.sourceId),
          ).toBe(true);
        }
        if (step.schemeId) {
          expect(module.schemes).toHaveProperty(step.schemeId);
        }

        const activeSchemeId = step.schemeId ?? module.defaultSchemeId;
        const spec = applySchemePatch(
          module.spec,
          activeSchemeId ? module.schemes?.[activeSchemeId] : undefined,
        );
        const partIds = new Set(spec.parts.map((part) => part.id));
        for (const partId of step.highlight ?? []) {
          expect(partIds.has(partId), `${step.id}: ${partId}`).toBe(true);
        }
        if (step.cutaway) {
          expect(step.cutaway.opacity).toBeGreaterThan(0);
          expect(step.cutaway.opacity).toBeLessThan(1);
          for (const partId of step.cutaway.partIds) {
            expect(partIds.has(partId), `${step.id}: ${partId}`).toBe(true);
          }
        }
        if (step.driveTo) {
          expect(
            partIds.has(step.driveTo.node),
            `${step.id}: ${step.driveTo.node}`,
          ).toBe(true);
          expect(step.driveTo.seconds).toBeGreaterThan(0);
          expect(Number.isFinite(step.driveTo.value)).toBe(true);
          expect(
            spec.parts.find((part) => part.id === step.driveTo?.node)?.joint,
            `${step.id}: ${step.driveTo.node} must visibly move`,
          ).toBeDefined();

          const graph = new KinematicGraph(module.spec);
          graph.setScheme(
            activeSchemeId ? module.schemes?.[activeSchemeId] : undefined,
          );
          const before = graph.state();
          const trigger = module.mechanism?.triggers.find(
            (candidate) => candidate.id === `drive:${step.driveTo?.node}`,
          );
          if (trigger) {
            trigger.run(graph, () => undefined, step.driveTo.value);
          } else {
            graph.drive(step.driveTo.node, step.driveTo.value);
          }
          expect(
            (step.highlight ?? []).some(
              (partId) =>
                Math.abs((graph.state()[partId] ?? 0) - (before[partId] ?? 0)) >
                1e-10,
            ),
            `${step.id}: drive must move a highlighted part`,
          ).toBe(true);
        }
      }
    },
  );

  it("eases drives to rest and switches drive nodes only at zero", () => {
    const driven = astroclockStory.find((step) => step.id === "escapement-beat")!;
    const idle = { ...driven, driveTo: undefined, id: "idle" };
    const returning = storyStageState([driven, idle], 0.5);
    const settled = storyStageState([driven, idle], 1);

    expect(returning.driveTo?.node).toBe("shulun");
    expect(returning.driveTo?.value).toBeCloseTo(
      driven.driveTo!.value / 2,
      12,
    );
    expect(settled.driveTo).toBeUndefined();

    const switched = storyStageState(
      [
        driven,
        {
          ...driven,
          driveTo: { node: "celestial-column", seconds: 2, value: Math.PI / 2 },
          id: "switched",
        },
      ],
      0.5,
    );
    expect(switched.driveTo).toEqual({
      node: "celestial-column",
      seconds: 2,
      value: 0,
    });
  });

  it("dollies out while crossfading between reconstruction schemes", () => {
    const transition = storyStageState(seismoscopeStory, 3.5 / 7);
    const linearPosition = transition.fromStep.camera.position.map(
      (value, axis) => (value + transition.toStep.camera.position[axis]) / 2,
    );
    const linearTarget = transition.fromStep.camera.target.map(
      (value, axis) => (value + transition.toStep.camera.target[axis]) / 2,
    );
    const distance = Math.hypot(
      ...transition.camera.position.map(
        (value, axis) => value - transition.camera.target[axis],
      ),
    );
    const linearDistance = Math.hypot(
      ...linearPosition.map((value, axis) => value - linearTarget[axis]),
    );

    expect(transition.fromStep.schemeId).not.toBe(transition.toStep.schemeId);
    expect(transition.segmentProgress).toBe(0.5);
    expect(distance).toBeCloseTo(linearDistance * 2.35, 12);
  });
});
