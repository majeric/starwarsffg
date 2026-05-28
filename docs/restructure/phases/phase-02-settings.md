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

- [ ] Phase 0 complete
- [ ] `npm run verify` is green
- [ ] `modules/settings/` exists only as `settings-helpers.js` (the existing 462-line file)

## Phase postconditions (stop gate)

- [ ] `modules/settings/index.js` exports `registerAllSettings()`
- [ ] Each logical concern has its own file in `modules/settings/`
- [ ] `modules/swffg-main.js` calls `registerAllSettings()` once during `init`
      and contains zero `game.settings.register` calls directly
- [ ] The `arraySkillList` JSON-string kludge is replaced with a properly-typed
      setting; migration converts existing worlds
- [ ] `npm run verify` is green
- [ ] All existing settings still appear in Foundry's settings UI with the same
      labels, hints, defaults, and scopes
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
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

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 2.1: Create `modules/settings/index.js` skeleton with empty `registerAllSettings()`
- Tasks 2.2-2.7: One per grouping file (compendiums, combat, character, ui, modifiers, debug)
- Task 2.8: Wire `swffg-main.js` to call `registerAllSettings()`; remove old calls
- Task 2.9: Replace `arraySkillList` JSON-string pattern with typed setting + migration
- Task 2.10: Verify all settings appear in Foundry UI unchanged
- Task 2.11: Verify Phase 2 stop gate

## Anti-creep notes

- **Do not** change setting defaults, labels, hints, or scopes. Move them
  verbatim. Renaming settings is a different concern (would require its own
  migration) and is not in scope.
- **Do not** consolidate settings even if some seem redundant. Audit/cleanup
  of settings is a separate concern.
- **Do** preserve the order of registration where it matters (e.g., dependent
  `onChange` handlers). If unsure, preserve order strictly.
