import { DicePoolFFG } from "../dice/pool.js";

/**
 * The rules governing Initiative, kept free of Foundry globals so they can be
 * exercised directly by unit tests.
 *
 * Initiative in this system produces an ordered list of *slots* rather than a
 * fixed turn order. A slot is ranked by the number of successes on the check,
 * with advantages as the tiebreaker. Foundry stores a single number per
 * combatant, so both are packed into one sortable value:
 *
 *   initiative = successes + (advantages / 100)
 *
 * That ordering is correct for any number of advantages, because a single extra
 * success always outranks any number of advantages. The hundredths encoding does
 * limit faithful *display* to 99 advantages, which no real pool reaches.
 */

/** Advantages occupy the hundredths place of the encoded initiative value. */
export const ADVANTAGE_SCALE = 100;

/**
 * Pack a check result into the single number Foundry stores as initiative.
 * @param {number} successes   Net successes on the Initiative check.
 * @param {number} advantages  Net advantages on the Initiative check.
 * @returns {number}
 */
export function encodeInitiative(successes, advantages) {
  const s = Number(successes) || 0;
  const a = Number(advantages) || 0;
  return s + a / ADVANTAGE_SCALE;
}

/**
 * Unpack an encoded initiative value.
 *
 * Computed arithmetically rather than by slicing the decimal string, so that
 * ten or more advantages decode correctly.
 * @param {number} value
 * @returns {{successes: number, advantages: number}}
 */
export function decodeInitiative(value) {
  const v = Number(value) || 0;
  const successes = Math.floor(v);
  const advantages = Math.round((v - successes) * ADVANTAGE_SCALE);
  return { successes, advantages };
}

/**
 * Comparator for encoded initiative values, ascending.
 *
 * Callers consume the sorted list from the end (highest first). Combatants who
 * have not rolled carry a null initiative and sort below everyone who has, so
 * they end up holding the lowest slots.
 * @param {number|null} a
 * @param {number|null} b
 * @returns {number}
 */
export function sortInit(a, b) {
  // equal items sort equally
  if (a === b) {
    return 0;
  }
  // nulls sort before anything else
  if (a === null || a === undefined) {
    return -1;
  }
  if (b === null || b === undefined) {
    return 1;
  }
  return a < b ? -1 : 1;
}

/**
 * Build the dice pool for an Initiative check.
 *
 * This is the standard FFG skill check pool: a number of ability dice equal to
 * the *greater* of the characteristic and the skill rank, upgraded a number of
 * times equal to the *lesser* of the two.
 *
 * @param {number} characteristic  Willpower for Vigilance, Presence for Cool.
 * @param {number} rank            Ranks in the Initiative skill.
 * @param {object} [extra]         Additional dice from talents, gear and so on.
 * @returns {DicePoolFFG}
 */
export function buildInitiativePool(characteristic, rank, extra = {}) {
  const char = parseInt(characteristic, 10) || 0;
  const ranks = parseInt(rank, 10) || 0;

  const pool = new DicePoolFFG({
    ability: Math.max(char, ranks),
    boost: parseInt(extra.boost, 10) || 0,
    setback: parseInt(extra.setback, 10) || 0,
    force: parseInt(extra.force, 10) || 0,
    advantage: parseInt(extra.advantage, 10) || 0,
    success: parseInt(extra.success, 10) || 0,
  });
  pool.upgrade(Math.min(char, ranks));

  return pool;
}
