import type { MigrationWorld } from "./runner.js";

/**
 * Migration to 1.906: rewrite compendium pack paths from system-scoped
 * to world-scoped (e.g. `starwarsffg.X` → `world.X`). Relocated from
 * swffg-migration.js by Phase 11.3 and refactored to deduplicate the
 * per-setting loop.
 */
export const version = "1.906";
export const slug = "compendium-paths";
export const description = "Rewrite compendium pack paths from system to world scope";

const COMPENDIUM_SETTINGS = [
  "specializationCompendiums",
  "signatureAbilityCompendiums",
  "forcePowerCompendiums",
  "talentCompendiums",
];

export default async function migrate(world: MigrationWorld): Promise<void> {
  if (!world.settings) return;
  for (const settingKey of COMPENDIUM_SETTINGS) {
    rewriteSettingPaths(world.settings, settingKey);
  }
}

function rewriteSettingPaths(settings: any, key: string): void {
  const original = settings.get("starwarsffg", key);
  if (!original) return;
  const rewritten = original
    .split(",")
    .map((path: any) => (path.includes("starwarsffg.") ? path.replace("starwarsffg.", "world.") : path))
    .join(",");
  if (rewritten !== original) {
    settings.set("starwarsffg", key, rewritten);
  }
}
