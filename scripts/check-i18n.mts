import {
  auditBundledCatalogs,
  bundledCatalogs,
} from "../src/ui/i18n/catalog-audit";

declare const process: { cwd(): string; exitCode?: number };

interface DirectoryEntry {
  name: string;
  isDirectory(): boolean;
}

interface FileSystem {
  readFileSync(path: string, encoding: "utf8"): string;
  readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): DirectoryEntry[];
}

const fsModuleName = "node:fs";
const { readFileSync, readdirSync } = (await import(
  fsModuleName
)) as unknown as FileSystem;

const WILDCARD_PREFIXES = ["events.", "seismo.bearing.", "inspector."];

function catalogKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    catalogKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function collectUsedKeys(): Set<string> {
  const used = new Set<string>();
  const literal = /\bt\(\s*["'`]([^"'`$]+)["'`]/g;
  for (const file of sourceFiles(`${process.cwd()}/src`)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(literal)) used.add(match[1]);
  }
  return used;
}

const report = auditBundledCatalogs();

if (!report.valid) {
  console.error(JSON.stringify(report.issues, null, 2));
  process.exitCode = 1;
} else {
  const usedKeys = collectUsedKeys();
  const enKeys = new Set(catalogKeys(bundledCatalogs.en));
  const zhKeys = new Set(catalogKeys(bundledCatalogs.zh));
  const missingKeys = [...usedKeys].filter(
    (key) => !enKeys.has(key) || !zhKeys.has(key),
  );
  const deadKeys = [...enKeys].filter(
    (key) =>
      !usedKeys.has(key) &&
      !WILDCARD_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  if (missingKeys.length > 0) {
    console.error("Missing i18n keys:", missingKeys.sort().join(", "));
    process.exitCode = 1;
  }
  if (deadKeys.length > 0) {
    console.error("Dead i18n keys:", deadKeys.sort().join(", "));
    process.exitCode = 1;
  }
  if (missingKeys.length === 0 && deadKeys.length === 0) {
    console.log("i18n catalogs: 0 issues");
  }
}
