import { describe, expect, it } from "vitest";
import {
  assertMachineData,
  assertMachineModuleAids,
  assertPrincipleAids,
} from "../../src/data/schema";
import astroclock from "../../src/machines/astroclock/build";
import loom from "../../src/machines/loom/build";
import odometer from "../../src/machines/odometer/build";
import seismoscope from "../../src/machines/seismoscope/build";

const kindNames = {
  callouts: "Part callouts",
  cutaway: "Cutaway",
  flowParticles: "Flow path",
  powerPath: "Power path",
  subDemo: "Principle demo",
};

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

  it("validates astroclock aid references and its five-kind template", () => {
    expect(() => assertMachineModuleAids(astroclock)).not.toThrow();
    expect(new Set(astroclock.aids?.map((aid) => aid.kind) ?? []).size).toBe(5);
  });

  it("gives same-kind aid chips distinct resolved labels", () => {
    for (const machine of [astroclock, seismoscope, odometer, loom]) {
      const labels = new Set<string>();
      for (const aid of machine.aids ?? []) {
        const label =
          ("label" in aid ? aid.label?.en : undefined) ?? kindNames[aid.kind];
        const key = `${aid.kind}:${label}`;
        expect(labels.has(key), `${machine.spec.slug} repeats ${key}`).toBe(
          false,
        );
        labels.add(key);
      }
    }
  });

  it("rejects unresolved part, trigger, and custom-emitter references", () => {
    const missingPart = structuredClone(astroclock.aids!);
    missingPart[0] = {
      kind: "callouts",
      anchors: [
        { partId: "missing-part", label: { zh: "缺失", en: "Missing" } },
      ],
    };
    expect(() =>
      assertMachineModuleAids({ ...astroclock, aids: missingPart }),
    ).toThrow("$.aids[0].anchors[0].partId");

    const missingTrigger = structuredClone(astroclock.aids!);
    missingTrigger[4] = {
      kind: "subDemo",
      triggerId: "missing-trigger",
      caption: { zh: "缺失", en: "Missing" },
    };
    expect(() =>
      assertMachineModuleAids({ ...astroclock, aids: missingTrigger }),
    ).toThrow("$.aids[4].triggerId");

    expect(() =>
      assertMachineModuleAids({
        ...astroclock,
        customSceneBuilders: { testEmitter: () => ({}) },
        aids: [
          {
            kind: "flowParticles",
            flavor: "custom",
            emitter: "testEmitter",
            pathPartIds: ["shulun"],
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      assertMachineModuleAids({
        ...astroclock,
        aids: [
          {
            kind: "flowParticles",
            flavor: "custom",
            emitter: "missing-emitter",
            pathPartIds: ["shulun"],
          },
        ],
      }),
    ).toThrow("$.aids[0].emitter");
  });

  it("rejects undeclared module fields and ambiguous emitter declarations", () => {
    expect(() =>
      assertMachineModuleAids({
        ...astroclock,
        sectorLabels: ["甲"],
      } as typeof astroclock),
    ).toThrow("$.sectorLabels");

    expect(() =>
      assertPrincipleAids([
        {
          kind: "flowParticles",
          flavor: "smoke",
          emitter: "unregistered-standard-emitter",
          pathPartIds: ["shulun"],
        },
      ]),
    ).toThrow("$.aids[0].emitter");

    expect(() =>
      assertPrincipleAids([
        {
          kind: "flowParticles",
          flavor: "custom",
          pathPartIds: ["shulun"],
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
        ...astroclock.data,
        sectorLabels: [{ zh: "甲", en: "A" }],
      }),
    ).toThrow("$.sectorLabels");

    expect(() =>
      assertMachineData({
        ...astroclock.data,
        names: {
          ...astroclock.data.names,
          sectorLabels: [{ zh: "甲", en: "A" }],
        },
      }),
    ).toThrow("$.names.sectorLabels");
  });
});
