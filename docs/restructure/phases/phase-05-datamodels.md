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

### Phase 5 scope clarification — schema-only conversions

Phase 1 deferred calculator *call-site* migration to Phase 6, and the legacy
`ActorFFG`/`ItemFFG` document classes still own all derived computation in their
`prepareDerivedData`. Each Phase 5 task below is therefore **schema definition +
registration only**:

- Implement `static defineSchema()` to mirror the type's current `template.json`
  shape exactly — every persisted field present, lenient enough that existing
  upstream documents validate without data loss (ADR-002).
- **Leave the DataModel's `prepareBaseData()`/`prepareDerivedData()` empty (or
  omitted).** The legacy `ActorFFG`/`ItemFFG` preparation keeps running, so
  behavior is unchanged after registration. Foundry calls both the document's
  and the DataModel's prepare hooks; an empty DataModel hook is a no-op.
- Moving derivation into the DataModel and wiring the Phase 1 calculators
  (`computeWoundThreshold`, `computeStrainThreshold`, `computeSoak`,
  `computeDefense`, `computeForcePool`, `computeEncumbrance`, `buildTalentList`)
  is **Phase 6** work, not Phase 5.

This overrides the optimistic "delegate to Phase 1 calculators" wording in the
Common per-type task template step 4 for the duration of Phase 5: prepare hooks
stay empty until Phase 6. Keeping conversions schema-only is what makes each one
low-risk and individually shippable. (See STATE.md "Open issues" 2026-05-29; the
5.2 implementer should record this as a short ADR if formalization is wanted.)

### Shared schema fragments

Several `template.json` blocks are shared across types. Put each reusable
fragment in `modules/data/shared/` as a small exported factory that returns a
`foundry.data.fields.*` map, and have per-type `defineSchema()` spread the
fragments it needs. The **first task to need a fragment creates it** (same
create-on-first-use pattern as the migration files); later tasks import it.
Build large maps (skills, characteristics) **programmatically from a data
table** so no single function exceeds the 50-line / complexity-10 lint limits
that apply as errors under `modules/data/` (PRINCIPLES 29-30).

| Fragment (file) | Composition | Introduced by |
|---|---|---|
| `actor-meta.js` `metaOnly()` | `metadata: SchemaField{ tags: ArrayField(StringField), sources: ArrayField(ObjectField) }` | 5.2 |
| `actor-biography.js` `biography()` | `biography: HTMLField` | 5.2 |
| `attributes.js` `attributesField()` | `attributes: ObjectField` (free-form bespoke modifiers — **Phase 7** migrates to AE; keep as-is) | 5.2 |
| `actor-stats.js` `statsSchema({ strain = true })` | `stats: SchemaField{ wounds, strain?, soak, defence, encumbrance, forcePool, credits }`, each with its `adjusted` (→ Phase 6) | 5.3 |
| `characteristics.js` `characteristicsSchema()` | 6 characteristics (Brawn…Presence) `{ value, label, abrev }`, table-built | 5.3 |
| `skills.js` `skillsSchema()` | ~36 skills `{ rank, characteristic, groupskill, careerskill, type, max }`, table-built | 5.3 |
| `actor-species.js` `speciesField()` | `species: SchemaField{ value, type }` | 5.4 |
| `actor-general.js` `general()` | `general: SchemaField{ features: HTMLField }` | 5.4 |
| `actor-career.js` `careerField()` | `career: SchemaField{ value, type }` | 5.6 |
| `actor-specialisation.js` `specialisationField()` | `specialisation: SchemaField{ value, list: ArrayField, type }` | 5.6 |
| `item-core.js` `core()` | `description: HTMLField`, `attributes: ObjectField` (Phase 7), `metadata` | 5.8 |
| `item-basic.js` `basic()` | `quantity`, `encumbrance{adjusted}`, `price{adjusted}`, `rarity{adjusted}` | 5.9 |
| `item-attachments.js` `itemAttachments()` | `itemattachment: ArrayField(ObjectField)` (Phase 7) | 5.11 |
| `item-qualities.js` `qualities()` | `itemmodifier: ArrayField`, `adjusteditemmodifer: ArrayField` (**preserve the misspelling**; Phase 7) | 5.11 |
| `item-hardpoints.js` `hardpoints()` | `hardpoints: SchemaField{ value, adjusted }` | 5.15 |
| `item-equippable.js` `equippable()` | `equippable: SchemaField{ value, equipped }` | 5.15 |

> **Persisted helper keys.** Many sub-objects bake in redundant `type`/`label`/
> `abrev` keys (e.g. `credits: { value, type: "Number", label: "Credits",
> adjusted }`). They duplicate what DataModel field types and i18n already
> provide, but existing worlds persist them. Declare them as optional
> `StringField`/`NumberField` so documents round-trip losslessly, each tagged
> `// TODO Phase 6/12: redundant persisted metadata`. Do **not** drop them in
> Phase 5 unless you have confirmed no template or sheet reads them.

