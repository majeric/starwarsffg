# Phase 11 — Migration Infrastructure Upgrade

## Goal

Replace the `parseFloat`-on-version-strings migration comparator with a proper
semver-aware runner. Establish the migration directory layout, fixture format,
and replay testing that Phase 5 (DataModels) and Phase 7 (AE unification)
both depend on.

## Why this phase early (recommended before Phase 5)

Phase 5 writes many migrations. Phase 7 writes more. Both need:
- A way to declare a migration that targets a specific version
- An ordered runner that applies migrations in semver order
- A replay system that runs migrations against `test-worlds/` fixtures
- A dry-run mode

Without this infrastructure, Phases 5 and 7 either write throw-away migration
glue or build the infrastructure incrementally inside other phases. Better
to land it once, here.

## Phase preconditions

- [x] Phase 0 complete
- [x] `npm run verify` is green
- [x] `modules/swffg-migration.js` exists in its current `parseFloat` form

## Phase postconditions

- [x] `modules/migrations/runner.js` runs migrations in semver order using
      a local semver-aware `compareVersions` implementation (no Foundry dependency in tests)
- [x] `modules/migrations/<version>-<slug>.js` is the file convention; each
      migration exports a default async function and a target version string
- [x] Existing migrations in `modules/swffg-migration.js` are moved to:
      - `modules/migrations/1.901-species-talents.js`
      - `modules/migrations/1.906-compendium-paths.js`
      - `modules/migrations/1.907-active-effects.js`
- [x] `scripts/replay-migrations.mjs` (placeholder from Phase 0) is implemented:
      iterates `test-worlds/` fixtures, runs migrations forward, asserts no
      errors, asserts all docs validate *(exits cleanly with "no fixtures yet" when test-worlds/ is empty)*
