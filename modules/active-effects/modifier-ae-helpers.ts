import { explodeMod, getModKeyPath, getModTypeByModPath } from "./modifier-map.js";

const STAT_KEYS = {
  "system.stats.soak.value": { modtype: "Stat", mod: "Soak" },
  "system.stats.forcePool.max": { modtype: "Stat", mod: "ForcePool" },
  "system.stats.defence.melee": { modtype: "Stat", mod: "Defence.Melee" },
  "system.stats.defence.ranged": { modtype: "Stat", mod: "Defence.Ranged" },
  "system.stats.wounds.value": { modtype: "Stat", mod: "Wounds" },
  "system.stats.strain.value": { modtype: "Stat", mod: "Strain" },
  "system.stats.wounds.max": { modtype: "Threshold", mod: "Wounds" },
  "system.stats.strain.max": { modtype: "Threshold", mod: "Strain" },
  "system.stats.encumbrance.max": { modtype: "Threshold", mod: "EncumbranceMax" },
  "system.stats.hullTrauma.max": { modtype: "Threshold", mod: "Hulltrauma" },
  "system.stats.systemStrain.max": { modtype: "Threshold", mod: "Systemstrain" },
  "system.stats.encumbrance.value": { modtype: "Stat", mod: "Encumbrance" },
  "system.stats.speed.value": { modtype: "Stat", mod: "Speed" },
  "system.stats.shields.fore": { modtype: "Vehicle Stat", mod: "Shields.Fore" },
  "system.stats.shields.aft": { modtype: "Vehicle Stat", mod: "Shields.Aft" },
  "system.stats.shields.port": { modtype: "Vehicle Stat", mod: "Shields.Port" },
  "system.stats.shields.starboard": { modtype: "Vehicle Stat", mod: "Shields.Starboard" },
  "system.stats.customizationHardPoints.value": { modtype: "Vehicle Stat", mod: "Vehicle.Hardpoints" },
  "system.stats.armour.value": { modtype: "Vehicle Stat", mod: "Armour" },
  "system.stats.handling.value": { modtype: "Vehicle Stat", mod: "Handling" },
  "system.stats.silhouette.value": { modtype: "Vehicle Stat", mod: "Silhouette" },
};

interface ModifierData {
  key?: string;
  modtype: string;
  mod: string;
  value: any;
}

function reverseModKeyPath(key: string): { modtype: string; mod: string } | undefined {
  const charMatch = key.match(/^system\.characteristics\.(\w+)\.value$/);
  if (charMatch) return { modtype: "Characteristic", mod: charMatch[1] };

  if ((STAT_KEYS as any)[key]) return (STAT_KEYS as any)[key];

  const skillMatch = key.match(/^system\.skills\.(.+?)\.(\w+)$/);
  if (skillMatch) {
    const modtype = getModTypeByModPath(key);
    if (modtype) return { modtype, mod: skillMatch[1] };
  }

  return undefined;
}

export function isModifierEffect(effect: any): boolean {
  if (effect.name === "(inherent)") return false;
  if (effect.flags?.starwarsffg?.ffgModType) return true;
  if (effect.name?.startsWith("attr") || effect.name?.startsWith("Migrated:")) return true;
  return false;
}

function modFromFlags(effect: any): { modtype: string; mod: string } | undefined {
  const flags = effect.flags?.starwarsffg;
  if (!flags?.ffgModType) return undefined;
  return { modtype: flags.ffgModType, mod: flags.ffgMod };
}

function modFromChanges(effect: any): { modtype: string; mod: string } | undefined {
  const change = effect.changes?.[0];
  if (!change) return undefined;
  return reverseModKeyPath(change.key);
}

function effectToModifier(effect: any): ModifierData | undefined {
  const info = modFromFlags(effect) || modFromChanges(effect);
  if (!info) return undefined;
  const value = effect.changes?.[0]?.value ?? 0;
  return { key: effect.id, modtype: info.modtype, mod: info.mod, value };
}

export function getModifierEffectsAsAttributes(doc: any): Record<string, ModifierData> {
  const effects = doc.getEmbeddedCollection?.("ActiveEffect");
  if (!effects) return {};
  const result: Record<string, ModifierData> = {};
  for (const effect of effects) {
    if (!isModifierEffect(effect)) continue;
    const mod = effectToModifier(effect);
    if (mod) result[mod.key!] = mod;
  }
  return result;
}

function buildAEData(modtype: string, mod: string, value: any): any {
  const exploded = explodeMod(modtype, mod);
  const changes = exploded
    .map((m) => ({
      key: getModKeyPath(m.modType, m.mod),
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: value,
    }))
    .filter((c) => c.key !== undefined);

  return {
    name: `${modtype}: ${mod}`,
    transfer: true,
    changes,
    flags: { starwarsffg: { ffgModType: modtype, ffgMod: mod } },
  };
}

export async function createModifierEffect(doc: any, modtype: string, mod: string, value: any): Promise<any> {
  const data = buildAEData(modtype, mod, value);
  return doc.createEmbeddedDocuments("ActiveEffect", [data]);
}

export async function updateModifierEffect(
  doc: any,
  effectId: string,
  modtype: string,
  mod: string,
  value: any,
): Promise<any> {
  const data = buildAEData(modtype, mod, value);
  data._id = effectId;
  return doc.updateEmbeddedDocuments("ActiveEffect", [data]);
}

export async function deleteModifierEffect(doc: any, effectId: string): Promise<any> {
  return doc.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
}

export async function syncFormToEffects(doc: any, formModifiers: Record<string, ModifierData>): Promise<void> {
  const existing = doc.getEmbeddedCollection("ActiveEffect");
  const existingMods: Record<string, any> = {};
  for (const e of existing) {
    if (isModifierEffect(e)) existingMods[e.id] = e;
  }

  const toUpdate: any[] = [];
  const seen = new Set<string>();

  for (const [key, mod] of Object.entries(formModifiers)) {
    if (key.startsWith("-=")) continue;
    seen.add(key);
    const effect = existing.get(key);
    if (effect) {
      const data = buildAEData(mod.modtype, mod.mod, mod.value);
      data._id = key;
      toUpdate.push(data);
    }
  }

  const toDelete = Object.keys(existingMods).filter((id) => !seen.has(id));

  if (toUpdate.length) await doc.updateEmbeddedDocuments("ActiveEffect", toUpdate);
  if (toDelete.length) await doc.deleteEmbeddedDocuments("ActiveEffect", toDelete);
}
