# Phase 05 — DataModel Migration ⭐

## Goal

Convert every actor type and every item type from the flat `template.json`
schema to a Foundry `TypeDataModel` with explicit `static defineSchema()`.
Migrations ensure existing worlds upgrade losslessly.

## Why this phase (and why it's the biggest one)

`template.json` is a pre-v10 pattern that gives no schema validation, no
type safety, and no clean place to declare derived data. DataModel is the
canonical Foundry V13 approach and:

- Provides schema validation at create/update time (catches `undefined.value`
  bugs at the source)
- Makes the data type domain explicit (foundation for TypeScript coverage)
- Provides clean `prepareBaseData()` and `prepareDerivedData()` hooks per type
- Is required for clean persisted/derived separation (Phase 6)
- Is required for clean AE pipeline (Phase 7)

This is the central phase of the restructure. Treat it carefully.

## Phase preconditions

- [ ] Phase 0, Phase 1 (calculators) complete
- [ ] Phase 11 (migration infrastructure) complete — Phase 5 will write
      many migrations and needs the proper runner
- [ ] `npm run verify` is green
- [ ] `test-worlds/` contains at least one fixture per upstream version
      (1.907, 1.910, 2.0.3) for migration testing

## Phase postconditions

- [ ] Every actor type registered via `CONFIG.Actor.dataModels.<type>`
- [ ] Every item type registered via `CONFIG.Item.dataModels.<type>`
- [ ] Each DataModel declares `static defineSchema()` with explicit field types
- [ ] `template.json` is removed or reduced to whatever Foundry requires
      alongside DataModels (none, ideally)
- [ ] All migrations from upstream versions land in worlds without errors
- [ ] `npm run verify` is green including migration replay
- [ ] All actor sheets and item sheets render with no errors
- [ ] No tests previously passing now fail
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (DataModel API is high-risk for cross-version drift; explicit attention required)

## Files to be created (high level)

```
modules/data/actor/base-actor-data.js
modules/data/actor/character-data.js
modules/data/actor/minion-data.js
modules/data/actor/rival-data.js
modules/data/actor/nemesis-data.js
modules/data/actor/vehicle-data.js
modules/data/actor/homestead-data.js

modules/data/item/base-item-data.js
modules/data/item/<one-per-type>.js   ← weapon, armour, talent, specialization,
                                       forcepower, signatureability, gear,
                                       species, career, ability, motivation,
                                       obligation, criticalinjury, criticaldamage,
                                       itemattachment, itemmodifier, shipattachment,
                                       shipweapon, background

modules/data/shared/                  ← reusable schema fragments

modules/migrations/3.0.0-actor-datamodels.js
modules/migrations/3.0.1-item-datamodels.js   ← or one per type, TBD
```

## Per-type task pattern

For each type, the work is:
1. Identify the type's current shape in `template.json` (and the per-type
   variant block)
2. Define `static defineSchema()` using Foundry's `foundry.data.fields.*`
3. If the type has derived values, override `prepareBaseData()` and
   `prepareDerivedData()` — these delegate to calculators from Phase 1
4. Write a migration that:
   - Detects pre-DataModel shape (missing fields, extra fields, type mismatches)
   - Normalizes to schema (fill missing, drop invalid)
   - Strips `*.adjusted` fields (they become derived in Phase 6)
5. Register via `CONFIG.Actor.dataModels.<type> = TypeNameData` in init hook
6. Add a fixture exercising migration from at least one upstream world

## Sequencing within Phase 5

Recommended order (simplest first, most-coupled last):

**Actors:**
1. Homestead (least coupled, simplest schema)
2. Minion
3. Rival
4. Nemesis
5. Character
6. Vehicle

**Items (after all actors converted):**
1. Gear, Motivation, Obligation, CriticalInjury, CriticalDamage (data-only)
2. Background, Species, Career, Ability (descriptive)
3. Talent, Specialization (more complex; have nested structures)
4. ForcePower, SignatureAbility (most complex; upgrades, nested talents)
5. Weapon, Armour, ShipWeapon (have AE-style attribute arrays — interact with Phase 7)
6. ItemAttachment, ItemModifier (nested attribute arrays)

Migrating items 5-6 last allows Phase 7 (AE unification) to consume the
DataModel-shaped data more cleanly.

## Anti-creep notes

- **Do not** change derived value computation. Calculators from Phase 1 are
  the source of truth.
- **Do not** consolidate fields across types. If `character` and `nemesis`
  both have `stats.wounds`, both schemas declare it; don't introduce a shared
  base unless the types literally are subtypes (which `base-actor-data.js`
  captures via inheritance).
- **Do not** add new fields. The schema reflects what's currently persisted,
  no more.
- **Do** declare derived/computed values in `prepareDerivedData()` and write
  them to `this.parent.derived.*` — NOT to `this.parent.system.*`. This is
  the persisted/derived split Phase 6 will enforce; getting it right here
  costs nothing.
- **Do** preserve `*.adjusted` fields in the persisted schema for now if
  removing them requires editing call sites — Phase 6 is when they go away.
  Document each `adjusted` field with a TODO comment referencing Phase 6.

## Tasks (to be detailed before phase begins)

Estimate ~20-30 atomic tasks across actors + items. Each per-type task
follows the same template (schema definition, migration, registration,
fixture). The first session in Phase 5 should produce the per-type task
breakdown before starting on type 1.
