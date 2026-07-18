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

- The user supplied the required Session ID for direct Devpost entry. It is intentionally omitted from repository artifacts, including the submission note and this ledger.
- Every GATE-0 row now has authoritative evidence.

### Changes

- Replaced the Session ID placeholder in `docs/SUBMISSION_NOTES.md` with the repository's external-only submission policy.
- Finalized the Phase 0 ledger without embedding the identifier.

### Verification

- G0.1–G0.5 retain the green command/browser evidence recorded above.
- G0.6: the user supplied the `/feedback` Session ID for direct Devpost entry; the committed note records the external-only handling policy.

### Adversarial gate

Phase 0 survives the independent static skeptic and root runtime/browser verification. No open Phase 0 finding remains.

### Unresolved risks

None for Phase 0. The Session ID is retained outside version control and must be entered directly in Devpost.

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

## Phase 3 Complete — Ten Reborn Machines

### Route

Full route with wave fan-out, root integration, focused repair rounds, rendered browser verification, and independent final skeptics for the load-bearing Typecase, Chainpump, Bellows, and Gimbal fixes.

### Scope

Deliver all ten parametric machine modules, reconstruction schemes, sourced ratios, mechanisms, deterministic motion/collision reports, and the permanent strict-manifest CI transition.

### Findings

- Typecase needed a real GPU `InstancedMesh` rather than merged boxes, plus a persistent five-stage printing stepper with exact source text.
- Chainpump phase must advance by `rθ/P`; one sprocket revolution moves `2πr`, not one pallet pitch. Runtime instances now update individually while collision validation expands them only transiently.
- Bellows requires visible perpendicular cord spans and exact rocker geometry `-asin(s/L)` throughout the stroke, not endpoint-fitted scalar motion.
- Gimbal leveling depends on a nested shell/ring/bowl hierarchy and attitude-quaternion counter-rotation.
- The poison harness initialized its shared provenance after top-level needle execution; moving that constant before execution removed the TDZ crash.
- The demo e2e test sampled a transient caption and could miss it after a fast completion. Recording the full caption sequence now proves highlight precedes done without a timing race.

### Changes

- Added all ten `src/machines/<slug>` modules and ten machine test suites.
- Extended the solver/viewer/validator for scheme overlays, stateful mechanisms, attitude drives, dynamic instance matrices, custom material overrides, and instance-aware collision bounds.
- Added `machines.csv` with ten `DONE` rows, strict CI (`VALIDATE_FLAGS: ""`), final reports, and GATE-3 poison evidence in `docs/SUBMISSION_NOTES.md`.

### Verification

- G3.1: `pnpm test -- tests/machines` and final `pnpm test` → 15 files, 151 tests passed; `pnpm exec tsc --noEmit` → exit 0.
- G3.2: restored strict `pnpm validate` → exit 0; all ten reports have zero fail/warn. Nine resolve at approximately 0.5°, while the explicitly capped Odometer report resolves at 1.89°.
- G3.3: Astroclock, Chariot, Loom, Seismoscope, and Wooden Ox each report base plus both named scheme sections with no non-pass checks.
- G3.4: 31 ratio checks passed; zero failed and zero lacked a source reference.
- G3.5: saved browser evidence covers all ten routes. Final repaired-path checks proved Typecase ordering/reset/spotlight, Chainpump crank-sprocket-chain lockstep, Bellows full 0.48 m linkage stroke, Gimbal 10° shell attitude with level bowl, and the complete Chariot drive/three-part/explode/assemble/reset/spotlight surface. Browser console errors were limited to missing `favicon.ico`.
- G3.6: CI now has `VALIDATE_FLAGS: ""`; local CI-equivalent checks are green. `pnpm build` exits 0 with first-route gzip 338.56 KB; `pnpm e2e` passes 3/3.
- G3.7: corrected `pnpm poison` prints four `caught by the validator ✓` lines. The manual 48→47 Chariot needle made strict validation exit 1 with 12 failures; restoring 48 returned strict validation to exit 0.
- G3.8: `machines.csv` records all ten rows as `DONE`; every worker/skeptic concern was addressed and the four final independent reviews returned `PASS`.

