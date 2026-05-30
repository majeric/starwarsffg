# Phase 12 — TypeScript Conversion

## Goal

Convert the JavaScript modules to TypeScript, taking advantage of the typed
domain established by DataModels (Phase 5) and the interface from system
abstraction (Phase 10). Tighten `tsconfig.json` strictness as conversion
progresses.

## Why this phase last

TypeScript pays off most when the type domain is well-defined. The domain
becomes well-defined when:
- DataModels declare all persisted shapes (Phase 5)
- Calculators have explicit input/output types (Phase 1)
- RulesSystem interface declares system-specific contracts (Phase 10)
- AE pipeline has documented change shapes (Phase 7)

Converting earlier costs more (every type is approximate) and pays less
(many shapes are still `any`-ish).

## Phase preconditions

- [ ] Phases 0, 1, 5, 7, 10 complete (the type-domain phases)
- [ ] `npm run verify` is green

## Phase postconditions

- [ ] `modules/rules/calculators/` is 100% TypeScript with full types
- [ ] `modules/data/` is 100% TypeScript
- [ ] `modules/rules/systems/` is 100% TypeScript
- [ ] `modules/settings/`, `modules/hooks/`, `modules/migrations/` are TypeScript
- [ ] `modules/sheets/` is TypeScript (last because sheet types are messy)
- [ ] `tsconfig.json` has `strict: true` and `noImplicitAny: true`
- [ ] `tsc --noEmit` reports zero errors
- [ ] `npm run verify` is green
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")

## Conversion order (easiest first)

1. `modules/rules/calculators/` — pure functions, trivial to type
2. `modules/data/` — DataModels declare their schema; types are derivable
3. `modules/rules/systems/` — interfaces already defined informally
4. `modules/settings/` — small modules, simple types
5. `modules/hooks/` — small modules, Foundry-typed hook callbacks
6. `modules/migrations/` — migration function signature is uniform
7. `modules/importer/` — parser/transformer/writer have clear contracts after Phase 9
8. `modules/active-effects/`, `modules/dice/`, other supporting modules
9. `modules/documents/` (actor.js, item.js, etc.)
10. `modules/sheets/` — last; ApplicationV2 types are evolving

## Per-file conversion pattern

1. Rename `.js` → `.ts`
2. Add explicit types for function signatures
3. Fix the easy errors (literal types, missing return types)
4. For the hard errors (Foundry API gaps): add to `types/foundry-v13.d.ts`
   if reusable, or use a narrowly-scoped `as` cast with a `// FIXME(types):`
   comment otherwise
5. Run `npm run verify`; commit when green

## Tightening tsconfig

Per file or per directory, as conversion progresses:
- After `modules/rules/calculators/` converts: enable `strict: true` for that
  directory only (use a sub-tsconfig if Vite tooling allows; otherwise use
  per-file `// @ts-strict` directives if supported)
- Repeat for each directory
- Phase 12 final task: remove all per-directory strictness overrides; set
  global `strict: true` and `noImplicitAny: true`

## Anti-creep notes

- **Do not** restructure code while converting. Conversion is mechanical:
  same logic, added types. If a refactor is needed, that's a separate task
  with its own ADR.
- **Do not** add new dependencies for typing (no `zod`, no `io-ts` unless
  ADR-justified). Foundry's types + JSDoc + native TS are sufficient.
- **Do** add `// FIXME(types):` comments where types are weak, so future
  sessions can tighten them.

## Tasks

Inventory at detailing time (2026-05-30): 178 JS files in `modules/`,
~23,600 lines. No `.ts` files in modules yet. `tests/setup.ts` is the only
existing TypeScript file. Test imports use `.js` extensions; Vitest with
`moduleResolution: "Bundler"` resolves `.js` imports to `.ts` files, so
test imports do not need updating when a source file is renamed.

---

### 12.0 — Detail Phase 12 task list

**Preconditions:**
- `npm run verify` green (except known-red lint gate)

**Steps:**
1. Survey `modules/` to inventory files per directory, line counts, and
   inter-directory dependencies.
2. Write the task list in this file (the phase file).
3. Update `STATE.md`: set current phase to `phase-12-typescript`, copy tasks.

**Verification:**
- This file contains numbered tasks through 12.last.
- `STATE.md` reflects Phase 12 as current.

**Files touched:** `docs/restructure/phases/phase-12-typescript.md`,
`docs/restructure/STATE.md`

---

### 12.1 — Add TypeScript ESLint tooling

ESLint's default parser cannot parse TypeScript syntax. Without a TS-aware
parser, renamed `.ts` files drop out of lint coverage (or crash ESLint).

