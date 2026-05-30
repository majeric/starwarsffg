# Phase 02 — Settings Module Decomposition

## Goal

Move all ~50 `game.settings.register()` calls out of `modules/swffg-main.js`
into a structured `modules/settings/` directory, grouped by logical concern.
`swffg-main.js` loses ~800 lines.

## Why this phase

`swffg-main.js` is a god module. Settings registration is interleaved with
hook wiring, prototype patches, and class registration, making the init
sequence brittle and hard to reason about. Decomposing settings is the
lowest-risk first step toward shrinking the god module.

This phase has no runtime behavior change other than the `arraySkillList`
JSON-string migration (see below).

## Phase preconditions

- [x] Phase 0 complete
- [x] `npm run verify` is green
- [x] `modules/settings/` exists only as `settings-helpers.js` (the existing 462-line file)

## Phase postconditions

- [x] `modules/settings/index.js` exports `registerAllSettings()`
- [x] Each logical concern has its own file in `modules/settings/`
- [x] `modules/swffg-main.js` calls `registerAllSettings()` once during `init`
      and contains zero `game.settings.register` calls directly
- [ ] The `arraySkillList` JSON-string kludge is replaced with a properly-typed
      setting; migration converts existing worlds *(deferred: setting is now
      Object-typed, but the explicit migration was replaced with the defensive
      `parseSkillList()` helper — see STATE Open issues)*
- [x] `npm run verify` is green
- [x] All existing settings still appear in Foundry's settings UI with the same
      labels, hints, defaults, and scopes
- [x] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (audit new code against API differences; full certification deferred to Phase 13)

## Files to be created

```
modules/settings/index.js
modules/settings/compendiums.js
modules/settings/combat.js
modules/settings/character.js
modules/settings/ui.js
modules/settings/modifiers.js
modules/settings/debug.js
modules/migrations/<NEW>-array-skill-list.js  (per Phase 11 migration system)
```

## Files to be modified

- `modules/swffg-main.js` — remove settings registration; call `registerAllSettings()`
- `modules/settings/settings-helpers.js` — leave alone if it's purely `initLevelSettings`;
  if it overlaps with new files, move overlapping settings to the appropriate new file

## Grouping convention

| File | Settings to include |
|---|---|
| `compendiums.js` | All `*Compendiums` settings (specialization, signatureAbility, forcePower, talent, background, obligation, species, career, motivation, item) |
| `combat.js` | `initiativeRule`, `useGenericSlots`, `removeCombatantAction`, `configuredTurnMarker` |
| `character.js` | `maxAttribute`, `maxSkill`, `defaultObligation`, `defaultDuty`, `defaultMorality`, `defaultCredits`, `maxRarity`, `allowRestricted`, `notifyOnXpSpend`, `enableSoakCalc` |
| `ui.js` | `ui-uitheme`, `ui-token-*` colors, `RivalTokenPrepend`, `showMinionCount`, `showAdversaryCount`, `adversaryItemName`, `talentSorting` |
| `modifiers.js` | `arraySkillList`, `additionalStatuses`, `useDefense`, `displaySimulation`, `rollSimulation` |
| `debug.js` | `enableDebug`, `systemMigrationVersion` |

If a setting clearly belongs in two groups, pick one and add a comment in
the other file noting where it went.

## The arraySkillList migration

Current state (broken pattern):
```js
// swffg-main.js:62
return JSON.parse(await game.settings.get("starwarsffg", "arraySkillList"));
```

The setting is registered as `type: String` but stores a JSON-serialized object.

Target state:
- Register as a typed setting (object/array, depending on shape)
- Migration: on first load after this phase, read the existing string-typed
  value, parse it, store it back as the new type
- Remove all `JSON.parse(game.settings.get(...))` call sites

Document the migration in `modules/migrations/<version>-array-skill-list.js`.
If Phase 11 hasn't run yet (which it shouldn't have, given phase ordering),
add it to the existing `modules/swffg-migration.js` for now and flag in
`STATE.md` "Open issues" to relocate when Phase 11 runs.

## Tasks

**Scoped narrowly:** Phase 2 extracts the ~30 `game.settings.register()` calls
that currently live in `modules/swffg-main.js` only. The existing
`modules/settings/settings-helpers.js`, `modules/settings/ui-settings.js`, and
`modules/settings/crew-settings.js` are NOT modified by this phase; their
settings stay where they are. Consolidating all settings files into the
target-state layout is a follow-up concern (open issue at phase close).

