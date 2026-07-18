# Mechanica Ultracode Run Ledger

## Phase 0 Pre-flight

### Route

Full: understand → modify → verify → adversarial gate. Executor: in-session fan-out, with Phase 0 performed by root and later waves using disjoint ownership.

### Scope

Read the complete 1,716-line execution plan, inspect the planning-only repository, verify the local runtime, and prepare the Phase 0 scaffold, frozen data contracts, and CI gate.

### Findings

- The checkout initially contained only `MECHANICA_PLAN_EN.md` and `AGENTS.md`; no application scaffold exists.
- Node 22.23.1 and pnpm 11.9.0 are available. `corepack` is absent, so the already-installed pnpm is used per the plan's fallback intent.
- The directory is nested inside an unrelated, uncommitted parent repository and is not yet a standalone Git repository.
- The Build Week Session ID requirement conflicts with the committed-artifact sanitization rule. Decision: do not commit an identifier; retain `/feedback` capture as a submission-only unresolved item.

### Changes

Created this sanitized in-session run ledger. No application files have been created yet.

### Verification

- `node -v` → `v22.23.1`
- `pnpm --version` → `11.9.0`
- Full plan read in bounded ranges to avoid output truncation.

### Adversarial gate

Pending until the Phase 0 implementation is complete.

### Unresolved risks

- Git initialization was denied by the approval layer; Phase commits and `wave-*` tags cannot yet be produced.
- A Build Week Session ID cannot be generated through the available tools and must not be copied from internal task metadata.

### Next action

Scaffold the Vite/React workspace, freeze `src/sim/types.ts`, add CI, install the locked dependency set, and run GATE-0 checks that do not depend on the unresolved Git and Session ID items.

## Phase 0 Progress — Scaffold and Contracts

### Route

Full route, root-only implementation. Phase advancement remains gated on authoritative runtime checks.

### Scope

P0-T1 workspace scaffold, P0-T2 frozen contracts, P0-T3 CI, and the GATE-0 evidence available without installing packages or initializing repository metadata.

### Findings

- The package manifest and TypeScript configuration parse as valid JSON.
- The frozen contract includes all ten machine slugs, the layered solver interface, sourced geometry/provenance fields, bilingual machine data, mechanisms, schemes, and custom builders.
- CI is in partial manifest mode and includes test, validation, poison, build, and conditional e2e steps.
- Dependency installation first failed with registry DNS errors inside the sandbox; the required escalation was then denied.
- No global TypeScript compiler is installed, so type checking cannot be substituted for the rejected dependency installation.

### Changes

- Added the Vite 6 / React 19 / TypeScript 5.7 scaffold and planned package scripts.
- Added the full directory skeleton, static landing page, strict TypeScript/Vite/Vitest configuration, and ignore rules.
- Replaced `AGENTS.md` with the plan's verbatim project conventions.
- Added the frozen `src/sim/types.ts` contract and `.github/workflows/ci.yml`.
- Added `docs/SUBMISSION_NOTES.md` with a sanitized `/feedback` placeholder.

### Verification

- Verified: JSON configuration parsing; required files and skeleton paths; `base: './'`; ES2022 build target; CI partial flag, poison command, and e2e hash gate; all frozen-contract exports by static inspection.
- Detected but unrun: `pnpm test`, `pnpm build`, `pnpm exec tsc --noEmit`, and local dev HTTP/browser checks.
- Unresolved: no `pnpm-lock.yaml`, no standalone Git history, no freeze commit, no `wave-0` tag, and no Session ID.

### Adversarial gate

An independent read-only skeptic reviewed the supplied Phase 0 task text and current static evidence. Findings: empty. Verdict: `SURVIVES_STATIC_REVIEW` with concerns. It confirmed the stack/scripts, strict TypeScript settings, Vite base/target, frozen contract surface, CI shape, directory skeleton, and verbatim agent conventions. It marked dependency resolution, TypeScript/build behavior, executable gates, Git history, and Session ID UNVERIFIABLE. Runtime correctness remains unproven; Phase 0 is not approved.

### Unresolved risks

- Third-party package installation requires explicit approval because it executes package lifecycle code and writes the dependency tree/lockfile.
- Standalone Git initialization requires explicit approval because it creates persistent repository metadata.
- GATE-0 items G0.1–G0.4 and G0.6 remain incomplete; only G0.5 is verified.

### Next action

Obtain explicit authorization for `pnpm install` and `git init -b main`, then run every remaining GATE-0 command, perform the browser console check, create the required task commits/tag, and append the completed Phase 0 gate evidence.

## Phase 0 Blocked Audit

### Route

Full route paused at GATE-0; no later wave was entered.

### Scope

Third consecutive audit of the authority required to install the planned third-party dependency graph and initialize standalone repository metadata.

### Findings

- `pnpm-lock.yaml` remains absent.
- `node_modules/` remains absent.
- Git still resolves to the unrelated parent repository; this workspace has no standalone history.
- The approval layer previously denied both required mutations and explicit user authorization has not arrived.

### Changes

No application changes in this audit. The existing Phase 0 static scaffold remains intact.

### Verification

