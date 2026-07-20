import { reconstructionRenderAssets } from "../data/reconstructionRenders";
import { KinematicGraph } from "../sim/graph";
import type { MachineModule, PartDef, Provenance } from "../sim/types";
import type { ValidationCheck, ValidationOptions } from "./report";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function sourceIds(module: MachineModule): Set<string> {
  return new Set(module.data.sources.map((source) => source.id));
}

function sourcesResolve(sources: Set<string>, reference: string): boolean {
  const references = reference.split("+").map((item) => item.trim());
  return (
    references.length > 0 &&
    references.every((item) => item.length > 0 && sources.has(item))
  );
}

function provenance(value: unknown): Provenance | null {
  const item = record(value);
  return item &&
    (item.kind === "wenxian" ||
      item.kind === "wenwu" ||
      item.kind === "tuice") &&
    typeof item.ref === "string" &&
    item.ref.length > 0
    ? (item as unknown as Provenance)
    : null;
}

function hasNote(value: unknown): boolean {
  const item = record(value);
  return typeof item?.note === "string" && item.note.trim().length > 0;
}

function nonemptyNote(part: PartDef): boolean {
  if (hasNote(part.provenance)) return true;
  if (Object.values(part.dimensionProvenance).some(hasNote)) return true;
  return (part.dimensionNotes ?? []).some((quantity) =>
    hasNote(quantity.provenance),
  );
}

function checkPartProvenance(
  module: MachineModule,
  sources: Set<string>,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  for (const part of module.spec.parts) {
    const item = provenance(part.provenance);
    let status: ValidationCheck["status"] = "pass";
    let message = `Part ${part.id} has valid provenance.`;
    if (!item) {
      status = "fail";
      message = `Part ${part.id} has no valid provenance.`;
    } else if (
      item.kind === "tuice" &&
      !part.schemeTags?.length &&
      !nonemptyNote(part)
    ) {
      status = "fail";
      message = `Inferred part ${part.id} requires a scheme tag or nonempty dimension note.`;
    } else if (item.kind !== "tuice" && !sourcesResolve(sources, item.ref)) {
      status = "fail";
      message = `Part ${part.id} references unknown source ${item.ref}.`;
    }
    checks.push({
      id: `provenance:part:${part.id}`,
      status,
      message,
      sourceRef: item?.ref,
    });
  }
  return checks;
}

function numericPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "number") return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      numericPaths(entry, prefix ? `${prefix}.${index}` : String(index)),
    );
  }
  const item = record(value);
  if (!item) return [];
  return Object.keys(item)
    .sort()
    .flatMap((key) =>
      numericPaths(item[key], prefix ? `${prefix}.${key}` : key),
    );
}

function dimensionEntry(part: PartDef, path: string): unknown {
  const mapping = record(part.dimensionProvenance) ?? {};
  return mapping[path] ?? mapping["@rest"];
}

function checkNumericGeometry(
  module: MachineModule,
  sources: Set<string>,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  for (const part of module.spec.parts) {
    const mapping = record(part.dimensionProvenance) ?? {};
    const paths = numericPaths(part.geometry);
    if (part.joint?.limits) paths.push("joint.limits.0", "joint.limits.1");

    for (const path of paths.sort()) {
      const entry = provenance(dimensionEntry(part, path));
      let status: ValidationCheck["status"] = "pass";
      let message = `${part.id}.${path} has dimension provenance.`;
      if (!entry) {
        status = "fail";
        message = `${part.id}.${path} has no dimension provenance.`;
      } else if (mapping[path] === undefined && entry.kind !== "tuice") {
        status = "fail";
        message = `${part.id}.${path} uses @rest, which must be inferred provenance.`;
      } else if (
        entry.kind !== "tuice" &&
        !sourcesResolve(sources, entry.ref)
      ) {
        status = "fail";
        message = `${part.id}.${path} references unknown source ${entry.ref}.`;
      }
      checks.push({
        id: `provenance:dimension:${part.id}:${path}`,
        status,
        message,
        sourceRef: entry?.ref,
      });
    }

    const rest =
      mapping["@rest"] === undefined ? null : provenance(mapping["@rest"]);
    if (mapping["@rest"] !== undefined && rest?.kind !== "tuice") {
      checks.push({
        id: `provenance:dimension:${part.id}:@rest`,
        status: "fail",
        message: `${part.id}.@rest may only use inferred provenance.`,
        sourceRef: rest?.ref,
      });
    }
  }
  return checks;
}

