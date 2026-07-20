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

## Recurring failure patterns
- A `sourceRef` may represent a composite source (`source-a + source-b`); resolve and validate every trimmed component, never the concatenated string as one source id.
- Changes to `src/machines/<slug>/build.ts`, `parts.json`, or schemes must be checked against the resolved base spec and every scheme patch; do not validate only the raw JSON.
- Custom/composite geometry must preserve valid bounds, normals, and material metadata after merge/transform operations; dispose of temporary geometries after a successful merge.
- Viewer or geometry changes need both deterministic validation and the visual gate before merge; retain generated optimized render assets, but never add raw captures or run logs.