### Migration policy for Phase 5

Most per-type conversions need **no migration**: a `defineSchema()` that mirrors
`template.json` lets Foundry's DataModel cleaning fill missing fields with
defaults and drop unknown extras automatically, so documents created from the
old template validate as-is. Add a case to the shared migration file **only**
when the new schema would reject a shape that existing worlds can legitimately
contain. When a migration *is* required:

- Append to `modules/migrations/3.0.0-actor-datamodels.js` (actors) or
  `modules/migrations/3.0.0-item-datamodels.js` (items). **Neither file exists
  yet** (5.1 created the data-model bases and `_register.js` but not the
  migration scaffolds), so the first task that genuinely needs one **creates**
  the file — exporting `{ version: "3.0.0", slug, description, default:
  migrate }` — and registers it in `modules/migrations/index.js` (import + push
  into `MIGRATION_REGISTRY`), following the existing `1.901`/`1.906`/`1.907`
  pattern.
- Add a fixture under `test-worlds/` exercising the migration (PRINCIPLES 12).

Each task below states whether it expects a migration. Expectation across the
phase: schema changes here are additive/lenient, so migrations are unlikely
until Phase 6 strips `adjusted` and Phase 7 reshapes the AE-coupled arrays.

### Sequencing rationale

Actors before items; within each group, simplest/least-coupled first so the
shared fragments and the `_register.js` wiring are exercised on a trivial type
before the complex ones. The AE-coupled item types (weapon, armour, shipweapon,
itemattachment, itemmodifier — they carry the bespoke `attributes`/
`itemmodifier`/`itemattachment` arrays) come last so Phase 7 consumes
already-DataModel-shaped data.

Per-task **Steps** apply the Common per-type task template above, with two
standing amendments for all of Phase 5: template step 4 (derived data) → leave
prepare hooks empty (scope clarification); template step 5 (migration) → only if
the per-task "Migration" line says so (migration policy).

- 5.1 — Establish base infrastructure (`base-actor-data.js`, `base-item-data.js`, `_register.js`)

---

### 5.2 — Convert homestead actor type to DataModel

**Why first:** least-coupled actor — no characteristics, skills, stats, species,
career, or general. The legacy preparation does nothing homestead-specific
(`actor-ffg.js` skips characteristics/skills for `homestead` and never calls
`_calculateDerivedValues` for it). Exercises the full create→register→verify
loop on a trivial schema and introduces the three most-shared actor fragments.

**Preconditions:**
- [ ] Task 5.1 complete (`base-actor-data.js`, `_register.js` present; `registerDataModels()` wired into init)
- [ ] `npm run verify` at baseline (typecheck/build/tests green; lint known-red — Phase 12)

**Files to create:**
- `modules/data/actor/homestead-data.js` — `class HomesteadData extends BaseActorData`
- `modules/data/shared/actor-meta.js`, `actor-biography.js`, `attributes.js` (fragments introduced here)
- `tests/data/actor/homestead-data.test.js`

**Files to modify:**
- `modules/data/_register.js` — add `import` + `ACTOR_DATA_MODELS.homestead = HomesteadData`

**Source shape (`template.json:549-563`):** templates `[biography, attributes, meta_only]` plus per-type `cost { value:Number, type, label, adjusted }` and `consumables { value:Number, duration:String, type, label }`.

**Schema notes:**
- Compose `biography()` + `attributesField()` + `metaOnly()`.
- `cost`: `SchemaField{ value: NumberField, adjusted: NumberField /* TODO Phase 6 */ }` (+ optional `type`/`label` helper keys per the persisted-helper-keys note).
- `consumables`: `SchemaField{ value: NumberField(initial 1), duration: StringField(initial "months") }` (+ optional helpers).

**Derived data / prepare hooks:** none — leave `prepare*` empty (schema-only).

**Migration:** none expected (schema mirrors template.json).

**Steps:** Common per-type template steps 1-3, 6-7 (steps 4-5 → none per amendments). Create the three shared fragments while implementing this schema.

**Verification:**
- [ ] `npx vitest run tests/data/actor/homestead-data.test.js` green — asserts defaults populate (`cost.value===0`, `consumables.value===1`, `consumables.duration==="months"`), a populated source object round-trips, and `cost.adjusted` is preserved.
- [ ] `npm run verify` at baseline (new files lint-clean under the strict `modules/data/` rules).
- [ ] Operator smoke: a homestead actor loads and its sheet renders with no console error.

