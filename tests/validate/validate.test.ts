import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";
import type { MachineModule, PartDef, Provenance } from "../../src/sim/types";
import { KinematicGraph } from "../../src/sim/graph";
import { collisionPairsAtAngle } from "../../src/validate/collision";
import { isMissingMachineBuild } from "../../src/validate/imports";
import { validateProvenanceAndIntegrity } from "../../src/validate/provenance";
import { runValidation } from "../../src/validate/report";
import { createSamplingPlan } from "../../src/validate/sampling";

const cited: Provenance = { kind: "wenxian", ref: "source-1" };
const inferred: Provenance = { kind: "tuice", ref: "test-fixture" };

function gearPart(
  id: string,
  teeth: number,
  position: [number, number, number],
): PartDef {
  return {
    id,
    name: { zh: id, en: id },
    geometry: {
      type: "gear",
      module: 0.02,
      teeth,
      thickness: 0.02,
      toothStyle: "involute",
    },
    material: "wood",
    position,
    joint: { kind: "revolute", axis: [0, 1, 0] },
    provenance: cited,
    dimensionProvenance: {
      module: cited,
      teeth: cited,
      thickness: cited,
    },
  };
}

function boxPart(id: string, position: [number, number, number]): PartDef {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: "box", size: [0.1, 0.1, 0.1] },
    material: "wood",
    position,
    joint: { kind: "fixed", axis: [0, 0, 1] },
    provenance: inferred,
    dimensionProvenance: {
      "size.0": inferred,
      "size.1": inferred,
      "size.2": inferred,
    },
    schemeTags: ["test"],
  };
}

function miniModule(): MachineModule {
  return {
    spec: {
      slug: "fixture",
      parts: [
        gearPart("g20", 20, [0, 0, 0]),
        gearPart("g40", 40, [0.601, 0, 0]),
      ],
      constraints: [{ type: "mesh", a: "g20", b: "g40" }],
      driveNodes: ["g20"],
      primaryDrive: "g20",
      cycleRad: Math.PI * 2,
      expectedRatios: [
        { from: "g20", to: "g40", ratio: -0.5, sourceRef: "source-1" },
      ],
      collisionWhitelist: [["g20", "g40"]],
    },
    data: {
      slug: "demo",
      names: { zh: "测试", en: "Test" },
      era: { zh: "测试", en: "Test" },
      inventors: [{ zh: "测试", en: "Test" }],
      oneLiner: { zh: "测试", en: "Test" },
      principle: { zh: "测试", en: "Test" },
      sources: [
        {
          id: "source-1",
          book: "Test source",
          quote: "Test quote",
          url: "https://example.test/source",
        },
      ],
      dimensions: [],
      schemes: [],
      controversies: [],
      museums: [],
      images: [],
      ingenuity: {
        hook: { zh: "钩子", en: "Hook" },
        demo: { zh: "演示", en: "Demo" },
        echo: { zh: "回声", en: "Echo" },
      },
    },
    mechanism: {
      triggers: [
        {
          id: "spotlight",
          label: { zh: "聚光", en: "Spotlight" },
          run: (_graph, emit) => emit("spotlight:done", "g20"),
        },
      ],
    },
  };
}

function integrity(module: MachineModule) {
  return validateProvenanceAndIntegrity(module, {
    allowMissingSnapshots: true,
  });
}