### Adversarial gate

Independent final reviews found no remaining concrete defect in Typecase instancing/process flow, Chainpump phase/instances/water/collision truth, Bellows cord/linkage/provenance, or Gimbal hierarchy/stabilization.

### Unresolved risks

- CI has been reproduced locally but cannot be observed remotely until the commit is pushed.
- The only browser console error is the pre-existing missing `favicon.ico`; it does not affect the acceptance surfaces.

### Next action

Commit the integrated Phase 3 wave, tag `wave-3`, then begin Phase 4 docent, compare-mode, and interaction-completeness work.

## Phase 4 Complete — Interaction and Docent Layer

### Route

Full route with disjoint implementation workers, root integration, three independent read-only skeptics, focused repair, and root-owned unit, validation, build, poison, i18n, and real-browser acceptance.

### Scope

Complete dependency-aware assembly, one-second reconstruction handoff, dual-canvas comparison, four-layer gallery and attribution, bilingual UI auditing, and the fail-closed grounded AI Docent without changing machine data, dimensions, ratios, or provenance.

### Findings

- The first green browser suite did not prove compare-part dragging, machine-specific compare excitation, sparse assembly-step visibility, or actual R3F frame rates. The repaired suite now exercises pointer input, seismoscope divergence, ordered visibility, and per-canvas frame counters.
- The first Docent relay could accept truncated upstream SSE, context changes could leave chat streaming, the shared-budget request lacked the upstream timeout, daily exhaustion used the wrong status, and citation chips opened external URLs. All now fail closed or navigate to validated PartInspector sources as specified.
- The gallery initially inferred reconstruction renders from title keywords and its checks only proved empty panels. Reconstruction classification is now path-based, attribution and lightbox behavior are asserted, offline fallback is simulated, and the modal traps and restores focus.
- English inspection leaked the opposite-language part name. The inspector now renders only the active locale while preserving original-language source quotations as collection content.
- A production build initially emitted the development mock chunk. The client mock path is now compile-time guarded and the production artifact contains neither a mock chunk nor mock reply strings.

### Changes

- Added the assembly controller, drag/tap reassembly, dependency feedback, snap threshold, completion effect, and transmission gating.
- Added scheme ghost transitions, dual linked canvases, behavioral compare excitation, shared geometry cache, difference tinting, linked hover/camera state, actual frame counters, and the evidence table.
- Added accessible four-layer gallery tabs, linked attribution, collection fallback cards, a focus-trapped lightbox, browser-language defaulting, catalog parity audit, and zero-leakage route checks.
- Added strict Docent request validation, grounded prompt assembly, semantic SSE relay, abort and rate/budget controls, validated in-page citation navigation, development/E2E mock behavior, and production fail-closed states.
- Expanded browser acceptance to sixteen scenarios, including all ten machine routes with no console errors, real pointer drives, all five dual-scheme machines, assembly completion, attribution/lightbox/offline behavior, Docent chips, language leakage, and actual compare-canvas performance.

### Verification

- `pnpm test` → 19 files and 175/175 tests passed.
- `pnpm validate` → exit 0 under the permanent strict manifest; all ten refreshed reports remain clean.
- `pnpm poison` → exit 0 with four `caught by the validator ✓` confirmations.
- `pnpm i18n:check` → `i18n catalogs: 0 issues`.
- `pnpm e2e` → 16/16 scenarios passed; chariot dual view clears 40 fps and half-resolution Astroclock clears 25 fps using actual left/right R3F frame counters.
- `pnpm build` → exit 0, 678 modules, first-route gzip 353.22 KB; the known non-blocking chunk warning remains.
- Production artifact scan found zero development-mock reply strings and no mock chunk. Literal boundary probes return 400 for an 8,193-byte body and for `role:"system"`; the 11th request from one IP returns 429; an unknown citation remains plain text.

### Adversarial gate

