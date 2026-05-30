import { explodeMod, getModKeyPath } from "./modifier-map.js";

/**
 * Pure conversion of the legacy `item.system.attributes` representation into
 * Active Effect data. Phase 7 makes AEs canonical; this is the single tested
 * transform reused by the attributes→AE migration (7.4), `_onCreateAEs`, and the
 * modifier UI (7.5) so the conversion cannot drift. Mirrors the 1.907 migration's
 * `buildAEChangesFromMod` (explodeMod + getModKeyPath, ADD mode).
 */

/**
 * User-authored modifier entries use `attr<timestamp>` keys; inherent/structural
 * entries (e.g. a species "brawn") do not. Only user entries migrate to
 * standalone Active Effects.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isUserAttributeKey(key) {
  return typeof key === "string" && key.startsWith("attr");
}

/**
 * Convert one attribute entry into the Active Effect `changes` it implies. A
 * compound mod (e.g. Brawn) expands to several changes via `explodeMod`.
 *
 * @param {{ modtype:string, mod:string, value:* }} attr
 * @returns {Array<{ key:string, mode:number, value:* }>}
 */
export function attributeToChanges(attr) {
  const exploded = explodeMod(attr.modtype, attr.mod);
  return exploded.map((curMod) => ({
    key: getModKeyPath(curMod.modType, curMod.mod),
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    value: attr.value,
  }));
}

/**
 * Build the Active Effect creation payloads for every user attribute on an item
 * `system.attributes` map. Inherent entries are skipped (they already live on
 * the item's `(inherent)` effect). Entries that map to no key are skipped.
 *
 * @param {Record<string, { modtype:string, mod:string, value:* }>} attributes
 * @returns {Array<{ name:string, changes:Array<object> }>}
 */
export function attributesToEffectData(attributes = {}) {
  const effects = [];
  for (const [key, attr] of Object.entries(attributes)) {
    if (!isUserAttributeKey(key)) continue;
    const changes = attributeToChanges(attr).filter((c) => c.key !== undefined);
    if (changes.length === 0) continue;
    effects.push({ name: attr.mod ? `Migrated: ${attr.mod}` : `Migrated: ${attr.modtype}`, changes });
  }
  return effects;
}
