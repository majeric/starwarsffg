# Restructure State

**Current phase:** phase-00-foundation
**Current task:** 0.8 — Wire existing tests/modifiers.test.js to vitest (expect failures, document them)
**Last verified:** never (Phase 0 has not started)
**Last commit on plan:** cf87a04

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
- [ ] phase-13-v14-compat

---

## Current phase tasks (phase-00-foundation)

See `phases/phase-00-foundation.md` for the full task definitions.

- [x] 0.1 — Create package.json with build/test dependencies
- [x] 0.2 — Add vite.config.mjs configured for Foundry ESM output
- [x] 0.3 — Add tsconfig.json with allowJs and strict-but-permissive defaults
- [x] 0.4 — Add ESLint and Prettier configuration
- [x] 0.5 — Add vitest configuration and global Foundry mocks
- [x] 0.6 — Create scripts/verify.mjs orchestrator
- [x] 0.7 — Add Foundry V13 type definitions
- [ ] 0.8 — Wire existing tests/modifiers.test.js to vitest (expect failures, document them)   ← CURRENT
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
- 2026-05-28 — Session start blocker before Phase 0 task 0.7. `git status`
  showed uncommitted ADR-008/V13+V14 planning docs and an untracked
  `docs/restructure/phases/phase-13-v14-compat.md` before task work started.
  `SESSION_PROTOCOL.md` requires a clean repository before `npm run verify` or
  new work, so task 0.7 was not started. Reconcile the pending planning docs
  before continuing with Foundry V13 type definitions.
- 2026-05-28 — Human direction changed blocker handling: blockers are now
  documented and worked through in-session when locally solvable. Task 0.7
  continued under the revised protocol. The pre-existing ADR-008 planning docs
  remain uncommitted and should not be mixed into task-specific commits unless
  intentionally reconciled.
- 2026-05-28 — Phase 0 task 0.7 verification note. `npx tsc --noEmit` passed
  after adding Foundry V13 types and removing the temporary `types/.smoke.ts`
  file. `npm run verify` still passes the typecheck gate and fails at the
  pre-existing lint gate with 1023 warnings; this is the same Phase 0 known
  failure owned by task 0.11. Installing `fvtt-types` also produced the already
  documented local Node v20.3.0 engine warnings and reported npm audit findings
  in dev-only transitive dependencies.

---

## Session log

Sessions append to `.restructure/sessions/<UTC-timestamp>.md`. Latest:

`.restructure/sessions/2026-05-28T06-54-10Z.md`

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
- Work through the blocker inside the current task scope
- Stop only if it requires human input or external state you cannot provide
