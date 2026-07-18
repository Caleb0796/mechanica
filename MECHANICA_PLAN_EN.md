# Mechanica — Ancient Machines Reborn · Codex Autonomous Execution Plan

> **To the executor (Codex root orchestrator):** this file is a complete, self-contained blueprint. Start per §0, execute Phases in §6 order, fill content from the §7 data cards, and close out against the §9 final checklist. All classical quotations, gear tooth counts, image URLs and licenses were verified character-by-character / link-by-link by an upstream research pipeline. **Never alter data-card numbers from memory or secondary sources.** The only evidence that outranks a data card is the **source-text snapshot** fetched by `scripts/snapshot-sources.mts` (P2-T3) — when a snapshot contradicts a data card, revise the card to match the snapshot and log the revision in `docs/OPEN_QUESTIONS.md`; until a load-bearing conflict (numbers/quotes) is adjudicated, the affected machine is **release-blocked**.
>
> Generated: 2026-07-17 · Deadline target: 2026-07-21 12:00 PDT (= 03:00 07-22 Beijing) · Context: OpenAI Build Week (Education track)

---

## §0 How to Use This Plan (Launch Instructions)

### 0.1 Launch

Start Codex in an **empty directory** (recommended `mechanica/`, either a subdirectory of the current repo or a fresh directory), with this file placed inside it (or its parent):

```bash
mkdir -p mechanica && cp MECHANICA_PLAN_EN.md mechanica/ && cd mechanica
codex   # interactive mode; use the prompt below as the first message
```

First prompt (**note: with `codex exec` you MUST single-quote the string — inside double quotes the shell expands `$ultracode` to an empty string**):

```text
$ultracode Read MECHANICA_PLAN_EN.md in full and execute the "Mechanica — Ancient Machines Reborn" project strictly per the plan.
Route = full (understand → modify → verify → adversarial gate).
Orchestrate sub-agents by the waves in §5; every task's acceptance commands in §6 are run by YOU (root) — sub-agents cannot execute commands.
After each Phase, append a section to .codex/ultracode/runs/<id>/ledger.md (Route/Scope/Findings/Changes/Verification/Adversarial gate/Unresolved risks/Next action).
Do not stop to ask style questions; follow every decision the plan already makes, and resolve anything unspecified via §8's default decision rules, logging the call.
```

### 0.2 Iron Rules for Root and Sub-agents (hard constraints from the ultracode skill)