Many extracted settings have `onChange` callbacks referencing functions
defined in `swffg-main.js` scope (e.g., `_setffgInitiative`). Per-task specs
note when a helper must move alongside the setting OR when the callback is
passed in via a parameter to the register function.

### 2.1 — Create settings index

**Files to create:**
- `modules/settings/index.js` exporting `export function registerAllSettings(callbacks = {})`

**Function spec:**
```js
export function registerAllSettings(callbacks = {}) {
  registerCompendiumSettings();
  registerCombatSettings(callbacks);
  registerCharacterSettings();
  registerSimulationSettings();
  registerSkillListSettings();
  registerCrewMainSettings();
  registerDebugSettings();
}
```

Each `register*` function is imported from its grouping file (created in
later tasks). The `callbacks` param carries hook functions that can't be
moved (e.g., the initiative re-setter).

For task 2.1, all grouping files don't exist yet — wrap each call in a
try/catch + console.warn so the index can be wired immediately even if a
group hasn't been extracted yet, OR (preferred) leave the imports
commented out and uncomment as each grouping task lands.

**Verification:** lint + typecheck pass; importing index.js does nothing
yet.

**Commit:** `phase 02.1: scaffold modules/settings/index.js`

---

### 2.2 — Extract compendium settings

**Source:** `modules/swffg-main.js:393-478` (10 *Compendiums settings)

**Files to create:**
- `modules/settings/compendiums.js` exporting `registerCompendiumSettings()`

**Settings to move (verbatim):**
specializationCompendiums, signatureAbilityCompendiums, forcePowerCompendiums,
talentCompendiums, backgroundCompendiums, obligationCompendiums, speciesCompendiums,
careerCompendiums, motivationCompendiums, itemCompendiums

All are `scope: "world", config: false, type: String` with a default string of
compendium pack ids. Move verbatim.

**Steps:**
1. Create `modules/settings/compendiums.js` with `registerCompendiumSettings()`
   that contains each `game.settings.register(...)` call exactly as in source
