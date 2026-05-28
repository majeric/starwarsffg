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

## Tasks (to be detailed before phase begins)

Approximately one task per directory converted, plus tightening tasks for
each tsconfig step. First session in Phase 12 should produce the precise
task list based on the actual state of `modules/` at that time.
