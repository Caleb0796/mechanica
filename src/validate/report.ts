import { applySchemePatch, KinematicGraph } from "../sim/graph";
import type { MachineModule, MachineSpec, SchemePatch } from "../sim/types";
import { validateCollisions } from "./collision";
import { validateProvenanceAndIntegrity } from "./provenance";
import { validateRanges } from "./range";
import { validateRatios } from "./ratios";
import { createSamplingPlan } from "./sampling";

export interface ValidationCheck {
  id: string;
  status: "pass" | "fail" | "warn";
  expected?: number;
  actual?: number;
  message: string;
  sourceRef?: string;
}

export interface ValidationReport {
  slug: string;
  when: string;
  checks: ValidationCheck[];
  summary: {
    pass: number;
    fail: number;
    warn: number;
    resolutionDeg: number;
  };
}

export interface ValidationOptions {
  when?: string | Date;
  allowMissingSnapshots?: boolean;
  partial?: boolean;
  repoRoot?: string;
  fileExists?: (path: string) => boolean;
  readTextFile?: (path: string) => string;
  quoteFingerprint?: (quote: string) => string;
  mechanismBaseSpec?: MachineSpec;
  mechanismScheme?: SchemePatch;
}

function failure(id: string, message: string): ValidationCheck {
  return { id, status: "fail", message };
}

function prefixed(scope: string, checks: ValidationCheck[]): ValidationCheck[] {
  return checks.map((check) => ({ ...check, id: `${scope}:${check.id}` }));
}

function isoWhen(value: ValidationOptions["when"]): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}

function runScope(
  baseModule: MachineModule,
  patch: SchemePatch | undefined,
  opts: ValidationOptions,
): { checks: ValidationCheck[]; resolutionDeg: number } {
  const scope = patch?.id ?? "base";
  const module = patch
    ? { ...baseModule, spec: applySchemePatch(baseModule.spec, patch) }
    : baseModule;
  let graph: KinematicGraph;
  try {
    graph = new KinematicGraph(baseModule.spec);
    if (patch) graph.setScheme(patch);
  } catch (error) {
    return {
      checks: [
        failure(
          `${scope}:graph`,
          `Graph construction failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      ],
      resolutionDeg: 0,
    };
  }

  const checks: ValidationCheck[] = [];
  try {
    checks.push(
      ...validateProvenanceAndIntegrity(module, {
        ...opts,
        allowMissingSnapshots: opts.allowMissingSnapshots || opts.partial,
        mechanismBaseSpec: baseModule.spec,
        mechanismScheme: patch,
      }),
    );
  } catch (error) {
    checks.push(
      failure(
        "integrity",
        `Integrity validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  try {
    checks.push(...validateRatios(module.spec, graph));
  } catch (error) {
    checks.push(
      failure(
        "ratios",
        `Ratio validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  let resolutionDeg = 0;
  try {
    const plan = createSamplingPlan(module.spec, graph);
    resolutionDeg = plan.resolutionDeg;
    checks.push(...validateRanges(module.spec, graph, plan));
    checks.push(...validateCollisions(module, graph, plan));
  } catch (error) {
    checks.push(
      failure(
        "sampling",
        `Sampling validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  return { checks: prefixed(scope, checks), resolutionDeg };
}

export function runValidation(
  module: MachineModule,
  opts: ValidationOptions = {},
): ValidationReport {
  const results = [
    runScope(module, undefined, opts),
    ...Object.values(module.schemes ?? {}).map((scheme) =>
      runScope(module, scheme, opts),
    ),
  ];
  const checks = results.flatMap((result) => result.checks);
  const summary = {
    pass: checks.filter((check) => check.status === "pass").length,
    fail: checks.filter((check) => check.status === "fail").length,
    warn: checks.filter((check) => check.status === "warn").length,
    resolutionDeg: Math.max(
      0,
      ...results.map((result) => result.resolutionDeg),
    ),
  };

  return {
    slug: module.spec.slug,
    when: isoWhen(opts.when),
    checks,
    summary,
  };
}
