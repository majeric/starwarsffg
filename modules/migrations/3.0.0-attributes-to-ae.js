import { attributesToEffectData, isUserAttributeKey } from "../active-effects/attribute-to-ae.js";

/**
 * Phase 7 migration: convert any remaining user `item.system.attributes`
 * entries into standalone embedded Active Effects, then clear them so the
 * `attributes` field can be removed (task 7.8). The 1.907 migration already
 * created AEs for most worlds; this catches leftovers and clears the field.
 *
 * IDEMPOTENT: items with no user `attr*` attributes are skipped, so re-running
 * is safe.
 *
 * ⚠ NOT YET REGISTERED in `modules/migrations/index.js` — held there pending
 * operator real-world validation (ADR-002, "never break a world"): it deletes
 * persisted data, and its orchestration (createEmbeddedDocuments/update) cannot
 * be replayed in the unit/replay harness. Register it only after validating
 * against an exported world. The pure transform it relies on
 * (`attributesToEffectData`) is unit-tested.
 *
 * Edge cases (ADR-014): equippable-but-unequipped items get `disabled` effects
 * so the modifier is preserved without applying; entries that map to no AE key
 * are skipped by the transform; inherent (non-`attr*`) entries are left alone.
 */

export const version = "3.0.0";
export const slug = "attributes-to-ae";
export const description = "Convert remaining legacy item attributes to Active Effects and clear them (Phase 7)";

export default async function migrate(world) {
  let changed = 0;
  for (const item of allItems(world)) {
    changed += await migrateItem(item);
  }
  return { changed };
}

function* allItems(world) {
  for (const item of world.items) yield item;
  for (const actor of world.actors) {
    for (const item of actor.items) yield item;
  }
}

async function migrateItem(item) {
  const attributes = item.system?.attributes ?? {};
  const userKeys = Object.keys(attributes).filter(isUserAttributeKey);
  if (userKeys.length === 0) return 0;

  const effects = attributesToEffectData(attributes);
  if (effects.length > 0) {
    const disabled = isUnequipped(item);
    await item.createEmbeddedDocuments(
      "ActiveEffect",
      effects.map((effect) => ({ ...effect, transfer: true, disabled }))
    );
  }

  await item.update({ "system.attributes": deletionKeys(userKeys) });
  return userKeys.length;
}

/** Equippable item that is not currently equipped — its migrated AEs start disabled. */
function isUnequipped(item) {
  const equippable = item.system?.equippable;
  return equippable?.value === true && equippable?.equipped !== true;
}

/** Build a Foundry `-=key` deletion payload that removes each attribute key. */
function deletionKeys(keys) {
  const clear = {};
  for (const key of keys) clear[`-=${key}`] = null;
  return clear;
}
