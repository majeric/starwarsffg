import { explodeMod, getModKeyPath } from "./modifier-map.js";

function hasKey(obj: any, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

function cleanDeletedAttributeKeys(formData: any): void {
  const attributes = formData.data.attributes;
  if (!attributes) return;

  for (const attr of Object.keys(attributes)) {
    if (attr.startsWith("-=attr")) delete attributes[attr];
  }
}

function submittedAttributes(formData: any): Record<string, any> {
  return (foundry.utils.expandObject(formData) as any)?.data?.attributes || {};
}

function changesForAttribute(attr: any): any[] {
  const changes: any[] = [];
  for (const curMod of explodeMod(attr.modtype, attr.mod)) {
    changes.push({
      key: getModKeyPath(curMod.modType, curMod.mod),
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: attr.value,
    });
  }
  return changes;
}

function applyAttributeToEffect(effect: any, attr: any): void {
  for (const curMod of explodeMod(attr.modtype, attr.mod)) {
    const modPath = getModKeyPath(curMod.modType, curMod.mod);
    const index = effect.changes.findIndex((change: any) => change.key === modPath);
    if (index >= 0) effect.changes[index].value = attr.value;
  }
}

async function updateInherentAttributes(formData: any, inherentEffect: any): Promise<void> {
  if (!inherentEffect || !hasKey(formData.data, "attributes")) return;

  for (const key of Object.keys(formData.data.attributes)) {
    if (key.startsWith("attr")) continue;
    applyAttributeToEffect(inherentEffect, formData.data.attributes[key]);
  }

  await inherentEffect.update({ changes: inherentEffect.changes });
}

function inherentStatUpdates(item: any, formData: any): any[] {
  if (["gear", "weapon", "armour"].includes(item.type)) {
    const updates = [{ modtype: "Stat", mod: "Encumbrance", value: formData.data.encumbrance.value }];
    if (item.type === "armour") {
      updates.push({ modtype: "Stat", mod: "Defence", value: formData.data.defence.value });
      updates.push({ modtype: "Stat", mod: "Soak", value: formData.data.soak.value });
    }
    return updates;
  }

  if (item.type === "shipattachment") {
    return [{ modtype: "Vehicle Stat", mod: "Vehicle.Hardpoints", value: formData.data.hardpoints.value * -1 }];
  }

  return [];
}

function applyInherentStatUpdate(effect: any, update: any): void {
  for (const curMod of explodeMod(update.modtype, update.mod)) {
    const modPath = getModKeyPath(curMod.modType, curMod.mod);
    const index = effect.changes.findIndex((change: any) => change.key === modPath);
    if (index >= 0) effect.changes[index].value = update.value;
  }
}

async function updateInherentStats(item: any, formData: any, inherentEffect: any): Promise<void> {
  if (!inherentEffect) return;
  const updates = inherentStatUpdates(item, formData);
  if (!updates.length) return;

  for (const update of updates) {
    applyInherentStatUpdate(inherentEffect, update);
  }

  await inherentEffect.update({ changes: inherentEffect.changes });
}

function stageDeletedAttributeEffects(item: any, existingEffects: any, attributes: Record<string, any>, toDelete: string[]): void {
  for (const key of Object.keys(item.system?.attributes ?? {})) {
    const match = existingEffects.find((effect: any) => effect.name === key);
    if (!hasKey(attributes, key)) {
      attributes[`-=${key}`] = null;
      if (match) toDelete.push(match.id);
    }
  }
}

async function syncSubmittedAttributeEffects(existingEffects: any, formData: any, toCreate: any[]): Promise<void> {
  if (!formData.data?.attributes) return;

  for (const key of Object.keys(formData.data.attributes)) {
    const match = existingEffects.find((effect: any) => effect.name === key);
    const changes = changesForAttribute(formData.data.attributes[key]);

    if (match) {
      await match.update({ changes });
    } else if (key.startsWith("attr")) {
      toCreate.push({ name: key, changes });
    }
  }
}

function speciesThresholdValues(item: any, formData: any, changes: any[]): Record<string, number> {
  const newBrawn = changes.find((ae) => ae.key === "system.characteristics.Brawn.value").value;
  const newWillpower = changes.find((ae) => ae.key === "system.characteristics.Willpower.value").value;
  const wounds = submittedAttributeValue(formData, item, "Wounds");
  const strain = submittedAttributeValue(formData, item, "Strain");

  return {
    wounds: parseInt(wounds, 10) + parseInt(newBrawn, 10),
    strain: parseInt(strain, 10) + parseInt(newWillpower, 10),
    encumbrance: parseInt(newBrawn, 10) + 5,
  };
}

function submittedAttributeValue(formData: any, item: any, key: string): any {
  const submitted = formData.data.attributes?.[key]?.value;
  if (submitted) return submitted;
  return item.system.attributes[key].value;
}

function updateSpeciesThresholdChange(change: any, values: Record<string, number>): void {
  const thresholdValues = {
    "system.stats.wounds.max": values.wounds,
    "system.stats.strain.max": values.strain,
    "system.stats.encumbrance.max": values.encumbrance,
  };

  if (hasKey(thresholdValues, change.key)) change.value = (thresholdValues as any)[change.key];
}

async function updateSpeciesThresholdEffects(item: any, formData: any, existingEffects: any): Promise<void> {
  const itemEffect = existingEffects.find((effect: any) => effect.name === "(inherent)");
  if (!itemEffect || item.type !== "species") return;

  const newChanges = foundry.utils.deepClone(itemEffect.changes);
  const values = speciesThresholdValues(item, formData, newChanges);

  for (const change of newChanges) {
    updateSpeciesThresholdChange(change, values);
  }

  await itemEffect.update({ changes: newChanges });
}

export async function applyActiveEffectOnUpdate(item: any, formData: any): Promise<void> {
  CONFIG.logger.debug("Updating active effects on item update");
  if (!hasKey(formData, "data")) {
    CONFIG.logger.debug("Bailing on update as there was no form data");
    return;
  }

  const updateData = foundry.utils.deepClone(formData);
  cleanDeletedAttributeKeys(updateData);

  const attributes = submittedAttributes(updateData);
  const existingEffects = item.getEmbeddedCollection("ActiveEffect");
  const inherentEffect = existingEffects.find((effect: any) => effect.name === "(inherent)");
  const toDelete: string[] = [];
  const toCreate: any[] = [];

  await updateInherentAttributes(updateData, inherentEffect);
  await updateInherentStats(item, updateData, inherentEffect);
  stageDeletedAttributeEffects(item, existingEffects, attributes, toDelete);
  await syncSubmittedAttributeEffects(existingEffects, updateData, toCreate);
  await updateSpeciesThresholdEffects(item, updateData, item.getEmbeddedCollection("ActiveEffect"));

  if (toCreate.length) await item.createEmbeddedDocuments("ActiveEffect", toCreate);
  if (toDelete.length) await item.deleteEmbeddedDocuments("ActiveEffect", toDelete);

  CONFIG.logger.debug("applyActiveEffectOnUpdate", toCreate, toDelete);
}
