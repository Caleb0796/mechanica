# Temporary Translation Feature — Changes and Test Results

## Result

**84 distinct automated test cases passed.** Two browser assertions needed correction and were rerun successfully, giving **86 test-case executions**. The total remains below 100.

Three additional completed verification gates passed: the normal production build, the existing bilingual catalog audit, and a local development API routing check.

The tested original workflows still work. The translation controls, cancellation, fallback, and validation integration work with deterministic simulated provider responses. **Live provider compatibility and real linguistic accuracy have not been verified:** no provider API key was configured, and no paid provider requests were made.

## Required behavior implemented

- The collapsed language selector starts empty. Selecting an option alone does not send a translation request.
- The adjacent **translate** button applies the selected target. Only that target is generated.
- Applying a different target clears the previous translation and cancels its pending work.
- Applying the current target again shows temporary **Already translated** feedback after translation has finished and sends no duplicate request.
- Selecting empty leaves the displayed translation in place until **translate** is pressed. Pressing it then clears translation.
- Either original **中文** or **EN** button immediately overrides translation, resets the selector, and cancels pending work, including a click on the already active source language.
- Translation results and source mappings remain in memory. Reloading clears them. Translation requests do not create language catalogs or translation files.
- Every generated candidate receives two subsequent reviews: one focused on English evidence and one focused on Chinese evidence. These are separate calls to the configured model, rather than necessarily different models.
- Fixed UI text also receives deterministic checks for protected numbers, interpolation placeholders and citation markers.
- Uncertain or unavailable translation displays the exact required label:

> Unknown about the correct translation, keeping the English and the Chinese version

The fallback includes the available English and Chinese originals. If an original is absent, it explicitly says it is unavailable; the program does not invent a replacement source.

The existing cover contains English-only prose. Its prose therefore uses the uncertainty fallback when translation is active. Its bilingual document title and description can still be translated and validated.

## Files changed for the feature

Paths below are relative to this project.

| File or related group | Change |
| --- | --- |
| `src/localization/translation.ts` — new | Shared translation contract, supported target list, generation, post-generation source reviews, protected-content checks and uncertainty formatting. |
| `src/localization/session.ts` — new | Memory-only target selection, batching, result reuse within the active session, progress feedback, cancellation and stale-response rejection. |
| `src/ui/i18n/requestedTranslation.ts` — new | React translation wrapper over the existing catalogs, source-pair lookup, interpolation and render-time localization helpers. |
| `src/ui/i18n/TranslationControls.ts` — new | Empty language selector, explicit translate action and temporary status feedback. |
| `src/ui/App.tsx` | Shared controls on the cover and museum pages, source-language priority, document language, writing direction, title and metadata. |
| `src/ui/routes.tsx`, `src/ui/HomeCarouselHero.tsx`, `src/ui/PosterFallback.tsx` | Apply the translation wrapper to navigation, home content and fallback labels. |
| `src/ui/CoverPage.tsx` | Temporary localization of cover prose while retaining the existing entry action and original inactive layout. |
| `src/ui/panels/SchemeSwitcher.tsx`, `src/ui/panels/PartInspector.tsx`, `src/ui/panels/partDimLabels.ts` | Translate bilingual reconstruction names, inspection content and dimension labels. |
| `src/ui/panels/GalleryPanel.tsx` | Translate display captions and available bilingual labels while retaining original metadata for gallery classification and attribution. |
| `src/ui/compare/ComparisonTable.tsx`, `src/ui/compare/CompareView.tsx` | Translate comparison labels and display captions. |
| `src/ui/story/ScrollStory.tsx` | Translate story text through the active temporary session. |
| `src/ui/viewer/AidLayer.tsx`, `src/ui/viewer/ExplodedControl.tsx`, `src/ui/viewer/MachineViewer.tsx` | Translate viewer labels, bilingual explanations, assembly hints and captions; clear temporary captions when the active target changes. |
| `src/ui/panels/DocentChat.tsx` | Send the requested target separately from the original source language, use the backend for translated answers and clear stale answers when language changes. |
| `api/translate.ts` — new | Server-only provider adapter, input limits, approximate in-memory usage limits, bounded requests, disabled response storage and validation before accepted output. |
| `api/docent.ts` | Generate only the requested answer language, buffer translated output until source reviews finish and substitute bilingual evidence when uncertain. Preserve original source-language streaming. |
| `vite.config.ts` | Local development API routes and server-only translation/docent environment settings. |
| `src/ui/styles.css` | Control layout, wrapping for longer fallback text and right-to-left text alignment. |
| `docs/DEPLOY.md` | Configuration, temporary-state behavior and deployment limitations. |
| `scripts/check-requested-translation.mjs` — new | Fourteen dependency-free translation contract checks. |
| `tests/ui/requestedTranslationApi.test.ts` — new | Eleven focused translation and translated-docent API tests. |
| `e2e/requestedTranslation.spec.ts` — new | Sixteen translation browser tests. |
| `e2e/translation.config.ts` — new | Focused Chrome configuration selecting the sixteen translation cases and nine existing smoke cases by default. |
| `Feature_Translation.md` — new | This change and test record. |

