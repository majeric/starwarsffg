# Phase 06 — Persisted vs Derived Separation

## Goal

Move all computed values out of `actor.system.*` and `item.system.*` into
a separate derived namespace. The persisted schema becomes source-of-truth
only; derived state is recomputed every time and never persisted.

## Why this phase

The "open the sheet to fix it" bug class is caused by computed values being
written into the same namespace as source data. Once they're separated,
recomputation is automatic on every document load and there's no opportunity
for stale derived state to persist.

This phase is mostly mechanical IF Phase 5 was done correctly (DataModels
exist and declare a clean schema).

## Phase preconditions

- [ ] Phase 5 complete; all types have DataModels
- [ ] `npm run verify` is green
- [ ] Phase 1 calculators are in place and tested

## Phase postconditions

- [ ] No `*.adjusted` fields in any DataModel `defineSchema()`
- [ ] All derived computations live in `prepareDerivedData()` on the DataModel,
      delegating to Phase 1 calculators
- [ ] Derived values are written to `this.parent.derived.*` (or equivalent
      DataModel-provided derived layer), NEVER to `this.parent.system.*`
- [ ] `_preUpdate` delta math in `actor-ffg.js` is REMOVED
- [ ] `data.skills = mergeObject(...)` mutation in `prepareDerivedData` is REMOVED
- [ ] `data.effects.push(...)` mutation is REMOVED (the data is presentation-only;
      sheets compute it from `actor.allApplicableEffects()` directly)
- [ ] Templates updated to read derived values from `derived.*` and source
      values from `system.*`
- [ ] Migration strips `*.adjusted` fields from persisted documents
- [ ] Manual smoke: opening and closing a sheet changes no displayed values
- [ ] Manual smoke: adding/removing an item recomputes derived state without
      sheet interaction
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")

## Files to be modified

- `modules/actors/actor-ffg.js` — remove `_preUpdate` delta math; remove
  `prepareDerivedData` mutations; the file becomes very small (lifecycle hooks only)
- All actor and item DataModel files — implement `prepareDerivedData`
- All templates referencing `*.adjusted` — switch to `derived.*` equivalent
- `modules/migrations/<NEW>-strip-adjusted.js` — migration that removes
  `*.adjusted` from persisted state

## Per-template update

Templates touch many `*.adjusted` references. For each:
- Identify what the adjusted value represents (e.g., `stats.soak.adjusted` =
  base soak + AE modifications)
- Map to the corresponding derived field (`derived.stats.soak`)
- Replace in template

Use grep to find all references:
```
grep -rn "\.adjusted" templates/
```

## Anti-creep notes

- **Do not** change the math. The calculators from Phase 1 own all derivation.
- **Do not** delete fields that aren't `*.adjusted`. Other "smells" in the
  persisted schema are out of scope.
- **Do** verify after each template change that the sheet still renders.
  This phase touches many templates; a bad mapping won't crash but will
  show wrong values.

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 6.1: Add `derived` getter/setter pattern to base DataModels
- Tasks 6.2-6.N: One per actor/item type — implement `prepareDerivedData`,
  remove `*.adjusted` from schema, write migration
- Task 6.N+1: Remove `_preUpdate` delta math from actor-ffg.js
- Task 6.N+2: Remove `prepareDerivedData` mutations from actor-ffg.js
- Task 6.N+3: Update templates (one task per major template if they're large)
- Task 6.N+4: Verify Phase 6 stop gate
