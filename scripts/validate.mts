import { MACHINE_SLUGS, type MachineModule, type MachineSlug } from '../src/sim/types'
import { importErrorMessage, isMissingMachineBuild } from '../src/validate/imports'
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

const fsModuleName = 'node:fs'
const {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} = await import(fsModuleName) as unknown as FileSystem
const repoRoot = process.cwd().replace(/[\\/]+$/, '')
const repoPath = (path: string) => `${repoRoot}/${path}`

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
  writeFileSync(repoPath('reports/summary.md'), `${lines.join('\n')}\n`)
}

async function main(partial: boolean): Promise<void> {
  mkdirSync(repoPath('reports'), { recursive: true })
  const reports: ValidationReport[] = []
  const missing: MachineSlug[] = []
  const loadFailures: Array<{ slug: MachineSlug; message: string }> = []

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
    })
    reports.push(report)
    writeFileSync(
      repoPath(`reports/${slug}.validation.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    )
  }

  writeSummary(reports, missing, loadFailures)
  if (!partial && missing.length > 0) console.error(`manifest incomplete: ${missing.join(', ')}`)
  if ((!partial && missing.length > 0)
    || loadFailures.length > 0
    || reports.some((report) => report.summary.fail > 0)) {
    process.exitCode = 1
  }
}
