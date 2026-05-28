/**
 * Compute melee or ranged defense for a character-like actor.
 *
 * defense = baseDefense + sum(item.system.defence.adjusted) across all
 * defensive items + modifiers.
 *
 * NOTE: The legacy source at modules/helpers/modifiers.js:41-48 has a
 * "// get the highest defense item" comment but the implementation uses
 * `items.filter(...).length >= 0` which is always true, so it actually
 * SUMS all items rather than picking the highest. This calculator preserves
 * that behavior because it is the published user-facing math. A future ADR
 * will decide whether to align the implementation with the comment.
 *
 * @param {Array<{system:{defence:{adjusted:(number|string)}}}>} defensiveItems
 * @param {number} [baseDefense]
 * @param {number} [modifiers]
 * @returns {number}
 */
export function computeDefense(defensiveItems, baseDefense = 0, modifiers = 0) {
  let total = toInt(baseDefense) + toInt(modifiers);
  for (const item of defensiveItems) {
    total += toInt(item?.system?.defence?.adjusted);
  }
  return total;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
