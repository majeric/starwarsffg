interface WoundInput {
  baseWounds: number | string;
  brawn: number | string;
  modifiers?: number | string;
}

/**
 * Compute the wound threshold for a character-like actor.
 *
 * Threshold = base species wounds + brawn + additional modifiers. Mirrors
 * the forward direction of the Brawn-delta logic in
 * modules/actors/actor-ffg.js:117-177. The reverse-direction delta math
 * stays in actor-ffg.js until Phase 6 retires it.
 *
 * Inputs are coerced via Number(); non-numeric inputs become 0.
 */
export function computeWoundThreshold({ baseWounds, brawn, modifiers = 0 }: WoundInput): number {
  return toInt(baseWounds) + toInt(brawn) + toInt(modifiers);
}

function toInt(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
