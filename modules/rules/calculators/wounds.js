/**
 * Compute the wound threshold for a character-like actor.
 *
 * Threshold = base species wounds + brawn + additional modifiers. Mirrors
 * the forward direction of the Brawn-delta logic in
 * modules/actors/actor-ffg.js:117-177. The reverse-direction delta math
 * stays in actor-ffg.js until Phase 6 retires it.
 *
 * Inputs are coerced via Number(); non-numeric inputs become 0.
 *
 * @param {{baseWounds:number, brawn:number, modifiers?:number}} input
 * @returns {number}
 */
export function computeWoundThreshold({ baseWounds, brawn, modifiers = 0 }) {
  return toInt(baseWounds) + toInt(brawn) + toInt(modifiers);
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
