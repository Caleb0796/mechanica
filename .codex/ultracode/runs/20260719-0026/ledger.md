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

Next: F0-T4 authored camera choreography and bounds hardening.
