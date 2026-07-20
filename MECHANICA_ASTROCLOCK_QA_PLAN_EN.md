# Mechanica — Four-Machine QA Fix Plan (v3)

> **For Codex workers:** THREE workers run in parallel — see **§0** for the execution model, your lane's task
> queue, and your paste-ready kickoff brief (§0.6). Execute YOUR lane's queue in its stated order, one commit per
> task, in your lane's checkout. Steps use checkbox (`- [ ]`) syntax for tracking. Every claim in §1 was verified
> live on 2026-07-20 against `http://localhost:5173` on ALL FOUR machine routes (`/#/m/astroclock`,
> `/#/m/seismoscope`, `/#/m/odometer`, `/#/m/loom`) with GPU Chromium at 1440×900 / 1024×640 / 375×812, and root
> causes read from the exact source lines cited. You do not need to re-derive any finding — but you MUST re-run the
> verification commands inside each task before committing it. §1b maps every not-yet-implemented item from
> `MECHANICA_FIDELITY_PLAN_EN.md` (in this repo) into a task here, so THIS file is the single execution queue.
> Facts marked **✅ pinned (10:30)** were re-verified against the working tree at 10:30 PT today — when they
> conflict with an older sentence in a task, the pinned fact wins.

**Goal:** Take all four exhibits from "functionally complete but unreadable and crude" to "a museum piece a
first-time visitor can actually understand": fix the 33 verified findings in §1 (pacing, camera, captions, label
humanization, aid visibility, layout collisions, mobile, material feel, two black-on-load machines) and land the
F2/F1 backlog items from the original fidelity plan (§1b).

**Architecture:** All fixes are in the UI/render layer (`src/ui/**`, `src/core/textures.ts`) plus *additive* event
emissions in `src/machines/astroclock/build.ts`. No kinematic numbers, no validated data fields, no new npm
dependencies. The two demo players (viewer + story) get a shared, pure, unit-testable timeline builder; camera
focus becomes a first-class demo event; everything else is surgical edits at the cited lines.

**Tech stack:** React 19, React Three Fiber 9, three 0.179, drei 10, zustand 5, i18next, vitest 3, Playwright 1.55.

## Global constraints (iron rules — apply to every task)

1. **Data is law.** Never change numbers, provenance, quotes, or schema-validated fields in `src/data/**` or
   `src/machines/*/parts.json`. All humanization happens in the UI layer. `pnpm validate` must stay exit 0.
2. **No new dependencies.** three core already ships `CatmullRomCurve3`, `TubeGeometry`, `Box3`, `Sphere` — use them.
3. **Poison tests stay red-catching:** never touch `scripts/poison-test.mts` or `src/validate/**`.
4. **One commit per task**, conventional format `<type>(<scope>): <task-id> <summary>` (e.g.
   `fix(viewer): T1 staged demo timeline with readable caption dwell`). Stage ONLY files you touched.
5. **The working tree contains large uncommitted F1 work (181 files as of 10:15 PT). Step 0 (§0.2) commits it as
   the very first action. NEVER run `git reset`, `git checkout --`, `git stash`, or any command that discards
   working-tree state.** Commit only your own files per task.
6. **Gates:** `pnpm test` green after EVERY task, in every lane. Full gates (`pnpm validate`, `pnpm i18n:check`,
   `pnpm e2e`, `pnpm build`) run on `main` only: `validate` + `i18n:check` after every merge checkpoint (§0.5),
   everything including `e2e` + `build` at T16 and T28. Lanes B/C must NOT run `pnpm e2e` inside their worktrees
   (its `VITE_E2E=1 vite build` and Playwright server collide across checkouts).
7. Keyboard drive, a11y labels, and both languages (zh/en) must keep working after every task. Any new user-facing
   string goes into BOTH `src/ui/i18n/zh.json` and `src/ui/i18n/en.json` (the catalogs are symmetric, 105 keys each —
   `pnpm i18n:check` enforces this).
8. Dev servers are per-lane: lane A `pnpm dev` (port 5173, may already be running — reuse it), lane B
   `pnpm dev -- --port 5174 --strictPort`, lane C `pnpm dev -- --port 5175 --strictPort`. E2E: `pnpm e2e`
   (main only, does its own `VITE_E2E=1 vite build`). Unit: `pnpm test` or `npx vitest run <file>`.

---

## §0 Parallel sprint execution model (added 2026-07-20, dev freeze 18:00 PT today)

Three Codex workers run concurrently. This section **supersedes** the old "strictly serial, single worker" rule;
§4 keeps the dependency rationale. Lanes are cut so that no two lanes edit the same region of the same file; the
only shared surfaces are the two i18n catalogs (append-only, union-merge) and a handful of small, flagged
`MachineViewer.tsx` hunks in far-apart regions.

### §0.1 Roles

| Lane | Checkout | Branch | Port | Queue (strict order within lane) |
|---|---|---|---|---|
| **A — viewer spine** (primary session) | `MECHANICA/` | `main` | 5173 | Step 0 → T1 → T2 → T3 → T4 → T7 → T8 → T9 → T10 → merges → convergence (§0.7) → T16 → T28 |
| **B — content & look** | `../MECHANICA-laneB` | `lane-b` | 5174 | T5 → T6 → T13 → T14 → *(after CP2 merge)* T11 → T20 → T25 → T26 |
| **C — four machines & home** | `../MECHANICA-laneC` | `lane-c` | 5175 | T17 → T24 → T27 → *(wait CP1, `git merge main`)* → T18 → T19 |

File ownership (do not edit another lane's files except where a task explicitly says so):
- **A owns:** `MachineViewer.tsx`, `AidLayer.tsx`, `DriveHandle/DriveGizmo`, `store.ts`, `CompareView.tsx`,
  core `styles.css`, `machines/astroclock/build.ts`, new `demoTimeline.ts`/`DemoFocusRig.tsx`.
- **B owns:** `panels/` (PartInspector, DocentChat + `src/ui/docent/`), `core/textures.ts`,
  `machines/astroclock/scene.ts`, `story/` (ScrollStory, story.css), `viewer/assembly.ts`; phase-2: `routes.tsx`
  posters/error pages, `PosterFallback.tsx`, `GalleryPanel.tsx`, context-loss overlay. B's phase-2 tasks touch
  A-owned files in small, flagged, ADDITIVE hunks — T25: `store.ts` (setLanguage persistence) + `App.tsx` +
  `SchemeSwitcher.tsx`; T26: `MachineViewer.tsx` Canvas `onCreated` listeners + `CompareView.tsx`/`ScrollStory.tsx`
  canvases. Keep them additive; they merge at/after CP3. T11 (phase-2 FIRST slot) additionally owns the
  `MachineStoryStage` region of `MachineViewer.tsx` during phase-2 — **✅ pinned (11:20):** the story stage
  Canvas/camera/grade lives THERE (`export function MachineStoryStage` at `MachineViewer.tsx:2387`, its Canvas
  at `:2744`), NOT in ScrollStory.tsx; A's remaining T9/T10 edit other regions (`:2984+`, `:3900+`, CSS), so
  the hunks stay disjoint.
- **C owns:** `viewer/visualRecovery.ts`, `machines/{seismoscope,odometer,loom}/**`, home CSS block,
  `src/ui/scene/**` prop kinds. C's T18/T19 touch `MachineViewer.tsx` (demos panel `:4185-4215`) and
  `AidLayer.tsx:668` — small additive hunks, flagged in those tasks, merged at CP3.
- **Both catalogs `src/ui/i18n/{zh,en}.json`:** every lane appends; never delete or rename another lane's key
  before T21.

### §0.2 Step 0 — lane A only, before anything else (~10 min)

- [ ] 1. **First keep the QA byproducts out of the repo** (**✅ pinned (11:00):** `output/` holds 142 MB of
  playwright screenshots and `.playwright-cli/` another 7.8 MB, and NEITHER is ignored today — a bare
  `git add -A` would commit ~150 MB into the contest repo):
  `printf 'output/\n.playwright-cli/\n' >> .gitignore`
  Then snapshot the F1 work (`.gitignore` already excludes `node_modules/dist/test-results/playwright-report`):
  `git add -A && git commit -m "feat: F1 fidelity wave snapshot (pre-QA-fix working set)"`
  (T16/T28 visual evidence goes to `artifacts/visual-gate-2/**`, which stays tracked — do NOT ignore `artifacts/`.
  This snapshot is the ONE sanctioned `git add -A` — it deliberately sweeps every pending F1 file, including
  `AGENTS.md` and `.codex/` ledgers, as the honest pre-sprint state. Every task commit afterwards stays
  named-staging per Global-4.)
- [ ] 2. Remote (operator prerequisite: `gh` is installed but **NOT logged in** — the operator must run
  `gh auth login` interactively first). Then: `gh repo create mechanica --private --source . --push`.
  Fallback without gh: operator creates an empty private repo on github.com, then
  `git remote add origin <url> && git push -u origin main`. Push `main` after every merge checkpoint;
  lanes push their branches after every commit (backup + evidence trail). **First push per lane MUST set the
  upstream: `git push -u origin lane-b` / `git push -u origin lane-c` — a plain `git push` fails until then.**
- [ ] 3. Worktrees (share the same repo/object DB — cross-lane merges need no remote):
  ```
  git worktree add ../MECHANICA-laneB -b lane-b
  git worktree add ../MECHANICA-laneC -b lane-c
  (cd ../MECHANICA-laneB && pnpm install)
  (cd ../MECHANICA-laneC && pnpm install)
  ```
- [ ] 4. Post the lane B and lane C kickoff briefs (§0.6) so those workers start immediately.

### §0.3 Cross-lane rules

1. Merges happen **between tasks**, never mid-task. Only lane A merges into `main`.
2. i18n merge conflicts: resolve as the **union of both sides' keys** in BOTH catalogs, then `pnpm i18n:check`.
3. `MachineViewer.tsx` merge conflicts: the lanes touch far-apart regions — keep BOTH hunks, then `pnpm test`.
4. After every merge on main: `pnpm test && pnpm validate && pnpm i18n:check` before the next task starts.
5. If a cited line number has drifted, re-locate with the task's structural anchors (function names, testids,
   store fields) — those are the contract. If a task instruction contradicts what you read in the code, the
   **✅ pinned (10:30)** facts win; if there is no pinned fact, STOP and post the discrepancy instead of guessing.

### §0.4 Timeline (assumes lanes start ≈11:00; shift proportionally if later)

| Time | Event |
|---|---|
| 11:00 | Step 0 done; all three lanes running |
| **CP1 ≈12:45** | A has landed T1+T2 on main (video spine). C runs `git merge main` in its worktree, starts T18 |
| **CP2 ≈13:45** | B's four tasks done → A merges `lane-b` into main → B merges main back (now carrying A's T7), starts phase-2 (T11→T20→T25→T26) |
| **CP3 ≈16:00** | C done (T19) → A merges `lane-c`; B's phase-2 merged as ready. Triage decision (§0.7) |
| 16:45 | **Feature freeze.** Finish the commit in flight, final merges, then convergence queue only |
| ≈17:00 | A runs T16 → T28: both e2e suites + FULL gate (`test/validate/poison/i18n:check/e2e/build`) + evidence |
| 18:00 | Hard stop: main green, pushed, `docs/SUBMISSION_NOTES.md` updated with any `NEXT:` deferrals |

### §0.5 Merge choreography (lane A executes)

```
# CP2 example — on main, between tasks:
git merge lane-b            # union-merge i18n; keep both MachineViewer hunks
pnpm test && pnpm validate && pnpm i18n:check
git push
```
Lane C sync (inside `../MECHANICA-laneC`, after CP1): `git merge main` (worktrees share refs — this just works).

### §0.6 Kickoff briefs (operator: paste one per Codex worker)

**Lane A (run in the PRIMARY resumable session — the `/feedback` Session ID thread):**
> You are Lane A (viewer spine) for the Mechanica QA sprint. Read `MECHANICA_ASTROCLOCK_QA_PLAN_EN.md` §0 and
> the Global constraints, then: execute §0.2 Step 0 verbatim; then tasks T1→T2→T3→T4→T7→T8→T9→T10 exactly as
> written in §3, one commit per task, `pnpm test` after each, dev server port 5173. Perform the merge checkpoints
> in §0.4/§0.5 between tasks. After CP3 run the convergence queue in §0.7 order until 16:45, then T16→T28 (full
> gate + evidence). Hard stop 18:00 PT: main green and pushed. Facts marked "✅ pinned" override
> anything you infer differently; on any other contradiction, stop and report instead of improvising.

**Lane B:**
> You are Lane B (content & look) for the Mechanica QA sprint. Work ONLY in
> `/Users/calebwei/Desktop/openai builder week/MECHANICA-laneB` on branch `lane-b` (dev port 5174). Read
> `MECHANICA_ASTROCLOCK_QA_PLAN_EN.md` §0 + Global constraints, then execute T5→T6→T13→T14 exactly as
> written in §3, one commit per task, `pnpm test` after each, `git push` after each commit (FIRST push:
> `git push -u origin lane-b`). Never run `pnpm e2e` here. Touch only files §0.1 assigns to lane B. After lane A
> announces CP2, run `git merge main`, then execute T11→T20→T25→T26 the same way. Facts marked "✅ pinned"
> override anything you infer differently.

**Lane C:**
> You are Lane C (four machines & home) for the Mechanica QA sprint. Work ONLY in
> `/Users/calebwei/Desktop/openai builder week/MECHANICA-laneC` on branch `lane-c` (dev port 5175). Read
> `MECHANICA_ASTROCLOCK_QA_PLAN_EN.md` §0 + Global constraints, then execute T17→T24→T27 exactly as written in
> §3, one commit per task, `pnpm test` after each, `git push` after each commit (FIRST push:
> `git push -u origin lane-c`). Never run `pnpm e2e` here. Then WAIT for lane A's CP1 announcement, run
> `git merge main`, and execute T18→T19. Facts marked "✅ pinned" override anything you infer differently.

### §0.7 Convergence queue and triage ladder

