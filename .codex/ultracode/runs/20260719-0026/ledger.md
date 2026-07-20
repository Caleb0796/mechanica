# Mechanica Fidelity Run Ledger

Run ID: `20260719-0026` UTC
Wave 0 start: `5825cb3db1d4a68c6ab727b811293904f05bb57e`

## Protected starting state

The repository began this fidelity run with uncommitted Phase 4 work across machine data/build files, validation, UI, reports, audits, extractions, and the prior run ledger. Those edits are protected: no unrelated hunk is to be staged, overwritten, or discarded. Wave-0 route-load baselines for all ten machines were captured before F0-T1 remediation.

Semantic fidelity is blocking: a named mechanism, animal, or human figure must read correctly from its silhouette and structure. Ornamental fidelity is non-blocking unless its absence prevents that recognition.

## F0-T1 — PASS

Files:
- `src/ui/viewer/SceneEnvironment.tsx`
- `src/ui/viewer/MachineViewer.tsx` (IBL, lighting, renderer configuration, and performance-preservation hunks only)
- `src/ui/compare/CompareView.tsx` (IBL and compiled/stable readiness hunks only)
- `src/ui/viewer/visualRecovery.ts` (emissive retuning only)
- `src/ui/styles.css`
- `tests/ui/sceneEnvironment.test.ts`

Verification:
- `pnpm test` — isolated staged snapshot: 21 files, 184/184 tests passed; integrated protected workspace: 21 files, 195/195 tests passed.
- `pnpm validate` — isolated and integrated runs exit 0; all ten report rows have Fail=0.
- `pnpm e2e` — 30/30 tests passed, including all routes, interactions, console, compare, and story performance checks.
- `pnpm i18n:check` — 0 issues.
- `pnpm build` — exit 0; `dist/` emitted.
- `pnpm exec tsc --noEmit` — exit 0.
- `rg "Environment preset|preset=|@react-three/drei.*Environment" src tests` — no matches.
- PMREM tests prove one target per renderer, final-ref disposal, prepared pre-render adoption, and disposal/restoration across five mount cycles.

Evidence:
- `artifacts/visual-gate-2/_baseline-w0/before-*.png` — ten route-load baselines.
- `artifacts/visual-gate-2/F0-T1/after-*.png` — ten current route-load captures.
- `artifacts/visual-gate-2/F0-T1/story-astroclock.png`
- `artifacts/visual-gate-2/F0-T1/compare-astroclock.png`
- Independent read-only skeptic verdict: GREEN on all ten after-images; no blocking visual concern.

Concerns:
- Astroclock compare remains intentionally half-resolution under the pre-existing performance safeguard; F0-T10 removes that mode.
- Vite reports a non-blocking three-vendor chunk-size warning.
- Protected Phase 4 work remains unstaged.

## F0-T2 — PASS

Files:
- `src/core/materialCache.ts`
- `src/core/materials.ts`
- `src/ui/viewer/MachineViewer.tsx` (material-cache, transient-state, renderer-memory, and stable appearance-family hunks only)
- `tests/core/materialCache.test.ts`
- `e2e/smoke.spec.ts`

Verification:
- `pnpm test` — isolated staged snapshot: 22 files, 188/188 tests passed; integrated protected workspace: 22 files, 199/199 tests passed.
- `pnpm validate` — isolated and integrated runs exit 0; all ten strict machine validations regenerated without failure.
- `pnpm e2e` — isolated and integrated runs: 31/31 tests passed, including all routes, console checks, interactions, stories, and performance checks.
- `pnpm i18n:check` — 0 issues in both isolated and integrated workspaces.
- `pnpm exec tsc --noEmit` — exit 0.
- Production build — exit 0 in both E2E runs; `dist/` emitted.
- StrictMode cache test proves setup-cleanup-setup identity, idempotent release, cancelable deferred sweep, and one final disposal.
- Twenty spotlight toggles keep WebGL renderer geometry and texture counts exactly flat; the bounded unit pool also remains at two variants.

Evidence:
- Root browser review at 1600×900 covered astroclock default, active spotlight material, and compare tint states with no browser warning or error.
- Full E2E covered assembly highlight/error, scheme ghost handoff, linked compare, spotlight, and every machine route without console errors.
- Independent read-only skeptic verdict: GREEN after deferred-sweep, collision-safe key, and concurrent ghost-family fixes.

