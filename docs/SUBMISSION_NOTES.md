# Submission Notes

## Codex run

The Build Week Session ID is supplied directly in Devpost and intentionally not stored in this repository. Run identifiers are omitted from committed artifacts.

## Verification excerpts

### GATE-3 poison needles

- `pnpm poison` printed `caught by the validator ✓` four times for ratio, range, transient-collision, and dimension-provenance corruption.
- Temporarily changing the Chariot's sourced central wheel from 48 to 47 teeth made strict `pnpm validate` exit 1 with 12 ratio/contact failures across base and both reconstruction schemes.
- Restoring 48 teeth returned strict validation to exit 0 with all ten reports green.

### Phase 6 provenance and visual evidence

- `pnpm snapshot-sources` verified all 33 quotation receipts across all ten machines with no offline exceptions.
- The final all-machine Visual Gate reviewed default, alternate, and exploded or animated browser states for every route. All ten passed framing, semantic-silhouette, interaction, and console-error checks before the 40 reconstruction renders were generated and independently reviewed.
- The preliminary exact release chain passed: `pnpm test` 181/181, strict `pnpm validate`, `pnpm poison` with four expected catches, `pnpm e2e` 30/30, and `pnpm build`. It must be repeated after the GPT audit artifacts are generated and reconciled.
- An isolated clone of commit `2b353d2` passed `pnpm install --frozen-lockfile` and `pnpm build`; its production output contains all 40 committed render JPEGs.
- With `OPENAI_API_KEY` absent, `pnpm extract` and `pnpm run audit` log the plan's keyless skip and exit 0. The final §9 artifact-count gate is stricter: the required ten GPT-5.6 extractions and ten independent audits have not been generated, so Wave 6 remains blocked and untagged.
