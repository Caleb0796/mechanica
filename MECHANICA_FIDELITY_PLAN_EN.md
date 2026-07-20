# Mechanica — High-Fidelity Upgrade Plan v2 (for Codex ultracode execution)

> **To the executor (Codex root orchestrator):** this file is the successor to `MECHANICA_PLAN.md` (v1, executed through wave-5 + visual-gate). Its goal is to take the ten machines — already **functionally green** — from "grey-box prototype" to "museum-grade visuals and legibility". Every v1 iron rule remains in force; this plan only adds geometry, presentation, and data. **Never alter any verified researched number** (tooth counts, dimensions, quotations, gear ratios). Every diagnosis below comes from a live inspection of the running site plus 12 parallel audits, each root cause carrying file:line evidence — do not re-diagnose; build.
>
> Generated: 2026-07-18 · Prior state: `pnpm test` 192/192, `pnpm e2e` 30/30, strict `pnpm validate` 10/10 green, clean-clone build reproducible (see `docs/SUBMISSION_NOTES.md`). The v1 Wave-6 release blockers (API-keyed extraction/audit artifacts, conflict closure) are **out of scope** here; the two tracks do not block each other.

---

## §0 Execution model and iron rules

### 0.1 ultracode verdict and startup

**Verdict: ultracode is warranted.** The work decomposes naturally into "shared core, serial (F0) → ten machines in parallel with disjoint file ownership (F1) → UI in parallel (F2) → gates, serial (F3)" — the same wave shape v1 already validated. If executing solo instead, follow F0 → F1 (machine by machine) → F2 → F3 in order; the content is unchanged.

Start Codex at the MECHANICA repository root. First prompt:

```text
$ultracode Read MECHANICA_FIDELITY_PLAN_EN.md in full and execute the high-fidelity upgrade on the existing Mechanica repo.
Route = full (understand → modify → verify → adversarial gate).
F0 is executed by a single worker, serially (src/ui/viewer/MachineViewer.tsx is the shared hotspot file; no parallel edits to it during F0);
F1 runs ten machine workers in parallel; F2 is a single serial UI worker (its layout tasks may overlap F1, its i18n tasks T3/T5 start only after the F1 tag) — ownership map in §7, no cross-ownership edits ever;
F3 acceptance commands are run by you (root) personally.
One commit per task (conventional commits; the few tasks §3 marks may land 2-3 named sub-commits); at the end of every wave run the deletion audit and tag (fidelity-w0 … fidelity-w3).
Every "visual improvement" claim requires screenshot evidence (pnpm e2e screenshots or manual playwright captures stored in artifacts/visual-gate-2/), and must survive skeptic adversarial review before it counts as DONE.
Never modify verified researched numbers; every new part/dimension ships with provenance; any [VERIFY] item follows the §4 verification procedure (snapshot receipts for quotations; root's manual cross-check against the v1 data card + stored snapshots for numbers — snapshot-sources cannot check numbers); what cannot be verified downgrades ONLY the affected numeric path to tuice, is recorded in docs/OPEN_QUESTIONS.md, and never blocks the merge.
Dispatch workers ONLY with the §0.4 template (paste full texts — workers have zero context beyond their prompt); close every task per the §0.5 universal delivery standard; run each wave by the §0.6 runbook and its exit-criteria table.
Do not stop to ask style questions; where the plan decides, comply; where it does not, apply §8 defaults and record the decision in the ledger.
```

### 0.2 Iron rules (inherited from v1 §0.2, two new)

1. Sub-agents run no shell; root runs every task's acceptance commands after collecting diffs.
2. Worker file ownership is mutually disjoint (§7); every worker prompt states "you are not the only agent editing this repo — never roll back or delete others' files".
3. At each wave close, root runs the deletion audit: `git diff --diff-filter=D --name-only <wave-start>..HEAD` and reviews the list against expected deletions; restore any teammate file a worker silently deleted (the old `--stat | grep` form does not reliably catch deletions).
4. Worker prompts are self-contained (full task text + work order + acceptance criteria pasted in) and end with `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
5. Concurrency cap 16; `close_agent` immediately on completion.
6. **New — visual-evidence rule:** any visual task's DONE must attach before/after screenshots; the skeptic walks the §6.2 checklist item by item trying to refute, and only a surviving claim counts.
7. **New — sacred-numbers rule:** existing `teeth/module/dimensions/quotations` in `parts.json` are read-only. Geometry upgrades may change geometry definitions, position/rotation, add parts, and add new fields (`assemblyCaption`, `textureVariant`); where an existing PLACEMENT contradicts the sources (this plan already names the astroclock inverted water circuit and the chariot sub-wheel orientation), fixing the placement is allowed — after which `pnpm validate` must return all ten reports green. Dimension REASSIGNMENT between parts (the bellows 0.94 m case in F1-09) additionally requires prior adjudication: verify against the v1 card + snapshot, record in docs/OPEN_QUESTIONS.md, then edit.
8. Committed artifacts are sanitized (as in v1: no absolute user paths, no session IDs).

### 0.3 Scope and non-goals

- **In scope:** IBL lighting, procedural PBR textures, per-machine usage scenes, camera choreography, drive-affordance redesign, assembly pacing, click-to-select fix, loading experience, per-machine geometry completion and data supplements, UI/copy/accessibility, visual gate re-run and renders regeneration.
- **Out of scope:** no external 3D model files (everything stays procedural), no physics engine, no runtime network dependency (RoomEnvironment comes from three/examples local code; drei `<Environment preset>` CDN HDRs are forbidden), no changes to v1's LLM artifact chain, no mobile-specific work (desktop first; just don't regress).


### 0.4 Codex execution contract (capabilities, I/O, templates)

**Capability matrix — the single most important fact of this plan:**

| Actor | CAN | CANNOT |
|---|---|---|
| root (you) | run shell (`pnpm`, `git`, `node`, playwright), read/write any file, spawn/close workers, commit, tag, capture screenshots | outsource verification — every command result must be observed by you |
| worker (sub-agent) | read any repo file; create/edit files **inside its ownership only**; reason over code statically | run ANY shell command (no pnpm/test/build/install/git), open a browser, take screenshots, access the network, edit outside ownership, see anything not pasted into its prompt |

Consequences you must internalize: workers prove things by **file:line evidence and static checklists**, never by "I ran it"; if a worker's report claims it ran anything, treat the claim as void and re-verify yourself. Workers have **no memory of this plan** — their prompt is their entire world; paste, never reference.

**Ledger**: one append-only file `.codex/ultracode/runs/<run-id>/ledger.md`, maintained by root only. Every task closure appends the §0.5-6 entry. Sanitized (no absolute user paths, no session IDs).

**Worker prompt template** (fill `<>`; PASTE full texts verbatim — never summarize or link):

```text
You are worker-<id> for wave <F0|F1|F2> of the Mechanica fidelity upgrade. Repo root: <path>.
You CANNOT run any shell command. You may only read repo files and create/edit files inside your ownership.
=== IRON RULES (verbatim §0.2) ===
<paste §0.2 in full>
=== DEFAULTS (verbatim §8) ===
<paste §8 in full>
=== YOUR WORK ORDER (verbatim) ===
<paste the FULL §3/§4/§5 section for this task or machine, including its Acceptance line>
=== OWNERSHIP ===
You may modify ONLY: <explicit path list for this worker>.
Everything else is read-only. You are not the only agent editing this repo; never revert or delete others' files.
=== SHARED PROTOCOLS (verbatim) ===
<paste the §7 "NEEDS_CONTEXT → F0.5" paragraph; for F1 workers ALSO paste the FULL §4 preamble (terminology + common requirements ①-⑦ + the per-machine acceptance)>
=== DELIVERY ===
Deliver per the Universal task delivery standard (§0.5, pasted below). Your Acceptance line arrives PRE-TAGGED by root ([CMD]/[EYE] per claim): satisfy every [CMD] via ASSERTIONS_ADDED; [EYE] items are root's to capture — never claim them done yourself. Your final message is ONLY the
structured report below — no prose before or after. Its last line is exactly one of:
DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
=== REPORT FORMAT ===
STATUS: <one line>
FILES_CHANGED: <one line per file: path — what/why>
COMMIT_MESSAGE: <ONE conventional-commit line for root to use, e.g. "feat(core): F0-T3 procedural PBR textures">
SELF_CHECK: <every §0.5-W item: PASS/FAIL + file:line evidence>
EVIDENCE: <file:line list backing your key claims>
ASSERTIONS_ADDED: <unit/e2e tests you added or changed, with paths — or "none">
CONCERNS: <or "none">
NEEDS: <precise spec of a missing shared capability per the §7 NEEDS_CONTEXT protocol — or "none">
```

**§0.5-W Worker static self-check** (by inspection — workers cannot execute):
1. Every JSON file I touched parses: balanced braces/brackets, quoted keys, no trailing commas (re-read the full file after editing).
2. Every new part carries `provenance.kind ∈ wenxian|wenwu|tuice` + `assemblyStep`; tuice without scheme tag carries a nonempty `note`; every numeric geometry path has provenance or a tuice `@rest`.
3. Every intended contact/penetration pair is parented (fixed joint) or added to `collisionWhitelist` with a comment.
4. My diff touches ONLY my owned paths; no researched number changed (re-scan my own edits line by line).
5. New user-facing strings are inline-bilingual (F1 aids/captions) or catalog entries (F2) — never mixed.
6. Every import I added resolves to a file that exists; every type/function I reference is defined (name its file:line in EVIDENCE).
7. Every [CMD]-class claim in my work order's Acceptance has a corresponding test in ASSERTIONS_ADDED (I cannot run it; root will).

### 0.5 Universal task delivery standard (every task, every wave)

1. **Scope** = exactly the task's Files list plus tests it names. Anything else a worker believes necessary goes to CONCERNS, not into the diff.
2. **Commit**: root stages exactly the files in FILES_CHANGED and commits with the worker's COMMIT_MESSAGE — format `<type>(<scope>): <task-id> <summary>`. One commit per task (sole exception: F0-T5 lands as 5a/5b/5c).
3. **Assertion classes — no claim stays prose**:
   - **[CMD]** any measurable claim in a task's Acceptance line MUST exist as a unit/e2e test added in that same task (worker writes it, root runs it).
   - **[EYE]** any visual claim needs BEFORE and AFTER screenshots captured by root into `artifacts/visual-gate-2/<task-id>/`, then skeptic review. A claim with neither a test nor screenshots does not count as delivered. Tagging is ROOT's job at dispatch: rewrite the task's Acceptance line into a per-claim checklist tagged [CMD]/[EYE] (ambiguous → [CMD]) and paste that tagged checklist into the worker prompt — workers never classify claims themselves.
4. **Standard screenshot command** (root; dev server running via `pnpm dev` — or `pnpm preview` after build):
   `pnpm exec playwright screenshot --viewport-size=1600,900 --wait-for-timeout=15000 "http://localhost:5173/#/m/<slug>" "artifacts/visual-gate-2/<task-id>/<label>.png"`
   Label convention: `before-*` / `after-*` / `scene-*` / `assembly-mid-*` / `aid-*`.
   The command above covers route-load states only. Interaction states (hover / cutaway / assembly-mid / aid / plain background / compare) use the state runner F0-T4 adds: `MECH_SHOOT=<slug>:<state> MECH_SHOOT_OUT=<path> pnpm exec playwright test e2e/shoot.spec.ts` — the only sanctioned way to capture non-route-load evidence.
   BEFORE images: at each wave start, capture the baseline set (all 10 machines, route-load + every state that wave's tasks will claim) into `artifacts/visual-gate-2/_baseline-w<n>/`; after-commit captures pair against these. Wave-0 exception (the state runner does not exist before F0-T4): the wave-0 start baseline is route-load only; immediately after F0-T4 closes, capture the interaction-state baseline for the states T5–T12 will claim into the same `_baseline-w0/`. Never reconstruct a "before" by checking out old commits mid-wave.
5. **Verification chain** (root, after applying the diff; run from repo root):
   | Command | Expected |
   |---|---|
   | `pnpm test` | exit 0; `0 failed` (total count GROWS above the 192 baseline — growth is expected, failures are not) |
   | `pnpm validate` (strict) | exit 0; `reports/summary.md` shows Fail=0 on all 10 rows |
   | `pnpm e2e` | exit 0; 0 failed (count grows above 30) |
   | `pnpm i18n:check` | exit 0 |
   | `pnpm build` | exit 0; `dist/` emitted |
   PASS = all of the above green + the task's own Acceptance assertions + screenshots archived. On FAIL: paste the failing output + the diff back to a FRESH worker (same template, plus the failure text); maximum 2 retries, then ledger the failure and DESCOPE under the only sanctioned waiver: a failing claim may be dropped ONLY if it is [EYE]-class polish that no §6.2 item or §9 DoD line depends on; record every descope in the ledger AND `docs/OPEN_QUESTIONS.md`. §6.2/§9-load-bearing claims are never descopable — the task stays open and the wave cannot tag.
6. **Ledger entry template** (append per task): `## <task-id> — <STATUS>` then `Files:` / `Verification:` (each command + its key output line) / `Evidence:` (screenshot paths, file:line list) / `Concerns:` / `Next:`.

### 0.6 Root runbook (execute each wave exactly like this)

Wave start: `mkdir -p .codex/ultracode/runs/<run-id> && git rev-parse HEAD > .codex/ultracode/runs/<run-id>/wave-<n>.start`; then capture the wave baseline screenshot set (§0.5-4) BEFORE the first task closes (wave 0: route-load only until F0-T4 lands — see the §0.5-4 exception).

- **F0**: for T1→T12 IN ORDER: dispatch ONE template worker (or self-execute) → collect report → §0.5 close (commit, verify, ledger). T6/T11/T12 must be closed before F1 opens. Then: full verification chain → deletion audit `git diff --diff-filter=D --name-only $(cat .codex/ultracode/runs/<run-id>/wave-0.start)..HEAD` (expected: ONLY deletions the ledger declares intentional) → `git tag fidelity-w0`.
- **F1**: dispatch up to 10 machine workers in parallel (template above; concurrency cap 16 total). A worker's final report is its HAND-OFF: after reporting it never writes again, and root `close_agent`s it immediately. Root begins closes only when EVERY dispatched worker has reported (no live writers in the tree; the F2 worker must likewise be between tasks — schedule F1 closes inside F2's idle gaps). Then close machines one at a time on top of last-green HEAD: static-review the report → `git add <that machine's paths> && git stash push --keep-index -u` (parks all other in-flight edits; disjoint ownership guarantees a clean pop) → run the chain + the machine's §4 acceptance + §6.2 captures → commit → `git stash pop`. Never verify with another machine's uncommitted edits in the tree. Machines that ended NEEDS_CONTEXT: root commits their partial work, DEFERS their acceptance until after the F0.5 re-dispatch. After all 10: collect NEEDS → at most ONE F0.5 hotfix round (core worker) → re-dispatch fresh workers only for affected machines. Full chain → deletion audit → `git tag fidelity-w1`.
- **F2**: ONE ui worker, execution order T1→T2→T4→T6→T7→T8→T9→T10 (may start once F0 is tagged, in parallel with F1), then T3→T5 once fidelity-w1 exists. Same per-task closes → full chain → deletion audit → `git tag fidelity-w2`.
- **F3**: root personally executes §6.1 T1→T5 (plus T2b) → `git tag fidelity-w3 && git tag fidelity-gate`.

**Wave exit criteria (all four columns required):**

| Wave | Gate commands green | Artifacts present | Tag |
|---|---|---|---|
| F0 | full chain + F0 task assertions | ledger entries T1-T12; before/after screenshots for T1/T3/T6/T7/T8/T9 | fidelity-w0 |
| F1 | full chain + 10× machine acceptance | ledger ×10; §6.2 screenshot sets ×10; OPEN_QUESTIONS updated for [VERIFY]/adjudications | fidelity-w1 |
| F2 | full chain + F2 task assertions | ledger T1-T10; responsive screenshots (1600×900, 1280×800) | fidelity-w2 |
| F3 | §6.1 table + §6.3 numbers | visual-gate-2 complete; renders ×40; SUBMISSION_NOTES section | fidelity-w3 + fidelity-gate |

**Skeptic mechanics (codex adaptation)**: the skeptic is a FRESH worker spawned by root with the §6.2 checklist and the claim under review. Evidence transfer: attach the screenshots as image inputs when the harness supports image attachments; where it does not, root writes a structured observation sheet (one line per §6.2 item: what is visible, where, measured how) and the skeptic cross-examines the sheet plus the pasted assertion outputs. The final [EYE] sign-off is root's own, recorded in the ledger with the evidence paths. The skeptic's job is refutation; a visual claim counts only after refutation fails. Never reuse the implementing worker as its own skeptic.

**Run bookkeeping**: `<run-id>` = UTC `yyyymmdd-hhmm` at wave-0 start, constant for the entire run. If a tag from an aborted earlier run already exists, suffix `-r2` / `-r3` … — never delete or move existing tags.

### 0.7 Glossary (terms this plan assumes)

ultracode / route=full = codex multi-agent orchestration mode (understand→modify→verify→adversarial gate) · root = the orchestrating agent running shell · worker = shell-less sub-agent · wave = F0/F1/F2/F3 batch closed by a git tag · ledger = `.codex/ultracode/runs/<run-id>/ledger.md` · skeptic = fresh refutation-only worker (§0.6) · data card = v1 research card `MECHANICA_PLAN_EN.md` §7 (NOT this file's §7) · provenance kinds = wenxian(text)/wenwu(artifact)/tuice(inference) · [VERIFY] = number/claim requiring the §4-① procedure before it may ship as non-tuice · aids = F0-T11 declarative principle-demo data · SceneSpec / customSceneBuilders = F0-T6 scene contract + per-machine prop registry · NEEDS_CONTEXT / F0.5 = §7 missing-capability protocol · machineReady / frameFill = F0-T5/T4 instrumentation on `window.__mech` · Visual Gate 2.0 = §6.2 checklist · full chain = the five-command table in §0.5-5.


---

## §1 Status inventory

### 1.1 Done (verified live + repo evidence)

- All ten machines online: parametric parts + kinematic graph + validation (`reports/summary.md`: astroclock 1,567 checks pass … gimbal 61, 0 fail).
- U1 disassembly/explode, U2 drag-to-drive full-train linkage, U3 scholar-scheme switching with side-by-side compare (≥5 machines), U4 part provenance panel, U6 ingenuity spotlight, flagship scroll stories, AI docent (mock/runtime), zh/en i18n, 33 quotation snapshot receipts green.
- Test system: 192 unit tests, 30 e2e, poison test 4/4 caught by the validator, clean-clone `pnpm build` reproducible.
- Git tags wave-0…wave-5, visual-gate.

### 1.2 Not done (what this plan adds)

- **The visual-fidelity layer was explicitly deferred**: `docs/SUBMISSION_NOTES.md` reopens the Visual Gate with the bar "semantic fidelity is blocking; fine ornament is optional", and marks the 40 render JPEGs as "not accepted as final render evidence". Every user complaint lands in this layer.
- v1 Wave-6 release blockers (API-keyed artifacts, audit-conflict closure) — **out of scope**, handled by the v1 track.

### 1.3 User complaint → root cause → task map

| # | User complaint | Root cause (evidence) | Fix tasks |
|---|---|---|---|
| 1a | Items look cheap, rough, structurally incomplete | No environment map anywhere — metals see only 3 flat lights (MachineViewer.tsx:1000-1015); the entire material system is 48 lines of 6 flat colors, bronze is grey-green `0x708b72` (materials.ts:12-17); mixed-attribute composite merges lose UVs (primitives.ts:103-105) while gears/lathes keep theirs — composites need build-time box-projected UVs before texturing; several machines are under-parted (gimbal 9 parts, bellows 10, wooden-ox 14) | F0-T1/T2/T3 + all ten F1 orders |
| 1b | The plus/minus signs look weird | Every drivable part carries a permanently visible HTML `− ↔ +` cluster (DriveHandle.tsx:154-198) — ~15 clusters on the astroclock — which also intercepts clicks | F0-T7 |
| 1c | Assembly progress is too fast | Playback hardcoded to 1600 ms total; parts pop in with no motion (MachineViewer.tsx:1853; assembly.ts:292-302) | F0-T8 |
| 2 | Seismoscope animals are unrecognizable | Dragons are squashed-sphere+capsule+cone collages that `mergeComposite` then rescales into an envelope box, destroying proportions (seismoscope/build.ts:147-281); the vessel is a translucent green sphere | F1-02 |
| 3 | Working principles unclear | Drivable parts are **explicitly excluded** from click-to-select (MachineViewer.tsx:637-643) so the U4 provenance panel never opens on them; event captions render raw slugs (`drive · left-road-wheel`); no principle annotations/flow particles/power-path highlights; some drivetrain layouts are physically wrong (astroclock constant-level tank sits above the reservoir — flow reads inverted; chariot sub-wheels mounted fore-aft with no meshing contact) | F0-T9 + F1 principle_aids + F2-T3 |
| 4 | Every page needs high fidelity, practical scene backgrounds, better material feel | Machines float in a black void (`<color #090a0a>` MachineViewer.tsx:999); ContactShadows hardcoded at y=-0.45 (:1088) | F0-T1/T3/T6 + F1 scene specs |
| 5 | Gimbal censer far too crude | 9 parts total; shell is a plain 48%-opacity half-sphere with no openwork, no hinge; the ring bands read as bare wire tori with no pivots or rivets (the two rings are in fact correctly orthogonal — adversarial review confirmed; do not "fix" them coplanar); default framing is inflated by the suspension chain in focusPartIds so the whole censer is ~30 px (visualRecovery.ts:92) | F1-10 + F0-T4 |
| 6 | Other UI issues | 15 findings (half-dead i18n catalog with copy drift, serif font never shipped, compare header overlap, docent pill covering sidebar, micro-type below legibility floor, …) — see §5.0 | all of F2 |

**Conclusion: the research data is NOT the deficit** (quotations, dimensions, ratios all exist and are verified). The deficit is geometric expression, rendering pipeline, and interaction presentation. The "data to supplement" is new structural parts plus scene/caption fields — all entering under the three-tier provenance regime.

### 1.4 Loading/perf as measured

- astroclock cold entry → first visible model ≈ 12 s (dev), black viewport meanwhile; chariot's default camera spawns inside a wheel for ~10 s; the story stage narrates over a black canvas; compare viewports stay black for seconds and the astroclock side is degraded to dpr 0.5 with no AA. Targets in §6.3.

---

## §2 Global root-cause register (basis of F0; all with file:line)

> Index of the rendering audit's 16 findings. Full evidence text is embedded in the §3 task bodies; workers do not need to re-read this table.

| Severity | Finding | Anchor |
|---|---|---|
| high | Permanent HTML drive clusters cover the model and intercept clicks | DriveHandle.tsx:154-198 |
| high | Drivable parts excluded from click-to-select | MachineViewer.tsx:637-643 |
| high | Assembly playback hardcoded 1600 ms; parts pop in | MachineViewer.tsx:1849-1866; assembly.ts:292-302 |
| high | BoundsRefit refits on every explode tick + blind 3-frame wait; gimbal fit inflated by chain, chariot lacks min-distance clamp | MachineViewer.tsx:249-311; visualRecovery.ts:92 |
| high | Every highlight/spotlight toggle rebuilds and disposes ALL part materials (fatal once textured) | MachineViewer.tsx:380-499, 528-544 |
| high | Mixed-attribute composite merges lose UVs (gears/lathes keep native UVs) — needs build-time box projection before texturing | primitives.ts:103-105; gears.ts:220-241 |
| medium | Selection fires on pointerdown, no click-vs-drag threshold | MachineViewer.tsx:640-643 |
| medium | Scrubbing the assembly slider during Reassemble strands all parts at explode offsets | MachineViewer.tsx:2284-2314 |
| medium | After spotlight ends, OrbitControls target is stale — first drag jumps violently | MachineViewer.tsx:172-247, 1019 |
| medium | Drive-drag delta sampled from the rotating mesh's own hit point — feedback jitter | DriveHandle.tsx:68-86 |
| medium | Instanced parts recompute bounding volumes every frame | primitives.ts:36-52 |
| medium | Compare canvases run frameloop=always; astroclock side degraded to dpr 0.5 no-AA | CompareView.tsx:240-244 |
| medium | Story canvas hardcoded dpr={1}; ghost layer rebuilds geometry with no cache | MachineViewer.tsx:1412, 837-909 |
| low | "Tap target slot" seats unconditionally, bypassing the snap game | MachineViewer.tsx:2363 |
| low | Auto-drive solves the full graph every frame even when idle | MachineViewer.tsx:983-995 |
| low | endAssemblyDrag mutates shared cached geometry | MachineViewer.tsx:625 |

---

## §3 F0 Global rendering core (single worker, serial, 12 tasks)

> Source: the rendering-architecture audit (full read of MachineViewer.tsx and the core libs), revised per the codex adversarial review. Dependency order: T2 (material cache) is a hard prerequisite of T3 (textures); T5 (async geometry) feeds T4 and the loading experience; **T6, T11 and T12 are F1's contracts and MUST land before F1 launches**; T7–T10 may interleave with F1. Under schedule pressure, T1→T2→T3→T4→T5 plus T6/T11/T12 is the minimum bar to open F1. One commit per task — sole exception: T5 lands as 3 named sub-commits (see task).

### F0-T1 Zero-network image-based lighting + tone mapping (RoomEnvironment + PMREM)

- **Priority**: P0 · **Risk**: Low code risk, high visual blast radius: every machine's exposure changes at once, screenshot-based e2e baselines will need regeneration; ACES slightly desaturates saturated emissives (retune spotlight highlight colors at MachineViewer.tsx:440-452).

- **Approach**: Create src/ui/viewer/SceneEnvironment.tsx: a component that, once per WebGLRenderer, builds `new PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture` (import RoomEnvironment from 'three/examples/jsm/environments/RoomEnvironment.js' — fully procedural, zero network; do NOT use drei <Environment preset> which fetches HDRs) and assigns scene.environment; a WebGL texture CANNOT be shared across renderers/contexts, so each Canvas generates its own PMREM environment in onCreated; reuse one module-level RoomEnvironment scene as the source, dispose the PMREMGenerator after fromScene, and retain the RenderTarget reference so unmount disposes it (no texture leak across mount cycles). Set on every Canvas: gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} (r155+ outputColorSpace SRGB is default), plus scene.environmentIntensity ≈ 0.9 and a subtle warm grade via scene.environmentRotation or a Color multiply on the hemisphere light. Mount it inside all three canvases: main viewer Canvas (MachineViewer.tsx:2230-2262), story Canvas (MachineViewer.tsx:1412), CompareView Canvas (CompareView.tsx:240-252). Then STRIP the current 5-light rig (MachineViewer.tsx:1000-1015: ambient 0.8 + hemisphere 0.9 + three directionals totalling ~5.9 intensity — this flat wash is why metals look dead) down to: one castShadow key directional (intensity ~2.2, warm), one cool rim, and hemisphere 0.35; the env map carries the rest. Retune the compensating emissive hacks in visualRecovery.ts (e.g. WARM_BRONZE emissiveIntensity 0.12, lines 123-129) down to ~0 once IBL lands.

- **Files**:
  - `src/ui/viewer/SceneEnvironment.tsx (new)`
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/compare/CompareView.tsx`
  - `src/ui/viewer/visualRecovery.ts`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; e2e screenshots show specular reflections on metals (before/after pair archived in artifacts/visual-gate-2/); `grep -R "Environment preset" src` returns nothing; EACH mounted canvas has scene.environment set (one PMREM per renderer — GPU textures cannot cross WebGL contexts) and its render target disposed on unmount (texture count flat across 5 mount/unmount cycles).

### F0-T2 Material system v2: cached shared materials + fix per-highlight material churn (prerequisite for textures)

- **Priority**: P0 · **Risk**: Medium: transient-state (assemblyError, spotlight, compare tint) rendering paths must be re-verified per machine; refcount bugs leak GPU memory silently.

- **Approach**: Must land before textures. Replace the per-part material useMemo (MachineViewer.tsx:380-499) which currently news up and disposes a MeshStandardMaterial on every highlight/spotlight/assembly/compare change. New src/core/materialCache.ts: `getMaterial(kind, variantKey)` returns a shared MeshStandardMaterial per (material kind × visual variant × shader-feature hash) — every shader-affecting feature (texture channels, alphaTest, box-UV) is baked at creation time and the material is treated as immutable afterwards (no onBeforeCompile mutation post-compile) — variantKey derived from visualMaterialFor(...) + geometry.userData.mechanicaMaterial, both hashed once per part. Highlight/error/ghost states become lightweight per-part CLONES created only while the state is active (clone() shares texture GPU uploads), or better: emissive tinting via mesh-level `onBeforeRender` uniforms so the shared material is never cloned for transient spotlight flashes. Dispose logic in PartNode (528-544) changes to refcount release on the cache — never dispose shared materials. This kills the 80-materials-per-toggle churn and makes texture memory bounded (~6 kinds × ~4 variants). LIFECYCLE (StrictMode-hardened): acquire/release live in useEffect only — never useMemo, whose abandoned renders leak acquisitions; release is idempotent; the cache keeps strong refs and defers actual disposal to an LRU / unmount-all sweep, so StrictMode's setup→cleanup→setup cycle can never dispose a material or texture the second setup still uses. Transient highlight/error/ghost states draw from a small PRE-BUILT pool of state materials (never per-toggle clones).

- **Files**:
  - `src/core/materialCache.ts (new)`
  - `src/core/materials.ts`
  - `src/ui/viewer/MachineViewer.tsx (PartNode material memo + dispose effect)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; toggle spotlight 20×: `renderer.info.memory.textures/geometries` stays flat; highlight / assembly-error / compare-tint paths eyeballed with no regression; StrictMode double-mount leaks none (refcount assertion).

### F0-T3 Procedural PBR textures: wood grain, bronze patina, lacquer, silk — canvas-generated, cached, with a UV strategy

- **Priority**: P0 · **Risk**: Medium: onBeforeCompile triplanar patch must be tested on the instancedMesh path (typecase) and with transparent silk; canvas generation (~15×512² ) adds ~100-200 ms — do it during the async warmup of upgrade 5.