**Preconditions:**
- Task 12.0 complete.

**Steps:**
1. Record ADR-015 in `architecture/decision-log.md` for the new dependency.
2. `npm install --save-dev typescript-eslint`.
3. Update `eslint.config.mjs`:
   - Import and configure `typescript-eslint` parser for `*.ts` files.
   - Add `*.ts` to the general file pattern alongside `*.{js,mjs,cjs}`.
   - Disable `no-undef` for `.ts` files (TypeScript handles this via `tsc`).
   - Ensure the strict maintainability rules block already covers `.ts`
     (it does: existing globs use `*.{js,ts}`).
4. Run `npx eslint modules/rules/calculators/ --max-warnings 0` to verify
   the existing JS files still lint clean through the updated config.

**Verification:**
- `npm run verify` green (except known-red lint gate — no worse than before).
- `npx eslint --print-config modules/rules/calculators/encumbrance.js`
  shows the maintainability rules active.

**Anti-creep:** Do not convert any files in this task. Tooling only.

**Files touched:** `package.json`, `package-lock.json`,
`eslint.config.mjs`, `docs/restructure/architecture/decision-log.md`

---

### 12.2 — Convert `modules/rules/calculators/` (7 files, 317 lines)

Pure functions with clear input/output contracts. Easiest conversion.

**Preconditions:**
- Task 12.1 complete (ESLint handles `.ts`).
- `npx eslint modules/rules/calculators/ --max-warnings 0` passes.

**Steps:**
1. Rename each `.js` → `.ts`: encumbrance, wounds, strain, soak, defense,
   force-pool, talent-list.
2. Add parameter and return types to all exported functions.
3. Add types for internal helper functions.
4. Run `npx tsc --noEmit` — fix any errors.
5. Run `npx eslint modules/rules/calculators/ --max-warnings 0`.
6. Run `npx vitest run tests/rules/` — all 51 calculator tests pass.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `ls modules/rules/calculators/*.js` returns no results.
- `ls modules/rules/calculators/*.ts` returns 7 files.
- All 51 calculator tests pass.

**Anti-creep:** Add types only. Do not refactor logic or rename identifiers.

**Files touched:** 7 files renamed in `modules/rules/calculators/`

---

### 12.3 — Convert `modules/rules/systems/` (1 file, 43 lines)

The RulesSystem interface. Extract a TypeScript interface from the
informal class-based pattern.

**Preconditions:**
- Task 12.2 complete.

**Steps:**
1. Rename `rules-system.js` → `rules-system.ts`.
2. Define a `RulesSystem` interface with the shared method signatures.
3. `StarWarsRules` and `GenesysRules` implement the interface explicitly.
4. Type `createRulesSystem` return as `RulesSystem`.
5. Run `npx tsc --noEmit`, `npx eslint`, `npx vitest run tests/rules/`.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `tests/rules/rules-system.test.js` passes (8 tests).

**Files touched:** 1 file renamed in `modules/rules/systems/`

---

### 12.4 — Convert `modules/data/` (45 files, 1218 lines)

DataModel schemas with uniform structure. All are small (<80 lines).

**Preconditions:**
- Task 12.3 complete.

**Steps:**
1. Rename all 45 `.js` files → `.ts` in `modules/data/`.
2. Type the shared fragment factory functions (return `Record<string, DataField>`).
3. Type the per-type `defineSchema()` overrides.
4. For Foundry field types (`SchemaField`, `StringField`, etc.), use the
   existing `foundry.data.fields` types from `fvtt-types`. If gaps exist,
   add type stubs to `types/foundry-v13.d.ts`.
5. Run `npx tsc --noEmit`, `npx eslint modules/data/`, `npx vitest run tests/data/`.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `ls modules/data/**/*.js` returns no results.
- All data schema tests pass.

**Files touched:** 45 files renamed in `modules/data/`

---

### 12.5 — Convert `modules/settings/` (11 files, 1086 lines)

Settings registration functions. Most are small (<80 lines). Three legacy
files are larger: `settings-helpers.js` (327), `crew-settings.js` (207),
`ui-settings.js` (183).

**Preconditions:**
- Task 12.4 complete.

**Steps:**
1. Rename all 11 `.js` files → `.ts`.
2. Type the `register*Settings()` export signatures.
3. For Foundry `game.settings.register()` calls, use the existing types.
   The setting `config` objects have known shapes.
4. Legacy files may need `// FIXME(types):` for loosely-typed Foundry API
   usage (FormApplication, menus).

**Verification:**
- `npm run verify` green (except known-red lint gate).
- No `.js` files remain in `modules/settings/`.