Three independent skeptics challenged assembly/compare semantics, Docent security and outage behavior, and gallery/i18n acceptance. Their concrete findings were repaired and root reproduced the strengthened gates. No reported acceptance-impacting Phase 4 finding remains open.

### Unresolved risks

- A real-key Docent answer could not be exercised because `OPENAI_API_KEY` is absent. Boundary, production-failure, mock-isolation, and grounded-citation paths are verified without fabricating a live-model result.
- The build retains the known large uncompressed main-chunk warning while remaining below the plan's gzip budget.
- Project reconstruction renders remain intentionally absent until Phase 6. The newly inserted Visual Recovery gate forbids generating them until all ten models pass semantic-fidelity and framing review.

### Next action

Commit the Phase 4 task and tag `wave-4`. Then immediately run the blocking Visual Recovery phase across all ten routes: capture default, alternate/side, and exploded or animated evidence; require complete centered 60–80% framing and recognizable named silhouettes; repair semantic fidelity while treating fine ornament as optional; obtain an independent read-only evidence verdict; and do not generate final renders until every machine is green.

## Visual Recovery Complete — All-Machine Visual Gate

### Route

Full route with root-owned browser capture and remediation, followed by an independent read-only adversarial review. Phase 5 and final render generation remained paused throughout.

### Scope

Audit all ten machine routes in default, alternate, and fully exploded states. Semantic fidelity was blocking: a named animal, person, vessel, or mechanism had to read from its silhouette and hierarchy at normal zoom. Ornamental fidelity—scales, carving, surface decoration, and other fine detail—was optional. Cross-directory edits were limited to `src/ui/viewer`, `src/machines/seismoscope`, and `src/machines/gimbal`; authoritative data, dimensions, ratios, provenance, and interaction semantics were unchanged.

### Findings and changes

- Astroclock: the oversized tower clipped in the initial view. Bounds-aware framing now contains the tower, and compact human-form jacks plus material hierarchy clarify the moving figures.
- Seismoscope: ellipsoidal dragons and toads failed semantic identity. Exact-envelope composite silhouettes now provide horned heads, open jaws, eyes, mouths, and splayed limbs without changing part dimensions.
- Chariot: framing was too close. A machine-specific fit and view direction contain the full chassis, canopy, pointer figure, and wheels.
- Odometer: tall framing and box-like figures obscured the mechanism. The view now contains the carriage, and exact-envelope head, torso, limb, and striker silhouettes read as people.
- Wooden Ox: the head and body were cropped and the head was ambiguous. Reframing plus an exact-envelope horn, ear, muzzle, and cranial silhouette restores the ox identity.
- Loom: an alternate angle crossed the control overlay. Camera fit, hierarchy, and the recaptured opposite oblique keep the full warp/frame above the controls.
- Typecase: the wide, shallow apparatus lacked hierarchy. Framing and differentiated type, tray, carriage, and frame materials preserve the complete flat mechanism.
- Chainpump: the long machine appeared too small and visually uniform. A tighter fit and water, chain, pallet, sprocket, and trough hierarchy expose the transport path.
- Bellows: the chest read as a generic box. An exact-envelope paired-body, lid, and nozzle silhouette plus framing and material separation clarifies the air mechanism.
- Gimbal: the model was initially too small, then support-focused experiments cropped its chain and base. Final full-bounds framing contains the complete suspension; a concave bowl, teardrop flame, translucent shell, and contrasting rings make the stabilizer legible.

### Browser evidence

Root captured and reviewed thirty 1440×1000 headed-browser screenshots: default, alternate OrbitControls view, and fully exploded state for every machine. Every route had empty console-error and page-error collections. Exploded sliders were asserted at `1`, and measured part spreads were nonzero for all ten models. The independent reviewer first rejected Loom alternate-view overlap and Gimbal framing, then reviewed the repaired evidence and returned `GREEN` for all ten machines.

### Verification