Read-only checks confirmed the same blockers for the third consecutive goal turn. G0.1–G0.4 and G0.6 remain incomplete.

### Adversarial gate

The static skeptic verdict remains `SURVIVES_STATIC_REVIEW`, but it cannot substitute for the required executable gates.

### Unresolved risks

Continuing into Phase 1 would violate the plan's rule that every GATE-0 row pass before advancing.

### Next action

Resume only after explicit authorization for `pnpm install` and `git init -b main`; then finish and record GATE-0 before spawning Phase 1 workers.

## Phase 0 Resumed — Executable Gate Evidence

### Route

Full route resumed after explicit authorization. Phase 0 remains root-only and Phase 1 remains unopened pending the final gate row.

### Scope

Initialize the standalone repository, lock/install dependencies, execute G0.1–G0.5, and create the three Phase 0 task commits.

### Findings

- pnpm 11 initially returned `ERR_PNPM_IGNORED_BUILDS` for esbuild. `pnpm-workspace.yaml` now allows only esbuild's required lifecycle build; the repeated install and frozen-lockfile install both pass.
- Resolved stack remains within the plan's locked majors: Vite 6.4.3, React 19.2.7, TypeScript 5.7.3, Three 0.179.1, React Three Fiber 9.6.1, Zustand 5.0.14.
- The in-app browser rendered the Phase 0 page at localhost with the expected title and content and reported zero warning/error console entries.

### Changes

- Initialized the repository on `main` and committed the execution plan.
- Created `chore: scaffold vite+r3f workspace`, `feat: freeze data contracts (types.ts)`, and `ci: add partial validation workflow` commits.
- Added a frozen pnpm lockfile and restricted lifecycle-build policy.

### Verification

- G0.1: `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` ready in 71 ms; authorized `curl` returned HTTP 200; browser title `Mechanica — Ancient Machines Reborn`; console warnings/errors `[]`.
- G0.2: `pnpm build` exit 0; `dist/index.html` exists; entry JS 194.73 kB / 60.97 kB gzip.
- G0.3: `pnpm exec tsc --noEmit` exit 0.
- G0.4: `git log --oneline` contains `4b7c415 feat: freeze data contracts (types.ts)`.
- G0.5: CI contains `VALIDATE_FLAGS: "--partial"`, the poison step, and the odometer `hashFiles` e2e gate.
- Additional: `pnpm test` exit 0 with the intentional empty-suite `passWithNoTests` configuration; `pnpm install --frozen-lockfile` exit 0.
- G0.6: unresolved. `docs/SUBMISSION_NOTES.md` still contains the `/feedback` placeholder rather than a verified Session ID.

### Adversarial gate

The prior independent skeptic's static verdict survives the runtime checks. No Phase 0 implementation finding remains open; only the external Session ID requirement is unverified.

### Unresolved risks

- G0.6 is mandatory for the Build Week context and cannot be fabricated from internal task metadata.
- `wave-0` is intentionally not tagged because the plan forbids advancing/tagging until every GATE-0 row passes.

### Next action

Obtain the actual `/feedback` Session ID, replace the placeholder, commit it with this sanitized ledger, tag `wave-0`, then spawn the four Phase 1 workers.

## Phase 0 Complete — GATE-0

### Route

Full route; root-only Phase 0 completed before worker fan-out.

### Scope

Close G0.6 with the user-provided `/feedback` value, confirm all prior executable evidence, sanitize the ledger, and authorize the Phase 1 transition.

### Findings

- The user supplied the required Session ID, which is recorded only in the submission note and intentionally omitted from this ledger.
- Every GATE-0 row now has authoritative evidence.

### Changes

- Replaced the Session ID placeholder in `docs/SUBMISSION_NOTES.md`.
- Finalized the Phase 0 ledger without embedding the identifier.

### Verification

- G0.1–G0.5 retain the green command/browser evidence recorded above.
- G0.6: `docs/SUBMISSION_NOTES.md` contains the user-provided `/feedback` Session ID.

### Adversarial gate

Phase 0 survives the independent static skeptic and root runtime/browser verification. No open Phase 0 finding remains.

### Unresolved risks

None for Phase 0. The Session ID is a deliberate submission-note exception to the general artifact-sanitization rule.

### Next action

Commit the Phase 0 evidence, tag `wave-0`, and begin the four Phase 1 ownership units.

## Phase 1 Complete — Core, Simulation, Validation, and UI

### Route

Full route with four disjoint implementation units, root integration, focused repair rounds, and independent adversarial review for every unit.

### Scope

Deliver parametric geometry, the layered kinematic solver, deterministic validation and poison infrastructure, and the bilingual interactive museum shell with an executable 20/40-tooth demo.

### Findings

- Pin gears require the inner radius plus pin radius to remain below the pitch radius.
- Reverse crank input needs bounded analytic inversion, explicit dead-center behavior, and nearest-branch selection.
- Escapement ticks must consume residual time through release and lock transitions to remain timestep-partition independent.
- Collision whitelists require observed 3D contact across sampled motion; analytic gear placement alone is insufficient.
- Spotlight completion must follow its timed camera, highlight, and drive sequence rather than the trigger's synchronous return.