1. **Sub-agents cannot run any shell command** (tests/builds/installs are auto-rejected). They only produce file edits + static evidence (file:line, code excerpts). **Every task's acceptance commands are run by root after collecting diffs.**
2. Workers must have **mutually disjoint file ownership** (§5.4 ownership map). Every worker prompt must state "you are not the only one editing this codebase; never revert or delete others' files."
3. After each wave, root runs a **deletion audit**: `git diff --stat <wave-start-commit>..HEAD | grep -E "^\s.*\|\s*0$|deleted"`; restore any teammate files a worker silently deleted (silent deletion by parallel agents is a known, recurring failure mode of multi-agent work — defend against it institutionally).
4. Every worker prompt must be self-contained (paste the full task text + data card + acceptance criteria) and must end with a status: `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
5. Concurrency cap 16; `close_agent` immediately when a worker finishes to free its slot; more than 16 units → work in waves.
6. Load-bearing conclusions (gear ratios, philology, licenses) count only after **skeptic adversarial verification**.
7. **Committed artifacts must be sanitized**: no absolute user paths, Codex session IDs, org/tenant identifiers, or internal service endpoints in ledger/artifacts/reports. Raw run transcripts never enter version control (exclude via `.gitignore`); commit only sanitized summaries.

### 0.3 One-time Environment Prep (root runs personally)

```bash
node -v   # need >= 20; install Node 20 LTS if absent
corepack enable && corepack prepare pnpm@latest --activate   # on failure, use npm equivalents throughout
git init -b main && git add MECHANICA_PLAN_EN.md && git commit -m "chore: import execution plan"
```

If entering OpenAI Build Week: run `/feedback` NOW to record the **Codex Session ID**, write it into `docs/SUBMISSION_NOTES.md` and commit (required by judging; cannot be recovered later).

---

## §1 Project Overview and Success Criteria

### 1.1 One-liner

**Mechanica — Ancient Machines Reborn**: a digital museum of ancient Chinese machinery you can *take apart, drag, and cross-examine* — the 10 most famous ancient machines reconstructed from classical texts and museum artifacts into **parametric, simulatable, every-dimension-sourced** interactive 3D exhibits.

### 1.2 Core Pipeline (product narrative = build process)

```
Classical texts + period drawings + museum measurements   (§7 data cards — research already done)
   → Parts list & constraints                (GPT-5.6 extraction + human reconciliation → parts.json, every number sourced)
   → Parametric mechanical structure         (involute-gear/part generators → three.js geometry)
   → Kinematic solving + collision checking  (constraint-graph solver; three-mesh-bvh full-cycle sweep)
   → Independent agent audit                 (deterministic validator + GPT-5.6 independently re-derives ratios/ranges/collisions)
   → Browser exhibit pages                   (disassemble / drag-to-drive / switch scholars' reconstructions / click parts for sources)
```

### 1.3 Core User Interactions (U1–U4 = MUST; U5 = progressive enhancement; U6 = MUST)

| # | Interaction | Acceptance definition |
|---|------|----------|
| U1 | **Disassemble & reassemble**: explode slider + ordered assembly | Every machine explodes; parts return in `assemblyStep` order |
| U2 | **Drag one gear, the whole transmission follows** | Dragging any drivable part animates the full train at exact ratios (including reverse dragging) |
| U3 | **Switch scholars' reconstructions + side-by-side comparison visual** | ≥5 machines offer dual schemes (marked in §7): switching shows diff highlights + comparison table; **plus a synchronized side-by-side dual-viewport mode** — both schemes on screen, camera & drive linked, behavioral differences visible live |
| U4 | **Click a part for original text, dimensional basis, and controversies** | Every part panel shows: classical quotation, dimensions (ancient + metric with conversion basis), provenance badge (textual/artifact/conjecture), controversy notes (if any) |
| U5 | **AI Docent Q&A (progressive enhancement)** | Grounded chat over the current machine's knowledge base: every factual claim carries a source chip; refuses out-of-corpus questions; with no API key deployed the entry hides itself and the core experience is unaffected |
| U6 | **Ingenuity Spotlight (MUST)** — the soul of antiquity reconstruction: make visitors *see* why the design is brilliant | One "Why it's ingenious" card per machine: ① a one-sentence hook ② a **≤10-second one-tap demo** (scripted moment of camera move + part highlights + drive choreography, ending with a clear done-state) ③ a modern echo (where this idea lives today). The ten hooks and demo scripts are specified in each §7 data card's "Ingenuity" row |

### 1.4 Definition of Done (final acceptance — tick §9 line by line)

1. All 10 machines live; each with: parametric 3D model + transmission simulation + U1–U4 + Ingenuity Spotlight card (U6) + museum gallery (multi-angle, license-attributed) + bilingual (zh/en) copy.
2. `pnpm test` (unit), `pnpm validate` (10 green validation reports), `pnpm e2e` (Playwright) all pass; the **poison test** (deliberately corrupt a tooth count) must turn the validator red.
3. Static deployment publicly reachable; cold first paint < 3s on a mid-range laptop; each machine lazy-loaded.
4. Build-time GPT-5.6 extraction/audit artifacts archived under `artifacts/` (prompt + response + verdicts); the core live site has zero LLM dependency — the only runtime LLM surface is the AI Docent (U5), behind a serverless proxy, degrading to hidden when keyless.
5. (If competing) README contains "How Codex accelerated this" with artifact links; <3-minute video script ready; Session ID recorded.

### 1.5 Non-goals (explicitly out, to stop agent drift)

- No game-engine-grade dynamics (gear tooth contact forces, soft bodies, fluid rendering — water is stylized particles/planes).
- No user accounts, no CMS; the core site is fully static — the only backend is the AI Docent's single serverless function (P4-T5, fully optional).
- No artifact-grade scanned textures; procedural wood/bronze/silver PBR approximations.
- Not all 162 timekeeping jacks of the astronomical clock tower — a representative 12 figures across the five tiers.

---

## §2 Global Constraints (implicit in every task)

- **Stack locked**: Vite 6 + React 19 + TypeScript 5.7 (strict) + three.js ^0.17x + @react-three/fiber ^9 + @react-three/drei (current major) + three-mesh-bvh (collision) + zustand ^5 (state) + i18next (zh/en) + Vitest (unit) + Playwright (e2e). **Forbidden**: physics engines (rapier/cannon/ammo), heavyweight CSS frameworks (Tailwind optional, but no UI component libraries), runtime CAD kernels, backend services (single exception: P4-T5's `api/docent.ts` serverless function, which must be fully optional — the site works without it).
- **Package manager**: pnpm (lockfile committed); degrade to npm equivalents if `pnpm install` fails.
- **Naming**: machine slugs fixed as `astroclock` `seismoscope` `chariot` `odometer` `wooden-ox` `loom` `typecase` `chainpump` `bellows` `gimbal` (§7 order). Code identifiers in English; UI copy bilingual via i18n keys.
- **Three-tier provenance** (the project's core convention): `provenance.kind ∈ { "wenxian" (textual record) | "wenwu" (physical artifact) | "tuice" (scholarly conjecture) }`. **Every part and every key dimension must carry provenance**; the validator treats absence as an error. UI renders three-color badges (textual=teal, artifact=gold, conjecture=gray).
- **Units**: SI meters internally. Ancient-unit conversions centralized in `src/core/units.ts`: Song chi 0.312 m, Han chi 0.231 m, late-Han/Wei-Jin chi 0.242 m, Yuan construction chi 0.315 m (± marked approximate). Display layer shows both the ancient original figure and metric.
- **Licensing**: project code MIT; images tiered per `IMAGE_CREDITS.json` (§6 P2); CC BY-SA attribution obligations must be honored in UI captions.
- **Asset closed loop** (clean checkout must be shippable): optimized assets produced by `fetch-images`/render screenshots are **committed to the repo** (≤300 KB per image, ≤25 MB total budget; originals not committed); CI/deploy never re-fetch; the validator checks that every `file` path referenced by data JSON actually exists in the repo — missing = fail.
- **Git discipline**: one commit per task, conventional commits (`feat: ...` `fix: ...` `data: ...` `test: ...`); tag `wave-N` at each wave end.
- **Performance budget**: first-route JS < 500 KB gzip; < 150k triangles per machine scene; 60 fps drive animation (30 fps acceptable fallback).
- **Time budget** (if competing): finish P0–P4 by 24:00 07-19; feature freeze noon 07-20, only P6–P7 after; submit by 12:00 PDT 07-21. The moment you slip, apply §8's descope order.

---

## §3 Architecture Overview

### 3.1 Three-layer Motion System (key decision, evidence-backed)

| Layer | Role | Implementation | Why |
|----|------|------|--------|
| L1 kinematic constraint graph | Single source of truth for transmission: drive any node → propagate through the whole chain. **Layered semantics** (every node stores an **absolute** generalized coordinate — kills path dependence): ① linear transmission subgraph `mesh/belt/lockstep` — ratio propagation, reversible, BFS cycle check; ② **function edges** `crank/cam` — evaluated from the upstream absolute phase (not ratio-propagated); reverse dragging uses numeric inversion with dead-center clamping (\|ds/dθ\|<ε → hold position and emit a `deadcenter` event); ③ **multi-input node** `differential` — the carrier is solved each frame from both sun wheels' absolute states (driving one keeps the other's state), guaranteeing drive-order independence; ④ `gimbal` analytic layer — the shell attitude is a quaternion input; ring angles solved analytically; the incense bowl's world attitude stays constant | Physics engines are notoriously unstable for gear-tooth contact (Box2D's official GearJoint is itself a kinematic constraint `c1+ratio·c2=const`; the GearBlocks devlog documents abandoning tooth-contact simulation). A constraint graph gives **exact** ratios, determinism, and scheme-switching = swapping graph parameters. Layering instead of a general constraint-equation solver is a deliberate 4-day-budget tradeoff — each layer's semantics is backed by a P1-T2 golden unit test |
| L2 mechanism state machines | Discrete actions: escapement release, seismoscope ball drop, jack figures striking drum/bell | Optional per-machine `MechanismScript` (time/angle → events) | Escapement/triggering is inherently discrete-event; a continuous solver cannot express it |
| L3 collision validation | Full-motion-cycle interference checking (build-time, not runtime) | three-mesh-bvh with **adaptive sampling** — step count derived from "the fastest-moving part advances ≤0.5° between adjacent samples" (`steps = ceil(cycleRad · maxSpeedRatio / 0.5°)`, cap 200,000; if capped, densify down and record the **actually achieved resolution** in the report — never pass off coarse sampling as "no collision over the full cycle"); meshing gear pairs additionally get a **single-tooth-pitch fine sweep** (one revolution of the faster wheel at 0.25 tooth-pitch steps) + 2D involute interference checks (center distance / addendum circles / backlash > 0); **only part pairs joined by a `fixed` joint are skipped** — pairs joined by moving joints are checked unless whitelisted (prevents the parent-child blanket exemption from masking link-vs-bracket interference) | The user requirement "an independent agent checks gear ratios, ranges and collisions" lands as a CI report; zero runtime cost |

### 3.2 Data Flow

```
§7 data cards (markdown)
  └─(P2 data-curation worker transcribes)→ src/data/machines/<slug>.json    ← knowledge base (copy/quotes/museums/images)
  └─(P2 GPT-5.6 extract-parts script)→ artifacts/extractions/<slug>.json    ← parts draft (archived for audit)
        └─(P3 machine-builder worker reconciles)→ src/machines/<slug>/parts.json    ← parts + constraints + provenance
                                                  src/machines/<slug>/schemes/*.json ← scholars' scheme patches
src/machines/<slug>/parts.json ─→ geometry generation (L1 core) ─→ R3F scene
                              └─→ scripts/validate.mts ─→ reports/<slug>.validation.json (CI gate)
                              └─→ scripts/audit-llm.mjs (GPT-5.6 independent audit) ─→ artifacts/audits/<slug>.md
src/data/machines/<slug>.json ─(runtime, optional)→ api/docent.ts system prompt ─→ AI Docent grounded Q&A (current machine's corpus only + source chips)
```

### 3.3 Directory Layout (path baseline for all tasks)

```
mechanica/
├── MECHANICA_PLAN_EN.md         # this file
├── AGENTS.md                    # Codex project conventions (written in P0, content in §5.6)
├── package.json / pnpm-lock.yaml / vite.config.ts / tsconfig.json
├── index.html
├── api/docent.ts                # P4-T5 AI Docent serverless function (optional)
├── src/
│   ├── core/                    # P1-T1 parametric geometry library (owned by W1-core)
│   │   ├── units.ts             #   ancient-unit conversions
│   │   ├── gears.ts             #   involute/trapezoid/pin-tooth gear generation
│   │   ├── primitives.ts        #   shafts/beams/frames/scoops/shells/belts
│   │   └── materials.ts         #   procedural wood/bronze/iron/silver materials
│   ├── sim/                     # P1-T2 kinematic core (owned by W1-sim)
│   │   ├── graph.ts             #   constraint-graph solver
│   │   ├── edges.ts             #   constraint edge types
│   │   ├── escapement.ts        #   escapement state machine
│   │   └── types.ts             #   PartDef/ConstraintDef/SchemePatch/MachineSpec/MachineModule
│   ├── validate/                # P1-T3 validator (owned by W1-validate)
│   │   ├── ratios.ts / range.ts / collision.ts / provenance.ts / sampling.ts
│   │   └── report.ts
│   ├── ui/                      # P1-T4 interface shell (owned by W1-ui)
│   │   ├── App.tsx / routes.tsx
│   │   ├── viewer/              #   MachineViewer, DriveHandle, ExplodedControl
│   │   ├── panels/              #   PartInspector, SchemeSwitcher, GalleryPanel, DocentChat
│   │   ├── story/               #   ScrollStory (P5)
│   │   ├── compare/             #   P4-T2 side-by-side comparison (ownership disjoint from viewer/**)
│   │   ├── docent/              #   P4-T5 AI Docent prompt builder + mock
│   │   └── i18n/zh.json en.json
│   ├── machines/<slug>/         # P3: one worker per machine, mutually disjoint
│   │   ├── parts.json           #   parts + constraints + provenance
│   │   ├── schemes/<id>.json    #   scholars' scheme patches
│   │   ├── build.ts             #   assembles the MachineModule (default export)
│   │   └── story.ts             #   (flagship 3 only) scrollytelling script
│   └── data/machines/<slug>.json  # P2 knowledge-base JSON
├── scripts/
│   ├── validate.mts             # runs the 10 validation reports (tsx — can dynamically import TS)
│   ├── snapshot-sources.mts     # P2-T3 source-text snapshots + hashes (machine-checkable receipts for quotes)
│   ├── extract-parts.mjs        # GPT-5.6 classical text → parts draft (build-time)
│   ├── audit-llm.mjs            # GPT-5.6 independent audit (build-time)
│   ├── fetch-images.mjs         # downloads CC/PD images per manifest + generates credits (outputs committed)
│   └── poison-test.mts          # poison self-test (corrupt a tooth count → validator must turn red)
├── public/assets/
│   ├── museum/<slug>/*.jpg      # downloaded, license-compliant images
│   ├── renders/<slug>/*.jpg     # P6 turntable renders (fallback gallery layer)
│   └── IMAGE_CREDITS.json
├── artifacts/                   # build-time LLM artifacts (prompts + responses)
│   ├── extractions/ audits/ source-snapshots/
├── reports/                     # validation reports (CI artifacts, committed)
├── tests/                       # Vitest units
├── e2e/                         # Playwright
└── docs/
    ├── SUBMISSION_NOTES.md      # Session ID / submission materials
    ├── OPEN_QUESTIONS.md        # philological doubts discovered during execution
    └── VIDEO_SCRIPT.md          # P7 video script
```

---

## §4 Presentation Verdict (main paradigm + three enhancement paradigms)

Three design principles run through the whole plan (already codified as hard rules in §2/§5/P6): **no render without a citation** (three-tier provenance: textual/artifact/conjecture), **builder–verifier hard separation** (deterministic validator + independent LLM audit + poison self-test — deliberately corrupt data, the checks must go red), **documents as contracts** (this plan and AGENTS.md directly drive the agents; fully re-runnable). Artifact discipline: git holds only small JSON reports and sanitized summaries; images fetched on demand; no large binaries beyond the budgeted site assets.

### 4.1 Main Paradigm + Three Enhancement Modes (verdict)

**Main paradigm: the "operable museum exhibit page"** (Smithsonian Voyager information architecture × direct manipulation). One page per machine: central 3D stage (drag the transmission live) + right-hand philology panel (sources/dimensions/controversies) + bottom tour stepper + museum photo gallery. Voyager (Apache-2.0, the Smithsonian's official open-source viewer) validated the "hotspot annotations + article + guided tour" structure as the museum-grade standard; we borrow its architecture, not its code (it targets scanned meshes and has no kinematics).

Layered on top, three enhancement modes (research found no existing web precedent for "parametric + operable transmission" — the combination itself is the differentiation):

| # | Mode | Prototype evidence | Landing in this project | Cost |
|---|------|----------|-----------|------|
| B1 | **Scroll-driven narrative on the same 3D stage** (the Ciechanowski paradigm — ciechanow.ski/mechanical-watch, widely regarded as the ceiling of interactive science writing) | Scroll progress → choreographed camera pose + explode factor + drive angle + part highlights | Flagship 3 machines only (astroclock / chariot / seismoscope), one `story.ts` script each, reusing one renderer | Medium (P5) |
| B2 | **Scholars' scheme comparison mode** (no known precedent anywhere) | Same stage, ghost overlay, **plus synchronized side-by-side dual viewports** (camera/drive linked — watch two reconstructions diverge under the same excitation) + diff table + controversy notes | 5 dual-scheme machines (marked in §7); a scheme = a patch over parts.json | Low–medium (P4) |
| B3 | **Reassembly challenge** (Animagraffs made playable) | Explode → drag parts home → snap detection → wrong order jams the transmission with a classical-text hint | Reuses explode view + BVH snapping, generic across machines | Medium (P4 optional / stretch) |

**Fallback degradation**: if U2 live-linkage proves unmanageable for a machine, that one machine may degrade to `<model-viewer>` + pre-baked glTF animation + hotspot annotations (still presentable, not U2-compliant; allowed only for the machines last in §8's descope order).

---

## §5 Multi-agent Orchestration ($ultracode site management)

### 5.1 Route and Wave Overview

Phase 0 route = **full**. Executor = in-session fan-out (≤16 units/wave; no external harness needed).

```
W0  root solo: scaffold + type contracts + CI + AGENTS.md                    (P0, serial, ~1h)
W1  4 workers parallel: core geometry / sim solver / validator / UI shell    (P1)
    └─ 4 skeptics adversarial review (two-stage: spec compliance, then code quality; ≤2 rounds)
W2  2 workers parallel: data curation (10 knowledge JSONs) / image pipeline + source snapshots + GPT-5.6 scripts (P2)
W3  10 workers parallel (spawn_agents_on_csv, machines.csv): one builder per machine (P3)
    └─ root runs pnpm validate per machine; reds go back to the original worker (send_input, ≤2 rounds, then root fixes)
W4  5 workers parallel: assembly interactions / scheme switch + side-by-side / gallery + attribution / i18n / AI Docent (P4)
W5  3 workers parallel: flagship scrollytelling ×3                           (P5)
W6  root + 2 skeptics: poison tests, performance, e2e, completeness critic   (P6)
W7  root solo: deployment + submission packaging                             (P7)
```

At each wave end: root runs full `pnpm test && pnpm validate && pnpm build` → deletion audit → `git tag wave-N` → ledger append.

### 5.2 Worker Prompt Template (root assembles, filling every field)

```text
You are one of the parallel build workers on the Mechanica project. You are NOT the only
one editing this codebase: never modify or delete any file outside your ownership; no
drive-by refactors; never change dependency versions.
You cannot run any command (it will be rejected); produce file edits only, with static
evidence (file:line).

【Your ownership】<directory/file list>
【Full task text】<paste the complete §6 task text, including code blocks>
【Data card】<for machine-builder tasks, paste the full §7 card>
【Interface contracts】<paste the relevant fragments of P0-T2 types.ts>
【Acceptance criteria】<paste the task's acceptance list; root runs the commands>
【Completion format】end with a status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED,
plus: list of files changed, key implementation decisions, and the commands you need
root to run on your behalf.
```

### 5.3 Skeptic Adversarial Verification (mandatory for load-bearing outputs)

Dispatch skeptics (reading the full diff/data, default-inclined to refute) over three output classes:

1. **Philological-consistency lens**: every number in `src/data/machines/*.json` and `parts.json` checked one-by-one against the §7 data cards (tooth counts, dimensions, quotes, conversions). "Card says 54 teeth, JSON says 45" = kill.
2. **Contract lens**: filenames / CLI commands / public APIs / README claims match the actual code (the small-detail failure class).
3. **Correctness lens**: solver math (Willis-formula signs, mesh inversion sign ωb=−(za/zb)·ωa), unit conversions, license obligations.

When a skeptic returns UNVERIFIABLE (needs running code): keep the finding, flag it unverified, root confirms at runtime.

### 5.4 File Ownership Map (the anti-conflict constitution)

| worker | exclusive paths |
|--------|----------|
| W1-core | `src/core/**`, `tests/core/**` |
| W1-sim | `src/sim/**`, `tests/sim/**` |
| W1-validate | `src/validate/**`, `scripts/validate.mts`, `scripts/poison-test.mts`, `tests/validate/**` |
| W1-ui | `src/ui/**`, `index.html`, `src/main.tsx`, `playwright.config.ts`, `e2e/smoke.spec.ts` |
| W2-data | `src/data/machines/**`, `src/data/schema.ts`, `tests/data/**` |
| W2-pipeline | `scripts/extract-parts.mjs`, `scripts/audit-llm.mjs`, `scripts/fetch-images.mjs`, `scripts/snapshot-sources.mts`, `public/assets/**`, `artifacts/source-snapshots/**` |
| W3-<slug> ×10 | `src/machines/<slug>/**`, `tests/machines/<slug>.test.ts` |
| W4/W5 | on top of W1-ui and W3 outputs, re-scoped per task (see each task's ownership line) |
| root exclusive | `package.json`, `vite.config.ts`, `tsconfig.json`, `AGENTS.md`, `.github/**`, `docs/**`, `reports/**`, `artifacts/**` |

### 5.5 Where GPT-5.6 Sits (build-time extraction/audit + runtime AI Docent)

- `scripts/extract-parts.mjs`: feeds each machine's classical quotations to GPT-5.6 (Responses API, `reasoning.effort: "high"`), producing a **draft** parts/constraints JSON → archived under `artifacts/extractions/` (full prompt + response). Machine builders start from the draft and finalize against the data card (this is the honest artifact of the "classical text → parts list" pipeline).
- `scripts/audit-llm.mjs`: the **independent audit agent** — GPT-5.6 receives only the classical text + the final parts.json + the validation report, and must independently derive ratios/ranges from the text and cross-examine the implementation, outputting a verdict markdown → `artifacts/audits/`. Cross-validation against the deterministic validator (the second half of the user requirement "independent agent checks").
- Both scripts require `OPENAI_API_KEY`; when absent they print a warning and skip (archived artifacts unblock the build).
- **The only runtime LLM surface = the AI Docent (P4-T5)**: GPT-5.6 behind the `api/docent.ts` serverless proxy, strictly grounded in the current machine's knowledge base, source chips enforced, rate-limited; hides itself on keyless deploys — the core site has zero LLM dependency.

### 5.6 AGENTS.md (root writes verbatim into the project root at P0)

```markdown
# Mechanica — Agent Conventions
- Build/test commands (root/human only): pnpm install · pnpm dev · pnpm test · pnpm validate · pnpm e2e · pnpm build
- Data is law: numbers in src/data and src/machines follow MECHANICA_PLAN_EN.md §7 as the single source of truth; no "helpful corrections".
- Three-tier provenance: every part & dimension carries provenance {kind: wenxian|wenwu|tuice, ref}; absence = validation error.
- Units: meters internally; ancient-unit conversion only via src/core/units.ts.
- Ownership: one owner per src/machines/<slug> directory; cross-directory edits must be declared in the task notes first.
- Commits: conventional commits; one commit per task; node_modules and raw large images stay out;
  optimized site assets produced by fetch-images/render pipeline (≤300KB each, 25MB total budget) MUST be committed —
  a clean clone must build and deploy.
- Red validation = stop merging; fix first. Poison tests (scripts/poison-test.mts) are EXPECTED to go red — green is the bug.
- Raw run logs/transcripts never enter the repo; sanitize committed artifacts (paths / session IDs / org IDs / internal endpoints).
```

---

## §6 Phase Tasks

> Task format: **Files / Interfaces / Steps / Acceptance (root runs)**. Code blocks are ready to land as-is; files marked `// skeleton` may be extended by workers as long as exported signatures stay unchanged.

### §6.0 Step-by-Step Master Table & Phase GATEs (the sole standard for Phase completion)

**Execution discipline**: advance strictly by S-number; at each Phase end, root runs every row of the corresponding GATE table — **all rows must pass before tagging and entering the next Phase**. Where a GATE table conflicts with in-task acceptance, the GATE table wins (in-task acceptance is process checking). After each GATE, append the actual command outputs to the ledger.

#### Step master table (S-number → task → executor)

```
Phase 0 (root solo)              Phase 3 (10 workers, CSV fan-out)
 S0.1 §0.3 env prep + SessionID    S3.0 P3-T0 machines.csv + assemble worker prompts (template + data card + full types.ts)
 S0.2 P0-T1 scaffold               S3.1 spawn_agents_on_csv launches 10 machines (concurrency ≤16)
 S0.3 P0-T2 type contracts (freeze) S3.2 collect CSV results → re-run failed rows once → root builds leftovers personally
 S0.4 P0-T3 CI                     S3.3 per machine: unit tests → validate --partial → browser check → commit
 → GATE-0 → tag wave-0             S3.4 all ten: strict validate → CI flip → poison five needles → deletion audit
                                   → GATE-3 → tag wave-3
Phase 1 (4 workers + 4 skeptics)
 S1.1 launch W1-core/sim/          Phase 4 (5 workers parallel)
      validate/ui concurrently      S4.1 launch T1 assembly / T2 schemes+compare / T3 gallery / T4 i18n / T5 docent
 S1.2 collect diffs → root runs     S4.2 root serially wires MachineViewer's compare mode
      each task's acceptance        S4.3 root runs full suite + hand checks
 S1.3 4 skeptics two-stage review   → GATE-4 → tag wave-4
      (≤2 repair rounds)
 S1.4 deletion audit               Phase 5 (3 workers parallel)
 → GATE-1 → tag wave-1              S5.1 three flagship story.ts (first worker stands up the ScrollStory skeleton)
                                    S5.2 root scroll-checks each page
Phase 2 (2 workers parallel)       → GATE-5 → tag wave-5
 S2.1 W2-data: 10 knowledge JSONs
 S2.2 W2-pipeline: fetch-images    Phase 6 (root + 2 skeptics + 1 critic)
      + snapshot-sources            S6.1 P6-T1 poison five needles → S6.2 P6-T2 audit adjudication
      + extract/audit scripts       S6.3 P6-T3 full e2e → S6.4 P6-T4 performance + renders + critic
 S2.3 root: run all three scripts  → GATE-6 → tag wave-6
      + snapshot poison test
 → GATE-2 → tag wave-2             Phase 7 (root solo)
                                    S7.1 standalone repo + deploy → S7.2 README → S7.3 video script → S7.4 submit
                                   → GATE-7 → done
```

#### GATE-0 (scaffold)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G0.1 | dev runs | `pnpm dev` then curl `http://localhost:5173` | HTTP 200; 0 console errors in browser |
| G0.2 | build | `pnpm build` | exit code 0; `dist/index.html` exists |
| G0.3 | types | `pnpm exec tsc --noEmit` | 0 errors |
| G0.4 | contract freeze | `git log --oneline` | contains a `freeze data contracts` commit; any later change to types.ts requires a logged approval reason in the ledger |
| G0.5 | CI in place | read `.github/workflows/ci.yml` | contains `VALIDATE_FLAGS: "--partial"`, a poison step, and the e2e hashFiles gate |
| G0.6 | Session ID | read `docs/SUBMISSION_NOTES.md` | ID recorded and committed (mandatory when competing) |

#### GATE-1 (core libraries)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G1.1 | unit-test scale | `pnpm test` | all green; ≥18 cases (core ≥3 / sim ≥9 / validate ≥6) |
| G1.2 | golden ratios | tests/sim output | odometer 1/100 and 1/1000 assertions within ≤1e-12; tooth total = 285 |
| G1.3 | four-family layered semantics | tests/sim output | differential order-independence: carrier difference ≤1e-12 across both orders; crank s(0)=0, s(π)=2r (≤1e-9) with `deadcenter` event on reverse-drag at dead point; gimbal: 50 random shell attitudes, bowl deviation all <0.5° |
| G1.4 | strict-mode self-proof | `pnpm validate` and `pnpm validate --partial` | no-flag run exits 1 reporting "manifest incomplete"; `--partial` exits 0 with exactly 10 skip warnings |
| G1.5 | e2e chain | `pnpm e2e` | webServer auto-starts preview; smoke test green (10 cards) |
| G1.6 | demo-page hand check | browser | ① drag the 20-tooth gear → 40-tooth turns opposite at exactly half the angle (verified via `__mech.graph.state()` readings) ② part click opens panel ≤300 ms ③ explode slider at max: `__mechExplodeSpread()` > 0.1 ④ 10 s performance sample averages ≥50 fps |
| G1.7 | skeptic closure | ledger | 4 review reports archived; findings fixed within ≤2 rounds, 0 left open |
| G1.8 | deletion audit | `git diff --stat wave-0..HEAD` | no unexplained file deletions |

#### GATE-2 (data & assets)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G2.1 | knowledge-base cardinality | `pnpm test -- tests/data` | green; all 10 machines pass the per-slug cardinality table (P2-T1); ingenuity's three fields non-empty in both languages |
| G2.2 | quote snapshots | `pnpm snapshot-sources` | 10 directories under `artifacts/source-snapshots/`; `quoteFound:true` coverage 100% (offline exceptions ≤2, each with a note) |
| G2.3 | snapshot poison | hand-alter one character of the `houfeng-196` quote | `pnpm validate --partial` turns that machine red → green after restore |
| G2.4 | images committed | `du -sh public/assets` + per-directory count | every machine meets its per-slug download minimum; ≤300 KB per image; ≤25 MB total; already `git add`-ed |
| G2.5 | attribution completeness | read `IMAGE_CREDITS.json` | entry count = downloaded file count; CC-BY/SA entries have author/licenseUrl/attributionText non-empty at 100% |
| G2.6 | extraction archive | `ls artifacts/extractions` | (when keyed) 10 files, each with prompt + response + uncertainties; keyless runs logged as skipped in the ledger |

#### GATE-3 (the ten machines)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G3.1 | per-machine units | `pnpm test -- tests/machines` | 10 files all green; each contains expectedRatios assertions + provenance-coverage assertions + mechanism event assertions |
| G3.2 | strict validation | `pnpm validate` (no flag) | exit 0; 10 reports with `summary.fail=0`; `resolutionDeg ≤0.5` (if capped, ≤2 with the cap noted in the report) |
| G3.3 | per-scheme | read reports | all 5 dual-scheme machines: every scheme independently fully green (per-scheme report sections exist) |
| G3.4 | ratio coverage | aggregate reports | expectedRatios total ≥8, all passing, every sourceRef resolvable |
| G3.5 | per-machine hand check (10×5 items) | browser | each machine: route loads <3 s; dragging the primary drive animates the full chain; 3 parts clicked show all four panel elements (quote/dimensions/badge/controversy); explode → step-assemble → reset works; `spotlight-play` completes ≤10 s with the done badge |
| G3.6 | CI turns strict | read ci.yml + CI run | `VALIDATE_FLAGS: ""` committed; that commit's CI fully green |
| G3.7 | five poison needles | `pnpm poison` + manual chariot 47-tooth | tooth/limit/transient-collision/provenance needles + the fifth all caught (outputs excerpted into SUBMISSION_NOTES) |
| G3.8 | fan-out ledger | CSV result table | all 10 rows status DONE (after reruns); every DONE_WITH_CONCERNS concern addressed item-by-item |

#### GATE-4 (interaction completeness)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G4.1 | full e2e | `pnpm e2e` | ≥10 tests all green: smoke / U2 ratio / U2 real-pointer / U4 panel / U3 switch / U3+ compare / U1 explode / U6 spotlight / gallery attribution / U5 mock |
| G4.2 | full assembly loop | hand-check gimbal + odometer | out-of-order assembly flashes red hint; correct completion restores transmission + completion effect |
| G4.3 | compare performance | devtools | chariot compare mode ≥40 fps; astroclock compare ≥25 fps (half-resolution notice visible) |
| G4.4 | four-layer gallery | hand-check 3 machines | render/classical/museum/link-out tabs all present; offline simulation shows the link-out fallback copy |
| G4.5 | i18n zero gaps | scan script + spot checks | missing keys = 0; EN mode spot-check on 3 machines shows no stray Chinese UI strings |
| G4.6 | docent boundaries | curl four needles | >8 KB body → 400; `role:"system"` → 400; unknown source id renders as plain text, not a chip; production build with a simulated 500 shows "Docent unavailable" |

#### GATE-5 (flagship narratives)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G5.1 | step scale | read the three story.ts | astroclock ≥8 steps, chariot ≥6, seismoscope ≥6; every step has camera + bilingual body |
| G5.2 | scroll performance | devtools sampling | all three pages average ≥45 fps; wheel and trackpad both drive it |
| G5.3 | quote interactivity | hand check | ≥3 quote taps per page open the source panel |
| G5.4 | ingenuity woven in | read story.ts | each flagship story contains an "ingenuity chapter" reusing the spotlight choreography |

#### GATE-6 (adversarial validation & polish)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G6.1 | the five-command chain | `pnpm test && pnpm validate && pnpm poison && pnpm e2e && pnpm build` | all five exit 0; outputs excerpted into SUBMISSION_NOTES |
| G6.2 | independent audit | `pnpm audit` + read each | across the 10 verdicts, **unresolved load-bearing conflicts = 0** (each fixed or closed via snapshot-driven card revision) |
| G6.3 | performance budget | build output + reports | first-route chunk gz <500 KB (record actual); every machine <150k triangles; preview LCP <3 s |
| G6.4 | renders | `ls public/assets/renders` | 40 images (10×4 angles) committed, each ≤300 KB |
| G6.5 | critic zeroed | completeness-critic report | every item on the critic's list fixed or ledger-logged with an exemption reason; 0 dangling |

#### GATE-7 (deployment & submission)

| # | Check | Method | Pass standard (concrete) |
|---|------|------|------|
| G7.1 | public smoke | open each machine | 10 machines, 0 console errors, gallery populated, spotlight plays |
| G7.2 | clean clone | fresh directory clone → `pnpm install && pnpm build` | succeeds first try; duration recorded; gallery has no dead links |
| G7.3 | README | against checklist | 8 sections present (one-liner / Run locally / Pipeline / Verification philosophy / Codex story / Related work / Licensing / Ten-machine table); every Codex claim carries an artifact link |
| G7.4 | docent in production | live test with key | answers carry chips; 12 rapid requests → 429 from the 11th; keyless deploy hides the entry |
| G7.5 | video | watch it | <3:00; a frame shows the Codex UI and "GPT-5.6" on screen; the ingenuity rapid-cut montage is in the cut |
| G7.6 | submission | Devpost | category/video/repo/Session ID all four present; submitted before 12:00 PDT 07-21 and render-checked |

---

### Phase 0 — Scaffold & Contracts (root solo, W0)

#### P0-T1 Initialize the workspace

**Files**: `package.json` `vite.config.ts` `tsconfig.json` `index.html` `src/main.tsx` `.gitignore` `AGENTS.md`

**Steps**:

1. `pnpm create vite@latest . --template react-ts` (merge on non-empty prompt).
2. Install dependencies (latest compatible versions of the day, locked):

```bash
pnpm add three @react-three/fiber @react-three/drei three-mesh-bvh zustand i18next react-i18next
pnpm add -D typescript tsx vitest @vitest/ui playwright @playwright/test @types/three eslint prettier
pnpm exec playwright install chromium
```

3. `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "validate": "tsx scripts/validate.mts",
    "poison": "tsx scripts/poison-test.mts",
    "e2e": "VITE_E2E=1 vite build && playwright test",
    "snapshot-sources": "tsx scripts/snapshot-sources.mts",
    "fetch-images": "node scripts/fetch-images.mjs",
    "extract": "node scripts/extract-parts.mjs",
    "audit": "node scripts/audit-llm.mjs"
  }
}
```

4. Write §5.6's `AGENTS.md`. Set `vite.config.ts` to `base: './'` (static-host friendly) + `build.target: 'es2022'`.
5. Create the full §3.3 directory skeleton (empty dirs get `.gitkeep`).

**Acceptance**: `pnpm dev` serves the Vite default page; `pnpm build` passes; commit `chore: scaffold vite+r3f workspace`.

#### P0-T2 Type contracts (the common language of all workers — precedes any parallelism)

**Files**: `src/sim/types.ts` (frozen from P1 on; changes require root approval)

```ts
// src/sim/types.ts — project-wide data contracts (FROZEN file)
export type ProvenanceKind = 'wenxian' | 'wenwu' | 'tuice';
export interface Provenance {
  kind: ProvenanceKind;
  /** points to a data-JSON sources[].id, or a short quotation */
  ref: string;
  note?: string;
}
export interface Quantity {          // a sourced quantity
  value: number;                     // meters / radians / dimensionless
  unit: 'm' | 'rad' | 'ratio' | 'count';
  ancient?: string;                  // the ancient original, e.g. 「徑四尺八寸」
  provenance: Provenance;
}

export type GeometryDef =
  | { type: 'gear'; module: number; teeth: number; thickness: number;
      toothStyle: 'involute' | 'trapezoid' | 'pin'; pressureAngleDeg?: number;
      innerRadius?: number }                       // gears (incl. ancient wooden pin teeth)
  | { type: 'shaft'; radius: number; length: number }
  | { type: 'beam'; size: [number, number, number] }
  | { type: 'wheel'; radius: number; width: number; spokes?: number }
  | { type: 'scoop'; size: [number, number, number] }     // water scoops / pallets
  | { type: 'shell'; radius: number; cutaway?: boolean }  // seismoscope vessel / censer sphere
  | { type: 'ring'; radius: number; tube: number }        // gimbal rings
  | { type: 'link'; length: number; width: number }       // connecting rods / rockers
  | { type: 'box'; size: [number, number, number] }
  | { type: 'custom'; builder: string; params: Record<string, number> }; // resolved via the module's builder registry