- `pnpm test` → 19 files, 175/175 tests passed.
- `pnpm validate` → exit 0 under strict all-machine validation.
- `pnpm poison` → exit 0 with four validator catches.
- `pnpm i18n:check` → zero issues.
- `pnpm build` → exit 0; 679 modules transformed, 356.63 kB main-entry gzip.
- `pnpm e2e` → 16/16 scenarios passed, including all ten routes without console errors and all existing interaction/performance assertions.
- `pnpm exec prettier --check ...` and `git diff --check` → exit 0.

### Adversarial gate

The read-only reviewer found recognizable required animal and human silhouettes, complete UI-safe views, materially distinct alternates, and valid exploded states. It accepted Gimbal's long chain/support as an unusual-proportion exception because the complete assembly occupies about 70% of the safe vertical model area. Verdict: `GREEN` for all ten machines.

### Remaining limitations

Fine ornament remains intentionally optional. Typecase is inherently flat and wide; Chainpump, Bellows, and Gimbal are unusually elongated, so their central mechanisms occupy less width than compact machines when the complete assembly is fitted. The known non-blocking Vite chunk-size warning remains. These are documented visual constraints, not gate failures.

### Next action

Commit and tag this green Visual Recovery checkpoint. Resume Phase 5 only afterward, and rerun the full Visual Gate after the remaining functionality is complete and before generating final renders.

## Phase 5 Complete — Flagship Scroll Stories

### Route

Full route with three disjoint story authors, root integration and headed-browser repair, then an independent read-only adversarial re-review. Final render generation remained blocked.

### Scope

Add bilingual, source-linked scroll stories for Astroclock, Chariot, and Seismoscope with camera choreography, exploded states, visible mechanism drives, reconstruction handoffs, and the existing spotlight triggers. No authoritative machine data, dimensions, ratios, provenance, parts, or scheme definitions changed.

### Findings and changes

- Added nine Astroclock, seven Chariot, and eight Seismoscope chapters plus responsive story routing, source drawers, and model-entry links.
- Repaired drive interpolation so missing targets ease to zero and drive-node changes cross through zero. Story graphs persist between same-scheme chapters instead of resetting at active-step thresholds.
- Chariot now drives the constrained right sub-wheel through the documented 24/12/48 train; its turn camera contains the complete figure and mechanism.
- Seismoscope now drives the visible Feng duzhu, keeps all balls available for the following first-event spotlight, and uses story-only vessel opacity for readable cutaways.
- Reconstruction changes crossfade both models with complementary opacity. A midpoint dolly-out keeps the complete Wang/Feng and Yan Su/Lanchester handoffs in frame.
- The performance check now samples animation frames during sustained wheel input. A separate mobile Chromium context dispatches a native touch swipe.

### Verification

- `pnpm test` → 20 files, 180/180 tests passed.
- Strict `pnpm validate` → exit 0.
- `pnpm build` → exit 0; the known non-blocking large-chunk warning remains.
- `pnpm e2e` → 21/21 scenarios passed, including all prior interactions, three sustained-scroll story checks, source drawers, spotlight reuse, language switching, and native touch scrolling.
- Headed two-second wheel samples: Astroclock 58.45 fps, Chariot 59.48 fps, Seismoscope 58.95 fps; console and page errors were empty.
- Browser evidence includes each story's start, source drawer, ingenuity step, repaired Chariot turn, both scheme-crossfade midpoints, Seismoscope cutaway pulse, and a mobile layout.

### Adversarial gate

The first skeptic pass returned RED for ineffective drives, stale/snapping drive state, hard scheme swaps, and an idle-only performance test. After repair, the same independent reviewer inspected code and final evidence and returned `GREEN` with every finding closed.

### Remaining limitations

Story cameras intentionally use mechanism close-ups at some chapter endpoints. Sustained headed samples cluster just below the display's nominal 60 Hz while remaining smooth and above the automated 45 fps floor. Final all-machine visual acceptance is still pending after Phase 6; no project renders may be generated before that gate is green.

### Next action

Commit and tag `wave-5`, complete Phase 6 without generating final renders, then rerun the blocking all-ten-machine Visual Gate before any render or deployment work.

## Phase 6 Progress — Local Evidence Closed, GPT Artifacts Blocked

