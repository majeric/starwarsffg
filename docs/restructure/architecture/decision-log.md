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
   options and expose `getInitial()`. Schema tests assert the _declared_ shape
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

## ADR-011: 2026-05-29 — Derived values live on `parent.derived`, reset each prepare

**Status:** accepted
**Phase:** 06

**Context:** Phase 6 moves computed values out of `system.*` into a derived
namespace recomputed every prepare and never persisted. Foundry's TypeDataModel
has no built-in derived layer, so the mechanism must be chosen explicitly.

**Options considered:**

- (a) A getter on the DataModel (`get derived()`) — awkward for writing many
  computed values; caching/recompute semantics unclear.
- (b) A plain `derived` object on the parent Document, reset in the base
  `prepareBaseData()` and populated in each type's `prepareDerivedData()`.
- (c) Keep using `system.*` with a naming convention — rejected; that is the
  anti-pattern Phase 6 exists to remove.

**Decision:** (b). `BaseActorData.prepareBaseData()` sets `this.parent.derived =
{}` (fresh each prepare cycle); each actor type's `prepareDerivedData()` fills
`this.parent.derived.*` by delegating to the Phase 1 calculators. Sheets and code
read `actor.derived.*`. Per-type `prepareBaseData` overrides must call
`super.prepareBaseData()`.

**Consequences:**

- Derived state can never be persisted (it lives off-schema on the document),
  eliminating the "stale derived value" bug class.
- Derived unit tests need a harness that executes the prepare hooks; the ADR-010
  field mock only introspects the schema. Task 6.1 adds the harness.
- Item derived state follows the same pattern when Phase 7 handles it (ADR-012);
  `BaseItemData` gains the same init then.

---

## ADR-012: 2026-05-29 — Phase 6 covers actor derived state; item `*.adjusted` deferred to Phase 7

**Status:** accepted (supersedes the all-DataModels wording in the Phase 6 postconditions)
**Phase:** 06 / 07

**Context:** Phase 6's postconditions, as written, require stripping `*.adjusted`
from _every_ DataModel (actors and items). But `*.adjusted` is overwhelmingly
item-side: `item-ffg.js` computes it in ~58 places and item / weapon / chat
templates render it across ~70 references. That computation is the bespoke
`item.system.attributes` modifier pipeline that ADR-004 / Phase 7 replaces
wholesale with Active Effects.

**Options considered:**

- (a) Phase 6 splits both actor and item derived state (the literal written
  scope), then Phase 7 reworks the item computation onto Active Effects — two
  passes over the most entangled code in the system.
- (b) Phase 6 splits ACTOR derived state only (calculator-backed, contained);
  the item `*.adjusted` derived-split folds into Phase 7, which already owns the
  item modifier computation it depends on.

**Decision:** (b) — chosen on the operator's stated criteria of minimizing error
risk and producing the cleanest code. Touching the item modifier layer once (in
Phase 7) instead of twice avoids the highest-risk double-churn.

**Consequences:**

- Phase 6 postconditions re-scope to actors: no `*.adjusted` in any ACTOR
  DataModel schema; actor derived values live in `derived.*`.
- Phase 7 gains postconditions: strip `item.system.*.adjusted` from item schemas
  and expose item derived values via the `parent.derived` pattern (ADR-011), as
  part of moving item modifiers to Active Effects.
- The restructure end state is unchanged (no `*.adjusted` anywhere, derived
  everywhere); only the phase boundary moves.

---

## ADR-013: 2026-05-29 — Phase 6 relaxed: AE-independent derived now, AE-dependent stat derivation in Phase 7

**Status:** accepted (operator-directed; relaxes the Phase 6 postconditions)
**Phase:** 06 / 07

