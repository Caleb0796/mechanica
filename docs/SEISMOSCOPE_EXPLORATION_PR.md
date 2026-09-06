# Seismoscope exploration PR

Integrate free exploration and the refined dragon heads with the current main branch.

- The geometry integration agent owns `src/machines/seismoscope` in this PR worktree and may update its geometry tests and dragon notes. Preserve upstream vessel mounts, toads, and ball containment fixes.
- Root owns the exploration UI, shared material support, route and translation integration, render pipeline, optimized previews, and browser and unit checks.
- Keep machine data, part transforms, scheme patches, and source provenance unchanged.
- Include only the seismoscope exploration, dragon refinements, and their supporting tests and optimized previews.
- Publish one conventional commit containing this integrated task.

Validation:

- `pnpm test --maxWorkers=2`: 332 tests passed across 37 files.
- `pnpm i18n:check`: no issues.
- `pnpm build`: passed; existing bundle-size advisory remains.
- The 15 exploration and earthquake browser checks passed. Three animation waits initially exceeded the five-second default under software WebGL; the shared wait now allows 30 seconds, and all three reruns passed. The suite allows 90 seconds per multi-step interaction.
- All four regenerated seismoscope previews passed visual review and total 135,330 bytes. Each remains below 300 KB; all public assets total less than 25 MB.
- Targeted geometry checks cover the resolved base and both schemes, including fitted mount clearance and seated/released ball contact. The full sampled machine validator was stopped after more than 11 minutes without a result; the repository also runs that broader gate in nightly/manual CI. It is not counted as a local pass.

CI follow-up:

- Root owns the targeted timeout correction in `tests/validate/validate.test.ts` and these notes.
- The differential gear collision test exceeded Vitest's default five-second limit on a shared runner. Give it and the three box-contact tests that retain the same full gear sweep the existing 20-second allowance used by neighboring sweep tests. Fixtures, assertions, and validation resolution stay unchanged.
- The full `pnpm test` run passed all 332 tests locally after the differential timeout correction.
- All four affected collision tests also passed a targeted run after the timeout updates.