export interface PartDef {
  id: string;
  name: { zh: string; en: string };
  geometry: GeometryDef;
  material: 'wood' | 'bronze' | 'iron' | 'silver' | 'silk' | 'clay';
  /** rest pose relative to parent */
  position: [number, number, number];
  rotationEuler?: [number, number, number];
  parent?: string;                    // scene-graph parent id
  /** motion DOF: rotation about, or translation along, axis */
  joint?: { kind: 'revolute' | 'prismatic' | 'fixed';
            axis: [number, number, number];
            limits?: [number, number] };   // rad or m; absent = unlimited
  provenance: Provenance;             // part-level provenance (form/existence basis)
  /** Field-level provenance for geometry numerics: key = geometry field path
   *  ("teeth", "module", "size.0", ...). The validator walks EVERY numeric
   *  geometry field and requires a hit in this map; a single "@rest" wildcard
   *  may catch the remainder BUT its kind must be 'tuice' — values without an
   *  explicit citation can only be declared conjecture; wenxian/wenwu claims
   *  must be mapped field-by-field. This closes the "sourced part, fabricated
   *  numbers" hole. */
  dimensionProvenance: Record<string, Provenance>;
  dimensionNotes?: Quantity[];        // key dimensions for the panel (display only, not the validation basis)
  explodeVector?: [number, number, number]; // explode direction; default = auto radial
  assemblyStep?: number;              // assembly order (small = first)
  schemeTags?: string[];              // set when a part belongs to a specific scholar's scheme
  interactive?: boolean;              // user-draggable drive part
}

export type ConstraintDef =
  | { type: 'mesh'; a: string; b: string; internal?: boolean }
      // ωb = -(za/zb)·ωa (internal → positive). Tooth counts are NOT stored here:
      // solver and validator derive them from both parts' geometry.teeth; a non-gear
      // endpoint is a graph-construction error — single source of truth, killing the
      // "renders 45 teeth, moves as 54" dual-copy drift
  | { type: 'belt'; a: string; b: string; crossed?: boolean }
      // ωb = ±(ra/rb)·ωa; radii likewise derived from geometry (gear pitch radius / wheel radius)
  | { type: 'crank'; wheel: string; rod: string; slider: string;
      crankRadius: number; rodLength: number;
      axis: [number, number, number]; provenance: Provenance }
      // rotary→reciprocating; s(θ) = (L + r) − (r·cosθ + √(L² − r²·sin²θ)), s∈[0, 2r], s(0)=0
      // constraints carrying numeric parameters must carry their own provenance (validator-enforced)
  | { type: 'cam'; cam: string; follower: string;
      profile: 'lift' | 'heddle'; liftHeight: number; dwellRatio?: number;
      provenance: Provenance }
  | { type: 'differential'; carrier: string; sunA: string; sunB: string;
      ratio: number; provenance: Provenance }                // ωc = (ωa+ωb)/2·ratio
  | { type: 'gimbal'; outer: string; middle: string; inner: string }
  | { type: 'lockstep'; a: string; b: string; ratio: number;
      provenance?: Provenance }                              // coaxial/rigid; provenance required when ratio≠1
  ;

export interface EscapementDef {       // L2: escapement state machine (astroclock only)
  wheel: string;                       // the shulun (scooped driving wheel)
  scoops: number;                      // 36
  fillSecondsPerScoop: number;         // water-fill rate (tunable)
  stepRad: number;                     // release step = 2π/36
  leverParts: { tianguan: string; gecha: string; guanshe: string;
                tiansuoL: string; tiansuoR: string };
}

export interface SchemePatch {
  id: string;                          // e.g. 'wangzhenduo' | 'fengrui'
  scholar: { zh: string; en: string }; year: number;
  summary: { zh: string; en: string };
  addParts?: PartDef[];
  removePartIds?: string[];
  overrideParts?: Array<Partial<PartDef> & { id: string }>;
  addConstraints?: ConstraintDef[];
  removeConstraintIndexes?: number[];
  notes?: { zh: string; en: string };  // controversy/evidence notes
}

export interface MachineSpec {
  slug: string;
  parts: PartDef[];
  constraints: ConstraintDef[];
  escapement?: EscapementDef;
  driveNodes: string[];                // user-draggable drive part ids (≥1)
  primaryDrive: string;                // primary drive for validation sweeps
  cycleRad: number;                    // one full motion cycle (primary-drive angle)
  expectedRatios?: Array<{ from: string; to: string; ratio: number;
                           sourceRef: string }>;  // ratio assertions from the classical texts
  collisionWhitelist?: Array<[string, string]>;   // meshing pairs allowed to touch
}

export interface SolveResult { angles: Record<string, number>;  // per-part current angle/displacement
                               events: Array<{ t: number; type: string; part: string }>; }

/** The ten machine slugs — the completeness baseline for strict validation
 *  (validate.mts/poison depend on it; any one missing = fail) */
export const MACHINE_SLUGS = ['astroclock','seismoscope','chariot','odometer','wooden-ox',
                              'loom','typecase','chainpump','bellows','gimbal'] as const;
export type MachineSlug = typeof MACHINE_SLUGS[number];

/** The solver's public capability — P1-T2's KinematicGraph must `implements` this;
 *  declared inside the frozen contract so MechanismScript/UI can type against it at P0 */
export interface IKinematicGraph {
  drive(nodeId: string, deltaRad: number): SolveResult;
  /** Absolute-coordinate write. Multi-input mechanisms (both differential suns) may
   *  setInput independently; state is always absolute generalized coordinates →
   *  drive-order independence (unit-tested) */
  setInput(nodeId: string, absoluteRad: number): SolveResult;
  /** Free-attitude nodes (gimbal shell): quaternion input; ring angles solved analytically */
  setAttitude(nodeId: string, quat: [number, number, number, number]): SolveResult;
  ratioBetween(from: string, to: string): number | null;
  setScheme(patch?: SchemePatch): void;
  state(): Record<string, number>;
}

/** L2 mechanism state machine: discrete events (ball drop, drum strikes, printing steps…).
 *  Delivered via MachineModule.mechanism and rendered by the Viewer as trigger buttons —
 *  not an optional side channel */
export interface MechanismScript {
  triggers: Array<{ id: string; label: { zh: string; en: string };
                    /** user-triggered (e.g. "simulate an earthquake"); param optional (e.g. bearing 0–7) */
                    run: (graph: IKinematicGraph,
                          emit: (type: string, part: string) => void,
                          param?: number) => void }>;
}

/** Knowledge-base entry (moved forward into the frozen contract; src/data/schema.ts
 *  only re-exports + runtime-validates) */
export interface MachineData {
  slug: MachineSlug;
  names: { zh: string; en: string };
  era: { zh: string; en: string };
  inventors: Array<{ zh: string; en: string }>;
  oneLiner: { zh: string; en: string };
  principle: { zh: string; en: string };
  sources: Array<{ id: string; book: string; chapter?: string;
                   quote: string; translation?: { zh: string; en: string }; url: string }>;
  dimensions: Array<{ label: { zh: string; en: string };
                      ancient: string; meters: number | [number, number];
                      basis: string; sourceId: string; confidence: ProvenanceKind }>;
  schemes: Array<{ id: string; scholar: { zh: string; en: string }; year: number;
                   summary: { zh: string; en: string };
                   evidence: { zh: string; en: string };
                   critique?: { zh: string; en: string } }>;
  controversies: Array<{ topic: { zh: string; en: string };
                         detail: { zh: string; en: string }; sourceIds: string[] }>;
  museums: Array<{ name: { zh: string; en: string }; city: { zh: string; en: string };
                   exhibit: { zh: string; en: string }; url?: string;
                   isOriginalArtifact: boolean }>;
  images: Array<{ file?: string;            // local path (download tier); linkout entries must not carry file
                  hotlink?: string;
                  title: string; angle: string;
                  author?: string;          // ⚠ required when license is CC-BY/CC-BY-SA and file is set (validator-enforced)
                  license: 'CC0'|'PD'|'CC-BY'|'CC-BY-SA'|'linkout';
                  licenseUrl?: string;      // ⚠ ditto
                  attributionText?: string; // ⚠ ditto; backfilled from the Commons API extmetadata
                  sourceUrl: string }>;
  /** U6 Ingenuity Spotlight — why this machine is brilliant (content from the §7
   *  data card's "Ingenuity" row; bilingual, required) */
  ingenuity: { hook: { zh: string; en: string };   // the one-sentence reveal
               demo: { zh: string; en: string };   // what the one-tap demo shows (driven by mechanism trigger 'spotlight')
               echo: { zh: string; en: string } }; // the modern echo
}

/** The unified machine deliverable: default export of src/machines/<slug>/build.ts.
 *  Viewer, validator and e2e all use this as the single entry point */
export interface MachineModule {
  spec: MachineSpec;
  data: MachineData;
  /** Required for ALL 10 machines: at least the 'spotlight' ingenuity trigger (≤10 s,
   *  ends by emitting 'spotlight:done'); the 5 event machines
   *  (seismoscope/typecase/odometer/loom/astroclock) additionally carry their own triggers */
  mechanism?: MechanismScript;
  /** Scholars' scheme patches travel with the module — the ONLY loading channel
   *  for UI and validator; key = scheme id */
  schemes?: Record<string, SchemePatch>;
  defaultSchemeId?: string;            // default = first id in the machines.csv schemes column
  /** custom geometry builder registry (returns THREE.BufferGeometry; typed unknown
   *  to keep the sim layer three-free) */
  customBuilders?: Record<string, (params: Record<string, number>) => unknown>;
}
```

**Acceptance**: `pnpm exec tsc --noEmit` passes; commit `feat: freeze data contracts (types.ts)`.

#### P0-T3 CI workflow

**Files**: `.github/workflows/ci.yml`

```yaml
name: ci
on: [push, pull_request]
env:
  # "--partial" until wave-3 completes (machine dirs may be missing);
  # the LAST step of P3 acceptance flips this to "" (strict ten-machine manifest)
  # and commits — this is the only sanctioned relaxation switch
  VALIDATE_FLAGS: "--partial"
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm validate $VALIDATE_FLAGS
      - run: pnpm poison $VALIDATE_FLAGS
      - run: pnpm build
      - name: e2e (auto-enables once the first machine lands)
        if: ${{ hashFiles('src/machines/odometer/parts.json') != '' }}
        run: |
          pnpm exec playwright install --with-deps chromium
          pnpm e2e
      - uses: actions/upload-artifact@v4
        with: { name: validation-reports, path: reports/ }
```

**Acceptance**: local `pnpm test` (vitest passWithNoTests while empty) + `pnpm build` green; commit.

---

### Phase 1 — The Four Core Libraries (W1, 4 workers parallel + skeptics)

#### P1-T1 Parametric geometry library (worker: W1-core)

**Files**: `src/core/units.ts` `src/core/gears.ts` `src/core/primitives.ts` `src/core/materials.ts` `tests/core/gears.test.ts`

**Interfaces (Produces)**:
- `chi(era: 'song'|'han'|'hanmo'|'yuan', n: number): number` — ancient chi → meters
- `buildGearGeometry(def: Extract<GeometryDef,{type:'gear'}>): THREE.BufferGeometry`
- `buildPartGeometry(def: GeometryDef, registry?: CustomBuilderRegistry): THREE.BufferGeometry`
- `standardMaterial(kind: PartDef['material']): THREE.Material`

**Steps**:

1. `units.ts`:

```ts
export const CHI_M = { song: 0.312, han: 0.231, hanmo: 0.242, yuan: 0.315 } as const;
export const chi = (era: keyof typeof CHI_M, n: number) => CHI_M[era] * n;
```

2. `gears.ts` involute profile (core algorithm, full implementation; re-derive from the Hessmer approach, do not copy code):

```ts
import * as THREE from 'three';
/** Involute parametric: base radius rb, roll angle t → (rb(cos t + t sin t), rb(sin t − t cos t)) */
function involutePoint(rb: number, t: number): [number, number] {
  return [rb * (Math.cos(t) + t * Math.sin(t)), rb * (Math.sin(t) - t * Math.cos(t))];
}
export function buildGearGeometry(g: { module: number; teeth: number; thickness: number;
    toothStyle: 'involute'|'trapezoid'|'pin'; pressureAngleDeg?: number; innerRadius?: number }) {
  const m = g.module, z = g.teeth, alpha = (g.pressureAngleDeg ?? 20) * Math.PI / 180;
  const rPitch = m * z / 2, rBase = rPitch * Math.cos(alpha);
  const rAdd = rPitch + m;                       // addendum circle
  const rDed = Math.max(rPitch - 1.25 * m, rBase * 0.98, (g.innerRadius ?? 0) + m * 0.5); // dedendum, clamped against undercut self-intersection
  const shape = new THREE.Shape();
  const halfToothAngle = Math.PI / (2 * z) + (Math.tan(alpha) - alpha); // half tooth angle at base (involute unroll corrected)
  for (let i = 0; i < z; i++) {
    const c = (i * 2 * Math.PI) / z;
    if (g.toothStyle === 'involute') {
      const tMax = Math.sqrt(Math.max(rAdd * rAdd - rBase * rBase, 0)) / rBase;
      const N = 8;
      // left flank: root → tip
      for (let k = 0; k <= N; k++) {
        const t = (tMax * k) / N;
        const [x, y] = involutePoint(rBase, t);
        const a = Math.atan2(y, x), r = Math.hypot(x, y);
        const ang = c - halfToothAngle + a;
        const px = r * Math.cos(ang), py = r * Math.sin(ang);
        i === 0 && k === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
      }
      // tip arc + right flank (mirrored): tip → root
      for (let k = N; k >= 0; k--) {
        const t = (tMax * k) / N;
        const [x, y] = involutePoint(rBase, t);
        const a = Math.atan2(y, x), r = Math.hypot(x, y);
        const ang = c + halfToothAngle - a;
        shape.lineTo(r * Math.cos(ang), r * Math.sin(ang));
      }
      // root arc to next tooth
      const next = ((i + 1) * 2 * Math.PI) / z;
      shape.absarc(0, 0, rDed, c + halfToothAngle, next - halfToothAngle, false);
    } else if (g.toothStyle === 'trapezoid') {        // ancient trapezoidal wooden teeth
      const wRoot = 0.6 * (2 * Math.PI * rDed) / (2 * z), wTip = 0.55 * wRoot;
      const p = (ang: number, r: number): [number, number] => [r * Math.cos(ang), r * Math.sin(ang)];
      const [x1, y1] = p(c - wRoot / rDed, rDed);
      i === 0 ? shape.moveTo(x1, y1) : shape.lineTo(x1, y1);
      shape.lineTo(...p(c - wTip / rAdd, rAdd));
      shape.lineTo(...p(c + wTip / rAdd, rAdd));
      shape.lineTo(...p(c + wRoot / rDed, rDed));
      const next = ((i + 1) * 2 * Math.PI) / z;
      shape.absarc(0, 0, rDed, c + wRoot / rDed, next - wRoot / rDed, false);
    } else {                                          // 'pin' teeth: rim + cylindrical pins (pins assembled via primitives as instanced mesh)
      const next = ((i + 1) * 2 * Math.PI) / z;
      if (i === 0) shape.moveTo(rDed, 0);
      shape.absarc(0, 0, rDed, c, next, false);
    }
  }
  if (g.innerRadius && g.innerRadius > 0) {
    const hole = new THREE.Path(); hole.absarc(0, 0, g.innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: g.thickness, bevelEnabled: false, curveSegments: 4 });
  geo.center(); geo.rotateX(Math.PI / 2);   // default axis = Y
  return geo;
}
export const pitchRadius = (module: number, teeth: number) => module * teeth / 2;
```

3. `primitives.ts`: shaft (cylinder) / beam / wheel (spoked) / scoop (open box) / shell (sphere, `cutaway` half-section) / ring (torus) / link / box, all returning `BufferGeometry`; `buildPartGeometry` dispatches on `GeometryDef.type`, `custom` resolves via the registry. Pin-gear pins built as wheel + cylinders.
4. `materials.ts`: `MeshStandardMaterial` procedural presets (wood: brown, roughness 0.8; bronze: metalness 0.9 / roughness 0.35, verdigris tint; silver: white metal; silk: translucent double-sided; clay: earthen).
5. Tests:

```ts
// tests/core/gears.test.ts
import { describe, it, expect } from 'vitest';
import { buildGearGeometry, pitchRadius } from '../../src/core/gears';
describe('gear geometry', () => {
  it('vertex count scales with teeth and contains no NaN', () => {
    const g = buildGearGeometry({ module: 0.02, teeth: 48, thickness: 0.05, toothStyle: 'involute' });
    const pos = g.getAttribute('position');
    expect(pos.count).toBeGreaterThan(48 * 4);
    for (let i = 0; i < pos.count; i++) expect(Number.isFinite(pos.getX(i))).toBe(true);
  });
  it('bounding radius ≈ addendum circle', () => {
    const m = 0.02, z = 24;
    const g = buildGearGeometry({ module: m, teeth: z, thickness: 0.04, toothStyle: 'involute' });
    g.computeBoundingSphere();
    expect(g.boundingSphere!.radius).toBeGreaterThan(pitchRadius(m, z));
    expect(g.boundingSphere!.radius).toBeLessThan(pitchRadius(m, z) + 2.5 * m);
  });
  it('low tooth count (z=12) yields no self-intersection NaN', () => {
    const g = buildGearGeometry({ module: 0.03, teeth: 12, thickness: 0.05, toothStyle: 'involute' });
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
  });
});
```

**Acceptance (root)**: `pnpm test -- tests/core` green; `pnpm exec tsc --noEmit` green; commit `feat(core): parametric geometry library`.

#### P1-T2 Kinematic constraint-graph solver (worker: W1-sim)

**Files**: `src/sim/graph.ts` `src/sim/edges.ts` `src/sim/escapement.ts` `tests/sim/graph.test.ts`

**Interfaces (Produces)**:
- `class KinematicGraph implements IKinematicGraph { constructor(spec: MachineSpec); drive(nodeId: string, deltaRad: number): SolveResult; ratioBetween(from: string, to: string): number | null; setScheme(patch?: SchemePatch): void; state(): Record<string, number>; }`
- `class EscapementSim { constructor(def: EscapementDef); tick(dtSeconds: number): { advancedRad: number; phase: 'filling'|'release'|'locked' }; forceStep(direction: 1 | -1): number; /* user-driven stepping; reverse blocked by the celestial lock returns 0 and emits a blocked event */ }`

**Steps**:

1. `edges.ts` — layered semantics (see §3.1; **every node's state = an absolute generalized coordinate** — the root of order independence):
   - **Linear subgraph** (reversible, participates in BFS ratio propagation): `mesh`: `ωb = (internal ? +1 : -1) · (za/zb) · ωa`, with za/zb **derived from both endpoints' geometry.teeth** (non-gear endpoint → graph-construction error); `belt`: `ωb = (crossed ? -1 : +1) · (ra/rb) · ωa`, radii derived from geometry; `lockstep`: `ωb = ratio · ωa`.
   - **Function edges** (evaluated from the upstream absolute phase; excluded from ratio propagation): `crank`: slider `s(θ) = (L + r) − (r·cosθ + √(L² − r²·sin²θ))`, s∈[0, 2r], s(0)=0, s(π)=2r (analytic assertions in unit tests); reverse-dragging the slider inverts via ≤8 Newton iterations; **the dead-center neighborhood (|ds/dθ|<ε) clamps and emits a `deadcenter` event** — never branch-jumps. `cam('heddle')`: `lift = liftHeight · max(0, sin θ)³`; `cam('lift')`: `lift = liftHeight · (1−cos θ)/2`.
   - **Multi-input node** `differential`: the carrier is off the BFS — each solve computes `θc = ratio · (θa + θb)/2` from both suns' **absolute states**; `drive`/`setInput` on one sun leaves the other's state intact. Order independence has a dedicated unit test.
   - `gimbal`: shell attitude enters via `setAttitude(quat)`; the two ring angles are extracted analytically (yaw/pitch decomposition); the bowl's world-up stays constant; no numeric iteration.
2. `graph.ts` — build an undirected graph over the linear subgraph for BFS ratio propagation + **cycle check** (a node reached via two paths with inconsistent ratios, tolerance 1e-9 → throw `OverConstrainedError`, which the validator uses); function edges and multi-input nodes evaluate afterwards in topological order. `drive(node, delta)` = read absolute state + delta, then the same evaluation pipeline; `ratioBetween` returns the net ratio only within a linear-connected pair, `null` across function edges. `setScheme` applies the patch and rebuilds.
3. `escapement.ts` — state machine: `filling` (current scoop accumulating, t<fillSeconds) → `release` (scoop weight beats the gecha lever: wheel advances stepRad, tianguan/tiansuo animation events) → `locked` (next scoop seated). `tick(dt)` returns this frame's rotation and events; in drag mode `forceStep(±1)` supports manual stepping (reverse is blocked by the right celestial lock → returns 0 and emits `blocked`).
4. Unit tests (**golden data from the Song Shi "Records of Carriages and Robes"; do not alter the numbers**):

```ts
// tests/sim/graph.test.ts
import { describe, it, expect } from 'vitest';
import { KinematicGraph } from '../../src/sim/graph';
import type { MachineSpec } from '../../src/sim/types';

