import * as THREE from "three";
import { describe, expect, it } from "vitest";

import machine from "../../src/machines/seismoscope/build";
import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";
import type { PartDef, Provenance, SchemePatch } from "../../src/sim/types";
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

function customGeometry(
  builder: string,
  params: Record<string, number>,
): THREE.BufferGeometry {
  const built = machine.customBuilders?.[builder]?.(params);
  if (!built || Array.isArray(built)) {
    throw new Error(`${builder} must return one geometry`);
  }
  return built as THREE.BufferGeometry;
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
    for (const part of wang.addParts?.filter((part) =>
      part.id.startsWith("wang-chute-"),
    ) ?? []) {
      expect(part.geometry).toMatchObject({
        type: "custom",
        builder: "seismoscopeWangChute",
      });
    }
    for (const part of feng.addParts?.filter((part) =>
      part.id.startsWith("feng-track-"),
    ) ?? []) {
      expect(part.geometry).toMatchObject({
        type: "custom",
        builder: "seismoscopeFengTrack",
      });
    }
  });

  it("builds a multi-part dragon silhouette inside its declared envelope", () => {
    const geometry = customGeometry("seismoscopeDragon", { radius: 0.16 });
    const size = geometry.boundingBox?.getSize(new THREE.Vector3());
    const semantic = geometry.userData.mechanicaSemantic;

    expect(geometry.index).not.toBeNull();
    expect(geometry.getAttribute("position").count).toBeGreaterThan(500);
    expect(size?.toArray()).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.56, 5),
        expect.closeTo(0.448, 5),
        expect.closeTo(0.56, 5),
      ]),
    );
    expect(semantic).toMatchObject({
      kind: "chinese-dragon-head",
      forward: [0, 0, 1],
      jawGapRatio: 0.34,
      maneFinCount: 3,
      features: expect.arrayContaining([
        "connected-neck-root",
        "connected-neck-flare",
        "cranial-mass",
        "upper-jaw",
        "elongated-upper-snout",
        "deep-open-jaw-gap",
        "long-cranial-axis",
        "swept-neck-profile",
        "jaw-hinge",
        "open-lower-jaw",
        "backward-horns",
        "whiskers",
        "brow-eyes",
        "arched-brows",
        "paired-nostrils",
        "visible-tongue",
        "side-ears",
        "mane-fins",
      ]),
    });
    expect(geometry.boundingBox?.min.z).toBeCloseTo(-0.296, 5);
    expect(1.22 + (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(0.924, 5);
    expect(geometry.boundingBox?.max.z).toBeCloseTo(0.264, 5);
    const dragonMuzzle = 1.22 + (geometry.boundingBox?.max.z ?? 0);
    expect(1.43 - 0.078).toBeLessThan(dragonMuzzle);
    expect(1.43 + 0.078 - dragonMuzzle).toBeGreaterThan(0.015);
    geometry.dispose();
  });

  it("builds the complete zun silhouette and a distinct internal causal chain", () => {
    expect(machine.spec.parts.map((part) => part.id)).toEqual(
      expect.arrayContaining([
        "vessel",
        "lid",
        "plinth",
        "floor-plate",
        "linkage-crown",
        "gate-6",
        "lock-6",
      ]),
    );

    const vessel = customGeometry("seismoscopeVessel", {
      radius: 0.924,
      wallThickness: 0.035,
    });
    const lid = customGeometry("seismoscopeLid", {
      radius: 0.7,
      height: 0.3,
      knobRadius: 0.06,
      apertureRadius: 0.055,
    });
    const plinth = customGeometry("seismoscopePlinth", {
      radius: 1.82,
      height: 0.18,
      boreRadius: 0.14,
    });
    expect(plinth.userData.mechanicaSemantic.features).toContain("central-duzhu-well");
    plinth.dispose();
    const linkage = customGeometry("seismoscopeLinkage", {
      innerRadius: 0.16,
      gateRadius: 0.44,
      wallRadius: 0.68,
      baseHeight: -0.38,
      gateRise: 0.08,
      pushrodTop: 0.24,
      rodRadius: 0.02,
    });
    const gate = customGeometry("seismoscopeGateLink", {
      innerRadius: 0.16,
      gateRadius: 0.44,
      wallRadius: 0.68,
      baseHeight: -0.38,
      gateRise: 0.08,
      pushrodTop: 0.24,
      rodRadius: 0.02,
    });
    const lock = customGeometry("seismoscopeLockPawl", {
      width: 0.12,
      height: 0.18,
      depth: 0.08,
      pinRadius: 0.018,
    });
    const floor = customGeometry("seismoscopeFloor", {
      radius: 0.55,
      thickness: 0.04,
      bossRadius: 0.14,
      boreRadius: 0.105,
    });
    const toad = customGeometry("seismoscopeToad", { radius: 0.18 });
    const wangChute = customGeometry("seismoscopeWangChute", {
      length: 0.36,
      width: 0.07,
      height: 0.045,
    });
    const fengTrack = customGeometry("seismoscopeFengTrack", {
      length: 0.38,
      width: 0.065,
      height: 0.035,
    });
    const standing = customGeometry("seismoscopeStandingDuzhu", {
      radius: 0.035,
      length: 2,
      capitalRadius: 0.09,
    });
    const suspended = customGeometry("seismoscopeSuspendedDuzhu", {
      radius: 0.03,
      length: 2,
      bobRadius: 0.09,
      beamWidth: 0.9,
      beamLift: 0.24,
    });
    const vesselSize = vessel.boundingBox?.getSize(new THREE.Vector3());

    expect(vesselSize?.x).toBeCloseTo(1.848, 5);
    expect(vesselSize?.z).toBeCloseTo(1.848, 5);
    expect(vessel.userData.mechanicaSemantic.features).toEqual(
      expect.arrayContaining([
        "ring-foot",
        "bulged-belly",
        "shoulder",
        "neck",
        "rim",
      ]),
    );
    expect(lid.userData.mechanicaSemantic.features).toEqual(
      expect.arrayContaining([
        "domed-cover",
        "central-bearing-aperture",
        "annular-finial",
      ]),
    );
    expect(linkage.userData.mechanicaSemantic).toMatchObject({
      kind: "eight-direction-selector-collar",
      pathCount: 8,
      features: expect.arrayContaining([
        "central-collar",
        "eight-direction-witness-stubs",
        "separated-gate-sockets",
      ]),
    });
    expect(
      Math.max(
        Math.abs(linkage.boundingBox?.min.x ?? Infinity),
        Math.abs(linkage.boundingBox?.max.x ?? Infinity),
        Math.abs(linkage.boundingBox?.min.z ?? Infinity),
        Math.abs(linkage.boundingBox?.max.z ?? Infinity),
      ),
    ).toBeLessThanOrEqual(0.18);
    expect(gate.userData.mechanicaSemantic).toMatchObject({
      kind: "directional-gate-pushrod",
      forward: [0, 0, 1],
      features: expect.arrayContaining([
        "gate-input-rod",
        "directional-hinge",
        "dragon-release-pushrod",
        "visible-output-vane",
        "high-contrast-signal-boss",
      ]),
    });
    expect(lock.userData.mechanicaSemantic).toMatchObject({
      kind: "directional-lock-pawl",
      features: expect.arrayContaining([
        "guide-crossbar",
        "drop-pawl",
        "deep-drop-hook",
        "gate-retaining-hook",
      ]),
    });
    expect(linkage.userData.mechanicaMaterial.color).not.toBe(
      gate.userData.mechanicaMaterial.color,
    );
    expect(gate.userData.mechanicaMaterial.textureVariant).toBe(
      "bronze:gilded",
    );
    expect(lock.userData.mechanicaMaterial.textureVariant).toBe("iron:cast");
    const gateTop = gate.boundingBox?.max.y ?? Infinity;
    const restingLockBottom = 0.52 + (lock.boundingBox?.min.y ?? -Infinity);
    const lockedGateTip = 0.16 - 0.1 + (gate.boundingBox?.max.z ?? Infinity);
    const lockBandNear = 0.61 + (lock.boundingBox?.min.z ?? -Infinity);
    const lockBandFar = 0.61 + (lock.boundingBox?.max.z ?? Infinity);
    expect(restingLockBottom - gateTop).toBeGreaterThan(0.04);
    expect(restingLockBottom - 0.32).toBeLessThan(gateTop);
    expect(restingLockBottom + 0.18).toBeGreaterThan(gateTop);
    expect(lockedGateTip).toBeGreaterThan(lockBandNear);
    expect(lockedGateTip).toBeLessThan(lockBandFar);
    expect(floor.userData.mechanicaSemantic).toMatchObject({
      kind: "mechanism-floor",
      features: expect.arrayContaining([
        "annular-floor-plate",
        "central-bearing-bore",
        "central-pivot-boss",
      ]),
    });
    expect(toad.userData.mechanicaSemantic).toMatchObject({
      kind: "open-mouthed-toad",
      forward: [0, 0, -1],
      features: expect.arrayContaining([
        "upturned-open-mouth",
        "broad-lower-lip",
        "haunches",
        "webbed-forefeet",
        "hind-legs",
        "rear-feet",
        "four-limb-crouch",
      ]),
    });
    expect(1.78 + (toad.boundingBox?.min.z ?? 0)).toBeCloseTo(1.5298, 4);
    expect(wangChute.userData.mechanicaSemantic).toMatchObject({
      kind: "wang-standing-column-chute",
      features: expect.arrayContaining(["broad-u-channel"]),
    });
    expect(fengTrack.userData.mechanicaSemantic).toMatchObject({
      kind: "feng-suspended-pendulum-track",
      features: expect.arrayContaining(["paired-ball-rails"]),
    });
    expect(wangChute.userData.mechanicaMaterial.color).not.toBe(
      fengTrack.userData.mechanicaMaterial.color,
    );
    expect(standing.userData.mechanicaSemantic.kind).toBe(
      "standing-inverted-pendulum",
    );
    expect(suspended.userData.mechanicaSemantic).toMatchObject({
      kind: "suspended-pendulum",
      features: expect.arrayContaining([
        "suspension-crossbeam",
        "raised-suspension-crossbeam",
        "through-aperture-suspension-extension",
        "hook",
        "low-heavy-bob",
      ]),
    });

    for (const geometry of [
      vessel,
      lid,
      floor,
      linkage,
      gate,
      lock,
      toad,
      wangChute,
      fengTrack,
      standing,
      suspended,
    ]) {
      geometry.dispose();
    }
  });

  it("uses machine-local materials to separate vessel, animals, balls, and linkage", () => {
    const vessel = customGeometry("seismoscopeVessel", {
      radius: 0.924,
      wallThickness: 0.035,
    });
    const dragon = customGeometry("seismoscopeDragon", { radius: 0.16 });
    const ball = customGeometry("seismoscopeBall", { radius: 0.078 });
    const linkage = customGeometry("seismoscopeLinkage", {
      innerRadius: 0.16,
      gateRadius: 0.44,
      wallRadius: 0.68,
      baseHeight: -0.38,
      gateRise: 0.08,
      pushrodTop: 0.24,
      rodRadius: 0.02,
    });

    expect([
      vessel.userData.mechanicaMaterial.textureVariant,
      dragon.userData.mechanicaMaterial.textureVariant,
      ball.userData.mechanicaMaterial.textureVariant,
      linkage.userData.mechanicaMaterial.textureVariant,
    ]).toEqual([
      "bronze:excavated",
      "bronze:fresh",
      "bronze:excavated",
      "bronze:openwork",
    ]);
    expect(
      ball.boundingBox?.getSize(new THREE.Vector3()).toArray(),
    ).toEqual([
      expect.closeTo(0.156, 5),
      expect.closeTo(0.156, 5),
      expect.closeTo(0.156, 5),
    ]);
    expect(ball.userData.mechanicaSemantic.features).toContain(
      "high-contrast-silhouette",
    );

    for (const geometry of [vessel, dragon, ball, linkage]) geometry.dispose();
  });

  it("orients all dragons outward and aligns every dragon, ball, and toad path", () => {
    for (let bearing = 0; bearing < 8; bearing += 1) {
      const dragon = machine.spec.parts.find(
        (part) => part.id === `dragon-${bearing}`,
      )!;
      const ball = machine.spec.parts.find(
        (part) => part.id === `ball-${bearing}`,
      )!;
      const toad = machine.spec.parts.find(
        (part) => part.id === `toad-${bearing}`,
      )!;
      const gate = machine.spec.parts.find(
        (part) => part.id === `gate-${bearing}`,
      )!;
      const lock = machine.spec.parts.find(
        (part) => part.id === `lock-${bearing}`,
      )!;
      const [x, , z] = dragon.position;
      const outward = new THREE.Vector3(x, 0, z).normalize();
      const yaw = dragon.rotationEuler?.[1] ?? 0;
      const forward = new THREE.Vector3(0, 0, 1).applyEuler(
        new THREE.Euler(0, yaw, 0),
      );
      const dragonPoint = new THREE.Vector3(...dragon.position);
      const ballPoint = new THREE.Vector3(...ball.position);
      const toadPoint = new THREE.Vector3(...toad.position);
      const dragonToToad = toadPoint
        .clone()
        .sub(dragonPoint)
        .setY(0)
        .normalize();
      const dragonRadius = Math.hypot(dragonPoint.x, dragonPoint.z);
      const ballRadius = Math.hypot(ballPoint.x, ballPoint.z);
      const toadRadius = Math.hypot(toadPoint.x, toadPoint.z);
      const gatePoint = new THREE.Vector3(...gate.position);
      const lockPoint = new THREE.Vector3(...lock.position);
      const gateAxis = new THREE.Vector3(...(gate.joint?.axis ?? [0, 0, 0]));

      expect(yaw).toBeCloseTo(Math.atan2(x, z), 12);
      expect(dragon.joint).toMatchObject({
        kind: "revolute",
        axis: [1, 0, 0],
        limits: [-0.18, 0.24],
      });
      expect(toad.joint).toMatchObject({
        kind: "revolute",
        axis: [1, 0, 0],
        limits: [0, 0.44],
      });
      expect(ball.joint).toMatchObject({
        kind: "prismatic",
        limits: [0, 0.61],
      });
      expect(gate.rotationEuler?.[1] ?? 0).toBeCloseTo(yaw, 12);
      expect(lock.rotationEuler?.[1] ?? 0).toBeCloseTo(yaw, 12);
      expect(gate.joint).toMatchObject({
        kind: "prismatic",
        limits: [-0.1, 0.18],
      });
      expect(lock.joint).toMatchObject({
        kind: "prismatic",
        axis: [0, -1, 0],
        limits: [-0.18, 0.32],
      });
      expect(gatePoint.length()).toBeCloseTo(0.16, 12);
      expect(lockPoint.clone().setY(0).length()).toBeCloseTo(0.61, 12);
      expect(gateAxis.dot(outward)).toBeCloseTo(1, 12);
      const ballAxis = new THREE.Vector3(...(ball.joint?.axis ?? [0, 0, 0]));
      const receivedPoint = ballPoint.clone().addScaledVector(ballAxis, 0.61);
      const receivedRadius = Math.hypot(receivedPoint.x, receivedPoint.z);
      const toadMouth = new THREE.Vector3(0, 0.27 * 0.18, -0.94 * 0.18)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.44)
        .applyEuler(new THREE.Euler(...(toad.rotationEuler ?? [0, 0, 0])))
        .add(toadPoint);
      expect(forward.dot(outward)).toBeCloseTo(1, 12);
      expect(dragonToToad.dot(outward)).toBeCloseTo(1, 12);
      expect(ballPoint.clone().setY(0).normalize().dot(outward)).toBeCloseTo(
        1,
        12,
      );
      expect(ballRadius - dragonRadius).toBeCloseTo(0.21, 5);
      expect(toadRadius - ballRadius).toBeCloseTo(0.35, 5);
      expect(ballAxis.length()).toBeCloseTo(1, 12);
      expect(ballAxis.dot(outward)).toBeCloseTo(0.36, 12);
      expect(ballAxis.y).toBeCloseTo(-0.9329523031752481, 12);
      expect(receivedRadius).toBeCloseTo(1.6496, 5);
      expect(receivedPoint.y).toBeCloseTo(-0.3591009049369014, 12);
      expect(receivedRadius - ballRadius).toBeGreaterThan(0.2);
      expect(receivedPoint.distanceTo(toadMouth)).toBeLessThan(0.01);
    }
  });

  it("orients every toad mouth toward its matching dragon", () => {
    const toads = machine.spec.parts.filter((part) =>
      part.id.startsWith("toad-"),
    );

    expect(toads).toHaveLength(8);
    for (const toad of toads) {
      const yaw = toad.rotationEuler?.[1] ?? 0;
      const [x, , z] = toad.position;
      const radius = Math.hypot(x, z);
      const inward = [-x / radius, -z / radius];
      const forward = [-Math.sin(yaw), -Math.cos(yaw)];

      expect(forward[0] * inward[0] + forward[1] * inward[1]).toBeCloseTo(
        1,
        12,
      );
    }
  });

  it("stages vessel, mechanism, animals, and balls as distinct exploded layers", () => {
    const byId = new Map(machine.spec.parts.map((part) => [part.id, part]));

    expect(byId.get("vessel")?.explodeVector?.[1]).toBeGreaterThanOrEqual(1.2);
    expect(byId.get("lid")?.explodeVector?.[1]).toBeGreaterThanOrEqual(2);
    expect(byId.get("plinth")?.explodeVector?.[1]).toBeLessThanOrEqual(-0.7);
    expect(byId.get("floor-plate")?.explodeVector?.[1]).toBeLessThanOrEqual(
      -1.2,
    );
    expect(byId.get("linkage-crown")?.explodeVector?.[1]).toBeGreaterThanOrEqual(
      0.8,
    );

    for (let bearing = 0; bearing < 8; bearing += 1) {
      for (const [kind, minimum] of [
        ["dragon", 1.8],
        ["toad", 2.2],
        ["ball", 2.55],
      ] as const) {
        const part = byId.get(`${kind}-${bearing}`)!;
        const [x, , z] = part.position;
        const [explodeX, , explodeZ] = part.explodeVector!;
        const outward = new THREE.Vector2(x, z).normalize();
        const exploded = new THREE.Vector2(explodeX, explodeZ);

        expect(exploded.length()).toBeCloseTo(minimum, 10);
        expect(exploded.normalize().dot(outward)).toBeCloseTo(1, 10);
      }
      for (const [kind, spread] of [
        ["gate", 1],
        ["lock", 1.3],
      ] as const) {
        const part = byId.get(`${kind}-${bearing}`)!;
        const [x, , z] = part.position;
        const [explodeX, , explodeZ] = part.explodeVector!;
        const outward = new THREE.Vector2(x, z).normalize();
        const exploded = new THREE.Vector2(explodeX, explodeZ);

        expect(exploded.length()).toBeCloseTo(spread, 10);
        expect(exploded.normalize().dot(outward)).toBeCloseTo(1, 10);
      }
    }

    for (const patch of Object.values(machine.schemes ?? {})) {
      const duzhu = patch.addParts?.find((part) => part.id === "duzhu");
      const paths = patch.addParts?.filter((part) => part.id !== "duzhu") ?? [];

      expect(duzhu?.explodeVector?.[1]).toBeGreaterThanOrEqual(1.7);
      expect(paths).toHaveLength(8);
      for (const path of paths) {
        expect(Math.hypot(path.explodeVector![0], path.explodeVector![2])).toBeCloseTo(
          1.55,
          10,
        );
        expect(path.explodeVector?.[1]).toBeCloseTo(0.15, 12);
      }
    }

    expect(byId.get("gate-0")?.explodeVector?.[1]).toBeLessThan(
      byId.get("lock-0")?.explodeVector?.[1] ?? -Infinity,
    );
    expect(byId.get("dragon-0")?.explodeVector?.[1]).toBeLessThan(
      byId.get("ball-0")?.explodeVector?.[1] ?? -Infinity,
    );
    expect(byId.get("toad-0")?.explodeVector?.[1]).toBeLessThan(0);
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
        { type: "drive", part: "gate-6" },
        { type: "pulse", part: "duzhu" },
        { type: "highlight:on", part: "gate-6" },
        { type: "releaseBall", part: "dragon-6" },
        { type: "highlight:on", part: "ball-6" },
        { type: "highlight:on", part: "toad-6" },
        { type: "source", part: "houfeng-196" },
      ]),
    );
    expect(events.at(-1)).toEqual({
      type: "spotlight:done",
      part: "seismoscope",
    });
    expect(graph.state()["ball-6"]).toBe(0.61);
  });

  it("moves each non-fired lock only after reception while keeping the fired path distinct", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(scheme("fengrui"));
    const spotlight = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "spotlight",
    )!;
    const snapshots: Array<{
      type: string;
      part: string;
      state: Record<string, number>;
    }> = [];

    spotlight.run(graph, (type, part) => {
      snapshots.push({ type, part, state: { ...graph.state() } });
    });

    const received = snapshots.find(
      (snapshot) => snapshot.type === "releaseBall",
    )!;
    expect(received.state).toMatchObject({
      "ball-6": 0.61,
      "toad-6": 0.44,
      "gate-6": 0.18,
      "lock-6": -0.18,
    });
    for (const bearing of [0, 1, 2, 3, 4, 5, 7]) {
      expect(received.state[`gate-${bearing}`]).toBe(0);
      expect(received.state[`lock-${bearing}`]).toBe(0);
    }

    const locked = snapshots.filter(
      (snapshot) => snapshot.type === "locked",
    );
    expect(locked.map((snapshot) => snapshot.part)).toEqual([
      "lock-0",
      "lock-1",
      "lock-2",
      "lock-3",
      "lock-4",
      "lock-5",
      "lock-7",
    ]);
    for (const [index, snapshot] of locked.entries()) {
      const bearing = [0, 1, 2, 3, 4, 5, 7][index];
      expect(snapshot.state[`gate-${bearing}`]).toBe(-0.1);
      expect(snapshot.state[`lock-${bearing}`]).toBe(0.32);
      for (const pending of [0, 1, 2, 3, 4, 5, 7].slice(index + 1)) {
        expect(snapshot.state[`gate-${pending}`]).toBe(0);
        expect(snapshot.state[`lock-${pending}`]).toBe(0);
      }
      expect(snapshot.state["gate-6"]).toBe(0.18);
      expect(snapshot.state["lock-6"]).toBe(-0.18);
    }

    const lock = machine.spec.parts.find((part) => part.id === "lock-0")!;
    if (lock.geometry.type !== "custom") {
      throw new Error("lock-0 must use custom geometry");
    }
    const lockGeometry = customGeometry(
      "seismoscopeLockPawl",
      lock.geometry.params,
    );
    lockGeometry.computeBoundingBox();
    const lockHeight =
      (lockGeometry.boundingBox?.max.y ?? 0) -
      (lockGeometry.boundingBox?.min.y ?? 0);
    const lockAxis = new THREE.Vector3(...(lock.joint?.axis ?? [0, 0, 0]));
    const startPosition = new THREE.Vector3(...lock.position);
    const lockedPosition = startPosition.clone().addScaledVector(lockAxis, 0.32);
    const firedPosition = startPosition.clone().addScaledVector(lockAxis, -0.18);
    expect(startPosition.distanceTo(lockedPosition)).toBeCloseTo(0.32, 12);
    expect(startPosition.distanceTo(firedPosition)).toBeCloseTo(0.18, 12);
    expect(firedPosition.distanceTo(lockedPosition)).toBeCloseTo(0.5, 12);
    expect(startPosition.distanceTo(lockedPosition)).toBeGreaterThan(
      lockHeight,
    );
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

  it("releases only bearing 3 and visibly locks the other seven dragons", () => {
    const graph = new KinematicGraph(machine.spec);
    const before = graph.state();
    const events: Array<{ type: string; part: string }> = [];
    const quake = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "quake",
    );

    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "quake",
      "quake:arm",
      "quake:reset",
    ]);
    expect(quake).toBeDefined();
    quake?.run(graph, (type, part) => events.push({ type, part }), 3);

    expect(events).toEqual([
      { type: "pulse", part: "vessel" },
      { type: "drive", part: "gate-3" },
      { type: "highlight:on", part: "gate-3" },
      { type: "highlight:on", part: "ball-3" },
      { type: "highlight:on", part: "toad-3" },
      { type: "releaseBall", part: "dragon-3" },
      { type: "locked", part: "lock-0" },
      { type: "locked", part: "lock-1" },
      { type: "locked", part: "lock-2" },
      { type: "locked", part: "lock-4" },
      { type: "locked", part: "lock-5" },
      { type: "locked", part: "lock-6" },
      { type: "locked", part: "lock-7" },
    ]);

    const after = graph.state();
    for (const bearing of [0, 1, 2, 4, 5, 6, 7]) {
      expect(after[`ball-${bearing}`]).toBe(before[`ball-${bearing}`]);
      expect(after[`dragon-${bearing}`]).toBe(-0.18);
      expect(after[`gate-${bearing}`]).toBe(-0.1);
      expect(after[`lock-${bearing}`]).toBe(0.32);
    }
    expect(after["ball-3"]).toBe(0.61);
    expect(after["dragon-3"]).toBe(0.24);
    expect(after["toad-3"]).toBe(0.44);
    expect(after["gate-3"]).toBe(0.18);
    expect(after["lock-3"]).toBe(-0.18);
    expect(after["gate-3"] - after["gate-2"]).toBeGreaterThan(0.25);
    expect(after["lock-2"] - after["lock-3"]).toBeGreaterThan(0.35);
    const selectedGate = machine.spec.parts.find(
      (part) => part.id === "gate-3",
    )!;
    const lockedGate = machine.spec.parts.find(
      (part) => part.id === "gate-2",
    )!;
    const selectedGatePosition = new THREE.Vector3(
      ...selectedGate.position,
    ).addScaledVector(
      new THREE.Vector3(...(selectedGate.joint?.axis ?? [0, 0, 0])),
      after["gate-3"],
    );
    const lockedGatePosition = new THREE.Vector3(
      ...lockedGate.position,
    ).addScaledVector(
      new THREE.Vector3(...(lockedGate.joint?.axis ?? [0, 0, 0])),
      after["gate-2"],
    );
    expect(
      selectedGatePosition.length() - lockedGatePosition.length(),
    ).toBeCloseTo(0.28, 12);
    const selectedLock = machine.spec.parts.find(
      (part) => part.id === "lock-3",
    )!;
    const lockedLock = machine.spec.parts.find(
      (part) => part.id === "lock-2",
    )!;
    const selectedLockY =
      selectedLock.position[1] +
      (selectedLock.joint?.axis[1] ?? 0) * after["lock-3"];
    const lockedLockY =
      lockedLock.position[1] +
      (lockedLock.joint?.axis[1] ?? 0) * after["lock-2"];
    expect(selectedLockY - lockedLockY).toBeCloseTo(0.5, 12);

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
      { type: "drive", part: "gate-6" },
      { type: "inert", part: "duzhu" },
    ]);
    expect(wang.state()["ball-6"]).toBe(0);

    const feng = new KinematicGraph(machine.spec);
    feng.setScheme(scheme("fengrui"));
    const fengEvents: Array<{ type: string; part: string }> = [];
    quake.run(feng, (type, part) => fengEvents.push({ type, part }), 6);
    expect(fengEvents).toEqual([
      { type: "pulse", part: "vessel" },
      { type: "drive", part: "gate-6" },
      { type: "highlight:on", part: "gate-6" },
      { type: "highlight:on", part: "ball-6" },
      { type: "highlight:on", part: "toad-6" },
      { type: "releaseBall", part: "dragon-6" },
      { type: "locked", part: "lock-0" },
      { type: "locked", part: "lock-1" },
      { type: "locked", part: "lock-2" },
      { type: "locked", part: "lock-3" },
      { type: "locked", part: "lock-4" },
      { type: "locked", part: "lock-5" },
      { type: "locked", part: "lock-7" },
    ]);
    expect(feng.state()["ball-6"]).toBe(0.61);
    expect(feng.state().duzhu).toBe(0.14);
  });

  it("exposes repeatable arm, release, receive, locked, and reset geometry states", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(scheme("fengrui"));
    const arm = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "quake:arm",
    )!;
    const release = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "quake",
    )!;
    const reset = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "quake:reset",
    )!;

    arm.run(graph, () => undefined, 6);
    expect(graph.state()).toMatchObject({
      vessel: (6 * Math.PI) / 4,
      duzhu: 0.08,
      "linkage-crown": 0.04,
      "dragon-6": 0,
      "ball-6": 0,
      "toad-6": 0,
      "gate-6": 0.07,
      "lock-6": -0.08,
    });

    release.run(graph, () => undefined, 6);
    expect(graph.state()).toMatchObject({
      duzhu: 0.14,
      "linkage-crown": 0.08,
      "dragon-6": 0.24,
      "ball-6": 0.61,
      "toad-6": 0.44,
      "gate-6": 0.18,
      "lock-6": -0.18,
    });
    const firedBall = machine.spec.parts.find((part) => part.id === "ball-6")!;
    const receivingToad = machine.spec.parts.find(
      (part) => part.id === "toad-6",
    )!;
    const ballAxis = new THREE.Vector3(...(firedBall.joint?.axis ?? [0, 0, 0]));
    const receivedPoint = new THREE.Vector3(...firedBall.position).addScaledVector(
      ballAxis,
      graph.state()["ball-6"],
    );
    const toadMouth = new THREE.Vector3(...receivingToad.position).add(
      new THREE.Vector3(0, 0.27 * 0.18, -0.94 * 0.18)
        .applyAxisAngle(
          new THREE.Vector3(1, 0, 0),
          graph.state()["toad-6"],
        )
        .applyEuler(
          new THREE.Euler(...(receivingToad.rotationEuler ?? [0, 0, 0])),
        ),
    );
    expect(receivedPoint.distanceTo(toadMouth)).toBeLessThan(0.01);
    for (const lockedBearing of [0, 1, 2, 3, 4, 5, 7]) {
      expect(graph.state()[`dragon-${lockedBearing}`]).toBe(-0.18);
      expect(graph.state()[`ball-${lockedBearing}`]).toBe(0);
      expect(graph.state()[`toad-${lockedBearing}`]).toBe(0);
      expect(graph.state()[`gate-${lockedBearing}`]).toBe(-0.1);
      expect(graph.state()[`lock-${lockedBearing}`]).toBe(0.32);
    }

    reset.run(graph, () => undefined);
    for (const partId of [
      "vessel",
      "duzhu",
      "linkage-crown",
      ...Array.from({ length: 8 }, (_, bearing) => `dragon-${bearing}`),
      ...Array.from({ length: 8 }, (_, bearing) => `ball-${bearing}`),
      ...Array.from({ length: 8 }, (_, bearing) => `toad-${bearing}`),
      ...Array.from({ length: 8 }, (_, bearing) => `gate-${bearing}`),
      ...Array.from({ length: 8 }, (_, bearing) => `lock-${bearing}`),
    ]) {
      expect(graph.state()[partId], partId).toBe(0);
    }
  });

  it("declares a real vessel cutaway and a westward causal aid sequence", () => {
    expect(machine.aids).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "cutaway", partIds: ["vessel"] }),
        expect.objectContaining({
          kind: "powerPath",
          sequence: [
            "duzhu",
            "linkage-crown",
            "gate-6",
            "lock-6",
            "dragon-6",
            "ball-6",
            "toad-6",
          ],
        }),
        expect.objectContaining({ kind: "subDemo", triggerId: "quake" }),
      ]),
    );
  });

  it("keeps the fitted lid and inferred mechanism floor clear in every scheme", () => {
    const mouthContacts = Array.from(
      { length: 8 },
      (_, index) => [`dragon-${index}`, `ball-${index}`] as [string, string],
    );

    for (const schemeId of [undefined, "wangzhenduo", "fengrui"] as const) {
      const resolvedSpec = schemeId
        ? applySchemePatch(machine.spec, scheme(schemeId))
        : machine.spec;
      const resolvedModule = { ...machine, spec: resolvedSpec };
      const graph = new KinematicGraph(resolvedSpec);

      const collisions = collisionPairsAtAngle(resolvedModule, graph, 0);

      expect(collisions).not.toContainEqual(["vessel", "lid"]);
      expect(collisions).not.toContainEqual(["vessel", "floor-plate"]);
      expect(collisions).not.toContainEqual(["vessel", "linkage-crown"]);
      for (let bearing = 0; bearing < 8; bearing += 1) {
        expect(collisions).not.toContainEqual(["vessel", `gate-${bearing}`]);
        expect(collisions).not.toContainEqual(["linkage-crown", `gate-${bearing}`]);
        expect(collisions).not.toContainEqual([`gate-${bearing}`, `lock-${bearing}`]);
      }
      const rawSpec = { ...resolvedSpec, collisionWhitelist: [] };
      const rawCollisions = collisionPairsAtAngle(
        { ...machine, spec: rawSpec },
        new KinematicGraph(rawSpec),
        0,
      );
      for (const pair of mouthContacts) {
        expect(rawCollisions).toContainEqual(pair);
        expect(collisions).not.toContainEqual(pair);
      }
      const expectedWhitelist = [...mouthContacts];
      if (schemeId) {
        expect(collisions).not.toContainEqual(["floor-plate", "duzhu"]);
        expect(collisions).not.toContainEqual(["lid", "duzhu"]);
        expect(collisions).not.toContainEqual(["plinth", "duzhu"]);

        const pathPrefix = schemeId === "wangzhenduo" ? "wang-chute" : "feng-track";
        const intendedPairs = Array.from(
          { length: 8 },
          (_, index) => [`gate-${index}`, `${pathPrefix}-${index}`] as [string, string],
        );
        expectedWhitelist.push(...intendedPairs);
        for (const pair of intendedPairs) {
          expect(rawCollisions).toContainEqual(pair);
          expect(collisions).not.toContainEqual(pair);
        }
      }
      expect(resolvedSpec.collisionWhitelist).toEqual(expectedWhitelist);

      const releasedGraph = new KinematicGraph(rawSpec);
      releasedGraph.setInput("dragon-6", 0.24);
      releasedGraph.setInput("ball-6", 0.61);
      expect(
        collisionPairsAtAngle(
          { ...machine, spec: rawSpec },
          releasedGraph,
          releasedGraph.state()[rawSpec.primaryDrive],
        ),
      ).not.toContainEqual(["dragon-6", "ball-6"]);
    }
  });
});
