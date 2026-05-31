# Current State (as of fork start)

This document is **frozen reference**. It describes the architecture of the
upstream Star Wars FFG system at the point this fork was created. Do not
update this file as the restructure progresses — that's what `STATE.md` and
the phase files are for.

The point of this document is to make sure every session understands *why*
the restructure is happening and what the legacy patterns look like, so they
don't accidentally extend them.

---

## Repository scale

- 32,932 lines of JavaScript across `modules/` (excludes lib/, e2e/)
- 0.8% TypeScript (effectively all-JS)
- Foundry V13 only (minimum/verified/maximum all 13)
- No bundler (ships raw ES modules referenced by `system.json`)

## Largest files

| Lines | File | Concern |
|---:|---|---|
| 3322 | `modules/importer/import-helpers.js` | OggDude XML → compendium docs (monolith) |
| 2864 | `modules/actors/actor-sheet-ffg.js` | Actor sheet for all actor types |
| 2183 | `modules/items/item-sheet-ffg.js` | Item sheet for all item types |
| 2006 | `modules/swffg-main.js` | Init + hooks + settings + prototype patches |
| 1839 | `modules/helpers/character-creator.js` | Character creator wizard |
| 1649 | `tests/modifiers.test.js` | Modifier tests (may not run; uses stale `data:` fixtures) |
| 1416 | `modules/combat-ffg.js` | Combat / initiative |
| 791 | `modules/helpers/modifiers.js` | Bespoke modifier pipeline |
| 745 | `modules/actors/actor-ffg.js` | Actor document override |
| 433 | `modules/swffg-migration.js` | Migration runner (uses `parseFloat` on versions) |

## Confirmed architectural problems

### A1. Prototype monkey-patching

- `foundry.canvas.placeables.Token.prototype._drawBar` is overwritten at
  [`modules/swffg-main.js:168`](../../modules/swffg-main.js) (~85 lines of replacement)
- `CONFIG.Dice.rolls[0]` is reassigned at
  [`modules/swffg-main.js:112-113`](../../modules/swffg-main.js) with
  `CONFIG.Dice.rolls.push(CONFIG.Dice.rolls[0]); CONFIG.Dice.rolls[0] = RollFFG;`

Both make every Foundry minor version a potential breakage event.

### A2. `prepareDerivedData` mutates persisted source

[`modules/actors/actor-ffg.js:217-247`](../../modules/actors/actor-ffg.js)
treats `actor.system` as a scratchpad:

- `data.skills = mergeObject(skills, data.skills)` then filters and deletes
- `data.effects.push(...item.effects.contents)` for every item
- `data.skills[skillName][...source]` arrays populated from AE changes in `_prepareSources`

Symptom: opening/closing the sheet "fixes" values because the mutation re-runs.

### A3. Manual delta math in `_preUpdate`

[`modules/actors/actor-ffg.js:117-205`](../../modules/actors/actor-ffg.js)
intercepts Brawn/Willpower changes and manually recomputes wounds, strain,
soak, encumbrance by reading current values, subtracting the old characteristic,
adding the new one.

This is the antipattern that produces "values doubled after edit mode toggle"
bugs: the same derived value is computed in two places (here as deltas, again
in `prepareDerivedData`) with no shared source of truth.

### A4. `applyActiveEffects` mutates upstream change objects

[`modules/actors/actor-ffg.js:725-744`](../../modules/actors/actor-ffg.js)
does `change.value = Math.max(...)` on AE change objects before applying.
Active Effect change objects are shared references in Foundry's collections;
mutating them here can leak state across applications or actors.

### A5. Dual modifier pipelines

Two systems coexist:

- Bespoke: `item.system.attributes` array, calculated by
  `ModifierHelpers.getCalculatedValueFromItems()` with per-type branching
  (`if (item.type === "armour" || item.type === "weapon" || ...)`)
- Foundry Active Effects: separate path, partially wired via
  `_prepareSources` and the `applyActiveEffects` override

The v1.907 "Modifier options are now unified" changelog fix was UI-level only;
the underlying calculation still branches by type string.

### A6. No DataModel adoption

`grep -r "DataModel|defineSchema|TypeDataModel" modules/` returns zero matches.
The system is still on the flat `template.json` approach (introduced pre-v10).
Foundry has been pushing `TypeDataModel` since v10 and this system targets
v13 — five major versions of data-architecture evolution skipped.

### A7. Settings sprawl

~50 `game.settings.register()` calls scattered through `modules/swffg-main.js`
interleaved with hook wiring, prototype patches, and class registration.
A `modules/settings/settings-helpers.js` exists (462 lines) but only handles
`initLevelSettings`.

### A8. Settings used as a JSON-string data store

[`modules/swffg-main.js:62`](../../modules/swffg-main.js) does
`JSON.parse(await game.settings.get("starwarsffg", "arraySkillList"))` with a
try/catch fallback. Settings are typed; storing serialized JSON in a String
setting is the wrong tool.

### A9. Migration system uses `parseFloat` on versions

[`modules/swffg-migration.js:13,30,33,36`](../../modules/swffg-migration.js)
compares versions as `parseFloat(oldVersion) < 1.901`. Works because the
project intentionally versions as `1.901`, `1.906`, etc. The instant anyone
bumps to proper semver (e.g. `1.10.0`), `parseFloat("1.10.0") === 1.1` will
silently skip or misorder migrations.

### A10. "V2" sheets are reskins, not migrations

[`modules/actors/actor-sheet-ffg-v2.js`](../../modules/actors/actor-sheet-ffg-v2.js)
is 24 lines; [`modules/items/item-sheet-ffg-v2.js`](../../modules/items/item-sheet-ffg-v2.js)
is 17 lines. Both just `extends` the legacy sheet, swap the template path,
and delegate listeners to the parent. No `ApplicationV2` adoption.

### A11. Monolithic importer

`import-helpers.js` (3322 lines) mixes XML parsing, schema transformation,
compendium I/O, and error recovery. The per-type importers in
[`modules/importer/oggdude/importers/`](../../modules/importer/oggdude/importers/)
each call back into the monolith for shared utilities.

### A12. CSS scoping was recently global

The v2.0.3 changelog fix "Unscoped CSS in the system is now properly scoped"
indicates global CSS pollution into Foundry's core UI was present for years.

### A13. Star Wars / Genesys not abstracted

`if (CONFIG.FFG.theme !== "starwars")` branches threaded through the code
(actor-ffg.js, modifiers.js, sheet logic). No `RulesSystem` interface;
Genesys is conditional logic, not a peer implementation.

### A14. Bespoke "test framework"

[`tests/`](../../tests/) uses a custom suite runner with chai instead of a
standard test framework. Fixtures use the pre-v10 `data:` namespace, not
`system:`, so the tests may not exercise current code paths even if they run.

---

## What works well (do not break)

- Per-type OggDude importer files ([`modules/importer/oggdude/importers/`](../../modules/importer/oggdude/importers/))
  are reasonably scoped; only the helpers monolith needs splitting
- A migration system exists, even if its comparator is wrong
- The dice library ([`lib/@swrpg-online/dice/`](../../lib/@swrpg-online/dice/))
  is a clean external dependency (though vendored without package.json)
- Localization is in place (7 languages)
- Playwright E2E tests exist (e2e/) — smoke and active-effects coverage

---

## Why we're forking

- Upstream cannot absorb the architectural changes without coordination
- Strict-compat requirement means migrations from any upstream version must work
- AI-driven execution needs a structured runbook (this directory) that doesn't
  exist upstream
