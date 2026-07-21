import { describe, expect, it } from "vitest";
import { Box3, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";

import {
  buildPartGeometry,
  disposePartGeometry,
  partGeometryEntries,
  singlePartGeometry,
} from "../../src/core/primitives";
import machine from "../../src/machines/odometer/build";
import { KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance } from "../../src/sim/types";
import { captureSpotlightState } from "../../src/ui/viewer/MachineViewer";
import { collisionPairsAtAngle } from "../../src/validate/collision";

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
  const paths = numericPaths(part.geometry);
  if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");

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

describe("odometer drum carriage", () => {
  it("builds the complete A-tier carriage and Lu Daolong scheme", () => {
    expect(machine.spec.parts.length).toBeGreaterThanOrEqual(15);
    expect(machine.spec.parts.length).toBeLessThanOrEqual(30);
    expect(machine.spec.driveNodes).toEqual([
      "zulun",
      "zhongpinglun",
      "shangpinglun",
    ]);
    expect(machine.spec.primaryDrive).toBe("zulun");
    expect(machine.defaultSchemeId).toBe("ludaolong");
    expect(Object.keys(machine.schemes ?? {})).toEqual(["ludaolong"]);
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();

    const graph = new KinematicGraph(machine.spec);
    expect(() => graph.setScheme(machine.schemes?.ludaolong)).not.toThrow();
  });

  it("preserves the seven required transmission ids and exact recorded teeth", () => {
    const required = {
      zulun: undefined,
      lilun: 18,
      xiapinglun: 54,
      xuanfenglun: 3,
      zhongpinglun: 100,
      xiaopinglun: 10,
      shangpinglun: 100,
    } as const;
    expect(
      Object.keys(required).every((id) =>
        machine.spec.parts.some((part) => part.id === id),
      ),
    ).toBe(true);

    const toothTotal = Object.entries(required).reduce((sum, [id, teeth]) => {
      if (teeth === undefined) return sum;
      const part = machine.spec.parts.find((candidate) => candidate.id === id);
      expect(part?.geometry.type).toBe("gear");
      if (part?.geometry.type === "gear") {
        expect(part.geometry.teeth, id).toBe(teeth);
        return sum + part.geometry.teeth;
      }
      return sum;
    }, 0);
    expect(toothTotal).toBe(285);
  });

  it("reproduces the 1/100 drum and 1/1000 chime reductions", () => {
    const graph = new KinematicGraph(machine.spec);

    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(ratio.from, ratio.to)).toBeCloseTo(
        ratio.ratio,
        12,
      );
    }
    expect(graph.ratioBetween("zulun", "zhongpinglun")).toBeCloseTo(
      1 / 100,
      12,
    );
    expect(graph.ratioBetween("zulun", "shangpinglun")).toBeCloseTo(
      -1 / 1000,
      12,
    );

    const reverse = new KinematicGraph(machine.spec);
    reverse.drive("shangpinglun", 0.001);
    expect(reverse.state().zulun).toBeCloseTo(-1, 12);
    expect(
      machine.spec.constraints.find(
        (constraint) =>
          constraint.type === "mesh" &&
          constraint.a === "xiaopinglun" &&
          constraint.b === "shangpinglun",
      ),
    ).toEqual({ type: "mesh", a: "xiaopinglun", b: "shangpinglun" });
    expect(machine.spec.cycleRad).toBe(Math.PI * 2 * 1000);
  });

  it("declares the exact causal chain and visitor inspection aids", () => {
    const expectedLinks = [
      ["lockstep", "zulun", "lilun"],
      ["mesh", "lilun", "xiapinglun"],
      ["lockstep", "xiapinglun", "xuanfenglun"],
      ["mesh", "xuanfenglun", "zhongpinglun"],
      ["lockstep", "zhongpinglun", "xiaopinglun"],
      ["mesh", "xiaopinglun", "shangpinglun"],
    ] as const;
    for (const [type, a, b] of expectedLinks) {
      expect(
        machine.spec.constraints.some(
          (constraint) =>
            constraint.type === type &&
            "a" in constraint &&
            constraint.a === a &&
            constraint.b === b,
        ),
        `${a} → ${b}`,
      ).toBe(true);
    }

    const aids = machine.aids ?? [];
    const cutaway = aids.find((aid) => aid.kind === "cutaway");
    expect(cutaway).toMatchObject({
      partIds: ["chassis-base", "platform"],
    });
    const powerPaths = aids.filter((aid) => aid.kind === "powerPath");
    expect(powerPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sequence: [
            "zulun",
            "road-axle",
            "lilun",
            "road-transfer-witness",
            "xiapinglun",
            "guanxin-shaft-lower",
            "lower-gear-witness",
            "xuanfenglun",
            "zhongpinglun",
            "zhongping-shaft",
            "trip-linkage-drum",
            "lower-figure",
            "drum",
          ],
        }),
        expect.objectContaining({
          sequence: [
            "zulun",
            "road-axle",
            "lilun",
            "road-transfer-witness",
            "xiapinglun",
            "guanxin-shaft-lower",
            "lower-gear-witness",
            "xuanfenglun",
            "zhongpinglun",
            "zhongping-shaft",
            "xiaopinglun",
            "shangpinglun",
            "shangping-shaft",
            "trip-linkage-chime",
            "upper-figure",
            "chime",
          ],
        }),
      ]),
    );
    const callouts = aids.find((aid) => aid.kind === "callouts");
    if (!callouts || callouts.kind !== "callouts") {
      throw new Error("Missing odometer callouts");
    }
    expect(callouts.anchors.map((anchor) => anchor.partId)).toEqual([
      "lilun",
      "road-transfer-witness",
      "lower-gear-witness",
      "xuanfenglun",
      "trip-linkage-drum",
      "trip-linkage-chime",
      "drum",
      "chime",
    ]);
    expect(
      aids
        .filter((aid) => aid.kind === "subDemo")
        .map((aid) => (aid.kind === "subDemo" ? aid.triggerId : "")),
    ).toEqual(["spotlight", "ten-li-spotlight"]);
  });

  it("makes the road-wheel handoff visibly rotate on both gear faces", () => {
    const part = (id: string): PartDef => {
      const found = machine.spec.parts.find((candidate) => candidate.id === id);
      if (!found) throw new Error(`Missing ${id}`);
      return found;
    };
    const roadWitness = part("road-transfer-witness");
    const lowerWitness = part("lower-gear-witness");
    const lilun = part("lilun");
    const xiapinglun = part("xiapinglun");
    const lowerShaft = part("guanxin-shaft-lower");

    expect(roadWitness).toMatchObject({
      parent: "road-axle",
      joint: { kind: "fixed", axis: [0, 1, 0] },
      geometry: {
        type: "custom",
        builder: "odometerRotationWitness",
        params: {
          length: 0.155,
          width: 0.035,
          thickness: 0.018,
          direction: 1,
          couplingLength: 0.58,
          couplingRadius: 0.05,
        },
      },
    });
    expect(lowerWitness).toMatchObject({
      parent: "guanxin-shaft-lower",
      joint: { kind: "fixed", axis: [0, 1, 0] },
      geometry: {
        type: "custom",
        builder: "odometerRotationWitness",
        params: {
          length: 0.59,
          width: 0.045,
          thickness: 0.018,
          direction: -1,
          couplingLength: 0.18,
          couplingRadius: 0.055,
        },
      },
    });
    expect(
      new KinematicGraph(machine.spec).ratioBetween(
        "xiapinglun",
        "guanxin-shaft-lower",
      ),
    ).toBe(1);

    for (const [witness, entryCount] of [
      [roadWitness, 3],
      [lowerWitness, 3],
    ] as const) {
      if (witness.geometry.type !== "custom") {
        throw new Error(`Missing rotation witness geometry for ${witness.id}`);
      }
      const geometry = buildPartGeometry(
        witness.geometry,
        machine.customBuilders,
      );
      const entries = partGeometryEntries(geometry);
      expect(entries).toHaveLength(entryCount);
      expect(entries[0].userData.mechanicaSemantic).toEqual({
        kind: "road-to-gear-rotation-witness",
        pointsTowardMesh: true,
        radialIndex: true,
        visibleProgression: true,
      });
      expect(entries[0].userData.mechanicaMaterialRole).toBe(
        "transmission-witness",
      );
      expect(entries[0].userData.mechanicaMaterial).toMatchObject({
        color: "#f0c96b",
        emissiveIntensity: 0.12,
      });
      expect(entries[1].userData.mechanicaSemantic).toEqual({
        kind: "asymmetric-moving-index-flag",
        pointsTowardMesh: true,
        screenshotReadable: true,
      });
      expect(entries[1].userData.mechanicaMaterial).toMatchObject({
        color: "#ef6a4b",
        emissiveIntensity: 0.18,
      });
      expect(entries[1].userData.mechanicaMaterial.color).not.toBe(
        entries[0].userData.mechanicaMaterial.color,
      );
      disposePartGeometry(geometry);
    }

    const builtRoadGeometry = buildPartGeometry(
      roadWitness.geometry,
      machine.customBuilders,
    );
    const roadGeometry = partGeometryEntries(builtRoadGeometry);
    expect(roadGeometry[2].userData.mechanicaSemantic).toEqual({
      kind: "keyed-road-axle-coupling",
      continuousWithDriveShaft: true,
      exposesGearHandoff: true,
      rotationKey: true,
    });
    roadGeometry[2].computeBoundingBox();
    expect(roadGeometry[2].boundingBox?.min.y).toBeLessThan(-0.56);
    disposePartGeometry(builtRoadGeometry);
    const builtLowerGeometry = buildPartGeometry(
      lowerWitness.geometry,
      machine.customBuilders,
    );
    expect(
      partGeometryEntries(builtLowerGeometry)[2].userData.mechanicaSemantic,
    ).toEqual({
      kind: "keyed-lower-wheel-shaft-coupling",
      continuousWithDriveShaft: true,
      exposesGearHandoff: true,
      rotationKey: true,
    });
    disposePartGeometry(builtLowerGeometry);

    if (
      roadWitness.geometry.type !== "custom" ||
      lowerWitness.geometry.type !== "custom" ||
      lilun.geometry.type !== "gear" ||
      xiapinglun.geometry.type !== "gear"
    ) {
      throw new Error("Missing face-separated transfer witness geometry");
    }
    expect(
      roadWitness.position[1] + roadWitness.geometry.params.thickness / 2,
    ).toBeLessThan(lilun.position[1] - lilun.geometry.thickness / 2);
    expect(
      lowerShaft.position[1] +
        lowerWitness.position[1] -
        lowerWitness.geometry.params.thickness / 2,
    ).toBeGreaterThan(
      xiapinglun.position[1] + xiapinglun.geometry.thickness / 2,
    );
    const pitchContactX =
      lilun.position[0] + (lilun.geometry.module * lilun.geometry.teeth) / 2;
    const roadPointerX =
      roadWitness.position[0] +
      roadWitness.geometry.params.direction *
        roadWitness.geometry.params.length;
    const lowerPointerX =
      lowerShaft.position[0] +
      lowerWitness.position[0] +
      lowerWitness.geometry.params.direction *
        lowerWitness.geometry.params.length;
    expect(Math.abs(roadPointerX - pitchContactX)).toBeLessThan(0.07);
    expect(Math.abs(lowerPointerX - pitchContactX)).toBeLessThan(0.06);
  });

  it("keeps the recorded diameters and ancient circumference basis visible", () => {
    const zulun = machine.spec.parts.find((part) => part.id === "zulun");
    const lilun = machine.spec.parts.find((part) => part.id === "lilun");
    const xiapinglun = machine.spec.parts.find(
      (part) => part.id === "xiapinglun",
    );
    const zhongpinglun = machine.spec.parts.find(
      (part) => part.id === "zhongpinglun",
    );

    expect(zulun?.geometry.type).toBe("wheel");
    if (zulun?.geometry.type === "wheel") {
      expect(zulun.geometry.radius * 2).toBeCloseTo(1.872, 12);
    }
    expect(zulun?.dimensionNotes?.[0].ancient).toContain("圍一丈八尺");

    for (const [part, diameter] of [
      [lilun, 0.431],
      [xiapinglun, 1.292],
      [zhongpinglun, 1.248],
    ] as const) {
      expect(part?.geometry.type).toBe("gear");
      if (part?.geometry.type === "gear") {
        expect(part.geometry.module * part.geometry.teeth).toBeCloseTo(
          diameter,
          3,
        );
      }
    }
  });

  it("builds a red double-storey pavilion on a supported carriage", () => {
    const pavilion = machine.spec.parts.find((part) => part.id === "platform");
    const roof = machine.spec.parts.find((part) => part.id === "canopy-roof");
    const chassis = machine.spec.parts.find(
      (part) => part.id === "chassis-base",
    );
    const axle = machine.spec.parts.find((part) => part.id === "road-axle");
    const drawbar = machine.spec.parts.find((part) => part.id === "drawbar");
    const axleGear = machine.spec.parts.find((part) => part.id === "lilun");
    const whirlwindGear = machine.spec.parts.find(
      (part) => part.id === "xuanfenglun",
    );
    const upperGear = machine.spec.parts.find(
      (part) => part.id === "shangpinglun",
    );

    expect(machine.customBuilders).toMatchObject({
      odometerUnderframe: expect.any(Function),
      odometerPavilion: expect.any(Function),
      odometerHipRoof: expect.any(Function),
      odometerDrawbar: expect.any(Function),
      odometerFigure: expect.any(Function),
      odometerMalletArm: expect.any(Function),
      odometerRotationWitness: expect.any(Function),
      odometerTripShaft: expect.any(Function),
      odometerInstrumentStand: expect.any(Function),
      odometerDrum: expect.any(Function),
      odometerChime: expect.any(Function),
      odometerTripLinkage: expect.any(Function),
    });
    expect(pavilion?.geometry).toMatchObject({
      type: "custom",
      builder: "odometerPavilion",
      params: {
        width: 3,
        depth: 2.1,
        skirtHeight: 0.72,
        lowerHeight: 1.08,
        upperHeight: 1.08,
        railHeight: 0.28,
        wheelWellWidth: 2,
        wheelWellDepth: 1.9,
        upperGearClearance: 1.32,
        upperGearOffset: 0.86212,
      },
    });
    expect(chassis?.geometry).toMatchObject({
      type: "custom",
      builder: "odometerUnderframe",
      params: {
        length: 3,
        gearClearance: 0.56,
        whirlwindClearance: 0.14,
        whirlwindOffset: 0.86212,
        crossMemberOffset: 1.12,
      },
    });
    if (pavilion?.geometry.type !== "custom") {
      throw new Error("Missing odometer pavilion geometry");
    }
    const pavilionGeometry = buildPartGeometry(
      pavilion.geometry,
      machine.customBuilders,
    );
    const pavilionEntries = partGeometryEntries(pavilionGeometry);
    expect(pavilionEntries).toHaveLength(4);
    expect(
      pavilionEntries.map(
        (geometry) => geometry.userData.mechanicaSemantic.kind,
      ),
    ).toEqual([
      "painted-carriage-skirt",
      "double-storey-pavilion-frame",
      "double-tier-goulan-railings",
      "pierced-bracket-registers",
    ]);
    expect(
      pavilionEntries.every(
        (geometry) =>
          geometry.userData.mechanicaMaterialRole === "carriage-pavilion",
      ),
    ).toBe(true);
    expect(pavilionEntries[0].userData.mechanicaSemantic).toMatchObject({
      frontAndSideMechanismBays: true,
      pairedRoadWheelWells: true,
      recordedRedBody: true,
      upperReductionGearBay: true,
    });
    expect(pavilionEntries[0].userData.mechanicaMaterial).toMatchObject({
      opacity: 1,
      textureVariant: "none",
      transparent: false,
    });
    const pavilionBounds = new Box3();
    for (const geometry of pavilionEntries) {
      geometry.computeBoundingBox();
      pavilionBounds.union(geometry.boundingBox!);
    }
    const pavilionSize = pavilionBounds.getSize(new Vector3());
    expect(pavilionSize.x).toBeCloseTo(3, 6);
    expect(pavilionSize.y).toBeCloseTo(2.93, 6);
    expect(pavilionSize.z).toBeCloseTo(2.1, 6);
    disposePartGeometry(pavilionGeometry);

    for (const [part, builder, semantic] of [
      [chassis, "odometerUnderframe", "carriage-underframe"],
      [roof, "odometerHipRoof", "ceremonial-hip-roof"],
      [drawbar, "odometerDrawbar", "single-phoenix-headed-drawbar"],
    ] as const) {
      expect(part?.geometry).toMatchObject({ type: "custom", builder });
      if (part?.geometry.type !== "custom") {
        throw new Error(`Missing ${semantic} geometry`);
      }
      const geometry = singlePartGeometry(
        buildPartGeometry(part.geometry, machine.customBuilders),
      );
      expect(geometry.userData.mechanicaSemantic.kind).toBe(semantic);
      if (part.id === "chassis-base") {
        expect(geometry.userData.mechanicaSemantic).toMatchObject({
          centralDriveGearClearance: true,
          twinLongitudinalRails: true,
          whirlwindGearClearance: true,
        });
      }
      expect(geometry.userData.mechanicaMaterialRole).toBe("carriage-pavilion");
      geometry.dispose();
    }

    expect(chassis?.position[1]).toBeGreaterThan(axle?.position[1] ?? Infinity);
    const roadWheel = machine.spec.parts.find((part) => part.id === "zulun");
    if (
      pavilion.geometry.type !== "custom" ||
      roadWheel?.geometry.type !== "wheel"
    ) {
      throw new Error("Missing pavilion wheel-well geometry");
    }
    expect(pavilion.geometry.params.wheelWellWidth / 2).toBeGreaterThan(
      roadWheel.geometry.radius,
    );
    expect(pavilion.geometry.params.wheelWellDepth / 2).toBeLessThan(
      Math.abs(roadWheel.position[1]) - roadWheel.geometry.width / 2,
    );
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "zulun",
      "platform",
    ]);
    if (
      chassis?.geometry.type !== "custom" ||
      axleGear?.geometry.type !== "gear" ||
      whirlwindGear?.geometry.type !== "gear" ||
      upperGear?.geometry.type !== "gear"
    ) {
      throw new Error("Missing underframe clearance geometry");
    }
    const axleGearOuterDiameter =
      axleGear.geometry.module * (axleGear.geometry.teeth + 2);
    expect(chassis.geometry.params.gearClearance).toBeGreaterThan(
      axleGearOuterDiameter,
    );
    const whirlwindOuterDiameter =
      whirlwindGear.geometry.module * (whirlwindGear.geometry.teeth + 2);
    const whirlwindOuterRadius = whirlwindOuterDiameter / 2;
    expect(chassis.geometry.params.whirlwindClearance).toBeGreaterThan(
      whirlwindOuterDiameter,
    );
    expect(
      chassis.geometry.params.crossMemberOffset -
        chassis.geometry.params.whirlwindOffset,
    ).toBeGreaterThan(
      whirlwindOuterRadius + chassis.geometry.params.height / 2,
    );
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "chassis-base",
      "lilun",
    ]);
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "chassis-base",
      "xuanfenglun",
    ]);
    const upperGearOuterDiameter =
      upperGear.geometry.module * (upperGear.geometry.teeth + 2);
    expect(pavilion.geometry.params.upperGearClearance).toBeGreaterThan(
      upperGearOuterDiameter,
    );
    expect(
      pavilion.geometry.params.upperGearOffset -
        pavilion.geometry.params.upperGearClearance / 2,
    ).toBeLessThan(upperGear.position[0] - upperGearOuterDiameter / 2);
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "platform",
      "shangpinglun",
    ]);
    expect(drawbar?.position[0]).toBeLessThan(1.6);
    expect(roof?.position[1]).toBeLessThan(4.1);
  });

  it("mounts tiered human strikers and exposes both trip-to-mallet paths", () => {
    const part = (id: string): PartDef => {
      const found = machine.spec.parts.find((candidate) => candidate.id === id);
      if (!found) throw new Error(`Missing ${id}`);
      return found;
    };
    const lowerBody = part("lower-figure-body");
    const lowerArm = part("lower-figure");
    const upperBody = part("upper-figure-body");
    const upperArm = part("upper-figure");
    const drum = part("drum");
    const chime = part("chime");
    const stations = [
      ["li-instrument-support", 0.5, 0.48],
      ["ten-li-instrument-support", 0.46, 0.5],
    ] as const;
    // Frozen pre-refinement local envelopes: articulation may tighten them,
    // but no point may grow beyond the declared striker silhouette.
    const strikerEnvelopes = {
      "lower-figure": new Box3(
        new Vector3(-0.430001, -0.240001, -0.040001),
        new Vector3(0.028801, 0.040001, 0.180001),
      ),
      "upper-figure": new Box3(
        new Vector3(-0.445001, -0.245001, -0.000001),
        new Vector3(0.028801, 0.040001, 0.480001),
      ),
    } as const;

    for (const body of [lowerBody, upperBody]) {
      expect(body.geometry).toMatchObject({
        type: "custom",
        builder: "odometerFigure",
        params: { height: 0.82, shoulderWidth: 0.3, depth: 0.26 },
      });
      const figureGeometry = buildPartGeometry(
        body.geometry,
        machine.customBuilders,
      );
      const figureEntries = partGeometryEntries(figureGeometry);
      expect(figureEntries).toHaveLength(4);
      expect(
        figureEntries.map(
          (geometry) => geometry.userData.mechanicaSemantic.kind,
        ),
      ).toEqual([
        "mounted-human-striker",
        "human-head-and-neck",
        "striker-cap",
        "separated-arm-and-feet",
      ]);
      expect(
        figureEntries.every(
          (geometry) => geometry.userData.mechanicaMaterialRole === "figure",
        ),
      ).toBe(true);
      expect(
        new Set(
          figureEntries.map(
            (geometry) => geometry.userData.mechanicaMaterial.color,
          ),
        ).size,
      ).toBe(4);
      expect(figureEntries[1].userData.mechanicaSemantic).toMatchObject({
        instrumentFacingAxis: "-x",
      });
      disposePartGeometry(figureGeometry);
      expect(body.joint).toMatchObject({
        kind: "revolute",
        axis: [0, 0, 1],
        limits: [0, body.id === "upper-figure-body" ? 0.18 : 0.14],
      });
    }
    for (const [arm, body] of [
      [lowerArm, lowerBody],
      [upperArm, upperBody],
    ] as const) {
      expect(arm.parent).toBe(body.id);
      expect(arm.geometry).toMatchObject({
        type: "custom",
        builder: "odometerMalletArm",
        params: { length: 0.38, thickness: 0.04, direction: -1 },
      });
      expect(arm.joint).toMatchObject({
        kind: "revolute",
        axis: [0, 0, -1],
        limits: [0, 0.28],
      });
      if (arm.geometry.type !== "custom") {
        throw new Error(`Missing mallet-arm geometry for ${arm.id}`);
      }
      const armGeometry = buildPartGeometry(
        arm.geometry,
        machine.customBuilders,
      );
      const armEntries = partGeometryEntries(armGeometry);
      expect(armEntries).toHaveLength(2);
      expect(armEntries[0].userData.mechanicaSemantic).toMatchObject({
        kind: "instrument-facing-striker-arm",
        armSegments: 2,
        direction: -1,
        handCuffGrip: true,
        readableStrikePath: true,
        outboardShoulderBridge: true,
        shoulderEmbedded: true,
      });
      const armSemantic = armEntries[0].userData.mechanicaSemantic;
      expect(armSemantic.elbowAngle).toBeGreaterThanOrEqual(100);
      expect(armSemantic.elbowAngle).toBeLessThanOrEqual(130);
      expect(armSemantic.gripPoint).toEqual([
        arm.geometry.params.direction * arm.geometry.params.length,
        -arm.geometry.params.handle * 0.28,
        arm.geometry.params.planeOffset,
      ]);
      expect(armEntries[1].userData.mechanicaSemantic).toMatchObject({
        kind: "separate-mallet-head-and-handle",
        instrumentFacingAxis: "-x",
        contactDepth: 0.18,
        contactOffset: 0.09,
        strikePlaneOffset: arm.id === "upper-figure" ? 0.44 : 0.14,
        targetFacingAxis: "-z",
      });
      expect(armEntries[1].userData.mechanicaSemantic.restHeadCenter).toEqual([
        arm.geometry.params.direction * arm.geometry.params.length,
        -arm.geometry.params.handle,
        arm.geometry.params.planeOffset - arm.geometry.params.contactOffset,
      ]);
      if (body.geometry.type !== "custom") {
        throw new Error(`Missing figure-body geometry for ${body.id}`);
      }
      expect(Math.abs(arm.position[0])).toBeLessThan(
        body.geometry.params.shoulderWidth / 2,
      );
      expect(arm.position[1]).toBeGreaterThan(
        body.geometry.params.height * (0.19 - 0.085 / 2),
      );
      expect(arm.position[1]).toBeLessThan(
        body.geometry.params.height * (0.19 + 0.085 / 2),
      );
      expect(Math.abs(arm.position[2])).toBeLessThan(
        (body.geometry.params.depth * 0.82) / 2,
      );
      const armBounds = new Box3();
      for (const geometry of armEntries) {
        geometry.computeBoundingBox();
        armBounds.union(geometry.boundingBox!);
      }
      const frozenEnvelope = strikerEnvelopes[arm.id];
      for (const axis of ["x", "y", "z"] as const) {
        expect(
          armBounds.min[axis],
          `${arm.id} minimum ${axis}`,
        ).toBeGreaterThanOrEqual(frozenEnvelope.min[axis]);
        expect(
          armBounds.max[axis],
          `${arm.id} maximum ${axis}`,
        ).toBeLessThanOrEqual(frozenEnvelope.max[axis]);
      }
      expect(armEntries[0].userData.mechanicaMaterial.color).not.toBe(
        armEntries[1].userData.mechanicaMaterial.color,
      );
      expect(armEntries[1].userData.mechanicaMaterial).toMatchObject({
        color: "#f0c96b",
        emissiveIntensity: 0.06,
        metalness: 0.28,
      });
      disposePartGeometry(armGeometry);
    }
    if (
      upperArm.geometry.type !== "custom" ||
      lowerArm.geometry.type !== "custom"
    ) {
      throw new Error("Missing tiered mallet geometry");
    }
    expect(lowerArm.geometry.params).toMatchObject({
      planeOffset: 0.14,
      contactDepth: 0.18,
      contactOffset: 0.09,
    });
    expect(upperArm.geometry.params).toMatchObject({
      head: 0.065,
      planeOffset: 0.44,
      contactDepth: 0.18,
      contactOffset: 0.09,
    });
    expect(upperBody.position[1] - lowerBody.position[1]).toBeCloseTo(1.08, 6);
    expect(chime.position[1]).toBeGreaterThan(drum.position[1]);
    expect(chime.position[2] - upperBody.position[2]).toBeCloseTo(0.32, 6);
    expect(part("ten-li-instrument-support").position[2]).toBe(
      chime.position[2],
    );
    expect(drum.joint).toMatchObject({
      kind: "revolute",
      axis: [0, 1, 0],
      limits: [0, 0.16],
    });
    expect(chime.joint).toMatchObject({
      kind: "revolute",
      axis: [0, 0, 1],
      limits: [0, 0.35],
    });
    const riseDistances: number[] = [];
    for (const [body, arm, instrument, heldAngle] of [
      [lowerBody, lowerArm, drum, 0.14],
      [upperBody, upperArm, chime, 0.18],
    ] as const) {
      if (
        arm.geometry.type !== "custom" ||
        instrument.geometry.type !== "custom"
      ) {
        throw new Error(`Missing held strike geometry for ${arm.id}`);
      }
      const armParams = arm.geometry.params;
      const malletPosition = (
        bodyAngle: number,
        armAngle: number,
      ): [number, number] => {
        const headX = armParams.direction * armParams.length;
        const headY = -armParams.handle;
        const effectiveArmAngle = -armAngle;
        const armRotatedX =
          headX * Math.cos(effectiveArmAngle) -
          headY * Math.sin(effectiveArmAngle);
        const armRotatedY =
          headX * Math.sin(effectiveArmAngle) +
          headY * Math.cos(effectiveArmAngle);
        const localMalletX = arm.position[0] + armRotatedX;
        const localMalletY = arm.position[1] + armRotatedY;
        return [
          body.position[0] +
            localMalletX * Math.cos(bodyAngle) -
            localMalletY * Math.sin(bodyAngle),
          body.position[1] +
            localMalletX * Math.sin(bodyAngle) +
            localMalletY * Math.cos(bodyAngle),
        ];
      };
      const startMallet = malletPosition(0, 0);
      const raisedMallet = malletPosition(0, 0.28);
      const [heldMalletX, heldMalletY] = malletPosition(heldAngle, 0);
      const riseDistance = raisedMallet[1] - startMallet[1];
      riseDistances.push(riseDistance);
      expect(
        Math.hypot(
          startMallet[0] - instrument.position[0],
          startMallet[1] - instrument.position[1],
        ),
        `${arm.id} rest head aims at ${instrument.id}`,
      ).toBeLessThan(instrument.geometry.params.radius);
      expect(riseDistance).toBeGreaterThan(0.1);
      expect(heldMalletY - startMallet[1]).toBeLessThan(-0.05);
      expect(Math.abs(heldMalletX - instrument.position[0])).toBeLessThan(
        instrument.geometry.params.radius,
      );
      const instrumentHalfHeight =
        instrument.id === "drum"
          ? instrument.geometry.params.radius
          : instrument.geometry.params.height / 2;
      expect(Math.abs(heldMalletY - instrument.position[1])).toBeLessThan(
        instrumentHalfHeight + armParams.head,
      );
      const contactCenter =
        body.position[2] + armParams.planeOffset - armParams.contactOffset;
      expect(instrument.position[2]).toBeGreaterThanOrEqual(
        contactCenter - armParams.contactDepth / 2,
      );
      expect(instrument.position[2]).toBeLessThanOrEqual(
        contactCenter + armParams.contactDepth / 2,
      );
    }
    expect(riseDistances[1]).toBeGreaterThanOrEqual(riseDistances[0] - 0.005);

    for (const [id, width, height] of stations) {
      const stand = part(id);
      expect(stand.geometry).toMatchObject({
        type: "custom",
        builder: "odometerInstrumentStand",
        params: { width, height, bar: 0.035 },
      });
      if (stand.geometry.type !== "custom") {
        throw new Error(`Missing instrument stand geometry for ${id}`);
      }
      const geometry = singlePartGeometry(
        buildPartGeometry(stand.geometry, machine.customBuilders),
      );
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new Vector3());
      expect(size.x).toBeCloseTo(width, 6);
      expect(size.y).toBeCloseTo(height, 6);
      expect(size.z).toBeCloseTo(stand.geometry.params.depth, 6);
      expect(geometry.userData.mechanicaSemantic).toEqual({
        kind: "struck-instrument-support",
        openFrame: true,
      });
      const material = new MeshBasicMaterial();
      const mesh = new Mesh(geometry, material);
      const centerRay = new Raycaster(
        new Vector3(0, 0, 1),
        new Vector3(0, 0, -1),
      );
      expect(centerRay.intersectObject(mesh)).toHaveLength(0);
      material.dispose();
      geometry.dispose();
    }

    expect(drum.geometry).toMatchObject({
      type: "custom",
      builder: "odometerDrum",
      params: { radius: 0.19, length: 0.34 },
    });
    const drumGeometry = buildPartGeometry(
      drum.geometry,
      machine.customBuilders,
    );
    expect(partGeometryEntries(drumGeometry)).toHaveLength(3);
    expect(
      partGeometryEntries(drumGeometry).map(
        (geometry) => geometry.userData.mechanicaMaterialRole,
      ),
    ).toEqual(["instrument", "instrument", "instrument"]);
    expect(
      partGeometryEntries(drumGeometry)[2].userData.mechanicaSemantic,
    ).toEqual({
      kind: "paired-drumheads",
      barrelDepthReadable: true,
    });
    disposePartGeometry(drumGeometry);

    expect(chime.geometry).toMatchObject({
      type: "custom",
      builder: "odometerChime",
      params: { radius: 0.18, height: 0.27 },
    });
    const chimeGeometry = singlePartGeometry(
      buildPartGeometry(chime.geometry, machine.customBuilders),
    );
    expect(chimeGeometry.userData.mechanicaSemantic).toMatchObject({
      kind: "hanging-bell-chime",
      openMouth: true,
      mountedInstrument: true,
    });
    chimeGeometry.dispose();

    const graph = new KinematicGraph(machine.spec);
    for (const [gearId, shaftId, linkageId, body, arm] of [
      [
        "zhongpinglun",
        "zhongping-shaft",
        "trip-linkage-drum",
        lowerBody,
        lowerArm,
      ],
      [
        "shangpinglun",
        "shangping-shaft",
        "trip-linkage-chime",
        upperBody,
        upperArm,
      ],
    ] as const) {
      const shaft = part(shaftId);
      const linkage = part(linkageId);
      if (
        shaft.geometry.type !== "custom" ||
        linkage.geometry.type !== "custom" ||
        arm.geometry.type !== "custom"
      ) {
        throw new Error(`Missing visible linkage geometry for ${linkageId}`);
      }
      expect(shaft.material).toBe("iron");
      expect(linkage.material).toBe("iron");
      expect(linkage.joint).toMatchObject({
        kind: "revolute",
        axis: [0, 0, 1],
        limits: [0, 0.24],
      });
      expect(graph.ratioBetween(gearId, shaftId)).toBe(1);
      expect(linkage.position[0]).toBe(shaft.position[0]);
      expect(linkage.position[2]).toBe(shaft.position[2]);
      expect(linkage.position[2]).toBe(body.position[2]);
      expect(
        shaft.position[1] +
          shaft.geometry.params.length / 2 -
          linkage.position[1],
      ).toBeCloseTo(0.02, 6);
      expect(linkage.geometry.params.displayOffset).toBe(
        arm.geometry.type === "custom"
          ? arm.geometry.params.planeOffset
          : undefined,
      );
      const rodTop =
        linkage.position[1] +
        linkage.geometry.params.leverHeight * 2.5 +
        linkage.geometry.params.rodLength;
      const shoulderY = body.position[1] + arm.position[1];
      const rodX = linkage.position[0] - linkage.geometry.params.reach;
      const shoulderX = body.position[0] + arm.position[0];
      expect(rodTop).toBeCloseTo(shoulderY, 6);
      expect(rodX).toBeCloseTo(shoulderX, 2);
      expect(
        linkage.position[2] + linkage.geometry.params.displayOffset,
      ).toBeCloseTo(
        body.position[2] +
          (arm.geometry.type === "custom"
            ? arm.geometry.params.planeOffset
            : Number.NaN),
        6,
      );
      const strikeX =
        shoulderX + arm.geometry.params.direction * arm.geometry.params.length;
      const instrument = gearId === "zhongpinglun" ? drum : chime;
      if (instrument.geometry.type !== "custom") {
        throw new Error(`Missing struck instrument for ${linkageId}`);
      }
      expect(Math.abs(strikeX - instrument.position[0])).toBeLessThan(
        instrument.geometry.params.radius,
      );
      const shaftGeometry = buildPartGeometry(
        shaft.geometry,
        machine.customBuilders,
      );
      const shaftEntries = partGeometryEntries(shaftGeometry);
      expect(shaftEntries).toHaveLength(2);
      expect(shaftEntries[0].userData.mechanicaSemantic).toEqual({
        kind: "continuous-vertical-trip-shaft",
        gearToTripContinuity: true,
        passesThroughDecks: true,
      });
      expect(shaftEntries[1].userData.mechanicaSemantic).toEqual({
        kind: "trip-shaft-deck-collars",
        deckPassagesReadable: true,
        separatesTransmissionFromStructure: true,
      });
      expect(shaftEntries[0].userData.mechanicaMaterial.color).not.toBe(
        shaftEntries[1].userData.mechanicaMaterial.color,
      );
      const collarWorldHeights = [
        shaft.position[1] + shaft.geometry.params.collarOffsetA,
        shaft.position[1] + shaft.geometry.params.collarOffsetB,
      ];
      expect(
        collarWorldHeights.some((height) => Math.abs(height - 1.84) < 1e-9),
      ).toBe(true);
      if (shaftId === "shangping-shaft") {
        expect(
          collarWorldHeights.some((height) => Math.abs(height - 2.92) < 1e-9),
        ).toBe(true);
      }
      disposePartGeometry(shaftGeometry);
      const linkageGeometry = buildPartGeometry(
        linkage.geometry,
        machine.customBuilders,
      );
      const linkageEntries = partGeometryEntries(linkageGeometry);
      expect(linkageEntries).toHaveLength(2);
      expect(linkageEntries[0].userData.mechanicaSemantic).toEqual({
        kind: "trip-pin-and-lever",
        endpointTravelWitness: true,
        outboardDisplayPlane: linkage.geometry.params.displayOffset,
        shaftBridge: true,
        continuousPhysicalChain: true,
        visibleCausalHandoff: true,
      });
      linkageEntries[0].computeBoundingBox();
      expect(linkageEntries[0].boundingBox?.max.y).toBeGreaterThan(
        linkage.geometry.params.leverHeight * 2.5 +
          linkage.geometry.params.rodLength,
      );
      expect(linkageEntries[1].userData.mechanicaSemantic).toEqual({
        kind: "pull-rod-to-mallet",
        continuousFromLever: true,
        continuousToOutboardMallet: true,
        shoulderClevis: true,
      });
      expect(linkageEntries[1].userData.mechanicaMaterial).toMatchObject({
        color: "#d7e3df",
        emissiveIntensity: 0.08,
      });
      expect(
        linkageEntries.map(
          (geometry) => geometry.userData.mechanicaMaterialRole,
        ),
      ).toEqual(["transmission-trigger", "transmission-link"]);
      disposePartGeometry(linkageGeometry);
    }

    expect(machine.spec.collisionWhitelist).toEqual(
      expect.arrayContaining([
        ["chassis-base", "platform"],
        ["platform", "canopy-roof"],
        ["platform", "lower-figure-body"],
        ["platform", "upper-figure-body"],
        ["chassis-base", "zhongping-shaft"],
        ["platform", "zhongping-shaft"],
        ["platform", "shangping-shaft"],
        ["chassis-base", "road-transfer-witness"],
        ["xiapinglun", "guanxin-shaft-lower"],
        ["xuanfenglun", "guanxin-shaft-lower"],
        ["zhongpinglun", "guanxin-shaft-lower"],
        ["zhongpinglun", "zhongping-shaft"],
        ["xiaopinglun", "zhongping-shaft"],
        ["shangpinglun", "shangping-shaft"],
        ["zhongping-shaft", "trip-linkage-drum"],
        ["shangping-shaft", "trip-linkage-chime"],
        ["lower-figure-body", "trip-linkage-drum"],
        ["lower-figure", "trip-linkage-drum"],
        ["trip-linkage-chime", "upper-figure"],
        ["lower-figure-body", "lower-figure"],
        ["lower-figure", "drum"],
        ["upper-figure-body", "upper-figure"],
        ["upper-figure", "chime"],
        ["li-instrument-support", "drum"],
        ["ten-li-instrument-support", "chime"],
      ]),
    );
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "platform",
      "li-instrument-support",
    ]);

    const rawSpec = { ...machine.spec, collisionWhitelist: [] };
    const rawCollisions = collisionPairsAtAngle(
      { ...machine, spec: rawSpec },
      new KinematicGraph(rawSpec),
      0,
    );
    expect(rawCollisions).toContainEqual(["chassis-base", "zhongping-shaft"]);
    expect(rawCollisions).toContainEqual(["li-instrument-support", "drum"]);
    expect(rawCollisions).toContainEqual([
      "ten-li-instrument-support",
      "chime",
    ]);
    expect(rawCollisions).not.toContainEqual(["platform", "shangpinglun"]);

    const reportedAngle = 158.17919010824608;
    for (const angle of [
      reportedAngle - Math.PI / 100,
      reportedAngle,
      reportedAngle + Math.PI / 100,
    ]) {
      expect(
        collisionPairsAtAngle(
          machine,
          new KinematicGraph(machine.spec),
          angle,
        ),
      ).not.toContainEqual(["lower-figure", "li-instrument-support"]);
    }

    const filteredCollisions = collisionPairsAtAngle(
      machine,
      new KinematicGraph(machine.spec),
      0,
    );
    expect(filteredCollisions).not.toContainEqual([
      "chassis-base",
      "zhongping-shaft",
    ]);
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "platform",
      "shangpinglun",
    ]);
    expect(
      new Set(
        [lowerBody, lowerArm, part("li-instrument-support"), drum].map(
          (candidate) => JSON.stringify(candidate.explodeVector),
        ),
      ).size,
    ).toBe(4);
  });

  it("packs the recorded train inside the pavilion footprint", () => {
    const pavilion = machine.spec.parts.find((part) => part.id === "platform");
    if (pavilion?.geometry.type !== "custom") {
      throw new Error("Missing pavilion footprint");
    }
    const halfWidth = pavilion.geometry.params.width / 2;
    const halfDepth = pavilion.geometry.params.depth / 2;
    for (const id of [
      "xiapinglun",
      "xuanfenglun",
      "zhongpinglun",
      "xiaopinglun",
      "shangpinglun",
    ]) {
      const gear = machine.spec.parts.find((part) => part.id === id);
      if (gear?.geometry.type !== "gear") throw new Error(`Missing ${id}`);
      const radius = (gear.geometry.module * gear.geometry.teeth) / 2;
      expect(Math.abs(gear.position[0]) + radius).toBeLessThanOrEqual(
        halfWidth + 0.02,
      );
      expect(Math.abs(gear.position[2]) + radius).toBeLessThanOrEqual(
        halfDepth + 0.02,
      );
    }
    expect(
      machine.spec.parts.find((part) => part.id === "lilun")?.position,
    ).toEqual([0, -0.3, 0]);
    const chassis = machine.spec.parts.find(
      (part) => part.id === "chassis-base",
    );
    const xuanfenglun = machine.spec.parts.find(
      (part) => part.id === "xuanfenglun",
    );
    const xiapinglun = machine.spec.parts.find(
      (part) => part.id === "xiapinglun",
    );
    const zhongpinglun = machine.spec.parts.find(
      (part) => part.id === "zhongpinglun",
    );
    const lowerThroughShaft = machine.spec.parts.find(
      (part) => part.id === "guanxin-shaft-lower",
    );
    if (
      chassis?.geometry.type !== "custom" ||
      xiapinglun?.geometry.type !== "gear" ||
      xuanfenglun?.geometry.type !== "gear" ||
      zhongpinglun?.geometry.type !== "gear" ||
      lowerThroughShaft?.geometry.type !== "shaft"
    ) {
      throw new Error("Missing raised decimal-stage geometry");
    }
    const chassisTop = chassis.position[1] + chassis.geometry.params.height / 2;
    for (const gear of [xuanfenglun, zhongpinglun]) {
      if (gear.geometry.type !== "gear") {
        throw new Error(`Missing raised gear geometry for ${gear.id}`);
      }
      expect(
        gear.position[1] - gear.geometry.thickness / 2,
        `${gear.id} underframe clearance`,
      ).toBeGreaterThan(chassisTop);
    }
    expect(xuanfenglun.position[1]).toBe(zhongpinglun.position[1]);
    const lowerShaftMin =
      lowerThroughShaft.position[1] - lowerThroughShaft.geometry.length / 2;
    const lowerShaftMax =
      lowerThroughShaft.position[1] + lowerThroughShaft.geometry.length / 2;
    expect(lowerShaftMin).toBeLessThanOrEqual(xiapinglun.position[1]);
    expect(lowerShaftMax).toBeGreaterThanOrEqual(xuanfenglun.position[1]);
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "chassis-base",
      "zhongpinglun",
    ]);
    const roadWheelForClearance = machine.spec.parts.find(
      (part) => part.id === "zulun",
    );
    if (
      roadWheelForClearance?.geometry.type !== "wheel" ||
      xiapinglun.geometry.type !== "gear"
    ) {
      throw new Error("Missing road-wheel gear-stage clearance geometry");
    }
    const roadWheelInnerFace =
      Math.abs(roadWheelForClearance.position[1]) -
      roadWheelForClearance.geometry.width / 2;
    const lowerGearOuterRadius =
      (xiapinglun.geometry.module * (xiapinglun.geometry.teeth + 2)) / 2;
    const lowerGearOuterFace =
      Math.abs(xiapinglun.position[2]) + lowerGearOuterRadius;
    expect(lowerGearOuterFace).toBeLessThan(roadWheelInnerFace);
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "zulun",
      "xiapinglun",
    ]);
    const groupedChildParts = new Set([
      "road-transfer-witness",
      "lower-gear-witness",
      "lower-figure",
      "upper-figure",
    ]);
    for (const part of machine.spec.parts) {
      const explodeVector = part.explodeVector ?? [0, 0, 0];
      const magnitude = Math.hypot(...explodeVector);
      if (groupedChildParts.has(part.id)) {
        expect(
          magnitude,
          `${part.id} remains with its parent explode group`,
        ).toBeGreaterThan(0);
        expect(
          magnitude,
          `${part.id} bounded parent-relative explode separation`,
        ).toBeLessThan(0.15);
      } else {
        expect(
          magnitude,
          `${part.id} readable full-explode separation`,
        ).toBeGreaterThanOrEqual(0.4);
      }
      expect(
        magnitude,
        `${part.id} bounded full-explode separation`,
      ).toBeLessThan(1.65);
    }

    const explodeFor = (id: string): [number, number, number] => {
      const vector = machine.spec.parts.find(
        (part) => part.id === id,
      )?.explodeVector;
      if (!vector) throw new Error(`Missing explode vector for ${id}`);
      return vector;
    };
    const explodeGroups = [
      ["platform", "canopy-roof"],
      ["chassis-base", "drawbar"],
      ["road-axle", "zulun", "right-zulun", "lilun", "road-transfer-witness"],
      [
        "xiapinglun",
        "lower-gear-witness",
        "xuanfenglun",
        "guanxin-shaft-lower",
      ],
      [
        "zhongpinglun",
        "xiaopinglun",
        "zhongping-shaft",
        "trip-linkage-drum",
        "lower-figure-body",
        "lower-figure",
        "li-instrument-support",
        "drum",
      ],
      [
        "shangpinglun",
        "shangping-shaft",
        "trip-linkage-chime",
        "upper-figure-body",
        "upper-figure",
        "ten-li-instrument-support",
        "chime",
      ],
    ];
    const groupedIds = explodeGroups.flat();
    expect(new Set(groupedIds).size).toBe(machine.spec.parts.length);
    expect(groupedIds).toHaveLength(machine.spec.parts.length);

    const centroids = explodeGroups.map((ids) => {
      const total = ids.reduce(
        (sum, id) => {
          const vector = explodeFor(id);
          return [
            sum[0] + vector[0],
            sum[1] + vector[1],
            sum[2] + vector[2],
          ] as [number, number, number];
        },
        [0, 0, 0] as [number, number, number],
      );
      return total.map((value) => value / ids.length) as [
        number,
        number,
        number,
      ];
    });
    for (let first = 0; first < centroids.length; first += 1) {
      for (let second = first + 1; second < centroids.length; second += 1) {
        expect(
          Math.hypot(
            centroids[first][0] - centroids[second][0],
            centroids[first][1] - centroids[second][1],
            centroids[first][2] - centroids[second][2],
          ),
          `explode groups ${first + 1} and ${second + 1}`,
        ).toBeGreaterThan(0.5);
      }
    }
    expect(explodeFor("zulun")[2]).toBeLessThan(-0.8);
    expect(explodeFor("right-zulun")[2]).toBeGreaterThan(0.8);
    expect(explodeFor("trip-linkage-drum")[2]).toBeGreaterThan(0.9);
    expect(explodeFor("trip-linkage-chime")[2]).toBeLessThan(-0.9);
    expect(Math.hypot(...explodeFor("lower-figure"))).toBeLessThan(0.15);
    expect(Math.hypot(...explodeFor("upper-figure"))).toBeLessThan(0.15);

    const xiaopinglun = machine.spec.parts.find(
      (part) => part.id === "xiaopinglun",
    );
    const shangpinglun = machine.spec.parts.find(
      (part) => part.id === "shangpinglun",
    );
    const shangpingShaft = machine.spec.parts.find(
      (part) => part.id === "shangping-shaft",
    );
    if (
      xiaopinglun?.geometry.type !== "gear" ||
      shangpinglun?.geometry.type !== "gear"
    ) {
      throw new Error("Missing upper decimal gear mesh");
    }
    const upperCenterDistance = Math.hypot(
      xiaopinglun.position[0] - shangpinglun.position[0],
      xiaopinglun.position[2] - shangpinglun.position[2],
    );
    const upperPitchSum =
      (xiaopinglun.geometry.module * xiaopinglun.geometry.teeth) / 2 +
      (shangpinglun.geometry.module * shangpinglun.geometry.teeth) / 2;
    expect(upperCenterDistance - upperPitchSum).toBeGreaterThan(0);
    expect(upperCenterDistance - upperPitchSum).toBeLessThan(
      xiaopinglun.geometry.module * 0.15,
    );
    expect(shangpingShaft?.position[0]).toBe(shangpinglun.position[0]);
    expect(shangpingShaft?.position[2]).toBe(shangpinglun.position[2]);
  });

  it("sources every part and numeric geometry or range field", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));
    for (const part of machine.spec.parts) {
      expectPartCoverage(part);
      if (part.provenance.kind !== "tuice") {
        expect(sourceIds.has(part.provenance.ref), part.id).toBe(true);
      }
    }
  });

  it("links the middle and upper wheels to their striking cams", () => {
    const cams = machine.spec.constraints.filter(
      (constraint) => constraint.type === "cam",
    );
    expect(cams).toEqual([
      expect.objectContaining({
        cam: "zhongpinglun",
        follower: "trip-linkage-drum",
        liftHeight: 0.24,
      }),
      expect.objectContaining({
        cam: "zhongpinglun",
        follower: "lower-figure",
        liftHeight: 0.28,
      }),
      expect.objectContaining({
        cam: "shangpinglun",
        follower: "trip-linkage-chime",
        liftHeight: 0.24,
      }),
      expect.objectContaining({
        cam: "shangpinglun",
        follower: "upper-figure",
        liftHeight: 0.28,
      }),
    ]);

    const graph = new KinematicGraph(machine.spec);
    graph.setInput("zhongpinglun", Math.PI);
    expect(graph.state()["trip-linkage-drum"]).toBeCloseTo(0.24, 12);
    expect(graph.state()["lower-figure"]).toBeCloseTo(0.28, 12);
    graph.setInput("shangpinglun", Math.PI);
    expect(graph.state()["trip-linkage-chime"]).toBeCloseTo(0.24, 12);
    expect(graph.state()["upper-figure"]).toBeCloseTo(0.28, 12);
  });

  it("runs every mechanism trigger and emits drum and chime thresholds", () => {
    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "ten-li-spotlight",
      "drive:zulun",
      "drive:zhongpinglun",
      "drive:shangpinglun",
      "advance",
    ]);

    const spotlightGraph = new KinematicGraph(machine.spec);
    const spotlightEvents: Array<[string, string]> = [];
    let decimalStartState: Record<string, number> | undefined;
    let decimalAdvanceState: Record<string, number> | undefined;
    let decimalStrikeState: Record<string, number> | undefined;
    let raisedLinkage = 0;
    let raisedMallet = 0;
    let raisedMalletState: Record<string, number> | undefined;
    machine.mechanism?.triggers
      .find((trigger) => trigger.id === "spotlight")
      ?.run(spotlightGraph, (type, part) => {
        spotlightEvents.push([type, part]);
        const state = captureSpotlightState(
          machine.spec,
          spotlightGraph.state(),
          type,
          part,
        );
        if (type === "transmission:advance") {
          decimalAdvanceState = state;
        }
        if (type === "odometer:readout" && part === "0.99-li") {
          decimalStartState = state;
        }
        if (type === "mallet:raise") {
          if (part === "trip-linkage-drum") {
            raisedLinkage = state[part];
          }
          if (part === "lower-figure") {
            raisedMallet = state[part];
            raisedMalletState = state;
          }
        }
        if (type === "drum") decimalStrikeState = state;
      });
    expect(spotlightEvents).toEqual([
      ["camera:focus", "xuanfenglun"],
      ["highlight:on", "xuanfenglun"],
      ["highlight:on", "zhongpinglun"],
      ["odometer:readout", "0.99-li"],
      ["drive:slow", "zulun"],
      ["odometer:update", "0.1"],
      ["transmission:advance", "xuanfenglun"],
      ["odometer:update", "0.5"],
      ["mallet:raise", "trip-linkage-drum"],
      ["mallet:raise", "lower-figure"],
      ["odometer:update", "1.0"],
      ["drum", "lower-figure"],
      ["odometer:readout", "1.00-li"],
      ["source", "songshi-ludaolong"],
      ["highlight:off", "xuanfenglun"],
      ["highlight:off", "zhongpinglun"],
      ["spotlight:done", "odometer"],
    ]);
    expect(decimalAdvanceState?.zulun).toBeCloseTo(99.25 * Math.PI * 2, 12);
    for (const id of ["road-axle", "lilun"] as const) {
      expect(
        (decimalAdvanceState?.[id] ?? Number.NaN) -
          (decimalStartState?.[id] ?? Number.NaN),
      ).toBeCloseTo(Math.PI / 2, 12);
    }
    for (const id of ["xiapinglun", "guanxin-shaft-lower"] as const) {
      expect(
        (decimalAdvanceState?.[id] ?? Number.NaN) -
          (decimalStartState?.[id] ?? Number.NaN),
      ).toBeCloseTo(-Math.PI / 6, 12);
    }
    expect(decimalAdvanceState?.xuanfenglun).toBeCloseTo(
      (-99.25 / 3) * Math.PI * 2,
      12,
    );
    expect(raisedLinkage).toBeCloseTo(0.24, 12);
    expect(raisedMallet).toBeCloseTo(0.28, 12);
    expect(decimalStartState?.["lower-figure"]).toBeLessThan(0.001);
    expect(raisedMalletState?.["lower-figure"]).toBeCloseTo(0.28, 12);
    expect(decimalStrikeState?.["lower-figure"]).toBeCloseTo(0, 12);
    expect(decimalStrikeState?.["lower-figure-body"]).toBeCloseTo(0.14, 12);
    expect(decimalStrikeState?.drum).toBeCloseTo(0.16, 12);
    expect(spotlightGraph.state().zhongpinglun).toBeCloseTo(Math.PI * 2, 12);
    expect(spotlightGraph.state()["lower-figure-body"]).toBeCloseTo(0.14, 12);
    expect(spotlightGraph.state().drum).toBeCloseTo(0.16, 12);

    const tenLiSpotlight = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "ten-li-spotlight",
    );
    const tenLiSpotlightGraph = new KinematicGraph(machine.spec);
    const tenLiSpotlightEvents: Array<[string, string]> = [];
    let upperStartState: Record<string, number> | undefined;
    let upperAdvanceState: Record<string, number> | undefined;
    let upperStrikeState: Record<string, number> | undefined;
    let raisedChimeLinkage = 0;
    let raisedChimeMallet = 0;
    let raisedChimeMalletState: Record<string, number> | undefined;
    tenLiSpotlight?.run(tenLiSpotlightGraph, (type, part) => {
      tenLiSpotlightEvents.push([type, part]);
      const state = captureSpotlightState(
        machine.spec,
        tenLiSpotlightGraph.state(),
        type,
        part,
      );
      if (type === "odometer:readout" && part === "9.99-li") {
        upperStartState = state;
      }
      if (type === "transmission:advance") upperAdvanceState = state;
      if (type === "mallet:raise" && part === "trip-linkage-chime") {
        raisedChimeLinkage = state[part];
      }
      if (type === "mallet:raise" && part === "upper-figure") {
        raisedChimeMallet = state[part];
        raisedChimeMalletState = state;
      }
      if (type === "chime") upperStrikeState = state;
    });
    expect(tenLiSpotlightEvents).toEqual([
      ["camera:focus", "shangpinglun"],
      ["highlight:on", "xiaopinglun"],
      ["highlight:on", "shangpinglun"],
      ["highlight:on", "trip-linkage-chime"],
      ["odometer:readout", "9.99-li"],
      ["drive:slow", "zulun"],
      ["odometer:update", "1.0"],
      ["transmission:advance", "xiaopinglun"],
      ["odometer:update", "5.0"],
      ["mallet:raise", "trip-linkage-chime"],
      ["mallet:raise", "upper-figure"],
      ["odometer:update", "10.0"],
      ["drum", "lower-figure"],
      ["chime", "upper-figure"],
      ["odometer:readout", "10.00-li"],
      ["source", "songshi-ludaolong"],
      ["highlight:off", "xiaopinglun"],
      ["highlight:off", "shangpinglun"],
      ["highlight:off", "trip-linkage-chime"],
      ["spotlight:done", "odometer"],
    ]);
    expect(upperAdvanceState?.zulun).toBeCloseTo(999.25 * Math.PI * 2, 12);
    for (const id of ["road-axle", "lilun"] as const) {
      expect(
        (upperAdvanceState?.[id] ?? Number.NaN) -
          (upperStartState?.[id] ?? Number.NaN),
      ).toBeCloseTo(Math.PI / 2, 12);
    }
    for (const id of ["xiapinglun", "guanxin-shaft-lower"] as const) {
      expect(
        (upperAdvanceState?.[id] ?? Number.NaN) -
          (upperStartState?.[id] ?? Number.NaN),
      ).toBeCloseTo(-Math.PI / 6, 12);
    }
    expect(upperAdvanceState?.xiaopinglun).toBeCloseTo(
      (999.25 / 100) * Math.PI * 2,
      12,
    );
    expect(raisedChimeLinkage).toBeCloseTo(0.24, 12);
    expect(raisedChimeMallet).toBeCloseTo(0.28, 12);
    expect(upperStartState?.["upper-figure"]).toBeLessThan(0.001);
    expect(raisedChimeMalletState?.["upper-figure"]).toBeCloseTo(0.28, 12);
    expect(upperStrikeState?.["upper-figure"]).toBeCloseTo(0, 12);
    expect(upperStrikeState?.["upper-figure-body"]).toBeCloseTo(0.18, 12);
    expect(upperStrikeState?.chime).toBeCloseTo(0.35, 12);
    expect(tenLiSpotlightGraph.state().shangpinglun).toBeCloseTo(
      -Math.PI * 2,
      12,
    );
    expect(tenLiSpotlightGraph.state()["upper-figure-body"]).toBeCloseTo(
      0.18,
      12,
    );
    expect(tenLiSpotlightGraph.state().chime).toBeCloseTo(0.35, 12);

    const advance = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "advance",
    );
    const oneLiGraph = new KinematicGraph(machine.spec);
    const oneLiEvents: Array<[string, string]> = [];
    advance?.run(oneLiGraph, (type, part) => oneLiEvents.push([type, part]), 1);
    expect(oneLiEvents).toEqual([
      ["drive", "zulun"],
      ["odometer:update", "1.00"],
      ["drum", "lower-figure"],
    ]);

    const tenLiGraph = new KinematicGraph(machine.spec);
    const tenLiEvents: Array<[string, string]> = [];
    advance?.run(
      tenLiGraph,
      (type, part) => tenLiEvents.push([type, part]),
      10,
    );
    expect(tenLiEvents).toEqual([
      ["drive", "zulun"],
      ["odometer:update", "10.00"],
      ...Array.from({ length: 10 }, () => ["drum", "lower-figure"]),
      ["chime", "upper-figure"],
    ]);

    const drag = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "drive:zulun",
    );
    const dragGraph = new KinematicGraph(machine.spec);
    const dragEvents: Array<[string, string]> = [];
    drag?.run(
      dragGraph,
      (type, part) => dragEvents.push([type, part]),
      Math.PI * 2,
    );
    expect(dragEvents).toEqual([["odometer:update", "0.01"]]);

    const middleDrag = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "drive:zhongpinglun",
    );
    const middleGraph = new KinematicGraph(machine.spec);
    const middleEvents: Array<[string, string]> = [];
    middleDrag?.run(
      middleGraph,
      (type, part) => middleEvents.push([type, part]),
      Math.PI * 2,
    );
    expect(middleEvents).toEqual([
      ["odometer:update", "1.00"],
      ["drum", "lower-figure"],
    ]);

    const upperDrag = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "drive:shangpinglun",
    );
    const upperGraph = new KinematicGraph(machine.spec);
    const upperEvents: Array<[string, string]> = [];
    upperDrag?.run(
      upperGraph,
      (type, part) => upperEvents.push([type, part]),
      Math.PI * 2,
    );
    expect(upperEvents).toEqual([
      ["odometer:update", "10.00"],
      ...Array.from({ length: 10 }, () => ["drum", "lower-figure"]),
      ["chime", "upper-figure"],
    ]);
  });
});