**Do NOT in this task:**
- Add `prepareDerivedData` logic, wire calculators, or touch `actor-ffg.js` (Phase 6).
- Migrate `attributes` to Active Effects (Phase 7) or strip `cost.adjusted` (Phase 6).
- Convert any other actor type.

**Commit:** `phase 05.2: convert homestead to DataModel`

---

### 5.3 — Convert minion actor type to DataModel

**Preconditions:** Task 5.2 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/actor/minion-data.js`
- `modules/data/shared/actor-stats.js`, `characteristics.js`, `skills.js` (fragments introduced here)
- `tests/data/actor/minion-data.test.js`

**Files to modify:** `modules/data/_register.js` (`ACTOR_DATA_MODELS.minion`).

**Source shape (`template.json:435-449`):** templates `[biography, stats, characteristics, skills, attributes, meta_only]` plus per-type `quantity { value, max, type, label, abrev }` and `unit_wounds { value, type, label }`.

**Schema notes:**
- `stats` via `statsSchema({ strain: true })` (the full stats block; `adjusted` on every sub-stat → TODO Phase 6).
- `characteristics` via `characteristicsSchema()`; `skills` via `skillsSchema()` — **build both programmatically from a table** (≈36 skills would blow the 50-line/complexity limits if hand-written as a literal).
- `quantity`: `SchemaField{ value: NumberField(initial 1), max: NumberField(initial 1) }`; `unit_wounds`: `SchemaField{ value: NumberField }` (+ helper keys).

**Derived data / prepare hooks:** none in the DataModel. (Legacy `_prepareMinionData` computes `wounds.max`, `quantity.value`, group-skill ranks, and the talent list; `_calculateDerivedValues` sets `stats.encumbrance.value`. All of that keeps running on `ActorFFG`; Phase 6 moves it into the DataModel.)

**Migration:** none expected.

**Steps:** Common per-type template steps 1-3, 6-7. Create the three fragments; table-drive the large ones.

**Verification:**
- [ ] `npx vitest run tests/data/actor/minion-data.test.js` green — defaults for `quantity`/`unit_wounds`; `stats.strain` present; the full skills/characteristics maps materialize; `adjusted` keys preserved.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a minion loads and its sheet renders.

**Do NOT in this task:** reimplement the minion wound/quantity/group-skill math in the DataModel (Phase 6); convert other types.

**Commit:** `phase 05.3: convert minion to DataModel`

---

### 5.4 — Convert rival actor type to DataModel

**Preconditions:** Task 5.3 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/actor/rival-data.js`
- `modules/data/shared/actor-species.js`, `actor-general.js` (fragments introduced here)
- `tests/data/actor/rival-data.test.js`

**Files to modify:** `modules/data/_register.js` (`ACTOR_DATA_MODELS.rival`).

**Source shape (`template.json:564-599`):** templates `[biography, species, characteristics, skills, attributes, general, meta_only]` plus an **inlined** `stats` block.

**Schema notes — KEY GOTCHA:**
- Rival does **not** use the shared `stats` template; it inlines its own `stats` that **omits `strain`** (keys: `wounds`, `soak`, `defence`, `encumbrance`, `forcePool`, `credits`). Use `statsSchema({ strain: false })` — this is exactly why the fragment takes a `strain` flag (introduced in 5.3).
- Reuse `characteristicsSchema()` + `skillsSchema()` (5.3); add `speciesField()` + `general()`.

**Derived data / prepare hooks:** none in the DataModel. (Legacy runs `_prepareCharacterData` + `_prepareSources` for rival — `actor-ffg.js:252` — building the specialization talent list; unchanged here.)

**Migration:** none expected.

**Steps:** Common per-type template steps 1-3, 6-7. Introduce `speciesField()`/`general()`.

**Verification:**
- [ ] `npx vitest run tests/data/actor/rival-data.test.js` green — explicitly assert `stats.strain` is **absent** from the schema; species/general present; characteristics/skills materialize.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a rival loads and its sheet renders.

**Do NOT in this task:** add `strain` to rival; convert other types.

**Commit:** `phase 05.4: convert rival to DataModel`

---

### 5.5 — Convert nemesis actor type to DataModel

