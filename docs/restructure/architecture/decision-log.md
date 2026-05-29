# Decision Log

Architectural decisions made for the restructure. **Do not relitigate these
in tasks.** If a decision is genuinely wrong, the way to change it is a new
ADR that supersedes the old one — flag the desire to do that as an Open Issue
in `STATE.md` rather than acting unilaterally.

ADR format:

```
## ADR-NNN: <YYYY-MM-DD> — <short title>

**Status:** accepted | superseded by ADR-MMM
**Phase:** <which phase introduced this, or "meta">
**Context:** why a decision was needed
**Options considered:**
  (a) ...
  (b) ...
  (c) ...
**Decision:** which option, in one sentence
**Consequences:** what this implies; what becomes harder or easier
```

---

## ADR-001: 2026-05-27 — Develop as personal fork, not upstream PRs

**Status:** accepted
**Phase:** meta
**Context:** The restructure scope (DataModel migration, AE pipeline unification,
sheet rewrites) cannot land as small upstream PRs without long coordination
with the upstream maintainers and active user base. AI-driven execution
requires the runbook structure (`docs/restructure/`) which upstream may not
accept.

**Options considered:**
- (a) Submit each phase as a series of PRs to upstream `StarWarsFoundryVTT`
- (b) Develop in a personal fork as an alternate system
- (c) Hybrid: develop in fork, propose safe phases upstream as they stabilize

**Decision:** (b) — personal fork, ship as alternate system.

**Consequences:**
- Full velocity, no upstream gating
- Must support migration from any upstream version (strict compatibility, ADR-002)
- Splits user base; fork must justify its existence with concrete improvements
- Maintenance burden is on the fork team
- System id must differ from `starwarsffg` so both can be installed simultaneously
  (see ADR-005)

---

## ADR-002: 2026-05-27 — Strict world compatibility; never break an existing world

**Status:** accepted
**Phase:** meta
**Context:** Existing worlds running on upstream Star Wars FFG must be able to
migrate to the fork and continue working. The fork's value is in architectural
improvement; that value is destroyed if users lose their campaigns.

**Options considered:**
- (a) Strict — every phase ships a migration; no world ever breaks
- (b) Permissive — one v3.0 break is allowed; users run migration once
- (c) Aggressive — treat it like a rewrite; provide an importer from old format

**Decision:** (a) — strict compatibility.

**Consequences:**
- Every schema change requires a migration in `modules/migrations/`
- `test-worlds/` fixtures cover migration from each upstream version
- `npm run verify` includes migration replay
- Slower per-phase, but trusted by users
- A single major version bump (`3.0.0`) is permitted at the end to allow
  removing deprecated paths — but only after every prior migration is reliable

---

## ADR-003: 2026-05-27 — Adopt TypeScript and Vite gradually

**Status:** accepted
**Phase:** meta
**Context:** Type safety would catch many of the existing bug classes
(undefined access, type coercion bugs). A bundler is needed for the build
pipeline and for TypeScript output. The current codebase is plain ES modules
with no build step.

**Options considered:**
- (a) Add TypeScript + Vite gradually with `allowJs: true`
- (b) Stay vanilla JS, add JSDoc types where useful, use Vite for bundling
- (c) Full TypeScript rewrite

**Decision:** (a) — gradual TypeScript on Vite.

**Consequences:**
- `tsconfig.json` with `allowJs: true, strict: false` initially
- JS and TS files coexist; conversion is one file at a time
- Phase 12 dedicates focused effort to TS conversion, but conversion can also
  happen organically as files are touched in earlier phases
- Build output must remain Foundry-loadable ES modules
- Type definitions for Foundry V13 are required (vendored from a community
  package; see Phase 0 task 0.7)

---

## ADR-004: 2026-05-27 — Active Effects as the sole modifier pipeline

**Status:** accepted
**Phase:** meta (executed in phase 07)
**Context:** The codebase has two parallel modifier systems: a bespoke
`item.system.attributes` array with per-type branching, and Foundry's Active
Effects. Maintaining both produces edge-case bugs and doubles the surface
area of every modifier-touching feature.