Concerns:
- Astroclock compare remains intentionally half-resolution under the pre-existing performance safeguard; F0-T10 removes that mode.
- An unrelated acquisition can postpone the global deferred LRU timer until a later release; synchronous over-limit sweeping and final-unmount disposal still bound the cache.
- Vite reports a non-blocking three-vendor chunk-size warning.
- Protected Phase 4 work remains unstaged.

## F0-T3 — PASS

Files:
- `src/core/textures.ts`
- `src/core/geometryUvs.ts`
- `src/core/materials.ts`
- `src/core/materialCache.ts`
- `src/core/primitives.ts`
- `src/core/gears.ts`
- `src/ui/viewer/MachineViewer.tsx` (texture selection, compare opt-out, cache identity, and E2E diagnostics only)
- `src/ui/viewer/visualRecovery.ts` (texture variants and gimbal alpha-test presentation only)
- `tests/core/textures.test.ts`
- `tests/core/primitives.test.ts`
- `tests/core/gears.test.ts`
- `tests/core/materialCache.test.ts`
- `e2e/smoke.spec.ts`

Verification:
- `pnpm test` — isolated staged snapshot: 24 files, 197/197 tests passed; integrated protected workspace: 24 files, 208/208 tests passed.
- `pnpm validate` — isolated and integrated runs exit 0; all ten strict validation reports regenerated without failure.
- `pnpm e2e` — isolated and integrated runs: 32/32 tests passed, including all-route console checks, the procedural texture gate, interactions, stories, and frame-rate gates.
- `pnpm i18n:check` — 0 issues in isolated and integrated workspaces.
- `pnpm exec tsc --noEmit` — exit 0 in isolated and integrated workspaces.
- Production build — exit 0 in both full E2E runs; `dist/` emitted.
- Browser texture gate proves all ten sets generate in ≤200 ms, cache at 10 sets/31 texture objects, and stay at ≤40 renderer textures per context.
- Unit coverage proves deterministic shared CanvasTexture triplets, one-time disposal, corrected PBR palette ownership, flat compare isolation, transparent silk, alpha-tested openwork, InstancedMesh texture sharing, native UV preservation, and box-projected custom geometry.

Evidence:
- `output/playwright/f0-t3-typecase.png`
- `output/playwright/f0-t3-seismoscope.png`
- `output/playwright/f0-t3-gimbal.png`
- Root review at 1600×900 confirmed distinct wood/bronze/silk surfaces and a visible pierced gimbal shell.
- Independent read-only skeptic verdict: GREEN after the double-tint/PBR-scalar and eager-warm performance findings were fixed.

Concerns:
- The private mixed-source merge branch lacks a direct unit fixture; the projection helper/custom-builder and composite gear paths are covered separately.
- Gimbal framing remains too small and the current shell remains one cutaway hemisphere; F0-T4 and F1-10 own those blocking visual remediations.
- Vite reports a non-blocking three-vendor chunk-size warning.
- Protected Phase 4 work remains unstaged.

## F0-T4 — PASS

Files:
- `src/ui/viewer/visualRecovery.ts` (camera-profile schema and ten authored home poses only)
- `src/ui/viewer/MachineViewer.tsx` (manual camera fitting, intro choreography, control lock, spotlight handoff, frame-fill diagnostics, and demo performance preservation only)
- `e2e/smoke.spec.ts`
- `e2e/shoot.spec.ts`

Verification:
- Unit tests — isolated staged snapshot: 24 files, 197/197 tests passed; integrated protected workspace: 24 files, 208/208 tests passed.
- Strict validation — isolated and integrated reports list all ten machines with Fail=0.
- Full E2E — isolated and integrated runs each passed 35 tests with the future aid-state capture explicitly skipped; all ten routes, console checks, frame-fill gates, camera transitions, and performance checks passed.
- i18n check — 0 issues in isolated and integrated workspaces.
- TypeScript project build — exit 0 in isolated and integrated workspaces.
- Production build — exit 0 in isolated and integrated E2E runs; `dist/` emitted.
- Controlled demo comparison measured the detached F0-T3 baseline at 60.8 FPS and the inherited gimbal camera at 49.7 FPS; a demo-only bounds-derived camera with no intro restored the gate without changing the ten museum routes.

