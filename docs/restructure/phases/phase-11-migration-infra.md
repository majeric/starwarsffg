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

- [ ] Phase 0 complete
- [ ] `npm run verify` is green
- [ ] `modules/swffg-migration.js` exists in its current `parseFloat` form

## Phase postconditions

- [ ] `modules/migrations/runner.js` runs migrations in semver order using
      `foundry.utils.isNewerVersion` (or similar Foundry-canonical comparator)
- [ ] `modules/migrations/<version>-<slug>.js` is the file convention; each
      migration exports a default async function and a target version string
- [ ] Existing migrations in `modules/swffg-migration.js` are moved to:
      - `modules/migrations/1.901-species-talents.js`
      - `modules/migrations/1.906-compendium-paths.js`
      - `modules/migrations/1.907-active-effects.js`
- [ ] `scripts/replay-migrations.mjs` (placeholder from Phase 0) is implemented:
      iterates `test-worlds/` fixtures, runs migrations forward, asserts no
      errors, asserts all docs validate
- [ ] `npm run verify` migration replay gate works (and passes; existing
      migrations don't actually break the existing fixtures)
- [ ] `test-worlds/` contains at least:
      - `upstream-v1.907-empty/`
      - `upstream-v1.910-small-party/`
      - `upstream-v2.0.3-large-party/`
      (extracted from real world.db files; anonymize PII)
- [ ] Migration runner supports dry-run: `runner.run({ dryRun: true })`
      reports what would happen without writing
- [ ] `modules/swffg-migration.js` is DELETED (its contents are now in
      `modules/migrations/runner.js` and the per-version files)
- [ ] All callers updated to import from new locations
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (foundry.utils.isNewerVersion behavior consistent across versions; verify)

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

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 11.1: Create `modules/migrations/runner.js` with semver-aware runner
- Task 11.2: Migrate `1.901` from swffg-migration.js to new file
- Task 11.3: Migrate `1.906` from swffg-migration.js
- Task 11.4: Migrate `1.907` from swffg-migration.js
- Task 11.5: Delete swffg-migration.js; update callers
- Task 11.6: Implement `scripts/replay-migrations.mjs`
- Task 11.7: Capture initial fixtures (requires real-world worlds; may
  need human help)
- Task 11.8: Wire replay-migrations into `npm run verify`
- Task 11.9: Verify Phase 11 stop gate