/** Lu Daolong's odometer train (Song Shi, ch. 149):
 *  road wheel — 18-t vertical wheel — 54-t lower wheel — (coaxial) 3-t whirlwind wheel
 *  — 100-t middle wheel — (coaxial) 10-t small wheel — 100-t upper wheel */

/** Tooth counts live ONLY in geometry — mesh edges derive them (single source of truth) */
const gear = (id: string, teeth: number) => ({
  id, name: { zh: id, en: id },
  geometry: { type: 'gear', module: 0.02, teeth, thickness: 0.04, toothStyle: 'trapezoid' },
  material: 'wood', position: [0, 0, 0],
  joint: { kind: 'revolute', axis: [0, 1, 0] },
  provenance: { kind: 'wenxian', ref: 'songshi-149' },
  dimensionProvenance: { teeth: { kind: 'wenxian', ref: 'songshi-149' },
                         '@rest': { kind: 'tuice', ref: 'unit-test placeholder values' } },
} as any);

const odometerSpec: Partial<MachineSpec> = {
  slug: 'odometer-test',
  // the road wheel is a gear stand-in (its tooth count feeds no mesh edge)
  parts: [gear('zulun', 60), gear('lilun', 18), gear('xiapinglun', 54), gear('xuanfenglun', 3),
          gear('zhongpinglun', 100), gear('xiaopinglun', 10), gear('shangpinglun', 100)],
  constraints: [
    { type: 'lockstep', a: 'zulun', b: 'lilun', ratio: 1 },            // vertical wheel fixed to the left road wheel
    { type: 'mesh', a: 'lilun', b: 'xiapinglun' },                     // 18:54 derived from geometry
    { type: 'lockstep', a: 'xiapinglun', b: 'xuanfenglun', ratio: 1 }, // same central shaft
    { type: 'mesh', a: 'xuanfenglun', b: 'zhongpinglun' },             // 3:100
    { type: 'lockstep', a: 'zhongpinglun', b: 'xiaopinglun', ratio: 1 },
    { type: 'mesh', a: 'xiaopinglun', b: 'shangpinglun' },             // 10:100
  ],
  driveNodes: ['zulun'], primaryDrive: 'zulun', cycleRad: Math.PI * 200,
};

describe('KinematicGraph — Song Shi golden data', () => {
  it('odometer: 100 road-wheel turns → middle wheel exactly 1 turn (one li → drum)', () => {
    const g = new KinematicGraph(odometerSpec as MachineSpec);
    const r = g.ratioBetween('zulun', 'zhongpinglun');
    expect(Math.abs(r!)).toBeCloseTo(1 / 100, 12);
    const r2 = g.ratioBetween('zulun', 'shangpinglun');
    expect(Math.abs(r2!)).toBeCloseTo(1 / 1000, 12);   // ten li → chime
  });
  it('reverse-dragging the upper wheel drives the road wheel 1000×', () => {
    const g = new KinematicGraph(odometerSpec as MachineSpec);
    const res = g.drive('shangpinglun', 0.001);
    expect(Math.abs(res.angles['zulun'])).toBeCloseTo(1, 6);
  });
  it('tooth total self-consistent (original text: "eight wheels, 285 teeth in all")', () => {
    const teeth = [18, 54, 3, 100, 10, 100];
    expect(teeth.reduce((a, b) => a + b, 0)).toBe(285);
  });
});

describe('South-Pointing Chariot (Yan Su 1027): 90° turn → figure counter-rotates 90°', () => {
  it('24-t sub-wheel half-turn = 12 teeth → 12-t small wheel one full turn → 48-t great wheel 1/4', () => {
    // in a 90° turn the wheel differential advances 12 teeth; 12/48 = 1/4 turn = 90° compensation
    expect((12 / 48) * 360).toBe(90);
  });
});

describe('Layered-semantics golden tests (the vertical slice gating fan-out)', () => {
  it('differential: drive-order independent (left-then-right = right-then-left)', () => {
    const mk = () => new KinematicGraph(diffSpec as MachineSpec);  // sunA/sunB/carrier + differential(ratio=1)
    const g1 = mk(); g1.setInput('sunA', 1.2); g1.setInput('sunB', 0.4);
    const g2 = mk(); g2.setInput('sunB', 0.4); g2.setInput('sunA', 1.2);
    expect(g1.state()['carrier']).toBeCloseTo(g2.state()['carrier'], 12);
    expect(g1.state()['carrier']).toBeCloseTo((1.2 + 0.4) / 2, 12);
  });
  it('crank analytics: s(0)=0, s(π)=2r, dead-center reverse-drag clamps without branch jumps', () => {
    const g = new KinematicGraph(crankSpec as MachineSpec);        // r=0.24, L=1.2
    expect(g.state()['slider']).toBeCloseTo(0, 12);                // θ=0
    g.setInput('wheel', Math.PI);
    expect(g.state()['slider']).toBeCloseTo(0.48, 9);              // 2r
    const res = g.drive('slider', +0.01);                          // reverse-drag at the dead point
    expect(res.events.some(e => e.type === 'deadcenter')).toBe(true);
    expect(g.state()['slider']).toBeLessThanOrEqual(0.48 + 1e-9);  // clamped
  });
  it('gimbal: bowl world-up deviation <0.5° across arbitrary shell attitudes', () => {
    const g = new KinematicGraph(gimbalSpec as MachineSpec);
    for (const q of randomQuats(50, 20260717)) {                   // seeded pseudo-random
      g.setAttitude('shell', q);
      expect(bowlUpDeviationDeg(g)).toBeLessThan(0.5);
    }
  });
});
```

**Acceptance (root)**: `pnpm test -- tests/sim` fully green — the two golden ratios plus the **four-family layered-semantics tests (differential order-independence / crank analytics & dead center / gimbal invariant / escapement) are the HARD precondition for the W3 ten-machine fan-out; no green, no fan-out**; commit `feat(sim): kinematic constraint graph + escapement`.

#### P1-T3 Validator (worker: W1-validate) — the deterministic half of the "independent agent check"

**Files**: `src/validate/{ratios,range,collision,provenance,report,sampling}.ts` `scripts/validate.mts` `scripts/poison-test.mts` `tests/validate/validate.test.ts`

**Interfaces (Produces)**: `runValidation(module: MachineModule, opts?): ValidationReport` (MachineModule is the single entry — spec/data/images all inspected); report JSON shape:

```ts
interface ValidationReport {
  slug: string; when: string;
  checks: Array<{ id: string;            // ratio:<from>-><to> | range:<part> | collision | provenance
                  status: 'pass'|'fail'|'warn';
                  expected?: number; actual?: number; message: string; sourceRef?: string }>;
  summary: { pass: number; fail: number; warn: number };
}
```

**Steps**:

1. `ratios.ts`: for each `spec.expectedRatios`, cross-examine with `KinematicGraph.ratioBetween`, tolerance 1e-9 (tooth-derived ratios are exact rationals).
2. `sampling.ts` (shared by range/collision): **adaptive step count** — `maxSpeedRatio = max(|ratioBetween(primaryDrive, n)|)` (function-edge nodes estimated by numeric differentiation of peak speed ratio), `steps = ceil(cycleRad · maxSpeedRatio / deg2rad(0.5))`, cap 200,000; when capped, densify down and write the **actually achieved resolution into `summary.resolutionDeg`** — the report language weakens accordingly to "no collision found at X° resolution"; claiming "collision-free over the full cycle" under undersampling is forbidden.
3. `range.ts`: drive `primaryDrive` through the full cycle at the sampled step count; check every `limits`-carrying joint stays in range (including function-edge slider/heddle displacements).
4. `collision.ts`: at the same samples, three-mesh-bvh `MeshBVH` + `intersectsGeometry` pairwise. Skip rule tightened: **only pairs directly joined by a `fixed` joint are skipped**; moving-joint (revolute/prismatic) neighbors are checked unless in `collisionWhitelist`. **Whitelisted meshing pairs** get two dedicated layers: (a) 2D involute interference — center distance `d` vs addendum radii (`d < ra1+ra2` for engagement) and `|d − (rp1+rp2)| < 0.15·module` (correct center distance), backlash > 0; (b) **single-tooth-pitch fine sweep** — that pair re-swept in 3D for one full revolution of the faster wheel at 0.25 tooth-pitch steps (tooth contact is periodic; one revolution covers the pair's full-cycle contact states). Report every failing angle + pair. three under Node is pure computation, no WebGL — safe.
5. `provenance.ts` (provenance & integrity, seven rule groups; absence = fail):
   - **Part level**: every part has provenance; `kind==='tuice'` must belong to a scheme or carry a note; expectedRatios must carry sourceRef; every data-JSON dimension has a sourceId resolvable in sources.
   - **Geometry field level** (closing the "fabricated numbers" hole): recursively walk every part's geometry, collect all numeric field paths (`teeth`, `module`, `size.0`…), require each to hit `dimensionProvenance`; **joint.limits must be mapped as `joint.limits.0/1` keys**; the `@rest` wildcard may catch the remainder but its kind must be `tuice`; `wenxian/wenwu` mappings must give a resolvable sourceId ref. (Poses position/rotation default to assembly-conjecture tuice without per-field mapping — a deliberate cost tradeoff, noted in the report.)
   - **Constraint level**: constraints carrying numeric parameters (crank/cam/differential, and lockstep with ratio≠1) must carry their own `provenance`; mesh/belt carry no numerics (derived from geometry) — a non-gear/wheel endpoint → fail.
   - **Mechanism level**: all 10 machines must have `module.mechanism` with a `spotlight` trigger (U6); slugs ∈ {seismoscope, typecase, odometer, loom, astroclock} additionally need their specific triggers non-empty (discrete events are these machines' acceptance surface — no silent absence). `data.ingenuity`'s three fields non-empty in both languages.
   - **Attribution level**: images[] entries with `license ∈ {CC-BY, CC-BY-SA}` and a non-empty `file` must have all of `author`/`licenseUrl`/`attributionText`; `license==='linkout'` entries must not carry `file`.
   - **Asset-existence level** (clean checkout shippable): every `images[].file` and homepage thumbnail path must exist in the repo; missing = fail.
   - **Snapshot level**: read `artifacts/source-snapshots/<slug>/` (P2-T3 outputs) — every source must have an `ok:true` snapshot record; missing or mismatch = fail (unadjudicated quote conflicts block that machine).
6. **Per-scheme validation**: for every patch in `module.schemes`, `setScheme` and re-run ALL the above checks (ratio/range/collision/provenance); report sectioned per scheme — each scheme of a dual-scheme machine must independently pass.
7. `scripts/validate.mts` (run via tsx, so dynamic TS imports just work): `MACHINE_SLUGS` is the **strict completeness manifest** — in default mode all ten must exist and pass; any missing/failed load = fail (prevents a green pipeline after a failed fan-out or an accidental deletion); the `--partial` flag (only before wave-3, CI and local dev) permits "missing = warn & skip". Dynamically import each `src/machines/<slug>/build.ts` default export `MachineModule`; write `reports/<slug>.validation.json` and `reports/summary.md` (including `resolutionDeg`); any fail → exit code 1.
8. `scripts/poison-test.mts` — **four poison needles**, any one uncaught = exit code 1:
   - ① tooth needle: in memory set odometer `xiapinglun` `geometry.teeth` 54→45 → expectedRatio must go red (single source of truth: changing geometry changes transmission);
   - ② limit needle: narrow one joint's limits into mid-stroke → range must go red;
   - ③ transient-collision needle: inject a pin part that interferes only within a ±2° window → collision must go red (proving adaptive sampling catches transients);
   - ④ provenance needle: delete one dimensionProvenance mapping → provenance must go red.
   Then assert the pristine data passes everything. Missing `odometer/parts.json`: default exit 1 (manifest incomplete); only under `--partial` print skip and exit 0.
9. Tests: build a 20-tooth/40-tooth two-gear mini-module (stub data), assert ratio check passes; corrupt expectedRatios → fail; two overlapping boxes → collision fail; add an unmapped numeric geometry field → provenance fail; set `@rest` to wenxian → fail; crank constraint missing provenance → fail; CC-BY-SA image with file but no attributionText → fail; images[].file pointing at a missing path → fail.

**Acceptance (root)**: `pnpm test -- tests/validate` green; `pnpm validate --partial` (no machines yet: 10 skip warnings) exit 0; **`pnpm validate` without the flag must exit 1 with "manifest incomplete"** (strict mode proves itself); commit `feat(validate): deterministic ratio/range/collision/provenance validator`.

#### P1-T4 UI shell (worker: W1-ui)

**Files**: `src/ui/App.tsx` `src/ui/routes.tsx` `src/ui/viewer/MachineViewer.tsx` `src/ui/viewer/DriveHandle.tsx` `src/ui/viewer/ExplodedControl.tsx` `src/ui/panels/PartInspector.tsx` `src/ui/panels/GalleryPanel.tsx` `src/ui/panels/SchemeSwitcher.tsx` `src/ui/i18n/{zh,en}.json` `src/ui/store.ts` `playwright.config.ts` `e2e/smoke.spec.ts`

**Interfaces (Consumes)**: P0-T2 types + P1-T1 `buildPartGeometry/standardMaterial` + P1-T2 `KinematicGraph`.
**Interfaces (Produces, for P3 machine workers to plug into)**:

- Route `/#/m/<slug>`: loads the default export **`MachineModule`** of `src/machines/<slug>/build.ts` (spec + data + optional mechanism; lazy `import()`, code-split).
- `MachineViewer` props: `{ module: MachineModule, schemeId?: string }`; responsibilities:
  - Build the scene graph from parts (group hierarchy = parent chain); per frame, read angles from `KinematicGraph.state()` into driven groups' rotation/translation;
  - `DriveHandle`: pointer dragging on `interactive` parts (tangential projection along the joint axis → `graph.drive(id, delta)`) + slow idle auto-rotation of the primary drive (pausable);
  - **"Mechanism demo" panel**: when `module.mechanism` exists, render a button per trigger (testid=`mech-trigger-<id>`); events display as a caption stream (testid=`event-captions`, consuming SolveResult.events);
  - **SpotlightCard "Ingenuity" card** (testid=`spotlight-play`): prominent placement rendering `data.ingenuity` (hook headline + echo footnote); the button fires the mechanism's `spotlight` trigger — a ≤10 s choreography of camera moves + part highlights + drive; on receiving `spotlight:done`, show the done badge ("Ingenuity demonstrated ✓");
  - `ExplodedControl`: slider 0→1 interpolating `position + t·explodeVector` (default radial), plus a step-assembly play button ordered by `assemblyStep` (U1);
  - Part click → zustand `selectedPartId` → `PartInspector` shows name / classical quote / dimensions (ancient + metric) / provenance badge / controversies (from the data JSON and part.dimensionNotes) (U4);
  - `SchemeSwitcher`: reads `module.schemes` / `module.defaultSchemeId` (SchemePatches travel with the module — no string-id side channels); switching calls `graph.setScheme(patch)` and rebuilds diff highlights (placeholder UI + interface this wave; logic completes in P4);
  - `GalleryPanel`: renders data JSON `images[]` thumbnails + license attribution + external links (placeholder this wave).
- Homepage: 10 machine cards (name / era / one-line principle / render thumbnail placeholder).
- Test hooks (e2e depends; gated by `import.meta.env.DEV || import.meta.env.VITE_E2E`): `window.__mech = { graph, spec, module }`, `window.__mechSelect(partId: string)` (programmatic select ≡ click), `window.__mechExplodeSpread(): number` (mean part displacement in the exploded state, meters).

**Steps**: stand up the components and styling (dark museum look: near-black ground, warm gold accent, serif CJK display type + sans body), i18n wired (all UI strings via keys), and prove the "drag → linkage → click → panel" loop on a built-in demo spec (two gears 20/40). **The e2e launch chain closes in this wave** (P6 only writes cases — no more infrastructure):

```ts
// playwright.config.ts — `pnpm e2e` already builds with VITE_E2E=1; this only starts preview
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'pnpm preview --port 4173 --strictPort',
               port: 4173, reuseExistingServer: !process.env.CI },
});
```

```ts
// e2e/smoke.spec.ts — CI's e2e gate has a runnable case from P1 onward
import { test, expect } from '@playwright/test';
test('homepage renders 10 machine cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('machine-card')).toHaveCount(10);
});
```

**Acceptance (root)**: `pnpm dev` hand check — homepage 10 cards; demo machine page: dragging the small gear turns the large gear opposite at half speed; part click opens the panel; explode slider works; `pnpm build` green; commit `feat(ui): viewer shell with drive/explode/inspector`.

#### P1-R Skeptic review (4 skeptics, two-stage, ≤2 rounds)