describe("independent machine validation", () => {
  it("passes the declared 20/40 gear ratio", () => {
    const report = runValidation(miniModule(), {
      allowMissingSnapshots: true,
      when: "2026-01-01T00:00:00.000Z",
    });
    expect(
      report.checks.find((check) => check.id === "base:ratio-1"),
    ).toMatchObject({
      status: "pass",
      expected: -0.5,
      actual: -0.5,
    });
  }, 20_000);

  it("fails a corrupted expected ratio", () => {
    const module = miniModule();
    module.spec.expectedRatios![0].ratio = 0.75;
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find((check) => check.id === "base:ratio-1")?.status,
    ).toBe("fail");
  }, 20_000);

  it("executes mechanism triggers and requires spotlight completion", () => {
    const module = miniModule();
    module.mechanism!.triggers[0].run = () => {
      throw new Error("fixture trigger failure");
    };
    expect(
      integrity(module).find(
        (check) => check.id === "integrity:mechanism:trigger:spotlight",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("fixture trigger failure"),
    });

    module.mechanism!.triggers[0].run = () => undefined;
    expect(
      integrity(module).find(
        (check) => check.id === "integrity:mechanism:trigger:spotlight",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("spotlight:done"),
    });
  });

  it("fails an expected ratio with the opposite sign", () => {
    const module = miniModule();
    module.spec.expectedRatios![0].ratio = 0.5;
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find((check) => check.id === "base:ratio-1")?.status,
    ).toBe("fail");
  }, 20_000);

  it("requires every component of a composite source reference to resolve", () => {
    const module = miniModule();
    module.data.sources.push({
      id: "source-2",
      book: "Second test source",
      quote: "Second test quote",
      url: "https://example.test/source-2",
    });
    module.spec.expectedRatios![0].sourceRef = "source-1+source-2";
    module.spec.constraints.push({
      type: "lockstep",
      a: "g20",
      b: "g40",
      ratio: 2,
      provenance: { kind: "wenxian", ref: "source-1+source-2" },
    });
    expect(
      integrity(module).find((check) => check.id === "provenance:ratio:1")
        ?.status,
    ).toBe("pass");
    expect(
      integrity(module).find(
        (check) => check.id === "integrity:constraint:2:provenance",
      )?.status,
    ).toBe("pass");

    module.spec.expectedRatios![0].sourceRef = "source-1+missing-source";
    module.spec.constraints[1] = {
      type: "lockstep",
      a: "g20",
      b: "g40",
      ratio: 2,
      provenance: { kind: "wenxian", ref: "source-1+missing-source" },
    };
    expect(
      integrity(module).find((check) => check.id === "provenance:ratio:1")
        ?.status,
    ).toBe("fail");
    expect(
      integrity(module).find(
        (check) => check.id === "integrity:constraint:2:provenance",
      )?.status,
    ).toBe("fail");
  });

  it("fails a whitelisted gear pair whose axial gap prevents 3D contact", () => {
    const module = miniModule();
    module.spec.parts[1].position = [0.601, 0.04, 0];
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) => check.id === "base:collision:whitelist:g20:g40",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("no axial overlap"),
    });
  });

  it("fails whitelisted gears with excessive radial penetration", () => {
    const module = miniModule();
    module.spec.parts[1].position = [0.59, 0, 0];
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) => check.id === "base:collision:whitelist:g20:g40",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("backlash must be positive"),
    });
  });

  it("fails a non-pin whitelisted pair with incompatible gear axes", () => {
    const module = miniModule();
    module.spec.parts[1].rotationEuler = [Math.PI / 2, 0, 0];
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) => check.id === "base:collision:whitelist:g20:g40",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("axes are incompatible"),
    });
  });

  it("accepts whitelisted gears reached through a differential function node", () => {
    const module = miniModule();
    const sunA = boxPart("sun-a", [5, 0, 0]);
    const sunB = boxPart("sun-b", [6, 0, 0]);
    const carrier = boxPart("carrier", [7, 0, 0]);
    module.spec = {
      ...module.spec,
      parts: [...module.spec.parts, sunA, sunB, carrier],
      constraints: [
        {
          type: "differential",
          carrier: carrier.id,
          sunA: sunA.id,
          sunB: sunB.id,
          ratio: 2,
          provenance: { ...inferred, note: "Fixture differential." },
        },
        {
          type: "lockstep",
          a: carrier.id,
          b: "g20",
          ratio: 1,
          provenance: { ...inferred, note: "Fixture output coupling." },
        },
        { type: "mesh", a: "g20", b: "g40" },
      ],
      driveNodes: [sunA.id],
      primaryDrive: sunA.id,
      expectedRatios: [],
    };

    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) => check.id === "base:collision:whitelist:g20:g40",
      ),
    ).toMatchObject({ status: "pass" });
  });

  it("checks whitelisted gears through an alternate declared drive", () => {
    const module = miniModule();
    const alternateDrive = gearPart("g10", 10, [3, 0, 0]);
    const alternateGear = gearPart("g30", 30, [3.401, 0, 0]);
    module.spec.parts.push(alternateDrive, alternateGear);
    module.spec.constraints.push({
      type: "mesh",
      a: alternateDrive.id,
      b: alternateGear.id,
    });
    module.spec.driveNodes.push(alternateDrive.id);
    module.spec.collisionWhitelist?.push([alternateDrive.id, alternateGear.id]);
    let probeCalls = 0;
    module.mechanism?.triggers.push({
      id: `drive:${alternateDrive.id}`,
      label: { zh: "备用驱动", en: "Alternate drive" },
      run(graph, _emit, param) {
        if (Math.abs(param ?? 0) === 1) probeCalls += 1;
        graph.drive(alternateDrive.id, param ?? 0);
      },
    });

    const report = runValidation(module, { allowMissingSnapshots: true });

    expect(
      report.checks.find(
        (check) => check.id === "base:collision:whitelist:g10:g30",
      ),
    ).toMatchObject({ status: "pass" });
    expect(probeCalls).toBeGreaterThan(0);
  }, 20_000);

  it("checks global collisions through a disconnected alternate drive", () => {
    const module = miniModule();
    const primary = boxPart("primary-drive", [1, 1, 0]);
    primary.joint = { kind: "revolute", axis: [0, 0, 1] };
    primary.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    const alternate = boxPart("alternate-drive", [0, 0, 0]);
    alternate.joint = { kind: "revolute", axis: [0, 0, 1] };
    alternate.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    const pin = boxPart("alternate-pin", [0.2, 0, 0]);
    pin.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    pin.parent = alternate.id;
    const target = boxPart("alternate-target", [0, 0.2, 0]);
    target.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    module.spec = {
      ...module.spec,
      parts: [primary, alternate, pin, target],
      constraints: [],
      driveNodes: [primary.id, alternate.id],
      primaryDrive: primary.id,
      expectedRatios: [],
      collisionWhitelist: [],
    };

    const report = runValidation(module, { allowMissingSnapshots: true });

    expect(
      report.checks.find(
        (check) => check.id === "base:collision:alternate-pin:alternate-target",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("alternate-drive"),
    });
  });

  it("checks a trigger-distinct path for a connected alternate drive", () => {
    const module = miniModule();
    const primary = boxPart("primary-drive", [1, 1, 0]);
    primary.joint = { kind: "revolute", axis: [0, 0, 1] };
    primary.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    const alternate = boxPart("alternate-drive", [1.2, 1, 0]);
    alternate.joint = { kind: "revolute", axis: [0, 0, 1] };
    alternate.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    const triggerRotor = boxPart("trigger-rotor", [0, 0, 0]);
    triggerRotor.joint = { kind: "revolute", axis: [0, 0, 1] };
    triggerRotor.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    const pin = boxPart("trigger-pin", [0.2, 0, 0]);
    pin.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    pin.parent = triggerRotor.id;
    const target = boxPart("trigger-target", [0, 0.2, 0]);
    target.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    module.spec = {
      ...module.spec,
      parts: [primary, alternate, triggerRotor, pin, target],
      constraints: [
        {
          type: "lockstep",
          a: primary.id,
          b: alternate.id,
          ratio: 1,
          provenance: inferred,
        },
      ],
      driveNodes: [primary.id, alternate.id],
      primaryDrive: primary.id,
      expectedRatios: [],
      collisionWhitelist: [],
    };
    module.mechanism?.triggers.push({
      id: `drive:${alternate.id}`,
      label: { zh: "备用驱动", en: "Alternate drive" },
      run(graph, _emit, param) {
        graph.drive(alternate.id, param ?? 0);
        graph.drive(triggerRotor.id, param ?? 0);
      },
    });

    const report = runValidation(module, { allowMissingSnapshots: true });

    expect(
      report.checks.find(
        (check) => check.id === "base:collision:trigger-pin:trigger-target",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("alternate-drive"),
    });
  });

  it("refreshes jointless crank-rod bounds throughout the sampled sweep", () => {
    const module = miniModule();
    const wheel = boxPart("crank-wheel", [0, 0, 0]);
    wheel.geometry = { type: "box", size: [0.02, 0.02, 0.02] };
    wheel.joint = { kind: "revolute", axis: [0, 0, 1] };
    const rod: PartDef = {
      id: "crank-rod",
      name: { zh: "连杆", en: "Crank rod" },
      geometry: { type: "link", length: 0.5, width: 0.02 },
      material: "wood",
      position: [0, 0, 0],
      provenance: inferred,
      dimensionProvenance: { length: inferred, width: inferred },
      schemeTags: ["test"],
    };
    const slider = boxPart("crank-slider", [2, 2, 0]);
    slider.joint = { kind: "prismatic", axis: [0, 1, 0] };
    const target = boxPart("crank-target", [0.1, -0.229, 0]);
    target.geometry = { type: "box", size: [0.03, 0.03, 0.03] };
    module.spec = {
      ...module.spec,
      parts: [wheel, rod, slider, target],
      constraints: [
        {
          type: "crank",
          wheel: wheel.id,
          rod: rod.id,
          slider: slider.id,
          crankRadius: 0.2,
          rodLength: 0.5,
          axis: [0, 0, 1],
          provenance: inferred,
        },
      ],
      driveNodes: [wheel.id],
      primaryDrive: wheel.id,
      expectedRatios: [],
      collisionWhitelist: [],
    };

    const report = runValidation(module, { allowMissingSnapshots: true });

    expect(
      report.checks.find(
        (check) => check.id === "base:collision:crank-rod:crank-target",
      ),
    ).toMatchObject({ status: "fail" });
  });

  it("fails overlapping non-whitelisted boxes", () => {
    const module = miniModule();
    module.spec.parts.push(
      boxPart("box-a", [2, 0, 0]),
      boxPart("box-b", [2.04, 0, 0]),
    );
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find((check) => check.id === "base:collision:box-a:box-b"),
    ).toMatchObject({
      status: "fail",
    });
  });

  it("accepts an intentional moving non-gear contact pair", () => {
    const module = miniModule();
    const moving = boxPart("moving-link", [2, 0, 0]);
    moving.joint = { kind: "revolute", axis: [0, 0, 1] };
    const follower = boxPart("contact-follower", [2.04, 0, 0]);
    module.spec.parts.push(moving, follower);
    module.spec.constraints.push({
      type: "lockstep",
      a: "g20",
      b: moving.id,
      ratio: 1,
      provenance: { ...inferred, note: "Fixture moving contact." },
    });
    module.spec.collisionWhitelist?.push([moving.id, follower.id]);

    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) =>
          check.id === "base:collision:whitelist:moving-link:contact-follower",
      ),
    ).toMatchObject({ status: "pass" });
  });

  it("accepts an intentional static non-gear contact pair", () => {
    const module = miniModule();
    const mount = boxPart("static-mount", [2, 0, 0]);
    const shaft = boxPart("static-shaft", [2.04, 0, 0]);
    module.spec.parts.push(mount, shaft);
    module.spec.collisionWhitelist?.push([mount.id, shaft.id]);

    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) =>
          check.id === "base:collision:whitelist:static-mount:static-shaft",
      ),
    ).toMatchObject({ status: "pass" });
  });

  it("verifies a brief whitelisted contact at the shared resolution", () => {
    const module = miniModule();
    const rotor = boxPart("sweep-rotor", [0, 0, 0]);
    rotor.geometry = { type: "box", size: [2, 0.01, 0.01] };
    rotor.joint = { kind: "revolute", axis: [0, 0, 1] };
    const contactAngle = 0.135;
    const target = boxPart("sweep-target", [
      Math.cos(contactAngle),
      Math.sin(contactAngle),
      0,
    ]);
    target.geometry = { type: "box", size: [0.01, 0.01, 0.01] };
    module.spec = {
      ...module.spec,
      parts: [rotor, target],
      constraints: [],
      driveNodes: [rotor.id],
      primaryDrive: rotor.id,
      expectedRatios: [],
      collisionWhitelist: [[rotor.id, target.id]],
    };

    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) =>
          check.id === "base:collision:whitelist:sweep-rotor:sweep-target",
      ),
    ).toMatchObject({ status: "pass" });
  });

  it("fails an unmapped geometry number", () => {
    const module = miniModule();
    delete module.spec.parts[0].dimensionProvenance.module;
    expect(
      integrity(module).some(
        (check) =>
          check.id === "provenance:dimension:g20:module" &&
          check.status === "fail",
      ),
    ).toBe(true);
  });

  it("rejects wenxian provenance used through @rest", () => {
    const module = miniModule();
    module.spec.parts[0].dimensionProvenance = { "@rest": cited };
    expect(
      integrity(module).some(
        (check) => check.id.endsWith(":@rest") && check.status === "fail",
      ),
    ).toBe(true);
  });

  it("accepts inferred part provenance with its own note", () => {
    const module = miniModule();
    module.spec.parts[0].provenance = {
      kind: "tuice",
      ref: "test",
      note: "Fixture inference.",
    };
    module.spec.parts[0].schemeTags = undefined;
    expect(
      integrity(module).find((check) => check.id === "provenance:part:g20")
        ?.status,
    ).toBe("pass");
  });

  it("accepts inferred part provenance with a dimension-note provenance note", () => {
    const module = miniModule();
    module.spec.parts[0].provenance = { kind: "tuice", ref: "test" };
    module.spec.parts[0].schemeTags = undefined;
    module.spec.parts[0].dimensionNotes = [
      {
        value: 0.02,
        unit: "m",
        provenance: {
          kind: "tuice",
          ref: "test",
          note: "Measured from the reconstruction.",
        },
      },
    ];
    expect(
      integrity(module).find((check) => check.id === "provenance:part:g20")
        ?.status,
    ).toBe("pass");
  });

  it("accepts inferred part provenance with a scheme tag only", () => {
    const module = miniModule();
    module.spec.parts[0].provenance = { kind: "tuice", ref: "test" };
    module.spec.parts[0].schemeTags = ["test-scheme"];
    expect(
      integrity(module).find((check) => check.id === "provenance:part:g20")
        ?.status,
    ).toBe("pass");
  });

  it("fails inferred part provenance with neither a note nor a scheme tag", () => {
    const module = miniModule();
    module.spec.parts[0].provenance = { kind: "tuice", ref: "test" };
    module.spec.parts[0].schemeTags = undefined;
    module.spec.parts[0].dimensionNotes = undefined;
    expect(
      integrity(module).find((check) => check.id === "provenance:part:g20")
        ?.status,
    ).toBe("fail");
  });

  it("fails a crank constraint without provenance", () => {
    const module = miniModule();
    module.spec.constraints.push({
      type: "crank",
      wheel: "g20",
      rod: "g40",
      slider: "g40",
      crankRadius: 0.1,
      rodLength: 0.4,
      axis: [1, 0, 0],
      provenance: undefined as unknown as Provenance,
    });
    expect(
      integrity(module).some(
        (check) =>
          check.id.includes("constraint:2:provenance") &&
          check.status === "fail",
      ),
    ).toBe(true);
  });

  it("fails a phased lockstep constraint without provenance", () => {
    const module = miniModule();
    module.spec.constraints.push({
      type: "lockstep",
      a: "g20",
      b: "g40",
      ratio: 1,
      phase: Math.PI / 2,
    });
    expect(
      integrity(module).find(
        (check) => check.id === "integrity:constraint:2:provenance",
      )?.status,
    ).toBe("fail");
  });

  it("fails a CC-BY-SA local image without attribution", () => {
    const module = miniModule();
    module.data.images.push({
      file: "public/test-image.jpg",
      title: "Test",
      angle: "front",
      license: "CC-BY-SA",
      sourceUrl: "https://example.test/image",
    });
    expect(
      integrity(module).some(
        (check) => check.id.endsWith(":attribution") && check.status === "fail",
      ),
    ).toBe(true);
  });

  it("fails a missing local image asset", () => {
    const module = miniModule();
    module.data.images.push({
      file: "public/definitely-missing-mechanica-test.jpg",
      title: "Missing",
      angle: "front",
      license: "PD",
      sourceUrl: "https://example.test/image",
    });
    expect(
      integrity(module).some(
        (check) => check.id.endsWith(":asset") && check.status === "fail",
      ),
    ).toBe(true);
  });

  it("invalidates a source snapshot after the current quote changes", () => {
    const module = miniModule();
    const snapshotPath =
      "/repo/artifacts/source-snapshots/fixture/source-1.json";
    const options = {
      repoRoot: "/repo",
      fileExists: (path: string) => path === snapshotPath,
      readTextFile: () =>
        JSON.stringify({ quoteFound: true, quoteSha256: "receipt:Testquote" }),
      quoteFingerprint: (quote: string) =>
        `receipt:${quote.replace(/\s+/g, "")}`,
    };
    expect(
      validateProvenanceAndIntegrity(module, options).find(
        (check) => check.id === "integrity:snapshot:source-1",
      )?.status,
    ).toBe("pass");

    module.data.sources[0].quote = "Test quote!";
    expect(
      validateProvenanceAndIntegrity(module, options).find(
        (check) => check.id === "integrity:snapshot:source-1",
      ),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("current quote receipt"),
    });
  });

  it("derives a half-degree-or-finer shared sampling plan", () => {
    const module = miniModule();
    const graph = new KinematicGraph(module.spec);
    const plan = createSamplingPlan(module.spec, graph);
    expect(plan.steps).toBeGreaterThanOrEqual(720);
    expect(plan.resolutionDeg).toBeLessThanOrEqual(0.5);
  });

  it("bounds function probing before capping a long machine cycle", () => {
    const module = miniModule();
    const follower = boxPart("cam-follower", [5, 0, 0]);
    module.spec.parts.push(follower);
    module.spec.constraints.push({
      type: "cam",
      cam: "g20",
      follower: follower.id,
      profile: "lift",
      liftHeight: 0.2,
      provenance: inferred,
    });
    module.spec.cycleRad = Math.PI * 2 * 1000;
    const actual = new KinematicGraph(module.spec);
    let inputCalls = 0;
    const graph = {
      ratioBetween: (from: string, to: string) => actual.ratioBetween(from, to),
      setInput: (id: string, value: number) => {
        inputCalls += 1;
        actual.setInput(id, value);
      },
      state: () => actual.state(),
    };

    expect(createSamplingPlan(module.spec, graph).capped).toBe(true);
    expect(inputCalls).toBeLessThan(1000);
  });

  it("detects an orbital collision confined to less than two degrees", () => {
    const module = miniModule();
    const rotor = boxPart("orbit-rotor", [0, 0, 0]);
    rotor.geometry = { type: "box", size: [0.01, 0.01, 0.01] };
    rotor.joint = { kind: "revolute", axis: [0, 0, 1] };
    const pin = boxPart("orbit-pin", [1, 0, 0]);
    pin.geometry = { type: "box", size: [0.01, 0.01, 0.01] };
    pin.parent = rotor.id;
    const target = boxPart("orbit-target", [1, 0, 0]);
    target.geometry = { type: "box", size: [0.01, 0.01, 0.01] };
    module.spec = {
      ...module.spec,
      parts: [rotor, pin, target],
      constraints: [],
      driveNodes: [rotor.id],
      primaryDrive: rotor.id,
      expectedRatios: [],
      collisionWhitelist: [],
    };
    const graph = new KinematicGraph(module.spec);
    expect(collisionPairsAtAngle(module, graph, 0)).toContainEqual([
      "orbit-pin",
      "orbit-target",
    ]);
    expect(collisionPairsAtAngle(module, graph, Math.PI / 60)).toEqual([]);
    const report = runValidation(module, { allowMissingSnapshots: true });
    expect(
      report.checks.find(
        (check) => check.id === "base:collision:orbit-pin:orbit-target",
      )?.status,
    ).toBe("fail");
  });

  it("rotates off-origin custom collision bounds around the part origin", () => {
    const module = miniModule();
    const rotated = boxPart("rotated-custom", [0, 0, 0]);
    rotated.geometry = {
      type: "custom",
      builder: "offOriginCollision",
      params: { offset: 1, size: 0.2 },
    };
    rotated.rotationEuler = [0, Math.PI / 2, 0];
    rotated.joint = { kind: "revolute", axis: [0, 1, 0] };
    const target = boxPart("rotated-target", [0, 0, -1]);
    target.geometry = { type: "box", size: [0.2, 0.2, 0.2] };
    module.spec = {
      ...module.spec,
      parts: [rotated, target],
      constraints: [],
      driveNodes: [rotated.id],
      primaryDrive: rotated.id,
      expectedRatios: [],
      collisionWhitelist: [],
    };
    module.customBuilders = {
      offOriginCollision: (params) =>
        new BoxGeometry(params.size, params.size, params.size).translate(
          params.offset,
          0,
          0,
        ),
    };

    expect(
      collisionPairsAtAngle(module, new KinematicGraph(module.spec), 0),
    ).toContainEqual(["rotated-custom", "rotated-target"]);
  });

  it("moves prismatic joints along their declared parent-space axis", () => {
    const module = miniModule();
    const slider = boxPart("slider", [0, 0, 0]);
    slider.rotationEuler = [0, 0, Math.PI / 2];
    slider.joint = { kind: "prismatic", axis: [0, 1, 0], limits: [0, 1] };
    const target = boxPart("slider-target", [0, 1, 0]);
    module.spec = {
      ...module.spec,
      parts: [slider, target],
      constraints: [],
      driveNodes: [slider.id],
      primaryDrive: slider.id,
      expectedRatios: [],
      collisionWhitelist: [],
    };
    const graph = new KinematicGraph(module.spec);

    expect(collisionPairsAtAngle(module, graph, 0)).toEqual([]);
    expect(collisionPairsAtAngle(module, graph, 1)).toContainEqual([
      "slider",
      "slider-target",
    ]);
  });

  it("classifies only a missing target build as a missing manifest module", () => {
    expect(
      isMissingMachineBuild(
        {
          code: "ERR_MODULE_NOT_FOUND",
          message:
            "Cannot find module '/repo/src/machines/loom/build.ts' imported from /repo/scripts/validate.mts",
        },
        "loom",
      ),
    ).toBe(true);
    expect(
      isMissingMachineBuild(
        {
          code: "ERR_MODULE_NOT_FOUND",
          message:
            "Cannot find package 'broken-transitive' imported from /repo/src/machines/loom/build.ts",
        },
        "loom",
      ),
    ).toBe(false);
    expect(
      isMissingMachineBuild(new SyntaxError("Unexpected token"), "loom"),
    ).toBe(false);
  });
});
