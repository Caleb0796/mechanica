import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

const repoRoot = process.cwd();
const dataDirectory = join(repoRoot, "src/data/machines");
const outputDirectory = join(repoRoot, "artifacts/audits");
const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6";
const apiKey = process.env.OPENAI_API_KEY?.trim();
const machineSlugs = new Set([
  "astroclock",
  "seismoscope",
  "chariot",
  "odometer",
  "wooden-ox",
  "loom",
  "typecase",
  "chainpump",
  "bellows",
  "gimbal",
]);

function machineFiles() {
  const files = readdirSync(dataDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  if (files.length !== 10)
    throw new Error(`expected 10 machine data JSONs, found ${files.length}`);
  return files;
}

function sanitize(value) {
  return String(value)
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    )
    .replace(
      /\b(?:sk-(?:proj-)?|sk-ant-)[A-Za-z0-9_-]{12,}\b/g,
      "[REDACTED_API_KEY]",
    )
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_AWS_KEY]")
    .replace(
      /\b(?:ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{12,}\b/g,
      "[REDACTED_TOKEN]",
    )
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, "[REDACTED_GCP_KEY]")
    .replace(
      /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi,
      "[REDACTED_ID]",
    )
    .replace(
      /\b(session|org)(?:[_ -]?id)?\s*[:=]\s*[A-Za-z0-9_-]{8,}/gi,
      "$1_id=[REDACTED]",
    )
    .replace(/\b(?:session|org)[_-][A-Za-z0-9_-]{8,}\b/gi, "[REDACTED_ID]")
    .replace(/\/Users\/[^/\s]+/g, "$HOME")
    .replace(/\/home\/[^/\s]+/g, "$HOME")
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, "$HOME")
    .replace(
      /https?:\/\/(?:[^/\s]*\.(?:internal|local|corp)|localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?:[^\s]*)/gi,
      "[REDACTED_INTERNAL_URL]",
    );
}

function outputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim())
    return payload.output_text;
  const chunks = [];
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (
        (content?.type === "output_text" || content?.type === "text") &&
        typeof content.text === "string"
      ) {
        chunks.push(content.text);
      }
    }
  }
  if (chunks.length === 0)
    throw new Error("Responses API returned no output text");
  return chunks.join("\n");
}

async function responseError(response) {
  try {
    const payload = await response.json();
    return sanitize(
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `HTTP ${response.status}`,
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function callResponses(prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "high" },
      input: prompt,
      max_output_tokens: 12000,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(await responseError(response));
  return sanitize(outputText(await response.json()));
}

async function resolvedImplementation(slug) {
  const imported = await tsImport(
    `../src/machines/${slug}/build.ts`,
    import.meta.url,
  );
  if (!imported.default?.spec)
    throw new Error(`${slug}: build has no machine module`);
  const machine = imported.default;
  const graph = await tsImport("../src/sim/graph.ts", import.meta.url);
  const schemes = Object.fromEntries(
    Object.entries(machine.schemes ?? {}).map(([schemeId, patch]) => [
      schemeId,
      graph.applySchemePatch(machine.spec, patch),
    ]),
  );
  return {
    base: machine.spec,
    mechanismTriggerIds: (machine.mechanism?.triggers ?? []).map(
      (trigger) => trigger.id,
    ),
    schemes,
  };
}

function auditPrompt(data, implementation, validation) {
  const quotes = data.sources
    .map((source) => source.quote)
    .filter((quote) => typeof quote === "string")
    .join("\n\n");
  return `你是独立的古代机械复原审计员。你只能使用下列古籍原文、最终解析后的机器实现和确定性验证报告。

必须执行这一要求：independently derive ratios and key dimensions from the text → cross-examine the implementation → output a verdict table (consistent / inconsistent / no textual basis); do not reverse-engineer the text from the implementation.

先从原文独立推导齿数、传动比和关键尺寸，再查看实现和报告。每一项结论必须引用原文片段；没有原文依据时标为 “no textual basis”，不得用实现反推原文。只输出 Markdown。表格后列出所有 load-bearing conflicts；若无，明确写 “None”。

## 古籍原文
${quotes}

## 最终解析后的机器实现（base 与每个 scheme 均为完整 MachineSpec）
${JSON.stringify(implementation, null, 2)}

## 确定性验证报告
${JSON.stringify(validation, null, 2)}`;
}

function validateVerdict(verdict) {
  if (
    !verdict.includes("|") ||
    !/(?:consistent|inconsistent|no textual basis)/i.test(verdict) ||
    !/load-bearing conflicts/i.test(verdict)
  ) {
    throw new Error(
      "audit verdict is missing the required table or load-bearing conflict section",
    );
  }
}

async function main() {
  mkdirSync(outputDirectory, { recursive: true });
  let failed = false;
  const seenSlugs = new Set();
  for (const file of machineFiles()) {
    const data = JSON.parse(readFileSync(join(dataDirectory, file), "utf8"));
    const expectedSlug = file.slice(0, -".json".length);
    if (
      typeof data.slug !== "string" ||
      !machineSlugs.has(data.slug) ||
      data.slug !== expectedSlug ||
      seenSlugs.has(data.slug) ||
      !Array.isArray(data.sources)
    ) {
      console.error(`${file}: invalid machine data`);
      failed = true;
      continue;
    }
    seenSlugs.add(data.slug);
    const reportPath = join(
      repoRoot,
      "reports",
      `${data.slug}.validation.json`,
    );
    if (!existsSync(reportPath)) {
      console.error(`${data.slug}: missing validation report`);
      failed = true;
      continue;
    }
    const validation = JSON.parse(readFileSync(reportPath, "utf8"));
    try {
      const implementation = await resolvedImplementation(data.slug);
      const prompt = auditPrompt(data, implementation, validation);
      const verdict = await callResponses(prompt);
      validateVerdict(verdict);
      const artifact = `# ${data.slug} independent audit\n\n- Model: ${sanitize(model)}\n- Generated: ${new Date().toISOString()}\n\n## Verdict\n\n${verdict.trim()}\n`;
      writeFileSync(
        join(outputDirectory, `${data.slug}.md`),
        sanitize(artifact),
      );
      console.log(`${data.slug}: audit archived`);
    } catch (error) {
      failed = true;
      console.error(
        `${data.slug}: ${sanitize(error instanceof Error ? error.message : String(error))}`,
      );
    }
  }
  if (failed) process.exitCode = 1;
}

if (!apiKey) {
  console.warn(
    "\u001b[33mOPENAI_API_KEY is absent; skipping GPT-5.6 independent audit.\u001b[0m",
  );
} else {
  await main();
}