For each W1 worker's diff: first spec compliance against this section's task text (anything missing / extra / misread), then code quality (plus §5.3's three lenses). Root consolidates fixes, then `git tag wave-1`.

---

### Phase 2 — Data & Asset Pipelines (W2, 2 workers parallel)

#### P2-T1 Knowledge-base JSON ×10 (worker: W2-data)

**Files**: `src/data/machines/<slug>.json` ×10 + `src/data/schema.ts`

**Steps**:

1. `schema.ts`: the `MachineData` contract moved into `src/sim/types.ts` (frozen at P0-T2 — see field comments there). This file only re-exports and runtime-validates:

```ts
export type { MachineData } from '../sim/types';
import { MACHINE_SLUGS, type MachineData } from '../sim/types';

/** Runtime validation (reused by tests/data and validate.mts); throws on violation
 *  with the field path in the message */
export function assertMachineData(json: unknown): asserts json is MachineData { /* assert field-by-field per the rules below */ }
```

   `assertMachineData` rules (write them all, no omissions): slug ∈ MACHINE_SLUGS; all bilingual fields non-empty; sources ≥2 with unique ids and non-empty urls — *per-slug minimums below override this floor*; every dimension's sourceId resolves in sources; every image has sourceUrl + license, `license==='linkout'` entries carry no file, CC-BY/CC-BY-SA entries with a file have author/licenseUrl/attributionText all present.

2. Transcribe the 10 JSONs from the §7 data cards. **Quotes copied verbatim** (traditional characters included), zero numeric changes; translation fields in plain modern Chinese + English (write them yourself; standard: a middle-schooler can read them); each card's "Ingenuity" row transcribes into the three `ingenuity` fields (bilingual).
3. Each JSON's `images[]` starts from the §7 image tables (`sourceUrl` + license); leave `file`/`author`/`licenseUrl`/`attributionText` empty for the P2-T2 script to backfill from the Commons API — **hand-filling attribution fields is a violation** (prevents invented author names). Linkout entries never carry file.

**Acceptance (root)**: write `tests/data/data.test.ts` asserting — **cardinality per the per-slug table** (derived from what the §7 cards actually supply; a one-size "sources≥2 / images≥3" would force workers to choose between fabrication and failure):

| slug | sources ≥ | downloadable images ≥ | note |
|---|---|---|---|
| astroclock | 6 | 5 | — |
| seismoscope | 1 | 5 | only one primary classical source (Hou Han Shu) — honest |
| chariot | 4 | 4 | — |
| odometer | 2 | 0 | no museum photos exist; render fallback (stated in the card) |
| wooden-ox | 4 | 5 | — |
| loom | 3 | 1 | only one hi-res Commons photo of the artifact |
| typecase | 3 | 4 | — |
| chainpump | 3 | 4 | — |
| bellows | 3 | 2 | — |
| gimbal | 1 | 4 | only one primary classical source (Xijing Zaji) — honest |

Plus: every machine dimensions ≥3, museums ≥2, bilingual fields non-empty; chariot/odometer sources contain the tooth-count keyword 「出齒」. **New sources/images may only be added after P2-T3 snapshot verification (sources) or Commons API fetch (images) — copying or inventing entries to hit quotas is forbidden.** `pnpm test -- tests/data` green; a skeptic (philology lens) hand-checks 3 machines against §7 verbatim; commit `data: knowledge base for 10 machines`.

#### P2-T3 Source-text snapshots (worker: W2-pipeline, additional duty) — machine-checkable receipts for the quotes

**Files**: `scripts/snapshot-sources.mts` `artifacts/source-snapshots/<slug>/<source_id>.json`

**Steps**:
1. For every source of every data JSON: fetch the `url` (Wikisource etc.), extract body text, normalize whitespace and traditional/simplified/variant characters (mapping table maintained with the script), and verify `quote` is a substring.
2. Emit snapshot records `{ url, fetchedAt, contentSha256, quoteFound, matchedSpan?, note? }` — hash + matched span only, never the full text (size discipline).
3. `quoteFound:false` → snapshot-level validator fail, **blocking that machine** until root adjudicates: revise the data card to the snapshot text (allowed! log in `docs/OPEN_QUESTIONS.md`), or confirm a fetch problem (retry/alternate source). The data card is thereby no longer an uncorrectable oracle — the snapshot is the higher evidence tier.
4. If the network is unavailable, record `note:'offline'`; the validator downgrades to warn and the UI labels that machine "quotes not yet snapshot-verified" — honest degradation, not fake green.

**Acceptance (root)**: `pnpm snapshot-sources` runs; snapshot records complete for all 10; deliberately corrupt one character of a quote → snapshot mismatch → `pnpm validate` turns that machine red; restore → all green.

#### P2-T2 Image pipeline + GPT-5.6 build-time scripts (worker: W2-pipeline)

**Files**: `scripts/fetch-images.mjs` `scripts/extract-parts.mjs` `scripts/audit-llm.mjs` `public/assets/IMAGE_CREDITS.json` (generated)

**Steps**:

1. `fetch-images.mjs`: over all data JSONs' `images[]`, for entries with `license ∈ {CC0, PD, CC-BY, CC-BY-SA}`:
   - **Fetch attribution metadata first**: `https://commons.wikimedia.org/w/api.php?action=query&titles=File:<name>&prop=imageinfo&iiprop=url|extmetadata&format=json` → extract `Artist` (HTML-stripped), `LicenseShortName`, `LicenseUrl`, `Attribution` (when absent, compose `"<Artist>, <LicenseShortName>, via Wikimedia Commons"`); reconcile the API's LicenseShortName against the declared license — on mismatch, warn and trust the API;
   - Then download `https://commons.wikimedia.org/wiki/Special:FilePath/<name>?width=1600` (endpoint verified) → `public/assets/museum/<slug>/<n>.jpg`;
   - Backfill `file`/`author`/`licenseUrl`/`attributionText` into the data JSON; generate `IMAGE_CREDITS.json` (file/title/author/sourceUrl/license/licenseUrl/attributionText);
   - **CC-BY / CC-BY-SA entries whose attribution fetch fails: delete the downloaded file and downgrade the entry in place to `license:'linkout'` (hotlink = the file page URL), logging to `reports/image-fetch-failures.json`** — better an external link than an unattributed image (the validator would catch it anyway; see P1-T3 attribution rules);
   - `license === 'linkout'` entries skip download (museum-site copyright; external links only);
   - Download failures retry ×2, then log and continue (render-layer fallback exists).
   - **Polite fetching**: serial + 200 ms interval + UA `MechanicaBot/1.0 (educational)`.
2. `extract-parts.mjs` (GPT-5.6, build-time): per machine, feed the data JSON's `sources[].quote` into the prompt below via the OpenAI Responses API (model from `OPENAI_MODEL`, default `gpt-5.6`, `reasoning.effort: "high"`). *The prompt template stays in Chinese verbatim — it operates on Classical Chinese and its output language matters:*

```text
你是古代机械复原工程师。仅根据以下古籍原文（不得使用原文之外的数字），
抽取零件清单与传动约束，输出 JSON：{ parts: [{id,name_zh,role,dims_ancient[]}],
constraints: [{type,a,b,teeth_a?,teeth_b?,evidence_quote}], uncertainties: [...] }。
每个数字必须附 evidence_quote（原文片段）。没有依据的字段留 null 并写入 uncertainties。
原文：<quotes>
```

   (Note: `teeth_a/b` are **draft** fields preserving textual evidence; when finalizing parts.json, tooth counts move into part geometry — final ConstraintDef mesh/belt carry no numerics.) Raw prompt + response archived to `artifacts/extractions/<slug>.json`. **Drafts never land directly** — P3 builders use them as scaffolding with the data card as the yardstick (this is the honest artifact of the "classical text → parts list" story).
3. `audit-llm.mjs` (GPT-5.6 independent audit): input = classical quotes + final `parts.json` + `reports/<slug>.validation.json`; the prompt demands: "independently derive ratios and key dimensions from the text → cross-examine the implementation → output a verdict table (consistent / inconsistent / no textual basis); do not reverse-engineer the text from the implementation." Output to `artifacts/audits/<slug>.md`. Root runs it in P6 and handles inconsistencies.
4. Both scripts print a yellow warning and `exit 0` when `OPENAI_API_KEY` is absent.

**Acceptance (root)**: after `pnpm fetch-images`, per-machine image counts meet the **P2-T1 per-slug downloadable minimums** (odometer 0 → render fallback, loom 1 — both honest supply levels) + `IMAGE_CREDITS.json` fields complete; **optimized outputs committed via git add** (§2 asset closed loop); `pnpm extract` (when keyed) archives 10 extractions; commit `feat(pipeline): image fetcher + GPT-5.6 extraction/audit scripts`.

---

### Phase 3 — Ten Machines in Parallel (W3, spawn_agents_on_csv)

#### P3-T0 Fan-out preparation (root)

Write `machines.csv`:

```csv
slug,tier,schemes,notes
astroclock,S,"fixed-scoop|combridge-hinged",escapement state machine + five-tier chime
seismoscope,S,"wangzhenduo|fengrui",the dual schemes are the soul
chariot,S,"yansu-clutch|lanchester-diff",golden tooth-count data
odometer,A,"ludaolong",golden ratios 1/100 and 1/1000
wooden-ox,A,"wheelbarrow|walker",open reconstruction, dual schemes
loom,A,"sliding-frame|linkage",sliding-frame/linkage dual schemes
typecase,B,"",revolving case + movable-type process
chainpump,B,"",chain drive
bellows,B,"",crank & connecting rod
gimbal,B,"",gimbal suspension
```

Use `spawn_agents_on_csv`; the instruction template = §5.2 template + this task's generic text + the full §7 data card for `{slug}` + the full P0-T2 types.ts. `output_schema` requires `{slug, status, files_changed, drive_nodes, expected_ratios_implemented, concerns}`. **When the CSV run returns, inspect status/last_error columns**: re-run failed rows once; root personally builds what still fails, logging it in the ledger.

#### P3-T1 Machine-builder task (one worker per machine, common spec)

**Files (per machine)**: `src/machines/<slug>/parts.json` `src/machines/<slug>/schemes/<id>.json` (per CSV schemes column) `src/machines/<slug>/build.ts` `tests/machines/<slug>.test.ts`

**Every machine must deliver**:

1. **parts.json**: parts per the data card (tooth counts/dimensions/material/joint/assembly order/explode vector/provenance). Part-count guidance: S tier 25–60 (astroclock cap 80), A tier 15–30, B tier 8–20. **Any dimension without textual basis: `provenance.kind:'tuice'` with a note** (e.g. frame-beam cross-sections). **Every numeric geometry field must be covered by `dimensionProvenance`**: data-card numbers mapped explicitly field-by-field (wenxian/wenwu + sourceId), the rest under `@rest` (tuice only) — the validator walks every field; one miss = red.
2. **constraints**: build the transmission per the data card; write the classical ratios into `expectedRatios` (with sourceRef).
3. **build.ts**: default-export a **`MachineModule`** (spec + data + mechanism) — assemble MachineSpec (driveNodes/primaryDrive/cycleRad/collisionWhitelist) + import the data JSON; **mechanism is required for all 10**: implement at least the `spotlight` trigger — a ≤10 s choreography per the data card's "Ingenuity" row (drive sequence + `highlight`/`camera` events + closing `spotlight:done`); **the 5 event machines (seismoscope ball drop, typecase five-step process, odometer drum/chime, loom weft insertion, astroclock escapement captions) additionally implement their specific triggers** (validator mechanism-level rules enforce this); register `custom` geometry builders here (e.g. dragon heads, openwork censer shell as shell+ring composites — ornament fidelity not required).
4. **schemes/*.json**: SchemePatches (differing parts/constraints/notes). **build.ts imports all patches into `module.schemes` (Record) and sets `defaultSchemeId` = the first id in the CSV schemes column** — UI/validator only trust the module channel; the validator re-runs the full check suite per scheme; every scheme of a dual-scheme machine must independently pass.
5. **Tests**: each machine asserts at least ① all `expectedRatios` match `KinematicGraph.ratioBetween`; ② all parts carry provenance and every numeric geometry field is covered by dimensionProvenance; ③ the spec constructs under `new KinematicGraph()` without OverConstrained; ④ **machines with a mechanism: call every trigger `mechanism.triggers[i].run(graph, emit, param)` and assert the expected event sequence** (e.g. seismoscope param=3 → only `dragon-3` emits `releaseBall`, the other seven emit nothing).
6. **Static evidence**: at completion each worker lists, for every expectedRatio, the derivation chain "original sentence → tooth counts → ratio".

**Per-machine specifics** (attach the matching line to each worker prompt):

- `astroclock`: implement EscapementDef (36 scoops, stepRad=2π/36); transmission = shulun scoop wheel → celestial column (lockstep) → hour/drum wheel & day-night wheels (lockstep ratio **36/100**: each scoop-step advances 6 of 600 teeth — see the card's expectedRatios) → celestial globe (belt "celestial ladder" chain, 1:1); five chime tiers with 2–3 jack figures each (cam-triggered placard events; not 162 figures); a `cutaway` half-section of the tower shell is mandatory. Drag mode: dragging the scoop wheel steps forward one cell at a time; reverse is blocked by the right celestial lock (`blocked` event → UI shake hint).
- `seismoscope`: body = vessel (shell cutaway) + 8 dragons + 8 toads; `wangzhenduo` patch = central standing column (inverted pendulum, revolute + limits) + eight chutes; `fengrui` patch = suspended pendulum + eight surrounding tracks; **both schemes' central column part id must be `duzhu`, and the mechanism trigger id fixed as `quake` (both e2e dependencies)**; `MechanismScript`: trigger `quake` injects a simulated pulse (param = bearing 0–7) → the matching dragon's `releaseBall` → the other seven stay motionless (asserted in tests).
- `chariot`: default scheme `yansu-clutch` strictly per the tooth counts 24/12/48; `lanchester-diff` uses the differential edge. **Core assertion**: rotating the chassis in place by θ leaves the figure's world heading unchanged (`|world yaw| < 1e-6`). driveNodes include both road wheels (drag separately to simulate turning).
- `odometer`: the full 18/54/3/100/10/100 train + drum/chime cam events (middle wheel full turn → `drum`, upper wheel → `chime`); UI odometer readout in li. **Part ids must be `zulun/lilun/xiapinglun/xuanfenglun/zhongpinglun/xiaopinglun/shangpinglun` (unit tests and e2e depend on these names).**
- `wooden-ox`: `wheelbarrow` patch = central big wheel + twin shafts + cargo box (box dimensioned from the Gliding Horse table: 0.653×0.399×0.387 m ×2); `walker` patch = four-leg crank-linkage gait (per-leg phase π/2, simplified planar four-bar); both schemes share the box parts.
- `loom`: frame + warp beam + shed + 8 representative heddles + treadles; `sliding-frame`/`linkage` patches differ in the heddle-selection mechanism; cam(heddle) drives heddle lift, weaving progress = weft counter; threads as instanced thin cylinders ≤200.
- `typecase`: revolving table (Ø 2.2 m, lockstep hand-spun) + type in grid windows (instanced boxes ≥300) + the five-step process animation (pick type → set the forme → heat the resin → press flat → print) driven by MechanismScript events with a UI stepper.
- `chainpump`: sprockets + dragon-bone pallet chain (chain = belt constraint + pallets instanced along the path = two arcs + two straights) + crank pedals; drag the crank → pallets scrape water up (water as simple particles/blue planes).
- `bellows`: horizontal waterwheel (driveNode) → belt (cord drive, wheel radii 3 m : 0.6 m = 5:1 speed-up, tuice; radii live in the two wheels' geometry) → small drum + crank (crankRadius 0.24 m, rodLength 1.2 m, tuice) → rocker → bellows board prismatic (limits [0, 0.5 m]). **Stroke self-consistency: s(θ)=(L+r)−(r·cosθ+√(L²−r²sin²θ)), stroke 2r=0.48 m < the 0.5 m limit** (an earlier 0.3 m crank draft conflicted with the limit; corrected by the formula). Assertions: board travel ∈ limits, s(0)=0, s(π)=0.48.
- `gimbal`: outer shell (half-cut) + outer ring + inner ring + incense bowl under the gimbal constraint; interaction = drag the shell to any attitude, the bowl's world attitude stays constant (asserted in tests).

**Acceptance (root, per machine)**: `pnpm test -- tests/machines/<slug>` green → `pnpm validate --partial` that machine's report clean (collision sweep passes) → browser check U1/U2/U4 → commit `feat(machine): <slug>`. Reds return to the original worker (send_input, ≤2 rounds), then root fixes. When all ten land: **run strict `pnpm validate` (no flag) fully green; flip `.github/workflows/ci.yml` `VALIDATE_FLAGS` to `""` and commit (CI permanently strict from here)**; then `git tag wave-3`.

---

### Phase 4 — Interaction Completion (W4, 5 workers parallel)

#### P4-T1 Assembly system (worker: W4-assembly; ownership `src/ui/viewer/**`)

- Explode slider + "step assembly" playback (ordered by assemblyStep, each step highlighting the current part + its name in the panel);
- **Drag-to-reassemble mode** (U1's full form): in the exploded state, drag a part → snaps home within 15% of its radius; assembling out of dependency order (parent not yet seated) → red flash + hint; all seated → transmission resumes + completion effect;
- Mobile fallback: dragging becomes "tap part → tap target slot".

#### P4-T2 Scheme switching & side-by-side comparison visual (worker: W4-schemes; ownership `src/ui/panels/SchemeSwitcher.tsx`, `src/ui/compare/**` + the setScheme parts of `src/sim/graph.ts` — **NOT `src/ui/viewer/**`**; the MachineViewer wiring for compare mode is done serially by root after both W4 workers finish, avoiding ownership overlap with W4-assembly)

- **Switch mode** (U3 baseline): scheme dropdown (default + patches); on switch, differing parts ghost-fade (old translucent red, new translucent teal, solidify after 1 s);
- **Side-by-side compare mode** (U3 enhanced visual, testid=`compare-toggle`): `CompareView` dual viewports — two `<Canvas>` instances each hosting one scheme, top bars naming scholar/year:
  - **Camera link**: one side's OrbitControls pose writes a shared zustand camera state; the other follows live;
  - **Drive link**: dragging a drive part on either side broadcasts the same deltaRad to both `KinematicGraph`s (each mapped to its own driveNode) — behavioral divergence under identical excitation becomes directly visible (seismoscope: same quake pulse, standing column inert vs suspended pendulum drops the ball; chariot: do both schemes keep the figure pointing south?);
  - **Difference tinting & linked hover**: parts unique to one side get an accent tint; hovering a part highlights its same-id counterpart on the other side;
  - Performance: compare mode pauses idle auto-rotation; same-id parts share BufferGeometry (geometry cache); astroclock dual-view degrades to half resolution with a notice;
  - Test hook: `window.__mechCompare = { graphs: [left, right], drive(deltaRad) }`.
- **Comparison table**: scheme vs scheme (scholar/year/mechanism difference/evidence/main critique — from the data JSON schemes fields), shared by both modes;
- All 5 dual-scheme machines pass e2e: switching changes the `window.__mech.spec` part set correctly; compare mode drives both sides in sync (see P6-T3).

#### P4-T3 Gallery & attribution (worker: W4-gallery; ownership `src/ui/panels/GalleryPanel.tsx`)

- Four-layer gallery tabs: **Reconstruction renders** (project screenshots, generated in P6) / **Classical plates** (PD woodcuts) / **Museum photos** (downloaded CC images; captions auto-render "author · license · via Wikimedia Commons" with links) / **Collection links** (linkout cards: museum name + text link, dead-link fallback);
- Lightbox view; CC-BY-SA attribution obligations fully honored in captions.

#### P4-T4 i18n & copy completion (worker: W4-i18n; ownership `src/ui/i18n/**` + translation gaps in the data JSONs)

- Every UI string bilingual; English polish for each machine's principle/oneLiner/controversies; language toggle; default from browser language.

#### P4-T5 AI Docent (worker: W4-docent; ownership `api/**`, `src/ui/docent/**`, `src/ui/panels/DocentChat.tsx`)

**Goal**: the "AI Docent" in the corner of each machine page — grounded Q&A over the **current machine's knowledge base** (U5). The only runtime LLM surface; progressive enhancement; fully optional.

**Files**: `api/docent.ts` (Vercel Edge Function) `src/ui/docent/buildPrompt.ts` `src/ui/docent/mock.ts` `src/ui/panels/DocentChat.tsx`

**Interface**: `POST /api/docent`, body `{ slug, partId?, schemeId?, lang, messages }` → SSE streaming text. **All boundaries enforced server-side (client conventions are UX, not security)**: slug ∈ MACHINE_SLUGS, lang ∈ {zh,en}, partId/schemeId must exist on that machine, role ∈ {user,assistant}, messages ≤6, ≤500 chars each, body ≤8 KB, estimated input tokens ≤6000 — any violation → 400; the system prompt is assembled server-side only, never client-injectable. No `OPENAI_API_KEY` → 503 `{disabled:true}`; rate/budget limits → 429/503.

**Steps**:

1. `buildPrompt.ts` — system prompt template (use verbatim; polish allowed, loosening constraints is not). *Kept in Chinese verbatim — it grounds bilingual answers over Chinese-source corpora; answers follow the `lang` field:*

```text
你是数字博物馆「古械重生 Mechanica」的馆员。仅依据下方【馆藏资料】回答观众问题：
- 每个事实性断言后必须附来源标记，格式 [来源:<source_id>]；
- 资料未覆盖的问题，直说「馆藏资料未涉及」，可指引观众查看相关机械页，禁止臆测补充；
- 涉及数字（尺寸/齿数/年代）必须逐字取自资料，禁止推算生成新数字；
- 存在学术争议时并列诸家方案与各自依据，不替观众下唯一结论；
- 回答默认 ≤200 字，观众追问再展开；语言跟随 lang 字段。
【馆藏资料】= 当前机械完整 MachineData JSON + 当前选中零件 partId + 当前方案 schemeId
            + 十台机械 oneLiner 索引（供跨馆指引）。
```

2. `api/docent.ts`: read `OPENAI_API_KEY` / `OPENAI_MODEL` (default `gpt-5.6`); validate strictly per the interface schema first (violations → 400), then assemble system+messages and stream via the Responses API; `max_output_tokens: 600`, 30 s timeout, abort upstream when the client disconnects. **Two rate-limit layers**: ① per-IP 10 req/min (Edge in-memory Map — approximate across instances/cold starts; say so in a comment); ② **global daily budget breaker**: atomic increment in Upstash Redis / Vercel KV, over `DOCENT_DAILY_BUDGET` (default 500) → 503. **With no shared store configured, public deployments disable the docent by default (503)** unless `DOCENT_ACCEPT_APPROX_LIMITS=1` is set explicitly (demo deployments accept approximate limiting at their own risk). No server-side session storage; no message-body logging.
3. `DocentChat.tsx`: floating button → drawer chat (testids `docent-input` / `docent-send` / `docent-citation`); first open probes `/api/docent`, 503 → the whole entry hides; **citation validation**: when parsing `[来源:xxx]`, the id must ∈ the current machine's `data.sources` — only then render a clickable chip (jumping to the PartInspector source); unknown ids render as plain text with a console.warn (hallucinated citations must not masquerade as legitimate chips); 3 suggested questions auto-generated per machine from controversies/schemes (e.g. "How do the two reconstructions differ?"); streaming render + one retry.
4. `mock.ts`: **exists only in `import.meta.env.VITE_E2E || DEV` builds; production bundles contain no mock**. In production, any probe/request failure → an explicit "Docent unavailable" error state (**fail-closed** — never substitute mock output for real answers or mask outages). The mock returns a fixed grounded reply (with a `[来源:houfeng-196]` chip) for any input, keeping e2e stable and keyless dev usable.

**Acceptance (root)**: `pnpm dev` (mock mode) Q&A yields chips; `vercel dev` + real key, ask "How do the two seismoscope reconstructions differ?" → answer names Wang Zhenduo / Feng Rui with a chip on every claim and no out-of-corpus numbers; 12 rapid questions → 429 from the 11th; remove the key and restart → entry gone, console clean. **Boundary needles**: >8 KB body → 400; messages with `role:"system"` → 400; a mock variant returning an unknown source id renders as plain text, not a chip; production build with a simulated 500 shows "Docent unavailable", never mock content.

**Acceptance (root, whole wave)**: full `pnpm test && pnpm validate && pnpm build`; hand-check U1–U4/U6 + compare-mode dual-side linkage + docent mock chips; `git tag wave-4`.

---

### Phase 5 — Flagship Scrollytelling ×3 (W5, 3 workers parallel; ownership `src/machines/<slug>/story.ts` + `src/ui/story/**` scaffolded by the first worker)

`ScrollStory` mechanism: `story.ts` exports a step array

```ts
export interface StoryStep {
  id: string;
  title: { zh: string; en: string };
  body: { zh: string; en: string };        // ≤120 chars/step; give sourceId when quoting
  camera: { position: [number,number,number]; target: [number,number,number] };
  explode?: number;            // 0–1
  driveTo?: { node: string; rad: number; seconds: number };
  highlight?: string[];        // part ids
  schemeId?: string;           // switch scheme at this step
}
```

Scroll progress (drei ScrollControls or IntersectionObserver) interpolates between steps. **Each of the three stories must contain an "ingenuity chapter"** — reusing that machine's `spotlight` trigger choreography (GATE-5.4) — pinning "why it's brilliant" into the narrative climax. The three scripts:

- `astroclock` (8–10 steps): exterior → half-section → water circuit (reservoir → constant-level tank → scoops) → escapement close-up (scoop fills → gecha lever drops → tianguan opens → wheel advances one cell, slow motion + caption events) → celestial-column transmission → celestial globe sync → chime jacks → "this is the ancestor of every mechanical clock" (citing Needham's verdict).
- `chariot` (6–8 steps): the legend and Ma Jun's story → full chariot → chassis gear close-up → straight travel (gears disengaged) → 90° right turn (sub-wheel advances 12 teeth → great wheel counter-rotates 1/4, floating numeric annotations) → the figure holds south → cut to the Lanchester differential comparison.
- `seismoscope` (6–8 steps): the 196-character original text fading in passage by passage → vessel half-section → Wang Zhenduo's standing-column demo → its fatal flaw (sensitivity) → Feng Rui's suspended pendulum → simulated Longxi quake pulse → the west dragon drops its ball → 「驗之以事，合契若神」.

**Acceptance (root)**: three pages scroll smoothly (wheel + touch), bilingual step copy, quotes link to sources; `git tag wave-5`.

---

### Phase 6 — Adversarial Validation & Polish (W6: root + 2 skeptics + 1 completeness critic)

#### P6-T1 Poison self-test (root)

`pnpm poison`: all four needles (tooth / limit / transient-collision / provenance, see P1-T3) print "caught by the validator ✓". Then the manual fifth needle: temporarily set chariot's 48-tooth wheel to 47 → `pnpm validate` must go red → restore. All five results excerpted into `docs/SUBMISSION_NOTES.md` (the demo-able proof that the validator actually works).

#### P6-T2 GPT-5.6 independent audit (root)

Run `pnpm audit` per machine. Verdict tiers: **load-bearing inconsistencies (numbers/quotes/ratios) BLOCK that machine's release** — fix the implementation, or revise the data card through the P2-T3 snapshot process (the snapshot text is the highest evidence); only phrasing-level disagreements may be logged in `docs/OPEN_QUESTIONS.md` and kept. The audit is no longer a "log and continue" rubber stamp. All 10 `artifacts/audits/*.md` committed.

#### P6-T3 e2e suite (root writes and runs)

```ts
// e2e/core-journeys.spec.ts — the critical user journeys (Playwright)
import { test, expect } from '@playwright/test';
const APP = 'http://localhost:4173';    // vite preview

test('U2: dragging a gear animates the whole chain (odometer 1/100)', async ({ page }) => {
  await page.goto(`${APP}/#/m/odometer`);
  await page.waitForFunction(() => (window as any).__mech?.graph);
  const r = await page.evaluate(() =>
    (window as any).__mech.graph.ratioBetween('zulun', 'zhongpinglun'));
  expect(Math.abs(r)).toBeCloseTo(0.01, 10);
  const before = await page.evaluate(() => (window as any).__mech.graph.state()['zhongpinglun'] ?? 0);
  await page.evaluate(() => (window as any).__mech.graph.drive('zulun', Math.PI * 2));
  const after = await page.evaluate(() => (window as any).__mech.graph.state()['zhongpinglun']);
  expect(Math.abs(after - before)).toBeCloseTo((Math.PI * 2) / 100, 8);
});

test('U4: clicking a part opens the source panel', async ({ page }) => {
  await page.goto(`${APP}/#/m/seismoscope`);
  await page.waitForFunction(() => (window as any).__mech?.spec);
  await page.evaluate(() => (window as any).__mechSelect('duzhu'));  // UI-exposed selection hook
  await expect(page.getByTestId('part-inspector')).toContainText('都柱');
  await expect(page.getByTestId('source-quote')).toContainText('中有都柱');
});

test('U3: scheme switch changes the part set', async ({ page }) => {
  await page.goto(`${APP}/#/m/seismoscope`);
  await page.waitForFunction(() => (window as any).__mech?.spec);
  const a = await page.evaluate(() => (window as any).__mech.spec.parts.length);
  await page.getByTestId('scheme-select').selectOption('fengrui');
  await page.waitForTimeout(1200);
  const b = await page.evaluate(() => (window as any).__mech.spec.parts.length);
  expect(a).not.toBe(b);
});

test('U1: explode and assembly', async ({ page }) => {
  await page.goto(`${APP}/#/m/gimbal`);
  await page.getByTestId('explode-slider').fill('1');
  const spread = await page.evaluate(() => (window as any).__mechExplodeSpread());
  expect(spread).toBeGreaterThan(0.1);
});

test('mechanism events: seismoscope quake trigger drops a ball', async ({ page }) => {
  await page.goto(`${APP}/#/m/seismoscope`);
  await page.waitForFunction(() => (window as any).__mech?.module?.mechanism);
  await page.getByTestId('mech-trigger-quake').click();   // trigger buttons rendered from mechanism.triggers
  await expect(page.getByTestId('event-captions')).toContainText(/吐丸|releaseBall/);
});

test('U2 real-pointer smoke: canvas drag drives (non-hook path)', async ({ page }) => {
  await page.goto(`${APP}/#/m/gimbal`);
  await page.waitForFunction(() => (window as any).__mech?.graph);
  const before = await page.evaluate(() => JSON.stringify((window as any).__mech.graph.state()));
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  const after = await page.evaluate(() => JSON.stringify((window as any).__mech.graph.state()));
  expect(after).not.toBe(before);   // interaction itself goes through real pointer; hooks only read state
});

test('U3+: side-by-side dual viewports drive in sync', async ({ page }) => {
  await page.goto(`${APP}/#/m/chariot`);
  await page.getByTestId('compare-toggle').click();
  await expect(page.locator('canvas')).toHaveCount(2);
  const moved = await page.evaluate(() => {
    (window as any).__mechCompare.drive(0.5);
    return (window as any).__mechCompare.graphs
      .map((g: any) => Object.values(g.state()).some((v: any) => Math.abs(v as number) > 1e-9));
  });
  expect(moved).toEqual([true, true]);
});

test('U5: AI Docent (mock) answers with source chips', async ({ page }) => {
  await page.goto(`${APP}/#/m/seismoscope`);
  await page.getByTestId('docent-input').fill('How do the two reconstructions differ?');
  await page.getByTestId('docent-send').click();
  await expect(page.getByTestId('docent-citation').first()).toBeVisible();
});

test('U6: ingenuity one-tap demo completes ≤12s with a done state', async ({ page }) => {
  await page.goto(`${APP}/#/m/chariot`);
  await page.waitForFunction(() => (window as any).__mech?.module?.mechanism);
  await page.getByTestId('spotlight-play').click();
  await expect(page.getByTestId('event-captions')).toContainText(/spotlight:done|妙处已演示|Ingenuity demonstrated/,
    { timeout: 12000 });
});

test('gallery attribution compliance', async ({ page }) => {
  await page.goto(`${APP}/#/m/astroclock`);
  await page.getByTestId('tab-museum').click();
  await expect(page.getByTestId('image-credit').first()).toContainText(/CC|Public/);
});
```

Plus a per-machine smoke loop (visit each `/#/m/<slug>`, assert the canvas appears and no console errors).

#### P6-T4 Performance & fallback renders (root)

- After `pnpm build`, check chunking: first-route chunk < 500 KB gz (three in its own vendor chunk, machine pages lazy); over budget → split/trim.
- Playwright screenshot script: 4 angles per machine (overall / cutaway / mechanism close-up / exploded) → `public/assets/renders/<slug>/` (compressed ≤300 KB each, then **committed** — §2 asset closed loop; clean-clone deploys never run the screenshot script), serving as the gallery "Reconstruction renders" layer and homepage cards (also closing the odometer photo gap).
- Completeness-critic agent (reads the whole repo): "Which machine misses which U interaction? Which license obligation is unmet? Which data-card entry never reached the UI?" — its findings become root's closing punch list.

**Acceptance**: `pnpm test && pnpm validate && pnpm poison && pnpm e2e && pnpm build` — five greens in a row; `git tag wave-6`.

---

### Phase 7 — Deployment & Submission Packaging (root solo)

#### P7-T1 Standalone repo & deployment

1. `gh repo create mechanica --public --source . --push` (or the user-designated name).
2. Default deployment: **Vercel** (`vercel --prod`; setting `OPENAI_API_KEY` enables the AI Docent — `api/docent.ts` activates automatically). Without Vercel access, degrade to GitHub Pages (`.github/workflows/deploy.yml` with `actions/deploy-pages`, artifact `dist/`, `base:'./'` already compatible; the docent probe returns 503 and hides itself; everything else unaffected).
3. Smoke: open all 10 machines once on the public URL — no 404s/console errors; with a key deployed, ask the Docent one question to verify chips, and fire 12 rapid questions to confirm 429 from the 11th (rate limiting live).

#### P7-T2 README (the judges' entire reading surface — write it seriously)

Structure (substantive, no fluff): `# Mechanica — Ancient Machines Reborn` → one-liner + live link + hero GIF → **Run locally** (`pnpm install && pnpm dev`, one command) → **The pipeline** (§1.2 diagram + where each stage's artifacts live) → **Verification philosophy** (deterministic validator + GPT-5.6 independent audit + poison tests, linking actual files in reports/ and artifacts/) → **How Codex accelerated this** (orchestration facts: how many parallel workers, the 10-machine CSV fan-out, 2–3 real issues skeptics caught — excerpted from the ledger with commit/tag links) → **Related work** (Smithsonian Voyager, Ciechanowski, Yan Hong-Sen's *Reconstruction Designs of Lost Ancient Chinese Machinery* — cite prior art yourself, first) → **Data & image licensing** (the IMAGE_CREDITS mechanism) → the ten-machine table.

#### P7-T3 Video script (`docs/VIDEO_SCRIPT.md`, <3 minutes, 60% explanation / 40% demo)

0:00 cold open: dragging the chariot's gears, the figure holds south (8s) → 0:10 problem: these machines survive only as text; reconstructions contradict each other; the public sees glass cases (20s) → 0:35 pipeline: how classical text becomes sourced parts (screen shows the Song Shi 「出齒五十四」 highlighted → the same number in parts.json → the validation report green) (40s) → 1:15 the Codex story: the ultracode wave diagram, the 10-worker CSV fan-out footage, a skeptic catching a bug, the poison test going red (35s — **the Codex UI and "GPT-5.6" must appear on screen**) → 1:50 product: astroclock scrollytelling 10s, seismoscope side-by-side comparison (same quake pulse: standing column inert, pendulum drops the ball) 10s, **ingenuity rapid-cut trio** (chariot figure at 0.0° / censer shaken but never spilling / odometer's 3-tooth wheel ticking the 100-tooth wheel into a drumbeat) 8s, reassembly 6s, AI Docent Q&A (source-chip close-up, "GPT-5.6" captioned) 6s (40s) → 2:30 close: numbers + link ("10 machines, 285 teeth, every dimension sourced") (15s).

#### P7-T4 Submission checklist (against Build Week requirements)

- [ ] Devpost form: category Education; YouTube link (public); repo link; Session ID (`docs/SUBMISSION_NOTES.md`)
- [ ] Video <3:00, narrated, Codex and GPT-5.6 both on screen
- [ ] README executed once on a clean clone by root in a fresh directory
- [ ] No unsanitized run logs in the repo (raw transcripts stay out of version control)
- [ ] Submitted before 12:00 PDT 07-21 and render-checked

---

## §7 The Ten Data Cards (the sole source of truth for P3 builders)

> Quotations are verbatim-verified Wikisource text (traditional characters preserved — **transcribe them exactly**). Conversions follow the §2 unit constants. Every image-table URL was verified to exist (license noted); `linkout` rows must never be downloaded. Items marked ⚠ are known uncertainties — copy them into `controversies` or `provenance.note`; do not "fix" them.

### 7.1 astroclock — Water-Powered Astronomical Clock Tower 水运仪象台 (S tier · flagship)

- **Name**: 水运仪象台 / Water-Powered Astronomical Clock Tower (Needham's "Cosmic Engine"). Northern Song: small wooden model 1088, completed 1092 in Bianjing (Kaifeng); directed by Su Song, computed by Han Gonglian. Lost after 1127.
- **Principle**: a constant-head supply (reservoir → constant-level tank) fills 36 scoops driving the shulun wheel; the tianheng escapement (gecha lever / guanshe tongue / tianguan gate / tiansuo locks) releases one cell at a time — the world's earliest escapement; the celestial column gear train synchronously drives the armillary sphere, celestial globe, and a five-tier chime pagoda.
- **Ingenuity**: hook = "digitizing a continuous water flow into equal beats" — scoops + the gecha lever form a **self-regulating negative-feedback governor**: constant inflow, uniform rotation; "stop–release–stop" is the ancestor of every mechanical clock ｜ Demo: one escapement cycle in slow motion (scoop fills → lever yields → tongue knocks the gate open → wheel advances one cell → lock re-seats), captions syncing the original text line by line ｜ Echo: the escapement in every mechanical watch — the ancestor of "tick-tock".
- **sources** (id → quote, keep verbatim):
  - `xyxfy-taiti` *Xin Yi Xiang Fa Yao*, vol. 3: 「水運儀象臺其制為臺四方而再重，上狹下廣……渾儀置上隔……儀有三重，曰六合儀、曰三辰儀、曰四游儀」
  - `xyxfy-shulun`: 「樞輪直徑一丈一尺，以七十二輻（一本云九十六）雙植於一轂為三十六洪（一本云四十八），束以三輞，每洪夾持受水壺一，總三十六壺，每壺長一尺、闊五寸、深四寸，於壺側置鐵撥牙以撥天衡關舌」
  - `xyxfy-tianheng`: 「天衡一置樞輪上，天關一置衡腦，天權一置衡尾，天條一在衡之前，天衡關舌一以天條綴之……樞衡一在天衡關舌上，衡腦為格叉以抵受水壺，以樞權掛其末，所以節受水壺之升降也。左右天鎖二，分置東西天柱間梁上，所以持正樞輪也」
  - `xyxfy-action`: 「（受水）壺虛即為格叉所格……水實即格叉不能勝壺，故格叉落，格叉落即壺側鐵撥擊（開關舌）……一輻過則左天鎖及天關開……一壺落則關鎖再拒次壺；激輪右回，故以右天鎖拒之使不能西也」
  - `xyxfy-baoshi`: 「木閣五層……第一層時初木人左搖鈴，刻至中擊鼓，時正右扣鐘……第五層分布木人出報夜漏箭」；「晝夜機輪八重，第一重曰天輪以撥渾象之赤道牙……」
  - `xyxfy-water`: 「樞輪左設天池、平水壺。平水壺受天池水注入受水壺以激樞輪；受水壺水落入退水壺……以昇水下輪運水入昇水上壺……運水入天河，天河復流入天池，周而復始」
  - URL: `https://zh.wikisource.org/wiki/新儀象法要_(四庫全書本)/卷下` (vol. 1: `…/卷上`)
- **Dimensions** (era=song): shulun wheel Ø 1 zhang 1 chi = 3.432 m (wenxian); 36 scoops each 0.312×0.156×0.125 m (wenxian); celestial column 1 zhang 9 chi 5 cun = 6.084 m (wenxian); water-lift wheels Ø 5 chi 6 cun = 1.747 m (wenxian); hour/drum wheel Ø 6 chi 7 cun = 2.090 m with 600 tooth-slots (wenxian); overall height ~12 m, base ~7 m ⚠ (received account; not explicit in the Siku edition, vol. 3 — `tuice`, note it).
- **Transmission spec**: escapement (36 scoops, stepRad=2π/36, fillSecondsPerScoop default 24 s, tunable); `expectedRatios`: shulun → hour/drum wheel **36/100** (basis: each cell-step advances 6 of the wheel's 600 slots, 6/600 = 1/100 turn; one shulun revolution = 36 cells → 36/100; sourceRef=`xyxfy-shulun`+`xyxfy-baoshi`); celestial globe via the "celestial ladder" chain (belt, 1:1 illustrative; note: this chain drive is explicitly recorded — among the world's earliest).
- **schemes**: `fixed-scoop` (Wang Zhenduo 1958: rigid fixed scoops; 1:5 model in the National Museum of China) / `combridge-hinged` (John Combridge 1961: hinged tipping scoops, validated by working models for stabler timekeeping; Tsuchiya Sakao's 1993 tianguan variant and the 1997 full-scale Gishodo replica in Nagano follow the same family). Controversy: scoop count 「三十六壺 / 一本云四十八」 edition variance ⚠.
- **museums**: National Museum of China (Beijing, Wang Zhenduo 1:5 model); China Science & Technology Museum "Light of China" hall; Kaifeng Museum (1:1 working, permanent); National Museum of Natural Science, Taichung (1:1 working wooden replica, permanent ⚠ completion year 1993/1997 disputed); Gishodo, Shimosuwa, Japan (1:1 working); Su Song Memorial, Tong'an, Xiamen.
- **Image table**:

| sourceUrl (commons.wikimedia.org/wiki/…) | angle | license |
|---|---|---|
| `File:Water-powered_Armillary_%26_Celestial_Tower_01._20241024.jpg` (02/03/04 same series) | Taichung 1:1 overall | CC-BY-SA |
| `File:Top_of_the_Water-powered_Armillary_%26_Celestial_Tower_01._20241024.jpg` | armillary platform close-up | CC-BY-SA |
| `File:Beijing_Ancient_Observatory_91105.jpg` | cutaway model, internal works | CC-BY-SA |
| `File:20241025_Model_of_the_Water_Clock_in_Kaifeng_Museum.jpg` | Kaifeng reconstruction | CC-BY-SA |
| `File:Model_of_Song_Hydrodynamic_Planetarium_(33295154030).jpg` | Fujian Museum model | CC0 |
| `File:Clock_Tower_from_Su_Song's_Book.JPG` + `File:Vue_éclatée_horloge_Su_Song.jpg` + `File:Chain_drive,_Su_Song's_book_of_1092.jpg` | treatise general/exploded/chain-drive plates | PD |
| Taichung museum exhibit page `https://www.nmns.edu.tw/ch/exhibitions/galleries/human-cultures-hall/chinese-science-and-technology/water-powered-clock/index.html` | official guide | linkout |

### 7.2 seismoscope — Houfeng Seismoscope 候风地动仪 (S tier · flagship)

- **Name**: 候风地动仪 / Zhang Heng's Seismoscope. Eastern Han, 132 CE, Zhang Heng, Luoyang. No artifact or drawing survives.
- **Principle**: a central duzhu column senses the initial ground motion's bearing; via "eight paths" of lever work it releases exactly one dragon's bronze ball into the toad below — inertial sensing + direction selection + monostable latching (one dragon fires, seven stay still).
- **Ingenuity**: hook = 「一龍發機，七首不動」 — a **monostable trigger with interlock**: the first-responding direction latches and the other seven paths lock out instantly, inherently rejecting multi-direction false alarms ｜ Demo: inject a westward pulse → the west dragon drops its ball → immediately try other directions, locked (red flash), caption quoting 「雖一龍發機，而七首不動」 ｜ Echo: the digital latch; first-event lockout in alarm systems.
- **sources**:
  - `houfeng-196` *Hou Han Shu*, ch. 59 — the complete 196-character passage (transcribe in full, verbatim): 「陽嘉元年，復造候風地動儀。以精銅鑄成，員徑八尺，合蓋隆起，形似酒尊，飾以篆文山龜鳥獸之形。中有都柱，傍行八道，施關發機。外有八龍，首銜銅丸，下有蟾蜍，張口承之。其牙機巧制，皆隱在尊中，覆蓋周密無際。如有地動，尊則振龍機發吐丸，而蟾蜍銜之。振聲激揚，伺者因此覺知。雖一龍發機，而七首不動，尋其方面，乃知震之所在。驗之以事，合契若神。自書典所記，未之有也。嘗一龍機發而地不覺動，京師學者咸怪其無征，後數日驛至，果地震隴西，於是皆服其妙。自此以後，乃令史官記地動所從方起。」 URL: `https://zh.wikisource.org/wiki/後漢書/卷59`
- **Dimensions** (era=han): vessel Ø 8 chi = 1.848 m (wenxian — the only recorded number); 8 dragons, 8 toads (wenxian); duzhu height ≈2 m (Feng Rui's inference, tuice).
- **Mechanism spec**: no continuous transmission; `MechanismScript`: bearing pulse d∈0..7 → that dragon's `releaseBall` event + assert the other seven locked. The two schemes differ internally (see schemes). expectedRatios empty (note: a trigger mechanism, not a transmission).
- **schemes** (this project's most important dual scheme): `wangzhenduo` (1951 standing column / inverted pendulum — the textbook model; seismologists judged it non-functional; Fu Chengyi: "a slab of meat hung from a beam would beat it") / `fengrui` (2004–05 suspended pendulum: hanging duzhu + eight ball tracks, validated against historical Longxi seismograms and shake-table tests, accepted 2005; displayed at Henan Museum; also identified Wang's misreading of 「關」/「機」). Controversy: the 2017 textbook-image removal debate; consensus = the historical record is credible, Wang's model is not viable, Feng's is the current best solution rather than the unique answer.
- **museums**: National Museum of China (Wang Zhenduo model); Henan Museum (Feng Rui model, permanent); China Science & Technology Museum; Nanyang Zhang Heng Museum ⚠.
- **Image table**:

| sourceUrl | angle | license |
|---|---|---|
| `File:Seismograph_in_the_National_Museum_of_Natural_Science_20241024.jpg` | Taichung replica, hi-res | CC-BY-SA |
| `File:EastHanSeismograph.JPG` | Wang-style exterior | CC-BY-SA |
| `File:People's_Republic_of_China_Exhibit-_Copy_of_World's_First_Seismograph.jpg` | 1982 World's Fair replica | CC0 |
| `File:Wang_Zhenduo's_reprodution_of_Heng's_seismoscope.png` | Wang Zhenduo 1951 historical photo | CC0 |
| `File:Zhang_Heng's_seismometer_internal_reproduction_with_inverted_pendulum.png` | Imamura inverted-pendulum internals | PD |
| `File:注释版地动仪复原.jpg` | annotated cutaway (Chinese) | PD |
| ⚠ No CC image of the Feng Rui model — use project renders + a Henan Museum text link | — | — |

### 7.3 chariot — South-Pointing Chariot 指南车 (S tier · flagship)

- **Name**: 指南车 / South-Pointing Chariot. Legendary Yellow-Emperor origin; historically rebuilt by Ma Jun (c. 235); full mechanism data survive from Yan Su (1027) and Wu Deren (1107) in the Song Shi.
- **Principle**: wheel differential as input; a gear train applies the equal-and-opposite compensation to the figure, decoupling its heading from the chassis — a purely mechanical, non-magnetic heading keeper.
- **Ingenuity**: hook = "a mechanical subtractor" — in a turn, the left–right wheel difference is **subtracted** through the gear train and counter-fed to the figure; "south-pointing" without a magnet ｜ Demo: drag only the left road wheel (pivot turn); a three-line HUD ticks in sync: chassis +90°, geartrain compensation −90°, figure world heading 0.0°, motionless ｜ Echo: the automotive differential run backwards; the mechanical forerunner of dead-reckoning navigation.
- **sources**:
  - `songshi-yansu` *Song Shi* ch. 149 (Yan Su's build — transcribe verbatim): 「用獨轅車，車箱外籠上有重構，立木仙人於上，引臂南指。用大小輪九，合齒一百二十。足輪二，高六尺，圍一丈八尺。附足立子輪二，徑二尺四寸，圍七尺二寸，出齒各二十四，齒間相去三寸。轅端橫木下立小輪二，其徑三寸，鐵軸貫之。左小平輪一，其徑一尺二寸，出齒十二；右小平輪一，其徑一尺二寸，出齒十二。中心大平輪一，其徑四尺八寸，圍一丈四尺四寸，出齒四十八，齒間相去三寸。中立貫心軸一，高八尺，徑三寸。」
  - `songshi-turn`: 「若折而東，推轅右旋，附右足子輪順轉十二齒，擊右小平輪一匝，觸中心大平輪左旋四分之一，轉十二齒，車東行，木人交而南指。若折而西……車正西行，木人交而南指。」
  - `songshi-wuderen` (Wu Deren 1107, excerpt): 「其指南車身一丈一尺一寸五分……車輪直徑五尺七寸……大平輪其輪徑三尺八寸……出齒一百……左右附輪各一……出齒二十四……遇右轉使右轅小輪觸落右輪，若左轉使左轅小輪觸落左輪。行則仙童交而指南。」
  - `sanguozhi-majun` *San Guo Zhi* ch. 29, Pei's commentary quoting Fu Xuan: 「二子謂古無指南車，記言之虛也……『虛爭空言，不如試之易效也。』於是二子遂以白明帝，詔先生作之，而指南車成……從是天下服其巧矣。」
  - URLs: `https://zh.wikisource.org/wiki/宋史/卷149`, `https://zh.wikisource.org/wiki/三國志/卷29`
- **Dimensions** (era=song): road wheels height 6 chi = 1.872 m, circumference 1 zhang 8 chi (wenxian); sub-wheels Ø 2 chi 4 cun = 0.749 m, 24 teeth; small horizontal wheels Ø 1 chi 2 cun = 0.374 m, 12 teeth; central great wheel Ø 4 chi 8 cun = 1.498 m, 48 teeth; central shaft height 8 chi = 2.496 m (all wenxian).
- **Transmission spec**: `expectedRatios`: sub-wheel → small wheel 24/12 (sourceRef=`songshi-yansu`); small wheel → great wheel 12/48; **core assertion** (in tests and the validator): chassis pivot by θ → figure world-heading change < 1e-6 rad (per the 「轉十二齒＝四分之一」 closure in `songshi-turn`). driveNodes = [left wheel, right wheel, great wheel].
- **schemes**: `yansu-clutch` (default, strictly per the Song Shi: on a turn the shaft deflection drops the corresponding small wheel into mesh, disengaged when straight — an automatic clutch; Wang Zhenduo's 1937 model took this route) / `lanchester-diff` (George Lanchester 1932: continuous differential compensation, mechanically elegant but without direct textual basis; his mechanism's replica is in the London Science Museum). Methodological reference: Yan Hong-Sen, *Reconstruction Designs of Lost Ancient Chinese Machinery* (Springer 2007).
- **museums**: National Museum of China (Wang Zhenduo model); China Science & Technology Museum; National Museum of Natural Science, Taichung (gear-train close-up reconstruction); Science Museum, London.
- **Image table**:

| sourceUrl | angle | license |
|---|---|---|
| `File:South-pointing_Chariot_Model_(9883195115).jpg` | Military Museum replica, full side | CC0 |
| `File:South-pointing_chariot_in_the_National_Museum_of_Natural_Science_20241024.jpg` | Taichung full chariot | CC-BY-SA |
| `File:Gears_of_South-pointing_chariot_Model_in_National_Museum_of_Natural_Science,_Taiwan.JPG` | **gear-train close-up** | CC-BY-SA |
| `File:South-pointing_chariot_(Science_Museum_model).jpg` | London differential model | CC-BY |
| `File:20241011_South-pointing_chariot_at_the_Temple_of_Xuanyuan_Hometown.jpg` | Xinzheng monument | CC-BY-SA |

### 7.4 odometer — Li-Recording Drum Carriage 记里鼓车 (A tier)

- **Name**: 记里鼓车 (a.k.a. 大章车) / Odometer Drum Carriage. Han origin; Lu Daolong's full tooth counts survive (1027).
- **Principle**: the road wheel through two reduction stages (1/100, 1/1000) discretizes distance; full turns trigger jack figures striking a drum (each li) and a chime (each ten li) — a mechanical decimal odometer.
- **Ingenuity**: hook = "a decimal mechanical counter" — 1/100 and 1/1000 reductions turn continuous rolling into discrete li, and the 285 teeth agree with the Song Shi text to the digit ｜ Demo: fast-forward to 0.99 li, then slow-motion as the 3-tooth whirlwind wheel ticks the 100-tooth middle wheel's final tooth → the figure raises its mallet and strikes; the odometer flips ｜ Echo: the mechanical ancestor of the taximeter and the trip counter.
- **sources**:
  - `songshi-waiguan` *Song Shi* ch. 149: 「記裏鼓車，一名大章車。赤質，四面畫花鳥，重台，勾闌，鏤拱。行一里，則上層木人擊鼓；十里，則次層木人擊鐲。一轅，鳳首，駕四馬。」
  - `songshi-ludaolong` (the golden passage — transcribe verbatim): 「足輪各徑六尺，圍一丈八尺。足輪一周，而行地三步。以古法六尺為步，三百步為裏……立輪一，附於左足，徑一尺三寸八分……出齒十八……下平輪一，其徑四尺一寸四分……出齒五十四……立貫心軸一，其上設銅旋風輪一，出齒三……中立平輪一，其徑四尺……出齒百……次安小平輪一……出齒十……上平輪一……出齒百……其中平輪轉一周，車行一里，下一層木人擊鼓；上平輪轉一周，車行十里，上一層木人擊鐲。凡用大小輪八，合二百八十五齒，遞相鉤鎖，犬牙相製，周而復始。」 URL: `https://zh.wikisource.org/wiki/宋史/卷149`
- **Dimensions** (era=song): road wheel Ø 6 chi = 1.872 m, circumference 1 zhang 8 chi (note the ancients used π≈3 — record 「周三径一」 as the basis); vertical wheel 18 t, Ø 1 chi 3 cun 8 fen; lower wheel 54 t; whirlwind wheel 3 t; middle wheel 100 t, Ø 4 chi; small wheel 10 t; upper wheel 100 t (all wenxian).
- **Transmission spec** (golden data): 1 li = 300 bu × 6 chi = 1800 chi → road wheel 100 turns/li. `expectedRatios`: road wheel → middle wheel **1/100**; road wheel → upper wheel **1/1000** (sourceRef=`songshi-ludaolong`). Tooth-total assertion: 285. Cam events: middle-wheel full turn → `drum`, upper-wheel → `chime` (UI odometer + optional sound).
- **schemes**: `ludaolong` (default); optional `wuderen` extension (Daguan build: 20/60/100/3 train, "the road wheel turns one hundred times and the figures strike") — stretch, not required.
- **museums**: National Museum of China (Wang Zhenduo 1936–37 model); China Science & Technology Museum; Taichung ⚠.
- **Images**: ⚠ Commons has **no museum replica photo** (multiple search rounds confirmed) — the gallery leads with project renders, supplemented by `File:Han_dynasty_odometer_cart.jpg` (Xiaotangshan Han relief rubbing, PD — the earliest pictorial evidence) and `File:Diagram_of_a_Song_dynasty_odometer_cart.svg` (gear-train diagram, CC-BY 2.5).

### 7.5 wooden-ox — Wooden Ox & Gliding Horse 木牛流马 (A tier)

- **Name**: 木牛、流马 / Wooden Ox & Gliding Horse. Shu Han, 231–234, Zhuge Liang, army grain transport out of Hanzhong.
- **Principle** (open): wheelbarrow theory = a lever-balanced single-wheel carrier with the load over the axle; walker theory = a four-legged linkage gait. Fixed facts: twin shafts, human power, narrow mountain paths, ~100 kg-class payload per unit, 「人行六尺牛行四步」「日行二十里」.
- **Ingenuity**: hook = "give the weight to the structure, keep the balance for the human" — wheelbarrow reading: the load sits directly over the axle, the porter steers rather than carries; walker reading: linkage gait over gullies ｜ Demo: scheme A overlays force arrows (cargo → axle, hand force ≈ 0); one tap to scheme B runs a full four-leg crank gait cycle ｜ Echo: the modern wheelbarrow in unbroken descent; the walker reading is a millennium-early daydream of legged robots.
- **sources**:
  - `sgz-benzhuan` *San Guo Zhi*, Zhuge Liang's biography: 「亮性長於巧思，損益連弩，木牛流馬，皆出其意」; year 9 「以木牛運」, year 12 「以流馬運」.
  - `sgz-muniu` Pei's commentary quoting the *Zhuge Liang Ji*: 「木牛者，方腹曲頭，一腳四足，頭入領中，舌著於腹。載多而行少……特行者數十里，群行者二十里也。曲者為牛頭，雙者為牛腳……牛仰雙轅，人行六尺，牛行四步。載一歲糧，日行二十里，而人不大勞。」
  - `sgz-liuma` (the Gliding-Horse dimension table): 「流馬尺寸之數：肋長三尺五寸，廣三寸，厚二寸二分，左右同。前軸孔分墨去頭四寸，徑中二寸……板方囊二枚，厚八分，長二尺七寸，高一尺六寸五分，廣一尺六寸，每枚受米二斛三斗……前後四腳，廣二寸，厚一寸五分……孔徑中三腳杠，長二尺一寸……」
  - `shiwujiyuan` Song, Gao Cheng, *Shiwu Jiyuan* ch. 8: 「木牛即今小車之有前轅者，流馬即今獨推者是，而民間謂之江州車子。」
  - URLs: `https://zh.wikisource.org/wiki/三國志/卷35`, `https://zh.wikisource.org/wiki/事物紀原_(四庫全書本)/卷08`
- **Dimensions** (era=hanmo, 0.242 m/chi): rib length 3 chi 5 cun = 0.847 m; two board pods each 0.653×0.399×0.387 m (2 chi 7 cun × 1 chi 6.5 cun × 1 chi 6 cun), each holding 2 hu 3 dou of rice ≈ 47 L; three-leg bar 2 chi 1 cun = 0.508 m (all wenxian). The Wooden Ox has no dimension table — `tuice` from a modern replica at 2.08 m long, 1.4 m high ⚠.
- **schemes**: `wheelbarrow` (default; Tan Liangxiao et al. per the *Shiwu Jiyuan*: central big wheel + front shafts; Chen Congzhou's plank-road surveys support feasibility) / `walker` (Wang Jian et al.: four-legged walking mechanism; whether 「一腳四足」 means one wheel + four struts or four legs is the core textual fork). The card states plainly: **no authoritative verdict exists — presenting both schemes side by side IS this machine's exhibit value** — the UI badges it "one of several reconstructions".
- **museums**: Wuhou Shrine Museum, Chengdu ⚠ (permanence unverified); Zhuge Ancient Town (Mian County), Jianmen Pass (tourist replicas); Ancient Chariot Museum, Zibo (replica).
- **Image table**:

| sourceUrl | angle | license |
|---|---|---|
| `File:Wooden_ox_2016_Temple_of_Marquis_Wu_(Wuzhang_Plains).jpg` | Wuzhang Plains Wooden Ox | CC-BY-SA |
| `File:Flowing_horse_2016_Temple_of_Marquis_Wu_(Wuzhang_Plains).jpg` | Wuzhang Plains Gliding Horse | CC-BY-SA |
| `File:Wooden_ox_replica_in_the_Ancient_Chariot_Museum_in_Zibo,_China.JPG` | Zibo four-leg replica | CC-BY-SA |
| `File:Three_Kingdoms_Locking_Ox-Cart_Model_(9883958246).jpg` | Military Museum locking-mechanism model | CC0 |
| `File:Shu_forces_construct_wooden_oxen_and_flowing_horses.jpg` | Qing woodcut | PD |
| `File:Wooden_ox_wjzy.jpg` | *Wujing Zongyao* plate | tagged CC-BY-SA ⚠ (scan of an ancient book; effectively PD) |

### 7.6 loom — Laoguanshan Pattern Loom 老官山提花织机 (A tier)

- **Name**: 一勾多综提花织机 (Laoguanshan loom models) / Han Pattern Loom. Western Han (c. 157–88 BCE), excavated 2013 from Laoguanshan tomb M2, Chengdu — **the world's earliest pattern-loom artifacts** (models).
- **Principle**: treadles + a "single-hook multi-heddle" selector freeze the pattern into a program of heddle lifts — a "programmable loom" storing its image in heddles; the earliest physical ancestor of jacquard/punch-card thinking.
- **Ingenuity**: hook = "writing the picture into the machine" — the pattern is fixed as a heddle lift/drop sequence: **program separated from data**, in a physical machine; swap the "program" (heddle order) and the woven figure changes ｜ Demo: interactively reorder the 8 heddles' sequence → the shed weaves two contrasting patterns live ｜ Echo: pattern loom → Jacquard punch cards → Babbage → the stored program.
- **sources**:
  - `xijingzaji-loom` *Xijing Zaji* ch. 1: 「霍光妻遺淳于衍蒲桃錦二十四匹、散花綾二十五匹。綾出鉅鹿陳寶光家，寶光妻傳其法……機用一百二十鑷，六十日成一匹，匹直萬錢。」 URL: `https://zh.wikisource.org/wiki/西京雜記/卷一`
  - `sgz-majun-loom` *San Guo Zhi* ch. 29 commentary (Ma Jun simplifies the loom): 「舊綾機五十綜者五十躡，六十綜者六十躡，先生患其喪功費日，乃皆易以十二躡。」
  - `kaogu-laoguanshan` (archaeology digest, not classical): 4 bamboo-wood loom models + 15 painted weaver figurines; 1 sliding-frame type (no. 186) + 3 linkage type; China National Silk Museum reconstruction study URL: `https://www.chinasilkmuseum.com/gskt/info_319.aspx?itemid=28182`
- **Dimensions** (wenwu, excavation measurements): sliding-frame model no. 186: 0.85×0.26×0.50 m; linkage type ≈0.63×0.19×0.37 m; models ≈1/6 scale, full machines ~2 m class (tuice per the Silk Museum's working reconstructions).
- **Mechanism spec**: cam(heddle) drives 8 representative heddles (real machines carry dozens — simplification declared in a note); treadle → hook → heddle lift → shed → weft insertion (event) → beat-up. expectedRatios empty (reciprocating machine); core assertion = heddle sequence cycles and travel ≤ liftHeight.
- **schemes**: `sliding-frame` (per no. 186 — the Silk Museum's working replica wove the 交龙对凤纹锦 reproduction) / `linkage` (per nos. 189/190/191 — wove the 世毋极锦; the same program reproduced the national-treasure 「五星出東方利中國」 brocade, 2018).
- **museums**: **Chengdu Museum (the 4 originals — signature holdings, permanent)**; China National Silk Museum, Hangzhou (full-size working reconstructions + demonstrations); Chengdu Shu Brocade and Embroidery Museum.
- **Images**: `File:成都老官山墓地出土-织机-西汉-成都考古中心_2024-10-17.jpg` (the excavated original, 4096 px, CC-BY-SA — the single but excellent Commons photo); Silk Museum reconstruction article (measured drawings/replica photos, linkout); Chengdu Museum exhibit page `https://cdmuseum.com/gudaipian/` (linkout).

### 7.7 typecase — Movable Type & Revolving Typecase 活字印刷·转轮排字盘 (B tier)

- **Name**: Bi Sheng's clay movable type (1041–48) + Wang Zhen's wooden type & revolving typecase (1298).
- **Principle**: Bi Sheng = standardized type + resin-wax thermal fixing + a two-plate pipeline; Wang Zhen's wheel = a rotating storage-and-retrieval device indexed by rhyme (「以字就人」 — the type comes to the person).
- **Ingenuity**: hook = 「以字就人，不勞力而坐致」 — what rotates is the type case, not the person: retrieval flips from "walk the racks" to "spin the wheel"; one seated compositor picks from either side ｜ Demo: tap any target character → the wheel auto-rotates its sector into reach and highlights it, beside a stopwatch bar racing the "walk the racks" animation ｜ Echo: carousel storage/retrieval in automated warehouses; a physical database index.
- **sources**:
  - `mengxi-bisheng` *Mengxi Bitan* ch. 18 (transcribe the full passage verbatim): 「慶曆中，有布衣畢昇，又為活版。其法用膠泥刻字，薄如錢唇，每字為一印，火燒令堅。先設一鐵版，其上以松脂臘和紙灰之類冒之。欲印則以一鐵範置鐵板上，乃密布字印。滿鐵範為一板，持就火煬之，藥稍鎔，則以一平板按其面，則字平如砥……常作二鐵板，一板印刷，一板已自布字……每一字皆有數印，如之、也等字，每字有二十餘印……不若燔土，用訖再火令藥鎔，以手拂之，其印自落，殊不沾汙。」 URL: `https://zh.wikisource.org/wiki/夢溪筆談/卷18`
  - `nongshu-zaolun` Wang Zhen, *Nong Shu* ch. 22, "Making the Wheel": 「用輕木造為大輪，其輪盤徑可七尺，輪軸高可三尺許……立轉輪盤，以圓竹笆鋪之，上置活字板面，各依號數……凡置輪兩面，一輪置監韻板面，一輪置雜字板面。一人中坐，左右俱可推轉摘字。蓋以人尋字則難，以字就人則易。此轉輪之法，不勞力而坐致。」 URL: `https://zh.wikisource.org/wiki/王禎農書/卷二十二`
  - `nongshu-shiyin` (the print-run record): 「試印本縣誌書，約計六萬餘字，不一月而百部齊成。」
- **Dimensions** (era=yuan): wheel Ø 7 chi ≈ 2.205 m, axle height 3 chi ≈ 0.945 m (wenxian); clay type "thin as a coin's rim", 2–3 mm (wenxian simile; tuice for the number); two facing wheels (rhyme wheel + miscellaneous wheel).
- **Mechanism spec**: wheel lockstep hand-spun (driveNode); five-step MechanismScript: pick type → set the forme → heat to melt the resin → press flat → print (each step an event + UI stepper + the matching original sentence surfacing).
- **schemes**: none (controversies instead: clay-type feasibility doubts refuted by Zhai Jinsheng's surviving Qing prints and modern firing experiments ⚠; the 1990 Yingshan "Bi Sheng" tombstone attribution debated ⚠; Korea's *Jikji* (1377) is the earliest extant metal-type book while Bi Sheng's invention predates it by ~300 years — exhibit copy).
- **museums**: China Printing Museum (Beijing Daxing — Bi Sheng process reconstruction + revolving-case scene); China Block Printing Museum, Yangzhou; Dongyuan, Rui'an (living wooden movable type, UNESCO 2010).
- **Image table**:

| sourceUrl | angle | license |
|---|---|---|
| `File:Chinese_movable_type_1313-ce.png` | **the 1313 revolving-typecase plate from the Nong Shu** | PD |
| `File:Beijing.Musee_imprimerie.caracteres_mobiles.Bisheng.jpg` | Printing Museum Bi Sheng process | CC-BY-SA |
| `File:Beijing_printing_museum.wooden_movable_types.jpg` | wooden type | CC-BY-SA |
| `File:Beijing_printing_museum.bronze_movable_types.jpg` | bronze type | CC-BY-SA |
| `File:Beijing_printing_museum.Han_characters_case.jpg` | type racks (the pain the wheel solves) | CC-BY-SA |
| ⚠ no Commons photo of a physical revolving-case replica — render fallback | — | — |

### 7.8 chainpump — Dragon-Backbone Chain Pump 龙骨水车/翻车 (B tier)

- **Name**: 翻车/龙骨水车 / Square-Pallet Chain Pump. Invented by Bi Lan (186 CE), improved by Ma Jun (Three Kingdoms); full structure in Wang Zhen's *Nong Shu*.
- **Principle**: pedal cranks drive the head sprocket; the dragon-bone pallet chain loops through a wooden trough, scraping water uphill — China's earliest chain-drive application.
- **Ingenuity**: hook = "the chain IS the piston" — each pallet works two jobs, drive link and scraper; the trough is the "cylinder"; not one seal anywhere, yet it lifts water continuously ｜ Demo: one tap makes the trough translucent in side view; drag the crank and watch the pallet chain scrape water up the channel ｜ Echo: scraper conveyors, bucket elevators — and the escalator's ancestor.
- **sources**:
  - `hhs-bilan` *Hou Han Shu* ch. 78: 「又使掖庭令畢嵐……又作翻車渴烏，施於橋西，用灑南北郊路。」 URL: `https://zh.wikisource.org/wiki/後漢書/卷78`
  - `sgz-majun-fanche` *San Guo Zhi* ch. 29 commentary: 「（馬鈞）居京都……乃作翻車，令童兒轉之，而灌水自覆，更入更出，其巧百倍於常。」
  - `nongshu-fanche` *Nong Shu* ch. 18: 「車身用板作槽，長可二丈，闊則不等，或四寸至七寸，高約一尺。槽中架行道板一條……同行道板上下通周以龍骨板葉。其在上大軸，兩端各帶拐木四莖，置於岸上木架之間。人憑架上，踏動拐木，則龍骨板隨轉，循環行道板刮水上岸……水具中機械巧捷，惟此為最。」 URL: `https://zh.wikisource.org/wiki/王禎農書/卷十八`
- **Dimensions** (era=yuan): trough ~2 zhang ≈ 6.3 m long, 4–7 cun (0.126–0.22 m) wide, ~1 chi ≈ 0.315 m tall; four crank spurs per axle end (four-throw pedal crank); three pumps in relay lift 「三丈」 (all wenxian).
- **Mechanism spec**: crank (driveNode) → head sprocket → belt (chain) → foot sprocket; ≥24 pallets instanced along the path; `expectedRatios`: crank → head sprocket lockstep 1:1; assertion = pallets track the loop without derailment (parametrized path). Inventorship debate goes in controversies (was Bi Lan's 翻車渴烏 this pump ⚠; Ma Jun invent vs improve).
- **museums**: China Agricultural Museum (3 m artifact, item page `https://www.ciae.com.cn/collection/detail/zh/1676.html` linkout); China Science & Technology Museum (pedal-able interactive); living examples across Jiangnan water towns.
- **Image table**:

| sourceUrl | angle | license |
|---|---|---|
| `File:Eastern_Han_%26_Three_Kingdoms_Chain_Pump_Model_(9833206136).jpg` | **NMC model, full side view** | CC0 |
| `File:Southern_Henan_Chain_Pump_for_Irrigation_1.jpg` (also _2) | Xinyang folk artifact | CC0 |
| `File:Tiangong_Kaiwu_Chain_Pumps.jpg` | *Tiangong Kaiwu* plate | PD |
| `File:Farmers_of_forty_centuries_-_Foot-power_of_China_propels_irrigation_pump.jpg` | 1900s field photo | PD |
| `File:Waterladder_pump.JPG` | principle line drawing | PD |

### 7.9 bellows — Water-Powered Blast Bellows 水排 (B tier)

- **Name**: 水排 / Water-Powered Blast Bellows. Invented 31 CE by Du Shi, governor of Nanyang; spread by Han Ji; structure preserved in Wang Zhen's *Nong Shu*.
- **Principle**: horizontal waterwheel → cord drive (弦索) speeding a small drum → crank (掉枝) and connecting rod (行桄) → rocker (攀耳) → bellows boards reciprocate — a complete rotary→reciprocating crank-rod chain, which Needham noted is Watt's kinematic chain run in reverse, a millennium earlier.
- **Ingenuity**: hook = "Watt's linkage, mirrored" — the full rotary→reciprocating crank-and-rod chain ~1000 years before Europe ｜ Demo: the transmission lights up stage by stage (wheel → cord → drum → crank → rod → rocker → board); the final frame shows a side-by-side mini-diagram of the steam engine (reciprocating→rotary) — the same chain, direction reversed ｜ Echo: the mirror image of every steam and IC engine's crank-and-rod; Needham devoted an argument to exactly this chain.
- **sources**:
  - `hhs-dushi` *Hou Han Shu* ch. 31: 「造作水排，鑄為農器，用力少，見功多，百姓便之。」 URL: `https://zh.wikisource.org/wiki/後漢書/卷31`
  - `nongshu-hanji` *Nong Shu* ch. 19 quoting the *Wei Zhi*: 「暨乃因長流為水排，計其利益，三倍於前。」
  - `nongshu-shuipai` *Nong Shu* ch. 19 (the golden crank-rod passage): 「其製：當選湍流之側，架木立軸，作二臥輪；用水激轉下輪，則上輪所週絃索，通繳輪前旋鼓，掉枝一例隨轉；其掉枝所貫行桄，因而推挽臥軸左右攀耳，以及排前直木，則排隨來去，扇冶甚速，過於人力。」 Alternate (cam-tappet): 「假水輪臥軸所列拐木，自上打動排前偃木……一軸可供數排，宛若水碓之製。」 URL: `https://zh.wikisource.org/wiki/王禎農書/卷十九`
- **Dimensions**: no overall figures in the sources (「排前直出木簨约长三尺」 ≈ 0.94 m among scattered part sizes); waterwheel ~3 m and board ~1.5 m follow Wang Zhenduo's reconstruction (tuice ⚠).
- **Mechanism spec**: waterwheel (driveNode) → belt (cord, wheel radii 3 m : 0.6 m = 5:1 speed-up, tuice; radii in the wheels' geometry) → drum + crank (crankRadius 0.24 m, rodLength 1.2 m, tuice) → rocker → board prismatic (limits [0, 0.5 m]). **Stroke self-consistency: s(θ)=(L+r)−(r·cosθ+√(L²−r²sin²θ)), stroke 2r=0.48 m < the 0.5 m limit** (an earlier 0.3 m draft contradicted the limit; corrected by computation). Assertions: travel ∈ limits, s(0)=0, s(π)=0.48.
- **schemes**: optional `crank-rod` (default, cord-and-crank) / `cam-tappet` (「一軸可供數排」) — under time pressure build only the default and move the alternate into controversies.
- **museums**: National Museum of China (Wang Zhenduo 1:10 model); China Science & Technology Museum; Nanyang / Henan Museum iron-smelting displays ⚠.
- **Images**: `File:Water-Powered_Bellows_Model_(9832086364).jpg` (**NMC model, full-chain side view, CC0 hi-res**); `File:Yuan_Dynasty_-_waterwheels_and_smelting.png` (the *Nong Shu* plate, PD); remaining angles from project renders.

### 7.10 gimbal — Gimbal Incense Burner 被中香炉·葡萄花鸟纹银香囊 (B tier · smallest gem)

- **Name**: 被中香炉 (the "in-the-quilt censer") / Tang silver censer with grape-and-bird openwork / Gimbal Incense Burner (Cardan-type suspension). Western Han craftsman Ding Huan "restored the lost method" (originating with Fang Feng); the Tang original excavated 1970 from the Hejiacun hoard, Xi'an.
- **Principle**: two mutually orthogonal pivot rings + a low-hung bowl — however the sphere rolls, the rings differentially rotate and the bowl stays level; the gimbal/universal suspension, ~1000 years before Cardan's European record.
- **Ingenuity**: hook = "passive self-stabilization" — orthogonal rings + a low center of gravity: pure geometry and gravity keep the bowl level; zero control, zero power ｜ Demo: fling the outer sphere wildly — the flame particles in the bowl never spill; a live readout shows deviation <0.5°; a phone-gimbal comparison card closes it ｜ Echo: gyroscope gimbals, camera/phone stabilizers, ship compass suspensions — China's precedent for the Cardan mount.
- **sources**:
  - `xijingzaji-dinghuan` *Xijing Zaji* ch. 1: 「長安巧匠丁緩者，為常滿燈……又作臥褥香鑪，一名被中香鑪。本出房風，其法後絕，至緩始更為之。為機環，轉運四周，而鑪體常平，可置之被褥，故以為名。」 (the same entry's seven-wheel fan makes good easter-egg copy) URL: `https://zh.wikisource.org/wiki/西京雜記/卷一`
- **Dimensions** (wenwu, measured): the grape-and-bird silver censer: outer Ø 0.046 m, gold bowl Ø 0.028 m, chain 0.075 m; the Famen Temple gilt censer Ø 0.128 m (largest extant Tang example). ⚠ The *Xijing Zaji*'s date of composition is contested (Western Han to Eastern Jin), which conditions how strongly to claim "1st century BCE" — controversies.
- **Mechanism spec**: gimbal constraint (outer shell / outer ring / inner ring / bowl); shell is the driveNode, drag to any attitude; **assertion** (in tests): across arbitrary shell attitude sequences, the bowl's world-up deviates <0.5° from +Y. Shell cutaway defaults on.
- **museums**: **Shaanxi History Museum (the original; "Treasures of the Tang" permanent exhibit; item page `https://www.sxhm.com/collections/detail/9948` linkout)**; Famen Temple Museum; Shōsōin, Japan ⚠.
- **Image table**:

| sourceUrl | angle | license |
|---|---|---|
| `File:Tang_Gold_or_Silver_Incense_Burner_(9949879025).jpg` | **opened — the gimbal visible inside** | CC0 |
| `File:Tang_Silver_Incense_Ball_(9923133354).jpg` | Xi'an Museum same-construction censer with chain | CC0 |
| `File:Tang_Dynasty_Culture_Relics_11.jpg` | Famen censer macro (hinge detail) | CC-BY-SA |
| `File:Famen_Si_May_2007_060.jpg` | two Famen censers (closed + opened) | CC-BY-SA |
| ⚠ no CC photo of the Hejiacun original itself — official link-out + renders | — | — |

---

## §8 Risks, Degradation Paths, and Default Decision Rules

### 8.1 Risk register and countermeasures

| Risk | Trigger signal | Countermeasure |
|------|----------|------|
| Escapement state machine unstable | astroclock drag stutter / event misorder | Degrade: escapement becomes a pre-baked timeline animation (keep the step button); scrollytelling unaffected |
| Walker gait four-bar eats time | wooden-ox worker overruns | walker patch degrades to a precomputed gait lookup (8 keyframes per leg, interpolated), still drag-drivable |
| Loom thread rendering too slow | loom page <30 fps | Merge warp into striped planes + normal map; keep ≤60 real threads at the heddle eyes |
| Commons download failures/throttling | fetch failure rate >30% | Render fallback layer exists; retry off-peak; never scrape museum sites instead |
| GPT-5.6 audit conflicts with a data card | audit reports "inconsistent" | Load-bearing conflicts BLOCK the machine and route through the snapshot process (P2-T3); snapshots outrank cards; log in OPEN_QUESTIONS.md |
| e2e hook `window.__mech` leaking | prod bundle size/security review | Gate injection behind `import.meta.env.DEV \|\| VITE_E2E` |
| AI Docent abuse/cost/hallucination | anomalous token spend; out-of-corpus numbers in answers | Server-side schema enforcement (body/turns/length/roles/input tokens) + per-IP limiting + KV global daily budget breaker (disabled by default without shared storage) + client citation-id validation (unknown ids never become chips) + production fail-closed (outages show "unavailable", never mock); in extremis pull the key — the site reverts to pure static |
| Side-by-side dual-canvas too slow | astroclock compare <30 fps | Half-resolution + paused auto-rotation + shared geometry cache; failing that, hide compare for that machine, keep ghost overlay |
| Time runs short | P4 unfinished by noon 07-20 | Apply the descope order in 8.2 |

### 8.2 Descope order (cut features, never machines; cut top-down)

1. B3 reassembly challenge (snap detection) → keep explode slider + step assembly (U1 still passes)
2. AI Docent U5 (if the endpoint is shaky/over budget) → hide the entry; the site reverts to pure static (U5 was an enhancement)
3. Flagship scrollytelling from 3 machines to 1 (keep astroclock)
4. Side-by-side comparison → fall back to ghost overlay + comparison table (U3 baseline still passes)
5. Scheme-switch ghost transition → hard cut
6. bellows' `cam-tappet` second scheme; odometer's `wuderen` extension
7. Sound effects; mobile polish
8. **Never cut**: the U1–U4 and U6 ingenuity baseline, all 10 machines, validator + poison, image attribution compliance, README/video (the ingenuity demo may downgrade from camera choreography to highlight + captions, but the card and the demo itself must exist)

### 8.3 Default decision rules (when the plan is silent, root decides thus and logs it)

1. A dimension lacks textual basis → take museum-replica proportions, mark `tuice`; still missing → infer from similar parts' proportions.
2. Visual style in doubt → restrained wins (dark ground, warm gold, whitespace); no gratuitous particles.
3. Dependency choice in doubt → fewer packages; standard library / hand-rolled first.
4. Any "drive-by refactor" urge → forbidden; log a TODO in OPEN_QUESTIONS.md.
5. Philological doubts → the data card governs (as amended by snapshots); never edit numbers ad hoc.

---

## §9 Final Acceptance Checklist (root ticks every box before declaring done)

**Product**
- [ ] All 10 machine pages reachable; homepage cards complete (render thumbnails, not placeholders)
- [ ] U1: explode + step assembly on every machine
- [ ] U2: ≥1 draggable drive per machine, full chain at exact ratios, reverse correct (incl. astroclock reverse blocked by the celestial lock)
- [ ] U3: five dual-scheme machines switch + comparison table; side-by-side dual viewports with camera/drive linkage work
- [ ] U4: any part click shows: quote (with source link), ancient + metric dimensions, provenance badge, controversies
- [ ] U5 (enhancement): docent mock e2e green; keyed deploys answer with chips and rate-limit; keyless deploys hide the entry (503 probe); production failures fail closed (unavailable, never mock); disabled by default without shared rate-limit storage
- [ ] U6: all ten ingenuity cards complete (hook/demo/echo bilingual, matching §7's "Ingenuity" rows); `spotlight` one-tap demos finish ≤10 s with the done badge; e2e U6 green; the three flagship stories contain ingenuity chapters
- [ ] Four-layer galleries complete; CC attribution (author/licenseUrl/attributionText, sourced from the Commons API, validator-enforced); linkout fallback works
- [ ] zh/en toggle sitewide with zero missing keys

**Engineering**
- [ ] `pnpm test` (core/sim/validate/data/machines suites) green
- [ ] `pnpm validate` (**strict manifest mode, no --partial**): any missing machine fails; 10 reports with 0 fails, **every scheme independently green**; reports carry the achieved `resolutionDeg`; golden assertions in place (1/100, 1/1000, chariot holds south, censer stays level); CI's `VALIDATE_FLAGS` is the empty string
- [ ] `pnpm snapshot-sources`: all ten machines' quotes `quoteFound:true` (offline degradation honestly labeled in reports and UI)
- [ ] `pnpm poison`: four needles (tooth/limit/transient-collision/provenance) + the chariot 47-tooth fifth all caught
- [ ] Asset closed loop: a clean clone deploys fully via `pnpm install && pnpm build`; no dead gallery links (optimized assets committed, ≤300 KB each, ≤25 MB total)
- [ ] `pnpm e2e` green (incl. the 10-machine smoke loop)
- [ ] `pnpm build` green; first-route chunk <500 KB gz; public deployment reachable
- [ ] artifacts/: 10 extractions + 10 audits archived; .codex/ultracode/runs/ ledger complete
- [ ] Committed artifacts sanitized: spot-check ledger/artifacts/reports for absolute user paths, session IDs, org/tenant identifiers, internal endpoints — none present; raw transcripts not committed
- [ ] git tags wave-1…wave-6 present; deletion audits clean (no teammate files lost)

**Submission (if competing)**
- [ ] README's "How Codex accelerated this" — every sentence carries an artifact link
- [ ] Video <3:00 recorded (Codex UI + GPT-5.6 on screen)
- [ ] Session ID in docs/SUBMISSION_NOTES.md
- [ ] Clean-clone README walkthrough passes
- [ ] Submitted before 12:00 PDT 07-21

---

*End of plan. Every deviation during execution must leave a trace in the ledger and OPEN_QUESTIONS.md. Good building —「工欲善其事，必先利其器」.*
