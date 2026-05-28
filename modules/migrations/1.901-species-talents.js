/**
 * Migration to 1.901: tag species-granted talents on actors with a
 * `fromSpecies` flag so the talent list can attribute their source
 * correctly. Relocated verbatim from swffg-migration.js by Phase 11.2.
 */
export const version = "1.901";
export const slug = "species-talents";
export const description = "Tag species-granted talents with fromSpecies flag";

export default async function migrate(world) {
  for (const actor of world.actors) {
    for (const species of actor.items.filter((a) => a.type === "species")) {
      for (const talent of Object.values(species.system.talents)) {
        await actor.items
          .find((i) => i.name === talent.name)
          ?.update({ flags: { starwarsffg: { fromSpecies: true } } });
      }
    }
  }
}
