# Phase 10 — Star Wars / Genesys Abstraction

## Goal

Replace inline `if (CONFIG.FFG.theme !== "starwars")` branches with a
`RulesSystem` interface. Two implementations: `StarWarsRules` and
`GenesysRules`. The shared codebase calls into the interface; system-specific
logic lives in the implementation.

## Why this phase

The README claims Genesys support, but the implementation is conditional
logic threaded through Star-Wars-first code. Genesys-specific bugs persist
because the Star Wars path is the happy path. A proper abstraction makes
Genesys a peer implementation.

This phase can be done in parallel with most others; it's mostly mechanical
extraction.

## Phase preconditions

- [ ] Phase 5 complete (so type-specific Genesys differences in actor schemas
      have a clean place to live)
- [ ] `npm run verify` is green

## Phase postconditions

- [ ] `modules/rules/systems/rules-system-interface.js` declares the contract
      (likely a JSDoc-typed interface; once Phase 12 runs, becomes a TS interface)
- [ ] `modules/rules/systems/star-wars-rules.js` implements it
- [ ] `modules/rules/systems/genesys-rules.js` implements it
- [ ] `CONFIG.FFG.rules` is set to the active implementation during init
- [ ] No `CONFIG.FFG.theme` string comparison anywhere outside `modules/rules/systems/`
- [ ] Grepping `grep -rn "theme.*starwars" modules/` returns matches only in the
      systems directory and one selection point during init
- [ ] All Genesys-specific behaviors work identically to before
- [ ] All Star Wars behaviors work identically to before
- [ ] `npm run verify` is green
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")

## Interface scope

The interface captures system-specific decisions. Discover them by grepping
`CONFIG.FFG.theme` and listing each branch. Likely categories:
- Talent sorting (by name vs by tier)
- Skill list defaults
- Characteristic names and abbreviations
- Dice symbol rendering specifics
- Default actor avatars
- Combat / initiative differences

Example interface shape:
```js
// modules/rules/systems/rules-system-interface.js
/**
 * @typedef {Object} RulesSystem
 * @property {string} id
 * @property {string} displayName
 * @property {() => boolean} sortTalentsByTier
 * @property {() => Object} defaultSkillList
 * @property {(characteristicKey: string) => { name: string, abbreviation: string }} characteristicMeta
 * // ... etc
 */
```

## Anti-creep notes

- **Do not** add new system support (e.g., third-party Genesys-derived
  systems). Two implementations only.
- **Do not** unify behaviors that are intentionally different. The point is
  to make differences explicit, not eliminate them.
- **Do** preserve current selection mechanism. If the active system is
  determined by a setting today, it stays that way; this phase reads the
  setting and instantiates the right implementation.