**Preconditions:** Task 5.4 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/actor/nemesis-data.js`; `tests/data/actor/nemesis-data.test.js`.

**Files to modify:** `modules/data/_register.js` (`ACTOR_DATA_MODELS.nemesis`).

**Source shape (`template.json:600-602`):** templates `[biography, species, stats, characteristics, skills, attributes, general, meta_only]` — **no per-type fields.**

**Schema notes:** pure composition of existing fragments — `biography()` + `speciesField()` + `statsSchema({ strain: true })` + `characteristicsSchema()` + `skillsSchema()` + `general()` + `attributesField()` + `metaOnly()`. No new fragments. (Nemesis is the canonical "full humanoid"; it validates that the fragment set composes cleanly.)

**Derived data / prepare hooks:** none in the DataModel (legacy `_prepareCharacterData` + `_prepareSources` apply — `actor-ffg.js:252`).

**Migration:** none expected.

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] `npx vitest run tests/data/actor/nemesis-data.test.js` green — full stats incl. `strain`; species/general/characteristics/skills all present.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a nemesis loads and its sheet renders.

**Do NOT in this task:** introduce a shared subclass to dedupe nemesis/character (anti-creep — inheritance lives only in `base-actor-data.js`); convert other types.

**Commit:** `phase 05.5: convert nemesis to DataModel`

---

### 5.6 — Convert character actor type to DataModel

**Preconditions:** Task 5.5 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/actor/character-data.js`
- `modules/data/shared/actor-career.js`, `actor-specialisation.js` (fragments introduced here)
- `tests/data/actor/character-data.test.js`

**Files to modify:** `modules/data/_register.js` (`ACTOR_DATA_MODELS.character`).

**Source shape (`template.json:401-433`):** templates `[biography, species, career, specialisation, stats, characteristics, skills, attributes, general, meta_only]` plus per-type top-level `encumbrance { value, type, label, abrev, adjusted }`, `obligation { value, label }`, `duty { value, label }`, `morality { value, label }`, `conflict { value, label }`, `experience { total, available }`.

**Schema notes — KEY GOTCHA:**
- Character has **both** a top-level `encumbrance` **and** `stats.encumbrance` (from the stats template). They are distinct persisted fields — declare **both**; do not merge them (anti-creep). Top-level `encumbrance.adjusted` → TODO Phase 6.
- `obligation`/`duty`/`morality`/`conflict`: `SchemaField{ value: NumberField }` (+ `label` helper).
- `experience`: `SchemaField{ total: NumberField, available: NumberField }`.
- Add `careerField()` + `specialisationField()`; reuse all other fragments.

**Derived data / prepare hooks:** none in the DataModel — this is the heaviest legacy prep (`_prepareCharacterData` builds the talent list from specializations, `_prepareSources`, `_calculateDerivedValues`), but it stays on `ActorFFG` for Phase 5.

**Migration:** none expected, but character is the **most likely** type to surface field drift across upstream versions — inspect the `test-worlds/` fixtures; if any character document fails schema validation, add a `3.0.0-actor-datamodels.js` normalization case (per migration policy) and a fixture, and document it.

**Steps:** Common per-type template steps 1-3, 6-7 (+ step 5 only if a fixture forces it).

**Verification:**
- [ ] `npx vitest run tests/data/actor/character-data.test.js` green — assert top-level `encumbrance` and `stats.encumbrance` coexist; `experience.total`/`available` default to 0; obligation/duty/morality/conflict present.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: an existing character loads and its sheet renders with identical displayed values (open/close changes nothing).

**Do NOT in this task:** collapse the duplicate encumbrance fields; move talent-list/source computation into the DataModel (Phase 6); convert vehicle.

**Commit:** `phase 05.6: convert character to DataModel`

---

### 5.7 — Convert vehicle actor type to DataModel

