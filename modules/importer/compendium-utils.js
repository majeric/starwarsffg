import Helpers from "../helpers/common.js";

/**
 * Compendium lookup and I/O utilities extracted from ImportHelpers.
 * These are pure infrastructure — no content-type knowledge.
 */

export async function verifyPath(startingSource, path) {
  try {
    const paths = path.split("/");
    let currentSource = paths[0];

    for (let i = 0; i < paths.length; i += 1) {
      try {
        if (
          await foundry.utils.fetchJsonWithTimeout(
            `${currentSource}`,
            { method: "POST", body: {} }
          )
        ) {
          currentSource += `/${paths[i + 1]}`;
        }
      } catch {
        await FilePicker.createDirectory(startingSource, `${currentSource}`);
        currentSource += `/${paths[i + 1]}`;
      }
    }
  } catch {
    // do nothing
  }
}

export async function findCompendiumEntityById(type, id) {
  const compendiumItem = await Helpers.getSpecificCompendiumItem(type, id);
  return compendiumItem ?? undefined;
}

export async function findCompendiumEntityByName(type, name) {
  const compendium = await Helpers.getCompendiumItems(type);
  if (compendium?.length) {
    return compendium.find((t) => t.name === name);
  }
  return undefined;
}

export async function getCompendiumPack(type, name) {
  const packName = `world.oggdudeimport${name}`;
  let pack = game.packs.get(packName);
  if (!pack) {
    pack = await CompendiumCollection.createCompendium({
      name: `oggdudeimport${name}`,
      label: `OggDude ${name}`,
      type,
    });
  }
  return pack;
}
