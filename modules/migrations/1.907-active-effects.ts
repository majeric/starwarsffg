import ModifierHelpers from "../helpers/modifiers.js";

/**
 * Migration to 1.907: convert the legacy per-item attribute system into
 * Active Effects on the parent items, parse the legacy XP-log string
 * format into structured entries, and reverse-double the actor stats so
 * Active Effects can re-apply without doubling values. Relocated
 * verbatim from swffg-migration.js by Phase 11.4.
 *
 * The migration depends on real Foundry document instances
 * (`actor.items.get(...).toJSON()`, `actor.update(...)`,
 * `item.createEmbeddedDocuments(...)`, etc.). It cannot be replayed
 * against plain JSON fixtures without mocking the document API; that's
 * out of scope for the relocation. A future task can decompose this
 * 270+ line migration into smaller helpers (parseLegacyXpLog,
 * snapshotActorStats, inverseStats, createAEsFromItemAttributes,
 * runFor1907Actor). For now the body is preserved byte-for-byte.
 */

export const version = "1.907";
export const slug = "active-effects";
export const description = "Convert legacy item attributes to Active Effects and parse XP log";

/* eslint-disable max-lines-per-function, complexity, max-depth -- relocated verbatim from swffg-migration.js; decomposition is a future task. */
export default async function migrate(world: any): Promise<void> {
  try {
    for (const actor of world.actors) {
      const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
      const updatedLog = [];
      const purchaseRegex = new RegExp("<b>(.*?)</b>: (.*?) <b>(.*?)</b>.*<b>(.*?)</b> \\((.*?) available, (.*?) total");
      const grantRegex = new RegExp("<b>(.*?)</b>: (\\w*) granted <b>(.*?)</b>.*: (.*?) \\((.*?) available, (.*?) total");

      for (const entry of xpLog) {
        if (typeof entry === 'string') {
          const parsedEntry = entry.match(purchaseRegex);
          if (parsedEntry && parsedEntry.length === 7) {
            updatedLog.push({
              action: parsedEntry[2].replace('spent', 'purchased'),
              id: undefined,
              xp: {
                cost: parsedEntry[3],
                available: parsedEntry[5],
                total: parsedEntry[6],
              },
              date: parsedEntry[1],
              description: parsedEntry[4],
            });
          } else {
            const parsedGrantEntry = entry.match(grantRegex);
            if (parsedGrantEntry && parsedGrantEntry.length === 7) {
              updatedLog.push({
                action: parsedGrantEntry[2].replace('GM', 'granted').replace('Self', 'adjusted'),
                id: undefined,
                xp: {
                  cost: parsedGrantEntry[3],
                  available: parsedGrantEntry[5],
                  total: parsedGrantEntry[6],
                },
                date: parsedGrantEntry[1],
                description: parsedGrantEntry[4],
              });
            }
          }
        }
      }
      actor.setFlag("starwarsffg", "xpLog", updatedLog);
    }

    for (const actor of world.actors) {
      const inputStats: any = { system: {} };

      if (["character", "nemesis", "rival"].includes(actor.type)) {
        inputStats.system.characteristics = {};
        for (const characteristic in actor.system.characteristics) {
          inputStats.system.characteristics[characteristic] = {
            value: actor.system.characteristics[characteristic].value,
          };
        }
        inputStats.system.stats = {
          wounds: foundry.utils.deepClone(actor.system.stats.wounds),
          soak: foundry.utils.deepClone(actor.system.stats.soak),
          defence: foundry.utils.deepClone(actor.system.stats.defence),
          encumbrance: foundry.utils.deepClone(actor.system.stats.encumbrance),
        };
        if (actor.type !== "rival") {
          inputStats.system.stats.strain = foundry.utils.deepClone(actor.system.stats.strain);
        }
        inputStats.system.skills = foundry.utils.deepClone(actor.system.skills);
      }

      for (const item of actor.items) {
        const itemData = actor.items.get(item.id).toJSON();
        itemData.data = itemData.system;
        delete itemData.flags;
        await item._onCreateAEs({ parent: true }, true);
        await ModifierHelpers.applyActiveEffectOnUpdate(item, itemData);
      }

      const updatedStats = world.actors.get(actor.id);
      const finalStats = foundry.utils.deepClone(inputStats);

      if (["character", "nemesis", "rival"].includes(actor.type)) {
        for (const characteristic in actor.system.characteristics) {
          finalStats.system.characteristics[characteristic].value =
            updatedStats.system.characteristics[characteristic].value
            - ((updatedStats.system.characteristics[characteristic].value
              - foundry.utils.deepClone(inputStats.system.characteristics[characteristic].value)) * 2);
        }
        finalStats.system.stats.wounds.max =
          updatedStats.system.stats.wounds.max
          - ((updatedStats.system.stats.wounds.max - inputStats.system.stats.wounds.max) * 2);
        if (actor.type !== "rival") {
          finalStats.system.stats.strain.max =
            updatedStats.system.stats.strain.max
            - ((updatedStats.system.stats.strain.max - inputStats.system.stats.strain.max) * 2);
        }
        finalStats.system.stats.soak.value = Math.max(
          updatedStats.system.stats.soak.value
          - ((updatedStats.system.stats.soak.value - inputStats.system.stats.soak.value) * 2),
          0,
        );
        finalStats.system.stats.defence.melee =
          updatedStats.system.stats.defence.melee
          - ((updatedStats.system.stats.defence.melee - inputStats.system.stats.defence.melee) * 2);
        finalStats.system.stats.defence.ranged =
          updatedStats.system.stats.defence.ranged
          - ((updatedStats.system.stats.defence.ranged - inputStats.system.stats.defence.ranged) * 2);
        finalStats.system.stats.encumbrance.max =
          updatedStats.system.stats.encumbrance.max
          - ((updatedStats.system.stats.encumbrance.max - inputStats.system.stats.encumbrance.max) * 2);

        for (const skill in actor.system.skills) {
          finalStats.system.skills[skill].rank =
            updatedStats.system.skills[skill].rank
            - ((updatedStats.system.skills[skill].rank
              - foundry.utils.deepClone(inputStats.system.skills[skill].rank)) * 2);
        }

        await updatedStats.update({ system: finalStats.system });
        await updatedStats.update({ "system.stats.soak.value": finalStats.system.stats.soak.value });
        await updatedStats.update({ "system.stats.wounds.max": finalStats.system.stats.wounds.max });
        if (actor.type !== "rival") {
          await updatedStats.update({ "system.stats.strain.max": finalStats.system.stats.strain.max });
        }
      }
    }

    for (const actor of world.actors) {
      for (const item of actor.items) {
        if (item.type === "specialization") {
          await convertSpecializationToAEs(item);
        } else if (item.type === "forcepower") {
          await convertForcePowerToAEs(item);
        } else if (item.type === "signatureability") {
          await convertSignatureAbilityToAEs(item);
        }
      }
    }

    for (const item of world.items) {
      await item._onCreateAEs({ parent: false });
      const itemData = item.toJSON();
      itemData.data = itemData.system;
      try {
        await ModifierHelpers.applyActiveEffectOnUpdate(item, itemData);
      } catch {
        ui.notifications!.warn(`Failed to migrate item ${item.name}, it may need to be recreated by hand`);
      }
    }
  } catch (e) {
    ui.notifications!.error("The migration to 1.907 has failed for an unknown world. You may need to replace items on actors with items to fully experience 1.907.");
    CONFIG.logger.debug(e);
  }
}

