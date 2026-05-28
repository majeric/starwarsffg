# Restructure Principles

These rules are non-negotiable. Every session, every model, every task.

If a principle conflicts with what a task seems to require, **the principle
wins** and the task description is wrong — flag it in `STATE.md` "Open issues"
and stop.

---

## Scope discipline

1. **Do exactly what the current task in `STATE.md` says. Nothing more, nothing less.**
2. If you notice an adjacent issue, add it to `STATE.md` "Open issues" and continue. Do not fix it.
3. Do not rename files, symbols, or directories unless the task explicitly says so.
4. Do not introduce new npm dependencies unless the task explicitly says so. New dependency = new ADR in `architecture/decision-log.md` *before* the install.
5. Do not refactor code adjacent to your edit "because you're already there." Each cleanup gets its own task.

## Verification discipline

6. Run `npm run verify` after every task. If red, the task is not done.
7. Never use `--no-verify`, `--skip-tests`, `--force`, or equivalent bypass flags.
8. If a test that previously passed now fails, you broke something. Investigate. Do not delete or skip the test.
9. If a test that previously failed now passes, that's a win — keep it that way.
10. Do not modify a test to make it pass. If a test is genuinely wrong, that's a separate task with its own justification.

## Migration discipline

11. Any change to persisted data shape requires a migration file in `modules/migrations/` (or the chosen migration directory once Phase 11 establishes it).
12. Migrations are tested against fixtures in `test-worlds/`. New schema changes must include at least one fixture demonstrating the migration works.
13. Never modify an already-shipped migration. If logic was wrong, write a follow-up migration that corrects it.
14. Migrations are forward-only. The plan does not require down-migrations.

## API discipline

15. Use only Foundry V13 APIs. If an API isn't typed in `types/foundry-v13.d.ts`, add the type definition; do not bypass typing.
16. No prototype monkey-patching (`SomeClass.prototype.x = function...`). Use class inheritance plus the appropriate `CONFIG.<Document>.documentClass` or `CONFIG.<placeable>.objectClass` registration.
17. Foundry document classes (Actor, Item, ActiveEffect, etc.) are extended once, registered once, in the init hook.

## Session discipline

18. Read `STATE.md` first thing. Update `STATE.md` last thing. Both are mandatory.
19. Commit per task, not per session. One task = one commit (or one merge commit if the task naturally splits into trivially sequential edits).
20. Commit message format: `phase NN.MM: <task title from STATE.md>` (e.g. `phase 01.2: extract encumbrance calculator`).
21. If blocked, write the blocker in `STATE.md` "Open issues" and stop. Do not improvise.
22. Do not start the *next* task in the same session that completed the previous one unless the phase file explicitly groups them.

## Decision discipline

23. If a task requires a judgment call not specified in the phase file, append an ADR to `architecture/decision-log.md` **before** acting on it.
24. Never relitigate a decision already in `decision-log.md`. Follow it. If it's genuinely wrong, the way to change it is a new ADR that supersedes the old one — flag this as an Open issue rather than acting unilaterally.

## Code-style discipline

25. Match the existing style of the file you are editing. The restructure is about architecture, not cosmetics.
26. Do not run automated formatters across files outside your task scope.
27. ESLint and Prettier configurations are authoritative; do not override them locally.

## Human readability discipline

These rules exist because the restructure may stop partially complete and
because future maintenance happens without AI. See ADR-006.

28. **File size: 500 lines maximum.** If a task would produce a larger file,
    the task is too large — split it or split the file. Enforced by ESLint
    `max-lines`.
29. **Function size: 50 lines maximum.** Extract if larger. Enforced by ESLint
    `max-lines-per-function`.
30. **Cyclomatic complexity: 10 maximum per function.** Enforced by ESLint
    `complexity`. If you exceed it, the function has too many branches —
    extract or simplify.
31. **Comments explain WHY, never WHAT.** `// loop through items` is noise;
    delete it. A comment is justified when it explains a non-obvious
    constraint, an intentional deviation from the obvious approach, or a
    reference to an external spec.
32. **JSDoc only on public exports.** Internal helpers do not need it.
    Over-documenting internals adds maintenance burden without benefit.
33. **No clever code.** If a one-liner requires a contributor to puzzle over
    three nested operators, write the boring version. Readability beats
    line count.
34. **No defensive code without justification.** Guards like
    `if (x === undefined)` on parameters that are always passed are noise.
    Trust types and call-site contracts.
35. **No abstractions added "for future flexibility."** Add abstraction when
    a second concrete caller exists, not before. Rule of two.
36. **Match existing project style.** When adding a file, identify a similar
    existing file in the same directory and follow its conventions for
    imports, ordering, comment style, and error handling.
37. **Prefer the smaller solution.** If your implementation is meaningfully
    larger than equivalent existing code doing similar work, justify it in
    a comment with a specific reason, or rewrite.
38. **Tests read like documentation.** Test names describe behavior in plain
    English. A contributor should understand what a function does by reading
    its test file, without opening the implementation.

## The future-maintainer check

Before declaring a phase complete (in addition to the phase's listed
postconditions):

1. Pick a representative file the phase added or modified.
2. Ask: could a contributor unfamiliar with the restructure make a small
   related change (add a new field, fix a bug, handle a new case) by reading
   only this file plus at most 2 others?
3. If no: the file is too tangled. Add a refactor task before phase completion
   and document the issue in STATE.md "Open issues".

This check is subjective but its presence forces sessions to think about
human readability as an explicit deliverable, not an emergent property.

## Anti-patterns the restructure is specifically eliminating

You will encounter these in the legacy code. **Do not propagate them** in new code:

- Mutating `actor.system` or `item.system` in `prepareDerivedData` (use `actor.derived.*` or DataModel-provided derived layers)
- Storing computed values in persisted schema (the `*.adjusted` fields)
- Manual delta math in `_preUpdate` to keep derived stats in sync
- Branching modifier logic by item type string (`if (item.type === "armour" || ...)`)
- Reading derived state from a sheet render context that doesn't yet exist
- `JSON.parse(game.settings.get(...))` patterns — settings store typed data, not serialized JSON
- Prototype assignment to Foundry classes

## How to propose a new principle

If recurring problems suggest a missing rule:

1. Open an issue or note in `STATE.md` "Open issues"
2. Propose the principle as an ADR (it changes how all sessions behave)
3. Wait for human sign-off (the AI executing tasks does not unilaterally add principles)
