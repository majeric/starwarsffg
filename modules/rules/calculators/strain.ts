interface StrainInput {
  baseStrain: number | string;
  willpower: number | string;
  modifiers?: number | string;
}

/**
 * Compute the strain threshold for a character-like actor.
 *
 * Threshold = base species strain + willpower + additional modifiers.
 * Mirrors the forward direction of the Willpower-delta logic in
 * modules/actors/actor-ffg.js:178-203. The reverse-direction delta math
 * stays in actor-ffg.js until Phase 6 retires it.
 *
 * Inputs are coerced via Number(); non-numeric inputs become 0.
 */
export function computeStrainThreshold({ baseStrain, willpower, modifiers = 0 }: StrainInput): number {
  return toInt(baseStrain) + toInt(willpower) + toInt(modifiers);
}

function toInt(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