Superseded feature code remains commented out. Added and changed code uses separate explanation and reasoning comments.

### Protected files

Neither source catalog was changed. SHA-256 checks match the original baseline:

| File | SHA-256 |
| --- | --- |
| `src/ui/i18n/en.json` | `0b9c2c5cde78dbf14864b8601085af2d13c12ce24cff2464e106a949a6ccd4ac` |
| `src/ui/i18n/zh.json` | `657e00fa8aedd3782365a3a3cd5b9913607141dfdc34fa612ba683c49edf06da` |

The original i18n initialization, catalog-audit implementation, source data, simulation and geometry definitions were not edited. No dependency declarations or lockfile changes were needed.

Dependency installation and builds create ordinary development/build artifacts. Browser tests create their normal ignored test artifacts. These are separate from runtime translation, which creates no translation files.

## Test coverage and results

Tests ran on Windows using Node, Vitest and installed Google Chrome through Playwright. Browser translation responses and model responses were simulated; the application, session logic and API handlers themselves were exercised.

| Group | Distinct cases | Final result |
| --- | ---: | --- |
| Dependency-free translation contract checks | 14 | 14 passed |
| New translation and translated-docent API checks | 11 | 11 passed |
| New translation browser checks | 16 | 16 passed |
| Existing focused unit/regression checks | 34 | 34 passed |
| Existing focused browser smoke checks | 9 | 9 passed |
| **Total** | **84** | **84 passed** |

### Translation contract checks — 14 passed

1. Only the requested target is generated; English and Chinese review calls occur afterward.
2. Uncertain or conflicting review outcomes retain both originals.
3. Changed numbers, placeholders or citation markers cannot pass the protected-content check.
4. Missing source originals and unsupported targets do not trigger generation of another language.
5. Selection begins empty and selecting a language alone sends no request.
6. Explicit action, duplicate feedback, empty reset and cancellation behave correctly.
7. Both immutable catalogs retain their original bytes.
8. Applying a replacement target cancels the old target and requests the replacement only.
9. Provider failure retains original text without exposing unchecked output.
10. Invalid API input and English/Chinese temporary targets are rejected.
11. The API generates and performs both reviews with provider response storage disabled.
12. Original language buttons reset translation before applying Chinese or English.
13. Single-source content resolves to uncertainty without unnecessary generation or endless loading.
14. Captured text callbacks use the current session, and uncertain interpolation retains original names.

### New API checks — 11 passed

1. Invalid method, malformed body, oversized body and duplicate identifiers are rejected.
2. Missing provider configuration returns 503 without a provider call.
3. Incomplete generation returns uncertainty.
4. One disagreeing source review prevents candidate acceptance.
5. A stalled provider is canceled at the server deadline and resolves to uncertainty, checked with a controlled clock.
6. Translated docent output stays withheld until both reviews complete; generation uses only the requested target.
7. A failed docent review displays existing English and Chinese evidence.
8. An unknown citation cannot expose generated target text.
9. An uncited paragraph falls back to the bilingual principle evidence.
10. A truncated target stream cannot expose partial generated content.
11. English, Chinese and unsupported temporary docent targets are rejected.

### Translation browser checks — 16 passed

1. Initially empty selector and no request on selection alone.
2. Explicit translation into only the selected target, with 中文/EN still available.
3. Duplicate action shows temporary feedback and sends no new requests.
4. Replacement target applies only after the action and removes the previous target.
5. Empty selection clears only after the action.
6. EN overrides an active target, including an already active English source.
7. 中文 overrides an active target.
8. Source override cancels delayed work and prevents stale output.
9. A delayed old target cannot overwrite its replacement.
10. Uncertainty shows the exact warning and both source versions.
11. Provider unavailability uses fallback and leaves navigation usable.
12. Route navigation translates newly rendered exhibit content in the active target.
13. Refresh clears translation and does not request it automatically; target output is absent from browser storage.
14. Right-to-left direction resets correctly, and controls remain reachable at a 390-pixel viewport width.
15. English-only cover prose uses honest fallback, while its original entry action remains usable.
16. The translated docent UI sends the target separately from the source language, renders the returned answer and citation, and clears the answer on source override.

