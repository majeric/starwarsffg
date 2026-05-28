# Phase 01 — Pure Calculator Layer

## Goal

Extract derived-value computations into pure, side-effect-free functions in
`modules/rules/calculators/` with full unit test coverage. No behavior changes;
existing call sites continue to work unchanged.

## Why this phase

The current code computes derived values (encumbrance, soak, wound threshold,
strain threshold, defense, force pool size, talent list aggregation) inline
inside `prepareDerivedData`, `_preUpdate`, and sheet rendering — often in
multiple places with subtly different logic. Phase 5 (DataModels) and Phase 6
(persisted/derived split) both depend on these calculators existing as a
single source of truth.

## Phase preconditions

- [ ] Phase 0 complete; `STATE.md` shows phase 0 checked
- [ ] `npm run verify` runs end-to-end
- [ ] `modules/rules/` directory does not yet exist

## Phase postconditions (stop gate)

- [ ] `modules/rules/calculators/` contains one file per derived-value family:
      `encumbrance.js`, `wounds.js`, `strain.js`, `soak.js`, `defense.js`,
      `force-pool.js`, `talent-list.js` (more may be added as discovered)
- [ ] Every calculator is a pure function: no `this`, no `game.*`, no `CONFIG.*`,
      no DOM, no Foundry document references — only its declared input parameters
- [ ] Every calculator has a vitest file in `tests/rules/` with at least
      happy path + 3 edge cases covered
- [ ] `npm run verify` is green (existing failures may persist; the calculators
      themselves are 100% tested)
- [ ] Existing code in `actor-ffg.js`, `modifiers.js`, sheet render paths is
      UNCHANGED — migration of call sites is Phase 6, not here
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")

## Files to be created

```
modules/rules/calculators/encumbrance.js
modules/rules/calculators/wounds.js
modules/rules/calculators/strain.js
modules/rules/calculators/soak.js
modules/rules/calculators/defense.js
modules/rules/calculators/force-pool.js
modules/rules/calculators/talent-list.js
tests/rules/encumbrance.test.js
tests/rules/wounds.test.js
tests/rules/strain.test.js
tests/rules/soak.test.js
tests/rules/defense.test.js
tests/rules/force-pool.test.js
tests/rules/talent-list.test.js
```

## Reference sources (where the current logic lives)

| Calculator | Source location |
|---|---|
| encumbrance | `actor-ffg.js:613-647` (`_calculateDerivedValues` encumbrance loop) |
| wounds | `actor-ffg.js:117-205` (Brawn delta), template.json wounds shape |
| strain | `actor-ffg.js:178-203` (Willpower delta), template.json strain shape |
| soak | `actor-ffg.js:152-163` (Brawn delta on soak) + `modifiers.js` soak path |
| defense | `modifiers.js` Defence-Melee / Defence-Ranged branches |
| force pool | `actor-ffg.js:725-744` (the override that mutates AE changes) |
| talent list | `actor-ffg.js:399-540` (`_prepareCharacterData` talent aggregation) |

## Tasks (to be detailed before phase begins)

When a session begins Phase 1, the first task is "Phase 01 task detailing"
which produces the per-task atomic breakdown. Recommended task shape:
- Task 1.1: Create `modules/rules/calculators/` and `tests/rules/` directories
- Tasks 1.2 through 1.8: One calculator + one test file each, in dependency order
  (encumbrance first — simplest; force-pool last — most coupled to current overrides)
- Task 1.9: Verify Phase 1 stop gate

Each per-calculator task follows the template at the bottom of
`docs/restructure/phases/phase-00-foundation.md` task 1.2 sketched in the
original plan: function spec, behavior must match source exactly, test
requirements, anti-creep notes.

## Anti-creep notes for the whole phase

- **Do not** modify call sites. The point is to have the calculators *exist
  and be tested*. Migration of `actor-ffg.js` to call them happens in Phase 6.
- **Do not** "improve" the logic. If the source code does something odd (e.g.,
  missing quantity defaults to 0 instead of 1 for encumbrance), preserve that
  exact behavior. Tests pin the current behavior; later phases may change it
  with proper ADRs and migrations.
- **Do not** add calculators not listed above unless you find a derived value
  that obviously belongs here. Document any addition in `STATE.md` "Open issues"
  before adding.
