import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()
const dataDirectory = join(repoRoot, 'src/data/machines')
const outputDirectory = join(repoRoot, 'artifacts/extractions')
const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5.6'
const apiKey = process.env.OPENAI_API_KEY?.trim()
const machineSlugs = new Set([
  'astroclock',
  'seismoscope',
  'chariot',
  'odometer',
  'wooden-ox',
  'loom',
  'typecase',
  'chainpump',
  'bellows',
  'gimbal',
])

const EXTRACTION_PROMPT = `你是古代机械复原工程师。仅根据以下古籍原文（不得使用原文之外的数字），
抽取零件清单与传动约束，输出 JSON：{ parts: [{id,name_zh,role,dims_ancient[]}],
constraints: [{type,a,b,teeth_a?,teeth_b?,evidence_quote}], uncertainties: [...] }。
每个数字必须附 evidence_quote（原文片段）。没有依据的字段留 null 并写入 uncertainties。
原文：<quotes>`

function machineFiles() {
  const files = readdirSync(dataDirectory).filter((name) => name.endsWith('.json')).sort()
  if (files.length !== 10) throw new Error(`expected 10 machine data JSONs, found ${files.length}`)
  return files
}

function sanitize(value) {
  return String(value)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/\b(?:sk-(?:proj-)?|sk-ant-)[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_API_KEY]')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_KEY]')
    .replace(/\b(?:ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, '[REDACTED_GCP_KEY]')
    .replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, '[REDACTED_ID]')
    .replace(/\b(session|org)(?:[_ -]?id)?\s*[:=]\s*[A-Za-z0-9_-]{8,}/gi, '$1_id=[REDACTED]')
    .replace(/\b(?:session|org)[_-][A-Za-z0-9_-]{8,}\b/gi, '[REDACTED_ID]')
    .replace(/\/Users\/[^/\s]+/g, '$HOME')
    .replace(/\/home\/[^/\s]+/g, '$HOME')
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, '$HOME')
    .replace(/https?:\/\/(?:[^/\s]*\.(?:internal|local|corp)|localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?:[^\s]*)/gi, '[REDACTED_INTERNAL_URL]')
}

function parseExtraction(response) {
  const trimmed = response.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const parsed = JSON.parse(withoutFence)
  if (!parsed || typeof parsed !== 'object'
    || !Array.isArray(parsed.parts)
    || !Array.isArray(parsed.constraints)
    || !Array.isArray(parsed.uncertainties)) {
    throw new Error('extraction response must contain parts, constraints, and uncertainties arrays')
  }
  return parsed
}

function outputText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text
  const chunks = []
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') {
        chunks.push(content.text)
      }
    }
  }
  if (chunks.length === 0) throw new Error('Responses API returned no output text')
  return chunks.join('\n')
}

async function responseError(response) {
  try {
    const payload = await response.json()
    return sanitize(typeof payload?.error?.message === 'string' ? payload.error.message : `HTTP ${response.status}`)
  } catch {
    return `HTTP ${response.status}`
  }
}

async function callResponses(prompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'high' },
      input: prompt,
      max_output_tokens: 10000,
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) throw new Error(await responseError(response))
  return sanitize(outputText(await response.json()))
}

async function main() {
  mkdirSync(outputDirectory, { recursive: true })
  let failed = false
  const seenSlugs = new Set()
  for (const file of machineFiles()) {
    const data = JSON.parse(readFileSync(join(dataDirectory, file), 'utf8'))
    const expectedSlug = file.slice(0, -'.json'.length)
    if (typeof data.slug !== 'string'
      || !machineSlugs.has(data.slug)
      || data.slug !== expectedSlug
      || seenSlugs.has(data.slug)
      || !Array.isArray(data.sources)) {
      console.error(`${file}: invalid machine data`)
      failed = true
      continue
    }
    seenSlugs.add(data.slug)
    const quotes = data.sources.map((source) => source.quote).filter((quote) => typeof quote === 'string').join('\n\n')
    const prompt = EXTRACTION_PROMPT.replace('<quotes>', quotes)
    try {
      const response = await callResponses(prompt)
      const parsed = parseExtraction(response)
      const artifact = {
        slug: data.slug,
        model: sanitize(model),
        generatedAt: new Date().toISOString(),
        prompt: sanitize(prompt),
        response,
        parts: parsed.parts,
        constraints: parsed.constraints,
        uncertainties: parsed.uncertainties,
      }
      writeFileSync(join(outputDirectory, `${data.slug}.json`), `${JSON.stringify(artifact, null, 2)}\n`)
      console.log(`${data.slug}: extraction archived`)
    } catch (error) {
      failed = true
      console.error(`${data.slug}: ${sanitize(error instanceof Error ? error.message : String(error))}`)
    }
  }
  if (failed) process.exitCode = 1
}

if (!apiKey) {
  console.warn('\u001b[33mOPENAI_API_KEY is absent; skipping GPT-5.6 parts extraction.\u001b[0m')
} else {
  await main()
}
