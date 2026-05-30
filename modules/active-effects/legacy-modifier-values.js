import { DicePoolFFG } from "../dice/pool.js";

const ROLL_MODIFIERS = [
  ["boost", "Add Boost", "Roll Modifiers"],
  ["setback", "Add Setback", "Roll Modifiers"],
  ["remsetback", "Remove Setback", "Roll Modifiers"],
];

const RESULT_MODIFIERS = [
  ["advantage", "Add Advantage"],
  ["dark", "Add Dark"],
  ["failure", "Add Failure"],
  ["light", "Add Light"],
  ["success", "Add Success"],
  ["threat", "Add Threat"],
  ["triumph", "Add Triumph"],
  ["despair", "Add Despair"],
];

function matchingAttributes(item, key, modtype) {
  return Object.values(item?.system?.attributes ?? {})
    .filter((attr) => attr)
    .filter((attr) => attr.modtype === modtype && attr.mod === key);
}

export function getCalculatedValueFromCurrentAndArray(item, items, key, modtype) {
  const rank = item?.system?.rank ?? 1;
  let total = 0;

  for (const attr of matchingAttributes(item, key, modtype)) {
    total += parseInt(attr.value * rank, 10);
  }

  return total;
}

function addDirectPoolModifiers(dicePool, item, items) {
  for (const [property, key, modtype] of ROLL_MODIFIERS) {
    dicePool[property] += getCalculatedValueFromCurrentAndArray(item, items, key, modtype);
  }

  for (const [property, key] of RESULT_MODIFIERS) {
    dicePool[property] += getCalculatedValueFromCurrentAndArray(item, items, key, "Result Modifiers");
  }

  dicePool.difficulty += getCalculatedValueFromCurrentAndArray(item, items, "Add Difficulty", "Dice Modifiers");
}

function applyPoolUpgrades(dicePool, item, items) {
  dicePool.upgradeDifficulty(getCalculatedValueFromCurrentAndArray(item, items, "Upgrade Difficulty", "Dice Modifiers"));
  dicePool.upgradeDifficulty(-1 * getCalculatedValueFromCurrentAndArray(item, items, "Downgrade Difficulty", "Dice Modifiers"));
  dicePool.upgrade(getCalculatedValueFromCurrentAndArray(item, items, "Upgrade Ability", "Dice Modifiers"));
  dicePool.upgrade(-1 * getCalculatedValueFromCurrentAndArray(item, items, "Downgrade Ability", "Dice Modifiers"));
}

export async function getDicePoolModifiers(pool, item, items) {
  const dicePool = new DicePoolFFG(pool);
  addDirectPoolModifiers(dicePool, item, items);
  applyPoolUpgrades(dicePool, item, items);
  return dicePool;
}

export function shouldApplyCharacteristicToDamage(data) {
  return data.characteristic?.value !== "" && data.characteristic?.value !== undefined;
}
