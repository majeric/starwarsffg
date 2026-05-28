/**
 * Compute the force-pool dice available for force skill rolls.
 *
 * Returns max(0, maxForceRating - committedDice). Mirrors the math the
 * legacy `applyActiveEffects` override at modules/actors/actor-ffg.js:725-744
 * injects into AE change values. The mutation-of-AE-changes pattern itself
 * is replaced in Phase 7 with a custom AE change mode; this calculator
 * captures only the pure arithmetic.
 *
 * @param {{maxForceRating:(number|string), committedDice:(number|string)}} input
 * @returns {number}
 */
export function computeForcePool({ maxForceRating, committedDice }) {
  const available = toInt(maxForceRating) - toInt(committedDice);
  return available > 0 ? available : 0;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