**Context:** Executing Phase 6 (task 6.2) revealed that the actor stat totals
(wounds/strain/soak/defence/forcePool) are produced by the Active Effects
pipeline — AE changes target `system.stats.*` and `applyActiveEffects`
(actor-ffg.js:725) injects values; `_preUpdate` patches persisted thresholds in
edit mode where AEs are suspended. Recomputing these via the Phase 1 calculators
needs a `modifiers` input that faithfully replays AE change modes
(add/multiply/override/upgrade) — exactly Phase 7's work. As written, the Phase 6
postconditions (recompute _all_ stats via calculators, drop _all_ `*.adjusted`,
remove `_preUpdate`/mutations) cannot be met before Phase 7 without changing
behavior or duplicating effort. The operator directed removing this blocking
clause so it stops gating future work.

Also discovered: `ActorFFG.prepareDerivedData` never called
`super.prepareDerivedData()`, so the system DataModel's `prepareDerivedData`
hook never ran. Phase 6 adds the `super` call so the derived pattern functions.

**Decision:** Relax Phase 6 to the AE-independent derived work:

- Establish the `derived` namespace (ADR-011) and wire `super.prepareDerivedData()`.
- Compute the AE-independent derived values via the Phase 1 calculators —
  currently encumbrance (sum of item encumbrance) — into `this.parent.derived.*`,
  additively (the legacy `system.*` writes remain; nothing is removed yet).
- Defer to Phase 7 (which owns the AE change-mode rework): the AE-dependent stat
  derivation (wounds/strain/soak/defence/forcePool), `_preUpdate` removal, the
  `prepareDerivedData` mutation removals, `*.adjusted` schema stripping + its
  migration, and switching templates to `derived.*`.

**Consequences:**

- Phase 6 is behavior-preserving and additive (no removal, so no regression risk
  before the operator smoke); it unblocks future work by establishing the
  derived namespace and the AE-independent values.
- Phase 7 absorbs the AE-dependent derived split (already aligned with ADR-012,
  which moved item `*.adjusted` there).
- The restructure end state is unchanged; only the phase boundary moves.

---

## ADR-014: 2026-05-29 — Phase 7 approach: AEs canonical, remove the `attributes` intermediary

**Status:** accepted
**Phase:** 07

**Context:** Investigation showed the modifier system is hybrid, not "bespoke
vs AE" (see phase-07 "Current architecture"). Modifiers are authored as
`item.system.attributes` entries that `ModifierHelpers.applyActiveEffectOnUpdate`
syncs into embedded `ActiveEffect`s; the AEs are what apply. The 1.907 migration
already converted most worlds' attributes to AEs. Phase 7 must decide how to
reach "AE as the sole pipeline" (ADR-004) and how to handle migration edge cases
(the phase mandates ADRs for these).

**Decision:**

- **AEs become canonical; the `attributes` intermediary is removed.** The
  authoring UI creates/edits AEs directly; the attributes→AE sync, `modifiers.js`,
  and `item.system.attributes` are removed; FFG semantics become custom AE
  change modes.
- **Preserve behavior exactly (anti-creep).** The pure modifier→AE-key taxonomy
  (`explodeMod`, `getModKeyPath`, `getModTypeByModPath`) is extracted verbatim
  into a tested module (task 7.1) and reused by the migration, change modes, and
  UI — so the mapping cannot drift.
- **Edge-case handling for the `attributes`→AE migration (task 7.4):**
  - `explodeMod` compound mods (Brawn → Brawn+EncumbranceMax+Soak; Defence →
    Melee+Ranged; Shields → 4 facings) become a single AE with multiple
    `changes`, preserving the expansion.
  - `mod === "*"` / "Stat All" (the removed v2.0.0 hack): migrate to the explicit
    set of keys it expanded to; if unmappable, create a disabled AE named
    `Migrated (review): *` so nothing is silently dropped.
  - `exclude: true` attributes → migrate as `disabled: true` AEs (semantics
    preserved, not applied).
  - Attributes on items not currently equipped → AE created with `disabled`
    reflecting the equipped/active state (preserve current apply semantics).
  - `(inherent)` effects (e.g. species Brawn) are already AEs — leave them; the
    migration only touches user `attr*` entries.
  - Embedded/attachment items → migrate their attributes the same way on the
    embedded item.
  - Forward-only; clears `attributes` after creating AEs; idempotent (skips
    items whose attributes are already empty, so re-running is safe).