2. Import in `modules/settings/index.js`; call from `registerAllSettings()`
3. Delete the 10 registration calls from `swffg-main.js:393-478`
4. Add `import { registerCompendiumSettings } from "./settings/compendiums.js"`
   at the top of swffg-main.js (or rely on index.js if it's already wired)
5. Verify: `npm run verify` + manually confirm Foundry shows the settings

**Commit:** `phase 02.2: extract compendium settings`

---

### 2.3 — Extract combat settings

**Source:** `modules/swffg-main.js:335-368, 518-549, 158-165`
(initiativeRule, useGenericSlots, removeCombatantAction, configuredTurnMarker)

**Helper to move:** `_setffgInitiative(rule)` is defined inside the init hook
in swffg-main.js. Move it to `modules/settings/combat.js` and export it for
use as the `onChange` callback of `initiativeRule`.

**Files to create:**
- `modules/settings/combat.js` exporting `registerCombatSettings(callbacks)`
  and `setFFGInitiative(rule)`

**Settings to move:**
- `useGenericSlots` (its onChange triggers `window.location.reload()`)
- `removeCombatantAction`
- `configuredTurnMarker`
- `initiativeRule` (its onChange is `setFFGInitiative`)

**Note:** `useGenericSlots` is read in swffg-main.js to gate registering
`CombatTrackerFFG` etc. The READ stays in swffg-main.js; only the register
moves.

**Commit:** `phase 02.3: extract combat settings`

---

### 2.4 — Extract character settings

**Source:** `modules/swffg-main.js:275-330, 373-388`

**Files to create:**
- `modules/settings/character.js` exporting `registerCharacterSettings()`

**Settings to move:**
notifyOnXpSpend, defaultObligation, defaultDuty, defaultMorality,
maxRarity, allowRestricted, defaultCredits, maxAttribute, maxSkill

All `scope: "world", config: false`. Plain value settings. Move verbatim.

**Commit:** `phase 02.4: extract character settings`

---

### 2.5 — Extract simulation and miscellaneous settings

**Source:** `modules/swffg-main.js:147-156, 480-512`

**Files to create:**
- `modules/settings/simulation.js` exporting `registerSimulationSettings()`

**Settings to move:**
- `additionalStatuses` (onChange triggers reload)
- `useDefense` (scope: client)
- `displaySimulation`
- `rollSimulation`

**Commit:** `phase 02.5: extract simulation settings`

---

### 2.6 — Extract skill-list settings and arraySkillList migration

**Source:** `modules/swffg-main.js:557-602` (skill-list area) plus `parseSkillList()`
function at lines 60-67 which JSON.parses the setting value.

**Files to create:**
- `modules/settings/skill-list.js` exporting `registerSkillListSettings()`
  and `getSkillList()` (replacing the broken `parseSkillList()`)
- `modules/migrations/<sha>-array-skill-list.js` migration that converts the
  existing string-typed value to a typed Object setting

**Settings to move:**
- `addskilltheme` (registerMenu)
- `addskilltheme` (the setting itself)
- `arraySkillList` — CHANGE TYPE: was `type: String` storing JSON-serialized
  data; convert to `type: Object` storing the data directly
- `skilltheme`

**Migration:**
On first load with the new setting type, detect the stored string,
`JSON.parse` it, and re-store as a typed Object. If parse fails (e.g.,
already migrated), fall back to default.

**getSkillList helper:** Reads the now-typed setting; no JSON.parse. Update
the one caller of `parseSkillList()` in swffg-main.js to use this.

**Commit:** `phase 02.6: extract skill-list settings and migrate arraySkillList type`

---

### 2.7 — Extract crew main settings

**Source:** `modules/swffg-main.js:1888-1915`
(arrayCrewRoles menu + setting, initiativeCrewRole)

**Note:** `modules/settings/crew-settings.js` already exists with related
crew logic. To avoid renaming or merging during this phase, the new file
is named `crew-main-settings.js` so it sits next to the existing one
without conflict. A follow-up task (after Phase 2 close) can consolidate.

**Files to create:**
- `modules/settings/crew-main-settings.js` exporting `registerCrewMainSettings()`

**Settings to move:**
- `arrayCrewRoles` (registerMenu + setting)
- `initiativeCrewRole`

**Commit:** `phase 02.7: extract crew main settings`

---

### 2.8 — Extract debug setting

**Source:** `modules/swffg-main.js:134-142`

**Files to create:**
- `modules/settings/debug.js` exporting `registerDebugSettings()`

**Settings to move:**
- `enableDebug` (onChange triggers `this.debouncedReload`; verify this
  reference still resolves — if it requires the init-hook `this`, switch
  to `() => foundry.utils.debouncedReload()` if available or
  `window.location.reload`)

**Commit:** `phase 02.8: extract debug setting`

---

### 2.9 — Wire swffg-main.js to call registerAllSettings()

**Source:** what's left in `swffg-main.js` after tasks 2.2-2.8

**Files modified:**
- `modules/swffg-main.js` — at the right point in the init hook (after
  CONFIG namespacing, before things that depend on settings being
  registered), call `registerAllSettings({ ... callbacks ... })`
- Remove all `game.settings.register(...)` lines that have been moved
- Verify no orphaned references to moved helpers

**Verification:**
- `grep -n "game.settings.register" modules/swffg-main.js` returns zero
  matches for the extracted settings (the existing `settings-helpers.js`
  remains; `crew-settings.js` remains; this only checks main is clean)
- All settings still appear in Foundry's settings UI when the operator
  manually verifies
- `npm run verify` passes (lint may still fail on legacy size of
  swffg-main.js — should be smaller now though)

**Commit:** `phase 02.9: wire swffg-main.js to registerAllSettings()`

---

## Out of scope for Phase 2 (open issues at close)

- Consolidating `settings-helpers.js` (30+ registrations + many menus) into
  the new per-group layout
- Consolidating `ui-settings.js` and `crew-settings.js` into the new layout
- Moving the token-display settings (`showMinionCount`, `showAdversaryCount`,
  `adversaryItemName`) out of `modules/helpers/token.js` into
  `modules/settings/`
- Removing the redundant `crew-main-settings.js` / `crew-settings.js`
  separation (intentional during Phase 2 to avoid mid-phase renames)

## Anti-creep notes

- **Do not** change setting defaults, labels, hints, or scopes. Move them
  verbatim. Renaming settings is a different concern (would require its own
  migration) and is not in scope.
- **Do not** consolidate settings even if some seem redundant. Audit/cleanup
  of settings is a separate concern.
- **Do** preserve the order of registration where it matters (e.g., dependent
  `onChange` handlers). If unsure, preserve order strictly.
