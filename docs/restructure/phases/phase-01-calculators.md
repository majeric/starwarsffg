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

## Tasks

### 1.1 — Create calculator and test directories

**Preconditions:**
- [ ] Phase 0 marked complete in STATE.md
- [ ] `modules/rules/` does not yet exist

**Files to create:**
- `modules/rules/calculators/.gitkeep`
- `tests/rules/.gitkeep`

**Steps:**
1. Create the two directories with placeholder `.gitkeep` files
2. Run `npm run verify` — must still pass (no new failures)

**Commit:** `phase 01.1: create rules calculator and test directories`

---

### 1.2 — Extract encumbrance calculator

**Source:** `modules/actors/actor-ffg.js:613-647` (`_calculateDerivedValues`, encumbrance loop)

**Files to create:**
- `modules/rules/calculators/encumbrance.js`
- `tests/rules/encumbrance.test.js`

**Function spec:**
```js
/**
 * Compute total encumbrance from an actor's items.
 * @param {Array<{type:string, system:object}>} items
 * @returns {number} total encumbrance points used
 */
export function computeEncumbrance(items) { ... }
```

**Behavior (must match source exactly):**
- Skip item if neither `system.encumbrance.adjusted` nor `system.encumbrance.value` is defined
- Equipped armour (`type==="armour"` && `system.equippable.equipped===true`):
  contributes `max(0, adjusted - 3)`
- Other armour/weapon/shipweapon (not equipped):
  contributes `(adjusted ?? value) * quantity` where missing quantity = 0
- All other items: contributes `value * quantity` where missing quantity = 0
- Errors per-item are caught and skipped (matching the try/catch in source)

**Tests (`tests/rules/encumbrance.test.js`):**
- returns 0 for empty array
- returns 0 for item with no encumbrance fields
- equipped armour with adjusted=5 contributes 2
- equipped armour with adjusted=2 contributes 0 (floor)
- unequipped weapon with adjusted=3, quantity=2 contributes 6
- gear with value=2, quantity=3 contributes 6
- item with quantity field missing contributes 0 (preserves source quirk)
- mixed item types sum correctly
- item that throws during access does not crash overall computation

**Anti-creep:**
- Do NOT modify `actor-ffg.js`. Call-site migration is Phase 6.
- Do NOT "fix" the quantity-defaults-to-zero quirk; it's the documented behavior.
- Do NOT use `CONFIG.logger`; the calculator is pure. Errors swallow silently
  (the caller in Phase 6 will decide whether to log).

**Commit:** `phase 01.2: extract encumbrance calculator`

---

### 1.3 — Extract wounds-threshold calculator

**Source:** `modules/actors/actor-ffg.js:117-177` (the Brawn-delta logic in `_preUpdate`)
plus the implicit "wounds threshold = base + brawn" contract.

**Files to create:**
- `modules/rules/calculators/wounds.js`
- `tests/rules/wounds.test.js`

**Function spec:**
```js
/**
 * Compute wound threshold for character-like actor types.
 * @param {{baseWounds:number, brawn:number, modifiers?:number}} input
 * @returns {number} threshold (max wounds)
 */
export function computeWoundThreshold({ baseWounds, brawn, modifiers = 0 }) { ... }
```

**Behavior:**
- threshold = baseWounds + brawn + modifiers
- Treats undefined/null inputs as 0 (defensive, but only on input boundary)
- Returns integer (uses parseInt-like coercion if needed)

**Tests:**
- base=10, brawn=2 → 12
- base=10, brawn=2, modifiers=3 → 15
- base=0, brawn=0 → 0
- handles string-numeric inputs ("10", "2") matching source's loose typing

**Anti-creep:**
- Do NOT extract the entire `_preUpdate` delta math. That's Phase 6.
- This calculator is the FORWARD direction only: given base + brawn, what's
  the threshold? The reverse-delta logic stays in actor-ffg.js for now.

**Commit:** `phase 01.3: extract wounds threshold calculator`

---

### 1.4 — Extract strain-threshold calculator

**Source:** `modules/actors/actor-ffg.js:178-203` (Willpower-delta logic in `_preUpdate`)

**Files to create:**
- `modules/rules/calculators/strain.js`
- `tests/rules/strain.test.js`

