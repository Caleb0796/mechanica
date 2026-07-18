# Submission Notes

## Codex Session ID

`019f7356-3808-7a10-a445-faf293232674`

## Verification excerpts

### GATE-3 poison needles

- `pnpm poison` printed `caught by the validator ✓` four times for ratio, range, transient-collision, and dimension-provenance corruption.
- Temporarily changing the Chariot's sourced central wheel from 48 to 47 teeth made strict `pnpm validate` exit 1 with 12 ratio/contact failures across base and both reconstruction schemes.
- Restoring 48 teeth returned strict validation to exit 0 with all ten reports green.
