interface SoakInput {
  brawn: number | string;
  equippedArmourSoak?: number | string;
  modifiers?: number | string;
}

/**
 * Compute soak value for a character-like actor.
 *
 * soak = brawn + equipped armour soak + additional modifiers. Mirrors the
 * forward direction of the Brawn-delta logic in modules/actors/actor-ffg.js:152-163
 * and the equipped-armour soak summation in
 * modules/helpers/modifiers.js:37-39. The summation of equipped armour soak
 * across items is performed by the caller (Phase 6 wires that); this
 * calculator takes the already-summed value.
 *
 * Inputs are coerced via Number(); non-numeric inputs become 0.
 */
export function computeSoak({ brawn, equippedArmourSoak = 0, modifiers = 0 }: SoakInput): number {
  return toInt(brawn) + toInt(equippedArmourSoak) + toInt(modifiers);
}

function toInt(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