- **Approach**: New src/core/textures.ts: pure-canvas generators returning {map, normalMap, roughnessMap} as THREE.CanvasTexture (RepeatWrapping, SRGBColorSpace for map only, anisotropy 4). Generators: (a) woodGrain(seed, tone) — concentric ring noise: value = sin(dist*ringFreq + fbmNoise*turb), two tones (DARK_WOOD #3a271d / LIGHT_WOOD #a86a38 from visualRecovery.ts:106-115 as base colors); (b) bronzePatina(freshness) — base tin-bronze #b08d57, blotchy malachite-green patina (#4e7c66) via thresholded fbm, roughnessMap inverted so patina is rough/wear-edges smooth; store the CORRECT palette: 青铜 fresh cast = golden #b08d57 (the current 0x708b72 in materials.ts:13-17 renders as fully-patinated green — keep that only as the 'excavated' variant), 鎏金 gilded = #d4af37 metalness 1.0 roughness 0.18 no patina, 生铁 cast iron = #3b3f42 roughness 0.55 with speckle; (c) lacquer(color) — near-black #1a0d0a with clearcoat feel (roughness 0.15 + faint brush-stroke normal); (d) silkWeave — fine crosshatch normal + alpha-less weave map. NormalMaps derived from the same height canvas via Sobel filter helper. Cache: module-level Map keyed `${kind}:${variant}:${seed}` — budget ≤12 triplets; map 512px sRGB, normal+roughness 256px (≈1.9 MB per triplet, ≈23 MB per context before mips). Textures load in the viewer and story canvases only; compare mode keeps untextured variant colors so a third WebGL context never uploads the set. Generators may also return an alphaMap (+alphaTest) channel for pierced/openwork surfaces (the gimbal shell) — the userData.mechanicaMaterial passthrough carries it end-to-end. Per-part override: extend the existing geometry.userData.mechanicaMaterial contract (already read at MachineViewer.tsx:382-390) with optional `textureVariant?: string` so build.ts customBuilders can request e.g. 'bronze:gilded'. UV strategy (required): the merge helpers already KEEP native UVs when every source supplies them (primitives.ts:76-105, gears.ts:220-241) — only mixed-attribute composites lose them. Fix at geometry level, not shader level: when any source lacks uv, box-project UVs once at build time inside the merge (dominant-normal-axis world-box projection, ~30 lines of CPU code), so map/normalMap/roughnessMap work everywhere including InstancedMesh with zero shader patching. No onBeforeCompile triplanar anywhere.

- **Files**:
  - `src/core/textures.ts (new)`
  - `src/core/materials.ts`
  - `src/core/materialCache.ts`
  - `src/ui/viewer/visualRecovery.ts (retire flat color table into variant names)`
  - `src/core/primitives.ts (keep, optional UV fixes)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; all material texture sets generate in ≤200 ms (performance.mark into ledger); typecase InstancedMesh and transparent silk paths intact; composites without native UVs get box-projected UVs at build time (no visible stretching); the alphaMap channel renders on the gimbal-shell fixture; renderer.info.memory.textures ≤ 40 per context.

### F0-T4 Camera choreography: authored home poses, intro dolly, and Bounds-fit hardening

- **Priority**: P0 · **Risk**: Medium: 10 hand-authored poses need per-machine visual QA; drei Bounds internals (bounds.to/refresh) are version-sensitive — prefer computing the fit manually from Box3 + fov and driving camera/controls directly to drop the drei dependency on this path.

- **Approach**: Extend ViewerProfile (visualRecovery.ts:6-16) with `homePose?: { position: V3; target: V3; fov?: number }` and `minDistanceFactor?: number`. Replace BoundsRefit (MachineViewer.tsx:249-311) with a CameraDirector that (a) waits for a 'geometry ready' signal from the async build pipeline (upgrade 5) instead of the blind 3-rAF delay at lines 267-273; (b) computes the fit, then clamps camera distance to `max(fitDistance, machineBoundingSphere.radius * (profile.minDistanceFactor ?? 1.6))` — this alone fixes chariot spawning inside a wheel; (c) for gimbal, fixes the tiny-render bug by fitting to focusPartIds bounds but VALIDATING: if focus box volume < 5% of scene box, fall back to whole-machine fit — and drop 'suspension-chain' from focusPartIds (visualRecovery.ts:92) since the long chain inflates the box; (d) removes `explode` from the refit deps (line 308) — explode scrubbing must not yank the camera; refit only on machine/scheme change; (e) plays an intro dolly: start at homePose.position * 1.35 with slight orbit offset, ease (1-(1-t)^3) to homePose over 1.2 s, OrbitControls disabled during, machine starts fully assembled (assemblyProgress=1, explode=0 — already the reset default at lines 1792-1793, keep it) so the entrance is calm. Also fix the spotlight exit jump: when SpotlightRig finishes, lerp OrbitControls.target to the spotlight look-at point before re-enabling controls (hook where enabled flips at line 1019). Also expose `window.__mech.frameFill()` (projected machine bounding-sphere diameter ÷ viewport short side) so the e2e framing assertions have real instrumentation. This task also adds the STATE-CAPTURE RUNNER e2e/shoot.spec.ts used by §0.5-4: parameterized via MECH_SHOOT=<slug>:<state> (states: hover | cutaway | assembly-mid | aid | plain | compare), it drives the UI into that state with playwright then saves the screenshot to the artifacts path passed in MECH_SHOOT_OUT — the only sanctioned way to capture non-route-load evidence.

- **Files**:
  - `src/ui/viewer/visualRecovery.ts (profile type + 10 machine poses)`
  - `src/ui/viewer/MachineViewer.tsx (BoundsRefit → CameraDirector, SpotlightRig target restore)`
  - `e2e/shoot.spec.ts (new — MECH_SHOOT state-capture runner)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; new e2e: after load every machine's bounding-sphere projection spans 45%–80% of the viewport's short side (via window.__mech.frameFill()); chariot first-frame camera distance > bounding-sphere radius; gimbal fills ≥40%; dragging the explode slider never refits the camera; no camera jump on first drag after a spotlight.

### F0-T5 Async geometry pipeline with real loading progress + shared cross-mode cache

- **Priority**: P0 · **Risk**: Medium-high: dispose/refcount lifecycle is the trickiest code in the viewer (PartNode cleanup 528-544 already branches three ways); time-slicing must not interleave with React StrictMode double-mount. Gate with the existing __mech e2e hooks.

- **Approach**: Today every PartNode builds geometry synchronously in useMemo on the render pass (MachineViewer.tsx:353-366) — the 80-part astroclock (involute ExtrudeGeometry gears, gears.ts:286-316) blocks main thread, story stages render empty, and compare viewports are black for seconds. Plan: (a) promote CompareGeometryCache (geometryCache.ts:15-58) to src/core/geometryCache.ts as the single MachineGeometryCache and pass it to PartNode in ALL modes (viewer, story GhostPartLayer, compare) — the acquire/release plumbing already exists, only the `compareContext?.geometryCache` gating changes; keep the existing carve-out for mechanicaUpdate geometries (geometryCache.ts:29-31). (b) New src/core/geometryWarmup.ts: `warmMachine(module, spec, onProgress)` builds part geometries in priority order — largest first, ranked by a cheap size proxy computed from the part DEF's declared dims (gear radius, box size, shaft length), since real bounding spheres do not exist until after the build in time-sliced chunks: build until 8 ms elapsed, then setTimeout(0)/requestIdleCallback, reporting {built, total}. (c) MachineViewer mounts a skeleton stage while warming: render flat-shaded Box3 placeholder meshes from part.position + a cheap size guess (or just a centered spinner + progress bar HUD div over .viewer-canvas), swap parts in as their geometry resolves — PartNode reads from cache synchronously (instant hit) once warm. (d) Scheme switches become free because applySchemePatch changes only a few parts and the JSON-keyed cache (geometryCache.ts:11-13) hits for the rest. Target: first pixels < 500 ms (skeleton), full astroclock < 3 s. Measure with performance.mark around warmMachine. Warmup is owned by one hook with a cancellation token: unmount / StrictMode remount cancels cleanly and re-enters idempotently. On completion it publishes `machineReady` (store flag + window.__mech.machineReady timestamp) — consumed by F0-T4's CameraDirector and F2-T2's poster fade. Lands as 3 named commits: (5a) cache unification + lifecycle, (5b) time-sliced scheduler + cancellation, (5c) skeleton stage + ready signal.

- **Files**:
  - `src/core/geometryCache.ts (moved+renamed)`
  - `src/core/geometryWarmup.ts (new)`
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/compare/CompareView.tsx`
  - `src/ui/compare/geometryCache.ts (re-export shim)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; astroclock cold entry: skeleton <0.5 s, first visible model <3 s (performance.mark data in ledger); scheme switch <500 ms; warmup cancellation verified under StrictMode remount; lands as the 3 named sub-commits (5a/5b/5c).

### F0-T6 Per-machine SceneSpec: ground, backdrop, props, fog, light rig, ambient motion

- **Priority**: P1 · **Risk**: Low-medium: fog + transparent materials (silk, ghost layers) need depthWrite checks; scenery triangle budget must stay under ~50k to protect the astroclock frame rate.

- **Approach**: New src/ui/scene/types.ts: `interface SceneSpec { ground?: { kind: 'courtyard-stone'|'timber-floor'|'rammed-earth'|'water'; radius: number; y?: number }; backdrop?: { kind: 'gradient-cyclorama'; colors: [string,string] }; fog?: { color: string; near: number; far: number }; lightRig?: 'hall'|'courtyard'|'night'; props?: Array<{ kind: 'column'|'lantern'|'plinth'|'water-channel'|'custom'; builder?: string; params?: Record<string, number>; position: V3; scale?: number }>; ambientMotion?: Array<{ kind: 'dust'|'water-ripple'|'lantern-flicker'|'custom'; emitter?: string; params?: Record<string, number> }> }`. Each machine optionally exports `scene` from src/machines/<slug>/scene.ts, registered on MachineModule (add optional field in src/sim/types). Renderer src/ui/scene/MachineEnvironment.tsx builds ground disc (CircleGeometry + the procedural textures from upgrade 3), gradient cyclorama (large inverted open cylinder with vertex-color gradient, replaces the flat `<color #090a0a>` at MachineViewer.tsx:999), THREE fog on scene, and simple prop meshes. Mount it OUTSIDE `<Bounds>` (as a sibling after MachineViewer.tsx:1083) so the camera fit ignores it, set `raycast = () => {}` on every scene mesh plus `userData.mechanicaScenery = true` so part picking, SceneComplexityProbe triangles (810-835) and any validators can skip it. Ground y = machine Box3 min.y (computed post-warmup) instead of the hardcoded ContactShadows y=-0.45 (line 1088, currently wrong for tall machines); keep ContactShadows but reposition to the computed floor, or swap to a receiveShadow ground material with the single shadow-casting key light. OrbitControls target stays on the machine (unchanged, it derives from Bounds fit). Skip scenery entirely in compare mode and story cutaway steps (already distinguishable via compareContext/storyCamera props). kind:'custom' resolves `builder`/`emitter` by name from the machine module's own `customSceneBuilders` registry (registered in build.ts — machine-owned), so F1 workers add bespoke props (gnomon, furnace, city gate, desk, stars, banners…) without ever touching src/core or src/ui. SceneComplexityProbe change: scenery is NOT skipped — it is counted in a separate `sceneryTriangles` counter (machine counter unchanged, so the existing <150k e2e keeps its meaning) and a new e2e asserts sceneryTriangles ≤ 30k.

- **Files**:
  - `src/ui/scene/types.ts (new)`
  - `src/ui/scene/MachineEnvironment.tsx (new)`
  - `src/machines/<slug>/scene.ts (10 new, ~15 lines each)`
  - `src/sim/types.ts (optional scene field)`
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/store.ts (showScene flag — owned by F0 here; ui worker takes the file over in F2)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; with the template scene (gimbal) mounted, existing e2e framing assertions stay green; scene meshes have raycast disabled (clicks pass through to parts); plain-background toggle works; sceneryTriangles counter reports ≤30k and the machine-triangle counter is unchanged.

### F0-T7 Drive affordance redesign: kill the −↔+ clusters, hover/selected ring gizmo, keep keyboard, one-time coach hint

- **Priority**: P1 · **Risk**: Medium: e2e tests target .drive-buttons/data-drive-part-id (DriveHandle.tsx:157) and must migrate to the toolbar button + gizmo test ids; plane-raycast math needs care for axes nearly parallel to the view ray (fall back to screen-arc drag around the projected axis).

- **Approach**: Delete the permanent <Html> block from DriveHandle.tsx:154-198 (this also fixes the click-swallowing finding). Replace with: (a) affordance at rest — drivable parts get a faint 8%-emissive pulse every ~6 s (shared clock uniform, no per-part material clone); (b) on hover OR selection, show a 3D ring gizmo: TorusGeometry aligned to part.joint.axis at the part's world position, additive fresnel shader, with a small arrow cone indicating positive direction; pointer-drag anywhere on the part drives it — the group-level pointer handlers at DriveHandle.tsx:45-96 already do this, but FIX the delta math: on beginDrag store the rotation plane (point on axis + axis normal), then per move raycast event.ray onto that fixed plane and compute signed angle delta about the axis between successive plane hits — removes the event.point-on-rotating-mesh feedback jump and the screen-space fallback at lines 73-77; (c) keyboard: render ONE visually-hidden focusable button per selected drivable part in the DOM toolbar (not <Html>), reusing handleKeyDown (98-107) arrow-key steps — preserves the existing aria labels and e2e keyboard path; (d) coach hint: first visit per browser (localStorage 'mechanica:drive-coach'), show a one-time HTML overlay near the primaryDrive part: 'drag the glowing wheel' with a curved-arrow SVG, dismissed on first successful drive; (e) touch: add an invisible raycast-only fat collider (CylinderGeometry around the axis, radius ×1.5, material visible=false) as drag target so finger drags don't slip off thin cranks; drive deltas already flow through the same handlers.

- **Files**:
  - `src/ui/viewer/DriveHandle.tsx (rewrite)`
  - `src/ui/viewer/DriveGizmo.tsx (new)`
  - `src/ui/viewer/MachineViewer.tsx (hover state plumb)`
  - `src/ui/store.ts (hoveredPartId)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; no `.drive-buttons` in the DOM (new e2e assertion); keyboard ←/→ drive kept with bilingual aria-labels; coach hint appears once only; the three selector sites e2e/smoke.spec.ts:193, 322, 441 migrated.

### F0-T8 Assembly rework: part-count-scaled duration, staggered per-part flight, captions, grounded reassembly

- **Priority**: P1 · **Risk**: Medium: the per-part progress term interacts with explode, crank poses (556-568) and reassemble drag offsets in the same useFrame — needs a single documented composition order; e2e assembly hooks (window.__mechAssembly) semantics preserved.

- **Approach**: (a) Duration: replace the 1600 ms constant (MachineViewer.tsx:1853) with `clamp(orderedPartIds.length * 280, 2000, 20000)` from assembly.plan. (b) Per-part choreography: derive per-part local progress inside PartNode instead of the binary visible cut — `pi = clamp(progress * N - orderIndex, 0, 1)` (pass orderIndex via a Map from assembly.plan.orderedPartIds), then position = seatPos + flightOffset * (1 - easeOutCubic(pi)) where flightOffset = radialExplodeVector(part) * 2 + [0, 0.3, 0]; scale/fade in over the first 15% of pi. Wire into the existing useFrame position composition (MachineViewer.tsx:583-598) as one more additive term, and relax isPartVisibleInAssemblyStep (assembly.ts:292-302) to show parts once pi > 0. Scrub keeps working for free because everything derives from assemblyProgress. (c) Captions: during play, show assembly.currentPartName (already computed, assembly.ts:406-409) plus optional per-step caption — add `assemblyCaption?: {zh,en}` to PartDef consumed from parts.json; render in the existing .assembly-current slot (MachineViewer.tsx:2369-2373). (d) Reassemble mode never floats parts: replace setExplode(1) at line 2311 with a staging layout — unseated parts arranged in a grid on the scene ground plane beside the machine (positions computed from machine Box3 + per-part boundingSphere, stored in assembly plan), so nothing hangs in air; on completion (completionEffectToken effect, 1895-1910) animate any stragglers home over 600 ms instead of snapping explode to 0. Also fix the scrub-during-reassemble bug by resetting explode in the slider onChange (2284-2288).

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/viewer/assembly.ts (staging layout, captions passthrough)`
  - `src/sim/types.ts (assemblyCaption)`
  - `machine parts.json caption VALUES are added by each F1 machine worker in its own file — F0 lands only the type + rendering`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; assembly duration asserts the formula clamp(N×280 ms, 2.5 s, 20 s) ±10% with N read from window.__mechAssembly plan length at runtime (astroclock ≈18–22 s today; windows track F1 part growth automatically); captions name the current part (Chinese names on the zh page); scrubbing mid-Reassemble leaves no floating parts (explode resets — the §2 known defect).

### F0-T9 Part selection reliability: click-vs-drag threshold, hover outline, guaranteed Part record

- **Priority**: P1 · **Risk**: Low: back-face shell doubles draw calls only for the single hovered/selected part; touch hover is a no-op (selection still works via tap).

- **Approach**: (a) Threshold: in PartNode, record pointerdown clientX/Y; select on pointerUP only if movement < 5 px and < 300 ms — replaces the pointerdown-select at MachineViewer.tsx:637-643, and REMOVE the `part.interactive` exclusion so drivable parts are selectable too (a tap selects, a drag drives — the threshold disambiguates). Do not stopPropagation on pointerdown for non-drive parts so OrbitControls still orbits from anywhere. (b) Hover outline: cheapest robust option is a back-face shell — on hover, render a second mesh with the same geometry, side:BackSide, gold flat material, scaled 1.02 along normals — no postprocessing pass. InstancedMesh parts do NOT use the scaled shell (scaling an instanced outline scales instance translations around the batch origin, not each instance along its normals): hovered instanced parts use per-instance emissive tint via instanceColor, or re-render the single hovered instance as one non-instanced shell mesh built from its instanceMatrix; drive it from a hoveredPartId in useUiStore (the compare path already has onHoverPart plumbing at 731-738 to generalize). (c) Guarantee: setSelectedPartId already feeds PartInspector (2403) — add a scroll-into-view + flash on the panel when selection changes, and a selected-part outline (same shell, brighter) so the user always sees what the record refers to. (d) With the HTML drive clusters gone (upgrade 7) the main click thief is removed; verify with an e2e that clicks every part id via raycast helper. Selection is decided on pointerUP in ONE shared helper used by BOTH PartNode and DriveHandle: DriveHandle's pointerdown records the candidate and captures the pointer but never selects and never suppresses the click path — this is what actually makes drivable parts selectable.

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx (PartNode)`
  - `src/ui/viewer/DriveHandle.tsx (pointerdown no longer selects; shared click-vs-drag helper)`
  - `src/ui/store.ts`
  - `src/ui/panels/PartInspector.tsx (flash/scroll)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; new e2e: clicking a chariot wheel populates the Part record panel with name + provenance badge; orbit drags never select; on drivable parts tap=select and drag=drive coexist (shared pointerup helper covers DriveHandle too); hovered InstancedMesh parts highlight via instanceColor (no scaled-shell artifact).

### F0-T10 Performance guardrails: dpr policy, demand frameloop, shadow budget, instancing sweep

- **Priority**: P2 · **Risk**: Low-medium: frameloop='demand' in compare must invalidate on hover-tint changes too (tintForPart depends on hoveredPartId) or highlights will lag one interaction; removing per-frame bounds recompute requires frustumCulled=false on parts whose instances travel far (chainpump chain).

- **Approach**: (a) dpr: story Canvas dpr={1} → dpr={[1,2]} (MachineViewer.tsx:1412); compare: drop the astroclock dpr 0.5 + antialias:false hack (CompareView.tsx:240-244) and instead set frameloop='demand' on both compare canvases with invalidate() called from drive() (CompareView.tsx:172-183) and camera-sync frames (LinkedCamera 72-106 → invalidate the follower only on revision change) — compare graphs only change on button press, so this reclaims the full-res budget and deletes the half-resolution apology notice (259-265); keep the frame-counter e2e hook by counting invalidations. (b) Main viewer: keep frameloop='always' while the auto-drive runs, but add an idle governor — after 30 s without interaction, pause auto-drive (setPaused) and switch to demand; any pointer event resumes. (c) Shadows: one shadow-casting light only (already true post-upgrade-1); fit its shadow camera to the machine Box3 after warmup, mapSize 1024, and set castShadow=false on parts whose boundingSphere radius < 2% of machine radius (bolt-scale parts add cost, no visible shadow). (d) Instancing sweep: audit repeated-geometry parts — typecase type slugs (24k), loom heddles, chainpump pallets — and convert their build.ts to the existing mechanicaInstances contract (primitives.ts:11-52) where not already; fix the per-frame cost by removing computeBoundingBox/computeBoundingSphere from applyMechanicaInstanceMatrices (primitives.ts:50-51) and computing them once at build time (store on userData), with frustumCulled=false as the safe fallback for animated instances. (e) Keep SceneComplexityProbe dev-only per-frame traverse as-is (guarded by hooksEnabled) but memoize per-mesh triangle counts keyed by geometry uuid. e2e renegotiation (sanctioned, see §8-7): the compare fps test (e2e/smoke.spec.ts:841-864) becomes two-phase — ≥40/25 fps DURING interaction, zero redraws while idle.

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/compare/CompareView.tsx`
  - `src/core/primitives.ts`
  - `instancing conversions in machine build.ts are executed by each machine's F1 worker following this guidance — F0 fixes only primitives.ts and documents the contract`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; story canvas dpr=[1,2]; compare viewports run full-res with the two-phase fps e2e (≥40/25 fps during interaction, zero redraws idle — sanctioned renegotiation, §8-7); after removing primitives.ts:50-51 per-frame bounds recompute, chainpump/typecase frame rates logged in ledger.

### F0-T11 Principle-aid runtime contract — declarative `aids` rendered by a core AidLayer

- **Priority**: P0 · **Risk**: Medium: callout projection must track the camera each frame; particle emitters need the shared clock; schema strictness can reject legacy fields — sweep existing data jsons before enabling rejection.

- **Approach**: The contract that lets F1 workers ship principle demos WITHOUT touching src/ui. MachineModule gains `aids?: PrincipleAid[]` with exactly five shapes: { kind:'powerPath', sequence: partId[], dwellMs? } · { kind:'callouts', anchors: Array<{ partId, label:{zh,en} }> } · { kind:'flowParticles', flavor:'water'|'grain'|'thread'|'smoke'|'sparks'|'custom', emitter?, pathPartIds, rate? } · { kind:'cutaway', partIds, label:{zh,en} } · { kind:'subDemo', triggerId, caption:{zh,en} }. ALL user-facing strings are inline bilingual — never global i18n catalogs, so machine files stay collision-free with the F2 i18n sweep. New src/ui/viewer/AidLayer.tsx renders all five kinds: path-highlight sequencing on the existing highlight plumbing, camera-projected HTML callout anchors, GPU Points emitters along part chains ('custom' resolves through customSceneBuilders), cutaway via per-part material transparency toggle, subDemo buttons wired to mechanism.triggers. src/sim/types.ts + src/data/schema.ts validate `aids` and REJECT any other unknown display field — ad-hoc per-machine fields (e.g. a typecase sectorLabels array) must be expressed as one of the five shapes (sector labels = callouts). §6.2 item 6's '≥3 principle_aids live' is measured against this layer.

- **Files**:
  - `src/ui/viewer/AidLayer.tsx (new)`
  - `src/sim/types.ts`
  - `src/data/schema.ts`
  - `src/ui/viewer/MachineViewer.tsx (mount)`
  - `tests/data/data.test.ts (schema fixtures incl. negative case)`
  - `src/machines/gimbal/build.ts (minimal aids[] template ONLY — the §7 carve-out fixture, handed over to worker-gimbal at the F0 tag)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; the §7 carve-out template machine (gimbal build.ts, handed over after F0) declares ≥3 aid kinds and AidLayer renders them — verified by e2e/aids.spec.ts (new in this task): after a scripted 500 ms orbit drag, each callout DOM anchor sits within 8 px of the projected part position at 3 sampled checkpoints, and the AidLayer per-frame update averages ≤2 ms over 60 frames (dev perf hook); a schema fixture with an undeclared display field FAILS validate (negative test); aid strings render bilingual without touching the global catalogs.

### F0-T12 Composite custom-builder & material-channel contract — multi-geometry parts, alpha channels, validation union

- **Priority**: P0 · **Risk**: Medium: collision cost grows with union size — keep the cap; alphaTest surfaces stay solid for raycast (acceptable: clicking the shell selects the shell).

- **Approach**: customBuilders may return BufferGeometry | BufferGeometry[]. PartNode renders an array as ONE group under the part transform, each entry honoring its own geometry.userData.mechanicaMaterial — the override reader (MachineViewer.tsx:382-406) is extended to pass through alphaMap/alphaTest/side. buildPartGeometry (primitives.ts:214-230) passes arrays through unchanged. The validation side samples the UNION: scripts/validate.mts and src/validate/collision.ts treat a multi-geometry part as merged triangle soup for collision sweeps and triangle budgets. This is what makes the F1 recipes implementable as specified (astroclock timber tower / globe-in-casing, gimbal pierced shell + solid rims + hinge) without Group-typed hacks. src/core/geometryCache.ts becomes array-aware (cache entry = the array; acquire/release refcounts the set as one unit). Channels passed through: alphaMap, alphaTest, side, normalMap, bumpMap. Named fixtures (created in THIS task): a composite two-material fixture part added to the core-owned demo machine (src/ui/demo.ts, route #/m/demo); unit test tests/core/compositeBuilder.test.ts (array passthrough + union collision sampling on a deliberately overlapping fixture); e2e e2e/composite.spec.ts (demo route renders 2 meshes under the one part transform, asserted via the __mech scene hook). Per-part geometry count capped at 4; instanced entries inside arrays are NOT allowed (defer).

- **Files**:
  - `src/core/primitives.ts`
  - `src/ui/viewer/MachineViewer.tsx (PartNode)`
  - `src/core/geometryCache.ts (array-aware entries)`
  - `src/validate/collision.ts`
  - `scripts/validate.mts`
  - `src/ui/demo.ts (composite fixture part)`
  - `tests/core/compositeBuilder.test.ts (new)`
  - `e2e/composite.spec.ts (new)`

- **Acceptance (root)**: `pnpm test && pnpm validate && pnpm e2e` all green; tests/core/compositeBuilder.test.ts green (array passthrough + union sampling; the deliberately overlapping fixture flags as expected); e2e/composite.spec.ts green — the #/m/demo composite fixture renders 2 meshes under one part transform (via the __mech scene hook); `pnpm validate` green with a multi-geometry part.

---

## §4 F1 Ten machine high-fidelity work orders (10 workers in parallel, disjoint ownership)

> **Terminology**: throughout the work orders, "data card" / "the card" = the v1 research card — `MECHANICA_PLAN_EN.md` §7 (Chinese original `MECHANICA_PLAN.md` §7) — NOT this document's §7 (which is the ownership map).
>
> Each work order is self-contained: a worker receives only its own order + the §0.2 iron rules + §8 defaults. Common requirements:
> ① new parts go into the machine's `parts.json` with `provenance` (kind ∈ wenxian|wenwu|tuice) and an `assemblyStep`. **[VERIFY] procedure**: a quotation gets a snapshot receipt via `scripts/snapshot-sources.mts`; a NUMBER is cross-checked by root against the v1 data card + stored snapshots (the script cannot verify figures); what fails verification downgrades ONLY the affected numeric path to tuice (existence provenance stays) and is recorded in `docs/OPEN_QUESTIONS.md` — never blocking the merge;
> ② custom geometry goes into this machine's `build.ts` `customBuilders` only (multi-geometry composites per the F0-T12 contract); bespoke scene props/particle emitters register in the machine's own `customSceneBuilders`; never edit shared `src/core/**` or `src/ui/**` (truly blocked → the §7 NEEDS_CONTEXT protocol);
> ③ `scene.ts` exports per the F0-T6 `SceneSpec` contract and registers on the module in `build.ts`;
> ④ principle aids are DECLARED as `aids` data per the F0-T11 contract (five shapes; inline bilingual labels — never the global i18n catalogs); demo triggers still plug into `mechanism.triggers`;
> ⑤ existing researched numbers are read-only; placement/orientation corrections are allowed (then `pnpm validate` must return all green); dimension REASSIGNMENT between parts requires the §0.2-7 adjudication first;
> ⑥ every intended contact/penetration pair is either parented via a fixed joint or added to `collisionWhitelist` with a comment — strict collision validation treats un-whitelisted overlap as failure;
> ⑦ provenance completeness per `src/validate/provenance.ts:51-149`: a tuice part without scheme tags carries a nonempty note; every numeric geometry path carries provenance or a tuice `@rest`.
>
> **Acceptance (root, identical per machine)**: `pnpm test -- tests/machines/<slug>.test.ts` passes; full `pnpm validate` 10 reports green; `pnpm e2e` green (cases touching this machine); §6.2 six-item visual checklist verified by ROOT-captured screenshots (standard command in §0.5-4) + skeptic review — workers cannot run shell or browsers and never self-audit visuals; every structure-gap line either fixed or DESCOPED strictly per §0.5-5 (ledger + docs/OPEN_QUESTIONS.md entry; anything a §6.2 item depends on is not descopable). A NON-numeric [VERIFY] claim (existence/construction, e.g. a hinge) that fails verification keeps its part but downgrades provenance.kind to tuice with a note naming the missing source — recognition-critical parts ship as tuice rather than being dropped.

### F1-01 Astronomical Clock Tower 水运仪象台 `astroclock`

**Estimated effort**: 9-11 engineer-days total: tower architecture + pagoda facade 2d; tianheng escapement assembly + wheel upgrade 2d; armillary + celestial globe/casing 1.5d; water circuit (reorder, two-stage noria, chain, channels) 1.5d; jack figurines + props 1d; principle aids (power-path, particles, ratio HUD, cutaway wiring) 1.5d; scene 1d; data/provenance entries + source-check pass 0.5d. Triage floor: tower+escapement+armillary+globe+chain (~5.5d) delivers the at-a-glance recognition bar.

**Current state**: The kinematic/provenance layer is genuinely good (36-scoop escapement state machine, 36/100 lockstep train, belt-chain, phase-staggered tier cams, honest tuice notes, 9-step story), but the geometry is a schematic that no visitor would recognize as Su Song's tower: the "tower" custom builder emits exactly three flat tapered quads (open south, no roof, no floors, no platform, no timber), the 浑象 celestial globe part is literally an 8-spoke sprocket with no sphere, and the armillary is three orthogonal 0.9m torus rings with no nesting, tilt, sighting tube, or mount. The famous escapement is five plain BoxGeometry sticks (gecha/guanshe/tianguan/tiansuo-l/r) hovering ~2m in front of the wheel plane with no 天衡 balance beam, no counterweights, no 天条, and nothing physically touching the wheel. Placement bugs invert the machine's logic: the 平水壶 constant-level tank sits ABOVE the 天池 reservoir (documented flow is 天池→平水壶→scoops), the celestial column (x=5) and the entire water-return group (x=8) float in mid-air outside the 7m base, and the five chime tiers are bare shelves with box-jacks floating at z=5, stretched over the full 12m height instead of forming the lower south pagoda facade. Net effect: a wheel-with-cups between dark planes, not the tiered Cosmic Engine.

**Structure gaps (reconcile line by line)**:
- Tower architecture is absent: no corner posts/timber frame, no interior story decks (machine hall / globe chamber / top platform), no balustraded open observation platform, and no removable plank roof (板屋) over the armillary. The tiered-tower silhouette IS the artifact's identity — every museum reconstruction (Taichung/Kaifeng/NMC 1:5) is recognized by it, and the source quote 「臺四方而再重，上狹下廣」 is currently expressed as 3 naked quads.
- Five-story jackwork pagoda facade (木閣五層) missing: the south face should carry five stories of columns, doorways, mini-eaves, and railings where jacks appear; currently five floating beams at z=5 spanning y=1..9. The pagoda front is the clock's public face and the payoff of the whole mechanism; without it the jacks read as debris.
- Escapement superstructure missing: no 天衡 balance beam pivoted above the wheel, no 天权/枢权 counterweights, no 天条 rod linking beam to 关舌, no 枢衡, no bearing posts (东西天柱) carrying the 左右天锁 on their cross-beam, and no 铁拨牙 trip lugs on the wheel rim to strike the 格叉. Without the weighbridge architecture the negative-feedback principle — the machine's world-first claim — is illegible: sticks wiggle in space with no causal contact.
- 浑象 celestial globe does not exist as a globe: only its drive sprocket is modeled. The half-exposed star sphere in its casing (半露出柜) is one of the tower's three signature elements (仪 / 象 / 报时).
- The 天梯 chain — explicitly cited in provenance as one of the world's earliest power-transmitting chains — has zero geometry; two identical sprockets rotate in sympathy with nothing between them. Same for the 枢轮→天柱 junction: no gears touch anywhere in the model.
- Water circuit is broken and incomplete: 平水壶 floats above 天池 (flow reads upside-down vs 「平水壺受天池水注入受水壺」), no spout aims at the filling scoop, no 退水壶 sump under the wheel, only ONE lift wheel (text and data card record upper AND lower 升水轮, both 五尺六寸), no noria pots on it, no 河车 hand-crank (the only human-powered input), and no 天河 return channel — 「周而復始」 is currently unreadable. The whole group also floats outside the building at x=8.
- Armillary mount missing: no polar-axis tilt (~34.8° for Kaifeng), no nested 六合/三辰/四游 ring hierarchy, no 望筒 sighting tube, no support columns/base — it reads as a desk gyroscope, and at r=0.9 it is undersized relative to the 12m tower (hence the 'tiny wireframe ball' observation).
- Jack context props missing: tier 1 text specifies bell-shake / drum-strike / zhong-strike (左摇铃、中击鼓、右扣钟) and tier 5 shows night-watch placards; jacks are featureless 0.22m boxes with nothing to strike and no doorways to appear in.

**Geometry upgrade recipes**:
- **tower-shell** — Replace 3-quad cutaway with a timber-framed tiered tower: posts, story decks, top platform with railing, ajar removable roof, half-open east face as the cutaway boundary
  - Recipe: Compose in the custom builder from instanced primitives: 4 tapered corner posts (BoxGeometry scaled per-story), horizontal ring beams at story heights y≈3.3/6.6/9.2 (12 boxes), thin inset wall panels between posts (leave south face open above the pagoda and east face half-height for cutaway), top deck plate at y≈9.2 + balustrade as InstancedMesh (~40 posts, 8 tris each) + TubeGeometry handrail, hip roof from 4 ExtrudeGeometry trapezoid slabs lifted 0.4m and slid 0.6m north to read as 'removable plank roof ajar', shallow eave strips (ExtrudeGeometry triangle profile) over each south-face story. ~8k tris total with instancing.
- **shulun** — Upgrade generic spoked wheel to the documented triple-rimmed scoop wheel with trip lugs, hub, axle, and bearing posts
  - Recipe: Keep r=1.716; add 3 concentric rim hoops (central TorusGeometry + two side hoops offset ±width/2, minor r≈0.035) expressing 束以三輞; keep 72 spokes but pair them into 36 V-stations (rotate each pair ±2.5°); add 36 iron 铁拨牙 lugs as InstancedMesh wedges (BoxGeometry 0.1×0.05×0.04 chamfered by vertex nudge) on the outer rim aligned with scoop mouths; add hub cylinder (r 0.12) and horizontal axle CylinderGeometry spanning to two new pillow-block posts; axle end carries a small pin-gear (existing gear primitive) meshing the celestial-column foot gear.
- **gecha + guanshe + tianguan + tiansuo-l + tiansuo-r** — Rebuild the five loose sticks as one coherent tianheng weighbridge anchored above the wheel, with parts actually overlapping the lug circle
  - Recipe: Cross-beam between the two new bearing posts directly over the wheel. 天衡: 1.7m beam via ExtrudeGeometry (tapered side profile) on a saddle pivot; hang 天权 and 枢权 as LatheGeometry bell-weights on TubeGeometry hooks at beam tail. 格叉: Y-fork = shaft box + two prong boxes merged, tip rotated down to sit under the 3-o'clock scoop path. 天条: thin TubeGeometry rod from beam nose down to 关舌, a small chamfered paddle. 天关 and both 天锁: L-profiles (ExtrudeGeometry L shape, 0.55m) mounted on the cross-beam with tips penetrating the lug radius so blocking/releasing visibly contacts the 36 lugs. Reposition everything from z≈2.0-2.3 onto the wheel plane (z≈0±0.25).
- **armillary-sphere** — From 3 orthogonal tori to a nested, tilted, mounted armillary at platform scale
  - Recipe: Scale to r≈1.2 on the open top platform. Outer 六合: horizontal horizon ring (flat TorusGeometry, rectangular cross-section via ExtrudeGeometry along circle), vertical meridian ring, fixed equator ring. Middle 三辰: ring pair on polar axis tilted 34.8° (rotateZ) + ecliptic torus tilted another 23.5°. Inner 四游: declination ring + 望筒 sighting tube = two coaxial CylinderGeometry tubes (r 0.05, length 1.6) with box clamps, aimed along polar axis. Mount: 4 support columns as LatheGeometry cloud-scroll pillars (S-curve profile; optionally add cone-horn + tube-spine hints to suggest dragons) on a cross base. ~8k tris.
- **celestial-globe (+ celestial-ladder-lower)** — Give the 浑象 an actual half-exposed star globe in a casing; keep the existing sprocket as its drive and add the visible 天梯 chain
  - Recipe: New sphere r≈0.7 (SphereGeometry 32×20) with equatorial and ecliptic bands (two thin TorusGeometry) and ~80 star studs (InstancedMesh tiny tetrahedra placed on real-ish declination bands); casing = open-top box with a circular hole faked by 4 wall boxes + 2 quarter-arc ExtrudeGeometry lips so the sphere emerges half-visible (半露出柜). Chain: closed stadium CurvePath (two 0.35m arcs at the sprockets + straights); place ~44 chain links as InstancedMesh of small elongated tori (alternate 90° twist per link) sampled along the curve; animate by advancing instance phase along the curve with the belt constraint value.
- **celestial-column** — Move inside the tower and make its couplings visible
  - Recipe: Reposition x≈1.2 (inside footprint), keep 6.084m shaft; add foot and head lantern-pinion gears (existing gear primitive, pin toothStyle, ~20 teeth) meshing the shulun axle gear below and the hour-drum-wheel rim above; add two shelf bearings (small box brackets tied to the new story decks).
- **hour-drum-wheel + day-night-wheel** — Read as the 晝夜機輪八重 stack feeding the jackwork instead of two stray vertical wheels
  - Recipe: Re-mount both on a shared vertical axis behind the pagoda facade: hour-drum-wheel stays the 600-pin gear (2.09m) but horizontal at the stack base; day-night-wheel becomes an 8-layer stack (merge 8 thin CylinderGeometry discs of stepped radius 0.55→0.35 with rim notches every 30° cut by inset boxes pre-merge) on the same shaft, with thin trip fingers (instanced boxes) pointing at each tier cam. Keeps existing lockstep ratios untouched.
- **chime-tier-1..5 + tier-placard-* + tier-cam-*** — Turn floating shelves into the five-story south pagoda facade, compressed to the lower ~7m
  - Recipe: Per story (instanced 5×): 2 side columns (CylinderGeometry r 0.07), lintel beam, railing (6 mini posts + rail), doorway frame (3 boxes) centered where jacks stand, shallow hip-eave strip (shared ExtrudeGeometry triangle profile, 5 instances). Move tiers from y=1..9/z=5 to y≈1..6.8 flush against the tower south wall (z≈3.0 at base, following taper). Placards get a 4-box frame border; cams hide behind the facade with a slot.
- **jack-01..11** — Box → readable robed figurine holding its documented instrument
  - Recipe: Shared ~150-tri figurine geometry, instanced: robe = LatheGeometry tapered profile (6 points, 12 segments), head = SphereGeometry(0.045, 8, 6), hat = ConeGeometry, two arm boxes (one raised); per-tier prop attached to raised hand: tier1 bell 铃 (Lathe cup + clapper) / drum 鼓 (short cylinder + 2 stick boxes) / zhong 钟 (Lathe bell); tier5 jacks hold night-arrow placards (thin box). Color via existing FIGURE_ACCENT.
- **water-reservoir + constant-level-tank + water-trough** — Fix inverted stacking, open the tanks, connect the pour path to the scoops
  - Recipe: Swap heights: 天池 at y≈2.6 on a post stand, 平水壶 at y≈1.6 below it, both moved inside to x≈2.4 beside the wheel; rebuild both with the scoop-style open-top builder (4 walls + floor); add U-channel spouts (3 thin boxes each): 天池→平水壶, and 平水壶→aimed at the 3-o'clock scoop station; add translucent blue water-surface quads inside each tank; repurpose water-trough as the 退水壶 sump tray directly under the wheel.
- **water-lift-wheel** — One floating wheel → two-stage in-house noria with crank and return channel
  - Recipe: Move inside footprint (x≈2.8 north side); duplicate to lower (y≈1.2) and upper (y≈3.6) wheels, both r=0.8735 (documented); add 10 noria pots per wheel as InstancedMesh mini-scoops on the rims; add 河车 crank = bent TubeGeometry handle on the lower axle; add 天河 = inclined U-channel (3 long boxes) from upper wheel discharge to the 天池; intermediate 升水上壶 basin box between stages.
- **base-platform** — Slab → stepped plinth with entry
  - Recipe: Stack 3 inset boxes (7→6.4→5.8m) + south stair block (5 merged step boxes) aligned with the pagoda face; groove a drain channel (thin dark box inlay) along the north edge toward the scene's water channel.
- **scoop-01..36 (combridge-hinged scheme)** — Make the two schemes visually distinguishable, not just joint-kind swaps
  - Recipe: In the hinged scheme, override scoop geometry to add trunnion pins (2 tiny cylinders on the side walls), a counterweight lip (thin box on the outer edge), and a stop pin on the rim; in fixed-scoop keep rigid mounting straps (2 thin boxes over the scoop back). Lets the compare view show WHY Combridge's tipping bucket differs from Wang's fixed cup.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Power-path 'follow the water' highlight sequence (one button): water-reservoir → constant-level-tank → spout → filling scoop → shulun → gecha → tianheng beam → guanshe/tianguan → shulun advance → celestial-column → hour-drum-wheel → day-night-wheel stack → tier-cam-N → jack; then branch two: celestial-ladder-lower → chain links → celestial-globe sphere → armillary-sphere. Emissive pulse ~0.8s per hop with a slow camera dolly following the chain of custody from water to 'tick'.
- Escapement slow-mo sub-demo: extend the existing runEscapementBeat captions (fill/yield/open/advance/relock, already mapped to xyxfy-action quote lines) with (a) an instanced droplet stream arcing from the 平水壶 spout into the filling scoop, (b) a blue fill-level quad scaling up inside that scoop, (c) the 天衡 beam tilting with its 天权 counterweight glowing as the balance flips, (d) ghosting the tower/facade to 8% opacity and freezing all non-escapement parts. This turns the existing event script into a visible weighbridge experiment.
- Cutaway toggle (the plan's mandated 半剖): clip-plane sweep from the east face or opacity-fade of tower walls + pagoda facade, revealing three labeled story spotlights; callout anchors: shulun→'枢轮：36受水壶，一丈一尺', tianheng-beam→'天衡：世界最早擒纵机构', hour-drum-wheel→'时刻钟鼓轮：600牙，每擒纵进6牙', tianti-chain→'天梯：最早动力传动链', celestial-globe-sphere→'浑象：半露出柜', armillary-sphere→'浑仪：六合·三辰·四游', tier facade→'木阁五层，162木人取其代表'.
- Closed-loop water particle system: ~60 instanced droplets advected along one CatmullRomCurve3 loop (平水壶→scoop→退水壶→lower noria→升水上壶→upper noria→天河→天池→平水壶), speed tied to shulun drive rate; makes the sourced 「周而復始」 line literally visible and doubles as the machine's idle-state life.
- Countable-teeth ratio HUD: while dragging shulun, light exactly 6 consecutive pins on the 600-pin hour-drum-wheel per escapement step and run counters '枢轮 1/36 转' vs '钟鼓轮 6/600 牙' — the 36/100 expectedRatio becomes arithmetic the visitor performs by eye.
- Reverse-drag block already emits 'blocked' on tiansuo-r: add red flash + 2-frame rim shake + caption card quoting 「激輪右回，故以右天鎖拒之使不能西也」 (source already in data), so the anti-reverse pawl teaches itself.
- Tier chime legibility: when a tier-cam fires its placard (existing chime-placards trigger), pop the time word (时初/时正/刻/更/筹) above the correct jack and play its strike micro-animation (arm rotates 25° onto bell/drum/zhong); stagger camera to frame whichever tier fired.

**Usage-scene spec (scene.ts)**:
- Setting: Imperial observatory terrace in Kaifeng at the blue hour before dawn — the tower's working moment, when astronomers used the armillary; low city-wall and roofline silhouettes far south, thin moon and a few star sprites above tying the sky to the armillary and globe.
- Ground: 12×12m stone-slab terrace: single plane with beveled slab strips (instanced thin boxes) for joints, slight radial darkening under the tower; shallow reflecting drain channel along the north edge (dark inset box + translucent animated water quad) receiving the machine's return-water theme.
- Props: 圭表 gnomon on plinth (box plinth + tilted blade + scale notches), ~200 tris — states the tower's observational purpose; Bronze brazier with pulsing ember glow (LatheGeometry bowl + emissive coal spheres), ~300 tris; Astronomer's low desk with rolled star-chart scrolls (2 boxes + 3 cylinders), ~150 tris; Water bucket + ladle beside the 河车 crank (two small LatheGeometry vessels), ~200 tris — human scale for the manual pump-back; Two stone lanterns flanking the pagoda face (stacked lathe segments + warm emissive flame quads), ~400 tris; Flagpole with pennant (cylinder + vertex-waved cloth quad), ~100 tris
- Lighting: Cold deep-blue hemisphere key (pre-dawn zenith) + warm point/spot fill from the two lanterns and brazier raking the south pagoda facade so the five jack stories are the brightest thing on screen; faint cool rim from the moon on the roof and armillary rings; bronze needs the global env-map fix to read.
- Ambient motion: Water shimmer in the drain channel (scrolling opacity/normal flicker), ember glow pulse on the brazier, pennant flutter, slow star twinkle sprites, and the machine's own droplet loop as the hero ambient motion. Whole scene ≈15k tris, under the 30k budget.

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| tianheng-beam | 天衡 Celestial balance beam | The escapement's main weighbridge lever; without it the stop-release principle is invisible | beam (ExtrudeGeometry tapered profile), pivoted on saddle above wheel | length ~1.7m, section 0.10×0.08m | wenxian existence (xyxfy-tianheng 「天衡一置樞輪上」); all dims tuice | **[VERIFY]** |
| tianquan | 天权 Celestial weight | Counterweight at beam tail setting the release threshold — the 'adjustable constant' of the feedback loop | LatheGeometry bell weight on TubeGeometry hook | r ~0.06m, h ~0.12m | wenxian existence (xyxfy-tianheng 「天權一置衡尾」); dims tuice | **[VERIFY]** |
| shuquan | 枢权 Pivot-lever weight | Counterweight on the 枢衡 governing scoop-fork balance (「以樞權掛其末，所以節受水壺之升降也」) | LatheGeometry weight | r ~0.05m, h ~0.10m | wenxian existence (xyxfy-tianheng); dims tuice | **[VERIFY]** |
| tiantiao | 天条 Celestial rod | Rod linking beam to the release tongue so the causal chain beam→tongue→gate is a visible linkage | TubeGeometry rod | r ~0.015m, length ~1.2m | wenxian existence (xyxfy-tianheng 「天條一在衡之前」); dims tuice | **[VERIFY]** |
| shuheng | 枢衡 Pivot lever | Lower lever carrying the 格叉 head (「樞衡一在天衡關舌上，衡腦為格叉」) | beam/link | length ~0.9m | wenxian existence (xyxfy-tianheng); dims tuice | **[VERIFY]** |
| bearing-post-e / bearing-post-w | 东天柱 / 西天柱（间梁） East/West bearing columns with cross-beam | Carry the shulun axle and mount the two 天锁 (「左右天鎖二，分置東西天柱間梁上」); currently the wheel and locks float | 2 box posts + 1 cross-beam box | posts ~0.25×4.8×0.25m | wenxian existence (xyxfy-tianheng); dims tuice | **[VERIFY]** |
| shulun-axle | 枢轴 Scoop-wheel axle with pinion | Physical power take-off from wheel to the vertical transmission; nothing currently touches anything | CylinderGeometry axle + pin-gear at end | r ~0.09m, length ~2.2m | tuice (axle named in text tradition; dims and pinion tooth count unverified — source-check 《新仪象法要》 for recorded axle length and 地毂 gearing) | **[VERIFY]** |
| shulun-lugs | 铁拨牙 36 iron trip lugs | The teeth that strike the 关舌/格叉 (「於壺側置鐵撥牙以撥天衡關舌」) — the physical contact point of the escapement | InstancedMesh wedge boxes on rim | ~0.10×0.05×0.04m each | wenxian existence (xyxfy-shulun); dims tuice | **[VERIFY]** |
| celestial-globe-sphere + globe-case | 浑象球 + 柜 Celestial globe and casing | The actual star globe, half-exposed from its casing — signature element currently absent entirely | SphereGeometry + band tori + instanced star studs; open casing box with arc lip | sphere r ~0.7m (source-check: 《新仪象法要》 records the 浑象 diameter — do not ship 0.7 without checking) | wenxian existence (xyxfy-baoshi 「天輪以撥渾象之赤道牙」+ xyxfy-taiti); display dims tuice pending check | **[VERIFY]** |
| tianti-chain | 天梯 Celestial ladder chain (visible links) | World's-earliest-chain claim is in the card; needs visible instanced links along a stadium curve | InstancedMesh ~44 twisted-alternating link tori along CurvePath | loop length as drawn; NOTE: source-check whether 一丈九尺五寸=6.084m in 《新仪象法要》 denotes the 天梯 chain length vs the 天柱 — the card currently assigns it to 天柱; do not alter, just verify | wenxian existence (xyxfy-baoshi, card belt note); geometry tuice | **[VERIFY]** |
| water-lift-wheel-lower | 升水下轮 Lower water-raising wheel (second stage) | Text records two lift stages (「以昇水下輪運水入昇水上壺」); only one wheel exists now | duplicate wheel + instanced noria pots | diameter 1.747m (already in §7 card: 升水上/下轮径五尺六寸) | wenxian (xyxfy-water) | — |
| hechec-crank | 河车 Hand-crank wheel for the water return | The only human power input — shows people wound the water back up; anchors the usage scene | bent TubeGeometry crank + handle on lower noria axle | crank throw ~0.35m | wenxian existence in full 《新仪象法要》 water chapter (not in current card quote — source-check name and placement); dims tuice | **[VERIFY]** |
| tianhe-channel | 天河 Overhead return channel | Closes the visible loop 「運水入天河，天河復流入天池」 | 3-box U-channel, inclined | length ~3.5m, width 0.25m | wenxian existence (xyxfy-water quote); dims tuice | **[VERIFY]** |
| tuishui-hu | 退水壶 Drain sump | Where spent scoop water lands (named in xyxfy-water); start of the return path | open-top box tray under wheel | ~1.2×0.4×0.6m | wenxian existence; dims tuice | **[VERIFY]** |
| pagoda-facade-stories | 木阁五层立面 Five-story pagoda facade kit (columns/doorways/eaves/railings ×5) | The public face of the clock; story heights needed to compress tiers to the lower south face | instanced column/lintel/eave/railing set | story height ~1.35m ×5, facade width ~2.8m (source-check against 《新仪象法要》 木阁 dimensions if recorded) | wenxian existence (xyxfy-baoshi 「木閣五層」); dims tuice | **[VERIFY]** |
| jack-props | 铃·鼓·钟·钲·夜漏箭牌 Jack instruments: bell, drum, zhong, gong, night-watch placards | Text specifies which jack does what (「第一層時初木人左搖鈴，刻至中擊鼓，時正右扣鐘」); boxes holding nothing teach nothing | small Lathe/cylinder props attached to figurine hands | each ~0.06-0.12m | wenxian existence (xyxfy-baoshi); dims tuice | **[VERIFY]** |
| armillary-detail | 六合仪·三辰仪·四游仪·望筒 Nested armillary ring set with tilt and sighting tube | Match the quoted 「儀有三重」 nesting; polar tilt makes it read as an instrument, not a gyroscope | ring radii ~1.2/1.0/0.85m, 望筒 tube length ~1.6m, polar tilt 34.8° (Kaifeng latitude) | all display dims tuice; tilt derived from site latitude | wenxian existence (xyxfy-taiti quote); numbers tuice | **[VERIFY]** |
| removable-roof | 板屋（可拆顶） Removable plank roof over the observation platform | Famous proto-observatory-dome feature; rendered ajar it explains why the armillary sits in a tower | 4 ExtrudeGeometry roof slabs, offset/lifted | plan ~5×5m | attributed to 《新仪象法要》 tower description — source-check exact wording before captioning as wenxian | **[VERIFY]** |
| daynight-stack-note | 昼夜机轮八重 Day-night wheel eight-layer stack | Data-json dimension/copy entry: the stack count 8 is quoted (「晝夜機輪八重，第一重曰天輪」) and should appear in the dimensions table + cutaway caption | 8 stacked discs on one vertical shaft | count=8 (wenxian, in card quote); disc radii tuice | wenxian (xyxfy-baoshi) | — |
| water-order-fix | 天池在上、平水壶在下 Corrected reservoir/tank stacking (copy + layout note) | Layout fix backed by existing quote 「平水壺受天池水注入受水壺」 — no new number, but record the corrected flow order in data json principle text and part positions | — | — | wenxian (xyxfy-water, already in card) | — |

**File ownership**: `src/machines/astroclock/**`, `src/data/machines/astroclock.json`, `tests/machines/astroclock.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-02 Zhang Heng's Seismoscope 候风地动仪 `seismoscope`

**Estimated effort**: 6-7 days: dragon head/neck/jaw rebuild + de-normalization 1.5d; vessel lathe + lid + solid-face cutaway + wall decor 1d; toads 0.5d; plinth/floor/tracks/gates/pushrods + both duzhu variants 1d; mechanism polish (shake-not-yaw, jaw open, ball fall, lock flashes, compass ring, scheme-duel beat) 1d; Lingtai scene 1d; data/provenance wiring + trigger tests 0.5d

**Current state**: The vessel is a bare THREE.SphereGeometry hemisphere (parts.json hardcodes cutaway:true, so even the resting museum view is half an open eggshell with zero wall thickness, no lid, no neck, no foot — with the translucent cutaway material it reads as a green ghost balloon, not a bronze zun). Each dragon is an 11-primitive blob (squashed sphere skull + capsule snout + box jaw + eye/nostril spheres + horn/ear cones) that mergeComposite then envelope-normalizes to [2.7r, 1.4r, 1.7r] — i.e. WIDER than it is deep — which destroys the sub-part placement and yields the observed spiky copper pig-face; worse, dragons sit at radius 1.22 while the shell surface is at 0.924, so all eight heads float ~0.2 m off the wall, unattached. Toads are two flattened spheres plus capsule legs, envelope-crushed to 45×23×36 cm pebbles with no open upturned mouth, hovering at y=-0.55 with nothing under them; balls rest at y=0, floating in mid-air 0.3 m below the dragon chins instead of in the jaws. Scheme internals (duzhu shaft, 8 chutes/tracks) are a plain cylinder and plain box slabs with no linkage (牙机) to the dragons, and the quake trigger encodes bearing by yawing the whole vessel up to 270° — nothing on screen says "houfeng didongyi".

**Structure gaps (reconcile line by line)**:
- Vessel is not a zun (形似酒尊): no ring foot, no bulged belly-to-shoulder profile, no neck/rim, no wall thickness, and above all no domed lid (合蓋隆起) — the lid + wine-jar silhouette IS the identity of this object; without it recognition is zero.
- No base plinth/pedestal: every reconstruction (Wang 1951, Feng 2005, all museum replicas) stands on a stepped circular platform that the eight toads sit on; currently vessel, toads and balls all levitate, so the object has no gravity and no scale.
- Dragon heads are detached from the vessel and horizontal: historically the eight dragons are relief bodies descending the upper vessel wall with heads emerging head-DOWN, ball in open jaws directly above each toad — the down-tilted head over toad pairing is the second most iconic silhouette cue and also encodes the working principle (gravity drop path).
- No articulated dragon jaw: the text's central event is 機發吐丸 (jaw opens, ball spat out); with the jaw merged into the blob the machine cannot visibly perform its one action — the ball just teleports downward.
- Toads have no open upturned mouth (張口承之): the catch basin is the destination of the power path; a pebble with no mouth breaks both recognition and principle reading.
- No visible 牙機/傍行八道 linkage: schemes add a bare shaft and eight solid box slabs, but nothing connects duzhu sway → path gate → dragon jaw, so the cutaway shows disconnected floating furniture and the causal chain is unreadable.
- Feng scheme's suspended duzhu has no suspension: a pendulum needs a visible hanger (crossbeam/hook under the lid apex) and a bob; currently the identical uniform cylinder is reused for both a standing inverted pendulum and a hanging pendulum, so the two rival schemes — the museum's headline story — look the same.
- No vessel floor plate for the mechanism to stand on, and no bearing markings: 尋其方面乃知震之所在 requires the visitor to read WHICH direction fired — there are no compass/bearing cues anywhere.
- Quake input is expressed as a large yaw rotation of the vessel (setInput('vessel', bearing*π/4) on a Y-drive) — physically wrong and misleading; the vessel should shake laterally along the quake bearing, never spin.

**Geometry upgrade recipes**:
- **vessel** — Replace hemisphere shell with a true bronze zun body: lathe profile with wall thickness, cutaway as a toggle not a permanent state
  - Recipe: LatheGeometry over a closed outline (outer profile up, inner profile back down, offset -0.03 for wall): (0.50,0.00) foot edge → (0.55,0.10) foot ring step → belly out to (0.924,0.55) max diameter [keep researched 0.924] → shoulder in to (0.64,1.00) → slight rim flare (0.70,1.12); 96 segments. Full view: phiLength 2π. Cutaway view: second geometry with phiStart 0, phiLength π PLUS two flat cut-face strips (triangulated quads along the outline at φ=0 and φ=π) so the cut reads as solid bronze wall, and drop the translucency entirely. Decoration pass: 3 raised bands (bump lathe profile r+0.012 at three y-bands) + 8 vertical rib meridians (TubeGeometry r 0.012 along wall-hugging curves) aligned with the dragons — enough to suggest 飾以篆文 at glance distance.
- **dragon-0..7** — Rebuild as a curved-neck dragon head emerging from the vessel wall, head tilted DOWN, ball held in open jaws; DELETE the envelope normalization in mergeComposite (build at true scale, no post-scale)
  - Recipe: Spine: CatmullRomCurve3 through wall-root (r 0.88, y 0.72) → (r 1.02, y 0.66) → (r 1.14, y 0.54) → jaw point (r 1.20, y 0.44) — an S-curve arcing out then down. Neck: 4 chained TubeGeometry segments along the curve with stepped radii 0.075→0.065→0.055→0.048 (radial 10). Skull: ellipsoid SphereGeometry scaled (0.10, 0.055, 0.06) at curve end, oriented via Matrix4.lookAt(tangent). Upper snout: tapered wedge (ExtrudeGeometry of a rounded-triangle Shape, depth 0.05, or CylinderGeometry radiusTop 0.02/bottom 0.045 laid forward) extending 0.09 with a slight up-curl of the nose tip. Lower jaw: SEPARATE geometry (see data_supplements jaw-N) — a thin wedge hinged at the skull, resting open ~35°, so the mouth gapes around the ball. Horns: two backswept ConeGeometry (r 0.012, len 0.09) from the brow, angled along the neck. Eyes: 2 spheres r 0.012; brow ridges: thin torus arcs. Mane fins: 5 diminishing triangular ExtrudeGeometry fins (depth 0.008) planted along the top of the neck spine — the instant 'Chinese dragon' read. Relief body: one TubeGeometry r 0.02 along a gentle serpentine meridian on the wall from neck-root up toward the shoulder band (~250 tris) so each head is visually rooted to the vessel. Move part origin so the neck root touches the lathe wall.
- **toad-0..7** — Rebuild as a squat crouching toad with head tipped up and a genuinely concave open mouth aimed at the dragon above; remove envelope crush; face INWARD toward the vessel
  - Recipe: Body: LatheGeometry squat-dome profile (r0.14 base → bulge 0.16 at h0.05 → close at h0.11), then scale (1, 1, 1.2) for oval footprint. Head: half-sphere (SphereGeometry thetaLength π/2) tilted up 30° at the front. Mouth: open cup lathe (profile of a shallow bowl, outer r 0.075, depth 0.04, open top) mounted in the upturned face with a 0.02 gap to the head half-sphere — the gap IS the open mouth, no CSG needed; align the cup center with the ball's drop line so the ball lands visibly inside. Eyes: 2 bulging spheres r 0.02 atop the head. Front legs: 2 tapered cylinders planted forward; haunches: 2 squashed spheres at the rear. Warts: ~8 tiny spheres via one InstancedMesh across all 8 toads. Set rotationEuler so every toad faces the vessel axis.
- **ball-0..7** — Reposition into the dragon jaws and lengthen the drop
  - Recipe: Keep SphereGeometry r 0.055; move rest position to the jaw point (y≈0.44 at radius 1.20), extend prismatic limits to [0, ~0.95] so the ball falls from jaw into the toad's mouth cup; add a small squash-and-ring flash on landing.
- **wang-chute-0..7 / feng-track-0..7 (seismoscopeTrack builder)** — Replace solid box slabs with real U-channel guides, tilted so a ball could actually roll outward
  - Recipe: ExtrudeGeometry of a U Shape (outer 0.045×0.03 rect with an inner 0.03×0.02 notch cut via Shape holes/path), extruded to the recorded length (0.36/0.38); pitch each track ~4° down-and-outward; feng tracks each get a resting pilot ball (small instanced sphere) at the inner end per Feng's rolling-ball reconstruction.
- **duzhu (wangzhenduo scheme)** — Make the standing column read as an inverted pendulum, not a uniform stick
  - Recipe: LatheGeometry column tapering r 0.055 base → 0.035 top with a heavy capital (disc r 0.09 + bulb) near the top and a small pivot boss where it meets the new floor plate; keep length ~2 m (researched tuice) but clamp the top below the lid interior.
- **duzhu (fengrui scheme)** — Make the suspended pendulum visibly HANG: thin rod + heavy low bob + hanger
  - Recipe: Thin CylinderGeometry rod r 0.015 from a hook under the lid apex down to y≈-0.15, ending in a cylindrical bob (r 0.09, h 0.3, filleted by a lathe profile) swinging just above the eight tracks; add the feng-hanger crossbeam part (see data_supplements). Rod+bob replace the current uniform shaft so Wang-vs-Feng are distinguishable at a glance.
- **quake trigger (mechanism, visual only)** — Stop yawing the vessel to encode bearing
  - Recipe: Keep graph inputs, but drive the visual as a damped lateral shake of vessel+plinth along the bearing vector (3–4 oscillations, amplitude ~0.02 m) while the duzhu sways opposite (inertia read); never rotate the vessel about Y.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Power-path highlight order for the 'quake' trigger (slow-mo, ~6 s): ground ring pulse from bearing d → vessel+plinth lateral shake → duzhu sway highlight (caption 中有都柱) → gate lever of path d clicks (施關發機) → push-rod d lifts → dragon-d jaw rotates open 35° (機發吐丸) → ball falls with gravity ease into toad cup (蟾蜍銜之, metallic clang caption 振聲激揚) → 0.4 s later the 7 other gate levers flash red LOCKED (雖一龍發機，而七首不動).
- Interlock sub-demo: immediately after a fire, auto-inject a second pulse from a different bearing in slow motion — duzhu sways again but the tripped latch blocks the gate; red flash on all locked paths + the source line. This makes the monostable/first-event-lockout hook (the machine's §7 机巧) an on-screen event rather than a caption.
- Cutaway toggle 'peek inside the zun': swaps vessel+lid to the phi-π lathe with solid cut faces (no translucency) and lifts the lid 0.4 m; internal mechanism gets full lighting while dragons/toads dim to 40% — reverses the current situation where the inside is always half-visible through a ghost shell.
- Bearing legibility: bronze compass ring inlaid in the plinth with the 8 direction glyphs (北/東北/東/…); when dragon-d fires, its glyph and the ground ring toward that bearing glow — closes the 尋其方面，乃知震之所在 loop, and ties to the Longxi story step (d=6 west glyph lights as the courier text appears).
- Scheme duel beat (uses existing wangzhenduo/fengrui patches + existing driveTo values 0.02 vs 0.14): same pulse amplitude sent to both — Wang's standing column barely tips below its limit (caption: Fu Chengyi's sensitivity critique), Feng's hanging bob swings through and fires; a 2-line HUD shows column tilt vs bob swing angle live.
- Callout anchors (part → one-liner): vessel → 以精銅鑄成，員徑八尺 (1.848 m); lid → 合蓋隆起，形似酒尊; duzhu → 中有都柱; feng-track-6 / wang-chute-6 → 傍行八道; gate-6 → 施關發機; dragon-6 jaw → 首銜銅丸; ball-6 → 機發吐丸; toad-6 → 張口承之; plinth glyph ring → 乃令史官記地動所從方起.
- Ball-drop physics polish: replace the linear prismatic slide with a 0.45 s gravity-eased fall plus toad-mouth ring flash and a one-shot 'clang' — the audible-alarm aspect (伺者因此覺知) is part of the machine's function and currently absent.

**Usage-scene spec (scene.ts)**:
- Setting: Dusk terrace of the Han imperial observatory (灵台) at Luoyang — where Zhang Heng actually served as Taishiling — open rammed-earth platform with a low wooden balustrade and a hint of palace roofline far behind.
- Ground: Circular stone-slab platform disc (~7 m) with concentric slab ring seams; the bronze 8-bearing compass ring inlaid around the instrument's plinth; light dust/wear vertex tint toward the edges.
- Props: Low wooden balustrade arc segments behind the instrument (InstancedMesh posts + two rails, ~800 tris); Two bronze brazier tripods flanking the approach, glowing coals (emissive + point light, ~400 tris each); Scholar's low table with rolled bamboo slips and a silk map weight (~300 tris); Distant gnomon post silhouette at platform edge (~200 tris); Three shallow stone steps up to the platform on the south side (~120 tris); Banner pole with a hanging 篆-motif pennant (pole + 2 quads, cloth sway)
- Lighting: Low warm key from the WEST (sunset — echoes the Longxi-in-the-west narrative), cool blue sky fill, two flickering warm point lights from the braziers, subtle rim light to bring the bronze zun silhouette off the dusk sky.
- Ambient motion: Brazier ember flicker (intensity noise + drifting spark sprites), slow pennant sway; on quake trigger: an expanding ground shockwave ring rolling in from the quake bearing across the slabs plus 2–3 dust-puff sprites at the plinth — sells 'the ground moved, not the machine'. Whole scene ≈ 3–4 k tris, well under the 30 k budget.

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| lid | 隆起合盖 Domed lid with knob finial | The recorded 合蓋隆起 dome completes the wine-zun silhouette and gives the cutaway/story a lid to lift; also the anchor for Feng's suspension hook. | LatheGeometry spherical cap from rim r 0.70 rising ~0.30 m to a lotus-knob finial (small stacked lathe) | rim radius 0.70 m, rise 0.30 m, knob r 0.06 m | wenxian existence (houfeng-196 合蓋隆起); all dims tuice display choices | **[VERIFY]** |
| plinth | 阶座 Stepped base platform | Grounds the instrument and seats the eight toads, per every Wang/Feng museum reconstruction. | Two stacked CylinderGeometry tiers (or shallow lathe with step profile), toads standing on the upper tier | tiers r 1.75 / 1.45 m, each h 0.12 m | tuice (reconstruction convention; not in the classical text) | **[VERIFY]** |
| floor-plate | 尊内机枢底盘 Internal mechanism floor | Gives the duzhu pivot and the eight paths a surface to mount on so cutaway internals stop floating. | Lathe disc with raised central pivot boss | r 0.80 m, thickness 0.04 m, at y ≈ -0.30 | tuice | **[VERIFY]** |
| jaw-0..7 | 龙首下颌 Hinged dragon lower jaw (8x) | Makes 機發吐丸 performable: revolute joint (limits [0, 0.6] rad) opens on trigger to release the ball. | Thin wedge (ExtrudeGeometry triangle Shape, depth 0.05) hinged at the skull base, paired per dragon | length 0.09 m, width 0.05 m, thickness 0.015 m | wenxian action (机发吐丸/首衔铜丸); dims tuice | **[VERIFY]** |
| gate-0..7 + pushrod-0..7 | 关机与牙机连杆 Path trigger gate and jaw push-rod (8x each) | The missing 施關發機/牙機 causal chain: duzhu sway trips the gate lever, the rod lifts the jaw — the legible link between inside and outside. | Gate: L-link of two thin boxes on a pin (revolute); rod: CylinderGeometry r 0.008 rising from gate to jaw hinge through the wall band | gate arms 0.10/0.06 m; rod length ≈ 0.45 m | wenxian existence (施關發機, 其牙機巧制皆隱在尊中); geometry tuice | **[VERIFY]** |
| feng-hanger | 悬摆吊梁 Suspension crossbar and hook (fengrui scheme) | Shows HOW Feng's duzhu hangs; without it the suspended pendulum is indistinguishable from Wang's column. | Beam box spanning under the lid apex + small hook torus; duzhu rod attaches to hook | beam 0.9 × 0.06 × 0.06 m at y ≈ 1.05 | tuice (Feng Rui 2005 reconstruction) | **[VERIFY]** |
| duzhu-bob | 都柱摆锤 Pendulum bob / column capital | Mass distribution makes each scheme's physics readable: low heavy bob (Feng) vs top-heavy standing column (Wang). | Filleted cylinder lathe bob (Feng, r 0.09 h 0.30 at rod bottom); capital disc + bulb (Wang, near column top) | bob r 0.09 m, h 0.30 m | tuice (Feng Rui 2005) | **[VERIFY]** |
| bearing-ring | 八方位铭环 Inlaid 8-direction compass ring | Lets the visitor read the fired bearing (尋其方面) — the glyph of the fired direction lights up; also the scene's plinth inlay. | Flat ring (RingGeometry) + 8 extruded direction glyph plates (simple Shape extrudes, no font dependency) | ring r 1.55–1.70 m; glyph plates ~0.14 m | tuice display aid (bearing recording motivated by 乃令史官記地動所從方起) | **[VERIFY]** |
| dragon-body-0..7 | 尊壁浮雕龙身 Relief dragon bodies on vessel wall (8x) | Roots each floating head to the vessel (外有八龍 = whole dragons, not disembodied heads) — the biggest single recognition win after the zun profile. | TubeGeometry r 0.02 along a serpentine wall-hugging CatmullRom meridian from neck root to shoulder band, one per dragon (~250 tris each) | arc length ≈ 0.7 m along wall | wenxian existence (外有八龍, 飾以…鳥獸之形); curve geometry tuice | **[VERIFY]** |
| ball rest/drop update | 铜丸初始位与落程 Ball rest pose and drop length | Move ball rest into the jaw (y≈0.44) and extend prismatic limits to [0, 0.95] so the drop terminates in the toad's mouth cup. | parameter change on existing ball-0..7 joints | drop 0.95 m | tuice display parameter | **[VERIFY]** |
| callouts copy block | 零件引文标注 Per-part callout captions in data json | Anchor map part-id → one-line quote fragment (listed in principle_aids) powering annotated-callout mode; all fragments drawn verbatim from the existing houfeng-196 quote, no new sourcing needed. | data-only | - | wenxian (houfeng-196) | — |

**File ownership**: `src/machines/seismoscope/**`, `src/data/machines/seismoscope.json`, `tests/machines/seismoscope.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-03 South-Pointing Chariot 指南车 `chariot`

**Estimated effort**: 6-7

**Current state**: All nine documented wheels exist with the correct researched diameters and tooth counts (24/12/48, common module 0.0312, road wheel r=0.936, shaft 2.496m), but the entire gear train floats 2.4m in mid-air arranged along the fore-aft X axis — the "left/right" sub-wheels are actually front/back, nothing connects them to the road wheels (whose axes are orthogonal to them), and the 48T great wheel is 0.22m off the central shaft's axis and 0.32m above the shaft's top end. The cart itself is an H-frame skeleton with a goalpost: no carriage box / lattice cage / upper deck (車箱外籠重構 is text-explicit in songshi-yansu), the figure is a box torso + sphere head with a detached stick pointer invisible from the side, the clutch is two floating iron boxes, and the wheels (torus rim + 16 flat spokes, no hub, from buildWheel) sink 0.3m below y=0. Kinematically the south-pointing invariance is hard-coded via lockstep(chassis-pivot↔figure-turntable) and lockstep(chassis-pivot↔great-wheel); there is no road-wheel→sub-wheel constraint, so the visible power path is severed at its very first link. It currently reads as an abstract gear diagram hovering over a cart skeleton, not as the Wang Zhenduo museum artifact.

**Structure gaps (reconcile line by line)**:
- Carriage box + lattice cage + upper deck (車箱/外籠/重構) entirely missing. The Song text names all three, and every museum model's silhouette is 'two huge wheels + latticed box + figure on top'. Without the box the object is unrecognizable as a chariot, and the gears have nothing to live inside — recognition feature #1.
- Gear train in the wrong place and on the wrong axes: sub-wheels (子轮, 附足='attached to the foot wheel') must be VERTICAL discs riding inboard of each road wheel at axle height; the small horizontal wheels hang between them; the great wheel lies HORIZONTAL inside the box, coaxial with the 贯心轴 that carries the figure. The current fore-aft mid-air row makes the principle unreadable and even mislabels left/right as front/back.
- Missing first kinematic link: no lockstep(left/right-road-wheel ↔ left/right-sub-wheel, ratio 1). The expectedRatios chain starts at the sub-wheels, so wheel input reaches the gears only through the hard-coded chassis lockstep — a visitor sees wheels and gears spinning with no causal connection. Add the constraint (provenance wenxian, 附足立子輪) so the power path is real end-to-end.
- The automatic clutch — the entire point of the yansu-clutch scheme (「遇右轉使右轅小輪觸落右輪」) — is represented by two floating iron boxes and a beam. Needs the visible chain: drawbar swings → 轅端橫木 crossbar → the two 3-cun 立小轮 pulleys (they exist but float mid-deck; text puts them UNDER the drawbar-end crossbar) → lift cords → hanger drops one small wheel into simultaneous mesh with sub-wheel and great wheel.
- No draft context: the single drawbar (独辕 — correct) floats at shin height with no curve, no transverse yoke 衡, no yoke saddles 轭, no horses. A single central pole historically implies a paired-horse yoke; without the horse interface 'chariot' does not read.
- No axle structure: wheels hang on two floating stub shafts. Needs a transverse axle beam (軸) plus bolster blocks (伏兔) tying axle to chassis spine, so the load path ground→wheel→axle→frame is visible.
- Figure is not humanoid: 「引臂南指」 means the immortal's own extended arm IS the needle. Needs a robed figure readable from every angle, standing on the upper deck exactly on the shaft axis (turntable currently at x=-0.22 while great wheel is at x=0).
- Vertical stack broken and camera framing broken: wheel centers y=0.636 with r=0.936 (bottoms at -0.3), deck at 0.48 sits BELOW axle height, shaft base at -0.42. Restack so wheel bottoms touch y=0 (centers 0.936), deck ~1.12, gear plane ~1.3 inside the box; then set default camera to frame the full ~3.5m machine (currently spawns inside a wheel for ~10s).

**Geometry upgrade recipes**:
- **left-road-wheel / right-road-wheel** — Replace generic torus+box 'wheel' with a heavy Chinese cart wheel (毂/辐/牙 construction) that touches the ground
  - Recipe: Custom builder cartWheel: felloe = ExtrudeGeometry of an annulus Shape (outer 0.936, inner 0.80, depth 0.11, curveSegments 16 so the rim reads as segmented wooden 牙); iron tire = second thin annulus extrude (outer 0.952, inner 0.936, depth 0.09) merged; hub 毂 = LatheGeometry bulged profile (r 0.09→0.135→0.09 over 0.34 length) on the axle axis; 24 tapered spokes = CylinderGeometry(0.017, 0.026, 0.72, 6) emitted as userData.mechanicaInstances matrices (the registry already supports instancing via getMechanicaInstanceMatrices). Raise centers to y=0.936.
- **left-sub-wheel / right-sub-wheel** — Reposition as VERTICAL crown pin-gears attached inboard of each road wheel; pins protrude from one face only
  - Recipe: Keep buildPinGeometry 24T but translate pin cylinders +thickness/2 so pins stand proud of the inboard face, add cone tips (ConeGeometry r=pinRadius, h=pinRadius*1.5) and 4 flat cross-brace boxes on the disc so it reads as built-up wood. Position [0, 0.936, ±(z_wheel−0.12)] with rotationEuler [π/2,0,0] (axis colinear with road axle). Add lockstep(road-wheel↔sub-wheel, ratio 1).
- **left-small-wheel / right-small-wheel** — Turn into hanging drop-gears — the physical clutch — between sub-wheel crown and great wheel rim
  - Recipe: Keep 12T pin gear (full-height pins fine for both meshes). Add per side a gear-hanger part: inverted-U from TubeGeometry along a 3-point curve (r 0.02) + axle pin cylinder; hanger gets prismatic Y joint limits [0, 0.09] (move the drop DOF here instead of on abstract clutch dogs). Position small wheels at gear plane y≈1.31, z≈±(r_great + r_small pitch)=±0.936 so each simultaneously meshes the great wheel (parallel-axis pin mesh) and crosses the sub-wheel pin circle (crown mesh).
- **great-wheel** — Make it the visible flat 1.498m pin wheel inside the carriage box, exactly coaxial with the central shaft and figure
  - Recipe: Keep 48T pin gear with innerRadius = shaft radius 0.0468; merge 6 radial spoke-bars (BoxGeometry 0.66×0.05×0.09 rotated in 60° steps) and a top rim ring (Extrude annulus outer 0.749 inner 0.68, depth 0.03) so it reads as a built-up wooden platter, pins upward. Move to [x_shaft, ~1.31, 0]; keep collisionWhitelist pair with shaft.
- **central-shaft** — Seat it structurally: base step-bearing on the axle beam, top tenon under the figure turntable
  - Recipe: Reposition to span y 0.95→3.45 on the same x/z as great wheel and figure; add LatheGeometry collar at base (r 0.047→0.09 flare over 0.1) and a small cap disc at top. CylinderGeometry stays for the shaft body (r 0.0468, documented 3-cun diameter).
- **figure-turntable + south-figure-body/head/arms + south-pointer** — Rebuild as one robed immortal (木仙人) whose extended arm IS the pointer, on a drum pedestal
  - Recipe: Custom builder robedFigure (~0.9m tall): robe = LatheGeometry profile (hem r 0.16 → waist 0.09 at 0.45 → shoulders 0.11 at 0.62 → neck 0.035), head = SphereGeometry r 0.075 + small lathe hat/bun; pointing arm = TubeGeometry along CatmullRomCurve3 from shoulder [0.08,0.58,0.02] to [0.46,0.62,0] tapering r 0.035→0.025, hanging sleeve = ExtrudeGeometry triangle under forearm, hand = ConeGeometry 0.06 pointing +X; other arm folded (short bent tube). Keep the id south-pointer on the forearm+hand sub-mesh so existing story highlights keep working. figure-turntable becomes LatheGeometry drum pedestal r 0.2 h 0.08 with lip; place both exactly on the shaft axis atop the upper deck.
- **left-clutch-dog / right-clutch-dog / clutch-yoke** — Replace abstract iron boxes with the visible cord-clutch: rocking lever, cords, hangers
  - Recipe: clutch-yoke → transverse rocking balance lever at the drawbar root (beam 0.9 with center pivot pin, revolute X, ±8°); clutch dogs → become the two gear-hangers (see small wheels). Add 2 lift-cord parts: TubeGeometry (r 0.008, 24 segments) along CatmullRomCurve3 [hanger eye → over upright-wheel pulley groove → drawbar crossbar end]; regenerate curve points from the drawbar swing angle each frame (cheap: 24-segment tube rebuild).
- **left-upright-wheel / right-upright-wheel** — Make them read as the cord pulleys under the drawbar-end crossbar (轅端橫木下立小輪二，鐵軸貫之)
  - Recipe: LatheGeometry V-groove pulley profile (r 0.0468 rims, dip to 0.038 at mid-width 0.035) instead of torus+spokes; mount side by side under a new drawbar-crossbar on a shared thin iron axle (CylinderGeometry r 0.008, dark iron material, the documented 鐵軸); cords ride the grooves.
- **drawbar** — Curve it up to horse height, hinge it, and terminate in the crossbar + yoke so 'chariot' reads instantly
  - Recipe: TubeGeometry along CatmullRomCurve3 [0.6,0.75,0]→[1.7,0.82,0]→[2.7,1.0,0] (r 0.055 tapering 0.045); give it revolute Y joint, limits ±0.12 rad — its swing is the clutch input and must be drivable in the demo; child parts: drawbar-crossbar (橫木) and yoke 衡 with two 轭 saddles.
- **left-drive-housing / right-drive-housing** — Delete the two floating panels; superseded by the real carriage box
  - Recipe: Replaced by new carriage-box part (see data_supplements): ExtrudeGeometry frame per side with rectangular window holes + ~8 vertical slats per side via one InstancedMesh — the lattice 外籠 keeps the gear train permanently visible, which doubles as the cutaway.
- **canopy-left-post / canopy-right-post / canopy-beam** — Convert the goalpost into the upper-deck railing (勾阑) around the figure
  - Recipe: 4 corner posts (BoxGeometry 0.05×0.28×0.05) + top rails (0.05 square beams) + balusters as one InstancedMesh of 12 small cylinders around the 0.9×0.8 upper deck; figure pedestal centered inside.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Pivot-turn ledger HUD (the §7 hook): three live rows bound to graph state — 车体 chassis-pivot +90.0° / 齿轮补偿 great-wheel −90.0° / 木人世界朝向 0.0° — shown whenever any road wheel is dragged; the third row flashes green each time it stays |Δ|<0.1°.
- Power-path pulse on wheel drag: sequential emissive highlight left-road-wheel → left-sub-wheel → left-small-wheel → great-wheel → central-shaft → figure at ~350ms per hop, each with a curved TubeGeometry arc-arrow showing rotation sense (great-wheel arrow opposite chassis arrow). When the clutch is neutral, skip the small wheel and flash it grey with a '脱开 disengaged' chip — engagement state becomes legible at a glance.
- Clutch slow-mo sub-demo trigger drive:clutch-demo: (1) drawbar swings +8° (revolute), (2) cord tubes re-lerp taut, (3) right hanger drops 0.06 with a click-flash at pin contact, (4) wheels roll while a tooth counter ticks 1→12 as sub-wheel pins pass a fixed marker, (5) protractor wedge overlay under the great wheel fills to 90° — the literal 「順轉十二齒…左旋四分之一」 with the quote card synced.
- South ray: fixed world-space red ray from the figure's fingertip to a 南 glyph on the ground compass ring; during any turn the ray stays put while a grey ghost arm (rotating with the chassis) shows where the arm WOULD point without compensation — the delta between ghost and real arm IS the mechanism's work.
- Tooth-count callout anchors: left-sub-wheel → '24齿·与足轮同转 / 24T, rides with the road wheel'; left-small-wheel → '12齿·转弯才落下 / 12T, drops only in a turn'; great-wheel → '48齿·反转抵消车身 / 48T, counter-rotates the figure'; upright-wheel pair → '辕端小轮·感知辕的摆动 / cord pulleys sensing the drawbar swing'; south-pointer → '仙人引臂即指针 / the arm is the needle'; drawbar → '转向信号从这里进入 / the input signal enters here'.
- Scheme A/B compare choreography: broadcast the same 90° pivot to yansu-clutch and lanchester-diff viewports; annotate great-wheel motion 'stepped (clutch engages per turn)' vs 'continuous (differential)' with a small angular-velocity sparkline per viewport; both ledgers end at 0.0° — same answer, different mechanism, which is exactly the controversies entry in chariot.json.
- X-ray toggle: lattice box, deck and upper deck fade to ~12% opacity leaving gears, cords, shaft and figure — needed for the gear-train and right-angle-turn story steps; the lattice cage means even the non-x-ray view keeps gears partly visible, matching the Taichung museum model photo already in the image set.

**Usage-scene spec (scene.ts)**:
- Setting: Rammed-earth imperial procession road outside a Song city gate (Kaifeng) at dawn — the ceremonial context in which the south-pointing chariot actually led processions
- Ground: Sandy loess plane; a pair of dark curved wheel-rut decals sweeping through a just-completed 90° arc (the ruts curve, the pointer never did — the ground itself tells the story); faint chalk compass ring centered under the cart with the 南 character emphasized to scene south
- Props: Distant city gate-tower silhouette on the south horizon (box + hip roof, ~400 tris) — doubles as the visual 'south' landmark the arm points at; Two banner poles with cloth pennants flanking the road (~120 tris each, vertex-shader sway); Stone milestone 里堠 (box + cap, ~80 tris); Hitching trestle with a spare yoke resting on it (~150 tris); Pair of standing low-poly draft horses ahead of the yoke (~700 tris each, static pose) — single biggest 'chariot' recognition win; if cut, leave the empty yoke on the trestle; 3-4 roadside grass card clumps (~30 tris each)
- Lighting: Low warm key light from scene south so the immortal's arm points into the sun, cool blue ambient fill, thin dust-haze billboards near the horizon
- Ambient motion: Pennant sway, slow dust-mote drift, subtle heat shimmer on the horizon; total scene budget ~3.5k tris — far under the 30k cap

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| carriage-box | 車箱外籠 Carriage box with lattice cage | The recognition silhouette; houses the gear train while keeping it visible through the lattice | custom: ExtrudeGeometry frame per side with window holes + one InstancedMesh of ~8 slats/side, open top | 1.6 × 1.15 × 1.2 m (L×W×H), floor at deck y≈1.12 | wenxian existence (songshi-yansu 車箱外籠), dims tuice per Wang Zhenduo model proportions | **[VERIFY]** |
| upper-deck | 重構（上層台） Upper structure the figure stands on | The documented second storey; puts the immortal at the machine's crown on the shaft axis | box platform + 勾阑 railing (4 posts, rails, instanced balusters) | 0.9 × 0.8 × 0.08 m platform at y≈2.2, railing h 0.28 | wenxian existence (重構), dims tuice | **[VERIFY]** |
| axle-beam | 車軸 Transverse axle beam | Visible load path ground→wheel→axle→frame; carries the shaft step-bearing | cylinder/beam, octagonal section via CylinderGeometry(…, 8) | length 2.0 m, section ⌀0.14 m at y=0.936 | tuice (structural necessity, standard on all reconstructions) | **[VERIFY]** |
| bolster-pair | 伏兔 Axle bolsters | Blocks seating the chassis spine on the axle — reads as real cart carpentry | 2 × trapezoid ExtrudeGeometry | 0.30 × 0.16 × 0.18 m each | tuice (attested Chinese cart component) | **[VERIFY]** |
| drawbar-crossbar | 轅端橫木 Crossbar at drawbar end carrying the two pulleys | Documented mount for the two 3-cun upright wheels; anchor point of the clutch cords | beam | 0.9 × 0.08 × 0.08 m at drawbar tip y≈1.0 | wenxian existence (轅端橫木下立小輪二), dims tuice | **[VERIFY]** |
| yoke-assembly | 衡與軛 Yoke bar with two saddles | Horse interface implied by the single-pole 独辕 layout; completes the 'chariot' reading | transverse beam + 2 inverted-V ExtrudeGeometry saddles | yoke 1.2 m, saddles 0.25 m tall | tuice (standard single-pole harness archaeology) | **[VERIFY]** |
| lift-cord-left/right | 提輪繩索 Clutch lift cords | Make the automatic clutch chain visible: drawbar swing → pulley → cord → gear drop | TubeGeometry r 0.008 along CatmullRomCurve3, rebuilt on drawbar angle | ~2.2 m path each | tuice (Wang Zhenduo 1937 mechanism reading of 觸落) | **[VERIFY]** |
| gear-hanger-left/right | 小平輪吊架 Drop-gear hangers | Carrier giving each small wheel its vertical engage/disengage travel (replaces abstract clutch dogs) | inverted-U TubeGeometry + axle pin, prismatic Y joint limits [0, 0.09] | 0.25 m wide × 0.30 m tall | tuice | **[VERIFY]** |
| immortal-figure | 木仙人 Robed pointing immortal (rebuild of existing figure parts) | The machine's output display — 立木仙人於上引臂南指 | custom robedFigure: lathe robe + tube arm + extrude sleeve + cone hand + sphere head | height ~0.9 m, arm reach 0.46 m | wenxian existence, all dims tuice | **[VERIFY]** |
| shaft-step-bearing | 軸承鐏 Shaft step bearing | Seats the 8-chi through-shaft on the axle beam instead of dangling below the floor | LatheGeometry collar flare | r 0.047→0.09 over h 0.10 | tuice | **[VERIFY]** |
| dim-tooth-pitch | 齒間相去三寸 Data-card row: tooth spacing | Add to chariot.json dimensions[] — it is in the quoted source and confirms the common module across 24/48T wheels | n/a (copy) | 0.0936 m | wenxian (already inside the songshi-yansu quote) | — |
| dim-wheel-circumference | 圍一丈八尺 Data-card row: road-wheel circumference | Add to dimensions[] with basis note 周三径一 (π≈3), echoing the odometer card's treatment | n/a (copy) | 5.616 m | wenxian (in card quote) | — |
| dim-track-gauge | 輪距 Track gauge between road wheels | Not in the text; must be derived so the mesh geometry closes (z_sub ≈ r_great + d_small pitch chain); drives wheel z positions | n/a (layout parameter) | ~1.75 m (derived) | tuice (geometric closure of the 0.749/0.374/1.498 wheel diameters) | **[VERIFY]** |
| copy-nine-wheels | 用大小輪九，合齒一百二十 Ingenuity copy line: the checksum | Surface the 9-wheels/120-teeth checksum in UI copy — the model satisfies it exactly (2 foot + 2 sub + 2 upright + 2 small + 1 great; 24+24+12+12+48=120) and it is a great trust beat | n/a (copy) | 9 wheels / 120 teeth | wenxian (in card quote) | — |

**File ownership**: `src/machines/chariot/**`, `src/data/machines/chariot.json`, `tests/machines/chariot.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-04 Odometer Carriage 记里鼓车 `odometer`

**Estimated effort**: 5-6 days: train repack + shafts + trip linkages + constraint/whitelist updates 1.5d; pavilion body, railings, hip roof 1.5d; figures/arms/drum/chime/stands 1d; drawbar+phoenix+yoke+wheel/hub upgrades 0.5d; principle aids 0.75d; scene 0.75d

**Current state**: The gear train itself is the one strong point: all eight wheels are present with the exact Song Shi tooth counts (18/54/3/100/10/100 + two 1.872 m road wheels, sum 285), correct module math, consistent mesh center-distances, working 1/100 and 1/1000 ratios, cam-triggered drum/chime events and a good spotlight trigger. Visually, however, it does not read as a carriage at all: the three upper gears (zhongpinglun/xiaopinglun/shangpinglun, up to 1.25 m diameter solid extruded discs with no hubs, shafts or bearings) levitate 0.8–1.5 m BEYOND the front edge of the platform, hovering over the drawbar in open air; the chassis slab floats at y 0.36–0.54, disconnected below the axle at y 0.94. The famous double-decker pavilion (重台) is four bare 9 cm posts holding two slabs — no walls, no railing, no red panels — and both "tier" figures are featureless 0.22×0.65 m boxes standing ON TOP of the roof at the same height, tilting whole-body on a z-axis toward empty space while the drum (bare cylinder) and chime (bare torus) float unmounted beside them. Nothing connects the gear train to the figures, so the machine's entire point — rotation becoming a strike — is invisible.

**Structure gaps (reconcile line by line)**:
- Gear train protrudes out of the vehicle: zhongpinglun (center x=1.506, r=0.624), xiaopinglun (x=1.506) and shangpinglun (x=2.193, r=0.624, outer edge x=2.82) all lie beyond the platform edge (x=1.3), floating in mid-air over the drawbar. The historical machine hides the whole train INSIDE the carriage body (Wang Zhenduo model, Song Shi "遞相鉤鎖…周而復始" implies an enclosed train). Without repacking, no visitor can read this as a carriage that measures distance — it reads as an exploded diagram glued to a cart.
- No carriage body: Song Shi waiguan is explicit — 赤質 (red body), 四面畫花鳥 (painted panels on four sides), 重台 (double tier), 勾闌 (railings), 鏤拱 (carved brackets). Current build has 4 bare posts + 2 slabs. The red two-storey pavilion silhouette IS the recognition feature (it is what the Xiaotangshan Han relief and every museum model show).
- Two-tier figure arrangement is wrong: both figures stand side-by-side ON TOP of the canopy roof (base y=4.5 > roof top y=4.41). Per songshi-ludaolong the drum figure occupies the lower storey and the chime figure the upper storey (下一層木人擊鼓…上一層木人擊鐲). The tier stacking is the machine's name and identity (记里"鼓"车 + 重台). Note: the waiguan passage says the opposite (上層擊鼓), a genuine internal Song Shi discrepancy worth a data note.
- No strike transmission: cam constraints teleport motion from gears (y≈1.05, front of cart) to figures (y=4.82, rear roof) with zero physical parts in between. The text explicitly records 立貫心軸 (vertical through-center shafts); Wang Zhenduo's reconstruction runs the wheel shafts upward with trip pins/levers pulling the figures' arms. Without visible shafts + trip lever + pull rod, the principle (full turn -> one strike) cannot be read.
- No vertical shafts or bearings anywhere: the coaxial pairs xiapinglun+xuanfenglun and zhongpinglun+xiaopinglun and the lone shangpinglun float at their y-heights with nothing holding them. Lockstep pairs are unreadable without a shared visible shaft.
- Chassis/axle disconnect: chassis beam spans y 0.36–0.54 but the axle is at y 0.881–0.991 — the frame hangs below the axle, touching nothing. Needs bearing blocks (伏兔) and the frame raised to sit on the axle, else the cart is physically absurd from any low camera angle.
- Figures are featureless boxes that tilt whole-body about the z axis — and the drum is offset in +z, so the tilt is not even toward the drum. Need human read (robe/head/hat) and an articulated striking ARM holding a mallet; the arm, not the torso, should be the cam follower.
- Drum and chime float unmounted (drum a bare horizontal cylinder at y=5.28, chime a bare torus) — need a drum stand and a hanging frame; the 镯 is a bell-like gong, not a donut.
- Drawbar is a plain straight box: the source specifies 一轅，鳳首 (single drawbar ending in a phoenix head) and 駕四馬 (four-horse team). Phoenix-head finial + yoke crossbar are cheap and highly identifying; horses can be scene props or omitted.
- lilun sits at the axle midpoint but the text says 附於左足 (mounted against the left road wheel). A z-shift toward the left wheel (with the train re-packed accordingly) honors a quoted provenance line.
- Gears are solid full discs (no innerRadius, hub, spokes or web) — the two 1.25 m wheels read as laser-cut plywood instead of built-up wooden wheels.

**Geometry upgrade recipes**:
- **zhongpinglun / xiaopinglun / shangpinglun / xiapinglun / xuanfenglun (layout repack)** — Fold the train back inside the body so every wheel fits within the (slightly enlarged, tuice) platform footprint, using z-offsets and a raised upper mesh plane instead of marching forward in x
  - Recipe: Keep all modules/teeth. New centers (all mesh distances preserved): xiapinglun [0.862, 0.936, -0.35], xuanfenglun [0.862, 1.05, -0.35] (shared vertical shaft); zhongpinglun [0.862, 1.05, +0.294] (dz=0.644=r3+r100, same y); raise xiaopinglun on the shared shaft to [0.862, 1.45, +0.294]; shangpinglun [0.862, 1.45, -0.392] (dz=0.686=r10+r100, same y; the raised plane clears lilun's top at y=1.151). Move lilun to z=-0.35 (toward the left wheel, honoring 附於左足). Enlarge platform to ~3.0×0.12×2.1 and chassis to ~3.0×0.18×0.9 (both tuice already). Update the three mesh constraint anchors and collisionWhitelist; deck at y=1.91 now covers the whole train (top plane 1.485).
- **lilun** — Keep pin-gear style but give the pin ring a wooden felloe read
  - Recipe: Set innerRadius ≈ 0.06 so the rim disc gets a center hole for the axle; the existing buildPinGeometry rim + 18 axial pins is a decent lantern-tooth read against the horizontal wheel; add a small hub cylinder (r 0.05, l 0.12) merged at center.
- **all four large gears (xiapinglun, zhongpinglun, shangpinglun, plus zulun rims)** — Solid discs -> built-up wooden wheels with hub, spokes and rim web
  - Recipe: Pass innerRadius = 0.75×rootRadius to buildGearGeometry so the tooth ring becomes an annulus; merge a hub cylinder (r 0.07, l = thickness+0.06) and 6–8 flat spoke boxes (InstancedMesh or merged BoxGeometry, section 0.09×0.03) from hub to ring. Reads instantly as carpentered wheel; ~400 extra tris each.
- **zulun / right-zulun** — Replace torus rim + box spokes with a true flat wooden rim and hub
  - Recipe: Rim = LatheGeometry of closed rectangular profile [(0.87,-0.06),(0.936,-0.06),(0.936,0.06),(0.87,0.06)] revolved 32 segs (axis = wheel axis); hub = cylinder r 0.09 l 0.2 with cap cones; 16 spokes as InstancedMesh cylinders r 0.022 hub->rim. Kill the rubber-tire torus look.
- **chassis-base + road-axle** — Connect frame to axle with bearing blocks and raise the frame
  - Recipe: Raise chassis beam to y≈1.05 (top of axle) and add two 伏兔 bearing blocks: BoxGeometry 0.22×0.18×0.14 at [0, 0.99, ±0.6], each with a half-round notch faked by placing the box tangent to the axle; add two longitudinal side-rails (beams 3.0×0.1×0.08 at z=±0.42) so the underframe reads as a real cart bed.
- **platform / posts / canopy-roof (pavilion rebuild)** — Turn slabs+posts into the red double-tier pavilion
  - Recipe: (1) Under-deck skirt: 4 thin red panels (BoxGeometry 0.03 thick) enclosing y 0.55–1.91 around the train, front/back panels with a shallow ExtrudeGeometry frame relief; (2) lower cabin y 1.91–3.15 with corner posts kept, mid-floor slab 2.2×0.1×1.5 at y=3.15; (3) upper smaller cabin y 3.15–4.2; (4) railing 勾闌 on both open tiers: InstancedMesh balusters (cylinder r 0.018, h 0.28, ~44 instances) + top-rail TubeGeometry loop; (5) hip roof replacing the slab: ExtrudeGeometry of a trapezoid gable profile (base 2.9, top ridge 1.2, rise 0.45) with 0.25 overhang, plus ridge beam cylinder — a 庑殿 read at <1k tris; paint all body materials the recorded 赤質 red-lacquer.
- **drawbar** — Straight box -> curved single shaft with phoenix-head finial and yoke
  - Recipe: TubeGeometry (r 0.05, 24 segs) along a CatmullRomCurve3 from [1.4, 0.9, 0] dipping to [2.6, 0.75, 0] then rising to [3.6, 1.15, 0]; phoenix head at the tip: LatheGeometry teardrop (profile pts head r 0.09) + beak cone (ConeGeometry r 0.03 l 0.12, tilted down) + crest: 3 thin ExtrudeGeometry flame fins + 2 sphere eyes; yoke crossbar 衡: cylinder r 0.035 l 1.4 lashed perpendicular at x=3.3 with two small fork 轭 (bent TubeGeometry V pieces).
- **lower-figure / upper-figure** — Box -> robed wooden figure with articulated striking arm holding mallet
  - Recipe: Body (fixed): LatheGeometry robe profile [(0,0),(0.10,0),(0.13,0.05),(0.09,0.35),(0.07,0.45)] closed, + torso cylinder, + head sphere r 0.055, + hat cone r 0.06 h 0.06 — ~600 tris; NEW child part <figure>-arm: shoulder pivot revolute [0,0,1] with the existing 0–0.28 rad limits moved onto it, arm = cylinder r 0.025 l 0.30 + mallet: handle cylinder r 0.012 l 0.15 + head cylinder r 0.035 l 0.07 (drum figure) / small hammer sphere (chime figure); re-point the two cam constraints at the arm parts. Place lower figure+drum on the deck (y≈1.97) of the lower tier, upper figure+chime on the mid-floor (y≈3.2), each facing its instrument.
- **drum** — Bare cylinder -> barrel drum on a stand, facing the mallet
  - Recipe: LatheGeometry barrel profile [(0.16,-0.13),(0.19,-0.06),(0.20,0),(0.19,0.06),(0.16,0.13)] revolved (bulged shell), two rim hoops as thin TorusGeometry r 0.165 tube 0.008, tacks as 12-instance tiny spheres per rim; stand = 3 splayed cylinder legs r 0.02 + a cradle ring; orient drum axis horizontal pointing at the figure's mallet, center ~y 2.35 on the lower tier.
- **chime** — Torus -> hanging bell-gong (镯) in a small gallows frame
  - Recipe: Bell = LatheGeometry profile [(0,0.14),(0.05,0.135),(0.075,0.09),(0.09,0.02),(0.088,0)] (closed top, open mouth, bronze); suspension loop = TorusGeometry r 0.02; frame = two posts (cylinder r 0.02 h 0.5) + crossbar with the bell hanging under it on the upper tier; hammer lives in the upper figure's hand.
- **NEW shafts + trip linkage (see data_supplements)** — Make the strike path physical and visible
  - Recipe: guanxin shafts: CylinderGeometry r 0.03 spanning each coaxial stack; zhongpinglun's shaft extends up through a deck hole to y≈2.25 ending in a trip pin (box 0.03×0.09×0.03 radial); trip lever = beam 0.5×0.04×0.04 with mid revolute pivot on a bracket post; vertical pull rod = cylinder r 0.01 from lever end up to the figure's arm elbow; duplicate for shangpinglun rising to the upper tier (shaft length ~2.0). Six small parts, and the whole 100-turns->1-strike causality becomes traceable by eye.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Power-path pulse highlight (button '传动路径'): sequential 0.5 s emissive pulses in exact drivetrain order zulun -> road-axle -> lilun -> xiapinglun -> xuanfenglun -> zhongpinglun -> zhongping-shaft -> trip-lever-drum -> lower-figure-arm -> drum, then branch zhongpinglun -> xiaopinglun -> shangpinglun -> shangping-shaft -> trip-lever-chime -> upper-figure-arm -> chime, with camera dollying along the chain; ends flashing the '八轮合285齿' chip.
- Live triple turn-counter HUD wired to the existing odometer:update event: three dial readouts 'zulun 转数 (mod 100)', 'zhongpinglun 圈数 (= li)', 'shangpinglun 圈数 (= 10 li)' spinning at visibly 100:1:0.1 rates while dragging zulun — the decimal reduction becomes numeric AND visual at once.
- Decimal-handoff slow-mo (extend the existing spotlight trigger): fast-forward to 0.99 li (already graph.setInput 99 turns), then 0.05× slow-motion close-up on the 3-tooth bronze xuanfenglun advancing the FINAL tooth of the 100-tooth zhongpinglun (ghost-trail the last tooth, caption '第100齿'), trip pin hits lever, arm raises, drum strike + radial flash ring + drum sound, HUD flips 0.99 -> 1.00 li. Add a second variant 'ten-li' (setInput 999 turns) for the chime.
- Cutaway toggle '透视车厢': tween body skirt/cabin panels to 12% opacity and lift the roof +0.6 m so the internal train column, vertical shafts and trip rods stay framed by the pavilion silhouette; auto-enable during the spotlight.
- Rolling-distance context on the advance trigger: scroll the ground plane and float a 里堠 milestone prop past the cart once per li so 'distance' is felt physically; wheel ruts scroll in sync with zulun's surface speed (0.936 m radius) proving no slip.
- Mesh-point tooth sparks: at the three mesh constraints (lilun/xiapinglun, xuanfenglun/zhongpinglun, xiaopinglun/shangpinglun) emit a tiny glint per tooth engagement — the wildly different spark rates make the 3:100 reduction viscerally obvious.
- Callout anchors (part -> one-liner): zulun '足轮径六尺 — 一百转恰行一里'; lilun '18齿立轮，附于左足'; xiapinglun '54齿下平轮'; xuanfenglun '铜旋风轮 出齿三 — 十进制减速的枢纽'; zhongpinglun '中平轮百齿：一转=一里 -> 击鼓'; xiaopinglun '小平轮十齿'; shangpinglun '上平轮百齿：一转=十里 -> 击镯'; lower-figure '下层木人击鼓（宋史·卢道隆）'; upper-figure '上层木人击镯'; drum '里鼓'; chime '十里镯'.

**Usage-scene spec (scene.ts)**:
- Setting: Imperial procession avenue outside a Northern Song city gate (Kaifeng) — the odometer carriage rolled in the emperor's guard-of-honor, so a broad official road at mid-morning is its natural habitat
- Ground: Packed loess road disc (~14 m) with two darker wheel-rut strips and scattered stone slabs near the gate; grass verge ring at the edge; ruts UV-scroll during the advance demo to sell motion
- Props: 里堠 li-marker stone: box 0.35×0.9×0.3 + pyramidal cap + plane decal reading 「一里」 (~80 tris, duplicated far down the road); Roadside willow: tapered trunk cylinder + 4 alpha-card foliage planes (~160 tris); 行马 red wooden barrier: two X-cross sawhorse sections flanking the road (~120 tris each); Banner pole with silk pennant: cylinder pole + double-sided plane cloth (~60 tris); Distant city gate tower: single silhouette card with painted roofline (~20 tris); Stone hitching trough + tether post hinting at the recorded four-horse team without modeling horses (~90 tris)
- Lighting: Warm 10 a.m. key sun (~4300 K) raking from the front-left to model the gear discs' edges, cool sky ambient fill, faint dust-haze depth fog — makes the red-lacquer body and bronze whirlwind wheel/chime pop against the pale road
- Ambient motion: Pennant vertex-wave, drifting dust motes in the sun shaft, ground/rut scroll plus passing li-markers during 'advance', soft drum-skin flash and dust puff at each strike

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| guanxin-shaft-lower | 立贯心轴（下） Lower through-center shaft (54t+3t) | Physically joins xiapinglun and xuanfenglun; existence is wenxian (立貫心軸一，其上設銅旋風輪一), dims are not | shaft r 0.03, length 0.45 at [0.862, 0.95, -0.35] | r=0.03 m, l=0.45 m | wenxian (existence, songshi-ludaolong) / tuice (dims) | **[VERIFY]** |
| guanxin-shaft-middle | 中平轮贯心轴（延伸击鼓） Middle through-center shaft (100t+10t) with drum trip extension | Joins zhongpinglun and xiaopinglun and rises through the deck to carry the drum trip pin — the visible 1-li strike path | shaft r 0.03, length 1.3 from y 0.98 to 2.3 at [0.862, z 0.294] | r=0.03 m, l=1.3 m | tuice (Wang Zhenduo reconstruction logic) | **[VERIFY]** |
| shangping-shaft | 上平轮轴（延伸击镯） Upper wheel shaft with chime trip extension | Carries shangpinglun and rises to the upper tier trip pin — the 10-li strike path | shaft r 0.03, length 2.1 from y 1.35 to 3.45 at [0.862, z -0.392] | r=0.03 m, l=2.1 m | tuice | **[VERIFY]** |
| trip-pin-drum / trip-lever-drum / pull-rod-drum | 击鼓拨子·杠杆·引杆 Drum trip pin, lever and pull rod | Converts one zhongpinglun revolution into one mallet lift; makes the cam constraint physically legible | pin box 0.03×0.09×0.03 on shaft top; lever beam 0.5×0.04×0.04 mid-pivot revolute; rod cylinder r 0.01 l 0.35 | as listed, all display-scale | tuice | **[VERIFY]** |
| trip-pin-chime / trip-lever-chime / pull-rod-chime | 击镯拨子·杠杆·引杆 Chime trip pin, lever and pull rod | Same trio for the upper tier 10-li chime strike | same recipes as drum trio, upper tier | as drum trio | tuice | **[VERIFY]** |
| lower-figure-arm / upper-figure-arm | 击鼓臂（鼓槌）/ 击镯臂（镯锤） Striking arms with mallet / hammer | Move the cam follower from whole-body tilt to an arm; existing joint limits [0, 0.28 rad] migrate here | arm cylinder r 0.025 l 0.30 + mallet handle r 0.012 l 0.15 + head r 0.035 l 0.07 | as listed | tuice | **[VERIFY]** |
| body-skirt / body-lower-cabin / body-upper-cabin / mid-floor / railing-lower / railing-upper / roof-hip | 赤质车厢·重台·勾闌·顶盖 Red pavilion body: skirt panels, two cabins, mid-floor, railings, hip roof | The recorded 赤質/四面畫花鳥/重台/勾闌 pavilion — the recognition silhouette; skirt hides/frames the train for the cutaway toggle | panels box 0.03 thick; mid-floor 2.2×0.1×1.5 at y 3.15; balusters InstancedMesh r 0.018 h 0.28 ×~44 + rail tubes; roof ExtrudeGeometry trapezoid profile base 2.9 ridge 1.2 rise 0.45 | platform enlarged to 3.0×2.1 (was 2.6×1.8, tuice), body heights as listed | wenxian (existence, songshi-waiguan) / tuice (all dims) | **[VERIFY]** |
| phoenix-head / yoke-bar | 凤首 / 衡（轭） Phoenix-head finial and yoke crossbar | The recorded 一轅鳳首 drawbar end and harness bar implying the 駕四馬 team | lathe teardrop head r 0.09 + beak cone + crest fins; yoke cylinder r 0.035 l 1.4 with two V forks | as listed | wenxian (existence, songshi-waiguan) / tuice (dims) | **[VERIFY]** |
| axle-bearing-left / axle-bearing-right | 伏兔（轴承垫木） Axle bearing blocks | Connect the raised chassis frame to the axle so the cart is structurally coherent | box 0.22×0.18×0.14 at [0, 0.99, ±0.6] | as listed | tuice (standard Chinese cart construction) | **[VERIFY]** |
| drum-stand / chime-frame | 鼓架 / 镯架 Drum stand and chime hanging frame | Mount the instruments in their tiers facing the figures instead of floating | 3 splayed legs + cradle ring; two posts + crossbar with hanging loop | stand h ≈0.45; frame h ≈0.5 | tuice | **[VERIFY]** |
| copy: tier-discrepancy note | 考据注：击鼓层位之歧 Data note: which tier strikes the drum | Song Shi waiguan says 上層擊鼓/次層擊鐲 while the ludaolong passage says 下一層擊鼓/上一層擊鐲; the build follows ludaolong (lower=drum). Surface this as a controversies entry in odometer.json rather than silently choosing | n/a (copy only) | n/a | wenxian (both quotes already in data) | — |
| copy: lilun placement note | 考据注：立轮附于左足 Data note: vertical wheel mounted beside the left road wheel | Provenance line 附於左足 justifies the z-shift of lilun toward the left wheel in the repack; add to dimensionProvenance note | n/a | n/a | wenxian (songshi-ludaolong, already quoted) | — |

**File ownership**: `src/machines/odometer/**`, `src/data/machines/odometer.json`, `tests/machines/odometer.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-05 Wooden Ox & Gliding Horse 木牛流马 `wooden-ox`

**Estimated effort**: 7 (head+collar 1; cart wheel 0.5; plank pods+frame deck 1; shafts/props/tongue-lock 1; walker limbs+cranks+floor fix 1; principle-aid scripts+callouts 1; plank-road scene 1; data/provenance plumbing 0.5)

**Current state**: Default (wheelbarrow) scheme renders an abstract box-kit, not an ox: a donut-rimmed torus wheel with 12 box spokes under a floating 0.9x0.75 slab, two plain closed crates (pods) with thin lids, two flat planks (ribs) and a short stick (three-leg bar) floating unattached, a literal 0.25m CUBE labeled "curved head" with two sticks poking out of it, two horizontal rails ("raised shafts" that are neither raised nor attached — they start at x=0.425 where the belly ends at 0.45 and just graze it), and a disembodied 20cm dowel floating at the rear as the human-power input. The walker scheme swaps in four toy 4-spoke torus wheels as "cranks", four stick rods, and four plain square posts whose bottoms rest 0.11m BELOW the ground plane. build.ts registers zero customBuilders — everything is stock box/link/wheel/shaft primitives, so nothing zoomorphic, no frame, no bearings, and the famous "one foot, four legs" phrase is illustrated in neither scheme (wheelbarrow lacks the four parking props; walker lacks the one wheel).

**Structure gaps (reconcile line by line)**:
- No ox head/neck: 方腹曲頭 'square belly, curved head' is THE recognition anchor — every replica in the machine's own image gallery (Wuzhang Plains, Zibo, Jianmen) leads with a carved ox head on a raised neck. The current cube-on-a-stick guarantees a visitor cannot identify the artifact.
- No chassis/frame: deck slab, wheel, ribs, pods, shafts, and bar are mutually disconnected floating primitives. There is no fork/bearing cheeks holding the wheel axle under the deck, so the load path (pods -> deck -> bearings -> axle -> wheel -> ground) — the entire 'weight to structure, balance to human' hook — is visually broken.
- Missing four support legs in the wheelbarrow scheme: the Tan reading explains 一腳四足 as one wheel + four parking props, and the sgz-liuma quote in the §7 card even gives their cross-section (前後四腳，廣二寸，厚一寸五分 = 0.0484 x 0.0363 m, wenxian). Without them the scheme cannot show how a loaded single-wheel cart parks on a mountain path — a core exhibit point.
- Twin shafts are horizontal, unattached, and handle-less: the text says 牛仰雙轅 (RAISED twin shafts); they should root into the frame rails, tilt up ~12 degrees, and end in grips — otherwise the human interface (where the operator stands, that they only balance/steer) is invisible.
- Tongue contradicts the text: 舌著於腹 'tongue attaches to the belly', and the gallery's Military-Museum 'Locking Ox-Cart' photo shows the accepted reading — a hidden lever that locks the wheel (captured carts could not be rolled away). Currently it is a stick protruding FORWARD from the head cube; the whole anti-theft brake story is lost.
- Drive-axle is a floating dowel at the rear that connects to nothing; in the wheelbarrow scheme the drive should visibly BE the wheel axle in its bearings, in walker it should be the crank line — otherwise the +/- drive control moves an orphan part.
- Walker legs are bare vertical posts with no hoof/limb silhouette, sunk 0.11m through the floor at rest (center y=0.13, half-height 0.24), and cranks/rods hang from nothing (no stub bearings from the frame).
- Walker naming/phase bug: crank-0/leg-0 'front-left' sits at x=-0.28 which is the REAR given the head faces +X; front/rear ids and their gait phases are swapped relative to the body axis.
- No human-scale cue anywhere, though the signature datum is anthropometric: 人行六尺，牛行四步 (person walks 6 chi per 4 ox-steps).

**Geometry upgrade recipes**:
- **curved-head** — Replace the cube with a merged ox head+neck custom geometry (new customBuilder 'oxHead').
  - Recipe: Neck: CylinderGeometry(rTop 0.07, rBottom 0.11, h 0.35, 12) pitched ~35 deg forward from the deck front. Skull: LatheGeometry over profile [(0,0),(0.09,0.02),(0.115,0.09),(0.08,0.17),(0.045,0.23),(0,0.25)] (16 segments), rotated so the lathe axis lies along +X, then scale z by 1.15 for cheek width. Muzzle: Box 0.10x0.09x0.12 pitched 10 deg down, positioned at skull tip; nostril hint = two tiny cylinders. Horns: two TorusGeometry(0.07, 0.015, 6, 12, PI*0.7) arcs swept up-and-out with ConeGeometry(0.015, 0.04) tips. Ears: ConeGeometry(0.03, 0.07, 8) scaled z 0.4, angled out. Eyes: two small torus rings (relief, no texture needed). mergeGeometries -> ~2k tris. Keep part id so links/callouts survive.
- **neck-link** — Reinterpret as the 領 collar the head 'enters' (頭入領中) instead of a bare stick.
  - Recipe: TorusGeometry(0.09, 0.02, 8, 20) ring seated around the neck base + two Box(0.04,0.1,0.03) cheek plates; keep it a separate selectable part so the quoted phrase gets its own callout anchor.
- **tongue** — Relocate under the belly as the wheel-lock lever; make it the interactive brake.
  - Recipe: Handle: Box 0.22x0.03x0.05 hanging below deck between the shaft roots; pivot pin: Cylinder(0.012, 0.06) transverse; stop block: ExtrudeGeometry wedge (triangle Shape 0.06x0.08, depth 0.05) positioned 0.01 from the wheel rim. Revolute joint about Z, limits [0, 0.5 rad]; rotating it swings the wedge into the rim.
- **square-belly** — Turn the floating slab into a real chassis deck (customBuilder 'oxFrame').
  - Recipe: Merge: two side rails Box(1.6,0.06,0.06) at z=+/-0.33 running from tail to shaft roots; 5 cross-slats Box(0.06,0.03,0.72) evenly spaced (or one merged geometry emulating InstancedMesh); two fork cheeks Box(0.06,0.45,0.05) dropping from deck (y 0.88) to axle (y 0.43) at z=+/-0.055 straddling the wheel; front/rear bolster blocks. This single part visually stitches wheel->deck->shafts.
- **rib-left / rib-right** — Keep the wenxian dims (0.847x0.0726x0.05324 — do not touch) but mount them as on-edge side boards flanking the pods on the deck instead of flat floating planks.
  - Recipe: Rotate 90 deg about X so the 0.0726 face stands vertical; position at z=+/-0.34, y=1.10, tight against pod sides; add 3 small dowel pegs (Cylinder 0.008x0.03) merged at contact points so they read as pegged joinery.
- **cargo-pod-left / cargo-pod-right** — Replace closed boxes with board-built open-top crates (customBuilder 'plankBox') matching 板方囊…厚八分.
  - Recipe: Walls: per side, 4-5 horizontal planks Box(len,0.095,0.019) with 2.5mm gaps between them (gap = free plank seams, zero texture cost); wall thickness 0.019 m from 厚八分; 4 corner posts Box(0.03,0.399,0.03); thin bottom board. Merge to one geometry; keep outer envelope exactly 0.653x0.399x0.387 (wenxian — unchanged).
- **cargo-lid-left / cargo-lid-right** — Make lids read as lids.
  - Recipe: Keep 0.6x0.025x0.35 board, merge two batten strips Box(0.03,0.02,0.35) across the grain plus a rope-cleat bump (short cylinder). Explode animation already lifts them — now the open-top pod beneath shows grain.
- **twin-shaft-left / twin-shaft-right** — Raise (仰), attach, and finish with grips.
  - Recipe: Root each shaft into the frame side-rail ends at x~0.45; rotate about Z by -12 deg so tips rise from y 0.82 to ~1.08; lengthen to 1.4; tip grips: transverse Cylinder(0.018, 0.14, 10) capped with spheres, merged. Add one breast crossbar Box(0.05,0.04,0.6) between the shafts near the root — instantly reads as a barrow/cart interface.
- **three-leg-bar** — Give the wenxian 0.508 bar (length unchanged) a job: cross-bar passed through the leg holes (孔徑中三腳杠).
  - Recipe: Orient along Z linking the two FRONT support legs; add two small torus collars (0.012 tube) where it pierces each leg to show the through-hole joinery; second (tuice) copy for the rear pair.
- **drive-axle** — Make it the actual wheel axle instead of a floating rear dowel.
  - Recipe: Reposition to (0, 0.43, 0), axis along Z, length 0.56 so it visibly passes through the wheel hub and both fork cheeks; add square hub key (Box 0.05x0.05x0.08) merged at center; keep joint/drive id unchanged so triggers still work. In walker scheme, re-dress via a scheme patch as the crank line hanger (or hide and drive cranks directly).
- **central-big-wheel (wheelbarrow scheme)** — Replace donut-torus rim with a proper wooden cart wheel (customBuilder 'spokedCartWheel').
  - Recipe: Rim: LatheGeometry ring with rectangular cross-section — profile [(0.36,-0.035),(0.42,-0.035),(0.42,0.035),(0.36,0.035)] closed, 24 segments (reads as felloes; optionally 12 arc segments with tiny gaps); 12 tapered spokes Box(0.30,0.045,0.03) with scale-taper toward rim; hub Cylinder(0.06,0.06,0.12,12) with chamfer cones; thin iron-tire ring Lathe at r 0.425. ~3k tris, same radius 0.42.
- **walker-crank-0..3** — Replace 4-spoke torus wheels with real crank webs.
  - Recipe: customBuilder 'crankDisk': disk Cylinder(0.09,0.09,0.03,20) + crank pin Cylinder(0.015,0.05) at radius 0.07 + a stub axle Cylinder(0.02,0.08) on the back face; add per-crank hanger Box(0.05,0.20,0.05) from deck underside to the stub (fixes the hanging-from-nothing look). Also fix the front/rear id-position swap (or swap the phases).
- **walker-rod-0..3** — Rods with visible pin joints.
  - Recipe: Merge Box(0.24,0.035,0.025) with two end bosses Cylinder(0.022,0.03) — classic connecting-rod silhouette; align boss holes to crank pin and leg pin heights.
- **walker-leg-0..3** — Ox-limb silhouette instead of bare posts, and lift out of the floor.
  - Recipe: customBuilder 'oxLeg' (one merged geometry so the existing prismatic bob still works): thigh Box(0.06,0.20,0.055) raked 15 deg; knee boss Cylinder(0.03,0.06) transverse; shank tapering Box 0.05->0.04 x0.26 via two stacked boxes; hoof ExtrudeGeometry trapezoid Shape (0.09 wide, 0.05 tall, chamfered toe) depth 0.08. Reposition so hoof sole rests at y=0 at rest (raise part center from 0.13 to ~0.24), prismatic travel 0..0.14 upward unchanged.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Load-vs-balance arrow overlay (wheelbarrow, the machine's stated hook): fat red arrows (labeled ~100 kg) from cargo-pod-left/right straight down through oxFrame fork cheeks -> drive-axle -> central-big-wheel -> ground contact dot; simultaneously two tiny green arrows (~3 kg, labeled '扶持力') at the new shaft grips. The visual weight contrast IS the lesson 'weight to the structure, balance to the human'.
- Power-path highlight sequence on 'spotlight' (wheelbarrow): shaft grips -> twin-shaft-left/right -> oxFrame rails -> drive-axle -> central-big-wheel -> forward roll of the whole assembly by one wheel circumference with a ground tick-mark trail; end on caption 日行二十里 (20 li a day).
- Tongue-lock sub-demo (uses gallery image 4 as evidence card): click tongue -> lever rotates, wedge meets wheel rim, subsequent drive input shakes but does not rotate; caption '舌著於腹 — twist the tongue and a captured cart will not roll'. Release to unlock. This makes the strangest quoted phrase the most memorable interaction.
- Parking-props demo (after props are added): toggle 'march / camp' — moving state lifts the four legs 8 cm, parked state drops them and dims the wheel; caption 一腳四足 = one wheel, four feet (Tan reading).
- Walker gait slow-mo: ghost pods + lids to 15% opacity, drive drive-axle at 0.1 rad/frame; sequentially flash leg 0->1->2->3 with a phase dial widget showing 0, pi/2, pi, 3pi/2 (the phases already exist in walker.json); floor paints hoof-contact footprints; step counter renders 人行六尺，牛行四步 as a walking human silhouette advancing 6 chi beside 4 ox steps.
- Scheme A/B compare banner: both viewports driven by the same input; A displays distance rolled, B displays steps taken; persistent badge 诸家复原之一 'One of several reconstructions' as mandated by the §7 card — the two-scheme dispute is itself the exhibit.
- Pod cutaway: hide lid + front plank row of cargo-pod-left revealing a rice heap insert; callout 每枚受米二斛三斗 ≈ 47 L — a year's grain for one soldier.
- Callout anchors (part -> one-liner): curved-head '曲頭 the carved ox head'; neck-link '頭入領中 head enters the collar'; cargo-pod-left '方囊 47 L rice'; twin-shaft-right '仰雙轅 raised shafts — steer, not carry'; central-big-wheel '一腳 the single foot'; prop-leg-fl '四足 parking feet'; tongue '舌 the hidden lock'; three-leg-bar '三腳杠 through-hole cross bar'.

**Usage-scene spec (scene.ts)**:
- Setting: Shu plank road (栈道) bolted to a cliff face at dawn — the exact context of the Hanzhong grain runs, and the Chen Congzhou plank-road survey is already cited in the machine's own scheme evidence.
- Ground: A narrow 2.5 m-wide plank causeway: ~40 instanced plank boxes (staggered lengths, 1-2 cm gaps) on two edge stringers; under-deck angled support struts (instanced beams) socketed into the cliff; the outer edge drops into fog — no terrain needed beyond a fog card.
- Props: Cliff wall: 3-4 large chunked boxes with coarse vertex-noise normals rising on the inner side (~3k tris); Stacked grain sacks (3 capsule/lathe blobs with a rope-groove ring, ~450 tris) beside the path; A second wooden-ox far down the path at low LOD (reuse frame+wheel+pods merged, ~800 tris) to sell the convoy 群行 image; Leaning soldier kit: spear (cylinder+cone) and round shield (lathe disc) against the cliff (~120 tris); 6 instanced low-poly pines (3 stacked cones + trunk each, ~600 tris) on the cliff top; Rope coil (torus, 60 tris) and a wooden mile-post (post + plank sign) marking 二十里
- Lighting: Cool blue-grey misty dawn: soft directional key raking along the path, warm low sun rim from the valley side, pale fog (FogExp2) swallowing both path ends; mood = arduous mountain logistics, the ox as the lone reliable thing.
- Ambient motion: Two translucent fog cards slow-drifting across the valley gap; occasional dust motes over the planks; the distant convoy ox bobs 1 cm on a slow sine — total scene well under 30k tris.

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| prop-leg-fl | 前左撑足（前后四脚之一，共四件） Front-left support leg (x4: fl/fr/rl/rr) | Completes 一腳四足 in the wheelbarrow scheme: four parking props that let the loaded single-wheel cart stand on a mountain path; enables the march/camp demo. | beam 0.0484 x 0.88 x 0.0363, raked 10 deg outward, small foot pad box merged; hinged (revolute, limits 0..0.5 rad) so props lift when marching | cross-section 0.0484 x 0.0363 m (廣二寸，厚一寸五分, in the §7 sgz-liuma quote, wenxian); length 0.88 m to reach ground from deck (tuice) | wenxian (cross-section) / tuice (length, rake) | **[VERIFY]** |
| pod-wall-thickness | 方囊板厚（厚八分） Grain-pod wall thickness for plankBox builder | Drives the board-built pod rebuild; the quote 板方囊…厚八分 is already in the §7 card but the metric conversion is not tabulated there. | parameter, not a part: plank thickness for plankBox | 0.01936 m (八分 at 0.242 m/chi) | wenxian (text) — conversion needs check | **[VERIFY]** |
| axle-hole-spec | 前轴孔（去头四寸，径中二寸） Front axle hole position and bore | Places the drive-axle through the ribs/frame authentically and gives the axle its bore callout; quote 前軸孔分墨去頭四寸，徑中二寸 is in the §7 card, conversions are not. | positioning datum + torus collar rings where axle pierces frame | hole center 0.0968 m from the head end; bore 0.0484 m | wenxian (text) — conversions need check | **[VERIFY]** |
| shaft-grip-left | 辕端握把（左右各一） Shaft grip (x2) | Marks the human interface; anchor for the green balance-force arrows. | cylinder r 0.018 x 0.14 transverse at shaft tip + sphere caps, merged into shaft or separate part | r 0.018, l 0.14 m | tuice | **[VERIFY]** |
| yoke-collar | 领（头入领中） Neck collar | Gives the quoted phrase 頭入領中 a physical, selectable referent at the head-neck joint. | torus r 0.09, tube 0.02 + two cheek plates | r 0.09 m | tuice | **[VERIFY]** |
| brake-block | 制动楔（舌锁） Wheel lock block | The wedge the tongue lever swings into the wheel rim for the lock demo (Locking Ox-Cart model, gallery image 4). | ExtrudeGeometry triangular wedge 0.06 x 0.08 x 0.05 | 0.06 x 0.08 x 0.05 m | tuice | **[VERIFY]** |
| rice-fill | 米堆填充（每囊一件） Rice fill insert (per pod) | Visible payload for the cutaway; carries the 二斛三斗 ≈ 47 L caption (volume already wenxian in §7). | custom low-poly heightfield heap sized to pod interior | fits 0.615 x 0.36 x 0.35 m interior | tuice (shape); 47 L figure already in card | — |
| rear-cross-bar | 后三脚杠（推测补配） Rear leg cross-bar | Mirrors the wenxian front three-leg bar so both leg pairs are braced; distinguish clearly from the researched 0.508 m bar. | link 0.508 x 0.045 along Z with through-hole collars | copy of researched bar (0.508 m) | tuice (the duplication, not the length) | — |
| copy-composite-note | 文案：木牛+流马合成模型说明 UI note: composite model disclosure | The model mixes muniu parts (belly, head, shafts) with liuma-dimensioned parts (ribs, pods, bar); one sentence in the data json prevents the exhibit from implying a single documented artifact, consistent with the card's 无权威定论 stance. | copy only | — | wenxian framing | — |
| walker-id-fix | 步行方案前后命名修正 Walker front/rear id-phase correction | crank-0/leg-0 labeled front-left sits at x=-0.28 (rear, since the head faces +X); swap front/rear names or phases in walker.json so the gait narration matches the body. | data fix only | — | internal consistency | — |

**File ownership**: `src/machines/wooden-ox/**`, `src/data/machines/wooden-ox.json`, `tests/machines/wooden-ox.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-06 Pattern Loom 提花织机 `loom`

**Estimated effort**: 5-6

**Current state**: The build renders an abstract stick sculpture, not the Laoguanshan artifact: an 8-member box-wireframe frame (4 posts + 4 longitudinal rails, no transverse rails), two 0.15m stub axles that fail to span the 0.26m frame and float unattached, a fence of twelve 7mm-square stick "treadles" rocking as one rigid piece, 48 straight-cylinder warp threads hovering as a flat plane that rigidly translates up/down, eight matchstick "heddles" standing VERTICALLY spread across the warp width (rotated 90 degrees from reality — real heddle rods lie horizontal spanning the warp and stack in dozens along it), and eight fingernail-size cam pucks floating in a row with no shaft, followers, cords, or leashes connecting anything. Shuttle and cloth are plain boxes (the shuttle's long axis is even perpendicular to its travel direction), the "beater" is a single vertical stick, and the "single hook" — the machine's namesake 一勾 — is a straight bronze bar. A visitor might guess "loom" from the thread plane but cannot recognize the Laoguanshan model, and the untextured grey cloth box makes the entire program-swap pattern demo (the machine's whole point) invisible.

**Structure gaps (reconcile line by line)**:
- WRONG TREADLE SYSTEM (historical conflation): the twelve-treadle bank cites Ma Jun's 十二躡 multi-shaft damask loom, a different lineage; the Laoguanshan machine is a pedal + one-hook-multi-heddle (一勾多综) loom — the Silk Museum reconstruction uses a two-pedal (双蹑) arrangement (one lifts, one returns/indexes). Twelve treadles actively misteach what makes this machine special (few pedals + stored heddle program instead of one pedal per heddle). Also the whole bank shares a single revolute joint so all 12 rock together, which reads as nonsense.
- NO VISIBLE TRANSMISSION anywhere: no cords from pedals to the hook arm, no leashes (综线) from heddle rods down to warp threads, no followers from cams to heddles, no arm carrying the hook. Every link in the power path is constraint magic, so the museum visitor sees parts twitch with no cause — the principle is unreadable.
- HEDDLE BANK INVERTED AND SPARSE: the artifact's signature is a dense bank of DOZENS of thin horizontal heddle rods spanning the warp width, stacked along the warp direction (the physical 'program memory'). Current build has 8 vertical sticks spread ACROSS the warp at one station — each could only touch one thread, so 'a heddle lifts a selected thread set' is conceptually impossible to read.
- NO MID-FRAME GANTRY/SLIDE RAILS: nothing holds the heddle bank or guides the sliding carriage (滑框); selector parts float in air, and the carriage slides vertically when the real sliding frame indexes horizontally along the bank to queue the next heddle for the single hook.
- WARP PATH FAKE: threads neither wrap the warp beam nor converge to a fell line at the cloth edge; the 'shed' opens by rigid vertical translation of a whole layer instead of a wedge hinging at the fell — 梭口 (the shed), the fundamental weaving concept, never appears.
- BEAMS NOT INTEGRATED: warp/cloth beams do not span the frame, carry no wound warp/cloth sleeves, and have no ratchet/pawl — let-off and take-up (why cloth accumulates) are invisible; the weft-counter puck floats as an unexplained bronze disc.
- CLOTH HAS NO PATTERN: the woven panel is a flat grey box, so the core demo ('swap the 8-heddle program, watch two contrasting brocades emerge') has no visual output at all despite build.ts emitting pattern:contrast events.
- NO HUMAN CONTEXT OR SCALE STORY: no weaver position (stool/kneeling mat at the cloth beam), and nothing communicates that this is the ~1/6-scale burial model (0.85m) of a ~2m working machine — a key card fact.
- SHED DRIVE COVERAGE: only heddle-0 and heddle-4 connect to the two warp layers, so 6 of 8 program steps produce no thread motion — the program appears to do nothing most of the time.

**Geometry upgrade recipes**:
- **loom-frame (loomFrame builder)** — Turn the box wireframe into the recognizable low bedstead frame with mid-frame heddle gantry; keep it parametric so the linkage scheme's 0.63x0.19x0.37 override still works.
  - Recipe: Keep 4 posts + 4 longitudinal rails; add (a) 4 transverse rails (BoxGeometry along Z) at both ends top+bottom so the frame reads joined, (b) let rails extend 0.01 past posts to suggest through-tenons, (c) a gantry at x = -0.28*length: two uprights (beam x 0.45*height x beam) + top crossbar + two horizontal slide rails (0.20*length x 0.008 x 0.008) at heddle-top height for the carriage, (d) two low pedal-pivot lugs at the front-bottom rail. All positions as fractions of length/height passed via params. ~40 boxes, <2k tris.
- **warp-beam / cloth-beam** — Make them real beams that span the frame with wound material and take-up hardware.
  - Recipe: LatheGeometry profile: central barrel r0.016 over 0.24 span, swelling to r0.02 flanged ends, plus 0.012 square axle stubs (small boxes) seated through the side rails. Add a 'wound warp' sleeve on warp-beam and 'wound cloth' sleeve on cloth-beam: CylinderGeometry r0.024 with 2-3 shallow spiral grooves faked by 3 stacked slightly-offset cylinders, silk material. On the cloth-beam outboard end add an 8-tooth ratchet disc (reuse gear builder, r0.015) + pawl link resting on it.
- **treadle-bank (loomTreadles builder)** — Replace the 12-stick fence with the two-pedal 双蹑 arrangement and visible pull cords (keep drive-node id and cam constraint).
  - Recipe: count:2; each pedal a tapered plank via ExtrudeGeometry (trapezoid Shape 0.22 long, 0.045 wide at heel, 0.03 at toe, depth 0.012), both hinged on a shared floor pivot shaft (CylinderGeometry r0.006 L0.20 along Z). Cords: two TubeGeometry runs (r0.0012, CatmullRom from pedal toe up to hook-arm tail and to carriage indexing lever). Keep the Ma Jun 十二躡 quote in copy as lineage context, not geometry.
- **heddle-0..7** — Rotate the concept 90 degrees: each heddle becomes a horizontal rod spanning the warp with hanging leashes and a grab-loop, stacked along the warp direction.
  - Recipe: Per heddle: rod CylinderGeometry r0.0025 L0.18 along Z at y~0.34, stacked at x = -0.10 + i*0.008; center grab-loop TorusGeometry r0.004 tube 0.001 standing up (what the hook catches); leashes as instanced thin cylinders (r0.0004, L~0.07, 10-12 per rod) dropping from rod to alternate warp-thread heights, using the userData.mechanicaInstances instancing path already supported in primitives.ts. Lifted heddle carries rod+loop+leashes up 0.05.
- **NEW passive bank behind heddle-0..7** — Show 'dozens of heddles' so the stored-program idea lands (declared simplification stays 8 active).
  - Recipe: One static part: InstancedMesh of 20 thinner rods (r0.0018 L0.17) continuing the stack at 0.008 pitch, slightly darker wood; opacity-fade toggle for cutaway.
- **single-hook** — Make the namesake actually a hook on a pivoted arm above the bank.
  - Recipe: TubeGeometry along a J-curve: straight 0.05 shank + quarter-torus r0.008 tip (12 segments), hung from a hook-arm (TubeGeometry r0.004, 0.14 long) pivoted on the gantry crossbar; arm tail takes the pedal cord. Position over the bank so the hook tip aligns with the current heddle's grab-loop.
- **selector-carriage (sliding-frame scheme)** — Become a real sliding frame riding the gantry rails, indexing ALONG the bank (X), not vertically.
  - Recipe: Open rectangle of 4 thin boxes (0.10 x 0.014 outer, 0.006 members) spanning the bank; two groove sleeves (boxes with 0.009 slots faked by two L-profiles) wrapping the slide rails; change joint to prismatic axis [1,0,0] limits [0,0.056] and drive it one 0.008 step per pick so 'slide one pitch, hook the next heddle' is visible.
- **selector-cam-0..7** — Consolidate the 8 floating pucks into a legible 'program barrel' (declared exhibit abstraction) with visible followers.
  - Recipe: Add a static axle (CylinderGeometry r0.004 L0.18 along Z) under the bank; each cam becomes an eccentric lobe: ExtrudeGeometry of an egg Shape (base r0.011, lobe offset 0.006, depth 0.008) keyed at its program phase; 8 instanced follower rods (r0.0015 L0.06) rising from lobe tops to heddle rod ends. Reads as a music-box barrel = stored program; label 展项简化.
- **warp-shed / warp-shed-odd (loomThreads builder)** — Give threads a real path and a wedge-opening shed hinged at the fell.
  - Recipe: Each thread = 3 merged segments (or one TubeGeometry over a 4-point polyline): warp-beam tangent (x-0.25,y0.13) up over the rear guide rod, level run y0.28 through the heddle zone, converging to a single fell line (x0.06, y0.30, all z pulled 15% toward center). Build moving layers with origin AT the fell and switch joints to revolute about Z at the fell so lifting opens a V-wedge; 24 threads/layer via instancing, r0.0008, 4 radial segments.
- **woven-cloth** — The money shot: patterned cloth that visibly changes when the program swaps.
  - Recipe: PlaneGeometry 0.18x0.14 (24x18 segs) with sin-ripple displacement for weave texture; runtime CanvasTexture painter: each weft event paints one row where column colors come from the active program's lift sequence (program A draws the zigzag 'dragon' lattice, program B its mirrored diamond), crimson/gold on plain ground; advance rows toward the cloth beam and roll oldest rows onto the wound-cloth sleeve. This is what makes program:contrast visible.
- **beater** — From vertical stick to a transverse reed comb swung from the gantry (flag reed-vs-weaving-sword as verify).
  - Recipe: Frame: top+bottom bars (Box 0.18 along Z x 0.008) + end caps; ~40 dents as InstancedMesh thin boxes (0.0008 x 0.05 x 0.003) — ~500 tris; hang from two swing arms (TubeGeometry r0.003) pivoted on the crossbar so the existing revolute cam constraint swings it into the fell.
- **shuttle** — Boat/stick shuttle oriented along its travel axis (Z) with wound weft.
  - Recipe: ExtrudeGeometry of a pointed-leaf Shape (0.10 long along Z, 0.02 max width, depth 0.008, both ends tapering via quadratic curves) + a weft bulge (CylinderGeometry r0.006 L0.05 along Z, silk crimson) sunk in a center notch; drop the box; keep prismatic Z joint, lower to y0.295 so it passes INSIDE the open shed wedge.
- **weft-counter** — Read as an exhibit tally, not a mystery puck.
  - Recipe: 6-spoke mini wheel (reuse wheel builder r0.015 w0.006) on a side-rail bracket box, with 8 painted tick marks via thin instanced boxes on the rim; caption anchor 纬次计数·展项.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Power-path highlight sequence for the spotlight trigger (reuse existing events, add ordered glow): treadle-pair press -> cord tube pulses -> hook-arm tilts -> hook tip + current heddle grab-loop flash -> heddle rod + its leashes rise -> selected warp layer opens the shed WEDGE (hold 0.8s, caption 梭口 shed) -> shuttle glides through the wedge leaving a growing weft TubeGeometry -> reed beats it into the fell -> one new pattern row paints onto the cloth texture -> ratchet clicks one tooth. Then swapProgram fires, the program-strip HUD reorders, two more picks run, and the camera pushes in on the cloth showing rows A vs rows B side by side (pattern:contrast).
- Program-strip HUD anchored above the cam barrel: 8 slots showing the active order (1-3-5-7-2-4-6-8 vs 8-6-4-2-7-5-3-1); each slot lights as its cam lobe passes; clicking the strip invokes the existing reorder-heddles trigger. This is the 'program vs data' punchline made tangible: strip = program, cloth = data.
- Fix demo legibility bug: route at least 4 heddles to thread motion — pair heddles 0-3 to warp-shed and 4-7 to warp-shed-odd via lockstep 0.5 each (or add two more thin thread layers) so most program steps visibly move threads instead of the current 2-of-8.
- Ghost/cutaway toggles: (a) 'dozens view' fades the 20-rod passive bank in/out to state the declared 8-heddle simplification honestly; (b) 'selector x-ray' makes the gantry and carriage 15% opaque while the hook, grab-loops, and cam barrel stay solid; (c) scheme compare highlights ONLY the differing selector assemblies (sliding carriage vs crank+links) with matched cameras in the dual viewport.
- Slow-motion sub-demo 'one pick in 6 seconds' using the existing weft-insertion trigger with param 1 but a 6s tween: side-on camera at the shed, pause at max opening with callouts; then a 'weave a band' mode runs weft-insertion(16) at normal speed so the cloth pattern accumulates and the counter spins.
- Callout anchors (part id -> one-liner): single-hook -> '一勾 one hook picks exactly one heddle per pick'; selector-carriage -> '滑框 slides one pitch to queue the next heddle'; heddle-0 (+passive bank) -> '综片库: the pattern stored as dozens of heddles'; treadle-pair -> '蹑 pedals power the lift'; selector-cam barrel -> '展项简化: stored order shown as a barrel'; woven-cloth -> '织出的图案就是程序的输出'; weft-counter -> '纬次计数 (exhibit aid)'; loom-frame -> '1/6 burial model of a ~2m machine'.
- Scale story beat: a toggle that ghosts a 6x outline box (2m class) around the model with a standing-figure silhouette at the cloth beam, quoting the card's 1/6-scale tuice note — makes visitors grasp they are looking at the excavated MODEL.
- Weft-as-particle: the shuttle trails a crimson thread tube each pass that merges into the fell — color it per program (A crimson, B gold) so the cloth literally stripes into a woven log of the program history.

**Usage-scene spec (scene.ts)**:
- Setting: Han-dynasty Chengdu brocade workshop (蜀锦作坊) interior corner: two timber posts and a rammed-earth wall panel behind the loom, a lattice window high on the left pouring warm light across the warp plane; the machine sits on a woven reed mat, cloth-beam end toward the viewer where the weaver would sit.
- Ground: 3m circular tamped-earth disc (vertex-color mottled ochre, 200 tris) with a rectangular woven reed mat under the loom (thin box + procedural basket-weave stripes via canvas texture or alternating vertex-color strips).
- Props: Silk skein basket: LatheGeometry bowl + 6 instanced thread coils (small tori), crimson/gold silk material, ~250 tris; Two dye jars: LatheGeometry bellied jars (one indigo lid, one crimson) ~150 tris each; Wall-hung finished brocade bolt: rolled-cloth cylinder + hanging ExtrudePanel reusing the SAME program-A CanvasTexture as the loom's cloth — visually links workshop output to the machine, ~120 tris; Low weaver's stool at the cloth beam: 4 boxes + seat plank ~60 tris (empty, implies the operator without a creepy figure); Spindle and distaff leaning on the wall: 2 cylinders + whorl disc ~80 tris; Lattice window: emissive warm plane behind a 5x7 grid of thin boxes, ~180 tris
- Lighting: Warm late-afternoon key (3000K) through the lattice casting soft slatted shadows across the warp; cool dim ambient fill; faint warm rim from the right so the silk threads catch specular lines; quiet, close, workshop mood.
- Ambient motion: Dust motes drifting in the window light shaft (tiny billboard particles); the hanging brocade bolt and skein coils sway ~1 degree on a slow sine; subtle specular shimmer scrolling along warp threads (uv offset) suggesting tensioned silk.

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| treadle-pair | 双蹑踏板 Double-pedal treadles | Replace the historically-conflated 12-treadle bank; two pedals (lift / return-index) are the reconstruction's drive and keep the primaryDrive node. | 2 extruded trapezoid planks + shared floor pivot shaft | pedal 0.22x0.012x0.04 m each; pivot shaft r0.006 L0.20 m | wenwu (pedal components attested in the excavated models; count per Silk Museum reconstruction) | **[VERIFY]** |
| pedal-cords | 提综绳 Pedal pull cords | Make the pedal-to-hook power path visible. | 2 TubeGeometry CatmullRom runs pedal-toe to hook-arm tail / carriage lever | r0.0012 m, ~0.35 m runs | tuice (display reconstruction of attested cord transmission) | — |
| hook-arm | 提综勾臂 Hook lever arm | Carries the single hook over the bank; converts pedal pull to heddle lift. | TubeGeometry arm pivoted on gantry crossbar + J-curve hook tip | arm r0.004 L0.14 m; hook shank 0.05 m, tip quarter-torus r0.008 m | tuice (per one-hook selection principle, kaogu-laoguanshan) | — |
| heddle-gantry | 综架与滑框导轨 Heddle gantry and slide rails | Structural home for the heddle bank, sliding carriage, and hook arm; currently everything floats. | 2 uprights + crossbar + 2 slide rails (boxes), parametric to frame length/height for both schemes | uprights 0.018x0.22x0.018 m; rails 0.17x0.008x0.008 m (186 scheme) | tuice (Silk Museum reconstruction layout) | **[VERIFY]** |
| heddle-bank-passive | 纹综片库（静态陪衬） Passive pattern-heddle bank | Shows the 'dozens of heddles = stored program' signature while 8 stay active (declared simplification). | InstancedMesh 20 rods along X at 0.008 pitch behind the 8 active rods | rod r0.0018 L0.17 m | wenwu (models preserve dozens of heddle rods with silk traces); displayed count is a display choice | **[VERIFY]** |
| heddle-leashes | 吊综丝线 Heddle leashes | Connect heddle rods to warp threads so 'lift rod -> lift selected threads' reads. | Per active heddle ~12 instanced thin cylinders rod-to-thread | r0.0004 L~0.07 m | tuice (leash principle attested; counts are display) | — |
| warp-guide-rods | 前后导经杆 Front/rear warp guide rods | Give the warp a tensioned path over the frame ends instead of floating. | 2 transverse cylinders at frame ends | r0.008 L0.24 m | tuice | **[VERIFY]** |
| warp-wound-sleeve / cloth-wound-sleeve | 经卷与布卷 Wound warp and cloth rolls | Show let-off and take-up; cloth roll receives painted pattern rows. | Layered cylinders on each beam, silk material | r0.024 m, L0.20 / 0.16 m | tuice | — |
| cloth-ratchet | 卷布轴棘轮与掣爪 Cloth-beam ratchet and pawl | Explains why woven cloth holds tension; clicks during take-up beat. | 8-tooth disc (gear builder) + pawl link on side rail | disc r0.015 t0.006 m; pawl 0.03 m | tuice (presence on excavated models unconfirmed) | **[VERIFY]** |
| reed-dents | 筘齿 Reed comb dents | Turn the beater into a recognizable transverse reed; flag reed-vs-weaving-sword question for Han date. | InstancedMesh ~40 thin dents in a 2-bar frame swung from gantry | dent 0.0008x0.05x0.003 m; frame span 0.18 m | tuice | **[VERIFY]** |
| program-barrel | 展项程序轴（凸轮轴） Program barrel axle and lobes | Consolidate the 8 floating cam pucks into one legible stored-program barrel with followers (declared exhibit abstraction, not excavated). | Axle cylinder along Z + 8 extruded egg lobes + 8 instanced follower rods | axle r0.004 L0.18 m; lobe base r0.011 offset 0.006 t0.008 m; followers r0.0015 L0.06 m | tuice (declared simplification per data card) | — |
| weaver-stool | 织工坐凳 Weaver's stool | Human context: marks the operator position at the cloth beam. | Seat plank + 4 leg boxes | 0.18x0.10x0.12 m | tuice (scene prop) | — |
| ground-heddles | 地综两片（可选） Ground heddles (optional) | Reconstruction distinguishes 2 pedal-driven ground heddles (tabby ground) from the pattern bank; adds fidelity if confirmed. | 2 rods with leashes nearer the fell | rod r0.0025 L0.18 m | tuice | **[VERIFY]** |
| pattern-legend-copy | 纹样图例文案 Pattern legend copy strings | data json additions naming program outputs: program A -> 交龙对凤纹锦 (sliding-frame evidence), program B -> 世毋极锦 / 五星出东方利中国 (linkage evidence), wiring existing scheme evidence into the cloth-texture demo UI. | copy only | n/a | wenwu (already in data card scheme evidence) | — |
| scale-ghost | 原机六倍轮廓虚影 Full-size ghost outline | Communicates 1/6 burial-model scale vs ~2m working machine (card tuice fact). | Wireframe box + simple standing silhouette, 10% opacity toggle | ~5.1x1.6x3.0 m envelope (6x model) | tuice (card: model ~1/6, full machine ~2 m class) | — |

**File ownership**: `src/machines/loom/**`, `src/data/machines/loom.json`, `tests/machines/loom.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-07 Revolving Typecase 转轮排字盘 `typecase`

**Estimated effort**: 5 (wheel tray+deck+polar type 1.5d; pedestals+seat 0.5d; Bi Sheng bench/brazier/forme-fill/sheet 1d; retrieval+race+five-step aids 1.5d; scene props+lighting 0.5d)

**Current state**: The two 2.2m type wheels render as open horizontal wagon-wheels (torus rim + 16 flat box spokes) floating ~4.5cm above skinny 9cm box posts, each topped by a second thinner spoked hoop (the "index boards") hovering another 7.5cm up; only the left hoop carries type — a square 20x16 cartesian grid of 2.5mm-thick tiles that overhangs the circular form and is nearly invisible edge-on, while the right wheel is completely bare. The Bi Sheng station at z=1.55 is a mid-air cluster of unadorned boxes: two plain slabs for iron plates, an empty 4-bar frame (the one decent custom part), a single oversized 4cm "picked type" tile, a featureless heater box, a hovering plank press, and a flat sheet — no bench, no brazier form, no ink tools, nothing grounded. Nothing reads as the Nong Shu revolving typecase: no tray deck, no bamboo mat, no numbered sector compartments, no visible axle or cross-foot pedestal, and no compositor seat between the wheels, so the signature "person sits, type comes to the person" composition is absent.

**Structure gaps (reconcile line by line)**:
- Wheel has no deck: the text is explicit — 以圓竹笆鋪之，上置活字板面 — the wheel face is a bamboo-mat tray carrying type boards. An open spoked wheel cannot hold type; visitors see a wagon wheel, not a typecase. This is the #1 recognition killer.
- No radial/annular compartments (各依號數): the 1313 woodcut and every museum reconstruction show a dartboard of numbered wedge cells packed with type. The square tile grid on a round hoop actively misreads; the bare misc wheel breaks the recorded two-wheel symmetry (凡置輪兩面).
- No credible pedestal or visible axle: a 2.2m wheel on a 9cm floating stick is structurally absurd; the reconstruction uses a vertical axle post on a crossed-foot base with splayed struts, axle continuing through a hub. buildWheel also produces no hub, so spokes just overlap at center.
- No compositor seat or composing table between the wheels: 一人中坐，左右俱可推轉摘字 is the working principle. Without a stool at x=0 (and wheels widened from +/-1.25 to ~+/-1.45 — current rim gap is only 0.295m, too narrow for a seated person), the retrieval story is invisible.
- Bi Sheng forme is empty: 乃密布字印，滿鐵範為一板 — a filled forme IS the printing plate; an empty frame communicates nothing. Also no workbench under the plates (they float at y=0.22), so the two-plate alternating workflow (常作二鐵板) has no workshop context.
- Heater is a plain box: 持就火煬之 needs a recognizable charcoal brazier with embers under plate A to explain melt-set-release of the resin-wax bed.
- No ink/brush/paper context for the final print step (刷印), and the picked type never travels from wheel to forme — the pick happens 1.5m away at the plates, severing the link between Wang Zhen retrieval and Bi Sheng imposition.
- Type blocks are wrong species on the wheel: Wang Zhen used ~2cm-tall standing wooden type, not Bi Sheng 2.5mm clay wafers; flat wafers on the wheel are invisible and historically mixed-up (keep clay wafers only at the Bi Sheng station).

**Geometry upgrade recipes**:
- **rhyme-wheel / misc-wheel** — Rebuild as a shallow round tray with rim wall, hub, and under-deck spokes via a new customBuilder typecaseWheel
  - Recipe: LatheGeometry profile for rim+deck in one sweep: points [(0.10,0),(1.10,0),(1.10,0.10),(1.06,0.10),(1.06,0.03),(0.10,0.03)] revolved 64 segs gives outer wall with lip and recessed floor; add hub CylinderGeometry(r 0.10, h 0.14) at center; keep 8 BoxGeometry spokes but translate them y=-0.05 UNDER the deck so 3/4 views still read wheel; merge. Keep revolute joint [0,1,0] and lockstep unchanged.
- **rhyme-wheel / misc-wheel (deck detail)** — Add bamboo-mat + numbered sector compartments so the face reads as the 1313 woodcut dartboard
  - Recipe: One merged geometry per wheel: (a) 2 concentric divider rails as TorusGeometry(r 0.45 and 0.78, tube 0.012, 6x48) rotated flat; (b) 16 radial slats BoxGeometry(0.92, 0.035, 0.014) translated x=+0.60 then rotateY(k*2pi/16); (c) bamboo mat = thin CylinderGeometry disc(r 1.05, h 0.008) plus 40 instanced lath strips BoxGeometry(2.05,0.004,0.018) laid as chords at alternating +/-0.06 rad to suggest weave; (d) 16 rim number tabs BoxGeometry(0.05,0.03,0.008) on the outer wall (各依號數 anchor points).
- **left-axle-stand / right-axle-stand** — Replace lone box post with axle pedestal: cross-foot base, splayed struts, visible vertical axle with pivot finial
  - Recipe: Merge: two crossed feet BoxGeometry(1.5,0.09,0.14) at 90deg; axle CylinderGeometry(r 0.05, h 0.95, 12) centered y=0.475; 4 strut boxes (0.06,0.55,0.06) rotated ~0.45rad from post mid to foot ends; iron pivot pin CylinderGeometry(r 0.018, h 0.10) at top penetrating the wheel hub; small cone finial above hub. Axle height 0.945 stays the wenxian number.
- **rhyme-index-board / misc-index-board** — Convert from hovering wire hoop to 8 wedge type-boards (活字板面) lying in the tray, still a lockstepped revolute part
  - Recipe: ExtrudeGeometry from an annular-sector Shape: for each of 8 sectors (40deg used, 5deg gap), outer arc r 1.02, inner arc r 0.16 via absarc both directions, depth 0.018, bevel off; merge 8 wedges; sits at y just above deck. This is the part the type parents to, so lockstep constraints and expectedRatios stay valid.
- **type-grid** — Re-layout instances polar and re-proportion as standing wooden type; duplicate for the misc wheel
  - Recipe: Keep instancedTypeGrid API but compute polar matrices: 3 ring bands r=0.35/0.62/0.90, per band count=floor(2*pi*r/0.026), matrix=rotationY(theta)*translation(r,0.013,0)*rotationY(jitter 0.03); block BoxGeometry(0.011,0.022,0.011) with a 0.002 darker cap via second thin box merged into the instance geometry (reads as inked face). ~700 instances, one draw call. Add a mirrored part misc-type-grid parented to misc-index-board.
- **iron-plate-a / iron-plate-b** — Ground the station on a workbench and bevel the plates
  - Recipe: New bench part: top BoxGeometry(1.7,0.06,0.7) at y 0.72 with 4 leg boxes (0.07,0.72,0.07); move plates+children onto it (all these positions are tuice display choices). Plates get a 0.003 chamfer illusion via slightly smaller top box merged on each slab.
- **iron-forme** — Fill it: dense instanced clay type inside the frame (the money shot of Bi Sheng printing)
  - Recipe: New part forme-fill: instanced BoxGeometry(0.0115,0.010,0.0115) on a 30x19 grid at 0.0135 pitch inside the 0.41x0.27 interior, parented to iron-forme; per-instance y jitter +/-0.0008 before flat-press event, zeroed after (press-flat event swaps matrices) — animates 字平如砥.
- **picked-type** — Shrink to true type size and give it a wheel-to-forme journey
  - Recipe: BoxGeometry(0.012,0.010,0.012); animate along a QuadraticBezierCurve3 from the highlighted wheel cell (world ~[-1.25+0.9,1.05,0]) arcing 0.5m high to its forme slot; implement as scripted position track on process:pick rather than the current 5cm prismatic hop.
- **heater** — Become a charcoal brazier with ember bed
  - Recipe: LatheGeometry basin profile [(0.04,0),(0.16,0.02),(0.18,0.10),(0.15,0.13),(0.16,0.14)] 24 segs; 3 stub legs BoxGeometry(0.03,0.05,0.03) at 120deg; ember bed = 12 instanced IcosahedronGeometry(0.018,0) inside with emissive-capable material slot; sits under plate A overhanging the bench edge or in a bench cutout.
- **flat-press** — Read as a hand tool, not a floating plank
  - Recipe: Merge plank BoxGeometry(0.48,0.02,0.34) + centered grip: CylinderGeometry(r 0.015, h 0.05) + flattened sphere knob SphereGeometry(0.03) scaled y 0.6 on top. Keep prismatic press travel.
- **print-sheet** — Curved paper with an inked face reveal, plus a brush prop
  - Recipe: PlaneGeometry(0.46,0.32,16,10), displace z edges with 0.5*sin curl (max 0.03) via vertex loop, DoubleSide; child thin dark plane 0.44x0.30 toggled visible on process:print to read as printed text block. New brush prop: cone bristle ConeGeometry(0.02,0.05) + handle CylinderGeometry(0.008,0.008,0.16) lying on plate B.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Retrieval spotlight (rewrite of existing spotlight trigger): 1) camera:focus on new compositor stool at x=0; 2) hover-highlight one wheel cell using a small emissive marker part (proxy over the instanced grid); 3) rotate rhyme-wheel so that sector arrives at the seat side (drive input = sector angle, ease 2s); 4) picked-type flies the bezier arc from cell to forme; 5) forme-fill highlights. Caption anchors per step quoting 以字就人 / 各依號數.
- Race demo (data.ingenuity demo, currently unimplemented): split comparison — a capsule 'walking compositor' proxy shuffles along the new type-rack prop (3s path) while the wheel version just rotates 40deg (0.8s); floating stopwatch captions show elapsed times; end caption 不勞力而坐致.
- Five-step process bar (trigger exists; make it legible): step 1 pick = bezier flight + wheel cell dim; step 2 set-forme = forme-fill instances fade in row by row (布字); step 3 heat = brazier embers glow + resin-bed emissive pulse + heat-shimmer sprite column (持就火煬之); step 4 press = flat-press descends, forme-fill y-jitter snaps to zero (字平如砥); step 5 print = brush sweeps over forme, print-sheet slides across, inked child plane reveals; then sheet lifts to a drying line.
- Two-plate pipeline loop: alternating highlight cycle between iron-plate-a (printing) and iron-plate-b (being set) with two curved arrow paths (TubeGeometry along arcs, toggled) and caption 常作二鐵板，一板印刷，一板已自布字 — this is Bi Sheng's core throughput idea and currently has zero visualization.
- Callout anchors: rhyme-wheel -> 徑七尺 2.205m wheel; left-axle-stand -> 軸高三尺 0.945m; rim number tabs -> 各依號數 numbered sectors; type-grid -> rhyme-ordered wooden type; iron-forme+forme-fill -> a full forme is one printing plate; resin-bed -> resin+wax+paper-ash, heat to set, reheat to release; heater -> 火煬藥鎔; flat-press -> 字平如砥; print-sheet -> 六萬字，一月百部 (nongshu-shiyin).
- Ghost toggle: when focusing one wheel, fade the other wheel + Bi Sheng bench to 15% opacity so the 2.2m dartboard face reads clean; a top-down camera bookmark shows the sector layout exactly matching the 1313 woodcut displayed alongside (images[0]).

**Usage-scene spec (scene.ts)**:
- Setting: Yuan-dynasty county print workshop (Wang Zhen's Jingde gazetteer job, 1298): interior corner with a lattice window wall, both wheels flanking the compositor seat, Bi Sheng bench along the side
- Ground: Round plank floor platform: 14 long thin boxes (plank strips with 4mm gaps) over a base disc; slight tone alternation per plank; no texture files needed
- Props: Type rack shelf (the pain point the wheel solves, mirrors museum photo 5): 2 uprights + 5 shelf boards + ~400 instanced mini type blocks, ~900 tris — also serves as the race-demo track; Compositor stool (杌凳): 4 splayed legs + round seat lathe, ~150 tris, at x=0 between the wheels; Composing table with half-filled column forme: small box table + open wooden tray + 60 instanced type in partial columns, ~500 tris; Drying line with 3 hung printed sheets: 2 posts + rope TubeGeometry + 3 curled planes, ~400 tris; Stack of finished gazetteer volumes: 8 slightly rotated flat boxes with wrap band, ~100 tris; Lattice window panel: grid of thin boxes (6x8 muntins) admitting the key light, ~300 tris
- Lighting: Warm late-afternoon interior: key directional through the lattice window (soft amber), cool low fill, ember point light in the brazier; wheels get a gentle top rim light so the sector geometry reads
- Ambient motion: Brazier ember flicker (point-light intensity + emissive noise), hung sheets swaying on slow sine, faint heat-shimmer sprite above the brazier during the heat step

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| wheel-deck-rhyme / wheel-deck-misc | 圆竹笆盘面 Bamboo mat tray deck | The recorded load surface (以圓竹笆鋪之); makes the wheel a typecase instead of a wagon wheel | custom typecaseDeck: lathe tray + chord-lath weave + divider rails + radial slats + 16 rim number tabs (merged, per wheel) | deck r 1.05 m, rim wall h 0.10 m, divider rings r 0.45/0.78 m, 16 sectors | wenxian for mat and numbering existence (nongshu-zaolun); tuice for all sizes | **[VERIFY]** |
| axle-pedestal-left / axle-pedestal-right | 立轴十字底座 Axle pedestal with cross feet | Credible support replacing the floating box post; shows the 3-chi axle | crossed feet boxes + cylinder axle + 4 splayed struts + iron pivot pin + finial | axle h 0.945 m (existing wenxian), feet 1.5 m span, axle r 0.05 m | wenxian axle height; tuice base form (Wang Zhenduo-style reconstruction) | **[VERIFY]** |
| compositor-stool | 中坐杌凳 Compositor stool | Embodies 一人中坐 — the principle of the machine; sits between widened wheels (+/-1.45 m centers, display tuice) | lathe round seat + 4 angled leg boxes | seat h 0.35 m, seat r 0.16 m | wenxian for the seated person; tuice stool dims | **[VERIFY]** |
| misc-type-grid | 杂字轮活字阵列 Misc wheel type array | Restores the recorded two-loaded-wheel symmetry (凡置輪兩面) | same polar instanced builder as type-grid, parented to misc-index-board | ~700 instances, block 0.011 x 0.022 x 0.011 m standing wooden type | wenxian two wheels; tuice block dims (wooden-type practice, cf. Rui'an living craft) | **[VERIFY]** |
| wooden-type-dims (edit to type-grid params) | 木活字尺寸 Wooden type block size | Replace 2.5 mm clay-wafer proportions on the wheels with standing wooden type so type is visible and period-correct | instance box + darker inked cap | 0.011 x 0.022 x 0.011 m | tuice — not in data card (card's 2-3 mm covers only Bi Sheng clay type, which stays at the forme) | **[VERIFY]** |
| workbench | 印书作台 Printing workbench | Grounds the two iron plates, forme, press and sheet at working height | box top + 4 leg boxes | 1.7 x 0.06 x 0.7 m top at h 0.72 m | tuice — workshop context, no textual dims | **[VERIFY]** |
| forme-fill | 铁范内密布字印 Set type filling the forme | Shows 滿鐵範為一板 — an empty frame becomes a readable printing plate; jitter-to-flat animates 字平如砥 | instanced 30 x 19 clay blocks, y-jitter cleared on press event | block 0.0115 x 0.010 x 0.0115 m, pitch 0.0135 m, thickness within card's 2-3 mm clay range | wenxian dense setting; tuice grid counts | **[VERIFY]** |
| brazier (replaces heater geometry) | 炭火炉 Charcoal brazier | Recognizable heat source for 火煬藥鎔; ember glow anchor | lathe basin + 3 legs + 12 instanced ember icosahedra | basin r 0.16-0.18 m, h 0.14 m | tuice — heating is textual, hearth form reconstructed | **[VERIFY]** |
| ink-brush + ink-plate | 棕刷与墨盘 Ink brush and ink slab | Makes the final 刷印 step performable and legible | cylinder handle + cone tuft; shallow lathe dish | brush l 0.21 m; dish r 0.09 m | tuice — implied by printing practice | **[VERIFY]** |
| type-rack | 字架 Wall type rack | The pain point the wheel solves; race-demo track (matches museum image 5 caption) | frame boxes + 5 shelves + ~400 instanced mini blocks | 1.6 w x 1.8 h x 0.35 d m | tuice — period rack form from museum display | **[VERIFY]** |
| sector-tabs metadata | 号数牌 Sector number labels | Callout anchors for 各依號數 retrieval-by-index story; 16 tab ids mapping sector k -> rhyme group caption in data json | 16 thin boxes on rim wall (part of deck merge) + new data field sectorLabels[16] bilingual | tab 0.05 x 0.03 x 0.008 m | wenxian numbering exists; tuice count 16 and placement | **[VERIFY]** |

**File ownership**: `src/machines/typecase/**`, `src/data/machines/typecase.json`, `tests/machines/typecase.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-08 Chain Pump 龙骨水车 `chainpump`

**Estimated effort**: 4-5

**Current state**: Renders as a 6.3 m tilted open box-channel (3 merged boxes) with a thin board floating uselessly at mid-height, two thin modern-looking pin-disc sprockets (24 toothpick pins, module 0.015), pencil-thin axles (r=0.025), eight bare radial sticks at the head axle that read as a ship's helm rather than foot pedals, and 32 disconnected plain boxes orbiting a stadium path — with a static translucent blue slab for water. The sourced numbers are right (6.3x0.18x0.315 trough, 4 spurs/end, 32>=24 pallets, 1:1 lockstep, belt to foot sprocket) and the instanced-matrix path animation infra in build.ts is genuinely good. But there is a hard registration bug: the loop straights sit at +/-0.18 m from the trough centerline while the trough interior half-height is only ~0.157 m, so the working strand travels entirely UNDER the trough floor and the return strand floats above the walls (collisionWhitelist confirms the interpenetration was whitelisted, not fixed). Nothing on screen says "dragon-bone": no chain links between pallets, no pedal pegs, no leaning rail, no moving water — it reads as an abstract conveyor diagram, not the artifact in the museum photos.

**Structure gaps (reconcile line by line)**:
- Chain loop vertical registration is wrong: lower (working) strand at local y=-0.18 puts pallet tops below the trough floor top (-0.1325), so pallets slide beneath the trough instead of scraping inside the channel; the return strand floats above the rim. The entire principle (pallet+trough = piston+cylinder) is invisible until the working strand runs floor-adjacent INSIDE the channel. Recenter loop ~+0.09 local, move sprockets up the same perpendicular offset.
- No chain links between pallets — the 32 boxes float on an invisible path. The machine's headline claim (earliest chain drive; 'dragon-bone' = the spine-like chain of wooden links) is literally not modeled. Without link bars + pin knuckles the loop reads as magic, and the sprocket has nothing visible to engage.
- No treading frame / handrail (Nongshu: 置於岸上木架之間。人憑架上，踏動拐木 — wenxian!). Head posts stop at axle height. The overhead rail that 2-4 treaders lean on is THE recognition cue in every historical photo (Farmers of Forty Centuries, Henan folk artifacts); without it nothing says human-pedal-powered.
- Crank spurs are pure radial boxes. Real 拐木 are cranks: radial arm + AXIAL pedal peg parallel to the axle that feet press; near/far ends staggered so treaders alternate. Radial sticks read as a paddle wheel, not pedals.
- Sprockets read as modern bicycle pin-discs. The folk 车头 is a wooden lantern/hexagonal drum: two thick flanges joined by 6 stout axial slats/rungs that the link gaps seat onto. The thin extruded annulus + 4.8 mm pins vanish at viewing distance and suggest metal machining.
- Guide board (行道板) floats at mid-channel doing nothing. Its job is supporting the return strand; it should sit at/above the wall tops on small stanchions with the return strand riding on it.
- Water is a static slab pitched above where the pallets run: no compartments between pallets, no rise, no discharge at the head, no source pond at the tail. 'Continuous lifting with no seal' — the hook — cannot be read.
- Axles are r=0.025 pencils. The 上大軸 (upper great axle) must be a thick timber (~0.12-0.15 m dia) since four crank timbers mortise into each end; also too short to clear pedal circles plus rail posts.
- No bearing interface (axles float over post tops — add notched bearing blocks), no submerged tail frame at the foot end, no discharge lip at the head — so you cannot tell which end is pond and which is bank.
- Display incline 0.2 rad (11.5 deg) lifts only ~1.25 m; the card's own relay math (三丈 bank / 3 pumps = 一丈 per pump over a 二丈 trough) implies ~30 deg working incline. Worth a steeper 'working pose' (verify before hardcoding).

**Geometry upgrade recipes**:
- **pallet-chain** — Turn each instanced unit from a bare box into a linked dragon-bone unit (link bar + pin knuckles + thin upright scraper board), recenter the loop inside the trough, raise count 32->40
  - Recipe: Keep the existing matrices/updatePalletLoopGeometry system untouched — only replace the instanced base geometry with a merged unit: (1) link bar BoxGeometry (pitch*0.85 x 0.03 x 0.05) along local +X (path tangent) so consecutive units visually chain; (2) two vertical pin knuckles CylinderGeometry(r=0.012, h=0.07) at bar ends (the wooden pins 龙骨节 — polygonizing at the arcs is authentic chain-on-drum behavior); (3) pallet board as a THIN UPRIGHT PLATE BoxGeometry(0.02 x 0.115 x 0.13) standing perpendicular to the tangent at bar center (thin-ness is what makes it read as a scraper, not a lump). Set palletCount 40 (pitch ~0.31 m, still >=24 so the builder assertion holds). Shift the whole loop +0.09 in part-local Y so working-strand board bottoms skim ~5 mm above the trough floor top; move both sprockets by the same perpendicular offset (dx,dy) = 0.09*(-sin0.2, cos0.2).
- **head-sprocket / foot-sprocket** — Replace pin-disc gears with wooden lantern/hex 车头 drums (custom builder), preserving pitch radius 0.18 so path math and constraints are untouched
  - Recipe: New customBuilder chainpumpHeadDrum: two flange discs CylinderGeometry(r=0.20, h=0.035, radialSegments=6 for a hex read) at local y=+/-0.075; 6 axial slat rungs BoxGeometry(0.05 x 0.15 x 0.03) at radius 0.18 connecting the flanges (these are what the link gaps visibly catch); center hub CylinderGeometry(r=0.06, h=0.15). ~600 tris merged. Foot drum: same at 4-6 rungs, flange r=0.19. Keep joint/rotation identical; keep 'gear' fallback out — drive constraints only reference part ids, not tooth geometry.
- **crank-spurs** — Radial sticks become true 拐木 pedal cranks: arm + axial pedal peg, staggered between ends, with hub collars
  - Recipe: Per spur: arm BoxGeometry(0.26 x 0.05 x 0.05) translated radius/2 along local X; pedal peg CylinderGeometry(r=0.022, len=0.16, capped with a small sphere) oriented along local Y (parallel to axle) at the arm tip, pointing OUTWARD (away from the frame, +Y on far end, -Y on near end) so a foot can stand on it; add 45 deg phase offset between near-end and far-end sets (real treaders alternate feet); add a hub collar per end: CylinderGeometry(r=0.075, h=0.12) around the axle where the four arms mortise in. Still one merged geometry parented to head-sprocket — lockstep constraint unchanged.
- **head-axle / foot-axle** — Thicken to great-axle timber and lengthen to clear pedals and rail posts
  - Recipe: head-axle: radius 0.025->0.065, length 0.6->0.95; add a squared mortise section at each end (BoxGeometry 0.14x0.14x0.16 sleeve merged over the cylinder) where the crank collars sit — visibly explains how 拐木 lock to the axle. foot-axle: radius 0.03, length 0.5. Grow sprocket hub innerRadius to match. Mark new diameters verify:true (not in card).
- **trough** — Split walls for cutaway, add battens, discharge lip and inlet flare so the two ends are readable
  - Recipe: Rebuild chainpumpTrough emitting three geometry groups (floor / near wall / far wall) or split into three parts so the near wall can fade for the X-ray demo. Add 3 external batten straps (U-shaped strips of 3 thin boxes, 0.03 x 0.02 section) at x = -2, 0, +2 showing plank construction; head end: discharge apron BoxGeometry(0.4 x 0.02 x 0.24) rotated -0.5 rad spilling toward the bank; tail end: bevel the floor tip (small wedge via ExtrudeGeometry right-triangle) and leave both ends open.
- **guide-board** — Move to its real job: return-strand support bridging the wall tops on stanchions
  - Recipe: Reposition to local y ~ +0.17 (just above wall top), widen section to 0.14 x 0.03 so it spans the walls; add 4 stanchion blocks BoxGeometry(0.03 x 0.05 x 0.03) between wall rim and board. The relocated return strand (after the +0.09 loop recenter) rides ~5 mm above it.
- **head-post-near/far + frame rails** — Extend into the full bank frame: taller posts, handrail, braces, bearing blocks
  - Recipe: Extend head posts to 2.5 m; add handrail beam BoxGeometry(1.3 x 0.08 x 0.08) spanning them at y~2.35 (chest height for a standing treader above the pedal circle); add two diagonal brace beams (0.06 section, rotated ~0.6 rad) from posts to rails; add 4 bearing blocks: ExtrudeGeometry of a 0.16x0.12 rectangle Shape with a half-circle hole (absarc r=0.03) at the top edge, seated on each post top under the axle — explains support and rotation in one glance.
- **water-sheet** — Replace static slab with per-compartment instanced water slugs plus discharge stream; keep the slab only as a dimmed fallback
  - Recipe: Extend chainpumpPalletLoop metadata to emit a SECOND matrices array for water: for each pallet whose pose.segment === 'lower-straight', place a translucent right-trapezoid prism (ExtrudeGeometry: cross-section 0.28 long, 0.06 high at the down-slope pallet face tapering to 0.015, width 0.11) resting against the up-slope face of the pallet; instances on other segments get scale-0 matrices. Reuse mechanicaUpdate to move both arrays in lockstep — water visibly rides between pallets up the channel. At the head arc, add a small emitter anchor point for discharge splash particles (renderer-side).
- **whole machine (display pose)** — Offer the historically consistent working incline
  - Recipe: Add a scheme patch schemes/working-incline.json setting rotationEuler z from 0.2 to ~0.52 rad (30 deg, from the card's 三丈/3-pump relay: asin(3.15/6.3)) for the scene view, keeping 0.2 rad for the exploded/reading view. Mark 0.52 verify:true (derived, not directly attested).

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Power-path pulse (order matters): crank-spurs -> head-axle -> head-sprocket (drum rungs flash) -> pallet-chain lower-strand instances only -> water slugs -> discharge splash. ~0.6 s emissive pulse per hop; reuse the existing 'spotlight' trigger which already emits highlights in nearly this order — just add the axle hop and restrict pallet highlight to segment==='lower-straight' instances.
- X-ray trough toggle (the card's promised demo: 槽体一键透明化侧视): with the trough split into floor/near-wall/far-wall, fade near wall to opacity 0.12 and swing camera to a true side elevation (-Z), so the compartment-by-compartment water carry is visible end to end.
- Follow-one-pallet sub-demo ('一块板叶的旅程'): dim all instances, tint instance k, and drive crank-spurs slowly (graph.drive small deltas) while the camera tracks palletPathPose(k/40+phase) — the exported palletPathPose makes this trivial. Four caption waypoints: foot-arc 'dips under water', lower-straight entry 'seals against floor and walls — piston with no seal', mid-straight 'pushes its compartment of water uphill', head-arc 'dumps ashore and returns empty'.
- Flow particles: 10-12 small blue arrow sprites advected along the lower strand at chain speed; splash burst (6-10 quads) at the head discharge apron; expanding ripple rings where the trough tail meets the pond plane.
- Callout anchors (part id -> caption): crank-spurs '四拐木 — pedal cranks, four per axle end (Nongshu)'; head-sprocket '车头链轮 — the earliest chain drive'; pallet-chain '龙骨板叶 — each link is also the piston'; guide-board '行道板 — carries the empty return strand'; trough '木槽 — an open-topped cylinder'; water slugs '更入更出 — water enters and exits continuously (Ma Jun)'; handrail-frame '人憑架上 — treaders lean here and walk in place'.
- Relay overlay: ghost-duplicate the whole machine twice up a stepped bank to visualize 三丈接力 (9.45 m in three lifts, wenxian) — cheap: two transformed clones at 25% opacity plus a height dimension line.
- Honest numbers HUD: '1 crank turn = 1 drum turn = chain advance 2*pi*0.18 = 1.13 m = ~3.6 pallets of water' — all derivable from existing params; reinforces the 1:1 expectedRatio.

**Usage-scene spec (scene.ts)**:
- Setting: Jiangnan paddy embankment at golden hour: the pump climbs from a pond/creek up an earthen bank, discharging into a feeder channel that runs off toward flooded rice paddies; the treading station with handrail and shade sits at the top of the bank (composition of the 1900s Farmers-of-Forty-Centuries photo).
- Ground: Two-level terrain: lower water plane (2-4 quads with scrolling normal/opacity shimmer) and a bank wedge (extruded trapezoid, ~1.5-3 k tris) with mud-brown face and green top; a shallow inset channel groove on top receives the discharge; low field-divider ridges (thin elongated boxes) sketch paddy squares beyond.
- Props: Thatched sun-shade over the treading station: 4 bamboo poles + slightly sagging woven mat roof (plane with 2-3 vertex sags), ~350 tris — the signature silhouette of every field photo; Wooden carrying-pole with two buckets resting on the bank (lathe-profile buckets 12 segments, ~300 tris); Straw hat (斗笠) hung on the handrail: LatheGeometry shallow cone, ~120 tris; Rice-seedling tufts: one crossed-quad tuft geometry instanced 60-100x along the paddy edge, ~2 k tris total; Mooring stake pair + short rope curve (TubeGeometry, 8 segments) at the pond edge near the submerged pump tail, ~150 tris; Optional pair of low-poly treader silhouettes (capsule bodies, no faces, matte dark) leaning on the rail to give scale — flag as optional/tasteful, ~600 tris
- Lighting: Warm low directional sun (~35 deg elevation, 3200-4000 K) raking across the water for glitter, plus cool sky hemisphere fill; humid late-afternoon mood, gentle warm bounce off the bank.
- Ambient motion: Pond shimmer (UV-scrolled noise on the water plane), continuous discharge trickle particles at the apron, occasional expanding ripple rings at the trough tail, very slow sway (vertex sin, amplitude ~1 deg) on rice tufts; everything else static. Total scene budget ~10-15 k tris, well under 30 k.

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| handrail-frame | 凭架（岸上木架） Treading handrail frame | The frame treaders lean on while pedaling — existence is wenxian (Nongshu: 置於岸上木架之間。人憑架上，踏動拐木); makes human power legible | 2 posts (extend head posts) + rail beam 1.3x0.08x0.08 + 2 diagonal braces 0.06 section | rail height ~2.35 m above ground plane, post section 0.09 m | wenxian (existence, nongshu-fanche) / tuice (all dims) | **[VERIFY]** |
| bearing-block | 轴承垫木 Axle bearing blocks (x4) | Explains how both axles are carried on the posts; currently axles float | ExtrudeGeometry rectangle with half-round notch (absarc hole) on top edge | 0.16 x 0.12 x 0.12 m, notch r=0.03 | tuice | **[VERIFY]** |
| chain-link-unit | 龙骨节链板参数 Dragon-bone link parameters (folded into pallet-chain builder params) | Adds the visible chain: link bar + pin knuckles per pallet; the 'dragon-bone' name and chain-drive claim depend on it | per-instance merged: bar (pitch*0.85 x 0.03 x 0.05) + 2 pins r=0.012 + upright board 0.02 x 0.115 x 0.13 | link pitch ~0.31 m (palletCount 40 over 12.53 m perimeter) | tuice (check against China Agricultural Museum 3 m artifact and Southern Henan photos) | **[VERIFY]** |
| head-drum-params | 车头六齿轮鼓参数 Head/foot lantern-drum sprocket parameters | Replaces modern pin-disc read with folk wooden drum; rung count and flange size need artifact check | 2 hex flanges r=0.20 + 6 axial rungs at pitch radius 0.18 + hub r=0.06 | flange r 0.20 m, rung section 0.05x0.03 m, drum width 0.15 m | tuice (six-slat folk 车头 claim — verify vs museum artifact photos) | **[VERIFY]** |
| great-axle-dims | 上大轴直径 Upper great-axle timber diameter | 上大軸 is wenxian but undimensioned; r=0.025 reads as a pencil — thicken so four mortised cranks per end are plausible | shaft r 0.065, length 0.95 + squared mortise sleeves 0.14x0.14x0.16 at ends | dia ~0.13 m | tuice | **[VERIFY]** |
| discharge-apron | 出水淌水板 Discharge apron board | Marks the bank end and gives water somewhere to go; anchor for splash particles | box 0.4 x 0.02 x 0.24 angled ~-0.5 rad at trough head | 0.4 m long | tuice | **[VERIFY]** |
| tail-stake-frame | 水底桩架（杌掇） Submerged tail stake frame | Shows the foot axle is staked in the pond, marking the water end | 2 stakes r=0.03 x 0.9 + crossbar 0.5x0.05x0.05 under the foot axle | stakes 0.9 m | tuice (folk practice; term appears in later agricultural texts — verify attribution) | **[VERIFY]** |
| water-compartment-params | 槽内分格水体参数 Per-compartment water slug parameters | Display-only water carried between pallets on the working strand; makes continuous lifting visible | instanced trapezoid prism (ExtrudeGeometry), second matrices array in pallet-loop metadata | 0.28 long x 0.06->0.015 tapered height x 0.11 wide | tuice (display) | **[VERIFY]** |
| working-incline | 工作倾角（丈高一车） Working incline scheme value | Scene pose consistent with the card's relay math: 三丈 bank / 3 pumps = 一丈 lift per 二丈 trough -> asin(0.5) = 30 deg | scheme patch: rotationEuler z 0.2 -> 0.52 rad on trough/loop/water parts + repositioned sprockets | 0.52 rad | tuice (derived from wenxian 三丈 relay figure already in card) | **[VERIFY]** |
| callout-copy | 标注文案与随板演示文案 Callout captions and follow-pallet demo copy (en+zh) | Seven part-anchored one-liners plus four waypoint captions for the follow-one-pallet demo; quotes Ma Jun 更入更出 and Nongshu 人憑架上 already sourced in data json — no new numbers | — | — | wenxian (existing sources) | — |

**File ownership**: `src/machines/chainpump/**`, `src/data/machines/chainpump.json`, `tests/machines/chainpump.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-09 Water-Powered Bellows 水排 `bellows`

**Estimated effort**: 5-6 days: 2.5 geometry rebuild (paddle rotor, grooved cord wheel, wrapped rope, drum+crank, ears, hollow chest, furnace), 1 horizontal re-rig of the crank/slider/rocker constraints + re-run stroke assertions (all card scalars unchanged), 1 principle aids (highlight order, crank ghost paths, air particles, cutaway), 1 scene/props/lighting.

**Current state**: Renders as a schematic linkage toy, not an artifact: a 6 m wire-hoop "waterwheel" (thin torus rim + 16 skinny box spokes, no paddle blades, no hub) hovers at y=1.2 atop a 2 m cylinder whose top barely grazes it, two 2 cm floating tubes (no wrap arc on either pulley) reach a small vertical donut "drum", then a mini-donut crank, a vertical box rod, a sliding block, a vertex-warped seesaw stick, and a plank that slides UP-AND-DOWN in open air beside a solid featureless 2.4x1.6 crate. The working chain is built as a vertical mirrored-Watt beam engine, contradicting the Nong Shu / Wang Zhenduo layout in which the crank pushes-pulls a HORIZONTAL connecting rod (xingguang) that rocks upright ears (pan'er) on a low horizontal shaft to stroke the bellows horizontally. Only one horizontal wheel exists though the source explicitly says two (er wolun: water strikes the lower, the cord rides the upper), and there is no furnace, tuyere, wind duct, timber frame, or water — so the machine's entire purpose (blast air for iron smelting) is invisible. No museum visitor would recognize the shuipai.

**Structure gaps (reconcile line by line)**:
- Lower water-struck wheel missing entirely — the source says 作二臥輪...用水激轉下輪 (two horizontal wheels; water strikes the LOWER one, the cord rides the upper). One wheel currently does both jobs, so the power source is unreadable. Needs a second horizontal rotor below the cord wheel on the same vertical shaft.
- No paddle blades anywhere — a water wheel with zero vanes cannot read as water-powered; the lower rotor needs 12-16 inclined paddles at the rim where the stream hits.
- No timber frame (架木立軸) — the vertical shaft has no top bearing or trestle, the drum/crank axle floats with no bearing posts, the rocker has no pivot mounts. The source opens with 'erect a wooden frame'; without it every part levitates and load paths are illegible.
- Working chain oriented vertically (beam-engine style) instead of horizontally — the historical crank (掉枝) drives a horizontal rod (行桄) that pushes/pulls upright rocker ears (攀耳) on a low horizontal shaft (臥軸), which stroke the bellows horizontally via the projecting timber (排前直木). The vertical slider+seesaw+dropping-plank misteaches the mechanism. Re-rig horizontal; all card numbers (0.24 crank, 1.2 rod, 0.48 stroke, [0,0.5] limits, s(0)=0/s(pi)=0.48 asserts) are scalar and survive re-orientation unchanged.
- Bellows chest is a solid closed box with the board sliding OUTSIDE it — there is no cavity, no mouth, no piston relationship. Needs a hollow wind chest with the board working inside, visible through an open side or cutaway.
- No furnace, tuyere, or wind duct — 水排 exists to blast a smelting furnace (鑄為農器). Without the glowing furnace receiving the air, the machine has no legible purpose; this is the single biggest recognition gap.
- Cord does not wrap either pulley — two short floating spans with no contact arc read as a broken belt; the quarter-turn twist (the clever bit converting vertical-axis to horizontal-axis rotation) is invisible.
- No stream/water under the lower wheel (scene-level but load-bearing for recognition of the power source).
- Crank throw is hidden — the 0.24 m crank is drawn as a 0.28 m donut disc, so the rotation-to-reciprocation conversion (the machine's whole fame, per Needham) cannot be seen.

**Geometry upgrade recipes**:
- **waterwheel** — Recast as the UPPER cord wheel (上輪/绳轮): heavy timber pulley with grooved rim, real spokes, and hub — keep r=3.0 (it carries the researched 5:1 belt ratio).
  - Recipe: LatheGeometry (48 segments) on a rectangular rim profile with a shallow cord groove: points [(2.90,-0.10),(3.06,-0.10),(3.06,-0.03),(3.00,0),(3.06,0.03),(3.06,0.10),(2.90,0.10)] lathed about Y -> flat-band rim with V-groove. 8 spokes: BoxGeometry 2.7x0.16x0.09 translated r/2, rotated Y by i*PI/4, merged. Hub: CylinderGeometry r=0.28 h=0.42. Merge all; ~2k tris.
- **waterwheel-pier** — Becomes a full vertical shaft spanning stream bed to above the upper wheel, with iron collar bands; add the missing lower paddle rotor and frame as new parts (see data_supplements).
  - Recipe: CylinderGeometry r=0.14, length 3.2 (y -0.9 to 2.3), 16 sides; two collar bands TorusGeometry r=0.16 tube=0.02 at bearing heights y=0.9 and y=2.1; merge. Frame is a separate new part so the shaft still spins alone.
- **drive-cord** — Rebuild with real wrap arcs on both pulleys plus the quarter-turn crossed span — currently two floating tubes touch nothing.
  - Recipe: Per span: CurvePath = (a) ArcCurve ~200deg in the big wheel's XZ plane at groove radius 3.0 (EllipseCurve sampled, lifted to 3D at wheel height), (b) CatmullRomCurve3 twisted cross-span reusing current control-point logic, (c) ArcCurve ~200deg in the drum's XY plane at radius 0.6. TubeGeometry(path, 96, 0.03, 8). Rope look: merge two 0.014-radius tubes helically offset +/-0.016 around the same path (twist phase = 8*t*2PI). Two spans (go/return) as now.
- **small-drum** — 旋鼓 becomes a solid flanged barrel on a visible horizontal axle instead of a donut wheel.
  - Recipe: LatheGeometry profile about the drum axis (local z after existing rotation): [(0,-0.19),(0.60,-0.19),(0.64,-0.16),(0.60,-0.12),(0.60,0.12),(0.64,0.16),(0.60,0.19),(0,0.19)] -> barrel with raised flanges that visibly retain the cord. Add axle stub CylinderGeometry r=0.06 len=0.9 along z, merged. Bearing posts are a new frame part.
- **crank-wheel** — Replace the mini-donut with a legible crank arm (掉枝): web + offset pin so the 0.24 m throw is visible.
  - Recipe: Custom builder bellowsCrank: axle boss CylinderGeometry r=0.07 h=0.10 (axis z) + crank web BoxGeometry 0.30x0.10x0.05 translated x=0.12 + pin CylinderGeometry r=0.035 h=0.14 (axis z) at x=0.24, z=+0.07. Round the web ends with two r=0.05 cylinders. Merge; keep lockstep with drum.
- **connecting-rod** — 行桄 goes HORIZONTAL: rod runs along x from crank pin to rocker-ear top pin at drum-axle height (~1.3 m), with eye rings at both ends.
  - Recipe: BoxGeometry 1.2x0.09x0.07 with slight taper (scale end vertices 0.8) + two eye rings TorusGeometry r=0.055 tube=0.022 rotated flat at each end, merged. Re-aim the crank constraint axis so the slider solves along [1,0,0].
- **front-upright** — Repurpose as 排前直木, the horizontal projecting push-timber between rocker and bellows board — and give it the wenxian 0.94 m (three chi) length that the data card assigns to exactly this part (排前直出木簨), currently misapplied to the board's height. (pending the §0.2 rule-7 adjudication recorded in OPEN_QUESTIONS.md — see the data-fix-094-reassignment row)
  - Recipe: BoxGeometry 0.94x0.12x0.12 along x, chamfered ends (scale end rows), tenon stub 0.06 cube at the board end. Prismatic axis becomes [1,0,0], limits [0,0.5] unchanged, stroke 0.48 unchanged.
- **rocker** — Replace the vertex-warped seesaw stick with the documented assembly: low horizontal rocking shaft (臥軸) + paired upright ears (左右攀耳) that swing fore-aft.
  - Recipe: Custom builder bellowsRockerPair: shaft CylinderGeometry r=0.07 len=0.8 along z at y=0.3 + two ear arms BoxGeometry 0.07x1.0x0.11 standing up from the shaft at z=+/-0.25 (arm length 1.0 = existing ROCKER_HALF_LENGTH so angle=asin(disp/1.0) code is reused verbatim) + top pin cylinder r=0.03 bridging the two ear tops. Keep the vertex-rotation animation trick but pivot about the shaft line (y=0.3) instead of the beam center.
- **bellows-board** — 排扇 becomes a tall vertical piston board stroking HORIZONTALLY inside the chest, sized to the card's 1.5 m Wang Zhenduo value (its current 0.94 height borrows the wrong card number).
  - Recipe: BoxGeometry 0.08x1.5x0.66 (thin in stroke direction x) + stiffening battens: two BoxGeometry 0.04x1.5x0.06 face strips + leather edge seal: 0.02-thick frame strips in a darker material, merged. Prismatic axis [1,0,0], limits [0,0.5]; lockstep with rocker unchanged so s(0)=0, s(pi)=0.48 assertions still pass.
- **bellows-chest** — Solid crate becomes a hollow wind chest the board actually works inside, with a round wind outlet feeding a duct toward the furnace, front face cutaway-able.
  - Recipe: Merge 5 planks (BoxGeometry 0.06 thick): floor 1.2x0.06x0.8, roof, two side walls 1.7 tall; back wall via ExtrudeGeometry on a Shape 0.8x1.7 with a circular hole path r=0.14 (the wind outlet). Front face omitted or a separate 30%-opacity mesh for the cutaway toggle. Reposition chest so the board slides inside the cavity; interior visible through the open/ghost front.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Power-path highlight sequence (rework the existing spotlight trigger to this order, one caption each): stream water -> lower paddle wheel ('水激下輪 water strikes the lower wheel') -> vertical shaft -> upper cord wheel -> drive-cord with animated dash/pulse flowing along the tube ('絃索增速 5:1 cord steps speed up 5x') -> small-drum -> crank ('掉枝：回轉變往復 rotation becomes push-pull') -> connecting-rod -> rocker ears -> push timber -> bellows board -> air puff through duct -> furnace flare ('鑄為農器 casting farm tools').
- Crank slow-motion sub-demo: freeze the scene, drive the drum at 0.1x for two revolutions while drawing two ghost overlays — the crank-pin's circular path (LineLoop circle r=0.24) and the rod-end's straight track (line segment, length 0.48) — with a double-headed arrow on the straight track. This is THE Needham point (rotary-to-reciprocating a millennium early) and currently invisible.
- 5:1 ratio made countable: rim tick marks (one red felloe on each wheel) plus small HUD counters 'waterwheel 1 rev / drum 5 revs' that increment live while dragging the waterwheel.
- Air made visible: on each push stroke emit a ~40-particle puff from the chest outlet through the duct into the tuyere; furnace interior emissive intensity pulses in sync with the stroke (bright on blast, dim on return) — the visitor literally sees why faster water = hotter furnace.
- Chest cutaway toggle: front chest face fades to 30% opacity revealing the board stroking inside; pairs with a furnace half-section (lathe with thetaLength=PI) showing the tuyere entry.
- Mirrored-Watt comparison (keep the existing comparison:mirrored-watt emit): side-by-side mini-diagram of the same 4 glyphs (wheel-crank-rod-slider) with arrow directions reversed, captioned 'shuipai: rotation->reciprocation / steam engine: reciprocation->rotation'; anchor it at the connecting-rod.
- Motion-type tinting during the demo: continuously rotating parts (wheels, shaft, drum, crank) tinted warm amber; reciprocating parts (rod, ears, timber, board) tinted teal — the color boundary lands exactly at the crank pin, marking where the conversion happens.
- Callout anchors (part id -> one line): waterwheel-lower->'受水輪 water rotor'; waterwheel->'上輪絃索 cord wheel'; drive-cord->'quarter-turn cord: vertical axis to horizontal axis'; small-drum->'旋鼓 speed drum'; crank-wheel->'掉枝 crank'; connecting-rod->'行桄 rod'; rocker->'攀耳 rocking ears'; front-upright->'排前直木, three chi (0.94 m, from the text)'; bellows-board->'排扇 blast board'; furnace->'用力少，見功多 — Hou Han Shu'.

**Usage-scene spec (scene.ts)**:
- Setting: Eastern-Han Nanyang riverside iron-smelting yard: machinery on a rammed-earth terrace beside a fast mill-race, shaft furnace glowing a few meters downwind of the bellows chest.
- Ground: Two levels: packed-earth/plank terrace (flat plane, dirt tone with subtle vertex-color mottling) under the machine and furnace; a recessed stone-edged stream channel (long shallow trench) running under the lower paddle wheel, water = single scrolling plane with sine-displaced vertices and animated normal offset for shimmer, white foam streak quads where it meets the paddles.
- Props: Shaft furnace (豎爐): LatheGeometry clay stack, base r=0.9 tapering to mouth r=0.35, h=2.2, inner emissive ember cone visible from the tuyere side (~600 tris); Wind duct + tuyere: box channel 0.18 sq from chest outlet into the furnace base, clay collar at entry (~120 tris); Mold rack with farm-tool molds: low table + 3 ExtrudeGeometry plow-share (犁鏵) V-shapes in sand trays — echoes 鑄為農器 (~400 tris); Thatch lean-to over the drum/crank: 4 poles + 2 slanted roof planes with straw-tone stripes (~250 tris); Slag and charcoal baskets: two lathe bowls + ~30 InstancedMesh pebbles/lumps (~500 tris); Quench trough: hollowed box with a still dark-water plane (~100 tris)
- Lighting: Warm late-afternoon directional key from the stream side, cool sky hemisphere fill, and a flickering orange point light in the furnace mouth (intensity = base + stroke-synced pulse + small noise) that rims the bellows chest and rocker — the furnace glow is the scene's focal anchor.
- Ambient motion: Stream texture/vertex scroll with foam flicker at the paddle line; furnace ember pulse synced to the bellows stroke; <=50 spark particles rising from the furnace mouth on each blast; one slow smoke sprite drifting from the furnace top. Total scene budget ~6-8k tris, well under 30k.

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| waterwheel-lower | 下臥水輪（受水輪） Lower water rotor | The wheel the stream actually strikes (用水激轉下輪) — restores the source's explicit two-wheel layout and makes the power source readable. | custom paddleWheel: lathe rim ring r=3.0 + 8 box spokes + hub + 16 inclined paddle blades (BoxGeometry 0.55x0.42x0.06, tilted ~25deg, instanced/merged at rim), mounted low on the shared vertical shaft at stream level | radius 3.0 m, paddle 0.55x0.42 m, 16 paddles, hub r 0.28 m | wenxian for existence (nongshu-shuipai 二臥輪/水激轉下輪); all dims tuice | **[VERIFY]** |
| timber-frame | 架木（木架立軸支承） Timber trestle frame | The 架木立軸 frame: holds the vertical shaft's top bearing, the drum/crank axle bearing posts, and the rocker-shaft mounts — ends the floating-parts look and shows load paths. | merged boxes: 4 posts 0.15 sq x 2.4 h, 2 crossbeams, top bearing block with half-round notch (box minus visual notch via two stacked boxes), 2 drum-axle bearing posts 0.18x1.35 with cap blocks, 2 low rocker-shaft blocks | posts 0.15x0.15x2.4 m; drum axle height ~1.3 m; rocker shaft height ~0.3 m | wenxian for existence (架木立軸); all dims tuice | **[VERIFY]** |
| furnace | 冶鐵豎爐 Smelting shaft furnace | The target of the blast — without it 'blast bellows' is meaningless. Receives the wind duct and hosts the ember glow that makes the principle legible. | LatheGeometry clay profile (base r 0.9 -> waist 0.75 -> mouth 0.35, h 2.2), optional thetaLength=PI half-section toggle, emissive inner cone, tuyere hole at base facing the duct | base r 0.9 m, h 2.2 m, tuyere r 0.09 m | tuice (proportions loosely after Han shaft-furnace archaeology, e.g. Guxing ironworks) | **[VERIFY]** |
| wind-duct | 輸風管／風口 Wind duct and tuyere | Connects chest outlet to furnace so the air path is traceable end-to-end; carries the blast particles. | box channel (merged 4 planks 0.04 thick) 0.18x0.18 outer section, ~1.4 m run, clay collar (lathe ring) at the furnace end | 0.18x0.18 m section, ~1.4 m length | tuice | **[VERIFY]** |
| drum-axle | 旋鼓臥軸 Drum axle with bearings | The horizontal axle the drum and crank actually turn on — currently both float in air. | CylinderGeometry r=0.06 len=0.9 along z (can be merged into small-drum's builder), riding in the timber-frame bearing posts | r 0.06 m, length 0.9 m, axle height 1.3 m | tuice | **[VERIFY]** |
| stream-channel | 湍流水槽 Mill-race water | Scene element carrying the animated water that strikes the lower rotor (當選湍流之側). | stone-edge trench (2 long boxes) + scrolling water plane 8x1.6 m with sine vertex ripple + foam quads at paddle contact | channel ~8 x 1.6 m, water 0.3 m below terrace | wenxian for setting (湍流之側); dims tuice | **[VERIFY]** |
| data-fix-094-reassignment | 「排前直出木簨约長三尺」歸位 Reassign the three-chi (0.94 m) wenxian number | Correction, not new data: the card's only wenxian length (0.94 m, 排前直出木簨) is the PROJECTING PUSH TIMBER, but parts.json currently applies it to bellows-board size.1 (board height). Move 0.94 to the push timber (ex front-upright) and set the board to the card's separate 1.5 m Wang Zhenduo value. EXECUTION GATE (§0.2 rule 7): this is a sacred-number reassignment, allowed ONLY through adjudication — root first verifies against the v1 data card and the stored source snapshot that 0.94 m belongs to 排前直出木簨 and 1.5 m to the board, records the adjudication in docs/OPEN_QUESTIONS.md, and only then edits parts.json. If the card does not support the reassignment, keep 0.94 on the board and add the push timber as a NEW [VERIFY] part instead. | n/a (provenance/data patch) | push timber length 0.94 m (wenxian, existing card number); board height 1.5 m (tuice, existing card number) | wenxian (0.94) / tuice (1.5) — both already in the card; only the assignment changes | **[VERIFY]** |
| copy-how-it-works | 傳動逐級解說文案 Step-list copy for the highlight tour | One bilingual line per power-path stage (13 stages listed in principle_aids) added to the machine data json so callouts and the spotlight share one source of truth. | n/a (data json addition) | n/a | wenxian quotes already in sources; no new numbers | — |

**File ownership**: `src/machines/bellows/**`, `src/data/machines/bellows.json`, `tests/machines/bellows.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

### F1-10 Gimbal Censer 被中香炉 `gimbal`

**Estimated effort**: 3 (≈2.0 geometry+materials: openwork hemispheres with canvas alphaMap via the F0-T12 passthrough, hinge/clasp/rims/pins, ring bands kept orthogonal with pivot rivets, bowl+contents, instanced chain, stand; ≈0.5 bedchamber scene; ≈0.5 aids declarations + trigger scripts)

**Current state**: The censer renders as a bare translucent half-dome (plain SphereGeometry with phiLength=PI, greenish-silver #7f9f99 at 48% opacity) containing one thin wire torus lying flat (type "ring" rotates it into XZ) and a second wire torus that buildInnerRing never rotates, so it stands VERTICAL — the two rings read as a crossed armillary toy, not the nested coplanar gimbal bands of the real artifact, and nothing visually connects shell to ring to ring to bowl (no pivots/rivets). The bowl is a passable 8-point lathe cup with a static orange lathe-teardrop "flame"; the "suspension chain" is a single 75mm solid box (the `link` primitive is literally one BoxGeometry) hanging from three raw wooden box beams that read as part of the machine. There is zero openwork, no engraving, no hemisphere seam/hinge/clasp, no smoke — so the defining identity of the Hejiacun/Famen pierced silver ball is absent, and at the true 46mm scale in an unframed viewport the whole thing is a ~30px blob. Kinematics (gimbal constraint, low-hung bowl at y=-4mm, drive-attitude triggers, less-than-0.5-degree assertion) are correct; purely the geometry and dressing fail.

**Structure gaps (reconcile line by line)**:
- Pierced openwork (镂空缠枝葡萄花鸟纹) over the whole shell — THE identity feature of the Hejiacun/Famen censers and functionally the smoke outlet; without it the object is an anonymous glass dome, and the museum photos in gimbal.json (all showing pierced spheres) will visibly contradict the model.
- Two-hemisphere construction with equatorial rim bands, rear hinge (合页) and front clasp (勾扣) — the artifact opens to refill the bowl (image #1 in gimbal.json is literally captioned 'Opened, showing the gimbal', image #3 is a Famen hinge macro); the current single half-sphere can never support that story beat and misstates the object's construction.
- Visible pivot rivets/pins at shell↔outer-ring (axis A) and outer-ring↔inner-ring (axis B ⊥ A) — these ARE the mechanism; today both rings float unattached so a visitor cannot see where the free axes are, which kills the principle reading.
- Ring geometry wrong twice: real persevering rings (持平环) are flat silver BANDS ~3mm tall, both coplanar-horizontal at rest with ~1mm nesting gaps; current rings are hair-thin wire toruses AND the inner one renders vertical (unrotated TorusGeometry in buildInnerRing), actively teaching the wrong geometry.
- Low center of gravity not legible: the bowl needs a visibly deep cup whose mass and contents hang below the pivot plane, plus visible bowl-to-inner-ring mounting, to explain WHY gravity keeps it level; currently a shallow dish floats at ring center.
- No suspension hardware: shell has no top loop/button (提环钮), the chain is a solid stick with no links and no S-hook — yet the 7.5cm chain is one of only three wenwu-measured numbers on the data card and is how the censer was carried into sleeve/quilt.
- No incense, ash, ember, or smoke — the machine's entire purpose; smoke escaping through openwork while the sphere rolls and the bowl stays level is the money shot the demo copy (ingenuity.demo) already promises.
- The modern display stand (three raw box beams) visually reads as part of the artifact; it must be either demoted to an elegant obviously-modern mount or replaced by the practical-usage scene (quilt), otherwise visitors count it as the machine.

**Geometry upgrade recipes**:
- **outer-shell** — Replace the plain translucent half-dome with a full two-hemisphere pierced openwork silver ball (split into shell-upper + shell-lower so it can open); make cutaway a toggle instead of the default state.
  - Recipe: Each hemisphere: SphereGeometry(0.023, 64, 24, 0, 2*PI, thetaStart 0 or PI/2, PI/2). Openwork primary recipe: procedurally paint a 512x512 offscreen canvas with a tiling grape-vine scroll — grape clusters (groups of 7–9 filled circles r 6–10px), curling stems (quadratic bezier strokes, width ~8px), leaves and two simple bird silhouettes — white=metal, black=hole; wrap as THREE.CanvasTexture used as alphaMap (alphaTest 0.5, side DoubleSide) plus the same canvas as bumpMap (bumpScale ~0.0004) for the chased 葡萄花鸟 relief. NOTE: consume the F0-T12 material-channel passthrough (alphaMap/bumpMap/alphaTest/side on userData.mechanicaMaterial) — it is a hard prerequisite of this order; do NOT edit MachineViewer.tsx (outside F1 ownership). Pure-geometry fallback if the texture path is vetoed: lattice hemisphere from 5 latitude TorusGeometry bands (major r = 0.023*sin(phi), tube 0.0006) + 8 meridian half-torus ribs + ~16 spiral TubeGeometry tendrils along CatmullRomCurve3 paths lying on the sphere surface (~12k tris). Add per hemisphere an equatorial rim: shallow torus (major 0.023, tube 0.0008). Add rear hinge: two 2.0x1.5x1.5mm box knuckles + 0.5mm-radius pin cylinder spanning them at the equator back. Add front clasp: S-hook TubeGeometry (tube r 0.0004) along a small S CatmullRomCurve3 + 1.5mm catch plate box. Add top-pole medallion: 6-point LatheGeometry rosette + suspension loop torus (major 0.002, tube 0.0005) where the chain hooks.
- **outer-ring** — Turn the wire torus into a flat horizontal silver band with visible pivot rivets on its axis (axis A = Z).
  - Recipe: LatheGeometry revolving a closed rectangle profile [(0.0195,-0.0015),(0.0201,-0.0015),(0.0201,0.0015),(0.0195,0.0015)] with 64 segments → an annular band 3mm tall, 0.6mm thick, lying horizontal. Merge on two rivets at (0,0,±0.0198) oriented along Z: CylinderGeometry(0.0006,0.0006,0.002,12) + SphereGeometry(0.0008) dome cap each (use the existing mergeGeometries pattern).
- **inner-ring** — Same band treatment at r 0.0168. ADVERSARIAL-REVIEW CORRECTION: the rings are ALREADY orthogonal by construction — the outer 'ring' primitive is rotated into XZ by primitives.ts:200-205 while buildInnerRing stays vertical in XY, which is the correct nested-gimbal arrangement. Do NOT rotate the inner ring flat (that would degenerate the gimbal into coplanar rings). Keep the orthogonality; verify each band's rotation axis matches its constraint axis in spec.constraints (outer↔Z, inner↔X) and place the pivot rivets on those axes.
- **incense-bowl** — Deepen into a hanging half-round gold cup whose rim sits ~1.5mm below the inner-ring plane, with visible mounting lugs and burning contents, so the low-CG principle is readable.
  - Recipe: LatheGeometry profile: (0,-0.009) → (0.004,-0.0088) → (0.010,-0.006) → (0.0134,-0.001) → (0.014,0.0015) → rolled lip out to (0.0146,0.002) → inner wall back down to (0,-0.0082); 48 segments. Keep the part's mount at the ring plane so the cup visibly hangs low. Merge two mounting lugs (1mm box + pin) where it meets the inner ring. Fill: ash bed = SphereGeometry cap scaled (1,0.25,1), matte #b8b0a4; three incense-pellet spheres r 0.0012, one with emissive orange presentation to read as live coal. Material gold (#d4af37 tones) per 金香盂.
- **flame** — Replace the static lathe teardrop with ember glow + rising smoke that drifts out through the openwork.
  - Recipe: (a) Ember: tiny emissive lathe knob over the lit pellet, pulsing emissiveIntensity via the existing presentation channel. (b) Smoke: THREE.Points of ~60 vertices with a procedural canvas soft-disc sprite (radial gradient), opacity ~0.25, non-additive; per-frame ascent (0.004 m/s scaled) + sinusoidal sway; spawn at bowl mouth, recycle beyond r 0.035 — points visibly thread through the shell holes. Keep the part id so triggers/callouts still resolve.
- **suspension-chain** — Replace the solid 75mm box with a real loop-in-loop chain, S-hook, and top ring using the instancing path the codebase already supports.
  - Recipe: One oval link: TorusGeometry(0.0012, 0.00025, 8, 16) scaled (1,1.4,1); emit 24–26 instance matrices alternating 90° roll, pitched 0.003m apart along a gentle catenary/straight Y path totalling the carded 0.075m; store them in geometry.userData.mechanicaInstances (getMechanicaInstanceMatrices/applyMechanicaInstanceMatrices in primitives.ts already handle this). Terminal S-hook: TubeGeometry (tube r 0.0004) along an S-shaped CatmullRomCurve3 engaging the shell's suspension loop; small top ring torus at the hanger arm.
- **display-base + hanger-post + hanger-arm** — Rebuild the three raw boxes as an elegant dark-lacquer hanging stand that reads as museum furniture, not artifact.
  - Recipe: Base: LatheGeometry round plinth with ogee profile (r 0.035, h 0.008). Post: turned column LatheGeometry with entasis and two collar beads (r 0.004, h 0.11). Arm: TubeGeometry (tube r 0.003) along a quarter-arc CatmullRomCurve3 from post top ending in a downturned hook tip above the censer centerline. Keep ids, tuice provenance, and the collisionWhitelist pair.

**Principle legibility (declared via the F0-T11 `aids` contract; land ≥3)**:
- Extend the existing spotlight trigger into an explicit power-path order with per-stage callouts: suspension-chain → outer-shell (attitude wobble, already implemented via setAttitude) → flash outer-ring rivet pins ('轴A / axis A') → outer-ring counter-rotates → flash inner-ring rivet pins ('轴B ⊥ 轴A / axis B') → inner-ring → incense-bowl stays level with plumb line — the existing emit('deviation','<0.5-deg') becomes a visible live gauge.
- Axis ghosts: during demos draw two thin emissive cylinders through the rivet pairs (axis A cool blue through Z pins, axis B amber through X pins) parented to their rings so visitors watch the two free axes stay orthogonal while the shell rolls.
- Gravity plumb-bob: dashed vertical line + small bob hanging from the bowl center that never tilts; caption '重力是唯一的控制器 / gravity is the only controller' — the one-sentence version of the whole machine.
- Shell view toggles: default = full pierced sphere (openwork holes already reveal the interior, like the real artifact); '半剖 cutaway' hides the near hemisphere (reusing today's half-sphere look); '透视 x-ray' drops shell opacity to 0.15 — three legibility levels without breaking recognition.
- Slow-motion sub-demo script: drive outer-shell through a 6s figure-8 attitude path at 0.25x with faint trail arcs showing each ring's swing, then replay at 1x; end card shows max deviation reading and the phone-gimbal echo image (ingenuity.echo already written).
- Counterfactual toggle '锁死双环 / lock the rings': temporarily rigidify both revolute joints so the bowl tips with the shell and ember particles spill — 5 seconds that prove why the rings exist, then auto-restore.
- Callout anchors (part id → caption): outer-shell → '镂空银壳：香气由孔中逸出 / pierced shell lets fragrance out'; shell-hinge → '合页：打开添香 / hinge opens for refilling'; shell-clasp → '勾扣 / clasp'; outer-ring rivet → '外环轴销：连壳 / pivot to shell'; inner-ring rivet → '内环轴销：正交轴 / orthogonal pivot'; incense-bowl → '香盂低垂：重心在轴线之下 / bowl hangs below the axes'; suspension-chain → '提链7.5厘米：携入被中 / 7.5cm chain, carried into the quilt'.
- Smoke as principle particle: the smoke column always rises world-vertical from the level bowl no matter how the shell rolls — a free, always-on demonstration that the bowl is stable; keep it enabled during the drag interaction.

**Usage-scene spec (scene.ts)**:
- Setting: Tang bedchamber at night — the literal 被中 (in-the-quilt) scene: the censer nestled in a fold of silk quilt on a low couch (榻), with the hanging stand beside it and an oil lamp burning low; matches the Xijing Zaji quote '可置之被褥' already on the page.
- Ground: Dark polished wood-plank floor: single large plane with procedural plank-stripe roughness/color variation and a soft radial falloff to darkness at the edges so the tiny artifact sits in a lit pool.
- Props: Low couch/榻 platform with waisted horse-hoof legs (boxes + lathe feet, ~400 tris); Folded silk quilt: 3 stacked ExtrudeGeometry wavy Shape layers in vermillion/gold with a fold cradling a second censer instance (~900 tris); Low table with oil lamp: lathe stem + dish + billboard flame (~250 tris); Three-panel folding screen backdrop with a procedural canvas silk-painting wash texture (~90 tris); Lacquer incense box + tiny spoon beside the stand (lathe + box, ~120 tris); Window lattice panel (instanced thin boxes in a grid) admitting moonlight (~600 tris)
- Lighting: Warm candle-orange point light at the lamp with ±10% flicker, dim cool directional moonlight raking through the lattice, very low ambient; the censer ember contributes a faint orange point light so the openwork casts patterned glints.
- Ambient motion: Censer smoke wisps rising world-vertical, lamp-flame flicker, slow dust motes in the moonbeam — all opacity/uniform tricks, no physics; whole scene stays well under the 30k-tri budget (~2.5k tris + one floor plane).

**Data supplements (new parts/fields, all provenance-tracked)**:

| id | Name | Purpose | Geometry | Dims (m) | Provenance | Check |
|---|---|---|---|---|---|---|
| shell-upper | 上半镂空球壳 Upper openwork hemisphere | Split the shell into two hinged hemispheres so the artifact can open as in museum photos; carries the pierced 葡萄花鸟 pattern. | custom lathe/sphere hemisphere r 0.023 with canvas alphaMap openwork (see recipe) | outer radius 0.023 m (from carded 4.6 cm OD); visual wall 0.0006 m | wenwu (radius carded); wall thickness tuice | **[VERIFY]** |
| shell-lower | 下半镂空球壳 Lower openwork hemisphere | Second half of the openable ball; hosts hinge and clasp hardware. | mirror of shell-upper | same as shell-upper | wenwu (radius carded); wall tuice | **[VERIFY]** |
| shell-hinge | 合页 Hinge | Documented construction detail (Famen macro photo, image #3) enabling the open-to-refill story beat; key recognition cue at close range. | two box knuckles + pin cylinder merged | knuckle 0.002x0.0015x0.0015 m, pin r 0.0005 m | wenwu (presence); dims tuice | **[VERIFY]** |
| shell-clasp | 勾扣 Clasp hook | Closes the two hemispheres; visible in artifact photos opposite the hinge. | S-curve TubeGeometry + catch plate box | hook length ~0.004 m, wire r 0.0004 m | wenwu (presence); dims tuice | **[VERIFY]** |
| suspension-loop | 提环钮 Suspension button and loop | Attachment point on the top pole for the chain; without it the chain floats. | lathe rosette medallion + small torus loop | loop major r 0.002 m, tube 0.0005 m | wenwu (presence — chain attaches on artifact); dims tuice | **[VERIFY]** |
| chain-hook | S形挂钩 S-hook | Terminal hook joining chain to loop, as on comparable Tang censers (Xi'an Museum example, image #2). | TubeGeometry along S CatmullRomCurve3 | length ~0.008 m, wire r 0.0004 m | wenwu (presence on comparable pieces); dims tuice | **[VERIFY]** |
| outer-axis-pins | 外环轴销（铆钉） Outer ring pivot rivets | Make axis A visible — the shell-to-outer-ring joint; riveted construction is how the artifact is actually assembled. | cylinder + dome cap x2 merged into outer-ring or separate fixed part | pin r 0.0006 m, length 0.002 m | wenwu (riveted construction documented for Hejiacun censer); dims tuice | **[VERIFY]** |
| inner-axis-pins | 内环轴销（铆钉） Inner ring pivot rivets | Make axis B visible and its orthogonality to axis A readable. | cylinder + dome cap x2 on X axis | pin r 0.0006 m, length 0.002 m | wenwu (presence); dims tuice | **[VERIFY]** |
| equatorial-rims | 扣合口沿 Equatorial rim bands | The visible seam where the hemispheres meet — strong recognition cue in every closed-state photo. | two shallow tori at the equator | major r 0.023 m, section r 0.0008 m | wenwu (presence); section tuice | **[VERIFY]** |
| ash-bed | 香灰与香丸 Ash bed and incense pellets | Shows the bowl in use and gives the ember a home; one pellet emissive as live coal. | flattened sphere cap + 3 small spheres | ash cap r 0.011 m scaled 0.25 in Y; pellet r 0.0012 m | tuice (illustrative demo content) | — |
| smoke-emitter | 香烟 Incense smoke | Always-on principle aid — smoke rises world-vertical from the level bowl and exits through the openwork. | THREE.Points (~60) with procedural soft-disc sprite | column height ~0.05 m above bowl | tuice (demo) | — |
| copy-openwork-note | 纹样说明文案 Part-panel copy: pattern name | Openwork/lid display copy for the shell halves. Lands ONLY in sanctioned structures: provenance.note on shell-upper / shell-lower (validated field) plus an aids callout label (F0-T11 shape) — no new schema field may be invented. | n/a (provenance.note + aids callout label) | n/a | wenwu (motif name from carded bttc source) | — |

**File ownership**: `src/machines/gimbal/**`, `src/data/machines/gimbal.json`, `tests/machines/gimbal.test.ts` (+ registers customSceneBuilders / aids in its own build.ts)

---

## §5 F2 UI/UX wave (single worker; execution order T1→T2→T4→T6→T7→T8→T9→T10, then T3→T5 once fidelity-w1 exists; viewer-chrome tasks wait for the F0 tag)

### §5.0 Findings register (evidence index)

| Severity | Finding | Evidence anchor |
|---|---|---|
| high | i18n catalog is half dead and the UI is bifurcated: entire docent.* (18 keys), compare.* (13 keys), most assembly.* (title/progress/pause/reset/step/complete), app.retry, home.open, home.thumbnail, viewer.assemblyPlay, inspector.provenance, and ~15 gallery.* keys are never referenced. Components ship their own parallel inline bilingual copy objects instead, and drift has already begun (en.json gallery.museumDescription = 'Downloaded museum photographs with source attribution.' vs GalleryPanel COPY 'Downloaded museum and reconstruction photographs.'; en.json docent.placeholder = 'Ask how this machine works or what the sources say…' vs DocentChat 'Ask about this machine…'). | Grep of key usage returned 0 hits outside catalogs for all listed keys. Inline copies: "src/ui/panels/DocentChat.tsx":68-92, "src/ui/panels/GalleryPanel.tsx":30-75, "src/ui/panels/… |
| high | Event captions and spotlight chips render raw engine slugs ('drive · left-road-wheel', 'stabilize · incense-bowl') in a serif quote-styled element. mechanismCaption only humanizes astroclock and seismoscope; every other machine falls through to `${type} · ${part}` with raw part ids, even though bilingual display names exist on every PartDef (part.name.zh/en). | "src/ui/viewer/MachineViewer.tsx":1451-1497 (fallback at 1496: return `${type} · ${part}`), rendered at 2501-2507 into .event-caption (serif styling at "src/ui/styles.css":559-566)… |
| high | The 'Ask the docent' pill is position:fixed at the viewport corner, so it floats on top of the scrollable right sidebar and covers sidebar buttons (spotlight play, gallery controls) at 1600x900 — the sidebar occupies the right 18-24rem of the viewport at exactly that corner. | "src/ui/docent/docent.css":1-13 (.docent-entry fixed right/bottom 1rem, z-index 40) vs sidebar layout "src/ui/styles.css":336-341 (grid minmax(18rem,24rem)) and 473-477.… |
| high | Floating bottom-left control cluster (Pause / Assembly slider / Play assembly / Reassemble / step buttons / current-part line / hint line / Exploded slider — up to 9 stacked controls, 34rem wide) covers a large slice of the 3D stage on laptop heights. No icons, no tooltips, no collapse/dock, no role=toolbar; slider labels at 0.73rem. | "src/ui/viewer/MachineViewer.tsx":2265-2399 (toolbar JSX incl. conditional step controls, target slot, hint), "src/ui/styles.css":382-419 (absolute bottom 1rem left 1rem, min(34rem… |
| high | Compare mode collides with the persistent stage chrome: .compare-view only reserves padding-top 5.5rem under the absolutely positioned .viewer-title (h1 up to 2.8rem + subtitle can exceed that), the 'Enter story' button stays mounted over the right viewport, and each viewport's scholar bar sits at top 0.55rem beneath the title — producing the observed clipped/overlapping 'Reconstruction comparison' header. The comparison table is display:block (destroys table semantics for AT), duplicates its caption as the first column th, uses 0.68rem text in min-width 8rem cells inside a minmax(8rem,28vh) row, and the −/+ drive buttons have no accessible names. | "src/ui/styles.css":679-696 (padding-top: 5.5rem), 361-368 (.viewer-title absolute), 717-729 (.compare-scholar-bar), 749-773 (.compare-table display:block, 0.68rem); "src/ui/viewer… |
| high | No skeleton or poster loading states anywhere, despite per-machine poster JPGs already existing at public/assets/renders/<slug>/overall.jpg. Route loading is one centered sentence; the machine Canvas, both compare viewports, and the story stage mount as pure black while geometry builds (story captions talk over a black stage); home cards look empty until the dark 0.58-opacity thumbnails load over #101111. The designed fallback string home.thumbnail ('Render forthcoming' / '复原图待生成') is a dead key. | "src/ui/routes.tsx":228-246, 307-321 (text-only loading fallbacks); "src/ui/viewer/MachineViewer.tsx":2230-2263 (Canvas, no fallback), 1402-1435 (MachineStoryStage, no fallback); "… |
| high | DocentChat drawer has no dialog semantics or focus management: plain aside with aria-label (no role=dialog/aria-modal), no focus trap, no Escape handler, focus is dropped when the entry button unmounts on open, and never restored on close. The entire message list is aria-live=polite, so token-by-token SSE streaming re-announces the growing container to screen readers continuously. | "src/ui/panels/DocentChat.tsx":425-434 (entry button unmounts on open), 435-447 (aside, no dialog role/trap/Escape), 448 (aria-live=polite on .docent-scroll containing streamed mes… |
| medium | Sidebar information architecture: the default-empty Part record panel leads the sidebar; the machine's actual hook (Ingenuity spotlight) is buried inside the third panel, which mixes three concerns (mechanism trigger buttons, odometer readout + live event caption, spotlight card). All sections are identical plain bordered boxes with uneven internal rhythm, a permanently reserved 2rem empty caption slot, and a nested box-in-box spotlight card — matching the observed 'plain bordered boxes, uneven vertical rhythm'. | "src/ui/viewer/MachineViewer.tsx":2402-2548 (order: PartInspector → SchemeSwitcher → mechanisms panel containing odometer+caption+spotlight → GalleryPanel); "src/ui/styles.css":479… |
| medium | Home hero→cards scroll passes through a long near-black band: stacked top padding clamp(3-7rem) + hero margin-bottom clamp(3-6rem) + demo-callout margins (2.5rem/3rem) while the only ambient light is a radial gradient confined to the top 36rem of the body — combined with finding on dark thumbnails, the observed 'pure black stretch'. | "src/ui/styles.css":24-35 (gradient transparent past 36rem), 126-135 (.home-page/.hero spacing), 163-175 (.demo-callout margins).… |
| medium | Raw-id and untranslated leaks in interactive copy: assembly hint prints raw part ids even in Chinese ('请先安装 left-road-wheel' / 'Seat left-road-wheel first'); DriveHandle aria-labels always interpolate part.name.en regardless of language; odometer unit rendered as ASCII 'li' in zh (should be 里); typecase process caption shows raw source slug 'mengxi-bisheng' instead of the source book title; EN docent answers show the Chinese-labeled raw citation marker '[来源:xyxfy-action]' as the chip text. | "src/ui/viewer/MachineViewer.tsx":2185-2193 (hint), 2493-2500 ('{odometerReadout} li'), 2481-2489 (raw step.source); "src/ui/viewer/DriveHandle.tsx":164, 187 (part.name.en in aria-… |
| medium | Micro-typography below the legibility floor across the scholarly content: 0.66rem record-list dt, 0.67rem provenance badge, 0.68rem compare table/scholar bar/gallery tabs, 0.7-0.73rem captions — i.e. 10.5-11.7px for the densest evidence text, with low-contrast pairs at those sizes (.machine-index #8b754a on #101111; .record-list dt #77746d on #0d0e0e). Meanwhile panel h2s are only 1rem, so the hierarchy inside the sidebar compresses to a ~1.5x range while the home display title spans 2.7-6.6rem — no intermediate scale. | "src/ui/styles.css":535-547 (dt 0.66rem / dd 0.78rem), 513-522 (badge 0.67rem), 749-758 (table 0.68rem), 783-804 (tabs/captions 0.68-0.7rem), 273-277 (#8b754a index), 484-490 (pane… |
| medium | The serif display identity is not actually shipped: 'Noto Serif CJK SC'/'Songti SC'/STSong are referenced throughout the CSS but no @font-face or webfont link exists, so the museum typography only materializes on macOS; Windows/Linux/Android users get Georgia for Latin and default CJK serif (e.g. SimSun) for Chinese display text. | "src/ui/styles.css":84-90 (font stack; repeated at 562-564, 575-580) and story.css:78, 120; "index.html" contains no font loading (grep for font-face/@import/googleapis returned no… |
| medium | Heading-order inversion inside PartInspector: panel h2 → part-name h3 → then subsections revert to h2 ('Source quotation', 'Reconstruction evidence', 'Controversies') while the nested MachineEvidenceRecord uses h3s — the outline zig-zags h2→h3→h2 within a single section, breaking screen-reader document structure. | "src/ui/panels/PartInspector.tsx":309 (h2 title), 310 (h3 part-name), 375/403/421 (h2 subsections), 123/181/216/241 (h3s inside the details register).… |
| low | Error pages expose the raw slug as the entire explanation and offer no retry (the app.retry key exists but is dead); gallery tab aria-controls dangle for the 3 inactive tabs because only the active tabpanel div is ever rendered; gallery lightbox layout is inline-styled in JSX while sibling lightbox styles live in styles.css. | "src/ui/routes.tsx":216-226 and 295-305 (<p>{slug}</p>, home link only); "src/ui/panels/GalleryPanel.tsx":314 (aria-controls per tab) vs 335-341 (single tabpanel), 449-471 (inline … |
| low | Dead/placeholder UI and unreachable states: data-ghost-duration-ms / data-new-part-tint / data-old-part-tint attributes on the SchemeSwitcher panel are referenced nowhere in src or e2e; the Pause button's disabled={compareActive} is unreachable because the whole toolbar is hidden={compareActive}; prefers-reduced-motion block zeroes transitions but not animation-duration, so the 700ms assembly-complete glow still plays; language choice is not persisted (store has no persist middleware) and the document title/description stay English-only in zh mode. | "src/ui/panels/SchemeSwitcher.tsx":72-75 (grep across src/ and e2e/ found no readers); "src/ui/viewer/MachineViewer.tsx":2268 (hidden) vs 2272 (disabled); "src/ui/styles.css":651-6… |

### F2-T1 Dock and segment the viewer control bar (icons + tooltips + modes)

- **Priority**: high · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: Replace the floating .viewer-toolbar with a slim docked bar along the bottom edge of .viewer-stage (full stage width, single row, translucent). Left: play/pause icon button. Center: a segmented mode control — View / Assemble / Explode — that swaps ONE contextual row in place: Assemble shows the scrubber + prev/next + current-part text; Explode shows only the explode slider; View shows nothing extra. Right: reset ('Show complete machine'). Use inline-SVG icon buttons with aria-label + title tooltips, text labels visible >=1280px. Hints/current-part become a one-line status strip above the bar, not extra grid rows. Keep all existing data-testid attributes so e2e (smoke.spec.ts) keeps passing, and give the bar role=toolbar with an aria-label. Wire the dead assembly.* i18n keys instead of inline ternaries.

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/viewer/ExplodedControl.tsx`
  - `src/ui/styles.css`
  - `src/ui/i18n/en.json`
  - `src/ui/i18n/zh.json`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; toolbar docks in a single row with View/Assemble/Explode segments; existing assembly e2e selectors migrated and green; at 1280×800 the model stays unobstructed (screenshot).

### F2-T2 Poster-image loading and skeleton states everywhere

- **Priority**: high · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: Exploit the existing per-machine posters (public/assets/renders/<slug>/overall.jpg). (1) Home cards: give .machine-thumbnail an aspect-ratio placeholder with a base #151512 fill, fade the img in on load, and onError show the (currently dead) home.thumbnail string — kills the empty-black-cards stretch. (2) Viewer stage: render the poster as a dimmed blurred background layer behind the Canvas; fade it out on the F0-T5 `machineReady` signal (store flag / window.__mech.machineReady) — Canvas onCreated fires when the renderer exists, BEFORE geometry, and must not be the trigger. (3) Compare: same poster layer per viewport so they are never black for seconds. (4) Story stage: same poster + a 'model loading' shimmer so captions never narrate over black. (5) Route-level loading pages become a lightweight skeleton (header bar + stage block + 3 sidebar blocks) instead of one sentence.

- **Files**:
  - `src/ui/routes.tsx`
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/compare/CompareView.tsx`
  - `src/ui/styles.css`
  - `src/ui/story/story.css`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; home-card black stretch gone (before/after screenshots); viewer/story/compare all show poster (<0.5 s) then fade on the F0-T5 machineReady signal (never on Canvas onCreated); the dead home.thumbnail key revives as the onError caption.

### F2-T3 Humanize event chips, hints, and readouts via i18n + part display names

- **Priority**: high · **Ownership**: ui (single worker, serial — see §7) — starts after the F1 tag

- **Approach**: Add an events.* namespace to both catalogs (drive, stabilize, releaseBall, locked, mallet:raise, odometer:update, spotlight:done, drive:attitude, …) and rewrite mechanismCaption's fallback to `t('events.'+type, {defaultValue:type})` + partsById.get(part)?.name[language] ?? part, so chips read '驱动 · 左路轮' / 'Drive · Left road wheel'. Apply the same lookup to the assembly hint (requiredPartId → display name), the typecase caption (source slug → module.data.sources book title), the odometer unit (里/li), and DriveHandle aria-labels (part.name[language]). Render EN citation chips as the book abbreviation or a superscript index instead of the raw '[来源:id]' marker (title attr already carries the book). Event-key hygiene: i18next treats ':' as its namespace separator, so map event types through `type.replace(/:/g,'_')` (or set nsSeparator:false) before lookup — otherwise mallet:raise / drive:attitude / spotlight:done silently miss. Payloads that are not part ids (source ids, numeric readouts, '<0.5-deg', program orders) go through a payload humanizer: partsById → localized name; known source id → source title from the machine data json; number → formatted with unit; anything else is OMITTED rather than printed as a slug. Aid labels from F0-T11 arrive pre-localized (inline bilingual) and bypass the catalogs entirely.

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/viewer/DriveHandle.tsx`
  - `src/ui/panels/DocentChat.tsx`
  - `src/ui/i18n/en.json`
  - `src/ui/i18n/zh.json`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; run all ten spotlights and assembly on the zh page: zero English slugs in captions/hints (new e2e sampling 3 machines); ':'-bearing event types resolve after the ':'→'_' mapping; non-part payloads humanized or omitted; the odometer readout shows 里 on zh.

### F2-T4 Fix compare layout: own header, no chrome collisions, real table

- **Priority**: high · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: When compareActive, hide .viewer-title and .story-launch-button (single conditional in MachineViewer) and give CompareView its own compact header row: machine name small + the two scholar labels as left/right column headers + an explicit close/back button — then delete the padding-top:5.5rem hack. Wrap ComparisonTable in a div.compare-table-wrap { overflow:auto } and restore display:table semantics; drop the duplicated title th (use an empty th scope=col or 'Aspect'); bump table text to 0.78rem with zebra rows and top-aligned padding. Give the −/+ drive buttons aria-labels ('Drive both models forward/backward', both languages) and larger hit areas (the astroclock half-resolution banner no longer exists — F0-T10 deletes the half-res mode outright).

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/compare/CompareView.tsx`
  - `src/ui/compare/ComparisonTable.tsx`
  - `src/ui/styles.css`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; no chrome overlap at 1600×900 and 1280×800 (screenshots); table restored to semantic <table>; −/+ buttons have aria-labels.

### F2-T5 Consolidate all copy into the i18n catalogs and add a dead/used-key guard

- **Priority**: high · **Ownership**: ui (single worker, serial — see §7) — starts after the F1 tag

- **Approach**: Migrate every inline bilingual object into en.json/zh.json under their existing (currently dead) namespaces: DocentChat copy() → docent.*, GalleryPanel COPY → gallery.*, PartInspector RECORD_COPY → inspector.*, ComparisonTable/CompareView labels → compare.*, SchemeSwitcher/MachineViewer/routes ternaries ('Reassemble', 'Tap target slot', 'Enter story', 'Back to model', compare pickers) → viewer.*/story.*. Delete keys that remain unused after migration (home.open, viewer.assemblyPlay, …) or wire them (app.retry on error pages, home.thumbnail as image fallback). Extend tests/ui/i18n.test.ts to extract t('…') keys from src via regex and fail on (a) used-but-missing and (b) defined-but-unused keys, making the existing zh/en structural parity test actually meaningful. Fixes the already-diverged museumDescription/placeholder strings as a side effect. The used/unused checker must understand declared dynamic-prefix allowlists: `events.*` keys are looked up via computed keys, so exempt the prefix from the unused-key rule AND verify coverage the other way — every literal event type emitted in src/machines/**/build.ts and src/ui (grep the emit( call sites) must resolve to a catalog key after the ':'→'_' mapping.

- **Files**:
  - `src/ui/i18n/en.json`
  - `src/ui/i18n/zh.json`
  - `src/ui/panels/DocentChat.tsx`
  - `src/ui/panels/GalleryPanel.tsx`
  - `src/ui/panels/PartInspector.tsx`
  - `src/ui/panels/SchemeSwitcher.tsx`
  - `src/ui/compare/ComparisonTable.tsx`
  - `src/ui/compare/CompareView.tsx`
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/routes.tsx`
  - `tests/ui/i18n.test.ts`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; `scripts/check-i18n.mts` extended: both catalogs equal key sets, zero unused keys outside declared dynamic prefixes, zero inline bilingual objects (grep assertion), and every emitted event literal resolves to a catalog key; `pnpm i18n:check` green. Starts after the F1 tag.

### F2-T6 Sidebar IA reorder + shared panel rhythm

- **Priority**: medium · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: Reorder the sidebar to lead with the hook: (1) Ingenuity spotlight as its own first panel (hook + play button + semantic readout), (2) Reconstruction (scheme switcher + compare toggle), (3) Mechanism demos with the live caption directly beneath the buttons (caption slot rendered only while a caption exists), (4) Part record — auto-scrolls into view and visually activates when a part is selected, empty state shortened to one inviting line, (5) Images & sources. Introduce a shared panel header pattern (uppercase 0.72rem eyebrow for the section type + 1.1rem serif title) and a consistent internal spacing scale (0.75/1.25rem); demote the spotlight card's box-in-box styling by making it the panel itself. Move the typecase process stepper under Mechanism demos with numbered pill styling.

- **Files**:
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/panels/PartInspector.tsx`
  - `src/ui/styles.css`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; sidebar order = Ingenuity spotlight → Reconstruction → Mechanism demos → Part record; empty caption slot no longer reserves space (screenshot).

### F2-T7 Docent drawer: stage-anchored pill + real dialog semantics

- **Priority**: medium · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: Anchor .docent-entry absolutely inside .viewer-stage (bottom-right of the 3D area, above the docked control bar) instead of fixed to the viewport so it can never cover sidebar controls; keep fixed positioning only on mobile single-column layout. On open: role=dialog + aria-modal, move focus to the close button, trap Tab (extract GalleryPanel's existing trap into a shared useFocusTrap hook), close on Escape, restore focus to the pill on close. Replace aria-live on the whole message list with a single visually-hidden status region that announces 'Docent is answering…' and 'Answer complete' — streamed tokens stay non-live.

- **Files**:
  - `src/ui/panels/DocentChat.tsx`
  - `src/ui/docent/docent.css`
  - `src/ui/panels/GalleryPanel.tsx`
  - `src/ui/viewer/MachineViewer.tsx (DocentChat moves inside the stage container — runs after the F0 tag)`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; docent pill anchored inside the 3D stage (DocentChat moved in MachineViewer — after the F0 tag); at 1600×900 and 1280×800 it overlaps no sidebar control (screenshots); role=dialog + focus trap + Esc close + focus restore; SSE streaming no longer re-announces the whole container.

### F2-T8 Typography system: tokens, shipped CJK serif, legibility floor

- **Priority**: medium · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: Define :root custom properties — --font-display (self-hosted subset woff2 of a CJK serif, e.g. Noto Serif SC subset to the glyphs actually used in machine names/quotes, @font-face with font-display:swap + preload in index.html), --text-xs(0.75rem)/sm(0.85rem)/base(0.95rem)/lg(1.1rem)/xl(1.4rem)… and ink/gold color tokens. Sweep styles.css to replace all sub-0.75rem sizes (dt 0.66→0.75, badge 0.67→0.75, table 0.68→0.78, captions 0.7→0.78) and lift low-contrast tokens (#77746d→#8b887f, #8b754a index → #a58c5b). Unify .panel h2 at 1.1rem serif with the eyebrow pattern from the sidebar upgrade so the serif display voice (already good on the home hero) carries through the viewer. Tooling: add `subset-font` as a devDependency; this task WRITES scripts/subset-font.mjs; root fetches Noto Serif SC once (build-time network only — runtime stays offline), commits the subset woff2 plus the OFL license notice in docs/FONT_CREDITS.md.

- **Files**:
  - `src/ui/styles.css`
  - `index.html`
  - `src/ui/story/story.css`
  - `src/ui/docent/docent.css`
  - `package.json (subset-font devDependency)`
  - `scripts/subset-font.mjs (new)`
  - `docs/FONT_CREDITS.md (new, OFL notice)`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; woff2 subset ≤300 KB committed and preloaded (scripts/subset-font.mjs written, OFL notice in docs/FONT_CREDITS.md); serif shows on Windows/Linux screenshots; token sweep leaves no font-size <0.75rem; axe reports no serious contrast issue.

### F2-T9 Home flow: close the black gap, light the grid

- **Priority**: medium · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: Halve the hero→grid dead space (hero margin-bottom clamp(2rem,4vw,3rem); demo-callout margins 1.5rem/2rem) and extend ambient light past the fold: either a second faint radial gradient behind the machine grid or a body-length vertical gradient (#0b0c0b→#090a0a) plus the card grid's 1px gold-tinted grout brightened slightly. Raise .machine-thumbnail opacity to ~0.72 with a stronger mask fade so cards read as content immediately (pairs with the poster fade-in from the loading-states upgrade). Optionally add a scroll-margin eyebrow ('The collection · 十械') above the grid so the scroll has a destination.

- **Files**:
  - `src/ui/styles.css`
  - `src/ui/routes.tsx`
  - `src/ui/i18n/en.json`
  - `src/ui/i18n/zh.json`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; hero→grid vertical gap halved; ambient light extends past the fold (before/after screenshots); thumbnails brighten on hover.

### F2-T10 A11y and dead-UI sweep

- **Priority**: low · **Ownership**: ui (single worker, serial — see §7)

- **Approach**: One pass: fix PartInspector heading order (subsections become h4 under the h3 part name, or flatten to styled divs with aria-level); render all four gallery tabpanels with hidden attributes so every aria-controls resolves; error pages get human copy + a wired app.retry reload button and demote the slug to a small code line; remove the dead data-ghost-duration-ms/tint attributes from SchemeSwitcher and the unreachable disabled={compareActive} on Pause; add animation-duration: 0.01ms !important to the reduced-motion block (kills the assembly-complete glow); persist language via zustand persist middleware and sync document.title per language; move gallery lightbox inline styles into styles.css next to the existing lightbox rules. Tooling: add @axe-core/playwright as a devDependency and a dedicated e2e/a11y.spec.ts that runs the axe pass.

- **Files**:
  - `src/ui/panels/PartInspector.tsx`
  - `src/ui/panels/GalleryPanel.tsx`
  - `src/ui/routes.tsx`
  - `src/ui/panels/SchemeSwitcher.tsx`
  - `src/ui/viewer/MachineViewer.tsx`
  - `src/ui/store.ts`
  - `src/ui/styles.css`
  - `src/ui/App.tsx`
  - `package.json (@axe-core/playwright devDependency)`
  - `e2e/a11y.spec.ts (new)`

- **Acceptance (root)**: `pnpm test && pnpm e2e && pnpm i18n:check` all green; axe (@axe-core/playwright, e2e/a11y.spec.ts): no critical/serious; PartInspector heading order linear; all four gallery tabpanels present (hidden-toggled); error pages have human copy + working retry; dead attributes/unreachable states removed; language choice persisted.

---

## §6 F3 Visual gate and wrap-up (root runs personally, serial)

### 6.1 Tasks

| Task | Content | Acceptance |
|---|---|---|
| F3-T1 Full regression | `pnpm test` → strict `pnpm validate` → `pnpm e2e` → `pnpm i18n:check` → `pnpm build`; poison spot-check: change one tooth count, `pnpm validate` must turn red, then restore | all green + poison caught |
| F3-T2 Regenerate renders | Run `scripts/render-renders.mjs` to re-emit 10 machines × 4 angles = 40 JPEGs (≤300 KB each) over `public/assets/renders/**`; home cards and loading posters benefit automatically. Add `scripts/check-assets.mjs` (new) enforcing the SITE-WIDE budget — sum of `public/assets` ≤25 MB, every file ≤300 KB including the font — and wire it into the F3-T1 chain (today no script enforces the 25 MB budget) | all 40 refreshed; `scripts/check-artifacts.mjs` passes; `node scripts/check-assets.mjs` passes |
| F3-T2b Camera retune | After F1 has reshaped every machine, re-tune the 10 authored home poses (F0-T4 stores them as ratios, but silhouettes changed) and re-shoot the framing screenshots | frame-fill 45–80% on all 10 (e2e via `__mech.frameFill()`) |
| F3-T3 Visual Gate 2.0 | Score every machine against the §6.2 checklist; screenshots to `artifacts/visual-gate-2/<slug>/` (before/after, scene, mid-assembly frame, principle-demo frame); skeptic adversarial re-review | 10/10 pass all items, recorded in ledger |
| F3-T4 Performance gate | Measure and record per §6.3 | targets met or deviation + waiver recorded |
| F3-T5 Docs and tag | Update `docs/SUBMISSION_NOTES.md` (Visual Gate 2.0 section) and `docs/OPEN_QUESTIONS.md` ([VERIFY] adjudications); `git tag fidelity-gate` | committed + tag exists |

### 6.2 Visual Gate 2.0 per-machine checklist (all 6 required)

1. **Recognizable at a glance**: without reading the title, the machine is identifiable as the historical artifact (cross-checked against the museum images in `src/data/machines/<slug>.json`);
2. **Credible materials**: wood/bronze/silver/iron/lacquer each read correctly; metals show environment reflections; no "grey-green plastic";
3. **Scene holds up**: the usage-scene backdrop is present, does not upstage or occlude the machine, never blocks orbit interaction; plain-background toggle works;
4. **No debug feel**: no permanently visible +/- clusters in the viewport; drive affordances appear only on hover/selection;
5. **Assembly is readable**: Play assembly scales with part count, parts fly in along visible paths, captions name the current part; neither completion nor interruption leaves parts floating;
6. **Principle is readable**: at least 3 of the machine's principle_aids are live (power-path highlight / particle flow / cutaway / callouts), and event captions are human language (no English slugs on the Chinese page).

### 6.3 Performance and budget gate

- astroclock cold entry: skeleton/poster < 0.5 s, first visible model < 3 s (dev mode, Apple-silicon laptop baseline); every other machine < 1.5 s.
- Drag-to-drive at 60 fps (astroclock may drop to 30 fps at full speed); machine geometry keeps the v1 ≤150k budget (existing e2e, unchanged meaning); scenery ≤30k per machine (separate `sceneryTriangles` probe counter); machine+scenery ≤180k.
- Hard thresholds gate on the F3 run on the dev machine; CI runs the same assertions tagged @perf with 25% headroom, non-blocking (headless CI timing is not the baseline).
- Asset budget inherited from v1: ≤300 KB per image, ≤25 MB site-wide; first-route JS < 500 KB gzip (new three/examples code counts).
- New font: self-hosted CJK-serif subset woff2 ≤ 300 KB, preloaded, `font-display: swap`.

---

## §7 Ownership map and wave orchestration

```
F0 (serial, single worker "core"; root may self-assign) — 12 tasks
  src/core/{textures.ts*, materialCache.ts*, geometryCache.ts*, geometryWarmup.ts*, materials.ts, primitives.ts, gears.ts}
  src/ui/viewer/{MachineViewer.tsx, DriveHandle.tsx, DriveGizmo.tsx*, SceneEnvironment.tsx*, AidLayer.tsx*, visualRecovery.ts, assembly.ts}
  src/ui/scene/{types.ts*, MachineEnvironment.tsx*}
  src/ui/compare/{CompareView.tsx, geometryCache.ts(shim)}
  src/sim/types.ts + src/data/schema.ts (new optional fields only: scene / aids / assemblyCaption / textureVariant)
  src/ui/store.ts (showScene flag ONLY — the file transfers to the ui worker in F2)
  src/validate/collision.ts + scripts/validate.mts (F0-T12 union sampling only)
  e2e/* (selectors migrate together with F0-T7/T9/T10)          (* = new file)
  Carve-out: F0 creates the template scene src/machines/gimbal/scene.ts PLUS a minimal aids[]
  declaration in src/machines/gimbal/build.ts (the F0-T11 acceptance fixture) and HANDS BOTH OVER —
  after the F0 tag they belong to worker-gimbal like every other machine file. F0 never touches any
  other src/machines/<slug>/ path (captions, instancing conversions etc. are F1 work).

F1 (parallel ×10, starts after the F0 tag — F0-T6/T11/T12 are hard prerequisites)
  worker-<slug> owns exclusively: src/machines/<slug>/**  (parts.json / build.ts / scene.ts / story.ts / schemes)
                                  src/data/machines/<slug>.json
                                  tests/machines/<slug>.test.ts
  Machines register bespoke scene props and particle emitters in their OWN build.ts
  (customSceneBuilders) and declare principle aids as data (F0-T11) — so F1 never needs src/ui/**.
  Must NOT touch: src/core/**, src/ui/**, other machines' directories, i18n catalogs.

F2 (single worker "ui", tasks serial T1→T10)
  Owns: src/ui/styles.css, index.html, src/ui/routes.tsx, src/ui/i18n/*.json, src/ui/store.ts,
        src/ui/panels/**, src/ui/docent/**, src/ui/compare/ComparisonTable.tsx,
        chrome JSX inside src/ui/viewer/** (toolbar / sidebar order / title hiding / DocentChat anchoring),
        scripts/check-i18n.mts, scripts/subset-font.mjs*, docs/FONT_CREDITS.md*, e2e/a11y.spec.ts*, package.json (devDeps)
  Scheduling: execution order inside the worker is T1→T2→T4→T6→T7→T8→T9→T10, then T3→T5. Layout
  tasks may run concurrently with F1 — file sets are disjoint from F1. The i18n sweep tasks
  (T3, T5) START ONLY AFTER the F1 wave tag:
  F1 introduces new event types, and enumerating/enforcing keys before that just gets invalidated.
  Any F2 task touching src/ui/viewer/** waits for the F0 tag.

F3 (serial, root)
```

Dependencies: F1 and F2 depend on F0 (types, material cache, scene renderer + custom-builder hooks,
aid contract, composite contract, texture variants); F3 depends on everything. The ten F1 machines
have zero inter-dependencies and may land in any order.

**NEEDS_CONTEXT → F0.5 protocol (bounded, stateless):** a worker that hits a missing shared
capability (a) first tries a machine-side solution within the F0-T6/T11/T12 contracts
(customSceneBuilders / aids / composite builders cover most cases); if truly blocked, (b) finishes
everything else in its order, lists the finished edits in FILES_CHANGED, puts the precise capability
spec in the report's NEEDS field (workers cannot run git or write the ledger — ROOT commits the
partial work and copies NEEDS into the ledger), and ends with last line NEEDS_CONTEXT plus a
skip-list; root defers that machine's acceptance until after the F0.5 re-dispatch. Workers are
stateless — root does NOT keep them alive waiting. At the wave checkpoint root batches all recorded needs into ONE F0.5 hotfix executed by
the core worker, then re-dispatches fresh workers only for the affected machines with their
skip-lists pasted into the prompt. One F0.5 round per wave maximum; anything still blocked after that follows §0.5-5's descope rule —
non-load-bearing [EYE] polish may be descoped (ledger + docs/OPEN_QUESTIONS.md), while §6.2/§9
load-bearing items keep the wave UNTAGGED until root runs a further F0.5 exception round (ledger
the deviation) or escalates to the human owner.

## §8 Default decisions (apply unless a work order says otherwise)

1. **Bronze palette**: default "freshly cast tin bronze" golden-brown `#b08d57` with polished edge wear; `textureVariant:'bronze:excavated'` (patina `#4e7c66`) only where a work order says so (the seismoscope vessel uses it); gilt `#d4af37` metalness 1.0 roughness 0.18; cast iron `#3b3f42` with speckle; silver high-reflectance low-roughness.
2. **Scene register**: museum diorama — the machine on a themed dais, 2-6 silhouette-grade props + fog + directional mood light; restrained, never a game level; plain-background toggle (store `showScene`, default on; compare and story cutaway segments force plain).
3. **Idle motion**: keep slow auto-drive (delta×0.06); escapement machines follow their scripted beat; after 30 s without interaction pause and switch to frameloop demand; any pointer event resumes.
4. **Provenance of new parts**: anchor to the v1 data card (`MECHANICA_PLAN_EN.md` §7) / museum photos where possible (wenwu/wenxian); pure structural inference is tuice (grey badge) and renders normally. [VERIFY] procedure: quotations get a snapshot receipt via scripts/snapshot-sources.mts; NUMBERS are cross-checked manually by root against the card + stored snapshots (the script cannot verify figures). What fails verification downgrades ONLY the affected numeric path to tuice — existence provenance stays — and never blocks a merge. Every tuice part without scheme tags carries a nonempty note; every numeric geometry path carries provenance or a tuice `@rest` (src/validate/provenance.ts:51-149 enforces both).
5. **Font**: self-hosted Noto Serif SC subset (only glyphs actually used), generated by `scripts/subset-font.mjs`, woff2 committed; no runtime webfont fetches.
6. **Any conflict with v1**: v1's numbers and snapshots win; this plan's presentation decisions win over v1's temporary visual compromises (e.g. the compare half-resolution apology banner is deleted outright).
7. **e2e baselines**: add the visual assertions specified in §3/§5 (frame-fill ratio, duration windows, absence of `.drive-buttons`, …); the existing 30 cases keep their semantics — selectors may migrate, meaning may not. ONE sanctioned exception, listed here so it is not treated as a violation: F0-T10 renegotiates the compare-canvas fps assertion (e2e/smoke.spec.ts:841-864) into a two-phase form — ≥40/25 fps during interaction, zero redraws while idle.

---

## §9 Definition of Done (tick off at F3)

1. All six user complaints in the §1.3 table have their tasks DONE with screenshot evidence;
2. All ten machines pass Visual Gate 2.0 (6 items × 10 machines, skeptic-countersigned);
3. `pnpm test` / strict `pnpm validate` (10 green reports) / `pnpm e2e` / `pnpm i18n:check` / `pnpm build` all green; poison still caught;
4. §6.3 performance gate met (or deviations recorded);
5. 100% of new data carries provenance; [VERIFY] count is zero (verified or downgraded with a record in `docs/OPEN_QUESTIONS.md`);
6. 40 renders regenerated and committed; home page and loading states use the posters; `docs/SUBMISSION_NOTES.md` gains the "Visual Gate 2.0" section; tags `fidelity-w0..w3` + `fidelity-gate` all exist;
7. Dead i18n keys at zero (`scripts/check-i18n.mts` extended with an unused-key check, passing); no English slugs leak into the Chinese page;
8. Every task closed per §0.5 (one commit with the worker's message, [CMD] claims landed as tests, [EYE] claims backed by archived screenshots, ledger entry present) — spot-check any three tasks' ledger entries against their commits.

> Afterwards, return to the v1 plan for its Wave-6 release blockers (API-keyed artifacts and conflict closure); merge the two tracks and cut the official release tag.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | not run | — |
| Codex Review | `/codex` (adversarial) | Independent 2nd opinion | 1 | issues_found → fixed | 41 findings (35 P1, 6 P2), 41/41 addressed |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | not run | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | not run | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | not run | — |

- **CODEX:** adversarial plan review (gpt-5.6-sol, xhigh, ~4.0M tokens, ~60 code cross-checks) — all 41 findings folded back: per-renderer PMREM, build-time box-projected UVs (no triplanar), StrictMode-safe lifecycles, new F0-T11 aids contract + F0-T12 composite contract, single-worker F2 with T3/T5 gated after F1, corrected gimbal ring diagnosis, bellows reassignment adjudication, operational [VERIFY] procedure, measurable asset/triangle/fps gates.
- **v2.2:** second executor pass (codex as root, 17 P1 + 1 P2) — all closed: T11 acceptance moved onto the §7 carve-out fixture with deterministic e2e thresholds (e2e/aids.spec.ts); T12 got named fixtures (compositeBuilder test, e2e/composite via #/m/demo) + array-aware geometry cache + bumpMap/normalMap channels; worker prompts now paste the §7 protocol and (F1) the full §4 preamble; acceptance claims pre-tagged [CMD]/[EYE] by root at dispatch; baseline + MECH_SHOOT state-capture screenshot protocol; bounded descope rule; isolated stash-verify closes for parallel F1; NEEDS_CONTEXT semantics fixed (root commits partial work, status name aligned, acceptance deferred); F2 execution order settled; non-numeric [VERIFY] fallback defined; run-id/tag rerun policy set.
- **v2.2b:** third executor pass closures — F0-T11's file list now names the §7 carve-out `gimbal/build.ts`; wave-0 baselines split (route-load at start, interaction states right after F0-T4); F1 switched to wait-all-then-close (a report is a hand-off; closes run with zero live writers, F2 idle-gap scheduled); §7's post-F0.5 fallback now defers to §0.5-5 (load-bearing items keep the wave untagged).
- **v2.1:** post-review hardening for the Codex execution model — §0.4 capability matrix + worker prompt/report templates, §0.5 universal delivery standard (assertion classes, standard screenshot command, verification chain with expected outputs), §0.6 root runbook + wave exit criteria, §0.7 glossary; F1 visual audits reassigned to root (workers cannot run shell or browsers).
- **UNRESOLVED:** 0 blocking; [VERIFY] rows and the F1-09 bellows reassignment adjudicate at execution time by design.
- **VERDICT:** CODEX CLEARED after fixes — ready for ultracode execution. Executor sign-off obtained on the 3rd codex pass: findings #2/#8/#10/#11 CLOSED, no new [P1], "Final: YES — codex root can execute F0 and dispatch F1 from this document with zero guessing".