async function convertSpecializationToAEs(item: any): Promise<void> {
  await convertNestedAttributesToAEs(item, "talents", 20, "talent");
}

async function convertForcePowerToAEs(item: any): Promise<void> {
  await convertNestedAttributesToAEs(item, "upgrades", 16, "upgrade");
}

async function convertSignatureAbilityToAEs(item: any): Promise<void> {
  await convertNestedAttributesToAEs(item, "upgrades", 8, "upgrade");
}

async function convertNestedAttributesToAEs(
  item: any,
  collectionKey: string,
  count: number,
  entryPrefix: string,
): Promise<void> {
  const toCreate: any[] = [];
  for (let i = 0; i < count; i++) {
    const entry = item.system[collectionKey][`${entryPrefix}${i}`];
    const attributes = entry?.attributes;
    if (!attributes || Object.keys(attributes).length === 0) continue;
    for (const attribute in attributes) {
      if (attribute.startsWith("attr")) continue;
      const nk = `attr${new Date().getTime()}`;
      entry.attributes[nk] = attributes[attribute];
      entry.attributes[`-=${attribute}`] = null;
      delete entry.attributes[attribute];
      await new Promise((resolve) => setTimeout(resolve, 1));
      const changes = buildAEChangesFromMod(entry.attributes[nk]);
      toCreate.push({
        name: nk,
        changes,
        disabled: !entry.islearned,
      });
    }
  }
  await item.update({ [`system.${collectionKey}`]: item.system[collectionKey] });
  if (toCreate.length > 0) {
    await item.createEmbeddedDocuments("ActiveEffect", toCreate);
  }
}

function buildAEChangesFromMod(attr: any): any[] {
  const explodedMods = ModifierHelpers.explodeMod(attr.modtype, attr.mod);
  return explodedMods.map((curMod) => ({
    key: ModifierHelpers.getModKeyPath(curMod.modType, curMod.mod),
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    value: attr.value,
  }));
}
