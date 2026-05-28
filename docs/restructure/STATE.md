# Restructure State

**Current phase:** phase-00-foundation
**Current task:** 0.7 — Add Foundry V13 type definitions
**Last verified:** never (Phase 0 has not started)
**Last commit on plan:** 2de8b3e

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

- [x] 0.1 — Create package.json with build/test dependencies
- [x] 0.2 — Add vite.config.mjs configured for Foundry ESM output
- [x] 0.3 — Add tsconfig.json with allowJs and strict-but-permissive defaults
- [x] 0.4 — Add ESLint and Prettier configuration
- [x] 0.5 — Add vitest configuration and global Foundry mocks
- [x] 0.6 — Create scripts/verify.mjs orchestrator
- [ ] 0.7 — Add Foundry V13 type definitions   ← CURRENT
- [ ] 0.8 — Wire existing tests/modifiers.test.js to vitest (expect failures, document them)
- [ ] 0.9 — Add CI workflow (.github/workflows/ci.yml)
- [ ] 0.10 — Add .restructure/ to .gitignore
- [ ] 0.11 — Verify `npm run verify` runs end-to-end (even if some tests fail; that's documented)
- [ ] 0.12 — Verify Foundry V13 still loads the system after build

---

## Open issues

- 2026-05-28 — Phase 0 bootstrap mismatch documented and reconciled by human
  direction. Task 0.1 expected no root `package.json`, but this checkout already
  had a legacy `package.json` and tracked `package-lock.json`. The legacy manifest
  was replaced with the task 0.1 manifest and `npm install` regenerated the lockfile.
  `npm install` exited 0 but warned because local Node v20.3.0 is below ESLint 9's
  dependency engine floor (`^20.9.0`), even though the phase precondition only says
  Node >=20.x.
- 2026-05-28 — Phase 0 task 0.2 verification note, resolved by task 0.6.
  `npm run build` succeeded and `dist/` contained the required Foundry files,
  but `npm run --silent verify` still exited in the pre-existing
  `scripts/verify.mjs` placeholder before it could reach the build gate.
  Human direction for this session was to document bootstrap mismatches and
  keep working through the Phase 0 tooling setup.
- 2026-05-28 — Phase 0 task 0.4 reconciliation note. This checkout already had a
  legacy `eslint.config.mjs` that depended on packages removed by task 0.1. The
  config was replaced with the Phase 0 flat config. Because `modules/settings/`
  already exists as legacy code in this checkout, maintainability rules apply as
  warnings there until a later phase tightens them.
- 2026-05-28 — Phase 0 task 0.5 dependency note. Task 0.5 requires a DOM test
  environment, but task 0.1 omitted both `jsdom` and `happy-dom`. ADR-007 records
  the decision to add `happy-dom`. Vitest configuration now loads; existing test
  collection/import failures remain for task 0.8.
- 2026-05-28 — Phase 0 task 0.6 verification note. `npm run verify` now runs the
  orchestrator, passes typecheck, and fails at lint because existing legacy files
  produce 1023 warnings under `--max-warnings 0`. Task 0.11 owns formal
  documentation of Phase 0 known failures in `VERIFICATION.md`.

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