**Options considered:**
- (a) Keep bespoke, add AE as a thin layer on top (status quo)
- (b) Unify on Active Effects; remove bespoke entirely
- (c) Unify on bespoke; replace AE wiring

**Decision:** (b) — Active Effects only.

**Consequences:**
- Phase 07 migrates all `item.system.attributes` entries to embedded `ActiveEffect` documents
- `ModifierHelpers.getCalculatedValueFromItems` and all callers are deleted
- Custom FFG modifier semantics (dice symbols, characteristic caps) become
  registered AE change modes, not a parallel system
- Sheet UI for "add modifier" creates AEs, not attribute entries
- Highest-risk migration in the plan; requires extensive `test-worlds/` coverage
- Foundry-native: future Foundry features benefiting AEs benefit FFG automatically

---

## ADR-005: 2026-05-27 — Keep upstream system id (`starwarsffg`); fork is drop-in replacement

**Status:** accepted
**Phase:** meta

**Context:** A fork can either use a new system id (so both fork and upstream
coexist on one Foundry install) or keep the upstream id (so the fork is a
drop-in replacement and existing worlds work unchanged). For a personal fork
used as the operator's primary system, coexistence is not needed.

**Options considered:**
- (a) Rename to `starwarsffg-next` or similar; supports side-by-side install
- (b) Keep `starwarsffg` id; fork is a drop-in replacement
- (c) Configurable id determined at build time

**Decision:** (b) — keep `starwarsffg`.

**Consequences:**
- Existing worlds bound to system id `starwarsffg` work without migration
- Compendium pack paths (`world.starwarsffg.X`) unchanged
- The fork's `system.json` `manifest` and `download` fields point at the fork's
  GitHub releases, NOT upstream's; Foundry uses those URLs for update checks
- Operator cannot install both fork and upstream on the same Foundry instance
  simultaneously (use a separate user-data directory via `--dataPath` if needed)
- Version in `system.json` and `package.json` uses pre-release suffix (e.g.
  `2.0.3-fork.0`) to distinguish from upstream versions and prevent accidental
  cross-update

---

## ADR-006: 2026-05-27 — Human maintainability is the primary success criterion

**Status:** accepted
**Phase:** meta

**Context:** The restructure is too large for any one person to complete in a
reasonable timeframe. It will be executed across many AI sessions and may stop
partially complete at any point. Future iterations — bug fixes, new features,
Foundry version updates — must be performable by human contributors without AI
assistance and without reading the entire codebase.

This requires explicit constraints because AI-generated code drifts toward two
failure modes:
- **AI cliff:** clever, over-abstracted, or framework-style code that humans
  cannot extend without re-deriving the AI's intent
- **AI sprawl:** verbose, over-commented, defensively-wrapped code that humans
  cannot navigate

**Options considered:**
- (a) Trust per-task code review to catch readability issues
- (b) Encode hard limits as lint gates and per-task principles; treat human
      maintainability as a first-class verification gate
- (c) Defer readability work to a dedicated cleanup phase

**Decision:** (b) — encode the constraints as enforceable rules.

**Consequences:**
- Hard limits added via ESLint (`max-lines: 500`, `max-lines-per-function: 50`,
  `complexity: 10`, `max-depth: 4`, `max-params: 5`)
- A heuristic comment-checker script flags vacuous comments
- PRINCIPLES.md adds principles 28-38 on code style and readability
- Every phase postcondition includes a "future-maintainer check"
- The runbook (`docs/restructure/`) is permanent documentation, not refactor
  scaffolding to be deleted on completion
- ADRs are the architectural memory; "why" lives there, not in code comments
- Test files double as living documentation
- Foundry-idiomatic patterns are preferred over novel abstractions even when
  the novel pattern is technically superior — familiarity beats elegance for
  long-term maintenance

---

## ADR-007: 2026-05-28 — Use happy-dom for Vitest DOM tests

**Status:** accepted
**Phase:** phase-00-foundation
**Context:** Phase 0 task 0.5 requires a `jsdom` or `happy-dom` Vitest
environment because Foundry code touches DOM globals. The Phase 0 task 0.1
dependency list omitted both packages, and Vitest expects DOM environments to
be installed separately.

