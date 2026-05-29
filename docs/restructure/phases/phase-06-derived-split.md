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

- [ ] No `*.adjusted` fields in any ACTOR DataModel `defineSchema()` (item `*.adjusted` moves with Phase 7 per ADR-012)
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
- [ ] V13/V14 compatibility verified per ADR-008 (prepareBaseData/prepareDerivedData lifecycle hooks may differ between versions)

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

## Tasks

### 6.0 — Detail Phase 6 atomic tasks

This task produced the sections below (scope decisions, the derived-namespace
pattern, the common per-type template, the sequencing, and the per-task blocks),
grounded in the actual Phase 6 targets in the current code.

### Phase 6 scope & key decisions

**Decision A — the `derived` namespace (record as ADR-011 before task 6.1).**
Derived values live on the parent document under a fresh `derived` object, never
in `system.*`. Pattern: the base DataModel's `prepareBaseData()` sets
`this.parent.derived = {}` (reset every prep cycle); each type's
`prepareDerivedData()` fills `this.parent.derived.*` by delegating to the Phase 1
calculators. Sheets/code read `actor.derived.*`. Per-type `prepareBaseData`
overrides (if any) must call `super.prepareBaseData()`. This is a judgment call
affecting every type, so 6.1 records ADR-011 before implementing.

**Decision B — actors now, item `*.adjusted` deferred to Phase 7 (confirm /
ADR-012).** `.adjusted` is overwhelmingly item-centric: `item-ffg.js` computes it
in ~58 places and item/weapon/chat templates render it across ~70 references.
That item computation IS the bespoke modifier pipeline that ADR-004 / Phase 7
replaces with Active Effects. Moving item `*.adjusted` into a derived namespace
in Phase 6 and then reworking it in Phase 7 is double work and high risk.

Therefore Phase 6 splits **actor** derived state only (the calculator-backed
wounds/strain/soak/defence/encumbrance/forcePool thresholds — the actual
"open-the-sheet-to-fix-it" bug class). **Item `*.adjusted` derived-split moves to
Phase 7**, which already owns the item modifier computation. The postcondition
"no `*.adjusted` in any DataModel" is met for actors here and for items in
Phase 7. **Decided — ADR-012 (accepted):** Phase 6 = actor derived split; item
`*.adjusted` derived-split moves to Phase 7. The Phase 6/7 postconditions are
updated to match.

**Decision C — thresholds become derived, current values stay persisted.** For
`wounds`/`strain`/`encumbrance`, the *threshold* (`max`) is derived (species/base
+ characteristic, via the calculators) and moves to `derived.stats.*`; the
*current* value (`value`, `min`) stays persisted in `system.stats.*`. `soak`,
`defence`, and `forcePool` totals are fully derived. The `*.adjusted` fields
(the AE-modified totals) are dropped from the schema and become the derived
values. Do not change the math — the Phase 1 calculators own it (anti-creep).

### Common per-type task template (actor types)

For each actor type X with derived stats:
1. Read X's current derived computation: `actor-ffg.js` `_prepareSharedData`,
   `_calculateDerivedValues`, `_prepareMinionData`/`_prepareCharacterData`, the
   `_preUpdate` intent, and the `*OverThreshold` writes.
2. Implement `prepareDerivedData()` on `XData` (the Phase 5 DataModel): compute
   via the Phase 1 calculators (`computeWoundThreshold`, `computeStrainThreshold`,
   `computeSoak`, `computeDefense`, `computeForcePool`, `computeEncumbrance`,
   `buildTalentList`) and write results to `this.parent.derived.*`. No new math.
3. Remove the now-derived `*.adjusted` (and derived `max` thresholds per
   Decision C) from `XData.defineSchema()`.
4. Add X's removed fields to the strip-adjusted migration (task 6.10).
5. Tests: assert `prepareDerivedData` writes `derived.*` equal to the calculator
   outputs for representative inputs; assert the schema no longer declares the
   moved fields. (Use a richer DataModel test harness than the ADR-010
   introspection mock — derived tests need a working `this.parent.derived`; see
   6.1.)

**Per-type commit:** `phase 06.NN: <type> derived split`

### Sequencing

- [ ] 6.1 — Establish the `derived` namespace pattern on the base DataModels (+ ADR-011); extend the test harness so `prepareDerivedData` is exercisable
- [ ] 6.2 — Character derived (full stats + talent list + skilltypes)
- [ ] 6.3 — Nemesis derived
- [ ] 6.4 — Rival derived (no strain)
- [ ] 6.5 — Minion derived (group-wound formula + calculators)
- [ ] 6.6 — Vehicle derived (encumbrance + hull/system thresholds)
- [ ] 6.7 — Remove `_preUpdate` delta math from `actor-ffg.js` (redundant once thresholds are derived)
- [ ] 6.8 — Remove `prepareDerivedData` mutations from `actor-ffg.js` (skills `mergeObject`, `skilltypes`, `effects.push`, `*OverThreshold`) — relocate needed presentation data to `derived.*`
- [ ] 6.9 — Update actor sheet templates: `*.adjusted` / mutated `system.*` reads → `derived.*` (base values stay `system.*`)
- [ ] 6.10 — Migration: strip actor `*.adjusted` (and moved threshold fields) from persisted documents
- [ ] 6.last — Verify Phase 6 stop gate (actor scope; item `*.adjusted` carried by Phase 7)