**Function spec:**
```js
/**
 * Compute strain threshold for character-like actor types.
 * @param {{baseStrain:number, willpower:number, modifiers?:number}} input
 * @returns {number} threshold (max strain)
 */
export function computeStrainThreshold({ baseStrain, willpower, modifiers = 0 }) { ... }
```

**Behavior:** Mirrors wounds: threshold = baseStrain + willpower + modifiers.

**Tests:** Same shape as wounds tests, substituting willpower.

**Commit:** `phase 01.4: extract strain threshold calculator`

---

### 1.5 — Extract soak calculator

**Source:**
- `modules/actors/actor-ffg.js:152-163` (Brawn-delta on soak)
- `modules/helpers/modifiers.js:37-39` (Soak from equipped armour, in `getCalculatedValueFromItems`)

**Files to create:**
- `modules/rules/calculators/soak.js`
- `tests/rules/soak.test.js`

**Function spec:**
```js
/**
 * Compute soak value for character-like actor types.
 * @param {{
 *   brawn:number,
 *   equippedArmourSoak?:number,
 *   modifiers?:number
 * }} input
 * @returns {number} total soak
 */
export function computeSoak({ brawn, equippedArmourSoak = 0, modifiers = 0 }) { ... }
```

**Behavior:**
- soak = brawn + equippedArmourSoak + modifiers
- All values coerced via `parseInt(x, 10) || 0`

**Tests:**
- brawn=3 alone → 3
- brawn=3, armour=2 → 5
- brawn=3, armour=2, modifiers=1 → 6
- string-numeric inputs handled

**Anti-creep:**
- Do NOT extract `getCalculatedValueFromItems` (that's Phase 7's AE unification).
- The "sum equipped armour soak" iteration stays in actor-ffg.js; this
  calculator only takes the already-summed value.

**Commit:** `phase 01.5: extract soak calculator`

---

### 1.6 — Extract defense calculator

**Source:** `modules/helpers/modifiers.js:41-48` (Defence-Melee / Defence-Ranged
"highest defense item" branch)

**Files to create:**
- `modules/rules/calculators/defense.js`
- `tests/rules/defense.test.js`

**Function spec:**
```js
/**
 * Compute melee or ranged defense from equipped defensive items.
 * @param {Array<{system:{defence:{adjusted:number}}}>} defensiveItems
 *   items contributing to the given defense type
 * @param {number} baseDefense
 * @param {number} modifiers
 * @returns {number}
 */
export function computeDefense(defensiveItems, baseDefense = 0, modifiers = 0) { ... }
```

**Behavior (preserves source quirk):**
- The source code uses `items.filter((i) => item.system.defence >= i.system.defence).length >= 0`
  which is ALWAYS true (length is never negative). Preserve this — the
  practical effect is summing ALL `defence.adjusted` values, not just the
  highest. Document this in a code comment referencing the source.
- Result = baseDefense + sum(defence.adjusted across all items) + modifiers