**Files touched:** 11 files renamed in `modules/settings/`

---

### 12.6 — Convert `modules/hooks/` (8 files, 210 lines)

Hook registration wrappers. All are small (<50 lines).

**Preconditions:**
- Task 12.5 complete.

**Steps:**
1. Rename all 8 `.js` files → `.ts`.
2. Type hook callback signatures using Foundry hook types where available.
3. For DOM-event handlers (`$(...).on()`), type as `JQuery.TriggeredEvent`
   or use `// FIXME(types):`.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- No `.js` files remain in `modules/hooks/`.

**Files touched:** 8 files renamed in `modules/hooks/`

---

### 12.7 — Convert `modules/migrations/` (6 files, 456 lines)

Migration runner and per-version migration files. Uniform function
signature: `(world) => Promise<void>` or similar.

**Preconditions:**
- Task 12.6 complete.

**Steps:**
1. Rename all 6 `.js` files → `.ts`.
2. Type the migration runner's API: `registerMigration`, `runMigrations`,
   `compareVersions`.
3. Type individual migration functions.
4. The 1.907 migration has eslint-disable for complexity — preserve it.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `npx vitest run tests/migrations/` — 12 runner tests pass.

**Files touched:** 6 files renamed in `modules/migrations/`

---

### 12.8 — Convert `modules/active-effects/` (8 files, 649 lines)

AE helpers, modifier taxonomy, legacy compat shims.

**Preconditions:**
- Task 12.7 complete.

**Steps:**
1. Rename all 8 `.js` files → `.ts`.
2. Type `modifier-map.js` (the taxonomy): `ModKey`, `ModType` enums or
   union types; `explodeMod`, `getModKeyPath`, `getModTypeByModPath`.
3. Type `attribute-to-ae.js` transform function.
4. `active-effect-ffg.js` extends `ActiveEffect` — use Foundry types.
5. Legacy shim files get minimal typing with `// FIXME(types):` where
   Foundry internals are accessed.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `npx vitest run tests/active-effects/` passes.

**Files touched:** 8 files renamed in `modules/active-effects/`

---

### 12.9 — Convert `modules/tokens/` (1 file, 141 lines)

TokenFFG with the `_drawBar` override and helpers.

**Preconditions:**
- Task 12.8 complete.

**Steps:**
1. Rename `token-ffg.js` → `token-ffg.ts`.
2. Type the class using Foundry Token types from `fvtt-types`.
3. Type `_drawBar` parameters per the Foundry signature.
4. PIXI types come from `fvtt-types`; add stubs if missing.

**Verification:**
- `npm run verify` green (except known-red lint gate).

**Files touched:** 1 file renamed in `modules/tokens/`

---

### 12.10 — Convert `modules/dice/` (11 files, 1580 lines)

Dice types, pool, roll, roll-builder. Foundry dice API types are needed.

**Preconditions:**
- Task 12.9 complete.

**Steps:**
1. Rename all 11 `.js` files → `.ts`.
2. Die type classes (`AbilityDie`, etc.) extend Foundry `Die` — type using
   `fvtt-types`. Likely needs `// FIXME(types):` for custom face data.
3. `pool.js` / `roll.js` / `roll-builder.js` are the most complex. Type
   exports and public methods; internal Foundry API gaps get casts.

**Verification:**
- `npm run verify` green (except known-red lint gate).

**Files touched:** 11 files renamed in `modules/dice/`

---

### 12.11 — Convert `modules/sheets/` (26 files, 362 lines)

Per-type sheet classes. All are thin (~14 lines each) because the
monolith base classes remain in `modules/actors/`.

**Preconditions:**
- Task 12.10 complete.

**Steps:**
1. Rename all 26 `.js` files → `.ts` (6 actor sheets, 20 item sheets).
2. Type the class declarations (each extends a base sheet class).
3. Override method types match Foundry `ActorSheet`/`ItemSheet`.

**Verification:**
- `npm run verify` green (except known-red lint gate).

**Files touched:** 26 files renamed in `modules/sheets/`

---

### 12.12 — Convert `modules/importer/` (25 files, 5788 lines)

The largest directory. Split into sub-tasks by subdirectory.

**Preconditions:**
- Task 12.11 complete.

**Steps:**
1. Rename all 25 `.js` files → `.ts`.
2. Start with utilities: `compendium-utils`, `import-ae-utils`,
   `import-templates`, `oggdude-utils`, `skills-list-importer`.
3. Then OggDude importers (15 files in `oggdude/importers/`).
4. Then top-level: `data-importer`, `swa-importer`, `import-helpers`.
5. `import-helpers.js` (2458 lines) is the largest single file in the
   system. Type its public API; internals get `// FIXME(types):` as needed.
   Do NOT refactor.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `npx vitest run tests/importer/` passes.

