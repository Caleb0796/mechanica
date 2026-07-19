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

Next: F0-T2 cached shared material system and transient-state material stabilization.
