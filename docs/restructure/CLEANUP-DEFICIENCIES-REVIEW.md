# Cleanup, Deficiencies, and Architecture Review

Review date: 2026-05-31

Scope: `docs/restructure/README.md`, the current uncommitted working-tree
changes, and the architecture implied by the restructure runbook after Phase 12.

## Verification Snapshot

Commands run:

- `npm run verify`
- `npm run verify -- --no-fail-fast`
- `npx vitest run tests/common.test.js`

Observed state:

- Typecheck: pass.
- Unit tests: pass when `--no-fail-fast` allows the gate to run.
- Build: pass.
- Smoke load: pass.
- Migration replay: pass, but there are still no fixtures.
- Lint: fail with 1,338 warnings and 0 errors.

Important process note: `npm run verify` now stops at lint by default, so the
plain command no longer proves tests/build/smoke/migrations are still green
behind the known lint failure. The non-fail-fast run did prove those later gates
currently pass.

## High Priority

### H1. `verify.mjs` default fail-fast conflicts with the runbook

Files:

- `scripts/verify.mjs`
- `docs/restructure/README.md`
- `docs/restructure/VERIFICATION.md`
- `docs/restructure/STATE.md`

Problem: `scripts/verify.mjs` now defaults to fail-fast and requires
`--no-fail-fast` for the old run-all behavior. The runbook and verification docs
say the orchestrator runs every gate and prints every status before exiting.
That behavior was intentionally added because lint is known-red during the
restructure.

Impact: a normal `npm run verify` stops at lint, so sessions cannot see whether
unit tests, build, smoke load, or migration replay regressed. This weakens the
runbook's "single source of truth" contract.

Recommended cleanup:

- Make run-all the default again.
- Add optional `--fail-fast` for local speed.
- Update `VERIFICATION.md` only if the intended contract changes.

### H2. `system.json` now has development-only `dist/` ESM paths

Files:

- `system.json`
- `vite.config.mjs`
- `scripts/smoke-load.mjs`

Problem: root `system.json` now points Foundry at
`dist/modules/dice-pool-ffg.js` and `dist/modules/swffg-main.js`. The Vite build
rewrites `dist/system.json` back to `modules/...`, so there are now two manifest
modes:

- root manifest: in-place development install that depends on `dist/`
- dist manifest: packaged install where `modules/...` is correct

This may be intentional, but it is not documented in the runbook and
`smoke-load.mjs` only checks file existence. It does not prove Foundry will load
the root manifest correctly with styles, templates, scripts, and assets split
between root and `dist/`.

Impact: publishing or installing the wrong manifest shape can produce a system
that looks valid to smoke-load but fails in Foundry.

Recommended cleanup:

- Document the dual-manifest strategy explicitly, or replace it with a generated
  dev manifest.
- Add a smoke assertion for the expected install mode, not just file existence.
- Make packaging instructions state whether the root or `dist/` directory is
  the installable artifact.

### H3. Phase 7 migration can still drop unmappable user modifiers

Files:

- `modules/active-effects/attribute-to-ae.ts`
- `modules/migrations/3.0.0-attributes-to-ae.ts`
- `tests/active-effects/attribute-to-ae.test.js`

Problem: `attributesToEffectData()` filters out changes whose key is
`undefined` and skips the whole effect when no changes remain. The migration
then clears all user `attr*` keys regardless of whether an Active Effect was
created.

This conflicts with ADR-014, which says unmappable entries should become
disabled review effects instead of being silently dropped.

Impact: a user-authored modifier with an unrecognized type/path can be deleted
from `system.attributes` without any replacement effect.

Recommended cleanup:

- Preserve unmappable entries as disabled "review required" Active Effects.
- Add a unit test that proves an unknown user `attr*` survives migration as a
  disabled effect.
- Add at least one migration fixture before treating the migration as safe.

### H4. Migration verification still has no real fixtures

Files:

- `scripts/replay-migrations.mjs`
- `docs/restructure/PRINCIPLES.md`
- `docs/restructure/STATE.md`