**Preconditions:** Task 5.6 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/actor/vehicle-data.js`; `tests/data/actor/vehicle-data.test.js`.

**Files to modify:** `modules/data/_register.js` (`ACTOR_DATA_MODELS.vehicle`).

**Source shape (`template.json:450-548`):** templates `[biography, attributes, meta_only]` plus a large vehicle-specific `stats` block — `silhouette`, `speed { value, max }`, `handling`, `hullTrauma { value, min, max }`, `systemStrain { value, min, max }`, `shields { fore, port, starboard, aft }`, `armour { value, adjusted }`, `sensorRange { value:String }`, `crew {}` (free-form), `passengerCapacity`, `encumbrance { value, min, max, adjusted }`, `cost { value, adjusted }`, `rarity { value, isrestricted:Boolean, adjusted }`, `customizationHardPoints { value, adjusted }`, `hyperdrive { value }`, `consumables { value, duration }`, `navicomputer { value:Boolean }` — plus top-level `spaceShip:Boolean` and `silhouetteImage:String`.

**Schema notes:**
- Vehicle `stats` is unique — do **not** reuse the humanoid `statsSchema()`. Define it inline in `vehicle-data.js`, **decomposed into one or more small helper functions** (e.g. `vehicleStatsSchema()`) to keep every function ≤ 50 lines and the file ≤ 500.
- `crew`: `ObjectField` (free-form). `sensorRange.value`: `StringField(initial "Short")`. `navicomputer.value`/`rarity.isrestricted`: `BooleanField`. `spaceShip`: `BooleanField(initial false)`. `silhouetteImage`: `StringField(initial "systems/starwarsffg/images/shipdefence.png")`.
- Adjusted fields → TODO Phase 6: `armour.adjusted`, `encumbrance.adjusted`, `cost.adjusted`, `rarity.adjusted`, `customizationHardPoints.adjusted`.

**Derived data / prepare hooks:** none in the DataModel (legacy `_calculateDerivedValues` sets vehicle `stats.encumbrance.value`, plus `hullOverThreshold`/`systemStrainOverThreshold` — unchanged here).

**Migration:** none expected.

**Steps:** Common per-type template steps 1-3, 6-7. Decompose the schema to respect lint limits.

**Verification:**
- [ ] `npx vitest run tests/data/actor/vehicle-data.test.js` green — defaults for `silhouette`, `hullTrauma.max===10`, `systemStrain.max===10`, `consumables.value===1`; `spaceShip===false`; `crew` accepts arbitrary keys.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a vehicle loads and its sheet renders.

**Do NOT in this task:** reuse the humanoid stats fragment; move vehicle derived calc into the DataModel (Phase 6).

**Commit:** `phase 05.7: convert vehicle to DataModel`

> **Actors checkpoint.** After 5.7, `ACTOR_DATA_MODELS` holds all six actor
> types (character, minion, vehicle, homestead, rival, nemesis). Item
> conversions follow.

---

### 5.8 — Convert criticalinjury, criticaldamage item types

**Preconditions:** Task 5.7 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/item/criticalinjury-data.js`, `modules/data/item/criticaldamage-data.js`
- `modules/data/shared/item-core.js` (`core()` fragment — first item task)
- `tests/data/item/criticalinjury-data.test.js`, `tests/data/item/criticaldamage-data.test.js`

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.criticalinjury`, `ITEM_DATA_MODELS.criticaldamage`).

**Source shape (`template.json:816-827`):** both are `[core]` plus `min:0`, `max:0`, `severity:1`.

**Schema notes:**
- `core()` provides `description: HTMLField`, `attributes: ObjectField` (Phase 7), `metadata`.
- Per-type: `min: NumberField`, `max: NumberField`, `severity: NumberField(initial 1)`.
- The two types are shape-identical; write **two explicit small files** rather than a shared subclass (Rule of Two is borderline at two leaf types; explicit beats premature abstraction — PRINCIPLES 35).

**Derived data / prepare hooks:** none. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7. Create the `core()` fragment.

**Verification:**
- [ ] Both test files green — `severity` defaults to 1; `description`/`attributes`/`metadata` come from `core()`.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a criticalinjury and a criticaldamage item sheet render.

**Do NOT in this task:** migrate `attributes` to AE (Phase 7); convert other item types.

**Commit:** `phase 05.8: convert criticalinjury, criticaldamage to DataModels`

---

### 5.9 — Convert motivation, obligation, background item types

**Preconditions:** Task 5.8 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/item/motivation-data.js`, `obligation-data.js`, `background-data.js`
- `modules/data/shared/item-basic.js` (`basic()` fragment — introduced here)
- one test file per type under `tests/data/item/`

**Files to modify:** `modules/data/_register.js` (three `ITEM_DATA_MODELS` entries).

**Source shapes:** motivation (`943-947`) `[core, basic]` + `type:"ambition"`; obligation (`936-942`) `[core, basic]` + `type:"duty"`, `magnitude:0`, `subtype:""`; background (`931-935`) `[core, basic]` + `type:"culture"`.

**Schema notes:**
- `basic()` provides `quantity`, `encumbrance{adjusted}`, `price{adjusted}`, `rarity{adjusted}` — adjusted → TODO Phase 6.
- **GOTCHA:** `core` already declares `description`; these three also list a redundant top-level `description:""` in template.json. It is the same `system.description` path — declare it once (via `core()`); do not double-declare.
- Per-type: `type: StringField` (initial per type), `magnitude: NumberField` + `subtype: StringField` (obligation only).

**Derived data / prepare hooks:** none. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7. Create `basic()`.

**Verification:**
- [ ] Three test files green — correct `type` defaults; obligation has `magnitude`/`subtype`; `basic()` fields present with `adjusted`.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: one of each sheet renders.

**Do NOT in this task:** double-declare `description`; convert other types.

**Commit:** `phase 05.9: convert motivation, obligation, background to DataModels`

---

### 5.10 — Convert species, career item types

**Preconditions:** Task 5.9 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/species-data.js`, `career-data.js`; test files under `tests/data/item/`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.species`, `ITEM_DATA_MODELS.career`).

**Source shapes:** species (`809-815`) `[core]` + `talents:{}`, `abilities:{}`, `species:{}`, `startingXP:0`; career (`887-901`) `[core]` + `specializations:{}`, `signatureabilities:{}`, `careerSkills:{ careerSkill0..7 }`.

