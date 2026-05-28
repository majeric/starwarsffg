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