Evidence:
- `output/playwright/f0-t4/{astroclock,bellows,chainpump,chariot,gimbal,loom,odometer,seismoscope,typecase,wooden-ox}-plain.png`
- `output/playwright/f0-t4/seismoscope-hover.png`
- Review confirmed all ten machines complete, centered, and unclipped; the gimbal evidence includes its full suspension chain, stand, and base.
- Independent read-only skeptic verdict: GREEN after the manual-switch fit-key, automatic scheme-switch, spotlight-handoff, focus-volume, and demo-performance findings were fixed.

Concerns:
- `aid` capture deliberately requires the future declarative `window.__mechAid` hook owned by F0-T11; the runner fails honestly until that hook exists.
- The unusually tall gimbal suspension and stand make its mechanism smaller than the other machines, but the complete machine is centered, unclipped, and within the whole-machine frame-fill gate; F1-T10 owns semantic model remediation.
- Vite reports a non-blocking chunk-size warning.
- Protected Phase 4 work remains unstaged.

Next: F0-T5 material and texture recovery.

## Resume audit — F0 ordering recovery

Files:
- No application file changed by this audit.

Verification:
- Read `MECHANICA_FIDELITY_PLAN_EN.md` in full through line 1482, including the worker template, delivery standard, wave runbook, ten machine orders, UI wave, Visual Gate 2.0, defaults, and Definition of Done.
- `git log --oneline` confirms committed F0 tasks T1-T6, T12, and T11 on top of wave-0 start `5825cb3db1d4a68c6ab727b811293904f05bb57e`.
- `git tag --list 'fidelity-*'` returns no tags; `fidelity-w0` is correctly absent.
- Source and E2E searches confirm F0-T7 through F0-T10 are not implemented: permanent `.drive-buttons` remain, assembly still enters reassembly with `setExplode(1)`, part selection lacks the specified shared click-vs-drag path, and compare retains the Astroclock half-resolution mode.

Evidence:
- Existing committed baselines and F0-T1/F0-T6 captures remain under `artifacts/visual-gate-2/`.
- The later provisional recovery screenshots under `output/playwright/` are not accepted as substitutes for task evidence or Visual Gate 2.0.

Concerns:
- F0-T12 and F0-T11 landed before the still-open T7-T10 tasks. Published history will not be rewritten; the deviation is recorded here and wave 0 remains untagged until T7-T10 close in their required order and the full exit gate passes.
- Protected uncommitted work still spans machine, validation, UI, report, audit, extraction, and prior-ledger paths. Task closure must stage only owned task hunks and preserve every unrelated edit.

Next:
- Resume serial F0 execution at F0-T7, then close T8-T10, backfill missing task ledger evidence for the already committed T5/T6/T11/T12 work, run the wave deletion audit, and tag `fidelity-w0` only after every exit criterion is green.

## F0-T7 — PASS

Files:
- `src/ui/viewer/DriveHandle.tsx`
- `src/ui/viewer/DriveGizmo.tsx`
- `src/ui/viewer/MachineViewer.tsx` (drive-part union, hover/selection plumbing, coach, keyboard control, and measurement exclusions only)
- `src/ui/store.ts`
- `e2e/smoke.spec.ts`
- `e2e/shoot.spec.ts`

Verification:
- `pnpm test` — 29 files, 245/245 tests passed.
- `pnpm validate` — exit 0; all ten summary rows have Fail=0 and Warn=0.
- `pnpm e2e` — 43 passed, one requested-only screenshot runner skipped, zero failed in 7.1 minutes.
- `pnpm i18n:check` — 0 issues.
- `pnpm build` — exit 0; TypeScript and the production Vite build passed.
- Five consecutive focused compare-pointer runs passed after waiting for both compare viewports to commit; the final full suite also passed the real-pointer path.
- The ring, arrow, and invisible touch collider are tagged as affordance geometry and excluded from camera, floor, spotlight, triangle, and part-mesh measurements; the ten-machine camera-framing gate passed after this correction.
- No authoritative machine data, dimension, ratio, or provenance file changed.