- [x] `npm run verify` migration replay gate works (and passes; existing
      migrations don't actually break the existing fixtures)
- [ ] `test-worlds/` contains at least:
      - `upstream-v1.907-empty/`
      - `upstream-v1.910-small-party/`
      - `upstream-v2.0.3-large-party/`
      (extracted from real world.db files; anonymize PII) *(not captured — requires operator-provided world exports)*
- [x] Migration runner supports dry-run: `runner.run({ dryRun: true })`
      reports what would happen without writing
- [x] `modules/swffg-migration.js` is DELETED (its contents are now in
      `modules/migrations/runner.js` and the per-version files)
- [x] All callers updated to import from new locations
- [x] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 *(V13 verified; V14 deferred to Phase 13)*

## Migration file convention

```js
// modules/migrations/1.901-species-talents.js
export const version = "1.901";
export const slug = "species-talents";
export const description = "Mark talents derived from species with fromSpecies flag";

export default async function migrate(world, options = {}) {
  // world: a wrapper that provides actors, items, settings access
  //        in production this wraps `game.actors`, etc.
  //        in replay/dry-run mode this wraps a fixture
  // options: { dryRun: boolean, logger: Logger }
  // Returns: { changed: number, errors: Error[] }
}
```

## test-worlds fixture format

Each fixture is a directory:
```
test-worlds/upstream-v2.0.3-large-party/
├── README.md          ← what this fixture demonstrates
├── version.txt        ← "2.0.3" (the upstream version this was captured at)
├── actors.json        ← array of actor source objects
├── items.json         ← array of item source objects (top-level world items)
├── settings.json      ← key-value of relevant settings at capture time
└── compendiums.json   ← optional: per-pack content if relevant
```

JSON format is canonical so changes are reviewable in PRs.

## Anti-creep notes

- **Do not** modify what existing migrations do. Move them verbatim; preserve
  exact behavior. Bug fixes to existing migrations are separate ADRs.
- **Do not** add a downgrade direction. Migrations are forward-only.
- **Do** make migration runs idempotent. Running the same migration twice
  against the same world must produce no change on the second run.
- **Do** capture fixtures from real worlds (with permission and PII
  anonymization). Synthetic fixtures miss real-world quirks.

## Tasks

### 11.1 — Create migrations/runner.js with semver-aware dispatcher

**Files to create:**
- `modules/migrations/runner.js`

**Exports:**
- `handleUpdate()` — top-level entry point called from the ready hook;
  reads stored version, compares to running, runs needed migrations
- `runMigrations(oldVersion, newVersion, options)` — pure dispatcher used
  by both production and the replay script
- `MIGRATION_REGISTRY` — ordered array of `{ version, migrate }` entries
  imported from per-version files

**Behavior:**
- Uses `foundry.utils.isNewerVersion(targetVersion, oldVersion)` to decide
  which migrations to run (replaces `parseFloat` comparisons)
- For each migration whose `version` is newer than `oldVersion`, awaits
  the migrate function in order
- Each `migrate(world, options)` is called with a `world` adapter object
  and options `{ dryRun, logger }`
- In production, `world` is a thin adapter over `game.actors`, `game.items`,
  `game.settings`; in replay mode, it wraps a fixture
- `runMigrations` returns a summary `{ ran: [...versions], changed: count, errors: [...] }`

**Verification:**
- Lint and typecheck pass
- A trivial unit test (`tests/migrations/runner.test.js`) verifies that
  `runMigrations` skips already-completed migrations when oldVersion is newer

**Commit:** `phase 11.1: create migrations runner with semver dispatcher`

---

### 11.2 — Relocate migrateTo1_901 to modules/migrations/1.901-species-talents.js

**Source:** `modules/swffg-migration.js:77-85` (migrateTo1_901)

**Files to create:**
- `modules/migrations/1.901-species-talents.js`

**Exports:**
```js
export const version = "1.901";
export const slug = "species-talents";
export const description = "Tag species-granted talents with fromSpecies flag";
export default async function migrate(world) { ... }
```

The body is the existing function adapted to use `world.actors` instead
of `game.actors`. Production runner passes `world = { actors: game.actors }`.

**Commit:** `phase 11.2: relocate 1.901 species-talents migration`

---

### 11.3 — Relocate migrateTo1_906 to modules/migrations/1.906-compendium-paths.js

**Source:** `modules/swffg-migration.js:91-132` (migrateTo1_906)

**Files to create:**
- `modules/migrations/1.906-compendium-paths.js`

The body's repetitive per-compendium loops should be factored into a
single helper that takes a setting key and rewrites the path. The
behavior must remain byte-identical.

**Commit:** `phase 11.3: relocate 1.906 compendium-paths migration`

---

### 11.4 — Relocate migrateTo1907 to modules/migrations/1.907-active-effects.js

**Source:** `modules/swffg-migration.js:138-414` (migrateTo1907)

**Files to create:**
- `modules/migrations/1.907-active-effects.js`

This is a long (~280 line) migration that touches actor stats, items,
and specialization/forcepower/signatureability internals. It must be
decomposed into helpers to satisfy complexity rules. Suggested helpers:
- `parseLegacyXpLog(xpLog)` — string-form xp log → structured form
- `snapshotActorStats(actor)` — captures original stats
- `inverseStats(initial, updated)` — the `x - ((x - initial) * 2)` reversal
- `createAEsFromItemAttributes(item)` — the per-talent/upgrade AE creation
  (called for specialization, forcepower, signatureability)
- `runFor1907Actor(actor)` — orchestrates the per-actor flow

**Behavior:** Must be byte-equivalent to the source. This is migration
code — operators ran it once already to upgrade to 1.907. The relocated
form must produce the same effect for any world that has not yet been
migrated.

**Commit:** `phase 11.4: relocate 1.907 active-effects migration`

---

### 11.5 — Delete swffg-migration.js and update caller

**Files modified:**
- `modules/swffg-main.js` — change `import {handleUpdate} from "./swffg-migration.js"`
  to `import { handleUpdate } from "./migrations/runner.js"`
- `modules/swffg-migration.js` — DELETE

**Verification:**
- `grep -rn "swffg-migration" modules/` returns zero matches
- `npm run verify` — same green/lint pattern
- Build succeeds (vite picks up the new entry)

**Commit:** `phase 11.5: delete swffg-migration.js; route through runner`

---

### 11.6 — Implement scripts/replay-migrations.mjs against fixtures

**Files modified:**
- `scripts/replay-migrations.mjs` — replace the placeholder with a real
  implementation

**Behavior:**
- Scan `test-worlds/` for fixture directories
- For each fixture, parse its `version.txt` and load `actors.json`,
  `items.json`, `settings.json`
- Build a `world` adapter that mimics `game.actors`/`game.items`/`game.settings`
  enough for the migrations to run against
- Run `runMigrations(fixture.version, RUNNING_VERSION, { dryRun: true })`
- Assert no errors; report number of changes
- If `test-worlds/` does not exist or is empty, print "no fixtures yet"
  and exit 0 (matches the current placeholder behavior)

**Commit:** `phase 11.6: implement replay-migrations script`

---

## Out of scope for Phase 11 (open issues at close)

- Capturing real-world fixture worlds. Requires operator-provided
  `world.db` files from upstream-version worlds. Document procedure but
  do not gate phase close on this.
- Adding a UI to surface migration progress / errors during world load.
