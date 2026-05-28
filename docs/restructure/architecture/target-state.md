# Target State

This document describes the end-state architecture the restructure is building
toward. Phases are the path; this is the destination.

If a phase task seems to drift from this target, that's a signal to stop and
flag it in `STATE.md` "Open issues".

---

## Headline goals

1. **Persisted vs derived separation is structural.** `actor.system` and
   `item.system` are source of truth only. All computed values live in a
   derived namespace produced by pure functions.
2. **Single modifier pipeline.** Active Effects only. The bespoke `attributes`
   array is gone.
3. **DataModel everywhere.** Every actor type and item type has a
   `TypeDataModel` with `static defineSchema()`. `template.json` is replaced.
4. **No prototype monkey-patching.** Subclass + register.
5. **Gradual TypeScript.** Pure modules typed first; sheets last.
6. **AI-resumable.** This runbook + `STATE.md` is the way work continues.

---

## Human maintainability contract

Per ADR-006, the restructure's primary success criterion is whether human
contributors can maintain the resulting codebase without AI assistance.
This translates to concrete contracts:

- **2-minute locate:** A contributor should locate where a given behavior
  lives in under 2 minutes by reading file/directory names alone.
- **3-file change:** A localized change (add a field, fix a calculation,
  handle a new case) should require reading no more than 3 files.
- **Tests as documentation:** Test files for a module should be sufficient
  to understand the module's behavior without reading implementation.
- **ADRs as memory:** Every non-obvious architectural choice has an ADR.
  Code comments do not carry architectural rationale.
- **File and function size limits:** Enforced by lint (PRINCIPLES.md 28-30).
  These force natural split points.
- **Idiomatic over elegant:** Foundry-canonical patterns are preferred over
  novel abstractions even when the novel pattern is technically superior.
- **Compendium paths preserved:** Per ADR-005, the fork keeps system id
  `starwarsffg`. All compendium paths (`world.starwarsffg.X`) and world
  bindings remain unchanged from upstream.

---

## Target directory layout

```
modules/
├── data/                              ← NEW: typed schemas
│   ├── actor/
│   │   ├── base-actor-data.js
│   │   ├── character-data.js
│   │   ├── minion-data.js
│   │   ├── rival-data.js
│   │   ├── nemesis-data.js
│   │   ├── vehicle-data.js
│   │   └── homestead-data.js
│   ├── item/
│   │   ├── base-item-data.js
│   │   ├── weapon-data.js
│   │   ├── armour-data.js
│   │   ├── talent-data.js
│   │   ├── specialization-data.js
│   │   ├── forcepower-data.js
│   │   ├── signatureability-data.js
│   │   └── ... (one per item type)
│   └── shared/
│       └── characteristic-block.js   ← reusable schema fragment
│
├── rules/                             ← NEW: pure logic
│   ├── calculators/
│   │   ├── encumbrance.js
│   │   ├── wounds.js
│   │   ├── strain.js
│   │   ├── soak.js
│   │   ├── defense.js
│   │   ├── force-pool.js
│   │   └── talent-list.js
│   └── systems/
│       ├── rules-system-interface.js
│       ├── star-wars-rules.js
│       └── genesys-rules.js
│
├── documents/                         ← formerly actor-ffg.js / item-ffg.js
│   ├── actor.js                       ← lean: lifecycle hooks only, delegates to data + rules
│   ├── item.js
│   ├── active-effect.js
│   └── combatant.js
│
├── sheets/                            ← split monolith
│   ├── actor/
│   │   ├── base-actor-sheet.js
│   │   ├── character-sheet.js
│   │   ├── minion-sheet.js
│   │   ├── rival-sheet.js
│   │   ├── nemesis-sheet.js
│   │   ├── vehicle-sheet.js
│   │   └── adversary-sheet.js
│   ├── item/
│   │   ├── base-item-sheet.js
│   │   └── ... (per type)
│   └── parts/                         ← shared partials
│
├── settings/                          ← decomposed
│   ├── index.js
│   ├── compendiums.js
│   ├── combat.js
│   ├── character.js
│   ├── ui.js
│   ├── modifiers.js
│   └── debug.js
│
├── hooks/                             ← decomposed
│   ├── index.js
│   ├── init.js
│   ├── setup.js
│   ├── ready.js
│   ├── render-chat-message.js
│   ├── render-actor-sheet.js
│   ├── canvas-ready.js
│   └── update-combat.js
│
├── importer/
│   └── oggdude/
│       ├── parsers/                   ← XML → IR
│       ├── transformers/              ← IR → DataModel-shaped source
│       ├── writers/                   ← source → compendium docs
│       └── pipeline.js                ← orchestrates stages
│
├── migrations/                        ← NEW location, semver-keyed
│   ├── runner.js                      ← uses foundry.utils.isNewerVersion
│   ├── 1.901.js                       ← existing, relocated
│   ├── 1.906.js
│   ├── 1.907.js
│   ├── 3.0.0-datamodel.js
│   └── ...
│
├── tokens/
│   └── token-ffg.js                   ← extends Token, _drawBar as method
│
└── swffg-main.js                      ← ~100 lines: imports + registerAllSettings + registerAllHooks
```

