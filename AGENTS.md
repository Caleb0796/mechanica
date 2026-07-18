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