**Schema notes:**
- `talents`, `abilities`, `species` (item field — unrelated to the actor `speciesField()`), `specializations`, `signatureabilities`: free-form maps → `ObjectField` each.
- `careerSkills`: positional `careerSkill0..7` keys defaulting to `"(none)"` → `ObjectField` (smaller than 8 explicit StringFields; keys are positional).
- `startingXP: NumberField`.

**Derived data / prepare hooks:** none. **Migration:** none. (Note: `1.901-species-talents.js` already migrates an upstream species-talents shape — **do not touch it**, PRINCIPLES 13.)

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Both test files green — free-form maps accept arbitrary keys; `startingXP` defaults to 0; `careerSkills` round-trips.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a species and a career sheet render.

**Do NOT in this task:** strict-type the free-form maps; convert other types.

**Commit:** `phase 05.10: convert species, career to DataModels`

---

### 5.11 — Convert ability, gear item types

**Preconditions:** Task 5.10 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/item/ability-data.js`, `gear-data.js`
- `modules/data/shared/item-attachments.js` (`itemAttachments()`), `item-qualities.js` (`qualities()`) — introduced here
- test files under `tests/data/item/`

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.ability`, `ITEM_DATA_MODELS.gear`).

**Source shapes:** ability (`828-830`) `[core]` only (no per-type fields); gear (`691-693`) `[core, basic, itemattachments, qualities]`.

**Schema notes:**
- ability is just `core()` — trivial.
- gear composes `core()` + `basic()` + `itemAttachments()` + `qualities()`.
- `qualities()` declares `itemmodifier: ArrayField` and `adjusteditemmodifer: ArrayField` — **preserve the `adjusteditemmodifer` misspelling exactly** (it's the persisted key). These plus `itemattachment` are the bespoke modifier arrays — **Phase 7** reshapes them; declare as `ArrayField(ObjectField)` and keep as-is.

**Derived data / prepare hooks:** none in the DataModel. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7. Create `itemAttachments()` + `qualities()`.

**Verification:**
- [ ] Both test files green — gear has the four fragment groups; the misspelled `adjusteditemmodifer` key exists and defaults to `[]`; ability is `core()`-only.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: an ability and a gear sheet render.

**Do NOT in this task:** "fix" the `adjusteditemmodifer` spelling; migrate the modifier/attachment arrays to AE (Phase 7); convert other types.

**Commit:** `phase 05.11: convert ability, gear to DataModels`

---

### 5.12 — Convert talent item type

**Preconditions:** Task 5.11 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/talent-data.js`; `tests/data/item/talent-data.test.js`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.talent`).

**Source shape (`template.json:750-767`):** `[core]` + `activation { value:"Passive", type, label }`, `ranks { ranked:false, current:1, min:0 }`, `isForceTalent:false`, `isConflictTalent:false`, `tier:1`, `trees:[]`, `longDesc:""`.

**Schema notes:**
- `activation`: `SchemaField{ value: StringField(initial "Passive") }` (+ helpers).
- `ranks`: `SchemaField{ ranked: BooleanField, current: NumberField(initial 1), min: NumberField }`.
- `isForceTalent`/`isConflictTalent`: `BooleanField`. `tier`: `NumberField(initial 1)`. `trees`: `ArrayField(StringField)`. `longDesc`: `HTMLField`.

**Derived data / prepare hooks:** none in the DataModel (actors aggregate talents into `talentList`; that stays actor-side). **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Test green — `activation.value` defaults to `"Passive"`, `ranks.current` to 1, `tier` to 1; `trees` is an array.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a talent sheet renders.

**Do NOT in this task:** convert specialization (5.13) or other types.

**Commit:** `phase 05.12: convert talent to DataModel`

---

### 5.13 — Convert specialization item type

**Preconditions:** Task 5.12 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/specialization-data.js`; `tests/data/item/specialization-data.test.js`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.specialization`).

**Source shape (`template.json:854-886`):** `[core]` + `talents { talent0..talent19 }`, `careerSkills { careerSkill0..4 }`, `universal:false`.

**Schema notes:**
- `talents`: a `talent0..talent19` map whose entries are nested talent objects (with `islearned`, `rank`, etc.). **DECISION POINT:** model the whole map as a single `ObjectField` (recommended — preserves the varied nested content with minimal code) versus 20 explicit `SchemaField`s. If the implementer chooses strict per-key typing, **record an ADR first** (PRINCIPLES 23); otherwise default to `ObjectField`.
- `careerSkills`: `ObjectField`. `universal`: `BooleanField`.

**Derived data / prepare hooks:** none in the DataModel (legacy `_prepareCharacterData` reads `talents[*].islearned` to build the character talent list — unchanged). **Migration:** none (do not touch `1.901-species-talents.js`).

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Test green — `talents` accepts the numbered-key nested structure; `universal` defaults false; `careerSkills` round-trips.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a specialization sheet renders; learned-talent display unchanged.

