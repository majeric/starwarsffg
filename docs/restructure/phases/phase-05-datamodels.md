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

## Tasks

### 5.0 — Detail Phase 5 atomic tasks

**Status:** Complete — commit `f9999f0`. This phase file's "Common per-type
task template", "Sequencing" subsection, and "5.last" stop gate are the
detailed task list. Future sessions executing per-type tasks should follow
the template and append individual task status markers in the Sequencing
list as each type's DataModel lands.

### Common per-type task template

Each actor or item type conversion follows the same shape; this template
is referenced from per-task definitions below to avoid duplication.

**Files to create per type X:**
- `modules/data/<actor|item>/X-data.js`
- `tests/data/<actor|item>/X-data.test.js` (schema validation tests)
- `modules/migrations/<version>-X-datamodel.js` (if the existing source
  shape needs normalization; can be combined with sibling types into a
  shared migration file for actors and another for items)

**Per-type steps:**
1. Read the existing source shape from `template.json` (the type-specific
   block, plus the templates it includes via the `templates` field).
2. Define `class XData extends foundry.abstract.TypeDataModel` with
   `static defineSchema()` using `foundry.data.fields.*`. Every field
   declared in template.json must be present in the schema with a typed
   field (StringField, NumberField, BooleanField, ObjectField,
   SchemaField, etc.).
3. If the type has derived values that currently live as persisted
   `*.adjusted` fields, declare them in `defineSchema()` with a comment
   `// TODO Phase 6: move to derived namespace`. Phase 6 owns the actual
   migration of those fields out of the persisted schema.
4. Implement `prepareBaseData()` and `prepareDerivedData()` that delegate
   to Phase 1 calculators where appropriate. Derived values write to
   `this.parent.derived.<...>` — Phase 6 enforces this contract; for
   Phase 5 the writes can still go to `this.parent.system.*` if the
   sheet templates require it. Track per-type with a TODO.
5. Add the type to the appropriate migration file in
   `modules/migrations/3.0.0-actor-datamodels.js` (for actors) or
   `3.0.0-item-datamodels.js` (for items). Migration logic: detect
   pre-DataModel shape (missing fields → fill with schema defaults;
   extra fields → drop). Append to MIGRATION_REGISTRY via
   `modules/migrations/index.js`.
6. Register the data model in the init hook:
   `CONFIG.Actor.dataModels.X = XData;` or `CONFIG.Item.dataModels.X = XData;`
   The registration goes in `modules/data/<actor|item>/_register.js` and
   is called from swffg-main.js.
7. Write tests for the schema: validate happy-path source data, validate
   that schema rejects malformed shapes, validate that derived values
   round-trip correctly.

**Per-type commit:** `phase 05.NN: convert <type> to DataModel`

### Sequencing

**Actors (simplest first, most-coupled last):**
- 5.1 — Establish base infrastructure (base-actor-data.js, base-item-data.js, _register.js stubs, migration scaffolds) — **Complete** — commit `b8838fc`
- 5.2 — Homestead
- 5.3 — Minion
- 5.4 — Rival
- 5.5 — Nemesis
- 5.6 — Character (most coupled, has talents, specializations, force pool)
- 5.7 — Vehicle

**Items (data-only types first; AE-coupled types last):**
- 5.8 — CriticalInjury, CriticalDamage (data-only, very small)
- 5.9 — Motivation, Obligation, Background
- 5.10 — Species, Career
- 5.11 — Ability, Gear
- 5.12 — Talent (has activation, ranks)
- 5.13 — Specialization (nested talents)
- 5.14 — ForcePower, SignatureAbility (nested upgrades)
- 5.15 — Weapon, Armour, ShipWeapon (have attributes arrays — interact with Phase 7)
- 5.16 — ItemAttachment, ItemModifier (nested attributes — interact with Phase 7)
- 5.17 — ShipAttachment

### 5.last — Verify Phase 5 stop gate

**Steps:**
1. `grep "CONFIG.Actor.dataModels\|CONFIG.Item.dataModels" modules/data/` returns 25+ matches (one per type).
2. `npm run verify` — same green/lint pattern; vitest gains many data-model tests.
3. Manual smoke (operator): every actor sheet still renders, every item sheet still renders; no console errors.
4. Migration replay against fixtures (if any) passes.

**Commit:** `phase 05.last: phase 5 stop gate verified`

---

## Risks and notes

- Phase 5 is the central phase. Expect many small adjustments to sheet
  rendering code as the underlying data shape becomes more strict.
- Some legacy code reads fields that don't exist in template.json (e.g.,
  values that get added by `prepareDerivedData` mutations). The DataModel
  approach requires those fields to either be declared in `defineSchema()`
  or accessed from a separate derived namespace. Document each surprise
  as a sub-issue.
- The shared `migrations/3.0.0-actor-datamodels.js` and
  `migrations/3.0.0-item-datamodels.js` are single migrations that handle
  all types; each per-type task appends its case to the existing file
  rather than creating a new migration.
