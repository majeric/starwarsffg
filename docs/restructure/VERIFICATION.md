# Verification

`npm run verify` is the single source of truth for "is the codebase OK?"
Every session runs it at the start and after every task.

It runs gates in this order, reporting every gate before exiting:

| Order | Gate | Command | Purpose |
|---|---|---|---|
| 1 | typecheck | `npx tsc --noEmit` | catches type regressions in .ts files and JSDoc-typed .js |
| 2 | lint | `npx eslint . --max-warnings 0` | style, size, complexity (PRINCIPLES.md 28-30 enforced here) |
| 3 | comments | `node scripts/check-comments.mjs` | flags vacuous WHAT-comments per PRINCIPLES.md 31 (heuristic) |
| 4 | unit tests | `npx vitest run` | logic correctness |
| 5 | build | `npx vite build` | the system can actually be built |
| 6 | smoke load | `node scripts/smoke-load.mjs` | system.json parses and module entry point loads |
| 7 | migration replay | `node scripts/replay-migrations.mjs` | migrations work against fixture worlds |

Once `scripts/verify.mjs` is in place (Phase 0.6), running `npm run verify`
invokes the orchestrator which runs all gates in order and prints a final
summary. The command exits 0 only when every gate passes.

---

## What "green" means

Every gate exits 0. Warnings are not allowed (`--max-warnings 0` on lint, no
`console.warn` calls from the build).

If a gate has known-tolerated failures (e.g., the legacy modifiers test suite
during early phases), they are listed here under "Known failures" with the
task that will fix them.

## Known failures

### lint — legacy codebase warnings under `--max-warnings 0`
**Gate:** lint
**Discovered:** 2026-05-28
**Owning task:** phase-00 task 0.11 (document) / phase-12 task TBD (tighten)
**Workaround:** Tolerated for Phase 0 exit. The current legacy codebase emits
1023 ESLint warnings, mostly from legacy Foundry globals, oversized files and
functions, complexity limits, unused variables, and old Mocha/Cypress globals.
Later phases fix these as files are moved into the restructured architecture;
CI records the verify exit code but does not enforce it during Phase 0.

### tests/modifiers.test.js — legacy custom-runner suite quarantined
**Gate:** unit tests
**Discovered:** 2026-05-28
**Owning task:** phase-00 task 0.8 (document) / phase-05 task TBD (fix)
**Workaround:** `tests/modifiers.test.js` is a skipped Vitest marker. The
preserved legacy suite lives at `tests/modifiers.test.js.legacy` until its
fixtures are rewritten from legacy `data:` shape to DataModel-era `system:`
shape.

### tests/common.test.js — legacy custom-runner suite quarantined
**Gate:** unit tests
**Discovered:** 2026-05-28
**Owning task:** phase-00 task 0.8 (document) / phase-05 task TBD (fix)
**Workaround:** The file keeps its legacy export for reference and includes a
skipped Vitest marker so `npx vitest run` reports the debt without failing
collection.

Format for entries:

```
### tests/modifiers.test.js — fixtures use `data:` instead of `system:`
**Gate:** unit tests
**Discovered:** 2026-05-27
**Owning task:** phase-00 task 0.8 (document) / phase-05 task 5.X (fix)
**Workaround:** The vitest config marks this file as `expect-failure` until
                fixtures are rewritten after DataModels exist.
```

---

## When verify fails

1. Read the gate's output carefully
2. Identify which file or test is failing
3. Decide:
   - Is this caused by my current task's changes? → fix in-task
   - Is this a pre-existing failure not in "Known failures"? → STOP, document in `STATE.md` "Open issues"
   - Is this a known failure I just regressed? → fix in-task; do not move a known failure into a worse state
4. If the failure is genuinely outside your task's scope and not previously known, treat it as a **blocker** per `SESSION_PROTOCOL.md`

---

## Future gates (per ADR-008)

The smoke-load gate currently runs against whichever Foundry version is
installed locally. Per ADR-008, the system targets both V13 and V14. Phase 13
adds a dual-target smoke gate:

| Order | Gate | Command |
|---|---|---|
| 6a | smoke load V13 | `FOUNDRY_VERSION=13 node scripts/smoke-load.mjs` |
| 6b | smoke load V14 | `FOUNDRY_VERSION=14 node scripts/smoke-load.mjs` |

Until V14 is available locally, the V13 smoke is the only enforced gate;
the V14 gate is deferred to Phase 13. New code added by intermediate phases
should still follow PRINCIPLES.md 39-40 (feature detection, no deprecated
APIs) so the eventual V14 certification is straightforward rather than a
large remediation effort.

## Adding a new gate

Gates are added by ADR. Steps:

1. Open an ADR proposing the gate (what it checks, why, when it should fail)
2. Once accepted, add the gate to `scripts/verify.mjs` in the appropriate order
   (cheap gates earlier, expensive gates later)
3. Update this document
4. Run `npm run verify` from a clean tree; if existing code fails the new gate,
   either fix the code in the same task or list as a known failure with a
   linked owning task

## Removing a gate

Same process. Removal must be justified (gate is redundant, was wrong, etc.).
Do not remove a gate to make verify pass.

---

## CI vs local

`npm run verify` is the same locally and in CI. CI may add additional checks
(matrix builds, browser smoke tests). Local verify is the floor; CI may be
stricter, never weaker.
