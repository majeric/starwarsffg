# Restructure State

**Current phase:** phase-00-foundation
**Current task:** 0.1 — Create package.json with build/test dependencies
**Last verified:** never (Phase 0 has not started)
**Last commit on plan:** (initial bootstrap)

---

## Phase progress

- [ ] phase-00-foundation       ← CURRENT
- [ ] phase-01-calculators
- [ ] phase-02-settings
- [ ] phase-03-hooks
- [ ] phase-04-prototype-cleanup
- [ ] phase-05-datamodels
- [ ] phase-06-derived-split
- [ ] phase-07-ae-unification
- [ ] phase-08-sheets
- [ ] phase-09-importer
- [ ] phase-10-system-abstraction
- [ ] phase-11-migration-infra
- [ ] phase-12-typescript

---

## Current phase tasks (phase-00-foundation)

See `phases/phase-00-foundation.md` for the full task definitions.

- [ ] 0.1 — Create package.json with build/test dependencies   ← CURRENT
- [ ] 0.2 — Add vite.config.mjs configured for Foundry ESM output
- [ ] 0.3 — Add tsconfig.json with allowJs and strict-but-permissive defaults
- [ ] 0.4 — Add ESLint and Prettier configuration
- [ ] 0.5 — Add vitest configuration and global Foundry mocks
- [ ] 0.6 — Create scripts/verify.mjs orchestrator
- [ ] 0.7 — Add Foundry V13 type definitions
- [ ] 0.8 — Wire existing tests/modifiers.test.js to vitest (expect failures, document them)
- [ ] 0.9 — Add CI workflow (.github/workflows/ci.yml)
- [ ] 0.10 — Add .restructure/ to .gitignore
- [ ] 0.11 — Verify `npm run verify` runs end-to-end (even if some tests fail; that's documented)
- [ ] 0.12 — Verify Foundry V13 still loads the system after build

---

## Open issues

(none)

---

## Session log

Sessions append to `.restructure/sessions/<UTC-timestamp>.md`. Latest:

(none yet — phase 0 has not started)

---

## How to update this file

When a task moves to in-progress:
- Update `**Current task:**` line at the top

When a task completes:
- Check off its box in "Current phase tasks"
- Update `**Last verified:**` to current UTC timestamp (only if `npm run verify` passed)
- Update `**Last commit on plan:**` to the new commit short SHA

When a phase completes:
- Check off the phase box in "Phase progress"
- Set `**Current phase:**` to the next phase
- Copy the next phase's task list from its phase file into "Current phase tasks"
- Set `**Current task:**` to the first task of the new phase

If blocked:
- Write the blocker under "Open issues" with date and context
- Stop the session (do not start a different task to avoid the block)
