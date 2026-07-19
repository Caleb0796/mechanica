import { describe, expect, it } from "vitest";
import {
  assertMachineData,
  assertMachineModuleAids,
  assertPrincipleAids,
} from "../../src/data/schema";
import gimbal from "../../src/machines/gimbal/build";
import loom from "../../src/machines/loom/build";

describe("principle aid schema", () => {
  it("accepts all five declared aid shapes", () => {
    expect(() =>
      assertPrincipleAids([
        { kind: "powerPath", sequence: ["drive"], dwellMs: 500 },
        {
          kind: "callouts",
          anchors: [{ partId: "drive", label: { zh: "主动件", en: "Drive" } }],
        },
        {
          kind: "flowParticles",
          flavor: "custom",
          emitter: "testEmitter",
          pathPartIds: ["drive", "output"],
          rate: 12,
        },
        {
          kind: "cutaway",
          partIds: ["cover"],
          label: { zh: "剖视", en: "Cutaway" },
        },
        {
          kind: "subDemo",
          triggerId: "spotlight",
          caption: { zh: "演示", en: "Demonstrate" },
        },
      ]),
    ).not.toThrow();
  });

  it("rejects undeclared display fields with their exact paths", () => {
    expect(() =>
      assertPrincipleAids([
        {
          kind: "callouts",
          anchors: [{ partId: "drive", label: { zh: "主动件", en: "Drive" } }],
          sectorLabels: ["甲"],
        },
      ]),
    ).toThrow("$.aids[0].sectorLabels");

    expect(() =>
      assertPrincipleAids([
        {
          kind: "callouts",
          anchors: [
            {
              partId: "drive",
              label: { zh: "主动件", en: "Drive" },
              offset: 4,
            },
          ],
        },
      ]),
    ).toThrow("$.aids[0].anchors[0].offset");

    expect(() =>
      assertPrincipleAids([
        {
          kind: "cutaway",
          partIds: ["cover"],
          label: { zh: "剖视", en: "Cutaway", short: "Cut" },
        },
      ]),
    ).toThrow("$.aids[0].label.short");
  });

  it("requires complete inline bilingual strings", () => {
    expect(() =>
      assertPrincipleAids([
        {
          kind: "subDemo",
          triggerId: "spotlight",
          caption: { zh: "演示", en: " " },
        },
      ]),
    ).toThrow("$.aids[0].caption.en");
  });

  it("requires positive finite timing and particle rates", () => {
    expect(() =>
      assertPrincipleAids([
        { kind: "powerPath", sequence: ["drive"], dwellMs: 0 },
      ]),
    ).toThrow("$.aids[0].dwellMs");
    expect(() =>
      assertPrincipleAids([
        {
          kind: "flowParticles",
          flavor: "water",
          pathPartIds: ["channel"],
          rate: -1,
        },
      ]),
    ).toThrow("$.aids[0].rate");
  });

  it("validates gimbal aid references and its five-kind template", () => {
    expect(() => assertMachineModuleAids(gimbal)).not.toThrow();
    expect(new Set(gimbal.aids?.map((aid) => aid.kind) ?? []).size).toBe(5);
  });

  it("rejects unresolved part, trigger, and custom-emitter references", () => {
    const missingPart = structuredClone(gimbal.aids!);
    missingPart[0] = {
      kind: "callouts",
      anchors: [
        { partId: "missing-part", label: { zh: "缺失", en: "Missing" } },
      ],
    };
    expect(() =>
      assertMachineModuleAids({ ...gimbal, aids: missingPart }),
    ).toThrow("$.aids[0].anchors[0].partId");

    const missingTrigger = structuredClone(gimbal.aids!);
    missingTrigger[2] = {
      kind: "subDemo",
      triggerId: "missing-trigger",
      caption: { zh: "缺失", en: "Missing" },
    };
    expect(() =>
      assertMachineModuleAids({ ...gimbal, aids: missingTrigger }),
    ).toThrow("$.aids[2].triggerId");

    expect(() =>
      assertMachineModuleAids({
        ...gimbal,
        aids: [
          {
            kind: "flowParticles",
            flavor: "custom",
            emitter: "missing-emitter",
            pathPartIds: ["outer-ring"],
          },
        ],
      }),
    ).toThrow("$.aids[0].emitter");
  });

  it("rejects undeclared module fields and ambiguous emitter declarations", () => {
    expect(() =>
      assertMachineModuleAids({
        ...gimbal,
        sectorLabels: ["甲"],
      } as typeof gimbal),
    ).toThrow("$.sectorLabels");

    expect(() =>
      assertPrincipleAids([
        {
          kind: "flowParticles",
          flavor: "smoke",
          emitter: "unregistered-standard-emitter",
          pathPartIds: ["incense-bowl"],
        },
      ]),
    ).toThrow("$.aids[0].emitter");

    expect(() =>
      assertPrincipleAids([
        {
          kind: "flowParticles",
          flavor: "custom",
          pathPartIds: ["incense-bowl"],
        },
      ]),
    ).toThrow("$.aids[0].emitter");
  });

  it("accepts references to parts added by a declared reconstruction scheme", () => {
    expect(() =>
      assertMachineModuleAids({
        ...loom,
        aids: [
          {
            kind: "callouts",
            anchors: [
              {
                partId: "linkage-crank",
                label: { zh: "连杆曲柄", en: "Linkage crank" },
              },
            ],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects undeclared display fields in machine data", () => {
    expect(() =>
      assertMachineData({
        ...gimbal.data,
        sectorLabels: [{ zh: "甲", en: "A" }],
      }),
    ).toThrow("$.sectorLabels");

    expect(() =>
      assertMachineData({
        ...gimbal.data,
        names: {
          ...gimbal.data.names,
          sectorLabels: [{ zh: "甲", en: "A" }],
        },
      }),
    ).toThrow("$.names.sectorLabels");
  });
});