function checkRatioAndDataSources(
  module: MachineModule,
  sources: Set<string>,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  for (const [index, ratio] of (module.spec.expectedRatios ?? []).entries()) {
    const ok = sourcesResolve(sources, ratio.sourceRef);
    checks.push({
      id: `provenance:ratio:${index + 1}`,
      status: ok ? "pass" : "fail",
      message: ok
        ? `Expected ratio ${ratio.from} → ${ratio.to} resolves source ${ratio.sourceRef}.`
        : `Expected ratio ${ratio.from} → ${ratio.to} has an unresolved source reference.`,
      sourceRef: ratio.sourceRef,
    });
  }
  for (const [index, dimension] of module.data.dimensions.entries()) {
    const ok =
      dimension.sourceId.trim().length > 0 && sources.has(dimension.sourceId);
    checks.push({
      id: `provenance:data-dimension:${index + 1}`,
      status: ok ? "pass" : "fail",
      message: ok
        ? `Data dimension ${index + 1} resolves source ${dimension.sourceId}.`
        : `Data dimension ${index + 1} has an unresolved source reference.`,
      sourceRef: dimension.sourceId,
    });
  }
  return checks;
}

function geometryById(module: MachineModule): Map<string, UnknownRecord> {
  return new Map(
    module.spec.parts.map((part) => [
      part.id,
      part.geometry as unknown as UnknownRecord,
    ]),
  );
}

function constraintProvenanceRequired(constraint: UnknownRecord): boolean {
  return (
    constraint.type === "crank" ||
    constraint.type === "cam" ||
    constraint.type === "differential" ||
    (constraint.type === "lockstep" &&
      (constraint.ratio !== 1 ||
        (typeof constraint.phase === "number" && constraint.phase !== 0)))
  );
}

function endpointRadius(geometry: UnknownRecord | undefined): number | null {
  if (!geometry) return null;
  if (
    geometry.type === "gear" &&
    typeof geometry.module === "number" &&
    typeof geometry.teeth === "number"
  ) {
    return (geometry.module * geometry.teeth) / 2;
  }
  return geometry.type === "wheel" && typeof geometry.radius === "number"
    ? geometry.radius
    : null;
}

function checkConstraints(
  module: MachineModule,
  sources: Set<string>,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const geometry = geometryById(module);
  for (const [index, rawConstraint] of module.spec.constraints.entries()) {
    const constraint = rawConstraint as unknown as UnknownRecord;
    const id = `integrity:constraint:${index + 1}`;
    if (constraintProvenanceRequired(constraint)) {
      const item = provenance(constraint.provenance);
      const ok =
        Boolean(item) &&
        (item?.kind === "tuice" || sourcesResolve(sources, item?.ref ?? ""));
      checks.push({
        id: `${id}:provenance`,
        status: ok ? "pass" : "fail",
        message: ok
          ? `Constraint ${index + 1} has valid provenance.`
          : `Constraint ${index + 1} requires valid provenance.`,
        sourceRef: item?.ref,
      });
    }
    if (constraint.type === "mesh") {
      const a =
        typeof constraint.a === "string"
          ? geometry.get(constraint.a)
          : undefined;
      const b =
        typeof constraint.b === "string"
          ? geometry.get(constraint.b)
          : undefined;
      const ok = a?.type === "gear" && b?.type === "gear";
      checks.push({
        id: `${id}:mesh-endpoints`,
        status: ok ? "pass" : "fail",
        message: ok
          ? `Mesh ${index + 1} joins two gears.`
          : `Mesh ${index + 1} must join two gears.`,
      });
    }
    if (constraint.type === "belt") {
      const a =
        typeof constraint.a === "string"
          ? geometry.get(constraint.a)
          : undefined;
      const b =
        typeof constraint.b === "string"
          ? geometry.get(constraint.b)
          : undefined;
      const ok = endpointRadius(a) !== null && endpointRadius(b) !== null;
      checks.push({
        id: `${id}:belt-endpoints`,
        status: ok ? "pass" : "fail",
        message: ok
          ? `Belt ${index + 1} joins endpoints with pitch radii.`
          : `Belt ${index + 1} endpoints must be gears or wheels with valid radii.`,
      });
    }
  }
  return checks;
}

const SPECIFIC_TRIGGER_SLUGS = new Set([
  "astroclock",
  "seismoscope",
  "odometer",
  "loom",
]);

function checkMechanismAndIngenuity(module: MachineModule): ValidationCheck[] {
  const triggers = module.mechanism?.triggers ?? [];
  const spotlight = triggers.some((trigger) => trigger.id === "spotlight");
  const specific = triggers.some((trigger) => trigger.id !== "spotlight");
  const checks: ValidationCheck[] = [
    {
      id: "integrity:mechanism:spotlight",
      status: spotlight ? "pass" : "fail",
      message: spotlight
        ? "Mechanism exposes the spotlight trigger."
        : "Mechanism must expose a spotlight trigger.",
    },
  ];
  if (SPECIFIC_TRIGGER_SLUGS.has(module.spec.slug)) {
    checks.push({
      id: "integrity:mechanism:specific",
      status: specific ? "pass" : "fail",
      message: specific
        ? "Mechanism exposes a machine-specific trigger."
        : "This machine must expose a non-spotlight trigger.",
    });
  }

  for (const field of ["hook", "demo", "echo"] as const) {
    const value = module.data.ingenuity[field];
    const ok = value.zh.trim().length > 0 && value.en.trim().length > 0;
    checks.push({
      id: `integrity:ingenuity:${field}`,
      status: ok ? "pass" : "fail",
      message: ok
        ? `Ingenuity ${field} is bilingual.`
        : `Ingenuity ${field} requires nonempty zh and en text.`,
    });
  }
  return checks;
}