**Options considered:**
- (a) Install `jsdom`
- (b) Install `happy-dom`
- (c) Use Vitest's Node environment and fake DOM globals manually

**Decision:** (b) — install `happy-dom` as a dev dependency.

**Consequences:**
- Adds one test-only dependency during task 0.5
- Keeps DOM test startup lighter than `jsdom`
- Provides enough browser surface for Phase 0 smoke tests while still allowing
  individual tests to add Foundry-specific globals as needed
- Avoids hand-rolling browser APIs in `tests/setup.ts`

---

## ADR-008: 2026-05-28 — Target Foundry V13 + V14 dual compatibility

**Status:** accepted
**Phase:** meta (cross-cutting; certified in Phase 13)

**Context:** Foundry V14 brings API changes that risk breaking systems
written exclusively against V13. Users typically lag in upgrading their
Foundry installs by months. To keep the fork usable across the V13→V14
transition, the restructured system runs on both versions, not one.

This commitment is cross-cutting: every phase that touches Foundry APIs
must produce code that works on both versions, not just V13. A dedicated
Phase 13 provides final certification before the restructure is declared
complete.

**Options considered:**
- (a) Target V14 only; drop V13 once V14 stabilizes
- (b) Target V13 only; defer V14 until upstream catches up
- (c) Dual compatibility: V13 minimum, V14 verified, both gated in CI

**Decision:** (c) — dual compatibility.

**Consequences:**
- `system.json` `compatibility` evolves to `{ minimum: 13, verified: 14,
  maximum: 14 }` at Phase 13 close (until then, V13-only)
- Every phase that touches Foundry APIs (2, 3, 4, 5, 6, 7, 8, 9, 11) gains
  a postcondition: "V13/V14 compatibility verified per ADR-008"
- PRINCIPLES.md gains principles 39-40 on cross-version Foundry API discipline
- A new Phase 13 (V14 Compatibility Certification) is added at the end of
  the plan; STATE.md "Phase progress" list will need Phase 13 appended
- CI eventually runs a matrix build against both V13 and V14 binaries
  (implemented in Phase 13)
- Where APIs diverge between V13 and V14, prefer in-place feature detection
  over a compatibility shim layer. If a shim is genuinely needed, it lives
  in `modules/foundry-compat/` with one file per shimmed API and an ADR
  justifying the shim
- The restructure does not target V12 or earlier; V13 is the floor
- The dual-version commitment continues past the restructure: future
  Foundry versions follow the same pattern (verified one major behind the
  current Foundry release, minimum two behind, until a superseding ADR)

---

## ADR-009: 2026-05-28 — Quarantine legacy custom-runner tests during Vitest bootstrap

**Status:** accepted
**Phase:** phase-00-foundation

**Context:** Phase 0 task 0.8 wires legacy tests into Vitest only far enough
to make collection behavior explicit. `tests/modifiers.test.js` is not a
Vitest suite; it exports a custom-runner function and imports helper code that
requires Foundry UI globals during module evaluation. `tests/common.test.js`
uses the same custom-runner export shape and causes `npx vitest run` to fail
with "No test suite found" once the modifier import crash is avoided.

**Options considered:**
- (a) Rewrite the legacy tests into Vitest now
- (b) Expand Foundry mocks until the legacy imports collect, but leave the
  custom-runner shape in place
- (c) Preserve the legacy tests and add skipped Vitest marker suites until
  Phase 5 rewrites the fixtures against DataModels

**Decision:** (c) — preserve the legacy tests and quarantine them with skipped
Vitest marker suites.

**Consequences:**
- `tests/modifiers.test.js` becomes a skipped Vitest marker; the preserved
  legacy body moves to `tests/modifiers.test.js.legacy`
- `tests/common.test.js` keeps its legacy export and gains a skipped Vitest
  marker so the file is explicit debt instead of a collection failure
- `npx vitest run` can execute without crashing while reporting the legacy
  suites as skipped
- Phase 5 owns converting these tests into real Vitest tests after DataModels
  replace the legacy `data:` fixture shape
- This ADR does not permit skipping new tests; it applies only to the
  pre-existing custom-runner files

---

