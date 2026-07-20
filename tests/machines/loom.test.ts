import { describe, expect, it } from "vitest";
import { Vector3 } from "three";

import {
  disposePartGeometry,
  partGeometryEntries,
} from "../../src/core/primitives";
import machine from "../../src/machines/loom/build";
import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";
import { planarCrankRodPose } from "../../src/sim/edges";
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

function activeParts(patch: SchemePatch): PartDef[] {
  const removed = new Set(patch.removePartIds ?? []);
  const overrides = new Map(
    (patch.overrideParts ?? []).map((part) => [part.id, part]),
  );
  const parts = machine.spec.parts
    .filter((part) => !removed.has(part.id))
    .map((part) => ({ ...part, ...(overrides.get(part.id) ?? {}) }) as PartDef);
  for (const part of patch.addParts ?? []) {
    const index = parts.findIndex((candidate) => candidate.id === part.id);
    if (index >= 0) parts[index] = part;
    else parts.push(part);
  }
  return parts;
}

function provenanceFor(part: PartDef, path: string): Provenance | undefined {
  return part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"];
}

function referencesResolve(reference: string, sources: Set<string>): boolean {
  return reference.split("+").every((item) => sources.has(item.trim()));
}

describe("loom machine module", () => {
  it("constructs the base graph and both scholar schemes", () => {
    expect(() => new KinematicGraph(machine.spec)).not.toThrow();
    const graph = new KinematicGraph(machine.spec);

    for (const id of ["sliding-frame", "linkage"]) {
      expect(() => graph.setScheme(scheme(id))).not.toThrow();
      expect(graph.state()).toHaveProperty("heddle-7");
    }

    expect(machine.defaultSchemeId).toBe("sliding-frame");
    expect(Object.keys(machine.schemes ?? {})).toEqual([
      "sliding-frame",
      "linkage",
    ]);
  });

  it("covers every active part and numeric geometry field with provenance", () => {
    const sourceIds = new Set(machine.data.sources.map((source) => source.id));

    for (const id of ["sliding-frame", "linkage"]) {
      for (const part of activeParts(scheme(id))) {
        expect(["wenxian", "wenwu", "tuice"]).toContain(part.provenance.kind);
        expect(part.provenance.ref.trim()).not.toBe("");
        if (part.provenance.kind !== "tuice") {
          expect(
            referencesResolve(part.provenance.ref, sourceIds),
            part.id,
          ).toBe(true);
        }
        expect(part.assemblyStep, `${id}:${part.id}.assemblyStep`).toBeTypeOf(
          "number",
        );
        expect(
          part.explodeVector,
          `${id}:${part.id}.explodeVector`,
        ).toHaveLength(3);

        const paths = numericPaths(part.geometry);
        if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");
        for (const path of paths) {
          const provenance = provenanceFor(part, path);
          expect(provenance, `${id}:${part.id}.${path}`).toBeDefined();
          expect(provenance?.ref.trim(), `${id}:${part.id}.${path}`).not.toBe(
            "",
          );
          if (part.dimensionProvenance[path] === undefined) {
            expect(provenance?.kind, `${id}:${part.id}.${path} @rest`).toBe(
              "tuice",
            );
          }
        }
      }
    }
  });

  it("preserves the measured envelopes and declared representative counts", () => {
    const slidingFrame = machine.spec.parts.find(
      (part) => part.id === "loom-frame",
    );
    const linkageFrame = activeParts(scheme("linkage")).find(
      (part) => part.id === "loom-frame",
    );
    const treadles = machine.spec.parts.find(
      (part) => part.id === "treadle-bank",
    );
    const threads = machine.spec.parts.filter((part) =>
      part.id.startsWith("warp-shed"),
    );

    expect(slidingFrame?.geometry).toMatchObject({
      type: "custom",
      params: { length: 0.85, width: 0.26, height: 0.5 },
    });
    expect(linkageFrame?.geometry).toMatchObject({
      type: "custom",
      params: {
        length: 0.63,
        width: 0.19,
        height: 0.37,
        crossRailRatio: 0.2,
        selectorGuideInset: 0.5,
        selectorXRatio: 0.26,
      },
    });
    expect(treadles?.geometry).toMatchObject({
      type: "custom",
      params: { count: 12, cordHeightRatio: 1.25 },
    });
    expect(threads).toHaveLength(2);
    expect(
      threads.reduce(
        (sum, part) =>
          sum +
          (part.geometry.type === "custom" ? part.geometry.params.count : 0),
        0,
      ),
    ).toBe(48);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("heddle-")),
    ).toHaveLength(8);
    expect(
      machine.spec.parts.filter((part) => part.id.startsWith("selector-cam-")),
    ).toHaveLength(8);
    const threadHandoffs = ["warp-shed", "warp-shed-odd"].flatMap((layer) =>
      Array.from(
        { length: 8 },
        (_, index) => [layer, `heddle-${index}`] as [string, string],
      ),
    );
    const weavingContacts = [
      ["warp-beam", "warp-shed"],
      ["warp-beam", "warp-shed-odd"],
      ["cloth-beam", "woven-cloth"],
      ...Array.from(
        { length: 8 },
        (_, index) => [
          "treadle-bank",
          `selector-cam-${index}`,
        ] as [string, string],
      ),
      ["warp-shed", "beater"],
      ["warp-shed-odd", "beater"],
      ...threadHandoffs,
    ];
    expect(machine.spec.collisionWhitelist).toEqual(weavingContacts);
    expect(scheme("linkage").collisionWhitelist).toEqual([
      ["linkage-crank", "linkage-bar-low"],
      ["linkage-bar-low", "linkage-bar-high"],
      ...weavingContacts,
    ]);
    const rawSpec = { ...machine.spec, collisionWhitelist: [] };
    const rawContacts = collisionPairsAtAngle(
      { ...machine, spec: rawSpec },
      new KinematicGraph(rawSpec),
      0,
    );
    const filteredContacts = collisionPairsAtAngle(
      machine,
      new KinematicGraph(machine.spec),
      0,
    );
    for (const handoff of threadHandoffs) {
      expect(rawContacts).toContainEqual(handoff);
      expect(filteredContacts).not.toContainEqual(handoff);
    }
    for (const staleContact of [
      ["warp-shed", "woven-cloth"],
      ["warp-shed-odd", "woven-cloth"],
    ]) {
      expect(rawContacts).not.toContainEqual(staleContact);
      expect(machine.spec.collisionWhitelist).not.toContainEqual(staleContact);
    }
    for (const patch of [undefined, scheme("sliding-frame")] as const) {
      const resolvedSpec = patch
        ? applySchemePatch(machine.spec, patch)
        : machine.spec;
      for (const angle of [0, Math.PI / 3, Math.PI]) {
        const contacts = collisionPairsAtAngle(
          { ...machine, spec: resolvedSpec },
          new KinematicGraph(resolvedSpec),
          angle,
        );
        expect(contacts).not.toContainEqual(["treadle-bank", "warp-shed"]);
        expect(contacts).not.toContainEqual([
          "treadle-bank",
          "warp-shed-odd",
        ]);
      }
    }
    const linkageSpec = applySchemePatch(machine.spec, scheme("linkage"));
    const rawLinkageSpec = { ...linkageSpec, collisionWhitelist: [] };
    expect(scheme("linkage").collisionWhitelist).not.toContainEqual([
      "loom-frame",
      "linkage-bar-low",
    ]);
    for (const angle of [
      0,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
      Math.PI * 2,
    ]) {
      expect(
        collisionPairsAtAngle(
          { ...machine, spec: rawLinkageSpec },
          new KinematicGraph(rawLinkageSpec),
          angle,
        ),
      ).not.toContainEqual(["loom-frame", "linkage-bar-low"]);
    }
    for (const patch of [
      undefined,
      scheme("sliding-frame"),
      scheme("linkage"),
    ] as const) {
      const resolvedSpec = patch
        ? applySchemePatch(machine.spec, patch)
        : machine.spec;
      const beaterSpec = {
        ...resolvedSpec,
        driveNodes: ["beater"],
        primaryDrive: "beater",
      };
      for (const shuttleState of [0, 0.12, 0.24]) {
        for (const beaterAngle of [0, 0.075, 0.15]) {
          const graph = new KinematicGraph(beaterSpec);
          graph.setInput("shuttle", shuttleState);
          expect(
            collisionPairsAtAngle(
              { ...machine, spec: beaterSpec },
              graph,
              beaterAngle,
            ),
          ).not.toContainEqual(["beater", "shuttle"]);
        }
      }
    }
    for (const patch of [
      undefined,
      scheme("sliding-frame"),
      scheme("linkage"),
    ] as const) {
      const resolvedSpec = patch
        ? applySchemePatch(machine.spec, patch)
        : machine.spec;
      const graph = new KinematicGraph(resolvedSpec);
      graph.setInput("shuttle", 0);
      const contacts = collisionPairsAtAngle(
        { ...machine, spec: resolvedSpec },
        graph,
        0,
      );
      expect(contacts).not.toContainEqual(["warp-shed", "shuttle"]);
      expect(contacts).not.toContainEqual(["warp-shed-odd", "shuttle"]);
    }
    for (const [patch, angles] of [
      [undefined, [0.4536882396426711, 0.7228589590808155]],
      [
        scheme("sliding-frame"),
        [0.4536882396426711, 0.7228589590808155],
      ],
      [scheme("linkage"), [0.21820874737494994, 0.34442120332702897]],
    ] as const) {
      const resolvedSpec = patch
        ? applySchemePatch(machine.spec, patch)
        : machine.spec;
      for (let index = 0; index < 8; index += 1) {
        expect(resolvedSpec.collisionWhitelist).not.toContainEqual([
          "warp-shed-odd",
          `selector-cam-${index}`,
        ]);
      }
      for (const angle of angles) {
        const contacts = collisionPairsAtAngle(
          { ...machine, spec: resolvedSpec },
          new KinematicGraph(resolvedSpec),
          angle,
        );
        for (let index = 0; index < 8; index += 1) {
          expect(contacts).not.toContainEqual([
            "warp-shed-odd",
            `selector-cam-${index}`,
          ]);
        }
      }
    }
    for (const id of [
      "warp-shed",
      "warp-shed-odd",
      "beater",
      "shuttle",
      "single-hook",
      "weft-counter",
    ]) {
      expect(
        machine.spec.parts.find((part) => part.id === id)?.joint,
        id,
      ).toBeDefined();
    }
    expect(treadles?.joint).toBeUndefined();
  }, 30_000);

  it("uses semantic silhouettes for the named weaving parts", () => {
    const expectedBuilders = new Map([
      ["warp-beam", "loomBeam"],
      ["cloth-beam", "loomBeam"],
      ["woven-cloth", "loomCloth"],
      ["beater", "loomBeater"],
      ["shuttle", "loomShuttle"],
      ["single-hook", "loomHook"],
      ["selector-carriage", "loomCarriage"],
    ]);

    for (const [partId, builder] of expectedBuilders) {
      const part = machine.spec.parts.find(
        (candidate) => candidate.id === partId,
      );
      expect(part?.geometry).toMatchObject({ type: "custom", builder });
    }
    for (const prefix of ["selector-cam-", "heddle-"]) {
      const parts = machine.spec.parts.filter((part) =>
        part.id.startsWith(prefix),
      );
      expect(parts).toHaveLength(8);
      for (const part of parts) expect(part.geometry.type).toBe("custom");
    }

    for (const builder of Object.values(machine.customBuilders ?? {})) {
      const geometry = builder({
        beam: 0.02,
        count: 8,
        depth: 0.007,
        height: 0.05,
        indexOffset: 0,
        indexStep: 1,
        length: 0.15,
        radius: 0.007,
        spread: 0.14,
        thickness: 0.004,
        totalCount: 8,
        width: 0.14,
      });
      expect(
        partGeometryEntries(geometry).every(
          (entry) =>
            entry.getAttribute("position").count > 0 &&
            entry.boundingBox !== null &&
            entry.boundingSphere !== null &&
            Number.isFinite(entry.boundingSphere.radius),
        ),
      ).toBe(true);
      disposePartGeometry(geometry);
    }

    const shuttle = machine.spec.parts.find((part) => part.id === "shuttle");
    const treadles = machine.spec.parts.find(
      (part) => part.id === "treadle-bank",
    );
    const warpBeam = machine.spec.parts.find((part) => part.id === "warp-beam");
    const clothBeam = machine.spec.parts.find(
      (part) => part.id === "cloth-beam",
    );
    const beater = machine.spec.parts.find((part) => part.id === "beater");
    const carriage = machine.spec.parts.find(
      (part) => part.id === "selector-carriage",
    );
    if (shuttle?.geometry.type !== "custom") {
      throw new Error("Missing semantic shuttle geometry");
    }
    const shuttleBuilder = machine.customBuilders?.loomShuttle;
    if (!shuttleBuilder) throw new Error("Missing loomShuttle builder");
    const shuttleGeometry = shuttleBuilder(shuttle.geometry.params);
    const shuttleEntries = partGeometryEntries(shuttleGeometry);
    expect(shuttleEntries).toHaveLength(2);
    const shuttleHull = shuttleEntries.find(
      (entry) => entry.userData.mechanicaSemantic?.kind === "boat-shuttle-hull",
    );
    const shuttleBobbin = shuttleEntries.find(
      (entry) =>
        entry.userData.mechanicaSemantic?.kind === "moving-weft-bobbin",
    );
    if (!shuttleHull || !shuttleBobbin) {
      throw new Error("Shuttle silhouette or moving weft witness is missing");
    }
    const shuttleSize = shuttleHull.boundingBox!.getSize(new Vector3());
    expect(shuttle.joint?.axis).toEqual([0, 0, 1]);
    expect(shuttleSize.z).toBeGreaterThan(shuttleSize.x);
    expect(shuttleSize.z).toBeGreaterThan(shuttleSize.y);
    expect(shuttleSize.x).toBeLessThanOrEqual(
      shuttle.geometry.params.width + 1e-8,
    );
    expect(shuttleSize.y).toBeLessThanOrEqual(
      shuttle.geometry.params.height + 1e-8,
    );
    expect(shuttleSize.z).toBeLessThanOrEqual(
      shuttle.geometry.params.length + 1e-8,
    );
    expect(shuttleHull.userData.mechanicaMaterial.color).toBe("#e7a33e");
    expect(shuttleBobbin.userData.mechanicaMaterial.color).toBe("#42e4d1");
    disposePartGeometry(shuttleGeometry);
    expect(warpBeam?.position).toEqual([-0.25, 0.285, 0]);
    expect(clothBeam?.position).toEqual([0.25, 0.285, 0]);
    expect(beater?.position).toEqual([0.045, 0.315, 0]);
    expect(shuttle.position).toEqual([0.027, 0.32, -0.12]);
    expect(shuttle.joint?.limits).toEqual([0, 0.24]);

    const selectorCam = machine.spec.parts.find(
      (part) => part.id === "selector-cam-7",
    );
    if (selectorCam?.geometry.type !== "custom") {
      throw new Error("Missing selector cam geometry");
    }
    const selectorCamBuilder = machine.customBuilders?.loomCam;
    if (!selectorCamBuilder) throw new Error("Missing loomCam builder");
    const selectorCamGeometry = partGeometryEntries(
      selectorCamBuilder(selectorCam.geometry.params),
    )[0];
    expect(selectorCamGeometry.boundingBox!.max.y).toBeCloseTo(
      selectorCam.geometry.params.radius * 13.42,
      6,
    );
    disposePartGeometry(selectorCamGeometry);

    expect(treadles?.position).toEqual([-0.2, 0.035, 0]);
    expect(treadles?.explodeVector?.[1]).toBeGreaterThanOrEqual(-0.16);
    expect(
      Math.hypot(...(treadles?.explodeVector ?? [0, 0, 0])),
    ).toBeGreaterThanOrEqual(0.15);
    for (const id of ["sliding-frame", "linkage"]) {
      for (const part of activeParts(scheme(id))) {
        const distance = Math.hypot(...(part.explodeVector ?? [0, 0, 0]));
        expect(distance, `${id}:${part.id}`).toBeGreaterThanOrEqual(0.1);
        expect(distance, `${id}:${part.id}`).toBeLessThanOrEqual(0.25);
      }
    }
    if (treadles?.geometry.type !== "custom") {
      throw new Error("Missing installed treadle-bank geometry");
    }
    const treadleBuilder = machine.customBuilders?.loomTreadles;
    if (!treadleBuilder) throw new Error("Missing loomTreadles builder");
    const treadleGeometry = treadleBuilder(treadles.geometry.params);
    const treadleEntries = partGeometryEntries(treadleGeometry);
    expect(treadleEntries).toHaveLength(3);
    expect(
      (treadleEntries[0].boundingBox?.max.y ?? Number.POSITIVE_INFINITY) +
        treadles.position[1],
    ).toBeGreaterThan(0.23);
    expect(
      (treadleEntries[0].boundingBox?.max.y ?? Number.NEGATIVE_INFINITY) +
        treadles.position[1],
    ).toBeLessThan(0.27);
    expect(treadleEntries[0].userData.mechanicaSemantic).toMatchObject({
      kind: "treadle-selector-harness",
    });
    const animatedTreadles = treadleEntries.find(
      (entry) => typeof entry.userData.mechanicaUpdate === "function",
    );
    if (!animatedTreadles) throw new Error("Treadle bank is not animated");
    const rest = Float32Array.from(
      animatedTreadles.getAttribute("position").array as ArrayLike<number>,
    );
    animatedTreadles.userData.mechanicaUpdate(Math.PI / 8);
    expect(
      Array.from(
        animatedTreadles.getAttribute("position").array as ArrayLike<number>,
      ),
    ).not.toEqual(Array.from(rest));
    expect(animatedTreadles.boundingBox?.min.y).toBeGreaterThan(-0.05);
    expect(animatedTreadles.boundingBox?.min.y).toBeLessThan(-0.025);
    expect(animatedTreadles.boundingBox?.max.x).toBeLessThan(0.25);
    const selectorPull = treadleEntries.find(
      (entry) =>
        entry.userData.mechanicaSemantic?.kind === "selector-pull-witness",
    );
    if (!selectorPull) throw new Error("Missing selector pull witness");
    const pullRestY = selectorPull.boundingBox!.getCenter(new Vector3()).y;
    selectorPull.userData.mechanicaUpdate(Math.PI / 8);
    expect(
      selectorPull.boundingBox!.getCenter(new Vector3()).y - pullRestY,
    ).toBeLessThan(-0.01);
    disposePartGeometry(treadleGeometry);

    const threadBuilder = machine.customBuilders?.loomThreads;
    if (!threadBuilder) throw new Error("Missing loomThreads builder");
    const evenThreadGeometry = partGeometryEntries(
      threadBuilder({
        count: 24,
        totalCount: 48,
        indexOffset: 0,
        indexStep: 2,
        length: 0.5,
        radius: 0.001,
        spread: 0.14,
      }),
    )[0];
    const oddThreadGeometry = partGeometryEntries(
      threadBuilder({
        count: 24,
        totalCount: 48,
        indexOffset: 1,
        indexStep: 2,
        length: 0.5,
        radius: 0.001,
        spread: 0.14,
      }),
    )[0];
    const evenRestY = evenThreadGeometry.boundingBox!.min.y;
    const oddRestY = oddThreadGeometry.boundingBox!.min.y;
    evenThreadGeometry.userData.mechanicaUpdate(0.0004);
    oddThreadGeometry.userData.mechanicaUpdate(0.0004);
    expect(evenThreadGeometry.userData.mechanicaMaterial.color).toBe(
      "#f1d58a",
    );
    expect(oddThreadGeometry.userData.mechanicaMaterial.color).toBe(
      "#c95c48",
    );
    expect(evenThreadGeometry.boundingBox!.min.y - evenRestY).toBeGreaterThan(
      0.008,
    );
    expect(oddThreadGeometry.boundingBox!.min.y - oddRestY).toBeLessThan(
      -0.008,
    );
    expect(evenThreadGeometry.boundingBox!.max.y + 0.0004).toBeLessThan(0.081);
    expect(oddThreadGeometry.boundingBox!.min.y - 0.0004).toBeGreaterThan(
      -0.026,
    );
    disposePartGeometry(evenThreadGeometry);
    disposePartGeometry(oddThreadGeometry);

    const heddles = machine.spec.parts.filter((part) =>
      part.id.startsWith("heddle-"),
    );
    expect(heddles.map((part) => part.position[0])).toEqual([
      -0.115, -0.103, -0.091, -0.079, -0.067, -0.055, -0.043, -0.031,
    ]);
    expect(heddles.every((part) => part.position[2] === 0)).toBe(true);
    expect(heddles.every((part) => part.rotationEuler === undefined)).toBe(
      true,
    );
    expect(carriage?.joint?.axis).toEqual([1, 0, 0]);
    expect(
      machine.spec.parts
        .filter((part) => part.id.startsWith("selector-cam-"))
        .every((part) => part.position[1] === 0.18),
    ).toBe(true);

    const cloth = machine.spec.parts.find((part) => part.id === "woven-cloth");
    if (cloth?.geometry.type !== "custom") {
      throw new Error("Missing woven cloth geometry");
    }
    const clothBuilder = machine.customBuilders?.loomCloth;
    if (!clothBuilder) throw new Error("Missing loomCloth builder");
    const clothGeometry = clothBuilder(cloth.geometry.params);
    const clothEntries = partGeometryEntries(clothGeometry);
    expect(clothEntries).toHaveLength(4);
    expect(
      new Set(
        clothEntries.map(
          (entry) => entry.userData.mechanicaMaterial.color as string,
        ),
      ).size,
    ).toBe(4);
    expect(
      clothEntries.every(
        (entry) => typeof entry.userData.mechanicaUpdate === "function",
      ),
    ).toBe(true);
    const programA = clothEntries.find(
      (entry) => entry.userData.mechanicaMaterial.color === "#d6a844",
    );
    const programB = clothEntries.find(
      (entry) => entry.userData.mechanicaMaterial.color === "#86d0ba",
    );
    const clothGround = clothEntries.find(
      (entry) => entry.userData.mechanicaMaterial.color === "#8f2e2a",
    );
    const advanceBand = clothEntries.find(
      (entry) => entry.userData.mechanicaMaterial.color === "#f5e5a6",
    );
    if (!clothGround || !advanceBand || !programA || !programB) {
      throw new Error("Cloth programs do not have distinct visible motifs");
    }
    const readyMinX = clothGround.boundingBox!.min.x;
    const readyMaxX = clothGround.boundingBox!.max.x;
    clothGround.userData.mechanicaUpdate(0.18);
    expect(clothGround.boundingBox!.min.x).toBeLessThan(readyMinX - 0.03);
    expect(clothGround.boundingBox!.max.x).toBeCloseTo(readyMaxX, 6);
    const readyBandX = advanceBand.boundingBox!.getCenter(new Vector3()).x;
    advanceBand.userData.mechanicaUpdate(0.18);
    expect(
      advanceBand.boundingBox!.getCenter(new Vector3()).x - readyBandX,
    ).toBeGreaterThan(0.09);
    expect(advanceBand.boundingBox!.max.x).toBeLessThan(0.09);
    expect(programA.boundingBox!.min.y).toBeGreaterThan(-1e-9);
    expect(programB.boundingBox!.max.y).toBeLessThan(0);
    programA.userData.mechanicaUpdate(1);
    programB.userData.mechanicaUpdate(1);
    expect(programA.boundingBox!.max.y).toBeLessThan(0);
    expect(programB.boundingBox!.min.y).toBeGreaterThan(-1e-9);
    disposePartGeometry(clothGeometry);
  });

  it("declares causal aids and a real frame cutaway", () => {
    expect(machine.aids?.map((aid) => aid.kind)).toEqual([
      "callouts",
      "powerPath",
      "flowParticles",
      "cutaway",
      "subDemo",
    ]);
    expect(machine.aids?.find((aid) => aid.kind === "powerPath")).toMatchObject(
      {
        sequence: [
          "treadle-bank",
          "selector-carriage",
          "single-hook",
          "selector-cam-0",
          "heddle-0",
          "warp-shed",
          "shuttle",
          "beater",
          "woven-cloth",
          "cloth-beam",
        ],
      },
    );
    expect(machine.aids?.find((aid) => aid.kind === "cutaway")).toMatchObject({
      partIds: ["loom-frame"],
    });
  });

  it("keeps expected ratios empty for the reciprocating machine", () => {
    expect(machine.spec.expectedRatios).toEqual([]);
    const graph = new KinematicGraph(machine.spec);
    for (const ratio of machine.spec.expectedRatios ?? []) {
      expect(graph.ratioBetween(ratio.from, ratio.to)).toBeCloseTo(
        ratio.ratio,
        12,
      );
    }
  });

  it("gives the two selectors different stored programs", () => {
    const sliding = new KinematicGraph(machine.spec);
    sliding.setScheme(scheme("sliding-frame"));
    const linked = new KinematicGraph(machine.spec);
    linked.setScheme(scheme("linkage"));

    const phasePerHook = (Math.PI * 2) / 0.02;
    expect(sliding.ratioBetween("single-hook", "selector-cam-0")).toBeCloseTo(
      phasePerHook,
      12,
    );
    expect(linked.ratioBetween("single-hook", "selector-cam-0")).toBeCloseTo(
      8 * phasePerHook,
      12,
    );
    expect(
      activeParts(scheme("sliding-frame")).some(
        (part) => part.id === "selector-carriage",
      ),
    ).toBe(true);
    expect(
      activeParts(scheme("linkage")).some(
        (part) => part.id === "selector-carriage",
      ),
    ).toBe(false);
    const linkageParts = activeParts(scheme("linkage"));
    expect(
      linkageParts.filter((part) => part.id.startsWith("linkage-")),
    ).toHaveLength(3);
    for (const id of [
      "single-hook",
      "linkage-crank",
      "linkage-bar-low",
      "linkage-bar-high",
    ]) {
      expect(linkageParts.find((part) => part.id === id)?.position[2]).toBe(
        0.105,
      );
    }
    expect(
      linkageParts.find((part) => part.id === "linkage-crank"),
    ).toMatchObject({
      geometry: { type: "link", width: 0.011 },
      material: "bronze",
    });
    expect(
      linkageParts.find((part) => part.id === "linkage-bar-high"),
    ).toMatchObject({
      geometry: { type: "link", width: 0.009 },
      material: "iron",
    });

    for (const phase of [Math.PI / 32, Math.PI / 16, (3 * Math.PI) / 32]) {
      sliding.setInput("treadle-bank", phase);
      linked.setInput("treadle-bank", phase);
      const slidingPattern = Array.from(
        { length: 8 },
        (_, index) => sliding.state()[`heddle-${index}`],
      );
      const linkagePattern = Array.from(
        { length: 8 },
        (_, index) => linked.state()[`heddle-${index}`],
      );
      expect(slidingPattern, `phase ${phase}`).not.toEqual(linkagePattern);
    }
  });

  it("transmits each program through its named selector mechanism", () => {
    const sliding = new KinematicGraph(machine.spec);
    sliding.setScheme(scheme("sliding-frame"));
    expect(sliding.ratioBetween("selector-carriage", "single-hook")).toBe(0.4);
    expect(sliding.ratioBetween("single-hook", "selector-cam-0")).toBeCloseTo(
      (Math.PI * 2) / 0.02,
      12,
    );
    sliding.setInput("treadle-bank", Math.PI / 3);
    expect(sliding.state()["selector-carriage"]).toBeCloseTo(0.0125, 12);
    expect(sliding.state()["single-hook"]).toBeCloseTo(0.005, 12);
    expect(sliding.state()["heddle-0"]).toBeCloseTo(0.05, 12);
    expect(sliding.state()["warp-shed"]).toBeCloseTo(0.025, 12);

    const linked = new KinematicGraph(machine.spec);
    linked.setScheme(scheme("linkage"));
    expect(linked.ratioBetween("treadle-bank", "linkage-crank")).toBe(1);
    expect(linked.ratioBetween("linkage-bar-high", "single-hook")).toBe(1);
    expect(linked.ratioBetween("single-hook", "selector-cam-0")).toBeCloseTo(
      (8 * Math.PI * 2) / 0.02,
      12,
    );
    linked.setInput("treadle-bank", Math.PI / 2);
    expect(linked.state()["linkage-crank"]).toBeCloseTo(Math.PI / 2, 12);
    expect(linked.state()["linkage-bar-high"]).toBeGreaterThan(0);
    expect(linked.state()["single-hook"]).toBeGreaterThan(0);
    expect(
      Array.from(
        { length: 8 },
        (_, index) => linked.state()[`heddle-${index}`],
      ).some((lift) => lift > 0),
    ).toBe(true);
    expect(linked.state()["warp-shed"]).toBeCloseTo(
      linked.state()["heddle-0"] * 0.5,
      12,
    );

    const linkedSpec = applySchemePatch(machine.spec, scheme("linkage"));
    const crankIndex = linkedSpec.constraints.findIndex(
      (constraint) => constraint.type === "crank",
    );
    const firstHeddleCamIndex = linkedSpec.constraints.findIndex(
      (constraint) =>
        constraint.type === "cam" && constraint.follower === "heddle-0",
    );
    expect(crankIndex).toBeGreaterThanOrEqual(0);
    expect(crankIndex).toBeLessThan(firstHeddleCamIndex);
  });

  it("keeps both linkage pin endpoints coincident throughout the cycle", () => {
    const linkedSpec = applySchemePatch(machine.spec, scheme("linkage"));
    const graph = new KinematicGraph(linkedSpec);
    const crank = linkedSpec.parts.find((part) => part.id === "linkage-crank");
    const high = linkedSpec.parts.find(
      (part) => part.id === "linkage-bar-high",
    );
    const constraint = linkedSpec.constraints.find(
      (candidate) => candidate.type === "crank",
    );
    if (
      !crank ||
      crank.geometry.type !== "link" ||
      !high ||
      high.geometry.type !== "link" ||
      constraint?.type !== "crank"
    ) {
      throw new Error("Linkage pin fixture is incomplete");
    }
    const rod = linkedSpec.parts.find((part) => part.id === constraint.rod);
    expect(rod?.geometry).toMatchObject({
      type: "link",
      length: constraint.rodLength,
    });

    for (let sample = 0; sample <= 64; sample += 1) {
      const theta = (Math.PI * 2 * sample) / 64;
      graph.setInput("treadle-bank", theta);
      const pose = planarCrankRodPose(
        theta,
        crank.position,
        constraint.crankRadius,
        constraint.rodLength,
      );
      const crankAngle =
        (crank.rotationEuler?.[2] ?? 0) + graph.state()[crank.id];
      const crankHalfLength = crank.geometry.length / 2;
      const crankEndpoint = [
        crank.position[0] + Math.cos(crankAngle) * crankHalfLength,
        crank.position[1] + Math.sin(crankAngle) * crankHalfLength,
        crank.position[2],
      ];
      const highAngle = high.rotationEuler?.[2] ?? 0;
      const highHalfLength = high.geometry.length / 2;
      const highEndpoint = [
        high.position[0] + Math.cos(highAngle) * highHalfLength,
        high.position[1] +
          graph.state()[high.id] +
          Math.sin(highAngle) * highHalfLength,
        high.position[2],
      ];

      for (let axis = 0; axis < 3; axis += 1) {
        expect(crankEndpoint[axis], `crank pin ${sample}:${axis}`).toBeCloseTo(
          pose.crankPin[axis],
          12,
        );
        expect(highEndpoint[axis], `slider pin ${sample}:${axis}`).toBeCloseTo(
          pose.sliderPin[axis],
          12,
        );
      }
    }
  });

  it("cycles all eight heddles without exceeding the 0.05 m lift", () => {
    for (const id of ["sliding-frame", "linkage"]) {
      const graph = new KinematicGraph(machine.spec);
      graph.setScheme(scheme(id));
      const maxima = Array.from({ length: 8 }, () => 0);

      for (let sample = 0; sample <= 256; sample += 1) {
        graph.setInput("treadle-bank", (Math.PI * 2 * sample) / 256);
        expect(
          graph.state()["single-hook"],
          `${id}:single-hook`,
        ).toBeLessThanOrEqual(0.02 + 1e-12);
        const selectorId =
          id === "sliding-frame" ? "selector-carriage" : "linkage-bar-high";
        const selectorLimit = id === "sliding-frame" ? 0.05 : 0.02;
        expect(
          graph.state()[selectorId],
          `${id}:${selectorId}`,
        ).toBeLessThanOrEqual(selectorLimit + 1e-12);
        for (let index = 0; index < 8; index += 1) {
          const lift = graph.state()[`heddle-${index}`];
          expect(lift, `${id}:heddle-${index}`).toBeGreaterThanOrEqual(0);
          expect(lift, `${id}:heddle-${index}`).toBeLessThanOrEqual(
            0.05 + 1e-12,
          );
          maxima[index] = Math.max(maxima[index], lift);
        }
        expect(graph.state()["warp-shed"]).toBeCloseTo(
          graph.state()["heddle-0"] * 0.5,
          12,
        );
        expect(graph.state()["warp-shed-odd"]).toBeCloseTo(
          graph.state()["heddle-4"] * 0.5,
          12,
        );
      }
      for (const maximum of maxima) expect(maximum).toBeGreaterThan(0.049);
    }
  });

  it("runs every trigger, inserts weft, and advances the counter", () => {
    expect(machine.mechanism?.triggers.map((trigger) => trigger.id)).toEqual([
      "spotlight",
      "reorder-heddles",
      "weft-insertion",
    ]);

    for (const trigger of machine.mechanism?.triggers ?? []) {
      const graph = new KinematicGraph(machine.spec);
      graph.setScheme(scheme("sliding-frame"));
      const events: Array<{ type: string; part: string }> = [];
      trigger.run(graph, (type, part) => events.push({ type, part }), 2);
      expect(events.length).toBeGreaterThan(0);
      if (trigger.id === "spotlight") {
        expect(events).toEqual(
          expect.arrayContaining([
            { type: "program:active", part: "program-a" },
            { type: "program:reorder", part: "program-b" },
            {
              type: "pattern:contrast",
              part: "program-a/program-b",
            },
          ]),
        );
        expect(events.at(-1)).toEqual({ type: "spotlight:done", part: "loom" });
      }
      if (trigger.id === "reorder-heddles") {
        expect(events.slice(0, 3)).toEqual([
          { type: "program:reorder", part: "program-b" },
          { type: "program:order", part: "8-6-4-2-7-5-3-1" },
          { type: "program:scheme", part: "sliding-frame" },
        ]);
        expect(graph.state()).toHaveProperty("selector-carriage");
        expect(graph.state()).not.toHaveProperty("linkage-crank");
        expect(graph.ratioBetween("single-hook", "selector-cam-0")).toBeCloseTo(
          (8 * Math.PI * 2) / 0.02,
          12,
        );
      }
      expect(events).toEqual(
        expect.arrayContaining([
          { type: "cycle:ready", part: "treadle-bank" },
          { type: "treadle:press", part: "treadle-bank" },
          { type: "shed:open", part: "warp-shed" },
          { type: "weft:insert", part: "shuttle" },
          { type: "beat-up:advance", part: "beater" },
          { type: "cloth:update", part: "woven-cloth" },
          { type: "beat-up:return", part: "beater" },
        ]),
      );
      expect(graph.state()["weft-counter"]).toBe(
        trigger.id === "spotlight"
          ? 4
          : trigger.id === "weft-insertion"
            ? 2
            : 1,
      );
      expect(graph.state().shuttle).toBe(
        trigger.id === "reorder-heddles" ? 0.24 : 0,
      );
    }
  });

  it("records deterministic visible start, intermediate, and end states", () => {
    const trigger = machine.mechanism?.triggers.find(
      (candidate) => candidate.id === "weft-insertion",
    );
    if (!trigger) throw new Error("Missing weaving-cycle trigger");
    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(scheme("sliding-frame"));

    const run = () => {
      const captures: Array<{
        type: string;
        state: Record<string, number>;
      }> = [];
      trigger.run(graph, (type) => {
        captures.push({ type, state: graph.state() });
      });
      return captures;
    };
    const first = run();
    const second = run();
    const stateAt = (
      captures: typeof first,
      type: string,
    ): Record<string, number> => {
      const capture = captures.find((candidate) => candidate.type === type);
      if (!capture) throw new Error(`Missing capture ${type}`);
      return capture.state;
    };

    for (const captures of [first, second]) {
      expect(captures.map((capture) => capture.type)).toEqual(
        expect.arrayContaining([
          "cycle:ready",
          "treadle:press",
          "heddle:lift",
          "shed:open",
          "weft:insert",
          "beat-up:advance",
          "cloth:update",
          "beat-up:return",
        ]),
      );
      expect(stateAt(captures, "cycle:ready")).toMatchObject({
        "treadle-bank": 0,
        beater: 0,
        shuttle: 0,
        "weft-counter": 0,
        "woven-cloth": 0,
      });
      expect(stateAt(captures, "treadle:press")["treadle-bank"]).toBe(
        Math.PI / 8,
      );
      expect(stateAt(captures, "heddle:lift")["heddle-0"]).toBeGreaterThan(0);
      expect(stateAt(captures, "shed:open")["warp-shed"]).toBeGreaterThan(0);
      expect(stateAt(captures, "weft:insert").shuttle).toBe(0.24);
      expect(
        stateAt(captures, "weft:insert").shuttle -
          stateAt(captures, "shed:open").shuttle,
      ).toBeCloseTo(0.24, 12);
      expect(stateAt(captures, "beat-up:advance").beater).toBe(0.15);
      expect(stateAt(captures, "cloth:update")).toMatchObject({
        "weft-counter": 1,
        "woven-cloth": 0.18,
      });
      expect(stateAt(captures, "beat-up:return").beater).toBe(0);
    }
    expect(first.map((capture) => capture.state)).toEqual(
      second.map((capture) => capture.state),
    );
  });

  it("reorders the program without changing the linkage reconstruction", () => {
    const graph = new KinematicGraph(machine.spec);
    graph.setScheme(scheme("linkage"));
    const reorder = machine.mechanism?.triggers.find(
      (trigger) => trigger.id === "reorder-heddles",
    );
    const events: Array<{ type: string; part: string }> = [];

    reorder?.run(graph, (type, part) => events.push({ type, part }));

    expect(events.slice(0, 3)).toEqual([
      { type: "program:reorder", part: "program-a" },
      { type: "program:order", part: "1-3-5-7-2-4-6-8" },
      { type: "program:scheme", part: "linkage" },
    ]);
    expect(graph.state()).toHaveProperty("linkage-crank");
    expect(graph.state()).not.toHaveProperty("selector-carriage");
    expect(graph.ratioBetween("single-hook", "selector-cam-0")).toBeCloseTo(
      (Math.PI * 2) / 0.02,
      12,
    );
  });
});
