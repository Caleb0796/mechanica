import { assertMachineData } from '../src/data/schema'
import { MACHINE_SLUGS, type MachineData, type MachineModule, type MachineSlug } from '../src/sim/types'
import { importErrorMessage, isMissingMachineBuild } from '../src/validate/imports'
import { normalizeQuoteReceipt } from '../src/validate/quotes'
import { runValidation, type ValidationReport } from '../src/validate/report'

declare const process: {
  argv: string[]
  cwd(): string
  exitCode?: number
}

interface FileSystem {
  mkdirSync(path: string, opts: { recursive: boolean }): unknown
  writeFileSync(path: string, data: string): void
  existsSync(path: string): boolean
  readFileSync(path: string, encoding: 'utf8'): string
}

interface CryptoModule {
  createHash(algorithm: 'sha256'): {
    update(value: string): unknown
    digest(encoding: 'hex'): string
  }
}

const fsModuleName = 'node:fs'
const cryptoModuleName = 'node:crypto'
const {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} = await import(fsModuleName) as unknown as FileSystem
const { createHash } = await import(cryptoModuleName) as unknown as CryptoModule
const repoRoot = process.cwd().replace(/[\\/]+$/, '')
const repoPath = (path: string) => `${repoRoot}/${path}`

function quoteFingerprint(quote: string): string {
  const hash = createHash('sha256')
  hash.update(normalizeQuoteReceipt(quote))
  return hash.digest('hex')
}

const args = process.argv.slice(2)
const unknownArgs = args.filter((argument) => argument !== '--partial')
if (unknownArgs.length > 0) {
  console.error(`unknown argument: ${unknownArgs.join(', ')}`)
  process.exitCode = 1
} else {
  await main(args.includes('--partial'))
}

async function loadMachine(slug: MachineSlug): Promise<MachineModule> {
  const url = new URL(`../src/machines/${slug}/build.ts`, import.meta.url)
  const imported = await import(url.href) as { default?: MachineModule }
  if (!imported.default) throw new Error(`${slug} build has no default export`)
  return imported.default
}

function writeSummary(
  reports: ValidationReport[],
  missing: MachineSlug[],
  loadFailures: Array<{ slug: MachineSlug; message: string }>,
  dataFailures: string[],
  dataWarnings: string[],
): void {
  const lines = [
    '# Mechanica validation summary',
    '',
    '| Machine | Pass | Fail | Warn | Resolution |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...reports.map((report) => (
      `| ${report.slug} | ${report.summary.pass} | ${report.summary.fail} | ${report.summary.warn} | ${report.summary.resolutionDeg.toFixed(6)}° |`
    )),
  ]
  if (missing.length > 0) lines.push('', `Manifest incomplete: ${missing.join(', ')}`)
  if (loadFailures.length > 0) {
    lines.push('', 'Load failures:')
    for (const failure of loadFailures) lines.push(`- ${failure.slug}: ${failure.message}`)
  }
  if (dataFailures.length > 0) lines.push('', 'Data and snapshot failures:', ...dataFailures.map((failure) => `- ${failure}`))
  if (dataWarnings.length > 0) lines.push('', 'Data and snapshot warnings:', ...dataWarnings.map((warning) => `- ${warning}`))
  writeFileSync(repoPath('reports/summary.md'), `${lines.join('\n')}\n`)
}

function validateDataSnapshots(partial: boolean): { failures: string[]; warnings: string[] } {
  const failures: string[] = []
  const warnings: string[] = []
  for (const slug of MACHINE_SLUGS) {
    let data: MachineData
    try {
      const parsed = JSON.parse(readFileSync(repoPath(`src/data/machines/${slug}.json`), 'utf8')) as unknown
      assertMachineData(parsed)
      if (parsed.slug !== slug) throw new Error(`expected slug ${slug}, found ${parsed.slug}`)
      data = parsed
    } catch (error) {
      failures.push(`${slug}: invalid machine data: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    for (const source of data.sources) {
      if (!/^[A-Za-z0-9._-]+$/.test(source.id)) {
        failures.push(`${slug}/${source.id}: unsafe source ID`)
        continue
      }
      const path = repoPath(`artifacts/source-snapshots/${slug}/${source.id}.json`)
      if (!existsSync(path)) {
        const message = `${slug}/${source.id}: source snapshot is missing`
        if (partial) warnings.push(message)
        else failures.push(message)
        continue
      }
      try {
        const snapshot = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
        const found = snapshot.ok === true || snapshot.quoteFound === true
        const receiptMatches = snapshot.quoteSha256 === quoteFingerprint(source.quote)
        if (found && receiptMatches) continue
        if (snapshot.note === 'offline') {
          warnings.push(`${slug}/${source.id}: source could not be verified offline`)
        } else if (found) {
          failures.push(`${slug}/${source.id}: snapshot does not match the current quote receipt`)
        } else {
          failures.push(`${slug}/${source.id}: snapshot has no successful verification record`)
        }
      } catch (error) {
        failures.push(`${slug}/${source.id}: invalid snapshot: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  return { failures, warnings }
}

async function main(partial: boolean): Promise<void> {
  mkdirSync(repoPath('reports'), { recursive: true })
  const reports: ValidationReport[] = []
  const missing: MachineSlug[] = []
  const loadFailures: Array<{ slug: MachineSlug; message: string }> = []
  const dataValidation = validateDataSnapshots(partial)
  dataValidation.failures.forEach((failure) => console.error(failure))
  dataValidation.warnings.forEach((warning) => console.warn(`warning: ${warning}`))

  for (const slug of MACHINE_SLUGS) {
    let module: MachineModule
    try {
      module = await loadMachine(slug)
    } catch (error) {
      if (isMissingMachineBuild(error, slug)) {
        missing.push(slug)
        if (partial) console.warn(`warning: skipping missing manifest module ${slug}`)
      } else {
        const message = importErrorMessage(error)
        loadFailures.push({ slug, message })
        console.error(`module ${slug} failed to load: ${message}`)
      }
      continue
    }

    const report = runValidation(module, {
      partial,
      repoRoot,
      fileExists: existsSync,
      readTextFile: (path) => readFileSync(path, 'utf8'),
      quoteFingerprint,
    })
    reports.push(report)
    writeFileSync(
      repoPath(`reports/${slug}.validation.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    )
  }

  writeSummary(reports, missing, loadFailures, dataValidation.failures, dataValidation.warnings)
  if (!partial && missing.length > 0) console.error(`manifest incomplete: ${missing.join(', ')}`)
  if ((!partial && missing.length > 0)
    || loadFailures.length > 0
    || dataValidation.failures.length > 0
    || reports.some((report) => report.summary.fail > 0)) {
    process.exitCode = 1
  }
}
