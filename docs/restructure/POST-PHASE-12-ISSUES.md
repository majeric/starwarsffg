# Post-Phase 12 Issues

Identified during a comprehensive review of Phases 0–12. Each item is
self-contained and can be worked independently. Items are grouped by
priority and ordered within groups by estimated impact.

---

## High Priority — Runtime Bugs

### H1. Null-safety bug in legacy-attribute-effects.ts

**File:** `modules/active-effects/legacy-attribute-effects.ts`, lines 114–115

**Problem:** `.find()` result is used without a null check:
```ts
changes.find((ae) => ae.key === "system.characteristics.Brawn.value").value
```
`.find()` returns `undefined` when no match exists. Accessing `.value` on
`undefined` throws at runtime. Same issue on line 115 for Willpower.

**Fix:** Use optional chaining with a fallback:
```ts
changes.find((ae) => ae.key === "system.characteristics.Brawn.value")?.value ?? 0
```

**Verification:** `npx tsc --noEmit` and `npx vitest run tests/active-effects/`

---

### H2. Non-null assertion on optional name in rules-system.ts

**File:** `modules/rules/systems/rules-system.ts`, line 41

**Problem:** `a.name!.localeCompare(b.name!)` — `TalentLike.name` is
declared `name?: string` (optional). The `!` assertions will throw if a
talent has no name.

**Fix:** Use a fallback: `(a.name ?? "").localeCompare(b.name ?? "")`

**Verification:** `npx tsc --noEmit` and `npx vitest run tests/rules/`

---

### H3. typeof === "array" is always false

**File:** `modules/helpers/common.ts`, line 93

**Problem:** `typeof x === "array"` — `typeof` never returns `"array"`.
This condition is dead code; the intended check is never reached.

**Fix:** Replace with `Array.isArray(x)`. This file has `@ts-nocheck` so
the fix must be verified manually.

**Verification:** `npm run build` (check that the build warning disappears)

---

### H4. !== [] is always true

**File:** `modules/combat-ffg.ts`, line 1020

**Problem:** `x !== []` — reference comparison against a new array literal
is always `true`. The intended check was probably `x.length > 0` or
`x.length !== 0`.

**Fix:** Replace with the intended emptiness check (likely `x.length > 0`).
Read surrounding context to confirm intent. This file has `@ts-nocheck`.

**Verification:** `npm run build` (check that the build warning disappears)

---

## Medium Priority — Type Safety / Architecture

### M1. Index signature defeats typed properties on DicePoolFFG

**File:** `modules/dice/pool.ts`, line 23

**Problem:** `[key: string]: any` index signature makes all 18 typed
property declarations above it effectively `any`. Typos like
`pool.succes = 5` compile silently.

**Fix:** Remove the index signature. The only dynamic access
(`this[symbol]` in `renderAdvancedPreview`) can use a type assertion at
that one call site, or use a union type of the valid symbol keys.

**Verification:** `npx tsc --noEmit`

---

### M2. defaultOptions returns any on all 26 sheet classes

**Files:** All 26 files in `modules/sheets/actor/` and `modules/sheets/item/`

**Problem:** Each sheet class has `static get defaultOptions(): any` as a
workaround for an fvtt-types tuple width mismatch on the `classes` array.
Returning `any` loses type safety for all callers.

**Fix:** Remove the `: any` return type. Instead, cast only the `classes`
array inside the return value:
```ts
static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    classes: ["starwarsffg", "sheet", "actor", "v2", "character"] as any,
    ...
  });
}
```

**Verification:** `npx tsc --noEmit`

---

### M3. Migration functions ignore MigrationWorld interface

**Files:**
- `modules/migrations/1.901-species-talents.ts` line 10
- `modules/migrations/1.906-compendium-paths.ts` line 18
- `modules/migrations/1.907-active-effects.ts` line 25
- `modules/migrations/3.0.0-attributes-to-ae.ts` lines 25, 33, 40

**Problem:** `runner.ts` defines a `MigrationWorld` interface, but all
migration functions use `world: any`.

**Fix:** Import and use `MigrationWorld` for the `world` parameter in each
migration function. Export the interface from `runner.ts` if not already
exported.

**Verification:** `npx tsc --noEmit` and `npx vitest run tests/migrations/`

---

### M4. Remove allowJs from tsconfig.json

**File:** `tsconfig.json`

**Problem:** `allowJs: true` is set but no `.js` files remain in
`modules/`. This is misleading and could mask accidental JS file creation.

**Fix:** Set `allowJs: false` or remove the key entirely. Also consider
setting `checkJs: false` explicitly (or remove it) since it has no effect
when `allowJs` is false.

**Verification:** `npx tsc --noEmit` and `npm run verify`

---

### M5. ESLint missing typescript-eslint recommended rules

**File:** `eslint.config.mjs`

**Problem:** The TypeScript config only enables the parser and one rule
(`no-unused-vars`). It does not extend `tseslint.configs.recommended`, so
TS-specific lint checks (no-explicit-any, no-non-null-assertion, etc.) are
not active.

**Fix:** Add `...tseslint.configs.recommended` to the ESLint config for
`.ts` files. Audit the resulting warnings — many will come from
`@ts-nocheck` files and can be suppressed per-file or added to the
known-red warning count.

