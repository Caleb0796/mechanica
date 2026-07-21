# Submission Notes

## Codex run

The Build Week Session ID is supplied directly in Devpost and intentionally not stored in this repository. Run identifiers are omitted from committed artifacts.

## Verification excerpts

### GATE-3 poison needles

- `pnpm poison` printed `caught by the validator ✓` four times for ratio, range, transient-collision, and dimension-provenance corruption.
- The poison suite remains a negative-control check: successful corruption detection is the expected result.

### Four-exhibit release scope

- The shipped museum contains Astroclock, Seismoscope, Odometer Carriage, and Pattern Loom.
- `MECHANICA_PLAN_EN.md` remains the historical ten-machine source plan; its §7 records are not the active release manifest.
- Existing renders are not accepted as final evidence. Final render generation remains blocked until all four exhibits pass semantic recovery, default/alternate/exploded browser review, and independent visual review.
- Verification counts and provenance totals will be recorded only after the four-exhibit test, validation, build, E2E, and browser gates complete.
- 2026-07-20 · `d227925..d914640` · astroclock QA wave T1–T16 green; evidence in `artifacts/visual-gate-2/astroclock-qa/`.
- 2026-07-20 · four-machine QA wave T17–T28 green; evidence in `artifacts/visual-gate-2/four-machine-qa/`.