- **Synthetic fixtures unblock automated replay (task 7.3); operator real-world
  worlds remain the gold-standard smoke** (phase postconditions) before the stop
  gate closes — this is the irreversible-migration safety net (ADR-002).

**Consequences:**

- The taxonomy module (7.1) is the safe first step and the single source of
  truth for mod→key mapping across migration/change-modes/UI.
- `applyActiveEffects` force-pool mutation becomes a custom change mode (7.2/7.7).
- Item schema `attributes` removal + the folded-in Phase 6 actor derived split
  happen together (7.8) once AE application is clean.
- Highest-risk migration in the plan; gated on operator real-world smoke.

---

## ADR-015: 2026-05-30 — Add typescript-eslint for Phase 12 TS conversion

**Status:** accepted
**Phase:** 12

**Context:** Phase 12 converts all `modules/*.js` files to `.ts`. ESLint's
default parser cannot parse TypeScript syntax (type annotations, interfaces,
generics). Without a TS-aware parser, renamed files either crash ESLint or
silently drop out of lint coverage — both unacceptable since the
maintainability rules (max-lines, complexity, etc.) are enforced gates.

**Options considered:**

- (a) Add `typescript-eslint` — the standard TypeScript ESLint integration.
  Provides a parser and optional type-aware rules. Widely adopted; maintained
  by the TypeScript ESLint team.
- (b) Disable ESLint for `.ts` files and rely solely on `tsc` — loses the
  maintainability rules (max-lines, complexity, max-depth) that are central
  to ADR-006.
- (c) Use a separate linter (`biome`, `oxlint`) for TS files — introduces a
  second tool with different semantics; configuration drift risk.

**Decision:** (a) — add `typescript-eslint` as a dev dependency.

**Consequences:**

- One new dev dependency (`typescript-eslint`, which bundles the parser and
  plugin).
- `eslint.config.mjs` gains a TS file pattern using the typescript-eslint
  parser. `no-undef` is disabled for `.ts` files (TypeScript's own type
  checker handles undefined references more accurately than ESLint).
- All existing maintainability rules apply identically to `.ts` files.
- No type-aware lint rules are enabled initially (they require
  `parserOptions.project` pointing at `tsconfig.json`, which slows linting).
  A future task can enable them if the benefit justifies the cost.

---

## ADR-016: 2026-05-30 — Standardize browser E2E on Playwright

**Status:** accepted (completed)
**Phase:** meta

**Context:** The repository had two browser E2E harnesses: Cypress tests under
`cypress/` and Playwright tests under `e2e/` with helpers under `playwright/`.
Vitest now covers fast unit and integration-style behavior, but it cannot
replace browser-real Foundry checks for sheets, dialogs, drag/drop, document
lifecycle, or Active Effects applied by a running Foundry world.

**Decision:** Standardize on Playwright. Cypress legacy smoke flows (actor/item
creation, item-sheet rendering) have been ported to `e2e/smoke.spec.js` and all
Cypress files removed.

**Consequences:**

- `@playwright/test` is a dev dependency.
- `npm run verify` remains the fast local gate and intentionally excludes
  browser E2E because it requires a running Foundry world.
- `npm run test:e2e`, `npm run test:e2e:ae`, `npm run test:e2e:ui`, and
  `npm run verify:e2e` provide explicit browser-test entry points.
- Playwright configuration is local and environment-driven via
  `FOUNDRY_BASE_URL`, `FOUNDRY_TEST_USER`, `FOUNDRY_TEST_PASSWORD`, and
  `PLAYWRIGHT_STORAGE_STATE`; no test should hard-code a private Foundry URL.

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