**Verification:** `npx eslint modules/ --max-warnings 9999` to see the new
warning landscape, then adjust the threshold as appropriate.

---

## Test Coverage Gaps

### T1. Dice module has zero tests

**Directory:** `modules/dice/` (pool.ts, roll.ts, roll-builder.ts, 7 die types)

**Problem:** The most user-facing game mechanic — dice pool assembly, roll
evaluation, FFG result cancellation (success vs failure, advantage vs
threat) — has no automated tests.

**Priority tests to write:**
1. `DicePoolFFG.upgrade()` and `upgradeDifficulty()` — verify dice
   promotion/demotion logic
2. `DicePoolFFG.renderDiceExpression()` — verify formula string generation
3. `RollFFG` result cancellation (Step 6 in `evaluate()`) — verify
   success/failure and advantage/threat cancel correctly

**Mock requirements:** Needs `Roll` base class mock and `CONFIG.Dice.terms`
in `tests/setup.ts`.

---

### T2. Helpers module has zero working tests

**Files:**
- `tests/common.test.js` — skipped (`describe.skip`), awaiting migration
  from legacy custom test runner
- `tests/modifiers.test.js` — skipped, same reason
- `modules/helpers/dice-helpers.ts`, `actor-helpers.ts`, `item-helpers.ts`
  — no tests at all

**Fix:** Migrate the two skipped test suites to vitest. Then prioritize
`dice-helpers.ts` (roll dialog construction) and `actor-helpers.ts` (actor
update logic).

---

### T3. Combat, actor documents, and item documents are untested

**Files:** `modules/combat-ffg.ts`, `modules/actors/actor-ffg.ts`,
`modules/items/item-ffg.ts`

**Problem:** These contain complex business logic (initiative, derived
data preparation, _preUpdate validation) with no test coverage.

**Mock requirements:** These need Actor/Item document mocks with
`prepareDerivedData()`, `getEmbeddedCollection()`, etc. — significantly
more complex than the current `tests/setup.ts` provides.

---

## Low Priority — Cleanup

### L1. parseInt on number values in die types

**Files:** All 7 files in `modules/dice/dietype/`, lines 38–45 each

**Problem:** `parseInt(result.ffg.success)` where `result.ffg` is
`FFGDiceResult` (all fields `number`). `parseInt` on a number is a no-op.
Also missing radix parameter.

**Fix:** Replace `parseInt(result.ffg.success)` with `result.ffg.success`
(direct addition). If the concern is string coercion from Foundry, use
`Number(result.ffg.success)` instead.

---

### L2. Redundant double-cast on game.settings.get

**File:** `modules/tokens/token-ffg.ts`, lines 149–157

**Problem:** `game.settings!.get(...) as unknown as number` — the global
`SettingConfig` declares `[key: \`starwarsffg.${string}\`]: any`, so the
return is already `any`. The `as unknown as number` is redundant.

**Fix:** Replace with `game.settings!.get(...) as number`. Better yet,
declare specific setting keys with their real types in `SettingConfig`.

---

### L3. Unnecessary as any cast on thresholdValues

**File:** `modules/active-effects/legacy-attribute-effects.ts`, line 139

**Problem:** `(thresholdValues as any)[change.key]` — `thresholdValues` is
already `Record<string, number>` and `change.key` is `string`, so the cast
is unnecessary.

**Fix:** Remove the `as any` cast: `thresholdValues[change.key]`.

---

### L4. STAT_KEYS lookup can be type-safe

**File:** `modules/active-effects/modifier-ae-helpers.ts`, line 38

**Problem:** `(STAT_KEYS as any)[key]` uses an `as any` cast.

**Fix:** Use `STAT_KEYS[key as keyof typeof STAT_KEYS]` with an `in`
guard: `if (key in STAT_KEYS) { ... }`.

---

### L5. verify.mjs does not fail-fast

**File:** `scripts/verify.mjs`

**Problem:** All gates run sequentially even after a failure. Wastes CI
time running build/smoke/migration after a typecheck failure.

**Fix:** Add an early-exit option or short-circuit after the first failure.
Keep the current run-all behavior available via a `--no-fail-fast` flag for
local debugging.

---

### L6. Overly broad any types in active-effects interfaces

**Files:**
- `modules/active-effects/attribute-to-ae.ts` line 14: `LegacyAttribute.value: any`
- `modules/active-effects/attribute-to-ae.ts` line 19: `ActiveEffectChangeData.mode: any`
- `modules/active-effects/modifier-ae-helpers.ts` line 31: `ModifierData.value: any`

**Fix:** Narrow to `number | string` for values and `number` for mode
(it's always a `CONST.ACTIVE_EFFECT_MODES` value).

---

### L7. DicePoolFFG constructor parameter untyped

**File:** `modules/dice/pool.ts`, line 25

**Problem:** `constructor(obj?: any)` accepts a complex object with known
keys but no interface.

**Fix:** Define a `DicePoolFFGInit` interface with the known keys
(proficiency, ability, challenge, etc. plus optional nested `source`
arrays). Use it as the constructor parameter type.
