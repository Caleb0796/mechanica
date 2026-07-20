import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const allowProvisional = process.argv.includes("--allow-provisional");
const slugs = [
  "astroclock",
  "seismoscope",
  "odometer",
  "loom",
];
const slugSet = new Set(slugs);
const dataDirectory = join(repoRoot, "src", "data", "machines");
const extractionDirectory = join(repoRoot, "artifacts", "extractions");
const auditDirectory = join(repoRoot, "artifacts", "audits");
const errors = [];
let provisionalExtractions = 0;
let provisionalAudits = 0;
let auditsWithOpenConflicts = 0;

function report(path, message) {
  errors.push(`${path}: ${message}`);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasAncientNumber(value) {
  return /[0-9〇零一二三四五六七八九十百千萬万]/u.test(String(value));
}

function markdownSection(markdown, heading) {
  const headingLine = `## ${heading}`;
  const start = markdown.indexOf(headingLine);
  if (start === -1) return undefined;
  const bodyStart = start + headingLine.length;
  const nextHeading = markdown.indexOf("\n## ", bodyStart);
  return markdown
    .slice(bodyStart, nextHeading === -1 ? undefined : nextHeading)
    .trim();
}

function machineFiles(directory, extension) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(extension))
    .sort();
}

const extractionFiles = machineFiles(extractionDirectory, ".json");
const auditFiles = machineFiles(auditDirectory, ".md");

for (const file of extractionFiles) {
  if (!slugSet.has(file.slice(0, -".json".length))) {
    report(`artifacts/extractions/${file}`, "unexpected extraction artifact");
  }
}
for (const file of auditFiles) {
  if (!slugSet.has(file.slice(0, -".md".length))) {
    report(`artifacts/audits/${file}`, "unexpected audit artifact");
  }
}

