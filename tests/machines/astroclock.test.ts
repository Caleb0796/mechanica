import { describe, expect, it } from "vitest";
import * as THREE from "three";

import machine from "../../src/machines/astroclock/build";
import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";
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

function maxPositionDelta(before: number[], after: number[]): number {
  let max = 0;
  for (let index = 0; index < before.length; index += 3) {
    max = Math.max(
      max,
      Math.hypot(
        after[index] - before[index],
        after[index + 1] - before[index + 1],
        after[index + 2] - before[index + 2],
      ),
    );
  }
  return max;
}

function geometryIntersectsBox(
  geometry: THREE.BufferGeometry,
  box: THREE.Box3,
): boolean {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const triangle = new THREE.Triangle();
  const vertex = (target: THREE.Vector3, offset: number) => {
    const vertexIndex = index ? index.getX(offset) : offset;
    target.set(
      position.getX(vertexIndex),
      position.getY(vertexIndex),
      position.getZ(vertexIndex),
    );
  };
  const count = index?.count ?? position.count;
  for (let offset = 0; offset + 2 < count; offset += 3) {
    vertex(triangle.a, offset);
    vertex(triangle.b, offset + 1);
    vertex(triangle.c, offset + 2);
    if (box.intersectsTriangle(triangle)) return true;
  }
  return false;
}

function boxAround(
  position: [number, number, number],
  size = 0.24,
): THREE.Box3 {
  return new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(...position),
    new THREE.Vector3(size, size, size),
  );
}

function trigger(id: string) {
  const found = machine.mechanism?.triggers.find(
    (candidate) => candidate.id === id,
  );
  expect(found, `missing trigger ${id}`).toBeDefined();
  return found!;
}