### Existing regression checks — 34 passed

| Existing suite | Cases | Coverage |
| --- | ---: | --- |
| `tests/ui/i18n.test.ts` | 5 | Catalog structure, browser locale, original language switching and persisted source language. |
| `tests/ui/lazyRouteRecovery.test.ts` | 2 | Dynamic-import retry and error recovery. |
| `tests/ui/compare.test.ts` | 4 | Reconstruction differences, linked drives, colors and quake input. |
| `tests/ui/story.test.ts` | 4 | Authored story validity, motion transitions and reconstruction crossfades. |
| `tests/ui/docent.test.ts` | 16 | Original docent replies, citations, input validation, availability, rate/budget limits and streaming behavior. |
| `tests/ui/partDimLabels.test.ts` | 3 | Known dimension names, unknown-label formatting and readable joint limits. |

### Existing browser smoke checks — 9 passed

1. Original four-machine homepage navigation.
2. Removed exhibit routes still fail correctly.
3. All four machine routes render without browser errors and retain their evidence registers.
4. Demo exposes the original external-gear ratio.
5. Linked comparison controls drive both reconstruction graphs.
6. Gallery layers, attribution, lightbox and offline fallback.
7. Original mock docent streams a grounded answer with a citation.
8. English interface has no unexpected Chinese leakage across the existing three-machine check.
9. Odometer assembly rejects dependency violations and restores correctly.

The original browser test files were not edited.

## Additional verification

| Check | Result |
| --- | --- |
| Normal production build: TypeScript and Vite | Passed after the integration corrections below; final build has E2E hooks disabled. |
| E2E build using the existing `VITE_E2E=1` hooks | Passed; used for existing machine-state and mock-docent smoke checks. |
| Existing `pnpm i18n:check` | Passed, zero catalog issues. |
| Local Vite development API routing without credentials | Passed: translation returned 503 `translation_not_configured`; docent probe returned 503 disabled. |
| Catalog byte-integrity verification | Passed against both baseline hashes. |
| Full `pnpm validate` geometry sampling | Started, then stopped because it was broader and slower than the requested light regression scope. No completed result is claimed. Existing validation report files retained their original modification times. |

The production build reports a large Three.js vendor chunk warning. It does not fail the build and is outside the translation change.

## Corrections made during testing

- Fixed an invalid optional-call expression in the required assembly-part hint. It now resolves the found part's bilingual name before localization, retaining the original identifier fallback.
- Added the server environment declaration and request-interface adaptation needed for the Vite API middleware to typecheck.
- Included the existing docent rate-limit environment settings in local development configuration.
- Corrected the cover browser assertion: its bilingual document metadata may legitimately request translation even though its English-only prose cannot be cross-validated.
- Corrected the docent browser assertion to distinguish the actual live answer from the existing thinking indicator.

The first build failed on the integration errors and passed after those corrections. Two browser cases initially failed because of their assertions, then passed after correcting those assertions. No automated test case remains failing.

## Reproducing the focused suite

The commands below select 84 distinct cases in total. The browser configuration uses installed Chrome. Dependencies must be installed first with `pnpm install --frozen-lockfile`.

```powershell
node --experimental-strip-types scripts/check-requested-translation.mjs

pnpm test tests/ui/i18n.test.ts tests/ui/lazyRouteRecovery.test.ts tests/ui/compare.test.ts tests/ui/story.test.ts tests/ui/docent.test.ts tests/ui/partDimLabels.test.ts tests/ui/requestedTranslationApi.test.ts

$env:VITE_E2E = "1"
pnpm build
pnpm exec playwright test --config e2e/translation.config.ts

$env:VITE_E2E = ""
pnpm build
pnpm i18n:check
```

## Limits of these results

- Real provider access, actual target-language fluency, terminology accuracy, provider language coverage, model availability and live latency remain untested.
- Deployment hosting and production credentials were not exercised. The API routes require a configured server-side provider and compatible hosting.
- Separate model reviews reduce unchecked-output risk but cannot guarantee linguistic correctness. Uncertainty must remain an available outcome.
- In-memory usage limits are approximate within each server process; they are not a shared quota across multiple production instances.
- Browser checks used Chrome, with a focused mobile viewport check. Other browsers and exhaustive accessibility/performance testing were outside this run.
- Missing bilingual source material intentionally produces fallback. The source catalogs and historical evidence were not expanded to avoid that outcome.
- The full geometry sampling validator did not complete. Targeted original machine, comparison, gallery, docent, assembly and story checks passed instead.