## ADR-009: 2026-05-28 — Foundry V13 dice and token API patterns for Phase 4 cleanup

**Status:** accepted
**Phase:** 04 (cleanup of prototype-style patches)

**Context:** Phase 4 of the restructure removes two prototype-style patches
that swffg-main.js performs against Foundry core:

1. `foundry.canvas.placeables.Token.prototype._drawBar = function (...)`
   at lines 168+ — about 85 lines that completely replace the base
   `_drawBar` implementation to draw FFG-style wounds/strain bars.
2. `CONFIG.Dice.rolls.push(CONFIG.Dice.rolls[0]); CONFIG.Dice.rolls[0] = RollFFG;`
   at lines 112-113 — replaces the default Roll class with RollFFG by
   swapping the array's first element.

Both patterns are fragile across Foundry minor releases. This ADR records
the V13-canonical replacement patterns chosen for tasks 4.2 and 4.3.

**Sources consulted:**
- `node_modules/fvtt-types/src/foundry/client/config.d.mts` (CONFIG.Dice)
- `node_modules/fvtt-types/src/foundry/client/canvas/placeables/token.d.mts` (Token class)

**Findings:**

For Token:
- The Token class lives at `foundry.canvas.placeables.Token` in V13.
- `_drawBar(number, bar, data)` is `protected` and documented as
  "Unconditionally returns `true`" (return type `boolean`).
- `bar` is typed `PIXI.Graphics`; `data` is `NonNullable<TokenDocument.GetBarAttributeReturn>`.
- Subclassing + registering via `CONFIG.Token.objectClass` is the
  canonical override pathway. swffg-main.js already does this
  registration (`CONFIG.Token.objectClass = TokenFFG`) but only inside
  `if (useGenericSlots)`, which means the override is conditional on a
  different feature. Phase 4.2 should make this unconditional (the FFG
  token bar drawing is wanted whether or not generic slots are enabled)
  unless the operator confirms the coupling is intentional.

For Dice:
- `CONFIG.Dice.rolls` is documented as `Array<foundry.dice.Roll.Internal.AnyConstructor>`
  with default `[foundry.dice.Roll]` (single-element array containing the
  base Roll class).
- The array is a plain JS Array; native `unshift(RollFFG)` puts RollFFG
  at index 0 and shifts the existing Roll to index 1. This is
  semantically identical to the current two-line mutation.
- There is no documented "register default Roll" helper. The array IS
  the public API.

**Options considered:**

- (a) **Keep both prototype patches.** Status quo; documented anti-pattern;
  high risk of breaking on Foundry minor releases.
- (b) **Subclass + register for Token, native Array method for Dice.**
  - TokenFFG extends `foundry.canvas.placeables.Token` with a method
    override of `_drawBar`. Register via `CONFIG.Token.objectClass = TokenFFG`.
  - `CONFIG.Dice.rolls.unshift(RollFFG)` replaces the index-swap mutation.
- (c) **Build a foundry-compat shim layer.** Over-engineered for two patches.

**Decision:** (b).

**Consequences:**

For Token (task 4.2):
- TokenFFG (already in `modules/tokens/token-ffg.js`) gains a `_drawBar(number, bar, data)`
  method. Body verbatim from the current prototype assignment, plus a
  `return true;` at the end to match the documented contract.
- Per PRINCIPLES.md 29 (max-lines-per-function 50), the 85-line body must
  be decomposed into helpers: `drawThresholdBar(bar, data, h, colors)`,
  `drawDefaultBar(bar, number, val, data, h)`, `colorsForAttribute(attribute)`,
  etc. Each helper stays within complexity 10.
- The `CONFIG.Token.objectClass = TokenFFG` registration moves out of the
  `if (useGenericSlots)` branch into the unconditional init path. Operator
  has not flagged the coupling as intentional; the assumption is that the
  FFG bar drawing should apply regardless of generic-slots setting. If
  this turns out to be wrong, a follow-up ADR can re-couple them with
  documented rationale.

For Dice (task 4.3):
- `modules/dice/roll-registration.js` exports `registerRollFFG()` whose
  body is `CONFIG.Dice.rolls.unshift(RollFFG);` plus the import.