function runMechanism(
  module: MachineModule,
  opts: ValidationOptions,
  triggerId: string,
  param?: number,
): { events: Array<{ type: string; part: string }>; graph: KinematicGraph } {
  const trigger = module.mechanism?.triggers.find(
    (candidate) => candidate.id === triggerId,
  );
  if (!trigger) throw new Error(`missing trigger ${triggerId}`);
  const graph = new KinematicGraph(opts.mechanismBaseSpec ?? module.spec);
  if (opts.mechanismScheme) graph.setScheme(opts.mechanismScheme);
  const events: Array<{ type: string; part: string }> = [];
  trigger.run(graph, (type, part) => events.push({ type, part }), param);
  return { events, graph };
}

function checkMechanismExecution(
  module: MachineModule,
  opts: ValidationOptions,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  for (const trigger of module.mechanism?.triggers ?? []) {
    let failure: string | null = null;
    try {
      const { events } = runMechanism(module, opts, trigger.id);
      if (
        trigger.id === "spotlight" &&
        !events.some((event) => event.type === "spotlight:done")
      ) {
        failure = "spotlight did not emit spotlight:done";
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    checks.push({
      id: `integrity:mechanism:trigger:${trigger.id}`,
      status: failure ? "fail" : "pass",
      message: failure
        ? `Trigger ${trigger.id} failed on a fresh graph: ${failure}.`
        : `Trigger ${trigger.id} runs on a fresh graph.`,
    });
  }

  if (module.spec.slug === "astroclock") {
    let failure: string | null = null;
    try {
      const forward = runMechanism(
        module,
        opts,
        "drag-shulun",
        1,
      ).graph.state();
      const reverse = runMechanism(
        module,
        opts,
        "drag-shulun",
        -1,
      ).graph.state();
      const step = module.spec.escapement?.stepRad ?? 0;
      if (
        Math.abs(forward.shulun - step) > 1e-9 ||
        Math.abs(reverse.shulun) > 1e-9
      ) {
        failure =
          "escapement drag must advance exactly one cell and block reverse motion";
      } else if (
        "water-lift-wheel" in forward &&
        Math.abs(forward["water-lift-wheel"] - forward.shulun) > 1e-9
      ) {
        failure = "water-lift return is not coupled to the escapement beat";
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    checks.push({
      id: "integrity:mechanism:astroclock-escapement",
      status: failure ? "fail" : "pass",
      message:
        failure ??
        "Astroclock drag obeys the escapement and drives the water return.",
    });
  }

  if (module.spec.slug === "seismoscope") {
    let failure: string | null = null;
    try {
      const first = runMechanism(module, opts, "quake", 6);
      const firstCount = Object.entries(first.graph.state()).filter(
        ([id, value]) => id.startsWith("ball-") && value > 0,
      ).length;
      const wang = module.spec.parts.some((part) => part.id === "wang-chute-0");
      if (
        wang &&
        (firstCount !== 0 ||
          !first.events.some((event) => event.type === "inert"))
      ) {
        failure =
          "standing-column scheme must remain inert under the comparison pulse";
      } else if (!wang && firstCount !== 1) {
        failure = "quake pulse must release exactly one ball";
      } else if (!wang) {
        const quake = module.mechanism?.triggers.find(
          (trigger) => trigger.id === "quake",
        )!;
        quake.run(first.graph, () => undefined, 5);
        const secondCount = Object.entries(first.graph.state()).filter(
          ([id, value]) => id.startsWith("ball-") && value > 0,
        ).length;
        if (secondCount !== 1)
          failure = "first-event latch released more than one ball";
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    checks.push({
      id: "integrity:mechanism:seismoscope-latch",
      status: failure ? "fail" : "pass",
      message:
        failure ??
        "Seismoscope pulse response matches its active scheme and latch.",
    });
  }

  return checks;
}

function repositoryPath(root: string | undefined, file: string): string | null {
  if (
    file.startsWith("/") ||
    file.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(file)
  )
    return null;
  const segments = file.replaceAll("\\", "/").split("/");
  if (segments.some((segment) => segment === "..")) return null;
  const prefix = root?.replace(/[\\/]+$/, "");
  return prefix
    ? `${prefix}/${segments.filter((segment) => segment !== ".").join("/")}`
    : segments.join("/");
}

function checkImages(
  module: MachineModule,
  opts: ValidationOptions,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const images = [
    ...module.data.images,
    ...reconstructionRenderAssets(module.data.slug),
  ];
  for (const [index, image] of images.entries()) {
    const id = `integrity:image:${index + 1}`;
    if (image.license === "linkout") {
      checks.push({
        id: `${id}:linkout`,
        status: image.file === undefined ? "pass" : "fail",
        message:
          image.file === undefined
            ? "Linkout image has no local file."
            : "Linkout images must not declare a local file.",
      });
    }
    if (
      (image.license === "CC-BY" || image.license === "CC-BY-SA") &&
      image.file
    ) {
      const ok = Boolean(
        image.author?.trim() &&
        image.licenseUrl?.trim() &&
        image.attributionText?.trim(),
      );
      checks.push({
        id: `${id}:attribution`,
        status: ok ? "pass" : "fail",
        message: ok
          ? "Licensed local image includes complete attribution."
          : "CC-BY/CC-BY-SA local images require author, licenseUrl, and attributionText.",
      });
    }
    if (image.license === "MIT") {
      const ok = Boolean(
        image.author.trim() &&
        image.licenseUrl.trim() &&
        image.attributionText.trim(),
      );
      checks.push({
        id: `${id}:attribution`,
        status: ok ? "pass" : "fail",
        message: ok
          ? "Project render includes its MIT license attribution."
          : "Project renders require author, license URL, and attribution text.",
      });
    }
    if (image.file) {
      const path = repositoryPath(opts.repoRoot, image.file);
      const ok = path !== null && Boolean(opts.fileExists?.(path));
      checks.push({
        id: `${id}:asset`,
        status: ok ? "pass" : "fail",
        message: ok
          ? `Image asset ${image.file} exists.`
          : `Image asset ${image.file} is missing or escapes the repository.`,
      });
    }
  }
  return checks;
}

function checkSnapshots(
  module: MachineModule,
  opts: ValidationOptions,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  for (const source of module.data.sources) {
    if (!/^[A-Za-z0-9._-]+$/.test(source.id)) {
      checks.push({
        id: `integrity:snapshot:invalid-source-id`,
        status: "fail",
        message: "Source snapshot ID contains unsafe path characters.",
      });
      continue;
    }
    const path = repositoryPath(
      opts.repoRoot,
      `artifacts/source-snapshots/${module.spec.slug}/${source.id}.json`,
    )!;
    if (!opts.fileExists?.(path)) {
      checks.push({
        id: `integrity:snapshot:${source.id}`,
        status: opts.allowMissingSnapshots ? "warn" : "fail",
        message: opts.allowMissingSnapshots
          ? `Source snapshot ${source.id} is absent in partial validation.`
          : `Source snapshot ${source.id} is missing.`,
        sourceRef: source.id,
      });
      continue;
    }
    try {
      if (!opts.readTextFile) throw new Error("snapshot reader is unavailable");
      const snapshot = JSON.parse(opts.readTextFile(path)) as UnknownRecord;
      const quoteFound = snapshot.ok === true || snapshot.quoteFound === true;
      const receiptMatches =
        typeof snapshot.quoteSha256 === "string" &&
        opts.quoteFingerprint?.(source.quote) === snapshot.quoteSha256;
      const verified = quoteFound && receiptMatches;
      const offline = snapshot.note === "offline";
      checks.push({
        id: `integrity:snapshot:${source.id}`,
        status: verified ? "pass" : offline ? "warn" : "fail",
        message: verified
          ? `Source snapshot ${source.id} verifies its source.`
          : offline
            ? `Source snapshot ${source.id} could not be verified offline.`
            : quoteFound && !receiptMatches
              ? `Source snapshot ${source.id} does not match the current quote receipt.`
              : `Source snapshot ${source.id} contains no successful verification record.`,
        sourceRef: source.id,
      });
    } catch (error) {
      checks.push({
        id: `integrity:snapshot:${source.id}`,
        status: "fail",
        message: `Source snapshot ${source.id} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        sourceRef: source.id,
      });
    }
  }
  return checks;
}

export function validateProvenanceAndIntegrity(
  module: MachineModule,
  opts: ValidationOptions = {},
): ValidationCheck[] {
  const sources = sourceIds(module);
  return [
    ...checkPartProvenance(module, sources),
    ...checkNumericGeometry(module, sources),
    ...checkRatioAndDataSources(module, sources),
    ...checkConstraints(module, sources),
    ...checkMechanismAndIngenuity(module),
    ...checkMechanismExecution(module, opts),
    ...checkImages(module, opts),
    ...checkSnapshots(module, opts),
  ];
}
