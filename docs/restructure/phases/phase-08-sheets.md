# Phase 08 — Sheet Modernization

## Goal

Split the monolithic actor and item sheets per type. Migrate to true
`ApplicationV2` (Foundry V13's native sheet API), replacing the current
"V2" sheets that are 17-24 line reskins of the legacy sheet.

## Why this phase

`actor-sheet-ffg.js` (2864 lines) and `item-sheet-ffg.js` (2183 lines) each
handle all actor/item types via internal branching. Per-type sheets are
easier to maintain. ApplicationV2 is the Foundry-canonical sheet base
and unlocks render context separation, partial rendering, and other modern
features.

## Phase preconditions

- [ ] Phases 0, 5, 6 complete (DataModels + derived split)
- [ ] `npm run verify` is green

## Phase postconditions

- [ ] `modules/sheets/actor/<type>-sheet.js` exists for each actor type
- [ ] `modules/sheets/item/<type>-sheet.js` exists for each item type
- [ ] Each per-type sheet < 600 lines
- [ ] All sheets extend a `BaseActorSheet` / `BaseItemSheet` from
      `modules/sheets/<actor|item>/base-*.js`
- [ ] Base sheets extend `foundry.applications.sheets.ActorSheetV2` /
      `ItemSheetV2` (or whatever the V13-canonical class is)
- [ ] Legacy `actor-sheet-ffg.js`, `actor-sheet-ffg-v2.js`, `item-sheet-ffg.js`,
      `item-sheet-ffg-v2.js`, `adversary-sheet-ffg.js`, `adversary-sheet-ffg-v2.js`
      are DELETED
- [ ] Sheet registration in init hook uses new per-type classes
- [ ] All sheet features work as before (drag/drop, edit mode, popouts, etc.)
- [ ] `npm run verify` is green
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (ApplicationV2 API is the highest-risk surface for cross-version drift; explicit attention required)

## Files to be created

```
modules/sheets/actor/base-actor-sheet.js
modules/sheets/actor/character-sheet.js
modules/sheets/actor/minion-sheet.js
modules/sheets/actor/rival-sheet.js
modules/sheets/actor/nemesis-sheet.js
modules/sheets/actor/vehicle-sheet.js
modules/sheets/actor/adversary-sheet.js
modules/sheets/actor/homestead-sheet.js

modules/sheets/item/base-item-sheet.js
modules/sheets/item/<type>-sheet.js   ← one per item type

modules/sheets/parts/                 ← shared partials extracted from templates
```

## Files to be deleted (after migration complete)

- `modules/actors/actor-sheet-ffg.js`
- `modules/actors/actor-sheet-ffg-v2.js`
- `modules/actors/adversary-sheet-ffg.js`
- `modules/actors/adversary-sheet-ffg-v2.js`
- `modules/items/item-sheet-ffg.js`
- `modules/items/item-sheet-ffg-v2.js`

## Anti-creep notes

- **Do not** redesign the sheet UX. Per-type extraction preserves layouts.
  Visual changes are a separate concern requiring user feedback.
- **Do not** introduce a new templating language or frontend framework.
  Handlebars stays.
- **Do** extract shared helpers (drag/drop wiring, edit mode toggling,
  render-context building) into base classes. Duplication across type sheets
  is the smell to avoid.

## Scope clarification — incremental extraction, not ApplicationV2 rewrite

True `ApplicationV2` migration (Foundry's `foundry.applications.api.ApplicationV2`)
changes the entire sheet lifecycle: rendering, form submission, context menus, drag/
drop. That is a separate concern from splitting the monolith and belongs in Phase 13
(V14 compat) where the API surface is audited holistically.

Phase 8 splits the monolith sheets into per-type files that extend the **existing
base class** (`foundry.appv1.sheets.ActorSheet` / `ItemSheet`). Each per-type sheet
inherits shared logic from a `BaseActorSheet` / `BaseItemSheet` and adds only its
type-specific getData, activateListeners, and template override. The existing V2
reskin subclasses are absorbed into the per-type sheets (they add nothing but a CSS
class).

## Current architecture

- `ActorSheetFFG` (2869 lines) handles ALL actor types via internal branching
- `ActorSheetFFGV2` (24 lines) adds CSS class "v2", no logic
- `AdversarySheetFFG` (86 lines) overrides template + adds character sheet options
- `AdversarySheetFFGV2` (25 lines) V2 reskin of adversary
- `ItemSheetFFG` (2187 lines) handles ALL item types via internal branching
- `ItemSheetFFGV2` (17 lines) adds CSS class "v2", no logic
- Templates already exist per-type (7 actor, 20 item)

## Tasks

### 8.0 — Detail Phase 8 atomic tasks

This task produced the breakdown below.

### 8.1 — Create base actor sheet + homestead extraction (simplest type)

**Files to create:**
- `modules/sheets/actor/base-actor-sheet.js` — shared actor sheet logic extracted
  from `ActorSheetFFG`: `getData()` common path, `activateListeners()` shared
  bindings, `_onDropItem`, edit-mode, popout-editor, drag/drop, XP, skill
  context menus, persistent sheet size. Everything that isn't type-branched.
- `modules/sheets/actor/homestead-sheet.js` — homestead-specific sheet (trivial:
  homestead has no skills, characteristics, or type-specific branching)

**Files to modify:**
- `modules/swffg-main.js` — register `HomesteadSheet` for type "homestead";
  keep `ActorSheetFFG` for other types during transition

**Verification:** homestead actor sheet renders identically.

### 8.2-8.7 — Per actor type extraction

One task per remaining actor type, simplest first:
- 8.2: Vehicle (unique stats, no skills/characteristics)
- 8.3: Minion (group wounds, quantity)
- 8.4: Rival (no strain, species/general)
- 8.5: Nemesis (full humanoid)
- 8.6: Character (most complex — XP, obligation/duty/morality, specializations)
- 8.7: Absorb AdversarySheetFFG into a config option on character/nemesis/rival sheets

Each task: create `modules/sheets/actor/<type>-sheet.js`, move type-specific
logic from `ActorSheetFFG`, register, verify rendering identical.

### 8.8 — Create base item sheet + simple item extraction

**Files to create:**
- `modules/sheets/item/base-item-sheet.js` — shared item sheet logic
- Per-type sheets for the simplest items first (ability, motivation, background,
  obligation, criticalinjury, criticaldamage, homesteadupgrade)

### 8.9-8.12 — Remaining item type extraction

- 8.9: Descriptive items (species, career, talent)
- 8.10: Tree items (specialization, forcepower, signatureability)
- 8.11: Equipment items (gear, weapon, armour, shipweapon)
- 8.12: Modifier carrier items (itemattachment, itemmodifier, shipattachment)

### 8.13 — Delete legacy sheet files

Delete `actor-sheet-ffg.js`, `actor-sheet-ffg-v2.js`, `adversary-sheet-ffg.js`,
`adversary-sheet-ffg-v2.js`, `item-sheet-ffg.js`, `item-sheet-ffg-v2.js` after
all types are registered with per-type sheets.