## Persisted vs derived contract

Persisted (stored in the DB, defined by DataModel):
```js
actor.system.stats.wounds.max     // base
actor.system.stats.wounds.value   // current
actor.system.characteristics.Brawn.value
actor.system.skills.Astrogation.rank
```

Derived (recomputed each prepareDerivedData, never persisted):
```js
actor.derived.stats.wounds.threshold      // wounds.max + brawn + AE mods
actor.derived.stats.soak                   // brawn + equipped armour soak + AE mods
actor.derived.stats.encumbrance.used       // sum across items
actor.derived.skills.Astrogation.dicePool  // dice symbols, not a number
```

Rule: **no code writes to `actor.system.*` outside `_preCreate`, `_preUpdate`,
`_onUpdate`, and explicit user actions.** Derived state lives in `actor.derived.*`.

Templates render from both: `system.*` for editable fields, `derived.*` for
computed display.

## Single modifier pipeline

All modifiers are Active Effects. Items expose their modifiers as embedded
`ActiveEffect` documents. The actor reads them via the standard
`actor.allApplicableEffects()` iteration.

Custom AE change modes are registered for FFG-specific math (dice symbols,
characteristic stacking caps, etc.) — these are *additions* to the standard
pipeline, not a parallel system.

No `item.system.attributes` array. No `getCalculatedValueFromItems`.

## Subsystem boundaries

```
┌──────────────────────────────────────────────────┐
│ sheets/  (presentation; reads derived state)     │
└──────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────┐
│ documents/  (lifecycle, persistence)             │
│   ↳ delegates to data/ for schema                │
│   ↳ delegates to rules/ for computation          │
└──────────────────────────────────────────────────┘
       │                          │
       ▼                          ▼
┌──────────────────┐   ┌────────────────────────┐
│ data/            │   │ rules/                 │
│ (typed schemas)  │   │ (pure calculators)     │
└──────────────────┘   └────────────────────────┘
```

- `sheets/` never imports from `rules/` directly — it gets derived state from
  documents
- `documents/` is the only layer allowed to mutate persisted state
- `rules/` is pure: takes inputs, returns outputs; no `game.*`, no `this`
- `data/` defines the shape; doesn't compute

## Migration contract

- Versions are full semver strings (`"3.0.0"`, not `1.901`)
- Comparison via `foundry.utils.isNewerVersion`
- Each migration is one file in `modules/migrations/`
- Migrations are forward-only and idempotent (running twice is a no-op)
- Every schema-breaking change has a migration AND a fixture in `test-worlds/`
- `npm run verify` includes migration replay against all fixtures

## What disappears

- `template.json` (replaced by DataModel `defineSchema()`)
- `modules/helpers/modifiers.js` (replaced by AE pipeline)
- `modules/swffg-config.js` legacy modifier types (kept only for AE change-mode registration)
- The `*.adjusted` fields in persisted schema (move to derived)
- The `data.skills = mergeObject(...)` mutation pattern
- The `_preUpdate` delta math
- The `actor.applyActiveEffects` override that mutates upstream change objects
- All prototype monkey-patches
- `JSON.parse(game.settings.get(...))` patterns
- The "V2" sheet reskins (replaced by actual ApplicationV2 sheets)

## What stays (intentionally)

- Per-type OggDude importer files (they're already well-scoped; only the
  monolith helper splits)
- `lib/@swrpg-online/dice` as the dice engine (registration cleaned up, but
  the library itself is fine)
- Localization structure
- Cypress E2E tests as smoke
- The Mandar theme
- Custom dice term registration (it's documented Foundry API)