### 6.1 — Establish the derived-namespace pattern (+ ADR-011)

**Preconditions:** Phase 5 closed; `npm run verify` at baseline.

**Files:** `modules/data/actor/base-actor-data.js` (init `this.parent.derived`);
`architecture/decision-log.md` (ADR-011); `tests/setup.ts` and/or a new test
helper (a DataModel harness that runs `prepareBaseData`/`prepareDerivedData` so
derived output is assertable — the ADR-010 introspection mock only inspects
schema, it does not execute prepare hooks).

**Steps:** record ADR-011 (the derived-namespace mechanism); implement
`prepareBaseData()` on `BaseActorData` to set `this.parent.derived = {}`; add the
test harness. No per-type derivation yet.

**Verification:** a unit test shows a trivial subclass writing to
`this.parent.derived` is observable; `npm run verify` at baseline.

**Do NOT:** wire any calculators yet; touch item DataModels.

**Commit:** `phase 06.1: derived-namespace pattern + ADR-011`

### 6.2–6.6 — Per-actor derived split

Follow the **Common per-type task template** above, one commit per type, in the
order listed in Sequencing. 6.2 (character) is the reference implementation; 6.3
(nemesis) and 6.4 (rival, no strain) reuse its shape; 6.5 (minion) keeps the
group-wound formula (`unit_wounds * quantity`) feeding the calculators; 6.6
(vehicle) covers encumbrance and the hull/system-strain thresholds. Each task:
implement `prepareDerivedData` → `derived.*`, drop the moved fields from the
schema, extend the migration (6.10), add derived tests.

### 6.7 — Remove `_preUpdate` delta math

**Preconditions:** 6.2–6.6 complete (thresholds are now derived, so the persisted
`max` values `_preUpdate` patched no longer exist / are no longer authoritative).

**Files:** `modules/actors/actor-ffg.js` (delete the `_preUpdate` body's
Brawn/Willpower → wounds/soak/encumbrance/strain delta math, lines ~117-206;
keep the method only if it still has non-derived responsibilities, else remove).

**Verification:** editing a characteristic in Foundry recomputes thresholds via
derived recompute (operator smoke); `npm run verify` green; no test regressions.

**Do NOT:** change calculator math; remove unrelated `_preUpdate` behavior.

**Commit:** `phase 06.7: remove _preUpdate delta math`

### 6.8 — Remove `prepareDerivedData` mutations from `actor-ffg.js`

**Files:** `modules/actors/actor-ffg.js`. Remove the `data.skills = mergeObject(
CONFIG.FFG.skills, data.skills)` mutation, the `data.skilltypes` build, the
`data.effects.push(...)` aggregation, and the `*OverThreshold` writes — moving
any still-needed presentation data into `this.parent.derived.*` (skilltypes,
overThreshold) or having the sheet compute it (effects from
`actor.allApplicableEffects()`, per the postconditions). Coordinate with
`buildActorSheetSystemData()` (Phase 5 sheet fix) so the sheet reads the new
`derived.*` locations.

**Verification:** sheets render identically (operator smoke); `npm run verify`
green.

**Commit:** `phase 06.8: remove prepareDerivedData mutations from actor-ffg.js`

### 6.9 — Update actor sheet templates

**Files:** actor templates that read mutated `system.*`/`*.adjusted` actor stats
(NOT the item-sheet `*.adjusted` refs — those stay until Phase 7). Map each to
its `derived.*` equivalent per the "Per-template update" section. Verify each
sheet renders after the change.

**Commit:** `phase 06.9: actor templates read derived.*`

### 6.10 — Migration: strip actor `*.adjusted`

**Files:** `modules/migrations/<version>-strip-actor-adjusted.js` (+ register in
`index.js`); a `test-worlds/` fixture. Removes the moved `*.adjusted`/threshold
fields from persisted actor documents. Forward-only (PRINCIPLES 14).

**Commit:** `phase 06.10: migration strips actor adjusted fields`

### 6.last — Verify Phase 6 stop gate

**Steps:** no `*.adjusted` in any *actor* DataModel schema; actor derived values
live only in `derived.*`; `_preUpdate` delta math and the `prepareDerivedData`
mutations are gone; `npm run verify` green; operator smoke — opening/closing a
sheet changes no displayed value, and adding/removing an item recomputes derived
state without opening the sheet. Item `*.adjusted` remains (carried by Phase 7);
note this explicitly so the stop gate is not mistaken for incomplete.

**Commit:** `phase 06.last: phase 6 stop gate verified`