for (const slug of slugs) {
  const data = JSON.parse(
    readFileSync(join(dataDirectory, `${slug}.json`), "utf8"),
  );
  const quotes = data.sources.map((source) => source.quote).filter(isText);
  const sourceText = quotes.join("\n\n");
  const relativeExtraction = `artifacts/extractions/${slug}.json`;
  const extractionPath = join(repoRoot, relativeExtraction);
  if (!existsSync(extractionPath)) {
    report(relativeExtraction, "missing extraction artifact");
  } else {
    let artifact;
    try {
      artifact = JSON.parse(readFileSync(extractionPath, "utf8"));
    } catch (error) {
      report(
        relativeExtraction,
        `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (artifact) {
      const provisional = artifact.provisional === true;
      if (artifact.slug !== slug) report(relativeExtraction, "slug mismatch");
      if (!isText(artifact.model)) report(relativeExtraction, "missing model");
      if (!isText(artifact.prompt))
        report(relativeExtraction, "missing prompt");
      else {
        for (const [index, quote] of quotes.entries()) {
          if (!artifact.prompt.includes(quote)) {
            report(relativeExtraction, `prompt omits sources[${index}].quote`);
          }
        }
      }
      if (!isText(artifact.response))
        report(relativeExtraction, "missing raw response");
      if (!Array.isArray(artifact.parts))
        report(relativeExtraction, "parts must be an array");
      if (!Array.isArray(artifact.constraints))
        report(relativeExtraction, "constraints must be an array");
      if (!Array.isArray(artifact.uncertainties))
        report(relativeExtraction, "uncertainties must be an array");

      if (provisional) {
        provisionalExtractions += 1;
        if (!allowProvisional)
          report(
            relativeExtraction,
            "provisional artifact is not release evidence",
          );
        if (artifact.replacementCommand !== "pnpm extract")
          report(relativeExtraction, "missing keyed replacement command");
        if (artifact.generatedAt !== null)
          report(relativeExtraction, "provisional generatedAt must be null");
        if (!String(artifact.model).includes("codex"))
          report(relativeExtraction, "provisional model must identify Codex");
      } else {
        const generated = Date.parse(String(artifact.generatedAt));
        if (!Number.isFinite(generated))
          report(
            relativeExtraction,
            "final generatedAt must be an ISO timestamp",
          );
        if (/codex|provisional/i.test(String(artifact.model)))
          report(
            relativeExtraction,
            "final artifact has provisional model metadata",
          );
      }

      if (isText(artifact.response)) {
        try {
          const response = JSON.parse(artifact.response);
          for (const key of ["parts", "constraints", "uncertainties"]) {
            if (!sameJson(response[key], artifact[key])) {
              report(
                relativeExtraction,
                `${key} differs from the raw response`,
              );
            }
          }
        } catch (error) {
          report(
            relativeExtraction,
            `raw response is not JSON: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      for (const [index, part] of (artifact.parts ?? []).entries()) {
        if (
          !isText(part?.id) ||
          !isText(part?.name_zh) ||
          !isText(part?.role)
        ) {
          report(
            relativeExtraction,
            `parts[${index}] is missing id, name_zh, or role`,
          );
        }
        if (!Array.isArray(part?.dims_ancient)) {
          report(
            relativeExtraction,
            `parts[${index}].dims_ancient must be an array`,
          );
        } else {
          for (const [dimensionIndex, dimension] of (
            part.dims_ancient ?? []
          ).entries()) {
            const evidenceQuote =
              typeof dimension === "object" && dimension !== null
                ? dimension.evidence_quote
                : part.evidence_quote;
            if (hasAncientNumber(dimension) && !isText(evidenceQuote)) {
              report(
                relativeExtraction,
                `parts[${index}].dims_ancient[${dimensionIndex}] has a number without evidence_quote`,
              );
            } else if (
              isText(evidenceQuote) &&
              !sourceText.includes(evidenceQuote)
            ) {
              report(
                relativeExtraction,
                `parts[${index}].dims_ancient[${dimensionIndex}] evidence_quote is not in the source text`,
              );
            }
          }
        }
      }

      for (const [index, constraint] of (
        artifact.constraints ?? []
      ).entries()) {
        if (
          !isText(constraint?.type) ||
          !isText(constraint?.a) ||
          !isText(constraint?.b) ||
          !isText(constraint?.evidence_quote)
        ) {
          report(
            relativeExtraction,
            `constraints[${index}] is missing type, a, b, or evidence_quote`,
          );
        } else if (!sourceText.includes(constraint.evidence_quote)) {
          report(
            relativeExtraction,
            `constraints[${index}].evidence_quote is not in the source text`,
          );
        }
      }

      for (const [index, uncertainty] of (
        artifact.uncertainties ?? []
      ).entries()) {
        if (
          isText(uncertainty?.evidence_quote) &&
          !sourceText.includes(uncertainty.evidence_quote)
        ) {
          report(
            relativeExtraction,
            `uncertainties[${index}].evidence_quote is not in the source text`,
          );
        }
      }
    }
  }

  const relativeAudit = `artifacts/audits/${slug}.md`;
  const auditPath = join(repoRoot, relativeAudit);
  if (!existsSync(auditPath)) {
    report(relativeAudit, "missing audit artifact");
  } else {
    const audit = readFileSync(auditPath, "utf8");
    const provisional = /^- Provisional: true$/im.test(audit);
    if (!audit.startsWith(`# ${slug}`))
      report(relativeAudit, "title slug mismatch");
    if (!/^- Model: \S.+$/im.test(audit))
      report(relativeAudit, "missing model");
    if (!audit.includes("|")) report(relativeAudit, "missing verdict table");
    if (!/(?:consistent|inconsistent|no textual basis)/i.test(audit))
      report(relativeAudit, "missing verdict vocabulary");
    const conflictSection = markdownSection(audit, "Load-bearing conflicts");
    if (conflictSection === undefined)
      report(relativeAudit, "missing load-bearing conflicts section");
    else if (!/^None[.!]?$/i.test(conflictSection)) {
      auditsWithOpenConflicts += 1;
      if (!provisional || !allowProvisional)
        report(relativeAudit, "load-bearing conflicts are not closed as None");
    }

    if (provisional) {
      provisionalAudits += 1;
      if (!allowProvisional)
        report(relativeAudit, "provisional artifact is not release evidence");
      if (!/^- Replacement: `pnpm run audit`$/im.test(audit))
        report(relativeAudit, "missing keyed replacement command");
      if (!/^- Model: .*Codex/im.test(audit))
        report(relativeAudit, "provisional model must identify Codex");
    }
  }
}

if (extractionFiles.length !== slugs.length) {
  report(
    "artifacts/extractions",
    `expected ${slugs.length} JSON files, found ${extractionFiles.length}`,
  );
}
if (auditFiles.length !== slugs.length) {
  report(
    "artifacts/audits",
    `expected ${slugs.length} Markdown files, found ${auditFiles.length}`,
  );
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `artifacts: ${extractionFiles.length} extractions, ${auditFiles.length} audits; provisional=${provisionalExtractions + provisionalAudits}; open-conflict-audits=${auditsWithOpenConflicts}`,
  );
}
