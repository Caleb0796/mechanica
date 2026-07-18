import type { MachineModule, PartDef, Provenance } from "../src/sim/types";
import { KinematicGraph } from "../src/sim/graph";
import { collisionPairsAtAngle } from "../src/validate/collision";
import {
  importErrorMessage,
  isMissingMachineBuild,
} from "../src/validate/imports";
import { normalizeQuoteReceipt } from "../src/validate/quotes";
import { runValidation, type ValidationReport } from "../src/validate/report";

declare const process: {
  argv: string[];
  cwd(): string;
  exitCode?: number;
};

interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
}

interface CryptoModule {
  createHash(algorithm: "sha256"): {
    update(value: string): unknown;
    digest(encoding: "hex"): string;
  };
}

const fsModuleName = "node:fs";
const cryptoModuleName = "node:crypto";
const { existsSync, readFileSync } = (await import(
  fsModuleName
)) as unknown as FileSystem;
const { createHash } = (await import(
  cryptoModuleName
)) as unknown as CryptoModule;
const inferred: Provenance = { kind: "tuice", ref: "poison-test" };
const repoRoot = process.cwd().replace(/[\\/]+$/, "");

function quoteFingerprint(quote: string): string {
  const hash = createHash("sha256");
  hash.update(normalizeQuoteReceipt(quote));
  return hash.digest("hex");
}

const partial = process.argv.slice(2).includes("--partial");
let pristine: MachineModule;
try {
  const odometerModule = "../src/machines/odometer/build.ts";
  const imported = (await import(odometerModule)) as {
    default?: MachineModule;
  };
  if (!imported.default)
    throw new Error("odometer build has no default export");
  pristine = imported.default;
} catch (error) {
  if (isMissingMachineBuild(error, "odometer")) {
    if (partial) {
      console.warn("skip odometer poison test: manifest incomplete");
    } else {
      console.error("manifest incomplete: odometer");
      process.exitCode = 1;
    }
  } else {
    console.error(
      `odometer module failed to load: ${importErrorMessage(error)}`,
    );
    process.exitCode = 1;
  }
  pristine = undefined as unknown as MachineModule;
}

if (pristine) {
  const pristineReport = validate(pristine);
  if (pristineReport.summary.fail > 0) {
    console.error("pristine odometer did not pass validation");
    process.exitCode = 1;
  } else {
    runNeedle("ratio corruption", poisonRatio(pristine), (report) =>
      report.checks.some(
        (check) => check.id.includes(":ratio-") && check.status === "fail",
      ),
    );
    runNeedle("narrow joint limit", poisonRange(pristine), (report) =>
      report.checks.some(
        (check) => check.id.includes(":range:") && check.status === "fail",
      ),
    );
    const transientCollision = poisonCollision(pristine);
    assertTransientCollision(transientCollision);
    runNeedle("transient collision", transientCollision, (report) =>
      report.checks.some(
        (check) =>
          check.id.endsWith(":collision:poison-pin:poison-target") &&
          check.status === "fail" &&
          !check.message.includes("angle 0 rad"),
      ),
    );
    runNeedle(
      "dimension provenance deletion",
      poisonDimension(pristine),
      (report) =>
        report.checks.some(
          (check) =>
            check.id.includes(":provenance:dimension:") &&
            check.status === "fail",
        ),
    );
  }
}

function cloneModule(module: MachineModule): MachineModule {
  return {
    ...module,
    spec: structuredClone(module.spec),
    data: structuredClone(module.data),
    schemes: module.schemes ? structuredClone(module.schemes) : undefined,
    mechanism: module.mechanism
      ? {
          ...module.mechanism,
          triggers: module.mechanism.triggers.map((trigger) => ({
            ...trigger,
          })),
        }
      : undefined,
  };
}

function runNeedle(
  name: string,
  poisoned: MachineModule,
  caught: (report: ValidationReport) => boolean,
): void {
  const report = validate(poisoned);
  if (!caught(report)) {
    console.error(`validator missed poison needle: ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log("caught by the validator ✓");
}

function validate(module: MachineModule): ValidationReport {
  return runValidation(module, {
    repoRoot,
    fileExists: existsSync,
    readTextFile: (path) => readFileSync(path, "utf8"),
    quoteFingerprint,
  });
}

function poisonRatio(module: MachineModule): MachineModule {
  const poisoned = cloneModule(module);
  const gear = poisoned.spec.parts.find((part) => part.id === "xiapinglun");
  if (!gear || gear.geometry.type !== "gear" || gear.geometry.teeth !== 54) {
    throw new Error("odometer xiapinglun 54-tooth gear is missing");
  }
  gear.geometry.teeth = 45;
  return poisoned;
}

function poisonRange(module: MachineModule): MachineModule {
  const poisoned = cloneModule(module);
  const part = poisoned.spec.parts.find((candidate) => candidate.joint?.limits);
  if (!part?.joint?.limits) throw new Error("odometer has no limited joint");
  const [lower, upper] = part.joint.limits;
  const middle = (lower + upper) / 2;
  part.joint.limits = [middle, middle];
  return poisoned;
}

function poisonPart(
  id: string,
  position: [number, number, number],
  size: [number, number, number],
): PartDef {
  return {
    id,
    name: { zh: id, en: id },
    geometry: { type: "box", size },
    material: "wood",
    position,
    joint: { kind: "revolute", axis: [0, 0, 1] },
    provenance: inferred,
    dimensionProvenance: {
      "size.0": inferred,
      "size.1": inferred,
      "size.2": inferred,
    },
    schemeTags: ["poison-test"],
  };
}

function poisonCollision(module: MachineModule): MachineModule {
  const poisoned = cloneModule(module);
  const rotor = poisonPart("poison-rotor", [100, 0, 0], [0.01, 0.01, 0.01]);
  const pin = poisonPart("poison-pin", [1, 0, 0], [0.01, 0.01, 0.01]);
  pin.parent = rotor.id;
  pin.joint = { kind: "fixed", axis: [0, 0, 1] };
  const target = poisonPart("poison-target", [100, 1, 0], [0.01, 0.01, 0.01]);
  target.joint = { kind: "fixed", axis: [0, 0, 1] };
  poisoned.spec.parts.push(rotor, pin, target);
  poisoned.spec.constraints.push({
    type: "lockstep",
    a: poisoned.spec.primaryDrive,
    b: rotor.id,
    ratio: 1,
    provenance: inferred,
  });
  return poisoned;
}

function assertTransientCollision(module: MachineModule): void {
  const graph = new KinematicGraph(module.spec);
  const containsPoisonPair = (angle: number) =>
    collisionPairsAtAngle(module, graph, angle).some(
      ([a, b]) => a === "poison-pin" && b === "poison-target",
    );
  if (
    containsPoisonPair(0) ||
    !containsPoisonPair(Math.PI / 2) ||
    containsPoisonPair(Math.PI * 2)
  ) {
    throw new Error(
      "transient collision poison must occur only inside the sampled cycle",
    );
  }
}

function poisonDimension(module: MachineModule): MachineModule {
  const poisoned = cloneModule(module);
  const part = poisoned.spec.parts.find(
    (candidate) => Object.keys(candidate.dimensionProvenance).length > 0,
  );
  if (!part) throw new Error("odometer has no mapped dimension");
  part.dimensionProvenance = {};
  return poisoned;
}