**Do NOT in this task:** add a migration unless a fixture forces it; convert other types.

**Commit:** `phase 05.13: convert specialization to DataModel`

---

### 5.14 — Convert forcepower, signatureability item types

**Preconditions:** Task 5.13 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/forcepower-data.js`, `signatureability-data.js`; test files under `tests/data/item/`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.forcepower`, `ITEM_DATA_MODELS.signatureability`).

**Source shapes:** forcepower (`831-853`) `[core]` + `upgrades { upgrade0..15 }`, `required_force_rating:0`, `base_cost:0`; signatureability (`902-921`) `[core]` + `upgrades { upgrade0..7 }`, `base_cost:0`, `uplink_nodes { uplink0..3:false }`.

**Schema notes:**
- `upgrades`: numbered-key map of nested upgrade objects → `ObjectField` (same DECISION POINT as 5.13; default `ObjectField`, ADR if going strict).
- `uplink_nodes`: `ObjectField` (or `SchemaField` of four `BooleanField`s — small enough either way; pick one and stay consistent).
- `required_force_rating`/`base_cost`: `NumberField`.

**Derived data / prepare hooks:** none. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Both tests green — `upgrades` accepts numbered keys; `base_cost` defaults 0; `uplink_nodes` booleans default false.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a forcepower and a signatureability sheet render.

**Do NOT in this task:** strict-type `upgrades` without an ADR; convert other types.

**Commit:** `phase 05.14: convert forcepower, signatureability to DataModels`

---

### 5.15 — Convert weapon, armour, shipweapon item types (Phase 7-coupled)

**Preconditions:** Task 5.14 complete; `npm run verify` at baseline.

**Files to create:**
- `modules/data/item/weapon-data.js`, `armour-data.js`, `shipweapon-data.js`
- `modules/data/shared/item-hardpoints.js` (`hardpoints()`), `item-equippable.js` (`equippable()`) — introduced here
- test files under `tests/data/item/`

**Files to modify:** `modules/data/_register.js` (three `ITEM_DATA_MODELS` entries).

**Source shapes:** weapon (`697-733`) `[core, basic, hardpoints, equippable, itemattachments, qualities]` + `skill`, `damage{adjusted}`, `crit{adjusted}`, `range{ value:"Short", adjusted:"Short" }`, `special`, `ammo{ max, value }`; armour (`734-749`) same templates + `defence{adjusted}`, `soak{adjusted}`; shipweapon (`768-804`) same templates + `label`, `firingarc{ fore, aft, port, starboard, dorsal, ventral }` (all Boolean), `damage{adjusted}`, `crit{adjusted}`, `range{adjusted}`, `special`.

**Schema notes:**
- Introduce `hardpoints()` + `equippable()`.
- **GOTCHA:** `range.adjusted` is a **StringField** (initial `"Short"`), not a number — unlike all other `adjusted` keys, which are numeric. Get this right or the schema will reject existing data.
- `damage`/`crit`: `SchemaField{ value: NumberField, adjusted: NumberField }` (TODO Phase 6). `defence`/`soak` (armour) likewise. `ammo`: `SchemaField{ max: NumberField, value: NumberField }`. `firingarc`: `SchemaField` of six `BooleanField`s. `skill`/`special`: `StringField`.
- These types carry the bespoke `attributes`/`itemmodifier`/`itemattachment` arrays (via `core`/`qualities`/`itemattachments`) — **Phase 7** reshapes them; preserve as-is here.

**Derived data / prepare hooks:** none in the DataModel (legacy item prep computes the `adjusted` values; unchanged). **Migration:** none expected.

**Steps:** Common per-type template steps 1-3, 6-7. Create `hardpoints()` + `equippable()`.

**Verification:**
- [ ] Three tests green — assert `range.adjusted` is a **string** default `"Short"`; numeric `adjusted` keys default 0; `ammo`/`firingarc`/`equippable` present.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a weapon, armour, and shipweapon sheet render; equipped/encumbrance behavior unchanged.

**Do NOT in this task:** model `range.adjusted` as a number; migrate the modifier/attachment arrays to AE (Phase 7); change `adjusted` computation; convert itemattachment/itemmodifier (5.16).

**Commit:** `phase 05.15: convert weapon, armour, shipweapon to DataModels`

---

### 5.16 — Convert itemattachment, itemmodifier item types (Phase 7-coupled)

**Preconditions:** Task 5.15 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/itemattachment-data.js`, `itemmodifier-data.js`; test files under `tests/data/item/`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.itemattachment`, `ITEM_DATA_MODELS.itemmodifier`).