### Changes

- `17bc445` adds sourced units, materials, gear generation, primitive builders, and core tests.
- `c84d6dd` adds linear/function/multi-input/gimbal solver layers, escapement simulation, and golden tests.
- `cf704a1` adds ratio, range, provenance, collision, import, report, sampling, CLI, and poison validation.
- `e2f1586` adds the bilingual catalog, R3F viewer, drive/explode/assembly controls, part records, reconstruction switching, gallery, spotlight choreography, and Playwright coverage.

### Verification

- `pnpm test` → 35/35 tests passed across core, simulation, and validation.
- `pnpm exec tsc --noEmit` and `pnpm build` → exit 0. Vite reports a non-blocking main-chunk size warning.
- `pnpm validate --partial` → exit 0 with exactly ten expected missing-machine warnings.
- Strict `pnpm validate` → expected exit 1 with `manifest incomplete` for all ten Phase 2/3 machine modules.
- `pnpm e2e` → 3/3 passed: ten-card metadata, exact −0.5 demo ratio, sub-300 ms inspector, explode spread, delayed spotlight completion, and a ten-second ≥50 FPS sample.
- In-app browser review confirmed the complete card layout, responsive viewer, meshing gears, part selection, spotlight camera pose, highlights, captions, and done state.
- Deletion audit found only replaced placeholder files and the superseded Phase 0 landing page.

### Adversarial gate

Four independent skeptic reviews pass with zero open findings. Repairs covered pin-gear hole bounds, crank branch continuity, escapement timestep stability, signed ratios, full-sweep BVH contact, transient poison collisions, import failure classification, card metadata, source-linked controversies, and truthful spotlight timing.

### Unresolved risks

The strict manifest gate remains intentionally red until the ten machine modules land. The production bundle warning should be revisited when machine-level code splitting and assets are available.

### Next action

Commit this gate evidence, tag `wave-1`, remove temporary history-safety branches, and begin Phase 2 data and source-snapshot ownership units.

## Phase 2 Complete — Data, Sources, and Licensed Assets

### Route

Full route with disjoint data and pipeline workers, root integration, two adversarial rounds, and root repair and verification of the finite findings.

### Scope

Deliver the ten-machine bilingual knowledge base, source-text receipts, licensed optimized museum assets, attribution credits, build-time extraction and audit scripts, and snapshot-bound validation.

### Findings

- Thirty-three source quotations now have fetched receipts with verified matched spans and hashes; source snapshots required narrow traditional/simplified normalization and removal of inline pronunciation annotations.
- Institutional museum records supersede the gimbal card for artifact measurements and display status. The Hejiacun outer diameter is therefore `0.045` m, and the revision is recorded in `docs/OPEN_QUESTIONS.md`.
- Commons supplied 48 usable raster assets. License metadata, file magic, per-file limits, aggregate limits, and credit-to-disk parity all pass.
- The wooden-ox card names two reconstructions but supplies no publication years. Required scheme years were not invented.

### Changes

- Added ten validated `src/data/machines/*.json` records plus field-level schema and cardinality tests.
- Added source snapshot, licensed image fetch, GPT-5.6 parts-extraction, and independent audit scripts.
- Committed source receipts, optimized museum assets, generated credits, and a zero-failure image-pipeline report.
- Extended deterministic validation so a successful source receipt must match the current quotation fingerprint; stale or missing receipts fail.

### Verification

- `pnpm test` → 61/61 tests passed across five files; the focused data suite covers all ten cards and per-slug supply floors.
- `pnpm exec tsc --noEmit` and `pnpm build` → exit 0; Vite retains the known non-blocking main-chunk warning.
- `pnpm snapshot-sources` → 33/33 quotations verified across ten directories with no offline exceptions.
- A deliberate one-character seismoscope quotation corruption made `pnpm validate --partial` exit 1 with a stale-receipt failure; restoring the character returned validation to exit 0 with exactly ten expected missing Phase 3 modules.
- Asset audit → 48 credit records match 48 committed rasters; 8,025,103 bytes total, 284,259-byte maximum, zero fetch failures.
- `pnpm extract` and `pnpm run audit` → exit 0 with their specified yellow keyless-skip warnings because `OPENAI_API_KEY` is absent.

### Adversarial gate

Two independent skeptic rounds exercised philology, schema cardinality, receipt integrity, museum provenance, license handling, filesystem safety, and artifact sanitization. The second round found seven finite issues; root repaired six and self-verified the resulting source, data, asset, and validation invariants. No third Phase 2 skeptic round was opened under the configured two-round maximum.

### Unresolved risks

- Wooden-ox reconstruction metadata remains incomplete because neither scheme year is established by the frozen card or a verified source. This is documented and must be resolved with citable evidence before the machine can clear its release gate.
- GPT-5.6 extractions are intentionally absent until a key is available; independent audits remain a mandatory Phase 6 gate after final machine reports exist.

### Next action

Create the four scoped Phase 2 commits, tag `wave-2`, then start the Phase 3 ten-machine fan-out in bounded ownership batches.
