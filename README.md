# MECHANICA

MECHANICA is a bilingual digital museum where four lost ancient Chinese
machines run again as physically simulated, source-cited 3D reconstructions.

## Live demo

[Open the museum](https://mechanica-museum.vercel.app).

No login is required, and the museum works in any modern browser.

## The four machines

- **Zhang Heng's Seismoscope (候风地动仪)** — Eastern Han, 132 CE,
  Luoyang.
- **Water-Powered Astronomical Clock Tower (水运仪象台)** — Northern Song;
  a wooden model was made in 1088 and the tower was completed at Bianjing in 1092.
- **Odometer Drum Carriage (记里鼓车（大章车）)** — Han origin; Lu Daolong's
  complete tooth counts survive from 1027.
- **Laoguanshan Han Pattern Loom (老官山一勾多综提花织机)** — Western Han,
  about 157–88 BCE; excavated in 2013 from Laoguanshan tomb M2 in Chengdu.

These dates and names come directly from the machine manifests in
[`src/data/machines`](./src/data/machines).

## What makes it different

- **Every dimension is traceable.** Measurements and modeled parts carry
  provenance as a historical text, a surviving artifact, or a stated
  inference. The interface exposes that distinction instead of flattening it
  into false certainty.
- **Rival reconstructions remain visible.** Scholarly alternatives can be
  compared side by side and swapped with one click. The seismoscope, for
  example, preserves both Wang Zhenduo's and Feng Rui's proposed internal
  mechanisms.
- **The machines work.** These are driveable simulations, not turntable-only
  models. A visitor can arm a bearing, inject a quake, and watch the causal
  chain travel through the mechanism.
- **Chinese and English are first-class.** Navigation, machine records,
  explanations, controls, captions, and the docent are bilingual throughout.

## Built with Codex + GPT-5.6

I planned; Codex typed. Every line of code in this repo was written by OpenAI
Codex sessions.

I ran three Codex sessions in parallel. Each session owned its own files, and
their work merged only through checkpoint gates. That separation mattered:
geometry, interaction, and presentation work could proceed concurrently
without silently rewriting one another's evidence.

[`AGENTS.md`](./AGENTS.md) declares the working rules. In particular, data is
law: `src/data/**`, machine facts, and the validator are off-limits to visual
sculpting tasks. A more attractive reconstruction cannot overrule a cited
measurement or quietly erase an inference label.

The in-app docent runs on GPT-5.6 through the OpenAI Responses API in
[`api/docent.ts`](./api/docent.ts). The API key stays on the server. Answers
stream to the browser over server-sent events, and source markers become
citation chips in the interface.

The docent receives only the current museum record, selected part and
reconstruction, plus the four-machine index. Its instructions require a
source marker after factual claims and require it to refuse questions outside
the museum data instead of filling gaps with invented facts.

This division is deliberate: Codex built and checked the museum, while the
runtime model is constrained to explain the evidence already committed to the
repository.

## Verification

The current local test run passes **267 unit tests across 30 test files**:

```bash
pnpm test
```

The repository also has three higher-level gates:

- `pnpm e2e` builds the application and runs the Playwright browser scenario
  gate.
- `pnpm validate` runs [`scripts/validate.mts`](./scripts/validate.mts), which
  checks data and source snapshots, resolves each reconstruction, and sweeps
  geometry, motion ranges, collisions, ratios, and provenance over thousands
  of sampled states.
- `pnpm poison` runs
  [`scripts/poison-test.mts`](./scripts/poison-test.mts). It deliberately
  corrupts a gear ratio, a joint range, a transient collision, and dimension
  provenance to prove that the validator catches every planted needle.

Validation is not a claim that a disputed historical reconstruction is the
only correct answer. It checks that each declared reconstruction is internally
consistent, mechanically inspectable, and honest about the evidence behind
it.

## Quickstart

Requirements: a current Node.js installation and `pnpm`.

Install dependencies and start the local Vite server:

```bash
pnpm install && pnpm dev
```

Open the local URL printed by Vite. The museum itself does not require an
OpenAI API key.

Optional verification commands:

```bash
pnpm test
pnpm e2e
pnpm validate
```

## Optional docent setup

The docent is an optional server-side feature. Set the following environment
variable in the deployment environment:

```bash
OPENAI_API_KEY=your_server_side_key
```

`OPENAI_MODEL` is optional; the current default is `gpt-5.6`.

The docent also requires a shared daily-limit store. For an environment
without KV, explicitly opt into the approximate in-memory limit:

```bash
DOCENT_ACCEPT_APPROX_LIMITS=1
```

Without `OPENAI_API_KEY`, the docent hides itself and the rest of the museum
continues to work normally.

Do not expose the API key through client-side Vite variables or commit it to
the repository.

## OpenAI Build Week 2026

Built for **OpenAI Build Week 2026 — Education**.
