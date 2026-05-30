import { explodeMod, getModKeyPath } from "../active-effects/modifier-map.js";

/**
 * Active Effect creation utilities for the import pipeline.
 * Extracted from ImportHelpers to remove duplicate AE logic.
 */

function buildChanges(modtype, mod, value) {
  return explodeMod(modtype, mod)
    .map((m) => ({
      key: getModKeyPath(m.modType, m.mod),
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value,
    }))
    .filter((c) => c.key !== undefined);
}

export async function createInherentEffect(item) {
  if (!["species", "gear", "weapon", "armour", "shipattachment"].includes(item.type)) return;

  const existing = item.getEmbeddedCollection("ActiveEffect");
  if (existing.find((e) => e.name === "(inherent)")) return;

  const changes = buildInherentChanges(item);
  await item.createEmbeddedDocuments("ActiveEffect", [
    { name: "(inherent)", img: item.img, changes },
  ]);
}

function buildInherentChanges(item) {
  if (item.type === "species") return buildSpeciesChanges(item);
  if (item.type === "armour") return buildArmourChanges();
  if (item.type === "shipattachment") return buildChanges("Vehicle Stat", "Vehicle.Hardpoints", 0);
  return buildChanges("Stat", "Encumbrance", 0);
}

function buildSpeciesChanges(item) {
  const changes = [];
  for (const [key, attr] of Object.entries(item.system.attributes ?? {})) {
    changes.push(...buildChanges(attr.modtype, key, attr.value));
  }
  return changes;
}

function buildArmourChanges() {
  return [
    ...buildChanges("Stat", "Encumbrance", 0),
    ...buildChanges("Stat", "Defence", 0),
    ...buildChanges("Stat", "Soak", 0),
  ];
}

export async function applyTalentActiveEffects(specialization) {
  if (specialization.type !== "specialization") return;

  const toCreate = [];
  for (const talent of Object.values(specialization.system.talents ?? {})) {
    for (const [name, attr] of Object.entries(talent.attributes ?? {})) {
      const changes = buildChanges(attr.modtype, attr.mod, attr.value);
      if (changes.length) {
        toCreate.push({ name, img: talent.img, changes, disabled: true });
      }
    }
  }

  if (toCreate.length) {
    await specialization.createEmbeddedDocuments("ActiveEffect", toCreate);
  }
}
