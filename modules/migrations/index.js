import { MIGRATION_REGISTRY, handleUpdate, runMigrations, compareVersions } from "./runner.js";
import * as migration1_901 from "./1.901-species-talents.js";
import * as migration1_906 from "./1.906-compendium-paths.js";
import * as migration1_907 from "./1.907-active-effects.js";

/**
 * Populate MIGRATION_REGISTRY at module load. swffg-main.js imports this
 * file instead of `runner.js` directly so the registry is ready before
 * the ready hook fires `handleUpdate()`.
 *
 * Ordering note: the runner sorts and selects by version when running,
 * so the registration order here is documentation only.
 */
for (const m of [migration1_901, migration1_906, migration1_907]) {
  MIGRATION_REGISTRY.push({
    version: m.version,
    slug: m.slug,
    description: m.description,
    default: m.default,
  });
}

export { handleUpdate, runMigrations, compareVersions, MIGRATION_REGISTRY };