function buildCustomPart(id: string) {
  const part = machine.spec.parts.find((candidate) => candidate.id === id);
  expect(part, `missing part ${id}`).toBeDefined();
  if (!part || part.geometry.type !== "custom") {
    throw new Error(`${id} is not custom geometry`);
  }
  const builder = machine.customBuilders?.[part.geometry.builder];
  expect(builder, `missing builder ${part.geometry.builder}`).toBeDefined();
  if (!builder) throw new Error(`missing builder ${part.geometry.builder}`);
  return builder(part.geometry.params);
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
    expect(machine.spec.parts).toHaveLength(87);
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
    for (const builder of [
      "astroclockWaterCircuitLinks",
      "astroclockEscapementLinks",
      "astroclockCelestialTransmissionLinks",
      "astroclockReportingDriveLinks",
      "astroclockReportingCam",
      "astroclockWaterIndicator",
    ]) {
      expect(machine.customBuilders).toHaveProperty(builder);
    }
    expect(machine.spec.collisionWhitelist).toContainEqual([
      "tower-shell",
      "chime-tier-1",
    ]);
    expect(machine.spec.collisionWhitelist).toContainEqual([
      "tower-shell",
      "chime-tier-2",
    ]);
    expect(machine.spec.collisionWhitelist).toContainEqual([
      "tower-shell",
      "chime-tier-3",
    ]);
    expect(machine.spec.collisionWhitelist).toContainEqual([
      "tower-shell",
      "chime-tier-4",
    ]);
    expect(machine.spec.collisionWhitelist).toContainEqual([
      "tower-shell",
      "chime-tier-5",
    ]);
    expect(machine.spec.collisionWhitelist).not.toContainEqual([
      "tower-shell",
      "celestial-globe",
    ]);
    expect(machine.spec.collisionWhitelist).toContainEqual([
      "shulun",
      "celestial-column",
    ]);
    expect(
      [
        "water-reservoir",
        "constant-level-tank",
        "armillary-sphere",
        "water-circuit-links",
        "escapement-linkage",
        "celestial-transmission-links",
        "reporting-drive-links",
        "water-flow-indicator",
        "loaded-scoop-indicator",
      ].every(
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

  it("builds an open tiered tower and recognizable jack silhouettes", () => {
    expect(machine.customBuilders).toHaveProperty("astroclockJackBay");
    expect(machine.customBuilders).toHaveProperty("astroclockJackFigure");

    const towerBuilt = buildCustomPart("tower-shell");
    expect(Array.isArray(towerBuilt)).toBe(true);
    const tower = Array.isArray(towerBuilt) ? towerBuilt : [towerBuilt];
    expect(tower.map((geometry) => geometry.userData.mechanicaSemantic)).toEqual([
      "subordinate-open-timber-pavilion-with-hipped-roof",
      "faded-rear-cutaway-panels",
    ]);
    expect(tower).toHaveLength(2);
    expect(tower.length).toBeLessThanOrEqual(4);
    expect(
      tower.flatMap(
        (geometry) => geometry.userData.mechanicaSemanticLayers as string[],
      ),
    ).toEqual([
      "open-timber-frame",
      "stacked-storey-eaves",
      "hipped-pavilion-roof",
      "open-south-cutaway",
    ]);
    expect(
      new Set(
        tower.map(
          (geometry) => geometry.userData.mechanicaMaterial?.color as string,
        ),
      ).size,
    ).toBe(2);
    const vesselEnvelopes: Array<[string, THREE.Box3]> = [
      [
        "water-reservoir",
        new THREE.Box3(
          new THREE.Vector3(-3.15, 3.1, -1.15),
          new THREE.Vector3(-1.35, 3.8, 0.05),
        ),
      ],
      [
        "constant-level-tank",
        new THREE.Box3(
          new THREE.Vector3(-2.25, 2.125, -0.9),
          new THREE.Vector3(-1.05, 2.575, 0),
        ),
      ],
    ];
    for (const [id, envelope] of vesselEnvelopes) {
      expect(
        tower.some((geometry) => geometryIntersectsBox(geometry, envelope)),
        id,
      ).toBe(false);
    }
    const returnConduitCorridors: Array<[string, THREE.Box3]> = [
      [
        "lower-return-elbow",
        new THREE.Box3(
          new THREE.Vector3(-3.04, -3.68, -1.63),
          new THREE.Vector3(-2.17, -3.48, 0.43),
        ),
      ],
      [
        "interior-return-riser",
        new THREE.Box3(
          new THREE.Vector3(-2.34, -3.64, -1.64),
          new THREE.Vector3(-2.16, 3.06, -1.46),
        ),
      ],
      [
        "upper-reservoir-elbow",
        new THREE.Box3(
          new THREE.Vector3(-2.34, 2.9, -1.63),
          new THREE.Vector3(-2.16, 3.08, -0.47),
        ),
      ],
    ];
    for (const [id, corridor] of returnConduitCorridors) {
      expect(
        tower.some((geometry) => geometryIntersectsBox(geometry, corridor)),
        id,
      ).toBe(false);
    }
    const towerPart = machine.spec.parts.find(
      (part) => part.id === "tower-shell",
    )!;
    const armillaryPart = machine.spec.parts.find(
      (part) => part.id === "armillary-sphere",
    )!;
    const armillaryOffset = new THREE.Vector3(...armillaryPart.position).sub(
      new THREE.Vector3(...towerPart.position),
    );
    const armillaryBuilt = buildCustomPart("armillary-sphere");
    const armillary = Array.isArray(armillaryBuilt)
      ? armillaryBuilt
      : [armillaryBuilt];
    for (const geometry of armillary) {
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
      const envelope = geometry.boundingBox!.clone().translate(armillaryOffset);
      expect(
        tower.some((towerGeometry) =>
          geometryIntersectsBox(towerGeometry, envelope),
        ),
        geometry.userData.mechanicaSemantic as string,
      ).toBe(false);
      geometry.dispose();
    }
    for (const geometry of tower) {
      expect(geometry.getAttribute("position").count).toBeGreaterThan(0);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox).not.toBeNull();
      geometry.dispose();
    }

    const bays = machine.spec.parts.filter((part) =>
      part.id.startsWith("chime-tier-"),
    );
    expect(bays).toHaveLength(5);
    expect(bays.map((part) => part.position[2])).toEqual([
      3.65,
      3.48,
      3.3,
      3.12,
      2.94,
    ]);
    expect(
      bays.every(
        (part) =>
          part.geometry.type === "custom" &&
          part.geometry.builder === "astroclockJackBay" &&
          part.geometry.params.height === 1.08 &&
          part.geometry.params.depth === 0.86,
      ),
    ).toBe(true);
    expect(
      bays.map((part) =>
        part.geometry.type === "custom" ? part.geometry.params.tier : null,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
    const bayBuilt = buildCustomPart("chime-tier-1");
    const bay = Array.isArray(bayBuilt) ? bayBuilt : [bayBuilt];
    expect(bay.map((geometry) => geometry.userData.mechanicaSemantic)).toEqual([
      "jack-bay-deck",
      "jack-bay-eave",
      "bell-reporting-station",
    ]);
    bay.forEach((geometry) => geometry.dispose());
    expect(
      bays.map((part) => {
        const built = buildCustomPart(part.id);
        const geometries = Array.isArray(built) ? built : [built];
        const semantic = geometries[2].userData.mechanicaSemantic;
        geometries.forEach((geometry) => geometry.dispose());
        return semantic;
      }),
    ).toEqual([
      "bell-reporting-station",
      "drum-reporting-station",
      "gong-reporting-station",
      "chime-reporting-station",
      "placard-reporting-station",
    ]);

    const jacks = machine.spec.parts.filter((part) =>
      part.id.startsWith("jack-"),
    );
    expect(jacks).toHaveLength(11);
    expect(
      jacks.every(
        (part) =>
          part.geometry.type === "custom" &&
          part.geometry.builder === "astroclockJackFigure" &&
          part.geometry.params.height === 0.96 &&
          part.geometry.params.shoulderWidth === 0.54 &&
          part.geometry.params.depth === 0.24,
      ),
    ).toBe(true);
    expect(jacks.map((part) => part.position)).toEqual([
      [-0.45, 0.43, 0.16],
      [0.45, 0.43, 0.16],
      [-0.45, 0.43, 0.16],
      [0.45, 0.43, 0.16],
      [-0.45, 0.43, 0.16],
      [0.45, 0.43, 0.16],
      [-0.72, 0.43, 0.16],
      [0, 0.43, 0.16],
      [0.72, 0.43, 0.16],
      [-0.45, 0.43, 0.16],
      [0.45, 0.43, 0.16],
    ]);
    const jackBuilt = buildCustomPart("jack-01");
    expect(Array.isArray(jackBuilt)).toBe(true);
    const jack = Array.isArray(jackBuilt) ? jackBuilt : [jackBuilt];
    expect(jack.map((geometry) => geometry.userData.mechanicaSemantic)).toEqual([
      "human-reporting-jack-silhouette",
      "mounted-reporting-jack-mallet",
    ]);
    for (const [index, geometry] of jack.entries()) {
      expect(geometry.userData.mechanicaUpdate).toBeTypeOf("function");
      const restPositions = Array.from(
        geometry.getAttribute("position").array as ArrayLike<number>,
      );
      geometry.userData.mechanicaUpdate(1);
      const movedPositions = Array.from(
        geometry.getAttribute("position").array as ArrayLike<number>,
      );
      expect(maxPositionDelta(restPositions, movedPositions)).toBeGreaterThan(
        index === 0 ? 0.25 : 0.3,
      );
      expect(geometry.userData.mechanicaAnimation.currentStateRad).toBe(1);
      geometry.userData.mechanicaUpdate(0);
      expect(
        Array.from(
          geometry.getAttribute("position").array as ArrayLike<number>,
        ),
      ).toEqual(restPositions);
    }
    const figure = jack[0];
    figure.computeBoundingBox();
    expect(figure.boundingBox).not.toBeNull();
    expect(
      figure.boundingBox!.max.x - figure.boundingBox!.min.x,
    ).toBeGreaterThan(0.55);
    expect(
      figure.boundingBox!.max.y - figure.boundingBox!.min.y,
    ).toBeGreaterThan(0.84);
    jack.forEach((geometry) => geometry.dispose());
  });

  it("builds a legible water-to-sky mechanism inside the pavilion", () => {
    for (const builder of [
      "astroclockCelestialColumn",
      "astroclockReportingDrum",
      "astroclockNoriaWheel",
      "astroclockWaterVessel",
      "astroclockEscapementPart",
      "astroclockWaterCircuitLinks",
      "astroclockEscapementLinks",
      "astroclockCelestialTransmissionLinks",
      "astroclockReportingDriveLinks",
      "astroclockReportingCam",
      "astroclockWaterIndicator",
    ]) {
      expect(machine.customBuilders).toHaveProperty(builder);
    }

    const armillaryBuilt = buildCustomPart("armillary-sphere");
    const armillary = Array.isArray(armillaryBuilt)
      ? armillaryBuilt
      : [armillaryBuilt];
    expect(
      armillary.map((geometry) => geometry.userData.mechanicaSemantic),
    ).toEqual([
      "nested-armillary-rings",
      "celestial-globe",
      "armillary-yoke-and-sighting-tube",
      "amplified-armillary-output-witness",
    ]);
    const motionWitness = armillary[3];
    expect(motionWitness.userData.mechanicaUpdate).toBeTypeOf("function");
    const witnessRestPositions = Array.from(
      motionWitness.getAttribute("position").array as ArrayLike<number>,
    );
    motionWitness.userData.mechanicaUpdate((Math.PI * 2) / 36);
    expect(
      Array.from(
        motionWitness.getAttribute("position").array as ArrayLike<number>,
      ),
    ).not.toEqual(witnessRestPositions);
    expect(
      maxPositionDelta(
        witnessRestPositions,
        Array.from(
          motionWitness.getAttribute("position").array as ArrayLike<number>,
        ),
      ),
    ).toBeGreaterThan(0.8);
    motionWitness.userData.mechanicaUpdate(0);
    expect(
      Array.from(
        motionWitness.getAttribute("position").array as ArrayLike<number>,
      ),
    ).toEqual(witnessRestPositions);
    armillary.forEach((geometry) => geometry.dispose());

    const columnBuilt = buildCustomPart("celestial-column");
    const column = Array.isArray(columnBuilt) ? columnBuilt : [columnBuilt];
    expect(
      column.map((geometry) => geometry.userData.mechanicaSemantic),
    ).toEqual(["celestial-column-shaft", "column-bearings-and-takeoffs"]);
    column.forEach((geometry) => geometry.dispose());

    const reportingDrumBuilt = buildCustomPart("day-night-wheel");
    const reportingDrum = Array.isArray(reportingDrumBuilt)
      ? reportingDrumBuilt[0]
      : reportingDrumBuilt;
    expect(reportingDrum.userData.mechanicaSemantic).toBe(
      "six-register-reporting-drum",
    );
    expect(
      geometryIntersectsBox(
        reportingDrum,
        new THREE.Box3(
          new THREE.Vector3(-0.55, -0.09, -0.55),
          new THREE.Vector3(0.55, 0.09, 0.55),
        ),
      ),
    ).toBe(false);
    reportingDrum.dispose();

    const noriaBuilt = buildCustomPart("water-lift-wheel");
    const noria = Array.isArray(noriaBuilt) ? noriaBuilt : [noriaBuilt];
    expect(noria.map((geometry) => geometry.userData.mechanicaSemantic)).toEqual([
      "water-lift-noria-wheel",
      "noria-lifting-pots",
    ]);
    noria.forEach((geometry) => geometry.dispose());

    const waterParts = [
      "water-trough",
      "water-reservoir",
      "constant-level-tank",
    ].map((id) => machine.spec.parts.find((part) => part.id === id)!);
    expect(waterParts.map((part) => part.position[0])).toEqual([
      -2.25,
      -2.25,
      -1.65,
    ]);
    expect(waterParts.map((part) => part.position[1])).toEqual([
      0.95,
      9.45,
      8.35,
    ]);
    expect(
      waterParts.every(
        (part) =>
          part.geometry.type === "custom" &&
          part.geometry.builder === "astroclockWaterVessel",
      ),
    ).toBe(true);
    for (const part of waterParts) {
      const built = buildCustomPart(part.id);
      const geometries = Array.isArray(built) ? built : [built];
      expect(geometries).toHaveLength(2);
      expect(geometries[1].userData.mechanicaSemantic).toBe(
        "visible-water-surface",
      );
      geometries.forEach((geometry) => geometry.dispose());
    }

    const escapementIds = [
      "gecha",
      "guanshe",
      "tianguan",
      "tiansuo-l",
      "tiansuo-r",
    ];
    expect(
      escapementIds.map((id) => {
        const built = buildCustomPart(id);
        const geometries = Array.isArray(built) ? built : [built];
        const semantic = geometries[0].userData.mechanicaSemantic;
        geometries.forEach((geometry) => geometry.dispose());
        return semantic;
      }),
    ).toEqual([
      "regulating-fork",
      "release-tongue",
      "celestial-gate-yoke",
      "left-celestial-lock",
      "right-celestial-lock",
    ]);

    const shulun = machine.spec.parts.find((part) => part.id === "shulun")!;
    const columnPart = machine.spec.parts.find(
      (part) => part.id === "celestial-column",
    )!;
    const noriaPart = machine.spec.parts.find(
      (part) => part.id === "water-lift-wheel",
    )!;
    expect(shulun.geometry).toMatchObject({
      type: "wheel",
      radius: 1.716,
      spokes: 72,
    });
    expect(columnPart.geometry).toMatchObject({
      type: "custom",
      params: { radius: 0.12, length: 6.084 },
    });
    expect(noriaPart.geometry).toMatchObject({
      type: "custom",
      params: { radius: 0.8735, width: 0.16, spokes: 12 },
    });
    expect(noriaPart.position).toEqual([-1.85, 2.25, 0.35]);
    expect(noriaPart.position[0] - (0.8735 + 0.12)).toBeGreaterThan(-3);
    expect(
      machine.spec.parts.find((part) => part.id === "hour-drum-wheel")
        ?.geometry,
    ).toMatchObject({
      type: "gear",
      module: 0.0034833333333333335,
      teeth: 600,
    });
    for (const id of ["celestial-ladder-lower", "celestial-globe"]) {
      expect(
        machine.spec.parts.find((part) => part.id === id)?.geometry,
      ).toMatchObject({
        type: "wheel",
        radius: 0.35,
      });
    }

    const semanticGroups = new Map<string, string[]>([
      [
        "water-circuit-links",
        [
          "continuous-reservoir-tank-scoop-wheel-water-path",
          "water-arrival-flow-markers",
        ],
      ],
      [
        "escapement-linkage",
        [
          "open-escapement-bearing-cradle",
          "scoop-gecha-guanshe-tianguan-tiansuo-handoff-rods",
          "five-stage-escapement-pivots",
          "tiansuo-to-celestial-column-rising-link",
        ],
      ],
      [
        "celestial-transmission-links",
        [
          "shulun-column-hour-day-ladder-armillary-handoffs",
          "visible-celestial-ladder-chain",
          "amplified-vertical-transmission-witness",
          "column-to-armillary-output-witness",
        ],
      ],
      [
        "reporting-drive-links",
        [
          "vertical-spine-to-five-tier-reporting-camshaft",
          "cam-to-jack-and-placard-output-rods",
          "amplified-reporting-handoff-witness",
        ],
      ],
    ]);
    for (const [id, expectedSemantics] of semanticGroups) {
      const built = buildCustomPart(id);
      const geometries = Array.isArray(built) ? built : [built];
      expect(geometries.length, id).toBeLessThanOrEqual(4);
      expect(
        geometries.map((geometry) => geometry.userData.mechanicaSemantic),
        id,
      ).toEqual(expectedSemantics);
      const animatedIndexes =
        id === "escapement-linkage"
          ? [3]
          : id === "celestial-transmission-links"
            ? [1, 2, 3]
            : id === "reporting-drive-links"
              ? [1, 2]
              : [];
      for (const geometryIndex of animatedIndexes) {
        const animated = geometries[geometryIndex];
        expect(animated.userData.mechanicaUpdate).toBeTypeOf("function");
        const restPositions = Array.from(
          animated.getAttribute("position").array as ArrayLike<number>,
        );
        animated.userData.mechanicaUpdate(1);
        const movedPositions = Array.from(
          animated.getAttribute("position").array as ArrayLike<number>,
        );
        expect(
          maxPositionDelta(restPositions, movedPositions),
          `${id} geometry ${geometryIndex}`,
        ).toBeGreaterThan(0.35);
        animated.userData.mechanicaUpdate(0);
        expect(
          Array.from(
            animated.getAttribute("position").array as ArrayLike<number>,
          ),
        ).toEqual(restPositions);
      }
      for (const geometry of geometries) {
        expect(geometry.getAttribute("position").count, id).toBeGreaterThan(0);
        geometry.computeBoundingBox();
        expect(geometry.boundingBox, id).not.toBeNull();
        geometry.dispose();
      }
    }

    const escapementBuilt = buildCustomPart("escapement-linkage");
    const escapement = Array.isArray(escapementBuilt)
      ? escapementBuilt
      : [escapementBuilt];
    const handoffRods = escapement[1];
    expect(handoffRods.userData.mechanicaHandoffAnchors).toEqual([
      "scoop-01",
      "gecha",
      "guanshe",
      "tianguan",
      "tiansuo-l",
      "tiansuo-r",
    ]);
    for (const anchor of [
      [1.84, -1.5, 0.32],
      [-1.05, -2, 1.48],
      [0, -1.9, 1.62],
      [1.05, -2, 1.48],
      [-0.58, -1.15, 1.5],
      [0.58, -1.15, 1.5],
    ] as Array<[number, number, number]>) {
      expect(geometryIntersectsBox(handoffRods, boxAround(anchor))).toBe(true);
    }
    const spineHandoff = escapement[3];
    expect(spineHandoff.userData.mechanicaHandoffAnchors).toEqual([
      "tiansuo-l",
      "tiansuo-r",
      "celestial-column",
    ]);
    for (const anchor of [
      [-0.58, -1.15, 1.5],
      [0.58, -1.15, 1.5],
      [1.46, -1.15, 0.34],
    ] as Array<[number, number, number]>) {
      expect(geometryIntersectsBox(spineHandoff, boxAround(anchor))).toBe(true);
    }
    const spineStart = Array.from(
      spineHandoff.getAttribute("position").array as ArrayLike<number>,
    );
    spineHandoff.userData.mechanicaUpdate(-0.45);
    const spineLoaded = Array.from(
      spineHandoff.getAttribute("position").array as ArrayLike<number>,
    );
    spineHandoff.userData.mechanicaUpdate(-1);
    const spineYielded = Array.from(
      spineHandoff.getAttribute("position").array as ArrayLike<number>,
    );
    spineHandoff.userData.mechanicaUpdate(1);
    const spineReleased = Array.from(
      spineHandoff.getAttribute("position").array as ArrayLike<number>,
    );
    expect(maxPositionDelta(spineStart, spineLoaded)).toBeGreaterThan(0.15);
    expect(spineLoaded).not.toEqual(spineYielded);
    expect(spineYielded).not.toEqual(spineReleased);
    spineHandoff.userData.mechanicaUpdate(0);
    expect(
      Array.from(
        spineHandoff.getAttribute("position").array as ArrayLike<number>,
      ),
    ).toEqual(spineStart);
    escapement.forEach((geometry) => geometry.dispose());

    const celestialBuilt = buildCustomPart("celestial-transmission-links");
    const celestial = Array.isArray(celestialBuilt)
      ? celestialBuilt
      : [celestialBuilt];
    expect(celestial[0].userData.mechanicaHandoffAnchors).toEqual([
      "shulun",
      "celestial-column",
      "hour-drum-wheel",
      "day-night-wheel",
      "celestial-ladder-lower",
      "celestial-globe",
      "armillary-sphere",
    ]);
    for (const anchor of [
      [1.44, -1.15, 0.34],
      [1.41, 0.55, 0.3],
      [-0.55, 0.7, 0.55],
      [1.55, 2.15, 0.44],
      [1.55, 3.66, 0.72],
      [0.42, 4.4, 0.3],
    ] as Array<[number, number, number]>) {
      expect(geometryIntersectsBox(celestial[0], boxAround(anchor))).toBe(true);
    }
    celestial.forEach((geometry) => geometry.dispose());

    const reportingBuilt = buildCustomPart("reporting-drive-links");
    const reporting = Array.isArray(reportingBuilt)
      ? reportingBuilt
      : [reportingBuilt];
    expect(reporting[0].userData.mechanicaHandoffAnchors).toEqual([
      "celestial-column",
      "tier-cam-1",
      "tier-cam-2",
      "tier-cam-3",
      "tier-cam-4",
      "tier-cam-5",
    ]);
    reporting[0].computeBoundingBox();
    expect(
      geometryIntersectsBox(reporting[0], boxAround([1.55, -1.15, 0.37])),
    ).toBe(true);
    expect(reporting[0].boundingBox!.min.y).toBeLessThan(-4.7);
    expect(reporting[0].boundingBox!.max.y).toBeGreaterThan(3.3);
    reporting[1].computeBoundingBox();
    expect(reporting[1].boundingBox!.min.x).toBeLessThan(-1.35);
    expect(reporting[1].boundingBox!.max.x).toBeGreaterThan(1.3);
    reporting.forEach((geometry) => geometry.dispose());

    const waterFlowBuilt = buildCustomPart("water-flow-indicator");
    const waterFlow = Array.isArray(waterFlowBuilt)
      ? waterFlowBuilt[0]
      : waterFlowBuilt;
    expect(waterFlow.userData.mechanicaSemantic).toBe("descending-water-pulse");
    expect(waterFlow.userData.mechanicaMaterialRole).toBe("working-fluid");
    expect(waterFlow.userData.mechanicaMaterial).toMatchObject({
      color: "#5ee4ff",
      depthWrite: true,
      emissiveIntensity: 1.3,
      opacity: 1,
      textureVariant: "none",
      transparent: false,
    });
    expect(waterFlow.userData.mechanicaUpdate).toBeTypeOf("function");
    waterFlow.computeBoundingBox();
    const collapsedStreamSize = waterFlow.boundingBox!.getSize(
      new THREE.Vector3(),
    );
    waterFlow.userData.mechanicaUpdate(3);
    const fullStreamSize = waterFlow.boundingBox!.getSize(new THREE.Vector3());
    expect(fullStreamSize.x).toBeGreaterThan(3.4);
    expect(fullStreamSize.y).toBeGreaterThan(3.2);
    expect(fullStreamSize.x).toBeGreaterThan(collapsedStreamSize.x * 10);
    expect(fullStreamSize.y).toBeGreaterThan(collapsedStreamSize.y * 10);
    expect(fullStreamSize.z).toBeGreaterThan(0.8);

    const flowPart = machine.spec.parts.find(
      (part) => part.id === "water-flow-indicator",
    )!;
    const flowPosition = new THREE.Vector3(...flowPart.position).addScaledVector(
      new THREE.Vector3(...flowPart.joint!.axis),
      3,
    );
    const fullStreamBounds = waterFlow.boundingBox!.clone().translate(
      flowPosition,
    );
    const shulunPart = machine.spec.parts.find(
      (part) => part.id === "shulun",
    )!;
    const scoopPart = machine.spec.parts.find(
      (part) => part.id === "scoop-01",
    )!;
    const scoopWorldPosition = new THREE.Vector3(...scoopPart.position)
      .applyEuler(new THREE.Euler(...shulunPart.rotationEuler!))
      .add(new THREE.Vector3(...shulunPart.position));
    expect(fullStreamBounds.distanceToPoint(scoopWorldPosition)).toBeLessThan(
      0.18,
    );
    expect(fullStreamBounds.max.z).toBeGreaterThan(0.8);

    const streamPosition = waterFlow.getAttribute("position");
    const scoopEndBounds = new THREE.Box3();
    for (let index = 0; index < streamPosition.count; index += 1) {
      if (streamPosition.getX(index) > 3.2) {
        scoopEndBounds.expandByPoint(
          new THREE.Vector3(
            streamPosition.getX(index),
            streamPosition.getY(index),
            streamPosition.getZ(index),
          ),
        );
      }
    }
    const scoopEndSize = scoopEndBounds.getSize(new THREE.Vector3());
    expect(scoopEndSize.y).toBeGreaterThan(0.25);
    expect(scoopEndSize.z).toBeGreaterThan(0.25);
    waterFlow.dispose();

    const scoopFillBuilt = buildCustomPart("loaded-scoop-indicator");
    const scoopFill = Array.isArray(scoopFillBuilt)
      ? scoopFillBuilt[0]
      : scoopFillBuilt;
    expect(scoopFill.userData.mechanicaSemantic).toBe("loaded-scoop-water");
    expect(scoopFill.userData.mechanicaMaterialRole).toBe("working-fluid");
    expect(scoopFill.userData.mechanicaMaterial).toMatchObject({
      color: "#5ee4ff",
      depthWrite: true,
      opacity: 1,
      transparent: false,
    });
    const scoopFillPart = machine.spec.parts.find(
      (part) => part.id === "loaded-scoop-indicator",
    )!;
    const loadedLocalPosition = new THREE.Vector3(
      ...scoopFillPart.position,
    ).addScaledVector(new THREE.Vector3(...scoopFillPart.joint!.axis), 0.08);
    expect(loadedLocalPosition.toArray()).toEqual([0, 0, 0]);
    expect(scoopFill.userData.mechanicaUpdate).toBeTypeOf("function");
    const emptyPositions = Array.from(
      scoopFill.getAttribute("position").array as ArrayLike<number>,
    );
    scoopFill.computeBoundingBox();
    const emptySize = scoopFill.boundingBox!.getSize(new THREE.Vector3());
    scoopFill.userData.mechanicaUpdate(0.08);
    const loadedPositions = Array.from(
      scoopFill.getAttribute("position").array as ArrayLike<number>,
    );
    expect(maxPositionDelta(emptyPositions, loadedPositions)).toBeGreaterThan(
      0.12,
    );
    scoopFill.computeBoundingBox();
    const loadedSize = scoopFill.boundingBox!.getSize(new THREE.Vector3());
    expect(loadedSize.x).toBeGreaterThan(emptySize.x * 6);
    expect(loadedSize.y).toBeGreaterThan(emptySize.y * 5);
    expect(loadedSize.z).toBeGreaterThan(emptySize.z * 6);
    expect(loadedSize.x).toBeGreaterThan(0.28);
    expect(loadedSize.y).toBeGreaterThan(0.14);
    expect(loadedSize.z).toBeGreaterThan(0.115);
    scoopFill.dispose();
  });

  it("gives every reporting cam a readable eccentric phase", () => {
    const cams = machine.spec.parts.filter((part) =>
      part.id.startsWith("tier-cam-"),
    );
    expect(cams).toHaveLength(5);
    for (const [index, cam] of cams.entries()) {
      expect(cam.geometry).toMatchObject({
        type: "custom",
        builder: "astroclockReportingCam",
        params: { radius: 0.16, width: 0.05, tier: index + 1 },
      });
      const built = buildCustomPart(cam.id);
      const geometries = Array.isArray(built) ? built : [built];
      expect(
        geometries.map((geometry) => geometry.userData.mechanicaSemantic),
      ).toEqual([
        `tier-${index + 1}-eccentric-reporting-cam`,
        "visible-reporting-cam-phase-pin",
      ]);
      geometries.forEach((geometry) => geometry.dispose());
    }
  });

  it("keeps water, structure, transmission, sky, and reporting visually distinct", () => {
    const representatives: Array<[string, number, string]> = [
      ["tower-shell", 0, "#654534"],
      ["water-flow-indicator", 0, "#5ee4ff"],
      ["escapement-linkage", 0, "#53636a"],
      ["tier-cam-1", 0, "#b8863b"],
      ["armillary-sphere", 1, "#214f68"],
      ["jack-01", 0, "#e8b16a"],
      ["chime-tier-1", 2, "#d3a13f"],
    ];
    const colors: string[] = [];
    for (const [id, geometryIndex, expectedColor] of representatives) {
      const built = buildCustomPart(id);
      const geometries = Array.isArray(built) ? built : [built];
      const color = geometries[geometryIndex].userData.mechanicaMaterial
        ?.color as string;
      expect(color, id).toBe(expectedColor);
      colors.push(color);
      geometries.forEach((geometry) => geometry.dispose());
    }
    expect(new Set(colors).size).toBe(representatives.length);
  });

  it("assigns every causal subsystem a readable exploded group", () => {
    const byId = (id: string) =>
      machine.spec.parts.find((part) => part.id === id)!;
    expect(byId("water-circuit-links").explodeVector).toEqual([4, 0, 0]);
    expect(byId("escapement-linkage").explodeVector).toEqual([0, 0, 3.5]);
    expect(byId("celestial-transmission-links").explodeVector).toEqual([
      3.5,
      0,
      0,
    ]);
    expect(byId("reporting-drive-links").explodeVector).toEqual([0, 0, 4.5]);
    const majorVectors = [
      "tower-shell",
      "shulun",
      "celestial-column",
      "armillary-sphere",
      "water-circuit-links",
      "escapement-linkage",
      "celestial-transmission-links",
      "reporting-drive-links",
    ].map((id) => byId(id).explodeVector!);
    expect(
      new Set(majorVectors.map((vector) => JSON.stringify(vector))).size,
    ).toBe(majorVectors.length);
    for (const vector of majorVectors) {
      expect(Math.hypot(...vector)).toBeGreaterThanOrEqual(2);
    }

    const groups = [
      [
        "water-lift-wheel",
        "water-trough",
        "water-reservoir",
        "constant-level-tank",
        "water-circuit-links",
        "water-flow-indicator",
      ],
      [
        "gecha",
        "guanshe",
        "tianguan",
        "tiansuo-l",
        "tiansuo-r",
        "escapement-linkage",
      ],
      [
        "celestial-column",
        "hour-drum-wheel",
        "day-night-wheel",
        "celestial-ladder-lower",
        "celestial-globe",
        "armillary-sphere",
        "celestial-transmission-links",
      ],
      [
        ...Array.from({ length: 5 }, (_, index) => `chime-tier-${index + 1}`),
        ...Array.from({ length: 5 }, (_, index) => `tier-cam-${index + 1}`),
        ...Array.from({ length: 5 }, (_, index) => `tier-placard-${index + 1}`),
        ...Array.from({ length: 11 }, (_, index) =>
          `jack-${String(index + 1).padStart(2, "0")}`,
        ),
        "reporting-drive-links",
      ],
    ];
    for (const ids of groups) {
      for (const id of ids) {
        const vector = byId(id).explodeVector;
        expect(vector, id).toBeDefined();
        if (!vector) throw new Error(`missing explode vector for ${id}`);
        expect(vector.some((value) => Math.abs(value) > 0), id).toBe(true);
      }
    }

    const reportingJacks = machine.spec.parts.filter((part) =>
      part.id.startsWith("jack-"),
    );
    expect(reportingJacks).toHaveLength(11);
    for (const jack of reportingJacks) {
      expect(jack.explodeVector, jack.id).toEqual([0, 0, 0.35]);
      const bay = byId(jack.parent!);
      const combined = new THREE.Vector3(...bay.explodeVector!).add(
        new THREE.Vector3(...jack.explodeVector!),
      );
      expect(combined.x, jack.id).toBe(0);
      expect(combined.z - bay.explodeVector![2], jack.id).toBeCloseTo(0.35, 12);
      expect(Math.abs(combined.z - 4.5), jack.id).toBeLessThan(2);
    }
  });

  it("declares visual aids for the complete causal chain", () => {
    expect(machine.aids?.map((aid) => aid.kind)).toEqual([
      "callouts",
      "powerPath",
      "flowParticles",
      "cutaway",
      "subDemo",
    ]);
    expect(machine.aids?.[0]).toMatchObject({
      kind: "callouts",
      anchors: [
        { partId: "shulun" },
        { partId: "gecha" },
        { partId: "celestial-column" },
        { partId: "armillary-sphere" },
        { partId: "chime-tier-3" },
        { partId: "water-circuit-links" },
        { partId: "escapement-linkage" },
        { partId: "celestial-transmission-links" },
        { partId: "reporting-drive-links" },
      ],
    });
    expect(machine.aids?.[1]).toMatchObject({
      kind: "powerPath",
      label: {
        zh: "金色脉冲沿动力链流动：水 → 枢轮 → 天柱 → 浑仪 → 木阁",
        en: "The gold pulse walks the power chain: water → wheel → column → armillary → pagoda",
      },
      sequence: [
        "water-reservoir",
        "constant-level-tank",
        "water-flow-indicator",
        "loaded-scoop-indicator",
        "scoop-01",
        "shulun",
        "escapement-linkage",
        "celestial-column",
        "hour-drum-wheel",
        "day-night-wheel",
        "celestial-ladder-lower",
        "celestial-globe",
        "armillary-sphere",
        "reporting-drive-links",
        "tier-cam-1",
        "tier-placard-1",
      ],
    });
    expect(machine.aids?.[2]).toMatchObject({
      kind: "flowParticles",
      flavor: "water",
      pathPartIds: [
        "water-reservoir",
        "water-circuit-links",
        "constant-level-tank",
        "water-flow-indicator",
        "scoop-01",
        "water-trough",
        "water-lift-wheel",
        "water-reservoir",
      ],
    });
    expect(machine.aids?.[3]).toMatchObject({
      kind: "cutaway",
      partIds: ["tower-shell"],
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

  it(
    "filters only the intended shulun-to-column drive contact",
    () => {
      const intendedPair: [string, string] = ["shulun", "celestial-column"];
      const isDriveContact = ([a, b]: [string, string]) =>
        (a === intendedPair[0] && b === intendedPair[1]) ||
        (a === intendedPair[1] && b === intendedPair[0]);
      expect(machine.spec.constraints).toContainEqual(
        expect.objectContaining({
          type: "lockstep",
          a: "shulun",
          b: "celestial-column",
          ratio: 1,
          provenance: expect.objectContaining({
            kind: "wenxian",
            ref: "xyxfy-action",
          }),
        }),
      );

      for (const schemeId of [
        undefined,
        "fixed-scoop",
        "combridge-hinged",
      ] as const) {
        const resolvedSpec = schemeId
          ? applySchemePatch(machine.spec, machine.schemes?.[schemeId])
          : machine.spec;
        expect(
          (resolvedSpec.collisionWhitelist ?? []).filter(isDriveContact),
          schemeId ?? "base",
        ).toEqual([intendedPair]);

        const collisionSpec: typeof resolvedSpec = {
          ...resolvedSpec,
          parts: resolvedSpec.parts.filter(
            (part) => part.id === intendedPair[0] || part.id === intendedPair[1],
          ),
          constraints: resolvedSpec.constraints.filter(
            (constraint) =>
              constraint.type === "lockstep" &&
              isDriveContact([constraint.a, constraint.b]),
          ),
          driveNodes: ["shulun"],
          primaryDrive: "shulun",
          expectedRatios: resolvedSpec.expectedRatios?.filter(
            (ratio) => isDriveContact([ratio.from, ratio.to]),
          ),
        };

        const rawSpec = {
          ...collisionSpec,
          collisionWhitelist: (collisionSpec.collisionWhitelist ?? []).filter(
            (pair) => !isDriveContact(pair),
          ),
        };
        const collisionModule = {
          spec: collisionSpec,
          data: machine.data,
          customBuilders: machine.customBuilders,
        };
        const rawCollisions = collisionPairsAtAngle(
          { ...collisionModule, spec: rawSpec },
          new KinematicGraph(rawSpec),
          0,
        );
        expect(rawCollisions, schemeId ?? "base").toContainEqual(intendedPair);

        const filteredCollisions = collisionPairsAtAngle(
          collisionModule,
          new KinematicGraph(collisionSpec),
          0,
        );
        expect(filteredCollisions, schemeId ?? "base").not.toContainEqual(
          intendedPair,
        );
      }
    },
  );

  it("filters only the decomposed causal handoff contacts", () => {
    const handoffs: Array<[string, string]> = [
      ["celestial-column", "escapement-linkage"],
      ["hour-drum-wheel", "celestial-transmission-links"],
      ["day-night-wheel", "celestial-transmission-links"],
      ["celestial-globe", "celestial-transmission-links"],
      ["armillary-sphere", "celestial-transmission-links"],
      ["guanshe", "escapement-linkage"],
      ["tiansuo-l", "escapement-linkage"],
      ["tiansuo-r", "escapement-linkage"],
      ["tier-placard-2", "reporting-drive-links"],
      ["tier-placard-5", "reporting-drive-links"],
      ["escapement-linkage", "celestial-transmission-links"],
      ["escapement-linkage", "reporting-drive-links"],
    ];
    for (const intendedPair of handoffs) {
      const handoffPartId = intendedPair[0];
      const isHandoffContact = ([a, b]: [string, string]) =>
        (a === intendedPair[0] && b === intendedPair[1]) ||
        (a === intendedPair[1] && b === intendedPair[0]);

      for (const schemeId of [
        undefined,
        "fixed-scoop",
        "combridge-hinged",
      ] as const) {
        const resolvedSpec = schemeId
          ? applySchemePatch(machine.spec, machine.schemes?.[schemeId])
          : machine.spec;
        expect(
          (resolvedSpec.collisionWhitelist ?? []).filter(isHandoffContact),
          `${handoffPartId} ${schemeId ?? "base"}`,
        ).toEqual([intendedPair]);

        const collisionSpec: typeof resolvedSpec = {
          ...resolvedSpec,
          parts: resolvedSpec.parts.filter(
            (part) =>
              part.id === intendedPair[0] || part.id === intendedPair[1],
          ),
          constraints: [],
          driveNodes: [handoffPartId],
          primaryDrive: handoffPartId,
          expectedRatios: [],
        };
        const rawSpec = {
          ...collisionSpec,
          collisionWhitelist: (collisionSpec.collisionWhitelist ?? []).filter(
            (pair) => !isHandoffContact(pair),
          ),
        };
        const collisionModule = {
          spec: collisionSpec,
          data: machine.data,
          customBuilders: machine.customBuilders,
        };
        expect(
          collisionPairsAtAngle(
            { ...collisionModule, spec: rawSpec },
            new KinematicGraph(rawSpec),
            0,
          ),
          `${handoffPartId} ${schemeId ?? "base"}`,
        ).toContainEqual(intendedPair);
        expect(
          collisionPairsAtAngle(
            collisionModule,
            new KinematicGraph(collisionSpec),
            0,
          ),
          `${handoffPartId} ${schemeId ?? "base"}`,
        ).not.toContainEqual(intendedPair);
      }
    }
  }, 20_000);

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
      { type: "camera", part: "shulun" },
      { type: "highlight", part: "scoop-01" },
      { type: "phase:start", part: "water-flow-indicator" },
      { type: "phase:water-arrival", part: "water-flow-indicator" },
      { type: "phase:scoop-loaded", part: "loaded-scoop-indicator" },
      { type: "caption:fill", part: "scoop-01" },
      { type: "caption:reservoir", part: "water-reservoir" },
      { type: "caption:constant-head", part: "constant-level-tank" },
      { type: "caption:return", part: "water-lift-wheel" },
      { type: "highlight", part: "gecha" },
      { type: "phase:escapement-yield", part: "gecha" },
      { type: "caption:yield", part: "gecha" },
      { type: "phase:escapement-release", part: "guanshe" },
      { type: "caption:open", part: "guanshe" },
      { type: "phase:vertical-transmission", part: "celestial-column" },
      { type: "phase:celestial-output", part: "armillary-sphere" },
      { type: "phase:reporting-output", part: "tier-placard-1" },
      { type: "caption:advance", part: "shulun" },
      { type: "caption:relock", part: "tiansuo-r" },
      { type: "phase:end", part: "tiansuo-r" },
      { type: "camera", part: "celestial-column" },
      { type: "highlight", part: "celestial-globe" },
      { type: "camera", part: "chime-tier-1" },
      { type: "camera", part: "tower-shell" },
      { type: "spotlight:done", part: "shulun" },
    ]);
    const stateAt = (type: string) =>
      eventStates.find((event) => event.type === type)!.state;
    expect(stateAt("phase:start")).toMatchObject({
      "water-flow-indicator": 0,
      "loaded-scoop-indicator": 0,
      "escapement-linkage": 0,
      "celestial-transmission-links": 0,
      "reporting-drive-links": 0,
      "jack-01": 0,
      "jack-02": 0,
      shulun: 0,
    });
    expect(stateAt("phase:water-arrival")).toMatchObject({
      "water-flow-indicator": 3,
      "loaded-scoop-indicator": 0,
      shulun: 0,
    });
    expect(stateAt("phase:scoop-loaded")).toMatchObject({
      "water-flow-indicator": 0,
      "loaded-scoop-indicator": 0.08,
      "escapement-linkage": -0.45,
      "scoop-01": 0.35,
    });
    expect(stateAt("caption:fill")["scoop-01"]).toBeCloseTo(0.35, 12);
    expect(stateAt("caption:fill").shulun).toBeCloseTo(
      (Math.PI * 2) / 36 / 10,
      12,
    );
    expect(stateAt("caption:yield").gecha).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:yield").tianguan).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:yield")["escapement-linkage"]).toBe(-1);
    expect(stateAt("caption:open").guanshe).toBeCloseTo(0.35, 12);
    expect(stateAt("caption:open")["tiansuo-l"]).toBeCloseTo(0.35, 12);
    expect(stateAt("caption:open")["tiansuo-r"]).toBeCloseTo(-0.35, 12);
    expect(stateAt("caption:open")["escapement-linkage"]).toBe(1);
    expect(stateAt("phase:vertical-transmission")).toMatchObject({
      "water-flow-indicator": 0,
      "loaded-scoop-indicator": 0.08,
    });
    expect(stateAt("phase:vertical-transmission").shulun).toBeCloseTo(
      ((Math.PI * 2) / 36) * 0.55,
      12,
    );
    expect(
      stateAt("phase:vertical-transmission")["celestial-column"],
    ).toBeCloseTo(((Math.PI * 2) / 36) * 0.55, 12);
    expect(stateAt("phase:vertical-transmission")["escapement-linkage"]).toBe(
      0,
    );
    expect(
      stateAt("phase:vertical-transmission")["celestial-transmission-links"],
    ).toBe(1);
    expect(stateAt("phase:celestial-output")["armillary-sphere"]).not.toBe(0);
    expect(stateAt("phase:celestial-output")["armillary-sphere"]).toBeCloseTo(
      (Math.PI * 2) / 36,
      12,
    );
    expect(
      stateAt("phase:celestial-output")["celestial-transmission-links"],
    ).toBe(0);
    expect(stateAt("phase:reporting-output")["tier-cam-1"]).not.toBe(0);
    expect(stateAt("phase:reporting-output")["tier-placard-1"]).toBeGreaterThan(
      0,
    );
    expect(stateAt("phase:reporting-output")).toMatchObject({
      "reporting-drive-links": 1,
      "jack-01": 1,
      "jack-02": -1,
    });
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
      "jack-01": 1,
      "jack-02": -1,
      "reporting-drive-links": 1,
    });
    expect(stateAt("phase:end")).toMatchObject({
      "water-flow-indicator": 0,
      "loaded-scoop-indicator": 0,
      "scoop-01": 0,
      gecha: 0,
      guanshe: 0,
      tianguan: 0,
      "tiansuo-l": -0.35,
      "tiansuo-r": 0.35,
    });
    const phaseTypes = [
      "phase:start",
      "phase:water-arrival",
      "phase:scoop-loaded",
      "phase:escapement-yield",
      "phase:escapement-release",
      "phase:vertical-transmission",
      "phase:celestial-output",
      "phase:reporting-output",
      "phase:end",
    ];
    const physicalKeys = [
      "water-flow-indicator",
      "loaded-scoop-indicator",
      "shulun",
      "gecha",
      "guanshe",
      "tiansuo-r",
      "escapement-linkage",
      "celestial-transmission-links",
      "reporting-drive-links",
      "armillary-sphere",
      "tier-placard-1",
      "jack-01",
      "jack-02",
    ];
    const phaseVectors = phaseTypes.map((type) =>
      physicalKeys.map((key) => stateAt(type)[key]),
    );
    for (let index = 1; index < phaseVectors.length; index += 1) {
      expect(phaseVectors[index], phaseTypes[index]).not.toEqual(
        phaseVectors[index - 1],
      );
    }
    expect(graph.state().shulun).toBeCloseTo((Math.PI * 2) / 36, 12);
    expect(graph.state()).toMatchObject({
      "reporting-drive-links": 1,
      "jack-01": 1,
      "jack-02": -1,
      "jack-03": 1,
      "jack-04": -1,
      "jack-05": 1,
      "jack-06": -1,
      "jack-07": 1,
      "jack-08": 0.75,
      "jack-09": -1,
      "jack-10": 1,
      "jack-11": -1,
    });
    expect(events.at(-1)?.type).toBe("spotlight:done");
  });

  it("emits the required source-caption escapement sequence", () => {
    const { events, graph } = runTrigger("escapement-captions");
    expect(events).toEqual([
      { type: "phase:start", part: "water-flow-indicator" },
      { type: "phase:water-arrival", part: "water-flow-indicator" },
      { type: "phase:scoop-loaded", part: "loaded-scoop-indicator" },
      { type: "caption:fill", part: "scoop-01" },
      { type: "caption:reservoir", part: "water-reservoir" },
      { type: "caption:constant-head", part: "constant-level-tank" },
      { type: "caption:return", part: "water-lift-wheel" },
      { type: "phase:escapement-yield", part: "gecha" },
      { type: "caption:yield", part: "gecha" },
      { type: "phase:escapement-release", part: "guanshe" },
      { type: "caption:open", part: "guanshe" },
      { type: "phase:vertical-transmission", part: "celestial-column" },
      { type: "phase:celestial-output", part: "armillary-sphere" },
      { type: "phase:reporting-output", part: "tier-placard-1" },
      { type: "caption:advance", part: "shulun" },
      { type: "caption:relock", part: "tiansuo-r" },
      { type: "phase:end", part: "tiansuo-r" },
    ]);
    expect(graph.state()["hour-drum-wheel"]).toBeCloseTo(
      (((Math.PI * 2) / 36) * 36) / 100,
      12,
    );
  });

  it("advances forward by one cell and blocks reverse drag at the right lock", () => {
    const forward = runTrigger("drag-shulun", 1);
    expect(forward.events).toEqual([
      { type: "camera", part: "shulun" },
      { type: "highlight", part: "shulun" },
      { type: "caption:drag-coach", part: "shulun" },
      { type: "advance", part: "shulun" },
      { type: "camera", part: "tower-shell" },
    ]);
    expect(forward.graph.state().shulun).toBeCloseTo((Math.PI * 2) / 36, 12);

    const reverse = runTrigger("drag-shulun", -1);
    expect(reverse.events).toEqual([{ type: "blocked", part: "tiansuo-r" }]);
    expect(reverse.graph.state().shulun).toBe(0);
  });

  it("five-tier trigger always emits a visible performance", () => {
    const trigger = machine.mechanism?.triggers.find(
      (candidate) => candidate.id === "chime-placards",
    );
    expect(trigger).toBeDefined();
    const graph = new KinematicGraph(machine.spec);
    const events: string[] = [];
    trigger!.run(graph, (type: string) => events.push(type));
    expect(events.filter((type) => type === "placard").length).toBeGreaterThan(
      0,
    );
    expect(events).toContain("caption:tier-report");
    expect(events.filter((type) => type === "camera").length).toBeGreaterThan(
      0,
    );
  });

  it("emits all five cam-driven placard events", () => {
    expect(runTrigger("chime-placards").events).toEqual([
      { type: "camera", part: "chime-tier-1" },
      { type: "placard", part: "tier-placard-1" },
      { type: "placard", part: "tier-placard-2" },
      { type: "placard", part: "tier-placard-3" },
      { type: "placard", part: "tier-placard-4" },
      { type: "placard", part: "tier-placard-5" },
      { type: "caption:tier-report", part: "chime-tier-1" },
      { type: "camera", part: "tower-shell" },
    ]);
    const graph = new KinematicGraph(machine.spec);
    const events: Array<{ type: string; part: string }> = [];
    const chime = trigger("chime-placards");
    chime.run(graph, (type, part) => events.push({ type, part }));
    chime.run(graph, (type, part) => events.push({ type, part }));
    expect(events.filter((event) => event.type === "placard")).toHaveLength(5);
    expect(events.filter((event) => event.type === "camera")).toHaveLength(4);
    expect(
      events.filter((event) => event.type === "caption:tier-report"),
    ).toHaveLength(2);
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
    expect(fixed?.overrideParts?.[0].joint?.axis).toEqual([1, 0, 0]);
    expect(
      machine.spec.parts.find((part) => part.id === "scoop-01")?.joint?.axis,
    ).toEqual([1, 0, 0]);
    const tippedUp = new THREE.Vector3(0, 1, 0).applyAxisAngle(
      new THREE.Vector3(1, 0, 0),
      0.35,
    );
    expect(Math.abs(tippedUp.z)).toBeGreaterThan(0.33);
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