Convergence order (lane A on main, post-CP3): **T22 → T12 → T15 → T21 → T23**, then always **T16 → T28**.
If the 16:45 checkpoint arrives first, CUT from the tail in this order (first cut → last cut):
**T23, T21, T15 (also skip T16's 375×812 case), T25, T26, T12, T11, T22.**
Never cut: T1–T3, T17, T16/T28 gates. Lane tasks (including B phase-2's T11/T20/T25/T26) not merged into main by
the 16:45 freeze are auto-cut the same way — finish the commit in flight, merge what passes, defer the rest.
Every cut task gets a dated `NEXT:` line in `docs/SUBMISSION_NOTES.md` (§5 DoD already permits deferral notes
for M/L findings).

### §0.8 Contest-compliance guardrails (non-negotiable)

1. Every implementation decision-to-code step, every commit, and every push is performed by a **Codex worker in a
   Codex session**. This plan supplies verified findings and specs (permitted third-party tooling + operator
   design decisions); Codex does the building.
2. Lane A runs in the **primary resumable session** — CLI session UUID `019f7356-3808-7a10-a445-faf293232674`
   (the `/root` orchestration thread started 2026-07-17 20:47; recorded in `../.context/codex-primary-session-id`).
   **Warning:** `../.context/codex-session-id` is a DIFFERENT file owned by the gstack `/codex` consult skill and
   gets overwritten by it — never use it as the contest session pointer. Lanes B/C are additional Codex
   sessions/cloud tasks — save their links for the README.
3. The README's "How Codex accelerated this" section must describe this division of labor **truthfully** —
   three-lane parallel Codex orchestration with worktrees is itself showcase material. Never attribute
   non-Codex work to Codex.
4. The repo stays private during the sprint; it must be public (or judge-accessible) at submission time.

---

## §1 Verified findings register (all live-reproduced, with root cause anchors)

Severity: **B** = blocker (defeats the exhibit's purpose), **H** = high, **M** = medium, **L** = low.

| ID | Sev | Symptom (verified live) | Root cause (file:line) | Task |
|----|-----|--------------------------|------------------------|------|
| F-01 | B | Every mechanism demo — "See one escapement beat", "Caption one escapement cycle", Ingenuity "Play spotlight" (self-described *slow motion*) — plays its **16–17 caption stages in 2.8 s total** (measured: stage dwell 80–300 ms). The pedagogy exists and is good; it is unreadable at 10× speed. | Viewer player hardcodes per-event duration 45/240/320/500 ms: `MachineViewer.tsx:3694-3702`; story-mode twin player hardcodes 90/240/420 ms: `MachineViewer.tsx:2662-2666`. No caption-length dwell anywhere. | T1 |
| F-02 | B | Demos never move the camera. `emit("camera","tower-shell")` in the trigger (`build.ts:1377`) is captured as a generic event; `recordEvent` (`MachineViewer.tsx:3583-3611`) has no `"camera"` branch, and `playNext` treats it as a 45 ms no-op. The escapement beat plays wide-shot; the fork/tongue action is ~20 px tall. | Same lines + no camera rig for demo focus. | T2 |
| F-03 | H | "Five-tier reporting" demo: clicking it usually does **nothing visible and emits zero events** (verified: caption stayed stale for 12 s). It drives one step and only emits if a placard crosses zero on *that* step (`build.ts:1415-1428`). Previous demo's "The demonstration is complete" caption persists forever (caption is never cleared). | `build.ts:1415-1428`; caption lifetime: `MachineViewer.tsx:3025,3583-3585`. | T3 |
| F-04 | H | "Drag the scoop wheel" demo just silently drives one step (`build.ts:1400-1407`) — no spotlight of the wheel, no ghost-drag hint, indistinguishable from nothing. | `build.ts:1400-1407`. | T3 |
| F-05 | H | "Power path" aid chip: **no perceptible effect** (verified across screenshots). Reality: it emissive-tints ONE part at a time every 520 ms with dark-gold `#6e4e18` @ 1.1 on dark wood in a dark scene — invisible. No route line, no label, no caption. | Highlight loop: `AidLayer.tsx:496-515` (+ `dwellMs: 520` in `build.ts` powerPath aid); weak emissive: `MachineViewer.tsx:852-862`. | T7 |
| F-06 | H | "Flow path" aid chip: no perceptible effect. Particles are `size: 0.018` (1.8 cm) points viewed from ~15 m — subpixel. Also zero runtime assertion, so a silent `resolved===0` (name mismatch) would look identical. | `AidLayer.tsx:429-445` (size 0.018/0.024, opacity 0.82); path resolution `AidLayer.tsx:354-377`. | T8 |
| F-07 | H | "Principle demo" chip promises "Trace one water beat from scoop to armillary" but observably does nothing (it re-runs the same 2.8 s spotlight, F-01/F-02). | `build.ts:1535-1540` (subDemo→spotlight) + F-01/F-02. | T1+T2 (verify in T16) |
| F-08 | H | After any spotlight/demo ends, the **first orbit drag jumps violently** (verified: a 12 px drag flipped the view ~40° and cropped the tower). OrbitControls target is stale after programmatic camera work. There is also **no reset-view button anywhere** to recover. | Known register anchor `MachineViewer.tsx:172-247, 1019`; confirmed live. | T2 |
| F-09 | H | Machine reads **dead by default**: every demo forces `setPaused(true)` (`MachineViewer.tsx:3644`) and never restores; separately a 30 s idle timer auto-pauses (`VIEWER_IDLE_TIMEOUT_MS = 30_000`, `MachineViewer.tsx:2964,3121-3143`) flipping the button to "Resume" with zero explanation. Escapement beats are minutes-apart-feeling; visitors see a frozen model. | Cited lines. | T1 (restore) + T4 (idle UX) |
| F-10 | H | Part record panel prints raw internals: labels `WHEEL.RADIUS`, `GEAR.MODULE`, `CUSTOM.PARAMS.SHOULDERWIDTH` in BOTH languages (label = `` `${geometry.type}.${path}` `` at `PartInspector.tsx:59`, uppercased by CSS); value+provenance run-on `"1.716 mTextual source · xyxfy-shulun"`; two records both labeled `DIMENSIONS`/`尺寸记录`; provenance notes are EN-only strings shown untranslated in zh UI; source badge shows raw slug `XYXFY-SHULUN` instead of 《新儀象法要》. | `PartInspector.tsx:39-63,126-146`. | T5 |
| F-11 | M | Docent mock reply is a contentless placeholder — "This development response is grounded in the current machine record. [来源:xyxfy-taiti]" — even though the machine data contains real controversy/summary prose; the raw `[来源:id]` marker (mixed-language) renders verbatim in both locales. | `DocentChat.tsx:145-148,357`. | T6 |
| F-12 | M | "Play assembly" builds the whole ~90-part tower in **~4.5 s** (measured; equals stage-count×280 ms — `ASSEMBLY_PART_DURATION_MS = 280`, `assembly.ts:7`, clamp min 2.5 s / max 20 s never reached because stages, not parts, drive the clock). Parts pop per stage; stage captions exist but flash by. | `assembly.ts:7-10,105-107` + viewer playback wiring. | T14 |
| F-13 | M | "Reassemble" (拖拽复原) teleports the user to a near-empty scene: machine gone, huge gold wireframe grid, slot markers 2–3 px, parts pile far away, **zero on-screen instructions** (verified screenshot). Users will read it as a crash. Register also flags slot-click seating bypassing the drag game (`MachineViewer.tsx:2363` area). | Reassemble mode scene/camera setup + no instruction banner. | T12 |
| F-14 | M | Scheme selection (Wang Zhenduo → John Combridge) **resets after visiting story and returning** — `const [activeSchemeId, setActiveSchemeId] = useState(schemeId)` at `MachineViewer.tsx:2984` is component state, lost on unmount. | `MachineViewer.tsx:2984`. | T9 |
| F-15 | M | Compare mode: main `.viewer-title` + ENTER STORY still overlay the compare layout; both viewports default to a high top-down camera with the towers small; the ± drive buttons are ~20 px, unlabeled, and clicking + twice produced zero visible change (no feedback); comparison table is cramped (last row clipped, tiny type); sidebar scheme selects truncate ("Wang Zhenduo · 1…"); exit is an unlabeled toggle of the same "Compare schemes" button. | `styles.css:406,198` (chrome not hidden); `CompareView.tsx:97-109` camera; table styles `styles.css:724-760`. | T9 |
| F-16 | M | ≤1024×640 layout: "Ask the docent" pill sits ON TOP of Mechanism-demo buttons / Compare button (verified at 1024 and 1280); aid chips overflow the canvas right edge ("Cutaway" clipped, "Principle demo" off-screen); the control panel covers the bottom ~35 % of the canvas and the Exploded-view slider clips off-screen at 640 px height. | Docent pill fixed positioning (`DocentChat` launcher CSS ~`styles.css:219`); chips row and `.viewer-controls` absolute overlay (`styles.css:251-290,357-430`). | T10 |
| F-17 | M | Mobile 375×812: the five aid chips render as TWO ROWS of huge pills across the model's face; control panel consumes ~40 % of the viewport; "进入叙事" button overlaps the 分解视图 slider; header brand row clips. Effectively unusable. | Media queries `styles.css:872-940` don't relocate chips/controls. | T15 |
| F-18 | M | Story mode: per-stage exposure flips bright↔dark between stages (stage 1/9 bright-wash, stage 6 dark); text cards overlap the model; authored camera poses crop the subject at non-16:10 aspects (verified crops at 1024×640); stage `highlight` lists exist (`story.ts`) but produce no visible emphasis; no reading-progress indicator. | `story.ts:13,24,39…` absolute poses; `ScrollStory.tsx` (canvas/env setup, card layout); highlight wiring same weak emissive as F-05. | T11 |
| F-19 | L | Wood looks like zebra/marble: procedural rings `0.5+0.5*sin(x*0.27 + broad*8 + y*0.025)` mixed at 0.72 amplitude — high frequency, high contrast, identical on every beam (roof reads as agate slab close-up). | `src/core/textures.ts:174-176`. | T13 |
| F-20 | L | Scene reads as near-black void despite `scene.ts` courtyard spec (gradient cyclorama `#0b0e11→#49301f`, 2 columns, dust) — top color dominates; floor radius 3.4 m barely visible; no depth cue behind tower. | `src/machines/astroclock/scene.ts:3-15`. | T13 |
| F-21 | L | In single-column layouts the mouse wheel over the canvas scrolls the PAGE (page has overflow), so camera zoom fights document scroll. | No wheel-capture guard on canvas wrapper. | T10 |
| F-22 | L | Coach hint "drag the glowing wheel" floats mid-air after any camera move (Html anchor at part position, no occlusion/refresh); shows even while pointing at nothing. | `DriveHandle.tsx:19,147,323` + `MachineViewer.tsx:1525`. | T10 |
| F-23 | L | A11y: drive gizmo exposes one button with a fused double label "Drive … in reverse / Drive … forward"; Pause / Plain background / aid chips lack `aria-pressed`. | `DriveHandle.tsx` a11y block; toggle buttons in `MachineViewer.tsx:3961-3975,4185+`. | T4 |
| F-24 | I | Observed once after a story round-trip: "Five-tier reporting" button missing from the demos list (3 of 4 rendered). Not reproduced on fresh load. Trigger list render is static (`MachineViewer.tsx:4188-4204`), so treat as needs-regression-test, not a confirmed bug. | — | T16 (regression assert) |
| F-25 | B | **Odometer loads to a PURE BLACK canvas** — the default camera sits inside the carriage body. Zooming out ×10 reveals a complete, recognizable model. First impression of the route is "broken app". | Stale authored `homePose` for odometer in `VIEWER_PROFILES` (`src/ui/viewer/visualRecovery.ts:24-…`, entries after astroclock at :45/:57/:71) — poses predate the F1 semantic-fidelity rescale; fit-fallback only runs when `!profile.homePose` (`MachineViewer.tsx:665`). | T17 |
| F-26 | B | **Loom loads to a PURE BLACK canvas** — same class as F-25 (camera inside the open frame volume); model complete and recognizable after zoom-out. Also loads already paused ("Resume"). | Same `VIEWER_PROFILES` stale `homePose` root cause. | T17 |
| F-27 | H | Seismoscope interactive quake flow dead-ends: "Arm a directional gate" arms WEST, "Inject a quake-bearing pulse" injects NORTH — mismatched defaults, so the latch never fires; caption says only "The latch remains set". No direction picker exists in the UI, so the signature payoff (dragon releases ball into toad) is unreachable by obvious interaction. The scripted spotlight DOES fire (west) — in 3.2 s (F-01 class). | Trigger defaults in `src/machines/seismoscope/build.ts:1148-1200` (quake / quake:arm run args); no direction UI in the demos panel (`MachineViewer.tsx:4185-4207`); playback speed F-01. | T18 |
| F-28 | M | After the seismoscope spotlight, the model stays in an altered presentation (lid lifted / vessel opened, fired dragon glowing red, washed highlight state) with no on-screen path back except discovering "Reset all eight directions"; the spotlight also silently switches the scheme to fengrui (special case at `MachineViewer.tsx:3626-3638`) with no notice. | Cited lines. | T18 |
| F-29 | M | Odometer aid chips render DUPLICATE labels: "Power path" ×2 and "Principle demo" ×2 (the machine defines two powerPath aids and two subDemo aids; chip label comes only from the kind name). Users cannot tell which is which. | `AidLayer.tsx:668` (`aidNames[aid.kind][language]`); aids at `src/machines/odometer/build.ts:1348-1456`. | T19 |
| F-30 | M | Odometer distance readout stays "Distance 0.00 li" through the whole "Spotlight: decimal distance" demo — a distance demo that never shows distance. Also the unit renders ASCII "li" in the zh locale (should be 里). | Spotlight replay drives `displayState` but the trigger never emits `odometer:update` (`src/machines/odometer/build.ts:1458-1533`); unit at `MachineViewer.tsx:4211-4214`. | T19 |
| F-31 | M | WebGL context loss ⇒ permanently black canvas with zero recovery or message (reproduced live on odometer: "THREE.WebGLRenderer: Context Lost" then nothing; only a manual page reload recovers). No `webglcontextlost`/`webglcontextrestored` listeners exist anywhere in the codebase. | grep for contextlost across `src/` returns nothing; renderer created in `MachineViewer.tsx` Canvas without handlers. | T26 |
| F-32 | L | Scheme `<select>` labels truncate without affordance on all machines with long names ("China National Silk Museum reconstructi…", "Wang Zhenduo · 19…" in compare pickers). | `.compare-scheme-pickers select` and sidebar select styles (`styles.css:667+`). | T9 (CSS) + verify in T28 |
| F-33 | I | Seismoscope/odometer/loom inherit every global astroclock finding that was verified cross-machine this session: F-01 playback speed (seismoscope spotlight = 10 stages/3.2 s, loom cycle near-instant, odometer same engine), F-16 docent-pill overlap (covers demo buttons on seismoscope + odometer at 1024), control-panel overlay, chips-over-canvas. No separate fixes needed — the global tasks must simply be verified on all four routes. | Same anchors as F-01/F-16. | T28 (verify) |

**Also verified (no action needed):** part click-to-select works incl. drivable parts (F0-T9 OK); cutaway aid works;
explode slider works; orbit rotate/zoom work; prod build is fast (FCP 76 ms, all assets done at 380 ms, 522 KB
transferred, 120 fps idle @1440×900 dpr2, 53 MB heap); zh catalog quality is good — EN falls back worse (F-10).
**Aids parity confirmed in data:** all four machines declare aid arrays (astroclock/seismoscope/loom:
callouts+powerPath+flowParticles+cutaway+subDemo; odometer: cutaway+2×powerPath+callouts+2×subDemo, no water so no
flowParticles — correct). The F1-02 seismoscope data supplements (jaws, gates, pushrods, bearing-ring, feng-hanger,
plinth…) ARE in `parts.json`/`build.ts` (25+34 grep hits) and the animals read correctly. Odometer/loom captions are
already humanized ("3-tooth whirlwind wheel", "Twelve-treadle bank") — the old F2 claim that only astroclock and
seismoscope had caption maps is outdated.

### §1b Original-fidelity-plan backlog → task map

Status of every F1/F2/F3 item from `MECHANICA_FIDELITY_PLAN_EN.md` that is NOT yet implemented in the working tree
(verified by grep/live QA this session). "Covered by" = task in THIS plan.

| Origin | Item | Verified status | Covered by |
|---|---|---|---|
| F2-T1 | Dock/segment the viewer control bar | Not done — floating 34rem cluster still overlays the stage on every machine | T10 |
| F2-T2 | Poster-image loading and skeleton states | Not done — `public/assets/renders/<slug>/overall.jpg` posters exist but Canvas/story/compare mount black; `home.thumbnail`/`app.retry` are dead keys | **T20 (new)** |
| F2-T3 | Humanize event chips, hints, readouts | Partially done (captions humanized on all four) — remaining: PartInspector labels (T5), docent citation chips (T6), assembly hints raw ids (T12), odometer 里 unit (T19), DriveHandle aria language (T4) | T4/T5/T6/T12/T19 |
| F2-T4 | Compare layout: own header, no collisions, real table | Not done — verified collisions live | T9 |
| F2-T5 | Consolidate copy into i18n catalogs + dead/used-key guard | Not done — docent.*/compare.*/assembly.*/app.retry/home.* dead keys, inline COPY objects with drift (`DocentChat.tsx:68-92`, `GalleryPanel.tsx:30-75`) | **T21 (new)** |
| F2-T6 | Sidebar IA reorder + panel rhythm | Not done — empty Part record leads; spotlight buried; reserved empty caption slot | **T22 (new)** |
| F2-T7 | Docent drawer: stage-anchored pill + dialog semantics | Pill exists; dialog semantics missing (no role=dialog/focus trap/Escape/focus restore; aria-live on whole scroll container) | T10 (pill position) + **T22 (semantics)** |
| F2-T8 | Typography: tokens, shipped CJK serif, legibility floor | Not done — no @font-face anywhere; 0.66–0.7 rem evidence text; heading-order inversion in PartInspector | **T23 (new)** |
| F2-T9 | Home flow: close the black gap, light the grid | Not done — near-black band between hero and cards; gradient confined to top 36rem | **T24 (new)** |
| F2-T10 | A11y and dead-UI sweep | Not done — error pages print raw slug w/o retry; dangling aria-controls; reduced-motion misses animation-duration; language not persisted; EN-only document title; dead data-attrs | **T25 (new)** |
| F1-01/02/04/06 | Usage-scene specs (courtyard/dusk-terrace/procession/workshop sets, props, light rigs, quake shockwave…) | Only minimal `scene.ts` stubs exist (gradient + 0–2 props); the authored scene specs in the work orders are unimplemented | T13 (astroclock warmth) + **T27 (new, all four)** |
| F0-T4 regression | Authored home poses valid for every machine | Broken for odometer + loom after F1 rescale (F-25/F-26) | **T17 (new)** |
| §6 F3 | Visual Gate 2.0 across machines + per-machine checklist | Not run for the current tree | T16 + **T28 (new)** |
| v1 Wave-6 | API-keyed docent/audit artifacts, conflict closure | Out of scope here (v1 track) — unchanged | — |

---

## §2 File map (what each task touches)

```
src/ui/viewer/demoTimeline.ts        NEW  pure timeline builder + speed policy   (T1)
tests/ui/demoTimeline.test.ts        NEW  unit tests for the above               (T1)
src/ui/viewer/MachineViewer.tsx      MOD  both demo players, camera branch, pause
                                          restore, reset-view, idle chip, aria   (T1,T2,T3,T4,T9,T10)
src/ui/viewer/DemoFocusRig.tsx       NEW  camera focus rig for demo events       (T2)
src/machines/astroclock/build.ts     MOD  additive camera/caption emits, tier fix(T2,T3)
src/ui/store.ts                      MOD  demoSpeed, schemeByMachine, idleAutoPaused flag (T1,T4,T9)
src/ui/panels/PartInspector.tsx      MOD  label humanization, run-on fix, badges (T5)
src/ui/panels/partDimLabels.ts       NEW  dictionary + prettifier                (T5)
tests/ui/partDimLabels.test.ts       NEW                                          (T5)
src/ui/panels/DocentChat.tsx         MOD  mock v2 + citation chip renderer       (T6)
tests/ui/docent.test.ts              MOD  extend                                  (T6)
src/ui/viewer/AidLayer.tsx           MOD  power-path route tube + label, particle
                                          size/blending, resolve warnings        (T7,T8)
src/ui/compare/CompareView.tsx       MOD  header/close, camera pose, ± feedback  (T9)
src/ui/styles.css                    MOD  layout docking, chips, pill, table,
                                          mobile, scrollbars                     (T9,T10,T15)
src/ui/i18n/{zh,en}.json             MOD  every new string                       (T1-T15)
src/ui/story/ScrollStory.tsx         MOD  aspect-fit, card layout, env grade,
                                          progress dots, highlight boost         (T11)
src/ui/story/story.css               MOD  card/scrim/progress styles             (T11)
src/ui/viewer/assembly.ts            MOD  per-part pacing constants              (T14)
src/core/textures.ts                 MOD  wood ring formula                      (T13)
src/machines/astroclock/scene.ts     MOD  scene depth/warmth values              (T13)
e2e/astroclock-ux.spec.ts            NEW  regression suite for all of the above  (T16)
src/ui/viewer/visualRecovery.ts      MOD  odometer/loom home poses + safe-pose guard (T17)
src/machines/seismoscope/build.ts    MOD  quake direction arg + aligned defaults + payoff emits (T18)
src/machines/odometer/build.ts       MOD  aid labels + odometer:update emits in spotlight (T19)
src/ui/routes.tsx                    MOD  poster fallbacks, error-page retry           (T20,T25)
scripts/check-i18n.mts               MOD  dead/used-key guard                          (T21)
src/ui/panels/GalleryPanel.tsx       MOD  COPY→catalog, tabpanel aria                  (T21,T25)
src/machines/*/scene.ts              MOD  scene dressing v2 per work orders            (T27)
e2e/machines-ux.spec.ts              NEW  four-machine gate suite                      (T28)
```

---

## §3 Tasks

### T1 — Staged demo timeline: make every demo readable

**Fixes:** F-01, caption-stale part of F-03, pause-restore part of F-09, F-07 (partly).

**Files:**
- Create: `src/ui/viewer/demoTimeline.ts`
- Create: `tests/ui/demoTimeline.test.ts`
- Modify: `src/ui/viewer/MachineViewer.tsx:3667-3722` (viewer player), `:2640-2695` (story player)
- Modify: `src/ui/store.ts` (add `demoSpeed`)

**Interfaces produced (used by T2, T16):**
```ts
export type TimelineEntry = {
  event: { type: string; part: string; state: Record<string, number> };
  kind: "camera" | "caption" | "motion";
  motionMs: number;   // interpolation time for state change
  dwellMs: number;    // hold AFTER motion completes (reading time)
};
export function buildDemoTimeline(
  captured: { type: string; part: string; state: Record<string, number> }[],
  captionOf: (type: string, part: string) => string,
  statesDiffer: (a: Record<string, number>, b: Record<string, number>) => boolean,
  initialState: Record<string, number>,
): TimelineEntry[];
export function demoSpeedFromEnv(): number; // 1 normally; 8 when import.meta.env.VITE_E2E === "1"
```

- [ ] **Step 1: write the failing unit test** — `tests/ui/demoTimeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDemoTimeline } from "../../src/ui/viewer/demoTimeline";

const differ = (a: Record<string, number>, b: Record<string, number>) =>
  JSON.stringify(a) !== JSON.stringify(b);

describe("buildDemoTimeline", () => {
  const s0 = { shulun: 0 };
  const s1 = { shulun: 0.17 };
  const captured = [
    { type: "camera", part: "shulun", state: s0 },
    { type: "caption:fill", part: "scoop-01", state: s0 },
    { type: "drive", part: "shulun", state: s1 },
    { type: "caption:fill", part: "scoop-01", state: s1 }, // repeat caption
  ];
  const captionOf = (type: string) =>
    type === "caption:fill" ? "Water reaches the receiving scoop" : "";

  it("camera events get motion time but no reading dwell", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[0].kind).toBe("camera");
    expect(tl[0].motionMs).toBe(900);
    expect(tl[0].dwellMs).toBe(0);
  });

  it("captioned events dwell long enough to read (>=1600ms, 85ms/char, cap 4200)", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[1].kind).toBe("caption");
    const len = "Water reaches the receiving scoop".length;
    expect(tl[1].dwellMs).toBe(Math.min(4200, Math.max(1600, 85 * len)));
  });

  it("state-changing drive events keep motion pacing", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[2].kind).toBe("motion");
    expect(tl[2].motionMs).toBe(420);
  });

  it("repeated caption text does not dwell twice", () => {
    const tl = buildDemoTimeline(captured, captionOf, differ, s0);
    expect(tl[3].dwellMs).toBe(120);
  });
});
```

- [ ] **Step 2: run it, verify it fails** — `npx vitest run tests/ui/demoTimeline.test.ts` → FAIL (module not found).

- [ ] **Step 3: implement `src/ui/viewer/demoTimeline.ts`:**

```ts
export type CapturedDemoEvent = {
  type: string;
  part: string;
  state: Record<string, number>;
};

export type TimelineEntry = {
  event: CapturedDemoEvent;
  kind: "camera" | "caption" | "motion";
  motionMs: number;
  dwellMs: number;
};

export function buildDemoTimeline(
  captured: CapturedDemoEvent[],
  captionOf: (type: string, part: string) => string,
  statesDiffer: (
    a: Record<string, number>,
    b: Record<string, number>,
  ) => boolean,
  initialState: Record<string, number>,
): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];
  let previousState = initialState;
  let previousCaption = "";
  for (const event of captured) {
    const changed = statesDiffer(previousState, event.state);
    if (event.type === "camera") {
      timeline.push({ event, kind: "camera", motionMs: 900, dwellMs: 0 });
      previousState = event.state;
      continue;
    }
    const caption = captionOf(event.type, event.part);
    const freshCaption = caption !== "" && caption !== previousCaption;
    if (caption !== "") previousCaption = caption;
    const motionMs = changed ? (event.type.includes("drive") ? 420 : 260) : 60;
    const dwellMs = freshCaption
      ? Math.min(4200, Math.max(1600, 85 * caption.length))
      : 120;
    timeline.push({
      event,
      kind: freshCaption ? "caption" : "motion",
      motionMs,
      dwellMs,
    });
    previousState = event.state;
  }
  return timeline;
}

export function demoSpeedFromEnv(): number {
  return import.meta.env.VITE_E2E === "1" ? 8 : 1;
}
```

- [ ] **Step 4: run tests, verify pass** — `npx vitest run tests/ui/demoTimeline.test.ts` → 4 passed.

- [ ] **Step 5: add `demoSpeed` to the store** — in `src/ui/store.ts` add to `UiState`:
`demoSpeed: number;` initialized `demoSpeed: demoSpeedFromEnv(),` (import from `../ui/viewer/demoTimeline` —
actual relative path `./viewer/demoTimeline`). No setter needed yet.

- [ ] **Step 6: rewire the viewer player.** In `MachineViewer.tsx` `runTrigger` (currently `:3650-3722`):
after the existing `trigger.run(graph, …)` capture block, replace the `playNext` closure with a timeline consumer.
Keep variable names; the diff is contained to the closure:

```ts
const pausedBefore = useUiStore.getState().paused;           // NEW — before setPaused(true)
// … existing capture code …
const speed = useUiStore.getState().demoSpeed || 1;
const timeline = buildDemoTimeline(
  captured,
  (type, part) => mechanismCaption(module, language, type, part),
  statesDiffer,
  initialState,
);
let index = 0;
let previousState = initialState;
const playNext = () => {
  const entry = timeline[index];
  if (!entry) {
    displayState.current = null;
    if (donePart) recordEvent("spotlight:done", donePart);
    setSpotlightActive(false);
    setDemoFocusPartId(null);                                 // NEW (T2)
    setPaused(pausedBefore);                                  // NEW — restore run state (F-09)
    spotlightFrame.current = null;
    return;
  }
  if (entry.kind === "camera") {
    setDemoFocusPartId(entry.event.part);                     // NEW (T2 consumes)
  } else {
    recordEvent(entry.event.type, entry.event.part);
    // existing spotlightPartIds bookkeeping stays unchanged here
  }
  const motion = entry.motionMs / speed;
  const dwell = entry.dwellMs / speed;
  const startedAt = performance.now();
  const animate = (now: number) => {
    const progress = Math.min(1, motion === 0 ? 1 : (now - startedAt) / motion);
    displayState.current = interpolateState(
      previousState, entry.event.state, 1 - (1 - progress) ** 3,
    );
    if (now - startedAt < motion + dwell) {
      spotlightFrame.current = requestAnimationFrame(animate);
      return;
    }
    previousState = entry.event.state;
    index += 1;
    playNext();
  };
  spotlightFrame.current = requestAnimationFrame(animate);
};
playNext();
```

Until T2 lands, add a temporary no-op `const setDemoFocusPartId = (_: string | null) => {};` above `runTrigger`
(T2 replaces it with real state). Delete the old 45/240/320/500 duration ladder.

- [ ] **Step 7: rewire the story player the same way** (`MachineViewer.tsx:2640-2695`): identical consumer, sharing
`buildDemoTimeline`; captions in story mode go through the same `mechanismCaption`. Delete the 90/240/420 ladder.

- [ ] **Step 8: clear stale captions.** In `recordEvent` (`:3583`), after `setCaption(nextCaption)` add:

```ts
if (type === "spotlight:done") {
  window.setTimeout(() => {
    setCaption((current) =>
      current === nextCaption ? "" : current,
    );
  }, 6000 / (useUiStore.getState().demoSpeed || 1));
}
```

- [ ] **Step 9: manual verify** — `pnpm dev`, open `#/m/astroclock`, click "See one escapement beat". Expected:
sequence now takes ~35–50 s, every caption readable ≥1.6 s; when it ends the machine returns to its pre-demo
run/pause state; caption clears ~6 s after completion. Run `pnpm test` → all green (192+4).

- [ ] **Step 10: commit** — `git add src/ui/viewer/demoTimeline.ts tests/ui/demoTimeline.test.ts src/ui/viewer/MachineViewer.tsx src/ui/store.ts && git commit -m "fix(viewer): T1 staged demo timeline with readable caption dwell"`

### T2 — Demo camera choreography + stale-target fix + reset view

**Fixes:** F-02, F-08.

**Files:**
- Create: `src/ui/viewer/DemoFocusRig.tsx`
- Modify: `src/ui/viewer/MachineViewer.tsx` (state + rig mount + reset-view button)
- Modify: `src/machines/astroclock/build.ts:1376-1382` (camera emits inside the spotlight trigger)
- Modify: `src/ui/i18n/zh.json`, `src/ui/i18n/en.json` (reset-view label)

**Interfaces consumed:** `setDemoFocusPartId` slot from T1. **Produced:** `data-testid="reset-view"` button;
`window.__mechDemoFocus` (dev/e2e hook) exposing `{ focusPartId: string | null }`.

- [ ] **Step 1: create `src/ui/viewer/DemoFocusRig.tsx`:**

```tsx
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, PerspectiveCamera, Sphere, Vector3 } from "three";

type ControlsLike = {
  target: Vector3;
  update: () => void;
  enabled: boolean;
} | null;

export default function DemoFocusRig({
  focusPartId,
}: {
  focusPartId: string | null;
}) {
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as ControlsLike;
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const restore = useRef<{ position: Vector3; target: Vector3 } | null>(null);

  useEffect(() => {
    if (!controls) return;
    if (focusPartId) {
      if (!restore.current) {
        restore.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
        };
      }
      const object = scene.getObjectByName(focusPartId);
      if (!object) return;
      const sphere = new Box3()
        .setFromObject(object)
        .getBoundingSphere(new Sphere());
      const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
      const distance = Math.max(1.6, (sphere.radius * 2.4) / Math.tan(fov / 2));
      const direction = camera.position
        .clone()
        .sub(controls.target)
        .normalize();
      goal.current = {
        position: sphere.center.clone().add(direction.multiplyScalar(distance)),
        target: sphere.center.clone(),
      };
    } else if (restore.current) {
      goal.current = restore.current;
      restore.current = null;
    }
  }, [camera, controls, focusPartId, scene]);

  useFrame(() => {
    if (!goal.current || !controls) return;
    camera.position.lerp(goal.current.position, 0.08);
    controls.target.lerp(goal.current.target, 0.08);
    controls.update();
    if (
      camera.position.distanceTo(goal.current.position) < 0.02 &&
      controls.target.distanceTo(goal.current.target) < 0.02
    ) {
      goal.current = null; // controls.target now synced → no stale-target jump
    }
  });

  return null;
}
```

- [ ] **Step 2: mount it.** In `MachineViewer.tsx`: `const [demoFocusPartId, setDemoFocusPartId] = useState<string | null>(null);`
(replacing T1's no-op; keep the same setter name so T1's player code now works). Render `<DemoFocusRig focusPartId={demoFocusPartId} />`
inside the main `<Canvas>` scene next to `<AidLayer …/>`. **✅ pinned (11:20 — corrects the 10:30 pin):** the
`<OrbitControls` element (`MachineViewer.tsx:2178`) ALREADY has `makeDefault` at `:2182` — do NOT add it again
(a duplicate JSX prop is a compile error). `useThree(state => state.controls)` therefore already works; no
OrbitControls change is needed. Expose the hook in the same dev-hooks effect that sets `window.__mech` (**✅ pinned:** the effect body
around `:3540-3570` also sets `__mechSelect`/`__mechExplodeSpread`/`__mechAssembly` and its cleanup `delete`s each
one — add `window.__mechDemoFocus = { get focusPartId() { return demoFocusRef.current; } };` there AND
`delete window.__mechDemoFocus;` in the same cleanup): via a ref mirror (`demoFocusRef.current = demoFocusPartId`
in the component body).

- [ ] **Step 3: richer camera script for the beat.** In `build.ts` spotlight trigger `run` (`:1376-1382`) replace with:

```ts
run: (graph, emit) => {
  emit("camera", "shulun");
  emit("highlight", "scoop-01");
  runEscapementBeat(graph, emit, true);
  emit("camera", "celestial-column");
  emit("highlight", "celestial-globe");
  emit("camera", "chime-tier-1");
  emit("camera", "tower-shell");
  emit("spotlight:done", "shulun");
},
```

(`"tower-shell"` focus ≈ whole machine — the rig frames its bounding sphere, which is the full tower; this doubles
as the end-of-demo restore shot.) `runEscapementBeat` itself is NOT modified.

- [ ] **Step 4: reset-view button.** Next to the Pause button in the control panel JSX (`:3961-3975` area) add:

```tsx
<button
  className="ghost-button"
  data-testid="reset-view"
  onClick={() => setDemoFocusPartId("tower-shell")}
  type="button"
>
  {t("viewer.resetView")}
</button>
```

Then, in the rig, when `focusPartId === "tower-shell"` completes, call `setDemoFocusPartId(null)` via an
`onSettled` callback prop (add `onSettled?: () => void` to DemoFocusRig, invoked when `goal` clears). i18n:
`"viewer.resetView": "复位视角"` / `"Reset view"`.

- [ ] **Step 5: manual verify** — beat demo now dollies to the scoop wheel, then climbs to the column, pagoda,
and pulls back wide; immediately after it ends, a 10 px drag rotates smoothly (NO jump). Click 复位视角 after
zooming somewhere weird → smooth return. `pnpm test` green.

- [ ] **Step 6: commit** — `git add src/ui/viewer/DemoFocusRig.tsx src/ui/viewer/MachineViewer.tsx src/machines/astroclock/build.ts src/ui/i18n/zh.json src/ui/i18n/en.json && git commit -m "feat(viewer): T2 demo camera focus rig, stale-target fix, reset view"`

### T3 — Five-tier & drag demos produce guaranteed visible performances

**Fixes:** F-03, F-04.

**Files:**
- Modify: `src/machines/astroclock/build.ts:1394-1428`
- Modify: `MachineViewer.tsx:2802-2830` (astroclock caption map — add 2 keys)
- Modify: `tests/machines/astroclock.test.ts` (extend)

- [ ] **Step 1: failing test** — append to `tests/machines/astroclock.test.ts`:

```ts
it("five-tier trigger always emits a visible performance", () => {
  const trigger = machine.mechanism?.triggers.find(
    (candidate) => candidate.id === "chime-placards",
  );
  expect(trigger).toBeDefined();
  const graph = new KinematicGraph(machine.spec);
  const events: string[] = [];
  trigger!.run(graph, (type: string) => events.push(type));
  expect(events.filter((type) => type === "placard").length).toBeGreaterThan(0);
  expect(events).toContain("caption:tier-report");
  expect(events.filter((type) => type === "camera").length).toBeGreaterThan(0);
});
```

**✅ pinned (10:30):** the file already imports exactly what this test needs —
`import machine from "../../src/machines/astroclock/build";` (line 4) and
`import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";` (line 5); other tests construct
`new KinematicGraph(machine.spec)` (e.g. line 92). There is no `buildAstroclock()`/`buildGraph()` helper — use the
imports above as written.

- [ ] **Step 2: run, verify FAIL** — `npx vitest run tests/machines/astroclock.test.ts`.

- [ ] **Step 3: implement.** Replace `chime-placards.run` (`build.ts:1415-1428`) with:

```ts
run: (graph, emit) => {
  emit("camera", "chime-tier-1");
  const before = graph.state();
  let raised = 0;
  for (let step = 0; step < 36 && raised === 0; step += 1) {
    graph.drive("shulun", stepRad);
    for (let tier = 1; tier <= 5; tier += 1) {
      const part = `tier-placard-${tier}`;
      if ((before[part] ?? 0) <= 1e-9 && (graph.state()[part] ?? 0) > 1e-9) {
        emit("placard", part);
        raised += 1;
      }
    }
  }
  emit("caption:tier-report", "chime-tier-1");
  emit("camera", "tower-shell");
},
```

And `drag-shulun.run` (`:1400-1407`) becomes:

```ts
run: (graph, emit, direction = 1) => {
  if (direction < 0) {
    emit("blocked", "tiansuo-r");
    return;
  }
  emit("camera", "shulun");
  emit("highlight", "shulun");
  emit("caption:drag-coach", "shulun");
  graph.drive("shulun", stepRad);
  emit("advance", "shulun");
  emit("camera", "tower-shell");
},
```

- [ ] **Step 4: caption texts.** In the astroclock caption map (`MachineViewer.tsx:2802-2830`, alongside
`"caption:reservoir"` etc.) add:

```ts
"caption:tier-report": {
  zh: "枢轮转过整点，司辰木人举牌报时",
  en: "The wheel crosses a mark — the jacks raise their placards",
},
"caption:drag-coach": {
  zh: "沿轮缘方向拖动金色圆环即可驱动枢轮",
  en: "Drag the gold ring along the rim to drive the scoop wheel",
},
```

- [ ] **Step 5: run tests → PASS; manual verify** — "Five-tier reporting" now always: camera moves to the pagoda,
wheel steps until a placard rises, caption explains, camera pulls back. `pnpm test` green.

- [ ] **Step 6: commit** — `git add src/machines/astroclock/build.ts src/ui/viewer/MachineViewer.tsx tests/machines/astroclock.test.ts && git commit -m "fix(astroclock): T3 five-tier and drag demos always perform visibly"`

### T4 — Idle-pause transparency + toggle a11y

**Fixes:** F-09 (residual), F-23.

**Files:** `src/ui/viewer/MachineViewer.tsx`, `src/ui/store.ts`, `src/ui/styles.css`, i18n catalogs, `src/ui/viewer/DriveHandle.tsx`.

- [ ] **Step 1:** store: add `idleAutoPaused: boolean` + `setIdleAutoPaused(v: boolean)` to `UiState` (default false).
In `enterViewerIdle` (`MachineViewer.tsx:3121-3127`) call `setIdleAutoPaused(true)` when it auto-pauses; in
`registerViewerInteraction` (`:3235-3243`) call `setIdleAutoPaused(false)` when it auto-resumes.

- [ ] **Step 2:** UI chip next to the Pause button (same panel row):

```tsx
{idleAutoPaused ? (
  <span className="idle-chip" data-testid="idle-chip">
    {t("viewer.idlePaused")}
  </span>
) : null}
```

i18n: `"viewer.idlePaused": "已自动暂停 · 移动鼠标继续"` / `"Auto-paused · move to resume"`. CSS `.idle-chip`
(gold border pill, 0.72rem, `margin-left: .5rem`).

- [ ] **Step 3:** `aria-pressed` on toggles: Pause button `aria-pressed={paused}`; Plain-background button
`aria-pressed={!showScene}`; each aid chip button `aria-pressed={activeIndex === index}` (chips render in
`AidLayer.tsx:640-668`).

- [ ] **Step 4:** split the fused drive a11y control. **✅ pinned (10:30):** `DriveHandle.tsx` contains NO
`aria-label` and no "reverse/forward" strings — do not hunt there. The label strings are the EXISTING i18n keys
`viewer.driveReverse` = "Drive {{part}} in reverse" (`en.json:25`) and its `viewer.driveForward` sibling; run
`grep -rn "driveReverse" src/ui` to find the single control that concatenates them, and split it into TWO sibling
buttons (one per direction) each using one existing key — the keys are already bilingual, so NO new i18n entries
are needed. If `tests/ui/driveHandle.test.ts` asserts the fused accessible name, update its expectation to the
two split names in the same commit.

- [ ] **Step 5:** verify — wait 30 s idle → chip appears + machine pauses; move mouse → chip clears + resumes.
`pnpm test` green. Commit: `git commit -m "feat(viewer): T4 idle-pause chip and toggle aria states"` (with the five files staged).

### T5 — PartInspector humanization

**Fixes:** F-10.

**Files:**
- Create: `src/ui/panels/partDimLabels.ts`, `tests/ui/partDimLabels.test.ts`
- Modify: `src/ui/panels/PartInspector.tsx:39-63` (labels), value/provenance markup (`:126-146` pattern used by both machine + part dim lists), source badge render
- Modify: `src/ui/styles.css` (`.record-list dd` layout)

- [ ] **Step 1: failing test** — `tests/ui/partDimLabels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { humanizeDimLabel } from "../../src/ui/panels/partDimLabels";

describe("humanizeDimLabel", () => {
  it("maps known paths in both languages", () => {
    expect(humanizeDimLabel("wheel", "radius", "zh")).toBe("轮半径");
    expect(humanizeDimLabel("wheel", "radius", "en")).toBe("Wheel radius");
    expect(humanizeDimLabel("gear", "module", "zh")).toBe("模数");
    expect(humanizeDimLabel("custom", "params.shoulderWidth", "en")).toBe(
      "Shoulder width",
    );
  });
  it("prettifies unknown paths instead of echoing them", () => {
    expect(humanizeDimLabel("custom", "params.hatBrimAngleDeg", "en")).toBe(
      "Hat brim angle deg",
    );
    expect(humanizeDimLabel("custom", "params.hatBrimAngleDeg", "zh")).toBe(
      "Hat brim angle deg",
    );
  });
  it("keeps joint limits readable", () => {
    expect(humanizeDimLabel("joint", "limits.0", "zh")).toBe("行程下限");
    expect(humanizeDimLabel("joint", "limits.1", "en")).toBe("Joint limit (max)");
  });
});
```

- [ ] **Step 2: run → FAIL.**

- [ ] **Step 3: implement `src/ui/panels/partDimLabels.ts`:**

```ts
type Lang = "zh" | "en";

const DIM_LABELS: Record<string, { zh: string; en: string }> = {
  "box.depth": { zh: "进深", en: "Depth" },
  "box.height": { zh: "高度", en: "Height" },
  "box.width": { zh: "宽度", en: "Width" },
  "custom.params.depth": { zh: "进深", en: "Depth" },
  "custom.params.height": { zh: "高度", en: "Height" },
  "custom.params.shoulderWidth": { zh: "肩宽", en: "Shoulder width" },
  "cylinder.height": { zh: "高度", en: "Height" },
  "cylinder.radius": { zh: "半径", en: "Radius" },
  "gear.module": { zh: "模数", en: "Gear module" },
  "gear.teeth": { zh: "齿数", en: "Tooth count" },
  "gear.thickness": { zh: "轮厚", en: "Gear thickness" },
  "joint.limits.0": { zh: "行程下限", en: "Joint limit (min)" },
  "joint.limits.1": { zh: "行程上限", en: "Joint limit (max)" },
  "lathe.height": { zh: "高度", en: "Height" },
  "lathe.radius": { zh: "半径", en: "Radius" },
  "wheel.radius": { zh: "轮半径", en: "Wheel radius" },
  "wheel.spokes": { zh: "辐条数", en: "Spoke count" },
  "wheel.width": { zh: "轮宽", en: "Wheel width" },
};

function prettify(path: string): string {
  const leaf = path.split(".").pop() ?? path;
  const spaced = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function humanizeDimLabel(
  geometryType: string,
  path: string,
  language: Lang,
): string {
  const key = path.startsWith("joint.")
    ? path
    : `${geometryType}.${path}`;
  const hit = DIM_LABELS[key];
  if (hit) return hit[language];
  return prettify(path);
}
```

(Note the test expects `humanizeDimLabel("joint", "limits.0", …)` to resolve `joint.limits.0` — the `path`
passed from `geometryDimensions` for joint entries is already `joint.limits.N`, so when `path` starts with
`joint.` the geometryType prefix is skipped. Keep that contract.)

- [ ] **Step 4: run → PASS.**

- [ ] **Step 5: use it in `PartInspector.tsx`.** At `:59` replace
`label: path.startsWith("joint.") ? path : `${part.geometry.type}.${path}`,` with
`label: humanizeDimLabel(part.geometry.type, path, language),` — thread `language` into `geometryDimensions`
(it is available in the component; change the function signature to accept it). Remove the CSS uppercase for
these labels if it garbles zh: in `styles.css` scope the existing `text-transform: uppercase` rule away from
zh by adding `.record-list dt:lang(zh) { text-transform: none; letter-spacing: 0.02em; }` (the `<dl>` already
sits under an element with `lang` set for zh quotes; otherwise add `lang={language}` to the `<dl>`).

- [ ] **Step 6: fix the run-on + duplicate labels.** In the dimension render blocks (machine-level `:126-146`
and the part-level list `:183` area), change the `<dd>` content to explicit spans:

```tsx
<dd>
  <span className="dim-value">{metric /* or the part value string */}</span>
  <span className="dim-note">
    {t(`inspector.${dimension.confidence}`)} · {sourceBookAbbrev} · {dimension.basis}
  </span>
</dd>
```

where `sourceBookAbbrev` = `module.data.sources.find((s) => s.id === dimension.sourceId)?.book ?? dimension.sourceId`
(the `book` field is the human title, e.g. 新儀象法要). For the PART-level records that currently all render the dt
"尺寸记录/DIMENSIONS", make the dt unique: `<dt>{recordLabel} · {record.ancient}</dt>` (ancient reading
disambiguates, e.g. "尺寸记录 · 一丈一尺" vs "尺寸记录 · 六百牙"). CSS:

```css
.record-list dd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; }
.record-list .dim-note { font-size: 0.72rem; opacity: 0.75; }
```

- [ ] **Step 7: source badge + note translation.** Where the part badge renders the raw id (the
`TEXTUAL SOURCE · XYXFY-BAOSHI` chip), resolve the same way: `文献 · 新儀象法要` / `Textual source · Xin Yi Xiang Fa Yao`
via `sources.find(...)?.book`. For the EN-only provenance notes shown in zh UI, add a fixed map in
`PartInspector.tsx`:

```ts
const NOTE_ZH: Record<string, string> = {
  "Geometry is an illustrative reconstruction where the classical text gives no measurement.":
    "古籍未记载此尺寸，几何为示意复原参数。",
  "Derived from the recorded 2.090 m diameter and 600 tooth slots.":
    "由记载的 2.090 m 直径与六百牙推算。",
  "Half of the recorded 3.432 m diameter.": "取记载直径 3.432 m 之半。",
  "The main reading records seventy-two spokes paired into thirty-six receiving cells.":
    "主流读法为七十二辐，两辐夹持一壶，共三十六壶。",
  "Variant reading retained alongside the main thirty-six-scoop reconstruction.":
    "异文读法，与三十六壶主方案并存展示。",
};
const localizedNote = (note: string, lang: Lang) =>
  lang === "zh" ? (NOTE_ZH[note] ?? note) : note;
```

Apply `localizedNote(...)` wherever a provenance/dimension note string is rendered. (UI-layer only — data files untouched.)

- [ ] **Step 8: verify** — select 时鼓轮 in zh: labels read 模数/齿数/轮厚, badge reads 文献 · 新儀象法要, values and
notes separated by spaces, notes in Chinese. Switch EN: "Gear module", "Textual source · Xin Yi Xiang Fa Yao".
`pnpm test && pnpm i18n:check` green. Commit `refactor(panels): T5 humanize part record labels and notes`.

### T6 — Docent mock v2 + citation chips

**Fixes:** F-11.

**Files:** `src/ui/panels/DocentChat.tsx:100-160,340-370`, `tests/ui/docent.test.ts`, i18n (nothing new needed), `src/ui/docent/docent.css` (chip style — DocentChat's own stylesheet, imported at `DocentChat.tsx:18`).

Data shapes (from `src/data/schema.ts:215-272`): `sources[] = {id, book, chapter?, quote, translation{zh,en}, url}`;
`controversies[] = {topic{zh,en}, detail{zh,en}, sourceIds[]}`.

- [ ] **Step 1: failing tests** — extend `tests/ui/docent.test.ts`:

```ts
it("mock reply answers a controversy question with its detail text", () => {
  const reply = mockDocentReply(
    'How does the collection frame the "Scoop count" controversy?',
    astroclockModule, // reuse the module/data fixture the file already imports
    "en",
  );
  expect(reply).toContain("36 scoops");           // from controversy.detail.en
  expect(reply).toMatch(/\[来源:[a-z0-9-]+\]/);   // still carries a citation token
});

it("renderDocentSegments splits citation tokens and resolves book titles", () => {
  const segments = renderDocentSegments(
    "Both readings must remain visible. [来源:xyxfy-shulun]",
    astroclockModule.data.sources,
  );
  expect(segments).toEqual([
    { kind: "text", text: "Both readings must remain visible. " },
    { kind: "cite", id: "xyxfy-shulun", book: "新儀象法要" },
  ]);
});
```

**✅ pinned (10:30):** there are TWO mock-reply functions — do not confuse them. `tests/ui/docent.test.ts`
currently imports `createMockDocentReply` from `../../src/ui/docent/mock` (line 12): that module is the
**api-layer dev mock** and stays UNTOUCHED by this task. The placeholder the UI actually renders (F-11) is the
LOCAL `mockDocentReply(sourceId: string, lang: Lang)` at `DocentChat.tsx:145-149` — that is what you replace and
export. For the new tests' machine fixture use the same default-export pattern the machine tests use:
`import astroclockModule from "../../src/machines/astroclock/build";` and import the two NEW exports from
`../../src/ui/panels/DocentChat`.

- [ ] **Step 2: run → FAIL.**

- [ ] **Step 3: implement in `DocentChat.tsx`.** Replace `mockDocentReply` (`:145-148`) with:

```ts
export function mockDocentReply(
  question: string,
  module: MachineModule,
  lang: Lang,
): string {
  const data = module.data;
  const hit = data.controversies?.find(
    (controversy) =>
      question.includes(controversy.topic[lang]) ||
      question.includes(controversy.topic.zh) ||
      question.includes(controversy.topic.en),
  );
  if (hit) {
    const cite = hit.sourceIds[0] ?? data.sources[0].id;
    return `${hit.detail[lang]} [来源:${cite}]`;
  }
  const principle = data.principle[lang];
  const cite = data.sources[0].id;
  return lang === "zh"
    ? `${principle} 想深入了解，可以点开整机证据档案查看原文与尺寸。[来源:${cite}]`
    : `${principle} For depth, open the machine evidence register for quotes and dimensions. [来源:${cite}]`;
}

export type DocentSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; id: string; book: string };

export function renderDocentSegments(
  reply: string,
  sources: { id: string; book: string }[],
): DocentSegment[] {
  const segments: DocentSegment[] = [];
  const pattern = /\[来源:([a-z0-9-]+)\]/g;
  let cursor = 0;
  for (const match of reply.matchAll(pattern)) {
    if (match.index! > cursor) {
      segments.push({ kind: "text", text: reply.slice(cursor, match.index) });
    }
    const id = match[1];
    segments.push({
      kind: "cite",
      id,
      book: sources.find((source) => source.id === id)?.book ?? id,
    });
    cursor = match.index! + match[0].length;
  }
  if (cursor < reply.length) {
    segments.push({ kind: "text", text: reply.slice(cursor) });
  }
  return segments;
}
```

Update the call site (`:357`) to pass `(question, module, lang)`, and render bubbles through the segments —
`cite` segments become `<sup className="docent-cite" title={book}>{book}</sup>`. **✅ pinned (10:30):** wire the
segment rendering INSIDE the existing `GroundedAnswer` component (`DocentChat.tsx:157+`) — it is the component
that currently prints the raw `[来源:id]` marker verbatim; routing both mock AND live-API replies through it means
real backend answers get chips too. CSS: `.docent-cite { color: var(--gold, #d5a44e); margin-left: 2px; cursor: help; }`
— put it in `src/ui/docent/docent.css` (**✅ pinned:** DocentChat imports its own stylesheet at
`DocentChat.tsx:18`), NOT in `styles.css`.

- [ ] **Step 4: run tests → PASS.** Manual: ask the Scoop-count suggested question → the answer is the actual
curated controversy text with a 新儀象法要 superscript chip. Commit `feat(docent): T6 grounded mock replies and citation chips`.

### T7 — Power path: visible energy route

**Fixes:** F-05.

**Files:** `src/ui/viewer/AidLayer.tsx` (new `PowerPathRoute` component + wire into the `powerPath` branch),
`src/ui/viewer/MachineViewer.tsx:857-862` (emissive boost), i18n (caption line).

- [ ] **Step 1: boost the highlight so the current node reads.** `MachineViewer.tsx:857-862` — change the
aid-highlight branch: emissive color `#f2b23e`, `material.emissiveIntensity = state.aidHighlighted ? 2.1 : …`
(keep spotlight at 1.4, scheme at 0.65).

- [ ] **Step 2: add a route tube.** In `AidLayer.tsx`, new component rendered when `activeAid?.kind === "powerPath"`:

```tsx
function PowerPathRoute({
  aid,
  currentPartId,
}: {
  aid: Extract<PrincipleAid, { kind: "powerPath" }>;
  currentPartId: string | null;
}) {
  const scene = useThree((state) => state.scene);
  const [curveVersion, setCurveVersion] = useState(0);
  const tube = useMemo(() => {
    const points: Vector3[] = [];
    for (const partId of aid.sequence) {
      const object = scene.getObjectByName(partId);
      if (!object) continue;
      const point = new Vector3();
      object.getWorldPosition(point);
      points.push(point);
    }
    if (points.length < 2) return null;
    const curve = new CatmullRomCurve3(points, false, "catmullrom", 0.12);
    return new TubeGeometry(curve, points.length * 8, 0.028, 6, false);
  }, [aid.sequence, scene, curveVersion]);
  const material = useRef<MeshBasicMaterial>(null);
  useFrame((state) => {
    if (material.current) {
      material.current.opacity =
        0.55 + 0.25 * Math.sin(state.clock.elapsedTime * 3);
    }
  });
  useEffect(() => {
    const id = window.setInterval(() => setCurveVersion((v) => v + 1), 1200);
    return () => window.clearInterval(id);
  }, []); // re-sample world positions while explode/scheme animate
  useEffect(() => () => tube?.dispose(), [tube]);
  if (!tube) return null;
  return (
    <mesh geometry={tube} name="mechanica-aid-power-route" renderOrder={5}>
      <meshBasicMaterial
        color="#f2b23e"
        depthTest={false}
        opacity={0.6}
        ref={material}
        transparent
      />
    </mesh>
  );
}
```

Imports from `three`: `CatmullRomCurve3, TubeGeometry, Vector3, MeshBasicMaterial`. Mount inside the existing
render (`AidLayer.tsx:590` area): `{activeAid?.kind === "powerPath" ? <PowerPathRoute aid={activeAid} currentPartId={highlightedPartIds.current[0] ?? null} /> : null}`.

- [ ] **Step 3: name the current node on screen.** In the same branch reuse the Callouts `<Html>` pill pattern to
render ONE floating label at the highlighted part's position showing its display name: resolve via
`module.spec.parts.find((part) => part.id === currentPartId)?.name[language] ?? currentPartId`. Update whenever the
interval advances (the `onHighlightChange` callback already fires per step — lift `currentPartId` into AidLayer
state there instead of only a ref).

- [ ] **Step 4: helper caption under the chips** (same slot Cutaway uses): powerPath aids get
`{zh: "金色脉冲沿动力链流动：水 → 枢轮 → 天柱 → 浑仪 → 木阁", en: "The gold pulse walks the power chain: water → wheel → column → armillary → pagoda"}` —
add a `label` field usage identical to the cutaway aid's `label` render (the astroclock powerPath aid in
`build.ts` gains `label: {…}` with those strings; the AidLayer already renders `activeAid.label` for cutaway —
generalize that render to any aid with a label). **✅ pinned (10:30) — type prerequisite:** the `powerPath`
variant in `src/sim/types.ts:185-190` has NO `label` field today — add `label?: { zh: string; en: string };` to
that variant IN THIS TASK or the `build.ts` label will not compile in lane A. (T19 in lane C independently adds
the same optional field plus `subDemo`'s; at the CP3 merge both sides may have added the identical powerPath
line — keep one copy.)

- [ ] **Step 5: verify** — click Power path: a pulsing gold tube snakes up the tower, one part at a time glows
bright amber with a floating name pill. e2e hook: `window.__mechAid.state().highlightedPartIds.length === 1`.
`pnpm test` green. Commit `feat(aids): T7 visible power-path route with node labels`.

### T8 — Flow particles visible + runtime assertion

**Fixes:** F-06.

**Files:** `src/ui/viewer/AidLayer.tsx:429-445` (+ dev warn in the resolve loop).

- [ ] **Step 1:** material: `size: aid.flavor === "sparks" ? 0.06 : 0.055`, `opacity: 0.95`, add
`blending={AdditiveBlending}` (import from three), keep `sizeAttenuation`, color unchanged.

- [ ] **Step 2:** default count: `const count = Math.min(200, Math.max(24, Math.round((aid.rate ?? 40) * 2)));`.

- [ ] **Step 3:** silent-failure guard — in the `useFrame` resolve loop, after computing `resolved`, add (dev only):

```ts
if (import.meta.env.DEV && resolved === 0 && !warnedRef.current) {
  warnedRef.current = true;
  console.warn("[aids] flowParticles resolved 0 of", aid.pathPartIds.length, "part ids", aid.pathPartIds);
}
```

(`const warnedRef = useRef(false);`)

- [ ] **Step 4:** verify — Flow path chip now shows a stream of additive water motes cycling reservoir → tank →
scoop → trough → lift wheel. Dev console shows NO resolve warning (if it does, list the missing ids in the commit
message and fix the aid's `pathPartIds` in `build.ts` to matching part ids — part ids live in
`src/machines/astroclock/parts.json`). `pnpm test` green. Commit `fix(aids): T8 flow particles readable size and additive glow`.

### T9 — Scheme persistence + compare mode polish

**Fixes:** F-14, F-15.

**Files:** `src/ui/store.ts`, `src/ui/viewer/MachineViewer.tsx:2984` + compare-active chrome conditional,
`src/ui/compare/CompareView.tsx`, `src/ui/styles.css:667-770`, i18n.

- [ ] **Step 1: persist scheme per machine.** Store: add
`schemeByMachine: Record<string, string>; setMachineScheme: (slug: string, schemeId: string) => void;`
(`setMachineScheme: (slug, schemeId) => set((state) => ({ schemeByMachine: { ...state.schemeByMachine, [slug]: schemeId } }))`).
In `MachineViewer.tsx:2984`:

```ts
const storedScheme = useUiStore(
  (state) => state.schemeByMachine[module.data.slug],
);
const [activeSchemeId, setActiveSchemeId] = useState(storedScheme ?? schemeId);
```

and everywhere `setActiveSchemeId(x)` is called (scheme switcher `onChange`, `recordEvent` `"scheme:switch"`),
also call `useUiStore.getState().setMachineScheme(module.data.slug, x)`.

- [ ] **Step 2: hide clashing chrome in compare.** In the JSX where compare mode renders (`compareActive` flag —
grep `compareActive` in MachineViewer), wrap `.viewer-title` and the ENTER STORY link:
`{compareActive ? null : (<div className="viewer-title">…</div>)}` etc.

- [ ] **Step 3: compare header + exit.** In `CompareView.tsx` top render, add:

```tsx
<header className="compare-header">
  <strong>{module.data.names[language]}</strong>
  <span>{leftScheme.scholar[language]} · {leftScheme.year}</span>
  <span>{rightScheme.scholar[language]} · {rightScheme.year}</span>
  <button
    className="ghost-button"
    data-testid="compare-close"
    onClick={onClose}
    type="button"
  >
    {t("compare.close")}
  </button>
</header>
```

`onClose` prop = the same handler the "Compare schemes" toggle uses to exit (thread it down from MachineViewer).
i18n `"compare.close": "退出对比"` / `"Exit compare"`.

- [ ] **Step 4: camera + drive feedback.** Where CompareView initializes camera (`:97-109` uses stored state):
set the DEFAULT (no stored state) to `position: [11, 6.5, 13], target: [0, 4.5, 0]` (three-quarter view, not
top-down). ± buttons: `aria-label` from i18n (`"compare.driveForward": "同步正向驱动两个方案"`, reverse likewise + EN),
enlarge hit area CSS `min-width: 44px; min-height: 36px;`, and on click flash the shared caption line with
`{zh: "两侧同步前进一格", en: "Both models advance one step"}` for 1.2 s (local state + the existing caption row
under the viewports — CompareView already renders a status row; if not, add a `<p className="event-caption">`).
Hold-to-repeat: `onPointerDown` starts `setInterval(fire, 160)`, cleared on `onPointerUp/Leave`.

- [ ] **Step 5: table + selects CSS** (`styles.css`):

```css
.compare-table-wrap { overflow-x: auto; }
.compare-table-wrap table { font-size: 0.8rem; border-collapse: collapse; width: 100%; }
.compare-table-wrap tbody tr:nth-child(odd) { background: rgba(255, 255, 255, 0.03); }
.compare-table-wrap th, .compare-table-wrap td { padding: 0.45rem 0.6rem; vertical-align: top; text-align: left; }
.compare-scheme-pickers select { max-width: none; width: 100%; text-overflow: ellipsis; }
.compare-header { display: flex; align-items: center; gap: 1rem; padding: 0.4rem 0.75rem; }
.compare-header button { margin-left: auto; }
```

Wrap the existing ComparisonTable in `<div className="compare-table-wrap">` if not already.

- [ ] **Step 6: verify** — switch to Combridge, enter story, come back → still Combridge. Compare opens with its
own header + working 退出对比 button, three-quarter camera, ± clicks flash the caption. `pnpm test` green.
Commit `fix(compare): T9 scheme persistence, compare header, camera and drive feedback`.

### T10 — Chrome layout: control dock, chips, docent pill, wheel guard, hint

**Fixes:** F-16, F-21, F-22, plus title/ENTER-STORY crowding.

**Files:** `src/ui/styles.css`, `src/ui/viewer/MachineViewer.tsx` (panel structure + chips container + wheel guard), `src/ui/panels/DocentChat.tsx` (launcher position), i18n.

- [ ] **Step 1: control dock.** Restructure the control panel into two groups — primary row (Pause · Reset view ·
Plain background · idle chip) always visible as ONE slim row, advanced group (assembly progress, play/reassemble,
exploded view) inside a `<details className="controls-advanced">` with `<summary>{t("viewer.moreControls")}</summary>`
(zh 更多控制 / en More controls), default CLOSED. CSS:

```css
.viewer-controls { max-width: 420px; padding: 0.4rem 0.6rem; background: rgba(10, 10, 8, 0.72);
  backdrop-filter: blur(6px); border: 1px solid rgba(213, 164, 78, 0.35); border-radius: 10px; }
.viewer-controls .primary-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.controls-advanced[open] { margin-top: 0.5rem; }
```

Result: default overlay height ≤ 96 px; the tower base is never hidden at 1024×640.

- [ ] **Step 2: chips.** Give the chips container `flex-wrap: wrap; max-width: min(62%, 560px); row-gap: 0.35rem;`
and move it to top-LEFT of the canvas (`left: 1rem; right: auto;`) so it never collides with the sidebar edge.
At `max-width: 1100px` add a modifier: chips become a horizontal scroll strip
(`overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none;`) pinned above the canvas top edge, not over the model.

- [ ] **Step 3: docent pill.** Change the launcher to compute against the sidebar: desktop (`min-width: 821px`)
`position: fixed; right: calc(min(400px, 33vw) + 24px); bottom: 20px;` — i.e. left of the sidebar column, over the
canvas corner; below 821 px `right: 16px; bottom: calc(16px + env(safe-area-inset-bottom));`. Hide the launcher
entirely while the drawer is open (`{open ? null : <button …>}` — currently both render).

- [ ] **Step 4: wheel guard (F-21).** On the canvas wrapper div in MachineViewer add
`onWheel={(event) => { event.stopPropagation(); }}` and CSS `overscroll-behavior: contain;` on the wrapper class —
wheel over the 3D view zooms the camera and never scrolls the page in single-column layout.

- [ ] **Step 5: coach hint (F-22).** In `MachineViewer.tsx:1525` the hint targets `primaryDrive`. Gate its
visibility: pass `coachTarget={!compareContext && part.id === module.spec.primaryDrive && driveCoachVisible}` and
auto-dismiss on the FIRST successful drive: in the drive handler that records `advance`, call `dismissDriveCoach()`.
Also style the hint pill with a leader dot (CSS `::before` 6px gold dot) so it reads anchored rather than floating.

- [ ] **Step 6: title row.** `.viewer-title { max-width: calc(100% - 220px); }` and move the ENTER STORY link into
the same flex row with `margin-left: auto; flex-shrink: 0;` so the H1 wraps under it instead of colliding.

- [ ] **Step 7: verify at three sizes** — 1440×900, 1280×800, 1024×640: no overlap between pill/buttons, chips
never clip, model base visible, exploded slider reachable. `pnpm test` green.
Commit `fix(ui): T10 dock controls, wrap chips, reposition docent pill, wheel guard`.

### T11 — Story mode composition, grade, and highlight legibility

**Fixes:** F-18.

**Files:** `src/ui/story/ScrollStory.tsx`, `src/ui/story/story.css`, `src/ui/viewer/MachineViewer.tsx`
(`MachineStoryStage` region ONLY) — (`src/machines/astroclock/story.ts` NOT touched — poses stay authored data).

**Lane note (✅ pinned 11:20):** this task runs in **lane B phase-2, first slot, AFTER the CP2 merge** — the
story stage Canvas/camera/grade lives in `export function MachineStoryStage` (`MachineViewer.tsx:2387`, Canvas
at `:2744`), not in ScrollStory.tsx, and step 4 needs T7's emissive values, which reach your branch via the CP2
merge. Edit ONLY the MachineStoryStage region of MachineViewer.tsx.

- [ ] **Step 1: aspect-aware framing.** Where ScrollStory applies `step.camera` (grep `camera.position` in the
file), treat the authored pose as intent for a 16:10 frame and compensate narrower aspects by dollying back:

```ts
const aspect = size.width / size.height;
const compensation = aspect >= 1.6 ? 1 : Math.min(1.45, 1.6 / aspect);
camera.position.copy(authored.position).multiplyScalar(compensation);
```

(`size` from `useThree`.) This removes the subject cropping at 1024×640 and mobile.

- [ ] **Step 2: consistent grade.** Give the story Canvas the SAME tone mapping + environment defaults as the
main viewer: locate the main viewer's `<Canvas>` gl/tone settings (grep `toneMapping` in MachineViewer) and copy
them into ScrollStory's Canvas; if stages override lights, normalize to one rig (single hemisphere + key light)
so exposure no longer flips bright/dark between stages.

- [ ] **Step 3: card layout.** `story.css`: cards `max-width: 360px;` pinned left with a scrim
(`background: linear-gradient(90deg, rgba(8,8,8,0.92), rgba(8,8,8,0.55) 70%, transparent);`), and when
`min-width: 900px` shift the 3D target right by rendering the canvas with `transform: translateX(8%)` on the
canvas wrapper (cheap, no camera math) so the model clears the card column.

- [ ] **Step 4: stage highlights that read.** Story steps already pass `highlight` part lists — route them through
the same aid-highlight emissive as T7 (`#f2b23e` @ 2.1) instead of whatever ghost value they use now (grep how
ScrollStory passes highlights into the scene — it reuses MachineViewer's ghost/highlight props; set
`aidHighlightPartIds={step.highlight}` on the embedded viewer scene).

- [ ] **Step 5: progress dots.** Fixed-right vertical dots, one per step, current filled:

```tsx
<nav aria-label="story progress" className="story-progress">
  {steps.map((step, index) => (
    <span
      className={index === activeIndex ? "dot active" : "dot"}
      key={step.id}
    />
  ))}
</nav>
```

```css
.story-progress { position: fixed; right: 14px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 8px; z-index: 30; }
.story-progress .dot { width: 7px; height: 7px; border-radius: 50%;
  background: rgba(213, 164, 78, 0.3); }
.story-progress .dot.active { background: #d5a44e; }
```

- [ ] **Step 6: verify** — scroll all 9 stages at 1440×900 AND 1024×640: subject fully framed every stage, no
bright/dark flips, cards never cover the model's focus area, highlights visibly glow, dots track progress.
`pnpm test` green. Commit `fix(story): T11 aspect-aware framing, stable grade, visible highlights, progress dots`.

### T12 — Reassemble mode legibility

**Fixes:** F-13.

**Files:** `src/ui/viewer/MachineViewer.tsx` (reassemble branch — locate via grep `Reassemble`/`snap`), `src/ui/styles.css`, i18n.

- [ ] **Step 1: instruction banner.** While reassemble mode is active render over the canvas top-center:

```tsx
<div className="assembly-banner" data-testid="assembly-banner">
  <strong>{t("assembly.title")}</strong>
  <span>{t("assembly.progressLabel", { seated, total })}</span>
  <button onClick={exitReassemble} type="button">{t("assembly.exit")}</button>
</div>
```

i18n: `"assembly.title": "拖拽复原：把零件拖到金色槽位"` / `"Reassemble: drag parts onto the gold slots"`,
`"assembly.progressLabel": "已装 {{seated}} / {{total}}"` / `"Seated {{seated}} / {{total}}"`,
`"assembly.exit": "退出并显示整机"` / `"Exit and show the machine"` (wired to the existing
"Show complete machine" handler). `seated/total` come from the assembly state the panel already renders.

- [ ] **Step 2: camera + slot size.** On entering reassemble, focus the camera on the slot grid using T2's rig
(`setDemoFocusPartId("base-platform")` then null on settle) so the grid fills ~70 % of the frame instead of 25 %.
Scale slot markers up: find the slot marker mesh/sprite creation in the reassemble branch and set its world size
≥ 0.12 m with `depthTest: false` gold ring material so every slot reads at ≥ 10 px.

- [ ] **Step 3: seat rule.** Guard the tap-to-seat path (register anchor `:2363`): only seat when a part is
currently grabbed/selected; otherwise clicking a slot pulses the banner (`assembly.hintPickFirst`:
zh "先点击或拖起一个零件" / en "Pick up a part first"). The existing hint plumbing at `:3758-3762` renders raw part
ids — replace `assembly.state.hint.requiredPartId` with the display name:
`module.spec.parts.find((part) => part.id === hint.requiredPartId)?.name[language] ?? hint.requiredPartId`.

- [ ] **Step 4: verify** — entering 拖拽复原 shows banner + close-up grid + finger-sized slots; clicking a slot
with nothing grabbed pulses guidance; hints name parts in the current language ("先安装 塔基平台" not
"tower-base-platform"). `pnpm test` green. Commit `fix(viewer): T12 reassemble onboarding, framing, seat rule`.

### T13 — Wood texture + scene warmth

**Fixes:** F-19, F-20.

**Files:** `src/core/textures.ts:174-176`, `src/machines/astroclock/scene.ts`, `tests/core/textures.test.ts` (only if it asserts exact pixels — adjust expected hashes, do NOT weaken structure).

- [ ] **Step 1: calm the rings.** Replace `textures.ts:174-176` with:

```ts
if (variant.startsWith("wood:")) {
  const rings = 0.5 + 0.5 * Math.sin(x * 0.085 + broad * 3.2 + y * 0.012);
  return THREE.MathUtils.clamp(rings * 0.34 + fine * 0.24 + broad * 0.42, 0, 1);
}
```

Rationale: ring frequency ÷3 (0.27→0.085), ring amplitude 0.72→0.34 (stripes become grain), low-frequency `broad`
noise dominates so adjacent beams differ. If `tests/core/textures.test.ts` pins exact texel values, regenerate its
expected constants (the test file documents how).

- [ ] **Step 2: warm the set.** `scene.ts`: backdrop colors `["#141312", "#5a3d24"]` (lift the top so the cyclorama
reads at all), ground radius `3.4 → 5.2` (floor extends past the tower footprint), add one prop
`{ kind: "column", position: [0, 1.2, -2.6], scale: 1.3 }` for depth, dust count `90 → 140`.

- [ ] **Step 3: verify visually** — reload: beams read as quiet wood grain (no zebra), roof no longer marble;
the tower sits on a visible warm stone court with a brown-lit cyclorama behind. `pnpm test` green (adjust texture
test constants if pinned). Commit `feat(rendering): T13 calmer wood grain and warmer astroclock set`.

### T14 — Assembly playback pacing

**Fixes:** F-12.

**Files:** `src/ui/viewer/assembly.ts:7-10` + the viewer playback consumer (grep `ASSEMBLY_PART_DURATION_MS` usage).

- [ ] **Step 1:** constants: `ASSEMBLY_PART_DURATION_MS = 280 → 320`, `ASSEMBLY_MIN_DURATION_MS = 2_500 → 9_000`,
`ASSEMBLY_MAX_DURATION_MS = 20_000 → 45_000`.

- [ ] **Step 2:** **✅ pinned (11:10 — corrects the earlier 10:30 pin):** `assemblyDurationMs` IS wired, exactly
once, internally: `assembly.ts:304` builds the plan with `durationMs: assemblyDurationMs(orderedPartIds.length)`,
and the viewer playback rAF consumes `assembly.plan.durationMs` (`MachineViewer.tsx:3346,3361`). The measured
4.5 s (≈16 × 280 ms) proves `orderedPartIds` holds ~16 STAGE-level entries for astroclock, not ~90 parts. Fix at
the source: read how `orderedPartIds` is assembled (the region above `assembly.ts:304`) and make the duration
reflect the TRUE part count — `assemblyDurationMs(spec.parts.length)`, or expand `orderedPartIds` to real parts
if that is the one-liner — astroclock ≈ 90×320 = 28.8 s (within the new clamp). Then add a stage-boundary hold
in the viewer playback rAF (`MachineViewer.tsx:3346` area): when the stage label changes, hold progress for
700 ms (same pattern as T1's dwell — a `stageHoldUntil` timestamp).

- [ ] **Step 3:** **✅ pinned (10:30):** `tests/ui/assembly.test.ts:125-127` asserts the OLD policy —
`(1)→ASSEMBLY_MIN`, `(20)→5_600`, `(100)→ASSEMBLY_MAX`. Update to the new policy: `(1)→9_000`,
`(20)→9_000` (20×320=6 400 clamps UP to the new min), `(100)→32_000`, and add `(200)→45_000` to keep the
max-clamp branch covered.

- [ ] **Step 4:** verify — Play assembly now takes ~30 s for astroclock, each stage label readable, parts stream
in visibly instead of popping. `pnpm test` green. Commit `fix(viewer): T14 part-count assembly pacing with stage holds`.

### T15 — Mobile layout (375–520 px)

**Fixes:** F-17.

**Files:** `src/ui/styles.css:872-940` (extend the ≤820 and ≤520 blocks), `src/ui/viewer/MachineViewer.tsx` (chips strip placement already componentized in T10).

- [ ] **Step 1:** inside `@media (max-width: 820px)`: canvas wrapper `height: 52vh; min-height: 340px;`; chips strip
(from T10 step 2) renders BETWEEN header and canvas (`position: static; overflow-x: auto; padding: 0.4rem 1rem;`) —
never over the model; `.viewer-controls` becomes `position: fixed; left: 0; right: 0; bottom: 0; max-width: none;
border-radius: 12px 12px 0 0; padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));` with ONLY the primary
row visible (advanced `<details>` still works); ENTER STORY moves into the header bar (`.viewer-title` row wraps,
link full-width below the h1 with `order: 3`).

- [ ] **Step 2:** inside `@media (max-width: 520px)`: h1 `font-size: 1.35rem; line-height: 1.2;`; header brand row
`padding: 0.5rem 1rem;` (fixes the clipped 格物机械志); docent launcher `bottom: calc(72px + env(safe-area-inset-bottom));`
(above the fixed control dock).

- [ ] **Step 3:** verify with Playwright viewports — add to T16's spec (below) and eyeball via
`pnpm dev` + devtools at 375×812: model unobstructed, chips scrollable strip, controls docked bottom, no
overlapping "进入叙事". Commit `fix(ui): T15 mobile layout for chips, controls, and header`.

### T16 — Regression e2e suite + full gate

**Fixes:** F-24 assert; locks in T1–T15.

**Files:** Create `e2e/astroclock-ux.spec.ts`. Modify `docs/SUBMISSION_NOTES.md` (append gate evidence line).

- [ ] **Step 1: write the spec** (VITE_E2E builds set `demoSpeed = 8`, so timings below are ÷8 real time):

```ts
import { expect, test } from "@playwright/test";

const ASTRO = "/#/m/astroclock";

test("demo timeline paces captions and restores run state", async ({ page }) => {
  await page.goto(ASTRO);
  // Install a mutation observer BEFORE clicking — polling after the fact races the dwell (min 200 ms at speed 8)
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="event-captions"]')!;
    (window as any).__capIntervals = [];
    let last = el.textContent ?? "";
    let lastAt = performance.now();
    new MutationObserver(() => {
      const text = el.textContent ?? "";
      if (text === last) return;
      const now = performance.now();
      if (last !== "") (window as any).__capIntervals.push(now - lastAt);
      last = text;
      lastAt = now;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await page.getByTestId("mech-trigger-spotlight").click();
  await expect(page.getByTestId("mech-trigger-spotlight")).toBeEnabled({
    timeout: 60_000,
  }); // demo finished; buttons re-enable (proxy for pause-state restore)
  const intervals: number[] = await page.evaluate(() => (window as any).__capIntervals);
  expect(intervals.length).toBeGreaterThan(3);
  expect(Math.min(...intervals)).toBeGreaterThanOrEqual(180); // ≥(1600/8) minus scheduling jitter
});

test("camera focuses during the beat demo", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByTestId("mech-trigger-spotlight").click();
  await page.waitForFunction(
    // `!== null` would pass vacuously when the hook is absent (undefined !== null) — require a real string
    () => typeof (window as any).__mechDemoFocus?.focusPartId === "string",
    undefined,
    { timeout: 15_000 },
  );
});

test("five-tier demo always reports", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByTestId("mech-trigger-chime-placards").click();
  await expect(page.getByTestId("event-captions")).toContainText(
    /placard|举牌|司辰/,
    { timeout: 30_000 },
  );
});

test("all four demo buttons exist after a story round-trip (F-24)", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByRole("link", { name: /story|叙事/i }).click();
  await page.getByTestId("story-back-link").click(); // ✅ pinned: it is an <a> (link), NOT a button — routes.tsx:282
  for (const id of [
    "mech-trigger-spotlight",
    "mech-trigger-escapement-captions",
    "mech-trigger-drag-shulun",
    "mech-trigger-chime-placards",
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test("scheme selection survives story round-trip", async ({ page }) => {
  await page.goto(ASTRO);
  await page.locator("select").first().selectOption("combridge-hinged");
  await page.getByRole("link", { name: /story|叙事/i }).click();
  await page.getByTestId("story-back-link").click(); // ✅ pinned: it is an <a> (link), NOT a button — routes.tsx:282
  await expect(page.locator("select").first()).toHaveValue("combridge-hinged");
});

test("power path aid runs a visible route", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByRole("button", { name: /power path|动力路径/i }).click();
  await page.waitForFunction(() => {
    const state = (window as any).__mechAid?.state();
    return state?.kind === "powerPath" && state.highlightedPartIds.length === 1;
  });
});

test("flow particles actually resolve", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByRole("button", { name: /flow path|流动路径/i }).click();
  await page.waitForFunction(() => {
    const state = (window as any).__mechAid?.state();
    return state?.kind === "flowParticles" && state.flowParticleCount > 0;
  });
});

test("no chrome collisions at 1024x640 and 375x812", async ({ page }) => {
  for (const viewport of [
    { width: 1024, height: 640 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(ASTRO);
    const docent = page.getByRole("button", { name: /docent|馆员/i });
    const demo = page.getByTestId("mech-trigger-spotlight");
    // No count() guards — a missing control must FAIL the test, not skip it silently
    await expect(docent).toBeVisible();
    await expect(demo).toBeVisible();
    const a = await docent.boundingBox();
    const b = await demo.boundingBox();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const overlap =
      a!.x < b!.x + b!.width && b!.x < a!.x + a!.width &&
      a!.y < b!.y + b!.height && b!.y < a!.y + a!.height;
    expect(overlap).toBe(false);
  }
});
```

(`mech-trigger-*` test ids already exist — `MachineViewer.tsx:4196`.)

**Triage coupling:** if §0.7 cut T15, DELETE the `{ width: 375, height: 812 }` entry from the collision test —
mobile relocation is T15's contract; the 1024×640 case must still pass from T10 alone.

- [ ] **Step 2: run the full gate:**

```
pnpm test          # all unit suites
pnpm validate      # exit 0 — proves data untouched
pnpm i18n:check    # zero issues
pnpm e2e           # 30 existing + new astroclock-ux spec, all green
pnpm build         # exit 0
```

- [ ] **Step 3: visual evidence** — with the dev server running, capture 1440×1000 screenshots of: default view,
power path mid-route, cutaway, beat demo mid-focus, compare view, story stage 4, mobile 375 default → into
`artifacts/visual-gate-2/astroclock-qa/` (any capture tool; Playwright `page.screenshot` in a scratch script is fine).
Append one line to `docs/SUBMISSION_NOTES.md`: date, commit range, "astroclock QA wave T1–T16 green, evidence in
artifacts/visual-gate-2/astroclock-qa/".

- [ ] **Step 4: commit** — `git add e2e/astroclock-ux.spec.ts docs/SUBMISSION_NOTES.md artifacts/visual-gate-2/astroclock-qa && git commit -m "test(e2e): T16 astroclock UX regression suite and gate evidence"`

### T17 — Machine home poses: no machine may load black

**Fixes:** F-25, F-26 (BLOCKERS).

**Files:** `src/ui/viewer/visualRecovery.ts` (VIEWER_PROFILES + guard), `src/ui/viewer/MachineViewer.tsx:660-690` (pose consumption), `tests/ui/homePose.test.ts` (new).

- [ ] **Step 1: failing test** — `tests/ui/homePose.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Sphere, Vector3 } from "three";
import { safeHomePose, VIEWER_PROFILES } from "../../src/ui/viewer/visualRecovery";

describe("safeHomePose", () => {
  it("rejects a pose whose camera sits inside the model bounding sphere", () => {
    const sphere = new Sphere(new Vector3(0, 1, 0), 3);
    const inside = { position: [0.5, 1, 0.5] as const, target: [0, 1, 0] as const };
    expect(safeHomePose(inside, sphere)).toBeNull();
  });
  it("accepts a pose comfortably outside the sphere", () => {
    const sphere = new Sphere(new Vector3(0, 1, 0), 3);
    const outside = { position: [8, 5, 9] as const, target: [0, 1, 0] as const };
    expect(safeHomePose(outside, sphere)).toEqual(outside);
  });
  it("every declared profile pose passes its own sanity shape", () => {
    for (const profile of Object.values(VIEWER_PROFILES)) {
      if (!profile.homePose) continue;
      expect(profile.homePose.position).toHaveLength(3);
      expect(profile.homePose.target).toHaveLength(3);
    }
  });
});
```

- [ ] **Step 2: run → FAIL** (`safeHomePose` not exported).

- [ ] **Step 3: implement the guard** in `visualRecovery.ts`:

```ts
import { Sphere, Vector3 } from "three";

export function safeHomePose<
  T extends { position: readonly [number, number, number]; target: readonly [number, number, number] },
>(pose: T, modelSphere: Sphere): T | null {
  const camera = new Vector3(...pose.position);
  if (camera.distanceTo(modelSphere.center) < modelSphere.radius * 1.15) {
    return null; // camera inside (or grazing) the model — fall back to bounds fit
  }
  return pose;
}
```

- [ ] **Step 4: consume it.** In `MachineViewer.tsx` where the authored pose is chosen. **✅ pinned (10:30):**
the branch is exactly `fitWholeMachine || explode > 0 || !profile.homePose` at `:665`, and the scope already has
`wholeBounds`, `fitBounds`, and `const fitSphere = fitBounds.getBoundingSphere(new Sphere())` (`:663`). Guard
against the WHOLE machine, not a focused sub-part: `const wholeSphere = wholeBounds.getBoundingSphere(new Sphere());`
then replace `profile.homePose` reads in this block with
`const homePose = profile.homePose ? safeHomePose(profile.homePose, wholeSphere) : null;` so a stale pose
automatically degrades to the whole-machine fit instead of a black screen. Dev-only warn when a pose is
rejected: `if (import.meta.env.DEV && profile.homePose && !homePose) console.warn("[camera] stale homePose rejected for", module.data.slug);`

- [ ] **Step 5: re-author the two poses.** Run `pnpm dev`, open `/#/m/odometer`, zoom/orbit to a good
three-quarter view (whole carriage + drawbar visible, slight top-down), then read the live camera numbers.
**Lane C note:** `DemoFocusRig`/`__mechCamera` do NOT exist in your worktree at this point (they are lane A / T28
work) — add a TEMPORARY `console.log` of `camera.position` + `controls.target` inside the OrbitControls change
handler, and REMOVE it before committing. Your dev server is port 5175. Write the observed numbers into
`VIEWER_PROFILES.odometer.homePose` (position/target, keep fov). Repeat for `loom` (frame the full loom with warp
face toward camera, treadles visible). If time-boxed, DELETING the two stale `homePose` blocks is an acceptable
fallback — the guard + fit path now frames correctly by construction.

- [ ] **Step 6: MOVED → T28 step 0.** The `window.__mechCamera` e2e hook now lands with the suite that consumes
it. Reason: T17 runs in lane C while lane A (T2) edits the same dev-hooks effect in `MachineViewer.tsx` — adding
it here guarantees a merge conflict. Do NOT add the hook in this task.

- [ ] **Step 7: verify** — `/#/m/odometer` and `/#/m/loom` now show the full machine ON LOAD with zero
interaction, at 1440×900 and 1024×640. `pnpm test` green. Commit
`fix(viewer): T17 valid home poses with inside-model guard for odometer and loom`.

### T18 — Seismoscope quake flow: pickable direction, guaranteed payoff

**Fixes:** F-27, F-28.

**Files:** `src/machines/seismoscope/build.ts:1127-1200`, `src/ui/viewer/MachineViewer.tsx` (runTrigger arg + direction picker UI), `tests/machines/seismoscope.test.ts`, i18n catalogs.

- [ ] **Step 1 — contracts ✅ pinned (10:30), no re-derivation needed:** both triggers ALREADY accept a bearing
as the third `run(graph, emit, param)` argument, validated as an integer `0–7` (`DIRECTION_COUNT`). The F-27 bug
is the mismatched FALLBACKS: `quake` falls back to `0` (north) while `quake:arm` falls back to `WEST_BEARING`
(6). The payoff chain already exists — `respondToPulse(graph, bearing, emit)` returns `true` on a latch match and
emits the release events, and the viewer already understands them (`releaseBall` caption branch at
`MachineViewer.tsx:2845-2847`, replay branch at `:3594`).

- [ ] **Step 2: tests** (the first locks the explicit-arg contract and may ALREADY pass; the second is the RED
one — do not burn time wondering why test 1 is green) — extend `tests/machines/seismoscope.test.ts`.
**✅ pinned:** the file already has
`import machine from "../../src/machines/seismoscope/build";` (line 4) and
`import { applySchemePatch, KinematicGraph } from "../../src/sim/graph";` (line 5):

```ts
it("arming then injecting the SAME bearing fires that dragon and drops the ball", () => {
  const graph = new KinematicGraph(machine.spec);
  const events: Array<{ type: string; part: string }> = [];
  const emit = (type: string, part: string) => events.push({ type, part });
  machine.mechanism!.triggers.find((t) => t.id === "quake:arm")!.run(graph, emit, 6);
  machine.mechanism!.triggers.find((t) => t.id === "quake")!.run(graph, emit, 6);
  expect(events.some((e) => e.type === "releaseBall")).toBe(true);
});

it("quake and quake:arm share the same default bearing", () => {
  const graph = new KinematicGraph(machine.spec);
  const events: Array<{ type: string; part: string }> = [];
  const emit = (type: string, part: string) => events.push({ type, part });
  machine.mechanism!.triggers.find((t) => t.id === "quake:arm")!.run(graph, emit);
  machine.mechanism!.triggers.find((t) => t.id === "quake")!.run(graph, emit);
  expect(events.some((e) => e.type === "releaseBall")).toBe(true); // RED today: arm→W, inject→N
});
```

- [ ] **Step 3: implement in build.ts** — one-line root fix: in the `quake` trigger change the invalid-param
fallback from `: 0` to `: WEST_BEARING` so both triggers default to the SAME bearing. Then, in both `quake` and
`quake:arm`+`quake` flows, after a successful `respondToPulse(...)` emit the new caption event
`caption:quake-report` with map entry
`{zh: "西方龙口铜丸落入蟾口 — 记下方位", en: "The west dragon drops its ball into the toad — bearing recorded"}`
in the seismoscope caption map (next to the existing `releaseBall` branch, `MachineViewer.tsx:2845` area).

- [ ] **Step 4: direction picker UI.** In the demos panel (`MachineViewer.tsx:4185-4207`), when
`module.data.slug === "seismoscope"` render an 8-button compass row ABOVE the trigger buttons:

```tsx
{module.data.slug === "seismoscope" ? (
  <div className="bearing-picker" data-testid="bearing-picker" role="group"
    aria-label={t("seismo.bearingLabel")}>
    {["N","NE","E","SE","S","SW","W","NW"].map((bearing, index) => (
      <button
        aria-pressed={quakeBearing === index}
        className={quakeBearing === index ? "chip active" : "chip"}
        key={bearing}
        onClick={() => setQuakeBearing(index)}
        type="button"
      >
        {t(`seismo.bearing.${bearing}`)}
      </button>
    ))}
  </div>
) : null}
```

with `const [quakeBearing, setQuakeBearing] = useState(6);` and `runTrigger(triggerId, arg?)` extended to pass the
arg into `trigger.run(graph, capture, arg)` — quake triggers get `quakeBearing`. i18n: `"seismo.bearingLabel":
"选择震源方位" / "Choose the quake bearing"`, `"seismo.bearing.N": "北 N"` … all 8, both catalogs (zh label
bilingual inline like "北 N" is fine for both).

- [ ] **Step 5: post-demo state.** After the quake payoff completes, flash the reset guidance caption
(`caption:quake-reset-hint` → `{zh: "按「复位八方」可再试其他方向", en: "Press “Reset all eight directions” to try another bearing"}`),
and when the spotlight auto-switches scheme to fengrui, emit a visible caption
(`{zh: "已切换到冯锐 2005 悬摆方案以演示", en: "Switched to the Feng Rui 2005 pendulum scheme for this demo"}`).

- [ ] **Step 6: verify** — pick 东 E, Arm, Inject: the EAST dragon's jaw opens, ball drops into the east toad,
captions narrate, reset hint appears; `pnpm test` green. Commit
`feat(seismoscope): T18 bearing picker with guaranteed quake payoff`.

### T19 — Odometer polish: distinct aid chips, live readout, 里 unit

**Fixes:** F-29, F-30.

**Files:** `src/ui/viewer/AidLayer.tsx:640-670`, `src/machines/odometer/build.ts:1348-1533`, `MachineViewer.tsx:4209-4215`, `tests/data/aids.test.ts` (extend).

- [ ] **Step 1: per-aid chip labels.** **✅ pinned (10:30):** in `src/sim/types.ts:185-218` the `powerPath`
variant is `{kind, sequence, dwellMs?}` and `subDemo` is `{kind, triggerId, caption}` — NEITHER carries `label`;
only `cutaway` does. Add `label?: { zh: string; en: string }` to the `powerPath` and `subDemo` variants
(`src/sim/types.ts` is editable — Global-3 protects only `scripts/poison-test.mts` and `src/validate/**`). Then
in `AidLayer.tsx` chip render (`:668`) change the label expression to
`{aid.label?.[language] ?? aidNames[aid.kind][language]}`. Then in
`src/machines/odometer/build.ts` give the four ambiguous aids labels:

```ts
// first powerPath:
label: { zh: "动力路径：足轮减速链", en: "Power path: distance train" },
// second powerPath:
label: { zh: "动力路径：报时锤系", en: "Power path: striker train" },
// first subDemo (triggerId "spotlight"):
label: { zh: "原理演示：十进折算", en: "Principle demo: decimal distance" },
// second subDemo (triggerId "ten-li-spotlight"):
label: { zh: "原理演示：十里鸣镯", en: "Principle demo: ten-li chime" },
```

- [ ] **Step 2: failing unit assertion** — extend `tests/data/aids.test.ts` with: every machine's aids array must
not contain two aids of the same kind with identical resolved chip labels (iterate modules the test file already
loads; compare `aid.label?.en ?? kindName`).

- [ ] **Step 3: live readout during demos.** In the odometer spotlight triggers
(`build.ts:1458-1533`), after each simulated wheel advance emit the readout the viewer already understands:
`emit("odometer:update", String(simulatedLi))` (grep `odometer:update` in `MachineViewer.tsx:3600-3603` for the
consumer contract — it parses the part string as float). Emit at least: 0.1 → 0.5 → 1.0 during "decimal distance",
and …→ 10.0 during "ten-li". The readout then counts up while the demo runs.

- [ ] **Step 4: localized unit.** `MachineViewer.tsx:4211-4214`: replace the literal `li` suffix with
`{language === "zh" ? "里" : "li"}`.

- [ ] **Step 5: verify** — odometer chips read distinctly; running both spotlights counts the readout up to 1.0 里
/ 10.0 里 (zh) or li (en); `pnpm test` green. Commit `fix(odometer): T19 distinct aid labels and live distance readout`.

### T20 — Posters and skeleton loading states (fidelity-plan F2-T2)

**Fixes:** §1b F2-T2 (black mounts before geometry; dead `home.thumbnail`/fallback keys).

**Files:** `src/ui/routes.tsx:228-246,307-321`, `src/ui/viewer/MachineViewer.tsx` (Canvas poster overlay), `src/ui/compare/CompareView.tsx`, `src/ui/story/ScrollStory.tsx`, `src/ui/styles.css`, i18n.

- [ ] **Step 1: shared poster component** (new file `src/ui/PosterFallback.tsx`):

```tsx
import { useTranslation } from "react-i18next";

export default function PosterFallback({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <div aria-hidden className="poster-fallback" data-testid={`poster-${slug}`}>
      <img alt="" src={`/assets/renders/${slug}/overall.jpg`} />
      <span>{t("app.loading")}</span>
    </div>
  );
}
```

CSS: `.poster-fallback { position: absolute; inset: 0; display: grid; place-items: center; }
.poster-fallback img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
opacity: 0.35; filter: blur(6px) saturate(0.8); } .poster-fallback span { position: relative; color: var(--gold, #d5a44e); }`
i18n **✅ pinned (10:30):** the string already exists as `app.loading` — zh "正在展开机械图谱…" / en
"Unfolding the mechanism…". REUSE it (`t("app.loading")` in the component, catalog text wins); do NOT add a
`viewer.loadingModel` key.

- [ ] **Step 2: mount it** — (a) route-level lazy fallbacks in `routes.tsx:228-246,307-321` replace the bare
sentence with `<PosterFallback slug={slug} />`; (b) in MachineViewer, render it as an absolutely-positioned sibling
OVER the Canvas while `viewerGeometryReadyAt === null`, fading out via CSS transition when ready; (c) same overlay
in each CompareView viewport shell and the ScrollStory stage while their geometry builds.

- [ ] **Step 3: home cards** — GalleryPanel/home cards: set the card image's `loading="lazy"` + a solid
`background: #14130f` behind thumbnails, and render the revived `t("home.thumbnail")` text when a poster file 404s
(`onError` → state flag).

- [ ] **Step 4: verify** — throttle CPU/network in devtools, reload each machine route: a blurred poster +
"Unfolding the mechanism…" shows instead of black; compare + story stages likewise. `pnpm test && pnpm i18n:check`
green. Commit `feat(ui): T20 poster and skeleton loading states`.

### T21 — i18n consolidation + dead-key guard (fidelity-plan F2-T5)

**Fixes:** §1b F2-T5 (dead keys, inline COPY drift).

**Files:** `src/ui/panels/DocentChat.tsx:68-92`, `src/ui/panels/GalleryPanel.tsx:30-75`, other inline COPY objects (grep `const COPY` across `src/ui`), `src/ui/i18n/{zh,en}.json`, `scripts/check-i18n.mts`.

- [ ] **Step 1: inventory.** **✅ pinned (11:20 — corrects the 10:30 pin):** the object-style sites are THREE —
`GalleryPanel.tsx:30` (`const COPY`), `DocentChat.tsx:68-92` (a `copy(lang)` FUNCTION — a `const COPY` grep
misses it), and `PartInspector.tsx:73` (`RECORD_COPY`; T5 landed earlier in this lane — check whether its diff
already absorbed it before migrating). User-facing copy ALSO hides in inline `language === "zh" ? … : …`
ternaries — inventory them with `rg -n '"zh" \?' src/ui` (known: `ScrollStory.tsx:310,329,347`,
`MachineViewer.tsx:3788` story link, the `routes.tsx` story back link) and migrate the user-facing ones. Move
everything into the catalogs under existing namespaces (`docent.*`, `gallery.*`, `inspector.*`, `story.*`) —
when catalog text and inline text drifted, the CATALOG text wins (it was reviewed copy). Replace lookups with
`t()` calls.

- [ ] **Step 2: dead-key guard.** Extend `scripts/check-i18n.mts`: after its existing checks, scan
`src/**/*.{ts,tsx}` for `t("` / `t(\`` key literals, build the used-key set (treat dynamic prefixes like
`events.` / `seismo.bearing.` as wildcard prefixes when the code concatenates), and fail with a list if a catalog
key is neither used nor wildcard-covered, or a used key is missing from either catalog:

```ts
const WILDCARD_PREFIXES = ["events.", "seismo.bearing.", "inspector."];
const deadKeys = catalogKeys.filter(
  (key) =>
    !usedKeys.has(key) &&
    !WILDCARD_PREFIXES.some((prefix) => key.startsWith(prefix)),
);
if (deadKeys.length > 0) {
  console.error("Dead i18n keys:", deadKeys.join(", "));
  process.exitCode = 1;
}
```

- [ ] **Step 3: reconcile.** Run `pnpm i18n:check`; for each reported dead key either wire it to its designed UI
(preferred: `app.retry`, `home.open`, `home.thumbnail` get wired in T20/T25) or delete it from BOTH catalogs with a
one-line note in the commit body. Zero dead keys at exit.

- [ ] **Step 4: verify** — `pnpm i18n:check` green with the new guard active; zh/en UI text unchanged or improved
(catalog-canonical). `pnpm test` green. Commit `refactor(i18n): T21 consolidate inline copy and add dead-key guard`.

### T22 — Sidebar IA + docent dialog semantics (fidelity-plan F2-T6/T7)

**Fixes:** §1b F2-T6, F2-T7 remainder.

**Files:** `src/ui/viewer/MachineViewer.tsx` (sidebar section order, caption slot), `src/ui/panels/DocentChat.tsx` (dialog), `src/ui/styles.css`.

- [ ] **Step 1: reorder the sidebar** to hook-first: Ingenuity spotlight card (with its Play button) → Mechanism
demos (+ caption line) → Reconstruction/Compare → Part record (auto-scrolls into view via
`element.scrollIntoView({block:"nearest"})` when a part is selected) → Gallery. This is a JSX block move inside the
sidebar `<aside>`; keep all testids.

- [ ] **Step 2: rhythm.** Render the event-caption `<p>` ONLY when `caption !== ""` (kills the reserved empty
2rem slot); unify panel spacing: `.panel { padding: 0.9rem 1rem; } .panel + .panel { margin-top: 0.75rem; }
.panel h2 { font-size: 1.02rem; margin-bottom: 0.55rem; }`.

- [ ] **Step 3: docent dialog.** In DocentChat drawer root: `role="dialog" aria-modal="true"
aria-labelledby="docent-title"`; on open, save `document.activeElement`, focus the input; trap Tab within the
drawer (keydown handler cycling first/last focusable); `Escape` closes; on close restore focus to the launcher.
Change `aria-live="polite"` from the scroll container to ONLY the newest assistant message element.

- [ ] **Step 4: verify** — keyboard-only walkthrough: open docent with Enter, Tab stays inside, Esc closes and
focus returns; sidebar order shows the spotlight hook first; no empty gaps. `pnpm test` green. Commit
`refactor(ui): T22 hook-first sidebar and docent dialog semantics`.

### T23 — Typography: legibility floor + heading order (fidelity-plan F2-T8, pragmatic scope)

**Fixes:** §1b F2-T8.

**Files:** `src/ui/styles.css`, `src/ui/panels/PartInspector.tsx` (headings).

- [ ] **Step 1: raise the floor.** Sweep `styles.css` for every `font-size` below `0.75rem`
(`grep -n "0\.6[0-9]rem\|0\.7[0-4]rem" src/ui/styles.css src/ui/story/story.css`) and raise to ≥ `0.75rem`
(record-list dt → 0.75rem with `letter-spacing: 0.04em`, provenance badges → 0.75rem, compare table → 0.8rem,
gallery tabs → 0.78rem). Bump low-contrast pairs flagged in the register: `.record-list dt` color `#77746d → #9a968c`,
`.machine-index` `#8b754a → #a98f5e`.

- [ ] **Step 2: heading order.** In `PartInspector.tsx` fix the inversion: the panel keeps its `h2`; part name
stays `h3`; the subsection headings currently rendered as `h2` ("Source quotation", "Reconstruction evidence",
"Controversies") become `h4` (they sit under the part-name h3); MachineEvidenceRecord's internal headings become a
consistent level below its own summary. Verify with a headings-outline browser extension or
`document.querySelectorAll("h1,h2,h3,h4")` order dump.

- [ ] **Step 3: font stack hardening (no network).** Consolidate the serif stack into one CSS variable
`--font-display: "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", Georgia, serif;` and use it in
the places that currently repeat ad-hoc stacks (`styles.css:84-90,562-564,575-580`, `story.css:78,120`). Shipping a
bundled webfont stays OUT of scope unless `public/fonts/` already contains one (no runtime network requests, no new
deps — Global constraint 2).

- [ ] **Step 4: verify** — no text below 0.75rem remains (re-run the grep → empty); zh headings render serif on
macOS and an acceptable serif elsewhere; heading outline is strictly nested. Commit
`fix(ui): T23 legibility floor and heading hierarchy`.

### T24 — Home flow: close the black gap (fidelity-plan F2-T9)

**Fixes:** §1b F2-T9.

**Files:** `src/ui/styles.css:24-35,126-135,163-175`, home/gallery component for `home.open` key.

- [ ] **Step 1:** extend the ambient gradient so the hero→cards scroll never goes pure black: replace the
36rem-capped radial with a body background of two stacked gradients
(`radial-gradient(120% 60% at 50% 0%, rgba(213,164,78,0.10), transparent 70%), linear-gradient(#0b0b09, #11100c)`);
reduce `.home-page`/`.hero` vertical clamps by ~35% (e.g. `clamp(2rem, 5vh, 4rem)`), demo-callout margins to
`2rem auto`.

- [ ] **Step 2:** card grid lighting: give machine cards `background: linear-gradient(180deg, #171511, #100f0c);
border: 1px solid rgba(213,164,78,0.22);` with a hover lift (`transform: translateY(-3px); border-color:
rgba(213,164,78,0.5); transition: 160ms;`), and wire the dead `home.open` key as the card CTA label ("进入展厅" /
"Open exhibit").

- [ ] **Step 3:** verify — scrolling home at 1440×900 shows a continuous warm-lit surface, no dead black band;
cards read as lit objects. `pnpm i18n:check` green (home.open now used). Commit
`fix(home): T24 continuous ambient light and lit machine cards`.

### T25 — A11y and dead-UI sweep (fidelity-plan F2-T10 remainder)

**Fixes:** §1b F2-T10: error pages, dangling aria, reduced-motion, language persistence, title localization, dead attrs.

**Files:** `src/ui/routes.tsx:216-226,295-305`, `src/ui/panels/GalleryPanel.tsx:314-341`, `src/ui/styles.css:941+`, `src/ui/store.ts` + `src/ui/i18n` init, `src/ui/App.tsx`, `src/ui/panels/SchemeSwitcher.tsx:72-75`.

- [ ] **Step 1: error pages.** Replace `<p>{slug}</p>` with translated copy + actions:
`t("app.notFoundMachine", { slug })` → zh "没有找到展品「{{slug}}」。" / en "No exhibit named “{{slug}}”." plus a
`t("app.retry")` button (`onClick={() => location.reload()}`) and a home link. Add the `app.notFoundMachine` key to
both catalogs; `app.retry` already exists (revived).

- [ ] **Step 2: gallery tabs.** Render all four tabpanels (hidden ones with `hidden` attr) so every
`aria-controls` id resolves; move the inline lightbox styles from JSX into `styles.css` classes.

- [ ] **Step 3: reduced motion.** In the `@media (prefers-reduced-motion: reduce)` block add
`*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }`.

- [ ] **Step 4: language persistence + document meta.** `setLanguage` also writes
`localStorage.setItem("mechanica-lang", language)`; the i18n `initialLanguage` reads it first (grep
`initialLanguage` in `src/ui/i18n`). In `App.tsx` add an effect on language change:
`document.title = language === "zh" ? "格物机械志 — 中国古代机械数字博物馆" : "Mechanica — A digital museum of Chinese machines";`
and update the `<meta name="description">` similarly.

- [ ] **Step 5: dead UI.** Delete the unreferenced `data-ghost-duration-ms` / `data-new-part-tint` /
`data-old-part-tint` attrs (`SchemeSwitcher.tsx:72-75`); delete the unreachable `disabled={compareActive}` on the
Pause button (the toolbar is already hidden in compare).

- [ ] **Step 6: verify** — visit `/#/m/nope`: friendly bilingual error with working retry; switch to 中文, reload:
stays 中文, tab title in Chinese; VoiceOver/NVDA smoke on gallery tabs. `pnpm test && pnpm i18n:check` green.
Commit `fix(a11y): T25 error pages, tab semantics, reduced motion, language persistence`.

### T26 — WebGL context-loss recovery

**Fixes:** F-31.

**Files:** `src/ui/viewer/MachineViewer.tsx` (Canvas onCreated + overlay), `src/ui/i18n` catalogs.

- [ ] **Step 1:** state + listeners:

```tsx
const [contextLost, setContextLost] = useState(false);
// in <Canvas onCreated={({ gl }) => { …existing… }}>
gl.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  setContextLost(true);
});
gl.domElement.addEventListener("webglcontextrestored", () => {
  setContextLost(false);
  invalidate(); // re-render on demand frameloop
});
```

- [ ] **Step 2:** overlay rendered over the canvas when `contextLost`:

```tsx
{contextLost ? (
  <div className="context-lost-overlay" role="alert">
    <p>{t("viewer.contextLost")}</p>
    <button onClick={() => location.reload()} type="button">{t("app.retry")}</button>
  </div>
) : null}
```

i18n: `"viewer.contextLost": "图形上下文已丢失，正在尝试恢复…" / "The graphics context was lost — trying to recover…"`.
Apply the same pattern to CompareView's two canvases and the story stage canvas (extract a small
`useContextLostGuard(glRef)` hook if cleaner).

- [ ] **Step 3:** verify — in devtools console:
`document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` → overlay
appears; `.restoreContext()` → scene comes back (or reload button works). Commit
`fix(viewer): T26 webgl context-loss overlay and recovery`.

### T27 — Scene dressing v2 for all four machines (fidelity-plan F1 scene specs)

**Fixes:** §1b F1 scene backlog. Astroclock warmth already landed in T13 — this task completes the remaining set
pieces within the existing SceneSpec system (`src/ui/scene/types.ts` — check which prop kinds exist before adding
new ones; extending the scene renderer with a new prop kind is allowed, new npm deps are not).

**Files:** `src/machines/{astroclock,seismoscope,odometer,loom}/scene.ts`, `src/ui/scene/**` (prop kinds), i18n none.

- [ ] **Step 1: read the authored specs** in `MECHANICA_FIDELITY_PLAN_EN.md` (in-repo): astroclock §F1-01 (lines
409-496), seismoscope §F1-02 (496-565 — the dusk-terrace spec table is also excerpted in §1 of THIS plan),
odometer §F1-04 (642-720), loom §F1-06 (801-885). **✅ pinned (10:30):** those four section anchors verified —
`F1-01@409, F1-02@496, F1-04@642, F1-06@801`. Implement the scene portions ONLY (ground/backdrop/props/light
rig/ambient motion) — part geometry is out of scope here. **Lane split:** implement seismoscope/odometer/loom
here; SKIP the astroclock bullet in step 2 (that file is lane B's T13 territory — it lands in the convergence
queue if there is slack post-CP3, else it inherits T13's warmth only and gets a `NEXT:` note).

- [ ] **Step 2: per-machine minimum set** (each ≤ 4k tris, honoring each work order's intent):
  - seismoscope: stone platform disc radius ≥ 4.5, low balustrade arc (instanced posts), two brazier tripods with
    warm point lights + ember flicker, west-low warm key light; on quake payoff (T18 event) pulse an expanding
    ring mesh on the ground from the fired bearing.
  - odometer: rammed-earth road strip with wheel ruts (two darkened stripes), 2–3 roadside milestone posts
    (one per 里 narrative), procession banner pole; warm courtyard rig stays.
  - loom: workshop corner — timber floor already present; add a low workbench with thread spools (boxes+cylinders),
    a hanging silk swatch quad behind, warm hall light; dust stays.
  - astroclock: add the two flanking columns' lintel + hanging lantern quad (courtyard depth), keep T13 values.

- [ ] **Step 3: verify** — each machine reads as "an exhibit in a place" rather than an object in fog;
`pnpm test` green (scene-spec unit tests exist under `tests/ui/sceneEnvironment.test.ts` — extend expected prop
counts if pinned). Frame-time budget: idle ≥ 55 fps at 1440×900 on the dev machine (spot-check devtools FPS meter).
Commit `feat(scenes): T27 usage-scene dressing for all four machines`.

### T28 — Four-machine gate: e2e suite + visual evidence

**Fixes:** F-32/F-33 verification; locks T17–T27. Extends T16 (astroclock suite stays).

**Files:** Create `e2e/machines-ux.spec.ts`; modify `src/ui/viewer/MachineViewer.tsx` (camera hook — step 0),
`docs/SUBMISSION_NOTES.md`.

- [ ] **Step 0 (moved here from T17): expose the camera e2e hook.** **✅ pinned (11:20):** `camera`/controls
exist ONLY inside the R3F child components — the dev-hooks effect scope has neither, so do not reference them
there. A diagnostics channel already exists: `cameraDiagnostics`, a MutableRefObject the in-canvas component
populates (`MachineViewer.tsx:1550` type/prop, `:1937` wiring, `:2085` writes `controlsEnabled`). Extend the
`CameraDiagnostics` type (grep `CameraDiagnostics` in the file) with `distance: number` and
`boundingRadius: number`; populate both in the same in-canvas code path that writes `controlsEnabled` (`:2085`
area — it has camera + controls in scope; `boundingRadius` mirrors T17's `wholeSphere` via a ref). Then in the
dev-hooks effect (grep `__mechExplodeSpread` — line numbers will have drifted after T1–T10) add:

```ts
window.__mechCamera = {
  get distance() { return cameraDiagnostics.current?.distance ?? 0; },
  get boundingRadius() { return cameraDiagnostics.current?.boundingRadius ?? 0; },
};
```

with `delete window.__mechCamera;` added to the SAME effect's cleanup (match the existing hook-delete pattern).

- [ ] **Step 1: write the spec:**

```ts
import { expect, test } from "@playwright/test";

const MACHINES = ["astroclock", "seismoscope", "odometer", "loom"];

for (const slug of MACHINES) {
  test(`${slug}: loads with camera OUTSIDE the model (never black)`, async ({ page }) => {
    await page.goto(`/#/m/${slug}`);
    await page.waitForFunction(() => (window as any).__mechCamera?.boundingRadius > 0, undefined, { timeout: 30_000 });
    const ok = await page.evaluate(() => {
      const cam = (window as any).__mechCamera;
      return cam.distance > cam.boundingRadius * 1.05;
    });
    expect(ok).toBe(true);
  });

  test(`${slug}: aid chips are unique and every aid activates`, async ({ page }) => {
    await page.goto(`/#/m/${slug}`);
    const chips = page.locator("[data-aid-kind]");
    await expect(chips.first()).toBeVisible({ timeout: 30_000 }); // AidLayer mounts after async geometry prep — an empty list would pass vacuously
    const labels = await chips.allTextContents();
    expect(new Set(labels).size).toBe(labels.length); // F-29: no duplicate chip labels
    const count = await chips.count();
    for (let i = 0; i < count; i += 1) {
      await chips.nth(i).click();
      await page.waitForFunction(
        (idx) => (window as any).__mechAid?.state().index === idx,
        i,
      );
    }
  });
}

test("seismoscope: matched bearing fires the dragon", async ({ page }) => {
  await page.goto("/#/m/seismoscope");
  await page.getByTestId("bearing-picker").getByRole("button", { name: "东 E", exact: true }).click();
  await page.getByTestId("mech-trigger-quake:arm").click();
  await page.getByTestId("mech-trigger-quake").click();
  await expect(page.getByTestId("event-captions")).toContainText(/ball|铜丸/, { timeout: 30_000 });
});

test("odometer: readout counts during the decimal-distance demo", async ({ page }) => {
  await page.goto("/#/m/odometer");
  await page.getByTestId("mech-trigger-spotlight").click();
  await expect(page.getByTestId("odometer-readout")).not.toHaveText(/^0\.00/, { timeout: 30_000 });
});
```

(Note: `mech-trigger-quake:arm` — if the colon breaks the testid selector, use
`page.locator('[data-testid="mech-trigger-quake:arm"]')`. The `[data-aid-kind]` chip selector exists at
`AidLayer.tsx:644`.)

- [ ] **Step 2: full gate** — `pnpm test && pnpm validate && pnpm poison && pnpm i18n:check && pnpm e2e && pnpm build`,
all green.

- [ ] **Step 3: visual evidence** — capture 1440×1000 shots per machine: default load, best aid active, demo
mid-focus, compare (where 2 schemes), mobile 375 default → `artifacts/visual-gate-2/four-machine-qa/`. Append the
gate line to `docs/SUBMISSION_NOTES.md`.

- [ ] **Step 4: commit** — `git add e2e/machines-ux.spec.ts docs/SUBMISSION_NOTES.md artifacts/visual-gate-2/four-machine-qa && git commit -m "test(e2e): T28 four-machine gate suite and evidence"`

---

## §4 Dependency rationale, merge safety, and rollback

Execution is three parallel lanes + a convergence queue — **§0.1 says who runs what, §0.4 says when.** The lane
orders encode these hard dependencies (unchanged from the original wave design):

  | Dependency | Where it is encoded |
  |---|---|
  | T1's timeline player is the base for T2/T3; T18/T19 need T1+T2's timeline + camera events | Lane A order; lane C WAITS for CP1 (`git merge main`) before T18 |
  | T7/T8 need T2's emissive/aid slots | Lane A order (T7/T8 after T2) |
  | T21's dead-key guard must land after every key-adding task | Convergence queue, post-CP3 (T5/T6/T20/T24/T25 keys merged first) |
  | T20 is layout-independent of T10 (absolute overlay sibling of the Canvas) — safe in B phase-2; T22 reorders what T10 docked | T20: B phase-2; T22: convergence post-CP3 |
  | T11 needs T7's emissive values on its branch AND edits the `MachineStoryStage` region of MachineViewer.tsx (`:2387-2780`); T12 reuses T2's focus rig | T11: B phase-2 FIRST slot, after the CP2 merge brings T7; T12: convergence |
  | T27 extends T13's scene direction | Lane C order; astroclock bullet SKIPPED in lane C (see T27 lane split) |
  | T15 mobile CSS before the styles sweep that touches the same blocks | Convergence order (T15 before T23) |
  | T16 locks T1–T15; T28 locks T17–T27 (needs T17's guard, T18/T19 landed, hook from its own step 0) | Always last; NEVER cut |

- **Do not start a task whose dependency row is not yet on YOUR branch** — merge first (§0.5), then start.
- **If a task's manual verify fails,** fix within the task before committing — never carry a red gate forward.
  If a cited line has drifted (the tree is active), re-locate with the grep anchors given in each task; the
  structures (function names, testids, store fields) are the stable contract, not the line numbers.
- **Rollback unit = one commit.** Each task is independently revertable; nothing in this plan edits validated
  data, so `pnpm validate` red after your change means you touched something §Global-1 forbids — undo that hunk.
- **Time-boxing:** the §0.7 triage ladder replaces per-task time-boxes. If any single task balloons past ~2× its
  slot, land the steps that pass verification, commit, and `NEXT:`-note the remainder in
  `docs/SUBMISSION_NOTES.md` — T16/T28 must not be skipped under any circumstances.

## §5 Definition of done

1. All §1 B/H findings (F-01…F-10, F-25…F-27) demonstrably fixed in a live session; M findings fixed or explicitly
   deferred with a note; L findings fixed where their task landed. Every §1b backlog row is either landed or has a
   dated `NEXT:` note in `docs/SUBMISSION_NOTES.md`.
2. `pnpm test`, `pnpm validate`, `pnpm poison`, `pnpm i18n:check` (with the new dead-key guard), `pnpm e2e`
   (including `astroclock-ux.spec.ts` + `machines-ux.spec.ts`), `pnpm build` — all green at HEAD.
3. A first-time visitor at 1440×900 can, without instructions, on EVERY machine: see the full model on load
   (never a black canvas — F-25/F-26/F-31); watch a readable, camera-choreographed signature demo (astroclock
   escapement beat; seismoscope pick-a-bearing dragon fire; odometer counting 里; loom pattern cycle); understand
   what every aid chip shows; read every part-record field in either language without meeting a raw slug; use
   compare and exit it; finish the story with consistent framing; and never see the machine silently frozen.
4. Evidence screenshots exist in `artifacts/visual-gate-2/astroclock-qa/` AND
   `artifacts/visual-gate-2/four-machine-qa/`, and `docs/SUBMISSION_NOTES.md` records the wave.
