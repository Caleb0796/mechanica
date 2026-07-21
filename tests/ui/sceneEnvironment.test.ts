import type { Scene, WebGLRenderer } from "three";
import { describe, expect, it, vi } from "vitest";

const pmremHarness = vi.hoisted(() => ({
  generatorDisposals: [] as Array<ReturnType<typeof vi.fn>>,
  targetDisposals: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  class MockPMREMGenerator {
    private readonly disposeGenerator = vi.fn();

    constructor() {
      pmremHarness.generatorDisposals.push(this.disposeGenerator);
    }

    dispose() {
      this.disposeGenerator();
    }

    fromScene() {
      const dispose = vi.fn();
      pmremHarness.targetDisposals.push(dispose);
      return { dispose, texture: {} };
    }
  }

  return { ...actual, PMREMGenerator: MockPMREMGenerator };
});

import {
  mountSceneEnvironment,
  prepareSceneEnvironment,
} from "../../src/ui/viewer/SceneEnvironment";
import loomScene from "../../src/machines/loom/scene";
import odometerScene from "../../src/machines/odometer/scene";
import seismoscopeScene from "../../src/machines/seismoscope/scene";

function scene() {
  return { environment: null, environmentIntensity: 1 } as Scene;
}

describe("scene environment", () => {
  it("creates one PMREM per renderer and disposes it after the final mount", () => {
    const rendererA = {} as WebGLRenderer;
    const rendererB = {} as WebGLRenderer;
    const sceneA = scene();
    const sceneB = scene();
    const sceneC = scene();

    const releaseA = mountSceneEnvironment(rendererA, sceneA);
    const releaseB = mountSceneEnvironment(rendererA, sceneB);
    const releaseC = mountSceneEnvironment(rendererB, sceneC);

    expect(pmremHarness.generatorDisposals).toHaveLength(2);
    expect(pmremHarness.targetDisposals).toHaveLength(2);
    expect(pmremHarness.generatorDisposals[0]).toHaveBeenCalledOnce();
    expect(pmremHarness.generatorDisposals[1]).toHaveBeenCalledOnce();
    expect(sceneA.environment).toBe(sceneB.environment);
    expect(sceneA.environment).not.toBe(sceneC.environment);
    expect(sceneA.environmentIntensity).toBe(0.9);
    expect(sceneB.environmentIntensity).toBe(0.9);
    expect(sceneC.environmentIntensity).toBe(0.9);

    releaseA();
    expect(pmremHarness.targetDisposals[0]).not.toHaveBeenCalled();
    expect(sceneA.environment).toBeNull();
    expect(sceneA.environmentIntensity).toBe(1);

    releaseB();
    expect(pmremHarness.targetDisposals[0]).toHaveBeenCalledOnce();
    expect(sceneB.environment).toBeNull();
    expect(sceneB.environmentIntensity).toBe(1);

    releaseC();
    expect(pmremHarness.targetDisposals[1]).toHaveBeenCalledOnce();
  });

  it("adopts an environment prepared before the first scene render", () => {
    const renderer = {} as WebGLRenderer;
    const preparedScene = scene();
    const generatorCount = pmremHarness.generatorDisposals.length;
    const targetCount = pmremHarness.targetDisposals.length;

    prepareSceneEnvironment({ gl: renderer, scene: preparedScene });
    const release = mountSceneEnvironment(renderer, preparedScene);

    expect(pmremHarness.generatorDisposals).toHaveLength(generatorCount + 1);
    expect(pmremHarness.targetDisposals).toHaveLength(targetCount + 1);
    expect(preparedScene.environment).not.toBeNull();
    expect(preparedScene.environmentIntensity).toBe(0.9);

    release();
    expect(pmremHarness.targetDisposals[targetCount]).toHaveBeenCalledOnce();
    expect(preparedScene.environment).toBeNull();
    expect(preparedScene.environmentIntensity).toBe(1);
  });

  it("releases every PMREM target across five mount cycles", () => {
    const targetCount = pmremHarness.targetDisposals.length;

    for (let cycle = 0; cycle < 5; cycle += 1) {
      const mountedScene = scene();
      const release = mountSceneEnvironment(
        {} as WebGLRenderer,
        mountedScene,
      );
      release();
      expect(mountedScene.environment).toBeNull();
      expect(mountedScene.environmentIntensity).toBe(1);
    }

    const cycleDisposals = pmremHarness.targetDisposals.slice(targetCount);
    expect(cycleDisposals).toHaveLength(5);
    for (const dispose of cycleDisposals) {
      expect(dispose).toHaveBeenCalledOnce();
    }
  });
});

describe("usage scene specifications", () => {
  it("sets the seismoscope on a dusk terrace with braziers and a quake ring", () => {
    expect(seismoscopeScene.ground?.radius).toBeGreaterThanOrEqual(4.5);
    expect(seismoscopeScene.lightRig).toBe("dusk-west");
    expect(
      seismoscopeScene.props?.filter((prop) => prop.kind === "brazier"),
    ).toHaveLength(2);
    const balustrade = seismoscopeScene.props?.find(
      (prop) => prop.kind === "balustrade-arc",
    );
    expect(balustrade?.params?.arc).toBe(Math.PI * 2);
    expect(
      seismoscopeScene.ambientMotion?.some(
        (motion) => motion.kind === "quake-shockwave",
      ),
    ).toBe(true);
  });

  it("gives the odometer a rutted procession road and three milestones", () => {
    expect(
      odometerScene.props?.some((prop) => prop.kind === "road-strip"),
    ).toBe(true);
    expect(
      odometerScene.props?.filter((prop) => prop.kind === "milestone"),
    ).toHaveLength(3);
    expect(
      odometerScene.props?.some((prop) => prop.kind === "banner-pole"),
    ).toBe(true);
  });

  it("places the loom in a dusty workshop with spools and a silk swatch", () => {
    expect(loomScene.props?.some((prop) => prop.kind === "workbench")).toBe(
      true,
    );
    expect(loomScene.props?.some((prop) => prop.kind === "silk-swatch")).toBe(
      true,
    );
    expect(
      loomScene.ambientMotion?.some((motion) => motion.kind === "dust"),
    ).toBe(true);
  });
});