**Tests:**
- empty items, base=0 → 0
- empty items, base=1 → 1
- two items with adjusted=1 each → 2 (NOT 1; source's "highest" comment is wrong)
- with base and modifiers → correct sum

**Anti-creep:**
- This is the only place we preserve a known source bug. The bug exists in
  the published behavior; fixing it would change user-facing values.
  Document it; do not fix here. A future ADR + task can fix it deliberately.

**Commit:** `phase 01.6: extract defense calculator (preserves source's all-items-sum quirk)`

---

### 1.7 — Extract force-pool calculator

**Source:** `modules/actors/actor-ffg.js:725-744` (`applyActiveEffects` override that
mutates AE change values to compute force pool dice)

**Files to create:**
- `modules/rules/calculators/force-pool.js`
- `tests/rules/force-pool.test.js`

**Function spec:**
```js
/**
 * Compute the force-pool delta available for force skills.
 * Returns max(0, maxForceRating - committedDice).
 * @param {{maxForceRating:number, committedDice:number}} input
 * @returns {number}
 */
export function computeForcePool({ maxForceRating, committedDice }) { ... }
```

**Behavior:**
- Returns `max(0, parseInt(maxForceRating) - parseInt(committedDice))`
- This is the value the AE override currently injects into skill changes

**Tests:**
- max=5, committed=0 → 5
- max=5, committed=3 → 2
- max=5, committed=10 → 0 (floor)
- string-numeric inputs handled

**Anti-creep:**
- Do NOT extract the AE-change-mutation pattern. That's a Phase 7 concern
  (it's the wrong pattern, gets replaced with a custom AE change mode).
- This calculator captures only the pure math.

**Commit:** `phase 01.7: extract force-pool calculator`

---

### 1.8 — Extract talent-list aggregator

**Source:** `modules/actors/actor-ffg.js:399-540` (`_prepareCharacterData` talent
aggregation across specializations + standalone talents)

**Files to create:**
- `modules/rules/calculators/talent-list.js`
- `tests/rules/talent-list.test.js`

**Function spec:**
```js
/**
 * Build aggregated talent list from specializations and standalone talents.
 * @param {{
 *   specializations: Array<{id:string, name:string, system:{talents:object}}>,
 *   talents:         Array<{id:string, name:string, system:object, flags?:object}>,
 *   isStarWars:      boolean,
 *   sortByActivation: boolean
 * }} input
 * @returns {Array<TalentListEntry>}
 */
export function buildTalentList({ specializations, talents, isStarWars, sortByActivation }) { ... }
```

`TalentListEntry` shape matches the source: `{ name, itemId?, rank, source:[], isRanked, activation?, activationLabel?, description?, tier?, isDirectlyAdded? }`.

**Behavior:**
- For each specialization, iterate `system.talents` where `islearned===true`,
  deep-clone the talent, attach source `{type:"specialization", typeLabel,
  name, id}`, set rank from talent rank or 1
- For each standalone talent, build entry; if from species (`flags.starwarsffg.fromSpecies===true`),
  use source type "species" else "talent"
- Aggregate: same-named entries combine their `source[]` arrays; ranked entries
  sum their ranks; non-ranked entries don't combine
- If `isStarWars === false` (Genesys), entries get a `tier` field (from
  `parseInt(system.tier)`) and the list is sorted by tier ascending
- Else (Star Wars), sorted alphabetically by name
- If `sortByActivation` is true, list is reversed and then sorted by the
  Active/Passive activation hierarchy (matches `_sortTalents` in actor-ffg.js)

**Tests:**
- empty input → empty list
- single specialization with one learned ranked talent → list of 1 entry
- two specializations both teaching the same ranked talent → ranks sum, sources combined
- talent with `fromSpecies` flag uses Species source label
- Genesys mode (isStarWars=false) sets tier and sorts by tier
- Star Wars mode (isStarWars=true) sorts alphabetically
- sortByActivation=true applies activation hierarchy (active-out > active-maneuver > active-incidental > active > passive)

**Anti-creep:**
- The `_sortTalents` method in actor-ffg.js stays where it is for Phase 1.
  This calculator can either inline an equivalent comparator OR export a
  `compareTalentsByActivation` helper. Prefer inline within talent-list.js
  for self-containment.
- Do NOT extract obligation/duty magnitude sums (lines 517-538 of source).
  Those are simpler one-off aggregations and become Phase 6 fodder.

**Commit:** `phase 01.8: extract talent-list aggregator`

---

### 1.9 — Verify Phase 1 stop gate

**Preconditions:**
- [ ] Tasks 1.1-1.8 complete
- [ ] All calculator files exist with full tests

**Steps:**
1. Run `npm run verify` — all gates green except the known-failure lint
2. Run `npx vitest run tests/rules/` — every test passes
3. Verify `actor-ffg.js`, `modifiers.js`, and sheet files are byte-identical
   to their state at Phase 0 close (`git diff <phase-0-close-SHA>..HEAD --
   modules/actors/actor-ffg.js modules/helpers/modifiers.js modules/actors/actor-sheet-ffg.js`
   shows no changes)
4. Run the future-maintainer check (PRINCIPLES.md): pick `encumbrance.js` +
   `encumbrance.test.js`; could a contributor add a new item-type-specific
   contribution rule by reading only those two files? Answer: yes.
5. Mark Phase 1 complete in STATE.md and transition to Phase 2.

**Commit:** `phase 01.9: phase 1 stop gate verified`


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
