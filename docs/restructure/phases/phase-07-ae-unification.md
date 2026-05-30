# Phase 07 — Active Effects Unification ⭐ (HIGHEST RISK)

## Goal

Eliminate the bespoke `item.system.attributes` modifier pipeline. All modifiers
become Active Effects. `ModifierHelpers.getCalculatedValueFromItems()` and
all its callers are deleted.

## Why this phase

Per ADR-004: maintaining two parallel modifier pipelines doubles the surface
area of every modifier-touching feature and is the root cause of "this modifier
works for weapons but not vehicles" bugs. Unifying on Active Effects is
Foundry-native, future-proof, and dramatically reduces the bespoke code volume.

## Why highest risk

This phase changes how every modifier-bearing item works. Every world that
upgrades runs a non-trivial data migration that converts `attributes` arrays
to embedded `ActiveEffect` documents. Real-world worlds have many such items
in unexpected configurations. The migration must be exhaustively tested.

## Phase preconditions

- [ ] Phases 0, 1, 5, 6, 11 complete
- [ ] `npm run verify` is green
- [ ] `test-worlds/` contains fixtures with rich modifier scenarios:
      - At least one world per upstream version
      - At least one world with armor + weapons + attachments + talents
        + force powers all granting modifiers
      - At least one vehicle-heavy world

## Phase postconditions

- [ ] `modules/helpers/modifiers.js` is DELETED
- [ ] `item.system.attributes` no longer exists in any DataModel schema
- [ ] No `*.adjusted` fields in any item DataModel schema; item derived values
      are exposed via the `parent.derived` pattern (ADR-011) — absorbed from
      Phase 6 per ADR-012
- [ ] All previous modifier behaviors are reproduced via Active Effects
- [ ] Custom FFG modifier semantics (dice symbol additions, characteristic
      caps, force boost, career skills) are registered as custom AE change
      modes via `CONFIG.ActiveEffect.legacyTransferral` is already false +
      custom mode handlers
- [ ] Sheet UI for "add modifier" creates `ActiveEffect`s, not attributes entries
- [ ] `applyActiveEffects` override in actor-ffg.js no longer mutates
      `change.value` — that logic moves into a custom change mode
- [ ] Migration converts every `item.system.attributes` entry to an embedded
      `ActiveEffect` on its parent item, preserving all semantic information
- [ ] Migration tested against every fixture in `test-worlds/`
- [ ] `npm run verify` is green
- [ ] Manual smoke matrix:
      - Equipping armor changes soak as expected
      - Equipping a weapon adds expected modifiers
      - Learning a talent that grants +1 Brawn changes wounds threshold
        immediately (no sheet reopen)
      - Unlearning the talent reverts the change
      - Force power upgrades that grant force boost work
      - Career skill assignment via talent works
      - Vehicle weapons and armor work
      - Attachments on weapons/armor stack correctly
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (Active Effect change modes and legacyTransferral behavior may differ between versions)

## Files to be created

```
modules/active-effects/change-modes/
├── ffg-add.js                ← FFG-specific additive mode (handles dice symbols)
├── ffg-upgrade.js            ← upgrade dice
├── ffg-downgrade.js          ← downgrade dice
├── ffg-career-skill.js       ← grant career skill status
└── ffg-force-boost.js        ← grant force boost status

modules/migrations/<NEW>-attributes-to-ae.js
```

## Files to be modified

- `modules/active-effects/active-effect-ffg.js` — register custom modes
- `modules/actors/actor-ffg.js` — remove `applyActiveEffects` override
  (it currently mutates AE change values; that becomes change-mode logic)
- `modules/data/item/*.js` — remove `attributes` field from schemas
- `modules/data/actor/*.js` — `_prepareSources` logic relocates to use the
  standard AE iteration

## Files to be deleted

- `modules/helpers/modifiers.js`
- `modules/popout-modifiers.js` (if it only exists for the bespoke pipeline;
  verify before deleting)

## Migration semantics

For each item with `system.attributes`:
1. For each attribute entry, create an embedded `ActiveEffect`:
   - `name`: "Migrated: \<attr.mod>" (or attr.modtype if mod is missing)
   - `changes`: an array with one entry mapping the attribute to an AE change
     - `key`: derived from `mod` and `modtype` (e.g., `system.stats.soak.value`)
     - `value`: attr.value
     - `mode`: the appropriate FFG custom change mode
   - `transfer`: true (effect applies to parent actor)
   - `disabled`: based on the item's equipped/active state (preserve semantics)
2. Delete the entry from `item.system.attributes`
3. After all entries migrated, the entire `attributes` array is empty;
   the schema update in DataModel handles removal

Edge cases the migration must handle:
- `mod === "*"` (the now-removed "Stat All" hack from v2.0.0)
- Attributes with `exclude: true` (preserved as disabled AEs?)
- Attributes on embedded items (e.g., attachments on weapons)
- Attributes on items not currently equipped (effect remains, but `disabled: true`)

Document each edge case decision as an ADR.

## Anti-creep notes