Problem: migration replay reports success with "no fixtures yet." This is known
state, but it remains the largest safety gap because the restructure has already
introduced DataModels and Active Effect migrations.

Impact: the codebase has a migration gate, but it does not yet prove migration
behavior. That undermines ADR-002's "never break an existing world" guarantee.

Recommended cleanup:

- Add minimal JSON fixtures for the high-risk paths: pre-1.907 attributes,
  post-1.907 leftover `attr*`, species thresholds, and compendium paths.
- Decide whether replay should execute document-like migration behavior through
  mocks or whether a Foundry-runtime migration smoke is required.
- Make "no fixtures yet" a warning state rather than a confidence signal.

## Medium Priority

### M1. Lint baseline regressed from 422 to 1,338 warnings

File: `eslint.config.mjs`

Problem: TypeScript ESLint recommended rules are now enabled as warnings. That
is directionally good, but `STATE.md` still records the previous lint known-red
count of 422 warnings.

Impact: the warning increase is not actionable as a gate because everything is
still warning-level and `--max-warnings 0` fails all of it. Contributors cannot
tell whether new work made lint meaningfully worse.

Recommended cleanup:

- Update the documented lint baseline if this rule set is accepted.
- Split warning debt by category: `@ts-nocheck`, `no-explicit-any`, unused
  variables, legacy style, size/complexity.
- Consider excluding or separately tracking `@ts-nocheck` files while strict
  typing is paid down.

### M2. Maintainability lint is not applied consistently to TypeScript modules

Files:

- `eslint.config.mjs`
- `modules/dice/pool.ts`

Problem: `PRINCIPLES.md` says files are limited to 500 lines and functions to 50
lines. `modules/dice/pool.ts` is 506 lines and its constructor is much larger
than 50 lines, but the strict maintainability rules currently apply only to
selected TypeScript directories.

Impact: new TypeScript code can violate the human-readability contract without
lint catching it.

Recommended cleanup:

- Apply maintainability rules to all `modules/**/*.ts`.
- Use explicit temporary exceptions for legacy files that are not ready yet.
- Split `DicePoolFFG` source-tooltip mapping into a table plus a small formatter.

### M3. `POST-PHASE-12-ISSUES.md` is now partially stale

File: `docs/restructure/POST-PHASE-12-ISSUES.md`

Problem: that document lists several items that the current working tree appears
to address, including the null-safe species threshold lookup, `rules-system`
missing-name sort, `Array.isArray`, `allowJs` removal, sheet `defaultOptions`,
and dice tests.

Impact: keeping stale cleanup docs makes future sessions waste time
rediscovering which issues are still real.

Recommended cleanup:

- Either update that document after this review lands, or replace it with this
  current review as the canonical cleanup list.

### M4. `Helpers.diff` still has under-tested edge cases

Files:

- `modules/helpers/common.ts`
- `tests/common.test.js`

Problem: the new array test covers one old bug, but `diff()` still treats
objects, arrays, null-like values, and missing keys through the same recursive
path. For example, changing a nested object to `null` or vice versa is likely to
produce surprising output.

Impact: callers may receive partial or empty diffs for real changes.

Recommended cleanup:

- Define the intended diff contract before adding more behavior.
- Add tests for object-to-null, null-to-object, array length changes, deleted
  nested keys, and identical nested references.
- Replace the ad hoc recursion with a small pure helper that classifies arrays,
  plain objects, and primitives explicitly.

## Low Priority

### L1. `itemPillHover` is extracted but remains presentation debt

File: `modules/helpers/item-pill-hover.ts`

Problem: extraction removed one export from `swffg-main.ts`, which is good, but
the helper is still `@ts-nocheck`, jQuery-dependent, and builds tooltip HTML
from data attributes directly.

Recommended cleanup:

- Type the event and required dataset fields.
- Move tooltip data extraction into a pure function with tests.
- Keep DOM mutation as the thin outer shell.

### L2. Dice tests cover the new critical path but not the full dice surface

Files:

- `tests/dice/pool.test.js`
- `tests/dice/roll.test.js`