Evidence:
- `artifacts/visual-gate-2/_baseline-w0/before-seismoscope.png`
- `artifacts/visual-gate-2/F0-T7/after-seismoscope.png`
- `artifacts/visual-gate-2/F0-T7/after-hover-seismoscope.png`
- Root [EYE] sign-off: task-level Visual Gate item 4 is green; the default has no permanent +/- clusters or ring, and hover adds a transparent model-anchored ring without materially obscuring the mechanism.
- Fresh independent read-only skeptic `/root/f0_t7_visual_skeptic` re-reviewed the final recaptures and returned `T7 CLAIM SURVIVES`.

Concerns:
- Static evidence cannot prove the coach's one-time lifecycle; the passing browser test proves dismissal, persisted localStorage state, and absence after reload.
- The skeptic separately failed the current seismoscope on Visual Gate items 1 and 2: its historical silhouette is not yet recognizable and the vessel reads as mottled grey-green plastic/foam rather than aged bronze. These remain blocking F1/F3 machine-fidelity work and are not treated as ornamental polish.
- Vite reports the existing non-blocking three-vendor chunk-size warning.
- Protected Phase 4/F1 work and generated validation outputs remain parked in named stashes pending post-commit restoration.

Next: F0-T8 assembly rework.

## F0-T8 — PASS

Files:
- `src/ui/viewer/MachineViewer.tsx`
- `src/ui/viewer/assembly.ts`
- `src/sim/types.ts`
- `tests/ui/assembly.test.ts`
- `e2e/smoke.spec.ts`
- `e2e/shoot.spec.ts`

Verification:
- `pnpm test` — 29 files, 249/249 tests passed.
- `pnpm validate` — exit 0; all ten strict machine reports regenerated without failure.
- `pnpm e2e` — final full run: 45 passed, the requested-only screenshot runner skipped, zero failed in 8.7 minutes.
- `pnpm i18n:check` — 0 issues.
- `pnpm build` — exit 0; TypeScript and the production Vite build passed.
- Focused browser acceptance passed 3/3 for runtime-scaled duration, localized current-part naming, grounded reassembly, scrub/explode reset, 600 ms completion settling, and spotlight camera handoff.
- Runtime geometry assertions prove every gimbal part reaches its recorded staging slot and shares one ground plane.
- No authoritative machine data, dimensions, transmission ratios, or provenance changed.

Evidence:
- `artifacts/visual-gate-2/_baseline-w0/before-assembly-mid-astroclock.png`
- `artifacts/visual-gate-2/F0-T8/after-assembly-mid-astroclock.png`
- `artifacts/visual-gate-2/F0-T8/after-reassemble-gimbal.png`
- Root review confirmed a visible non-binary astroclock arrival path and a complete, centered, unclipped gimbal staging layout with compact controls and no unrelated aids or coach.
- Fresh independent read-only skeptic `/root/f0_t8_visual_skeptic_green` returned `SURVIVES`, then re-reviewed the final taller slider panel and again returned `SURVIVES` with every staged part visible.

Repairs during verification:
- Replaced binary part appearance with per-part eased flight, scale, and fade derived from runtime order.
- Corrected nested-parent transforms so stored staging slots are exact world positions and drag/seat distances use world space.
- Replaced fake minimum dimensions with geometry-aware radii and ground offsets; added a shared ground grid.
- Delayed staged and completed camera fits until transforms settle, reserved a control-safe frame, and restored the required assembly/explode sliders.
- Hid unrelated aids and scenery during assembly, added staged-only contrast, and corrected spotlight auto-switch fit keys after the assembly-aware camera-key change.
- Corrected an E2E assertion that injected F1-owned caption values at runtime; F0 acceptance verifies the authored Chinese part name, while optional caption values remain owned by F1 as planned.

Concerns:
- The astroclock's large black diagonal occluder and both machines' broader semantic abstraction remain blocking F1/F3 visual-fidelity findings; the skeptic confirmed they do not make the F0-T8 interaction unusable.
- Vite reports the existing non-blocking three-vendor chunk-size warning.
- Validator-generated timestamp-only report changes are parked in a named stash; protected Phase 4/F1 work remains isolated for post-commit restoration.

Next: F0-T9 part-selection reliability.
