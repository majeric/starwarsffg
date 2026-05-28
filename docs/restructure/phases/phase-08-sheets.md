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

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 8.1: Create base sheet classes with ApplicationV2 inheritance
- Tasks 8.2-8.N: One per actor type — extract from monolith, verify rendering
- Tasks 8.N+1 to 8.M: One per item type
- Task 8.M+1: Delete legacy sheet files
- Task 8.M+2: Verify Phase 8 stop gate