- swffg-main.js replaces the two-line mutation with one
  `registerRollFFG()` call (and the import).
- The function signature stays a no-op `void` return — caller does not
  need to know the implementation detail.

For both:
- Per ADR-008, V14 may have changed either API. Phase 13 will verify
  both subclass override and `Dice.rolls.unshift` still work on V14.
  PRINCIPLES.md 39 (feature detection over version sniffing) means the
  implementations check for the API's existence in V14 rather than
  branching on `game.release.generation`.
- The `protected` access on `_drawBar` in the type signature is a
  TypeScript-only constraint. JavaScript override does not enforce it,
  and the existing pattern (override in subclass) is what TS expects for
  `protected` members anyway. Phase 12 (TypeScript) will type the new
  method correctly.

---

## ADR-010: 2026-05-29 — Phase 5 DataModel conversion conventions

**Status:** accepted
**Phase:** 05

**Context:** Executing the first Phase 5 conversion (homestead) surfaced three
recurring decisions the phase file left open. Recording them once keeps all 26
per-type conversions consistent.

**Decisions:**

1. **Schema-only scope.** Phase 1 deferred calculator call-site migration to
   Phase 6, and the legacy `ActorFFG`/`ItemFFG` classes still own all derived
   computation in their `prepareDerivedData`. Each Phase 5 DataModel implements
   only `static defineSchema()` (mirroring the type's `template.json` shape);
   `prepareBaseData`/`prepareDerivedData` are left empty. Moving derivation into
   the DataModel and wiring the Phase 1 calculators is Phase 6. This keeps every
   conversion behavior-preserving (ADR-002) and individually shippable.

2. **Tests use a thin field-introspection mock, not a behavioral mock.**
   DataModels extend `foundry.abstract.TypeDataModel` and use
   `foundry.data.fields.*`, which do not exist in the vitest environment (Phase
   0 mocked only `foundry.utils`). Fully simulating Foundry's DataModel
   cleaning/validation is the tarpit Phase 0 task 0.5 warned against. Instead,
   `tests/setup.ts` provides minimal field stubs that record their declared
   options and expose `getInitial()`. Schema tests assert the *declared* shape
   and defaults (e.g. "homestead declares `cost.value` as a NumberField with
   initial 0") — the Phase 5 contract. Cleaning/validation correctness is
   Foundry's responsibility, verified by the operator Foundry smoke in the phase
   postconditions, not by unit tests. A future phase needing behavioral
   DataModel tests is a separate ADR.

3. **Omit redundant template.json hint keys by default.** Many sub-objects bake
   in `type`/`label`/`abrev` keys (e.g. `cost: { value, type:"Number",
   label:"Cost", adjusted }`). These are template.json's pre-DataModel type
   system, which the field classes replace, and FFG sheets localise their own
   labels (the homestead sheet passes `title="SWFFG.ItemsPrice"`). Schemas
   declare only meaningful data fields; Foundry cleaning drops the hint keys on
   next write (lossless of functional data). **Exception:** where a template
   actually reads a hint key — verified by grep, e.g. weapons render
   `{{localize item.system.range.label}}` — declare that key. Verify per type
   before omitting.

**Options considered (each decision):** keep prototype-era patterns / a full
behavioral mock / carry every template.json key verbatim — all rejected for the
reasons above.

**Consequences:**
- `tests/setup.ts` gains the introspection field stubs and a `TypeDataModel`
  base; per-type tasks add a `*-data.js` (schema only) plus a schema test
  asserting declared fields/defaults.
- Schemas stay small and idiomatic; hint-key cleanup is automatic via cleaning.
- Sheets that read a path absent from `template.json` (e.g. the homestead
  sheet's `system.stats.cost`) are pre-existing bugs owned by Phase 8; Phase 5
  mirrors `template.json` and documents the mismatch rather than fixing the
  sheet.

---

## ADR template (for future entries)

```
## ADR-NNN: YYYY-MM-DD — <short title>

**Status:** accepted | superseded by ADR-MMM
**Phase:** <phase>
**Context:**

**Options considered:**
- (a)
- (b)

**Decision:**

**Consequences:**
-
-
```
