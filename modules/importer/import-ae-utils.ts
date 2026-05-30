// @ts-nocheck -- FIXME(types): legacy importer; type during Phase 12.16 strict pass
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

/* eslint-disable max-lines-per-function, complexity -- import-specific AE sync; decomposition deferred */
export async function applyImportActiveEffects(item, formData) {
  const existing = item.getEmbeddedCollection("ActiveEffect");
  const toCreate = [];
  const inherent = existing.find((e) => e.name === "(inherent)");

  if (inherent && formData.system?.attributes) {
    await syncInherentAttributes(inherent, formData.system.attributes, item);
  }

  if (inherent) {
    await syncInherentStats(inherent, item, formData);
  }

  if (formData.system?.attributes) {
    await syncUserAttributes(existing, formData.system.attributes, item, toCreate);
  }

  if (inherent) {
    await syncCareerSkills(inherent, item);
  }

  if (toCreate.length) await item.createEmbeddedDocuments("ActiveEffect", toCreate);
}

async function syncInherentAttributes(effect, attributes, item) {
  for (const k of Object.keys(attributes)) {
    if (k.startsWith("attr")) continue;
    for (const m of explodeMod(attributes[k].modtype, attributes[k].mod)) {
      const path = getModKeyPath(m.modType, m.mod);
      const idx = effect.changes.findIndex((c) => c.key === path);
      if (idx < 0) continue;
      if (path === "system.stats.wounds.max" && item.type === "species") {
        effect.changes[idx].value = parseInt(effect.changes[idx].value) + parseInt(item.system.attributes.Brawn.value);
      } else if (path === "system.stats.strain.max" && item.type === "species") {
        effect.changes[idx].value = parseInt(effect.changes[idx].value) + parseInt(item.system.attributes.Willpower.value);
      } else if (path === "system.stats.encumbrance.max" && item.type === "species") {
        effect.changes[idx].value = parseInt(effect.changes[idx].value) + 5;
      } else {
        effect.changes[idx].value = attributes[k].value;
      }
    }
  }
  await effect.update({ changes: effect.changes });
}

async function syncInherentStats(effect, item, formData) {
  if (!["gear", "weapon", "armour"].includes(item.type)) return;

  updateEffectStat(effect, "Stat", "Encumbrance", formData.system.encumbrance?.value);
  if (item.type === "armour") {
    updateEffectStat(effect, "Stat", "Defence", formData.system.defence?.value);
    updateEffectStat(effect, "Stat", "Soak", formData.system.soak?.value);
  }
  await effect.update({ changes: effect.changes });
}

function updateEffectStat(effect, modtype, mod, value) {
  if (value === undefined) return;
  for (const m of explodeMod(modtype, mod)) {
    const path = getModKeyPath(m.modType, m.mod);
    const idx = effect.changes.findIndex((c) => c.key === path);
    if (idx >= 0) effect.changes[idx].value = value;
  }
}

async function syncUserAttributes(existing, attributes, item, toCreate) {
  for (const k of Object.keys(attributes)) {
    const match = existing.find((e) => e.name === k);
    const changes = buildChanges(attributes[k].modtype, attributes[k].mod, attributes[k].value);
    if (match) {
      await match.update({ changes });
    } else if (k.startsWith("attr")) {
      toCreate.push({ name: k, icon: item.img, changes });
    }
  }
}

async function syncCareerSkills(effect, item) {
  const count = item.type === "career" ? 8 : item.type === "specialization" ? 5 : 0;
  if (!count) return;
  const changes = [];
  for (let i = 0; i < count; i++) {
    const skill = item.system.careerSkills[`careerSkill${i}`];
    changes.push({
      key: skill !== "(none)" ? `system.skills.${skill}.careerskill` : "(none)",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: true,
    });
  }
  await effect.update({ changes });
}
/* eslint-enable max-lines-per-function, complexity */

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