Problem: the new tests cover upgrade/downgrade, formula rendering, remove
setback, and result cancellation. They do not yet cover string numeric inputs,
invalid JSON constructor input, added triumph/despair side effects, force-only
rolls, or die-term evaluation.

Recommended cleanup:

- Add table-driven tests for all shorthand dice codes.
- Add `RollFFG` tests for added results from constructor options.
- Add one test proving dice-term result aggregation stays numeric.

## README and Runbook Findings

The README is useful as a cold-start index, but it has drifted from the more
detailed protocol files:

- README "first 5 commands" omits `decision-log.md`, while
  `SESSION_PROTOCOL.md` requires it.
- README says `npm run verify` must be run and worked before changing anything,
  but the current default verify behavior stops at lint and does not show later
  gates.
- README "last 3 commands" says `git status` must show only files touched, while
  `SESSION_PROTOCOL.md` says session-end status should show intentionally
  touched files committed. The exact expected dirty state should be made
  unambiguous.
- README says normal feature work is outside the restructure protocol, but it
  does not say how to handle meta-review work like this audit. A short exception
  note would prevent future sessions from incorrectly updating `STATE.md` or
  making a phase commit for review-only work.

Recommended cleanup:

- Make README a thin pointer to `SESSION_PROTOCOL.md` rather than duplicating
  command lists.
- Keep only one authoritative startup/shutdown checklist.
- Add a "review-only/session audit" paragraph explaining what to verify and what
  not to update.

## Architecture Assessment

The restructure has made real progress: DataModels exist, settings/hooks are
more decomposed, migrations are versioned, Vite/TypeScript are in place, and
rules calculators have tests. The remaining maintainability cost is now
concentrated in a few large legacy surfaces.

The biggest human-maintainability gaps are:

- 89 files still use `@ts-nocheck`, including core actor, item, combat,
  importer, settings, and dice modules.
- 12 TypeScript files under `modules/` are still over 500 lines, led by
  `actor-sheet-ffg.ts`, `import-helpers.ts`, `item-sheet-ffg.ts`,
  `character-creator.ts`, `swffg-main.ts`, and `combat-ffg.ts`.
- The target `documents/` boundary does not exist yet; actor/item document logic
  still lives in legacy `modules/actors` and `modules/items`.
- The target "single modifier pipeline" is not fully reached. There are still
  many references to `system.attributes`, `*.adjusted`, `adjusteditemmodifier`,
  and legacy item modifier calculations.
- `template.json` still carries redundant schema definitions even though
  DataModels are now the real schema authority.
- The sheet layer is split by type at registration, but the base actor and item
  sheets are still large AppV1-style monoliths. A small per-type change still
  often requires reading the base sheet.

## Suggested Improvement Roadmap

1. Restore verification semantics first.
   Make run-all verify the default again, document the lint baseline, and make
   migration fixture absence visible.

2. Protect migrations.
   Add fixtures and fix the unmappable-attribute data-loss path before further
   schema removals or V14 certification.

3. Turn the lint warning flood into tracked work.
   Categorize warnings and create a burn-down plan. Start with `@ts-nocheck`
   removal on pure or nearly pure modules.

4. Enforce maintainability uniformly.
   Apply file/function/complexity rules to all TypeScript and use narrow
   exceptions for legacy files. This prevents new debt while old debt is paid
   down.

5. Finish the modifier boundary.
   Move item adjusted values and remaining attribute flows behind Active Effects
   and derived state. This is the highest-leverage domain cleanup because it
   reduces duplicated calculation paths.

6. Collapse the remaining monoliths by workflow.
   For sheets, extract workflows such as XP log, crew, item drag/drop, modifier
   editing, and roll dialogs into named modules. Avoid abstract sheet frameworks;
   use boring per-workflow files that a maintainer can locate by name.

7. Create the document boundary.
   Move actor/item lifecycle logic into `modules/documents/` once behavior is
   covered by tests. Keep `data/` for schema, `rules/` for pure calculation,
   `documents/` for lifecycle, and `sheets/` for presentation.

8. Trim `template.json` last.
   Do it after migration fixtures exist and after sheet/template reads are known.
   Treat it as a schema-removal migration, not a cosmetic cleanup.