### Route

Full route with root-owned deterministic verification and three read-only adversarial audits. Phase 7 remains unopened, and `wave-6` remains untagged.

### Scope

Refresh source receipts, rerun the manual fifth poison needle, preserve the final all-machine Visual Gate, generate and review the 40 reconstruction views, and reconcile every remaining Phase 6 release requirement without changing authoritative machine data, dimensions, ratios, or provenance.

### Findings

- The 48→47 Chariot mutation was rejected with 12 signed-ratio and whitelisted-contact failures across the base, Yan Su clutch, and Lanchester schemes. Restoring 48 teeth returned all ten strict reports to zero failures and zero warnings.
- All 33 source snapshots refreshed successfully and retained their verified quotations and content hashes; only `fetchedAt` values changed.
- The render set contains exactly four 1056×928 JPEG views for each of ten machines. All 40 are distinct, the largest is 57,921 bytes, and the complete set is 1,240,942 bytes.
- `OPENAI_API_KEY` is absent. `pnpm extract` and `pnpm run audit` therefore take G2.6's logged keyless-skip path; `artifacts/extractions/` and `artifacts/audits/` contain no generated machine artifacts. Final §9 is stricter than G2.6 and requires ten of each before project completion, so the explicit artifact-count gate remains blocking.

### Changes

- Added the licensed MIT reconstruction-render manifest, local Gallery integration, 40 optimized render assets, and the deterministic render capture script after the Visual Gate was green.
- Strengthened validation, browser coverage, production mock isolation, Docent boundary behavior, and visual framing/semantic geometry while preserving the §7 facts and existing interaction semantics.
- Updated submission evidence to state the external-only Session ID policy and to expose the incomplete GPT artifact gate honestly. The recorded default decision is that G2.6 governs keyless command behavior, while the later final §9 checklist governs whether the project may be declared complete.

### Verification

- `pnpm snapshot-sources` → 33/33 receipts verified, exit 0.
- Manual Chariot 48→47 mutation → strict `pnpm validate` exit 1 with 12 failures; restored 48-tooth state → exit 0, ten reports green.
- Preliminary exact chain `pnpm test && pnpm validate && pnpm poison && pnpm e2e && pnpm build` → exit 0: 181/181 unit tests, all ten reports fail=0 warn=0, four expected poison catches, 30/30 browser scenarios in 2.7 minutes, and a successful production build.
- `pnpm i18n:check` → zero issues in the current release candidate.
- Render checks → 40/40 JPEGs at 1056×928, zero duplicate hashes, every file below 300 KiB, total public asset budget below 25 MiB.
- `pnpm extract` and `pnpm run audit` → exit 0 with explicit keyless-skip warnings, as required by G2.6; artifact counts remain zero and no output was fabricated.

### Adversarial gate

The release-readiness skeptic correctly rejected the temporary 47-tooth worktree while the poison run was active and identified the missing GPT audits, untracked render set, absent Phase 6 ledger, and unrun final chain. The tooth value and strict reports are restored, the preliminary chain is green, the render set is present for explicit staging, and this progress ledger closes the documentation gap. Two additional reviewers confirmed that Phase 7 clean-clone, deployment, and public-smoke claims would be premature. GPT artifact coverage, post-artifact completeness review, and the final repeated chain remain open.

### Unresolved risks

- Ten GPT-5.6 extraction artifacts and ten independent audit reports are mandatory but cannot be generated without an API key.
- The completeness critic and final five-command chain must run after those artifacts exist and any audit conflicts are resolved.
- The 40 render files are prepared for the release-candidate commit. A `wave-6` tag still requires the GPT artifacts, completeness closure, and repeated final chain.
- GitHub is unauthenticated and no remote exists; deployment and public-route smoke remain Phase 7 external work.

### Next action

Provide `OPENAI_API_KEY` in the execution environment, run `pnpm extract` and `pnpm run audit`, resolve every load-bearing conflict, then rerun the completeness critic and the exact five-command chain before committing and tagging `wave-6`.