- **Do not** add new modifier capabilities while restructuring. The migration
  must produce semantically identical behavior.
- **Do not** delete `modifiers.js` until every caller is migrated. Use the
  TypeScript / lint gates to find callers.
- **Do** preserve modifier ordering. Some modifiers depend on the order
  they're applied. AE has documented ordering rules; verify behavior matches
  the bespoke pipeline's ordering before declaring the migration complete.

## Tasks

### 7.0 — Detail Phase 7 atomic tasks (+ ADR-014)

This task produced the breakdown below and ADR-014 (architecture + edge cases),
grounded in an investigation of the current modifier system.

### Current architecture (investigation findings)

The system is **hybrid**, not "bespoke vs AE":
- Modifiers are authored as free-form `item.system.attributes` entries
  (`{ modtype, mod, value, … }`). On item create/update,
  `ModifierHelpers.applyActiveEffectOnUpdate` **syncs** them into embedded
  `ActiveEffect`s whose `changes` target keys from `getModKeyPath`
  (e.g. `system.stats.soak.value`, `system.skills.<skill>.boost`). The AEs —
  standard Foundry application, mostly `ADD` mode — are what actually apply.
- The **1.907 migration already performed the bulk `attributes`→AE conversion**
  for existing worlds, so most worlds already carry the AEs.
- `ActiveEffectFFG` is a thin subclass (only disables push animation for item
  effects). The `applyActiveEffects` override in `actor-ffg.js` mutates AE
  change values for the force-pool dice computation.
- `explodeMod` expands compound mods (Brawn → Brawn + EncumbranceMax + Soak;
  Defence → Melee + Ranged; Shields → 4 facings). "Inherent" effects (e.g.
  species Brawn) are AEs named `(inherent)`.
- ~10 production files reference `ModifierHelpers` (callers to migrate before
  deletion): actor-ffg, actor-sheet-ffg, item-ffg, item-sheet-ffg, item-editor,
  item-helpers, dice-helpers, import-helpers, popout-modifiers, plus the 1.907
  migration.

So ADR-004's "AE as the sole pipeline" concretely means: **eliminate the
`attributes` intermediary.** The "add modifier" UI creates/edits AEs directly;
the `attributes`→AE sync and `modifiers.js` are deleted; `item.system.attributes`
is removed from schemas; the already-present AEs become the only representation;
FFG-specific semantics become custom AE change modes. The Phase 6 actor derived
split (deferred via ADR-013) folds in here once AE application is clean.

### Sequencing (safe foundation first; deletions last)

- [x] 7.0 — Detail tasks + ADR-014 (this task)
- [x] 7.1 — Extract the pure modifier→AE-key taxonomy (`explodeMod`,
  `getModKeyPath`, `getModTypeByModPath`) into a tested module
  `modules/active-effects/modifier-map.js`; `modifiers.js` delegates.
  Characterization tests lock the exact mapping (Phase-1-style; no behavior
  change). **Safe foundation.** *(done: modifier-map.js + 14 tests)*
- [x] 7.2 — Register custom FFG AE change modes — **RESOLVED: no custom modes
  needed.** All FFG modifiers already use standard ADD mode (verified); per
  anti-creep, none are invented. The only non-standard logic is the force-pool
  `applyActiveEffects` override, which is derived computation moved in 7.7.
- [ ] 7.3 — Build synthetic `test-worlds/` fixtures covering the modifier
  matrix (armour soak, weapon mods, talent +characteristic, force boost, career
  skill, vehicle stats, attachments). Operator real worlds remain the gold
  standard — flag for augmentation; synthetic fixtures unblock automated replay.
- [x] 7.4 — Migration `3.0.0-attributes-to-ae.js`: pure transform extracted +
  tested (`attribute-to-ae.js`, 6 tests); migration file written + lint-clean
  but **NOT registered** in index.js (held pending operator real-world
  validation, ADR-002). *(orchestration/auto-run pending)*
- [ ] 7.5 — "Add/edit modifier" UI creates AEs directly (replace
  `onClickAttributeControl` + the attributes editor).
- [ ] 7.6 — Migrate the ~10 `ModifierHelpers` callers onto AE iteration / the
  taxonomy module, one cohesive group per commit.
- [ ] 7.7 — Remove the `applyActiveEffects` override (force-pool now a change
  mode from 7.2).
- [ ] 7.8 — Remove `attributes` (and the Phase-7-coupled `itemmodifier`/
  `adjusteditemmodifer`) from item DataModel schemas; fold in the Phase 6 actor
  derived split (`*.adjusted` → `derived.*` via calculators, `_preUpdate`
  removal, `prepareDerivedData` mutation removals) now AE application is clean.
- [ ] 7.9 — Delete `modifiers.js` and `popout-modifiers.js` (verify zero callers
  via lint/grep first — anti-creep note).
- [ ] 7.10 — Update item/chat templates (`*.adjusted` → derived; remove the
  attributes-editor markup).
Per-task blocks expand as each is executed (as in Phases 5–6). Each is one
commit, verified.
