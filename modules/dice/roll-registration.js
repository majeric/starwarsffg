import { RollFFG } from "../dice-pool-ffg.js";

/**
 * Make RollFFG the default Roll class in `CONFIG.Dice.rolls`.
 *
 * Extracted from swffg-main.js by Phase 4.3. The previous two-line
 * mutation (`push(rolls[0]); rolls[0] = RollFFG;`) is replaced with
 * `unshift(RollFFG)`, which is semantically identical: it places RollFFG
 * at index 0 and shifts the existing entries one position to the right.
 *
 * See ADR-009 for the API investigation that selected this pattern.
 * Per ADR-008, V14 may have introduced a dedicated registration helper;
 * Phase 13's V14 compatibility certification will revisit this file.
 */
export function registerRollFFG() {
  CONFIG.Dice.rolls.unshift(RollFFG);
}