**Source shapes:** itemattachment (`922-925`) `[core, basic, hardpoints, qualities, itemattachments]` + `type:"all"`; itemmodifier (`926-930`) `[core, qualities]` + `type:"all"`, `rank:0`.

**Schema notes:**
- Compose existing fragments (`core`/`basic`/`hardpoints`/`qualities`/`itemAttachments` as listed per type). `type`: `StringField(initial "all")`. `rank` (itemmodifier): `NumberField`.
- These two types **are** the bespoke modifier carriers that **Phase 7** reshapes most heavily; for Phase 5, mirror the current shape exactly so existing embedded modifiers/attachments validate.

**Derived data / prepare hooks:** none. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Both tests green — `type` defaults `"all"`; itemmodifier has `rank`; fragment groups present.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: an itemattachment and itemmodifier sheet render; an attachment embedded on a weapon still loads.

**Do NOT in this task:** begin the AE migration (Phase 7); convert shipattachment (5.17).

**Commit:** `phase 05.16: convert itemattachment, itemmodifier to DataModels`

---

### 5.17 — Convert shipattachment item type

**Preconditions:** Task 5.16 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/shipattachment-data.js`; `tests/data/item/shipattachment-data.test.js`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.shipattachment`).

**Source shape (`template.json:805-808`):** `[core, basic, hardpoints, equippable, itemattachments, qualities]` + `label`.

**Schema notes:** pure composition of existing fragments + `label: StringField` (initial `"Ship Attachment"`). No new fragments.

**Derived data / prepare hooks:** none. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Test green — composes the six fragment groups; `label` default present.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a shipattachment sheet renders.

**Do NOT in this task:** convert homesteadupgrade (5.18) in this commit unless explicitly grouped.

**Commit:** `phase 05.17: convert shipattachment to DataModel`

---

### 5.18 — Convert homesteadupgrade item type

> **Added during detailing.** `homesteadupgrade` is a real item type in
> `template.json` (`types[]` line 616; block lines 694-696) but was omitted from
> the original Phase 5 plan — it is absent from tasks 5.8-5.17 and from the
> phase's "Files to be created" item list (which names only 19 item types). The
> phase postcondition requires **every** item type to be registered, so this
> task closes the gap. See STATE.md "Open issues" 2026-05-29.

**Preconditions:** Task 5.17 complete; `npm run verify` at baseline.

**Files to create:** `modules/data/item/homesteadupgrade-data.js`; `tests/data/item/homesteadupgrade-data.test.js`.

**Files to modify:** `modules/data/_register.js` (`ITEM_DATA_MODELS.homesteadupgrade`).

**Source shape (`template.json:694-696`):** `[meta_only]` **only** — the single item type that does not include `core`. So the entire schema is `metadata { tags, sources }`.

**Schema notes:** trivial — reuse the `metaOnly()` fragment created for actors in 5.2 (it is identical: `metadata: SchemaField{ tags, sources }`). Import it directly rather than duplicating; `defineSchema()` returns `{ ...metaOnly() }`.

**Derived data / prepare hooks:** none. **Migration:** none.

**Steps:** Common per-type template steps 1-3, 6-7.

**Verification:**
- [ ] Test green — only `metadata` present; defaults to empty `tags`/`sources` arrays.
- [ ] `npm run verify` at baseline.
- [ ] Operator smoke: a homesteadupgrade item loads with no console error.

**Do NOT in this task:** add a `core`-style body homesteadupgrade never had.

**Commit:** `phase 05.18: convert homesteadupgrade to DataModel`

### 5.last — Verify Phase 5 stop gate

**Steps:**
1. Registration is complete: `_register.js` has **6 actor** entries
   (`ACTOR_DATA_MODELS`: character, minion, vehicle, homestead, rival, nemesis)
   and **20 item** entries (`ITEM_DATA_MODELS`: ability, armour, career,
   criticaldamage, criticalinjury, forcepower, gear, itemattachment,
   itemmodifier, talent, shipattachment, shipweapon, homesteadupgrade,
   signatureability, specialization, species, weapon, background, obligation,
   motivation) = **26 types**, one per `template.json` `types[]` entry. (The
   `_register.js` loop assigns `CONFIG.Actor/Item.dataModels[type]`, so verify
   by entry count in the registry objects, not by grepping CONFIG lines.)
2. `npm run verify` — same green/lint pattern; vitest gains the per-type
   data-model tests added across 5.2-5.18.
3. Manual smoke (operator): every actor sheet still renders, every item sheet
   still renders; no console errors.
4. Migration replay against fixtures (if any) passes.
5. Future-maintainer check (PRINCIPLES): pick one converted type's
   `*-data.js` + the shared fragments it uses and confirm a contributor could
   add a field by reading only those files.

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