**Files touched:** 25 files renamed in `modules/importer/`

---

### 12.13 — Convert `modules/helpers/` (16 files, 4416 lines)

Legacy helper modules. Many are large and complex. Mechanical conversion
with liberal `// FIXME(types):` where Foundry API types are missing.

**Preconditions:**
- Task 12.12 complete.

**Steps:**
1. Rename all 16 `.js` files → `.ts`.
2. Type exported function signatures where types are clear.
3. Foundry UI/Document/Socket API calls get `// FIXME(types):` casts.
4. `modifiers.js` is a compatibility shim for the 1.907 migration —
   minimal typing, preserve eslint-disable.

**Verification:**
- `npm run verify` green (except known-red lint gate).

**Files touched:** 16 files renamed in `modules/helpers/`

---

### 12.14 — Convert `modules/actors/` (5 files, 3484 lines)

Document classes: `actor-ffg.js` (593), `actor-ffg-options.js` (87),
`actor-sheet-ffg.js` (1084), `item-ffg.js` (1301), `item-sheet-ffg.js` (419).

**Preconditions:**
- Task 12.13 complete.

**Steps:**
1. Rename all 5 `.js` files → `.ts`.
2. `ActorFFG` extends Foundry `Actor` — type with `fvtt-types`.
3. `ItemFFG` extends Foundry `Item` — type with `fvtt-types`.
4. Sheet base classes extend `ActorSheet`/`ItemSheet` — type with
   `fvtt-types`.
5. These files have many lint warnings (complexity, max-lines). They are
   legacy code; do NOT fix lint issues during conversion. The eslint
   warnings-as-errors are already known-red.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `npx vitest run tests/actors/` passes.

**Files touched:** 5 files renamed in `modules/actors/`

---

### 12.15 — Convert `modules/` root files (8 files, 3843 lines)

Top-level modules: `swffg-main.js` (the entry point), `dice-pool-ffg.js`,
`combat-ffg.js`, `ffg-destiny-tracker.js`, `groupmanager-ffg.js`,
`popout-editor.js`, `popout-modifiers.js`, `swffg-config.js`.

**Preconditions:**
- Task 12.14 complete (all imported modules are now `.ts`).

**Steps:**
1. Rename all 8 `.js` files → `.ts`.
2. Update `vite.config.mjs`: the `foundryModuleInputs()` function resolves
   paths from `system.json`'s `.js` entries. Add a resolution step that
   checks for `.ts` when the `.js` path doesn't exist, so Vite finds the
   renamed entry points.
3. `swffg-main.js` is 1631 lines — type the init/ready hooks and
   registration calls. Heavy use of `// FIXME(types):`.
4. `swffg-config.js` is the CONFIG constant definitions — straightforward.

**Verification:**
- `npm run verify` green (except known-red lint gate).
- `npm run build` succeeds; `dist/` contains the expected output.

**Files touched:** 8 files renamed in `modules/`, `vite.config.mjs`

---

### 12.16 — Enable `strict: true` and `noImplicitAny: true`

Tighten tsconfig for the full codebase. Fix all resulting errors.

**Preconditions:**
- Tasks 12.2–12.15 complete (all modules converted to `.ts`).

**Steps:**
1. Set `strict: true` and `noImplicitAny: true` in `tsconfig.json`.
2. Remove `strict: false` and `noImplicitAny: false`.
3. Run `npx tsc --noEmit` and fix errors iteratively.
4. For genuinely untyped Foundry API boundaries, use explicit `any` with
   `// FIXME(types):` rather than `as any`.

**Verification:**
- `npx tsc --noEmit` reports zero errors.
- `npm run verify` green (except known-red lint gate).

**Files touched:** `tsconfig.json`, various `.ts` files

---

### 12.last — Phase 12 stop-gate

**Preconditions:**
- All tasks 12.0–12.16 complete.

**Steps:**
1. `ls modules/**/*.js` — confirm no `.js` files remain in `modules/`.
2. `npx tsc --noEmit` — zero errors.
3. `npm run verify` — green (the lint gate should improve significantly
   since TS files no longer trigger `no-undef` warnings).
4. Future-maintainer check: pick a representative converted file (e.g.
   `modules/rules/calculators/encumbrance.ts`) and verify a contributor
   could make a small change by reading only it plus at most 2 others.
5. Update `STATE.md`: check off Phase 12, advance to Phase 13.

**Verification:**
- All phase postconditions met.
- `npm run verify` is green.
