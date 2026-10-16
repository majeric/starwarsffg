import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryGlobals } from "./harness/foundry.mjs";

/**
 * Rules under test: the FFG narrative dice pool.
 *
 * Upgrading (CRB, "Upgrading and Downgrading Dice"):
 *   - Upgrading ability converts one Ability die into a Proficiency die.
 *     If the pool holds no Ability die, an Ability die is ADDED instead.
 *   - Upgrading difficulty converts one Difficulty die into a Challenge die.
 *     If the pool holds no Difficulty die, a Difficulty die is ADDED instead.
 *   - Downgrading is the exact reverse of upgrading: a Proficiency die becomes
 *     an Ability die, and when no Proficiency die is left an Ability die is
 *     REMOVED from the pool. Likewise Challenge -> Difficulty -> removed.
 */

const harness = installFoundryGlobals({
  settings: { "starwarsffg.ApplyRemoveSetbackMods": false },
});

const { DicePoolFFG } = await import("../../modules/dice/pool.js");

const setSetbackMods = (value) =>
  harness.settings.set("starwarsffg.ApplyRemoveSetbackMods", value);

/* -------------------------------------------------------------------------- */
/* Construction                                                               */
/* -------------------------------------------------------------------------- */

test("construction: an undefined pool is an empty pool", () => {
  const pool = new DicePoolFFG();
  for (const key of ["proficiency", "ability", "challenge", "difficulty", "boost", "setback", "remsetback", "force"]) {
    assert.equal(pool[key], 0, `${key} should default to 0`);
  }
  for (const key of ["success", "failure", "advantage", "threat", "triumph", "despair", "light", "dark", "upgrades"]) {
    assert.equal(pool[key], 0, `${key} should default to 0`);
  }
});

test("construction: an object seeds every die and symbol", () => {
  const pool = new DicePoolFFG({
    proficiency: 1, ability: 2, challenge: 3, difficulty: 4,
    boost: 5, setback: 6, remsetback: 7, force: 8,
    success: 1, failure: 2, advantage: 3, threat: 4,
    triumph: 5, despair: 6, light: 7, dark: 8, upgrades: 9,
  });
  assert.equal(pool.proficiency, 1);
  assert.equal(pool.ability, 2);
  assert.equal(pool.challenge, 3);
  assert.equal(pool.difficulty, 4);
  assert.equal(pool.boost, 5);
  assert.equal(pool.setback, 6);
  assert.equal(pool.remsetback, 7);
  assert.equal(pool.force, 8);
  assert.equal(pool.triumph, 5);
  assert.equal(pool.despair, 6);
  assert.equal(pool.upgrades, 9);
});

test("construction: a JSON string describes the same pool as the object it encodes", () => {
  const data = { proficiency: 2, ability: 1, difficulty: 3, boost: 1, force: 1 };
  const fromObject = new DicePoolFFG(data);
  const fromString = new DicePoolFFG(JSON.stringify(data));
  assert.equal(fromString.renderDiceExpression(), fromObject.renderDiceExpression());
  assert.equal(fromString.proficiency, 2);
  assert.equal(fromString.force, 1);
});

test("construction: unknown keys are ignored and missing keys default to zero", () => {
  const pool = new DicePoolFFG({ ability: 2, nonsense: 99 });
  assert.equal(pool.ability, 2);
  assert.equal(pool.proficiency, 0);
  assert.equal(pool.nonsense, undefined);
});

test("construction: a source entry that is not a plain skill rank still builds a pool", () => {
  // The tooltip lists where each die came from. A source row whose modtype is
  // something other than "Skill Rank" (e.g. a talent granting ranks) must still
  // describe itself rather than blowing up the whole pool.
  const pool = new DicePoolFFG({
    ability: 2,
    source: { skill: [{ name: "Grit", type: "talent", value: 1, modtype: "Career Skill" }] },
  });
  assert.equal(pool.source.skill.length, 1);
});

/* -------------------------------------------------------------------------- */
/* Upgrading ability                                                          */
/* -------------------------------------------------------------------------- */

test("upgrade: converts an ability die into a proficiency die", () => {
  const pool = new DicePoolFFG({ ability: 3 });
  pool.upgrade();
  assert.equal(pool.ability, 2);
  assert.equal(pool.proficiency, 1);
});

test("upgrade: defaults to a single upgrade", () => {
  const pool = new DicePoolFFG({ ability: 2 });
  pool.upgrade();
  assert.equal(pool.proficiency, 1);
  assert.equal(pool.ability, 1);
});

test("upgrade: zero upgrades change nothing", () => {
  const pool = new DicePoolFFG({ ability: 2, proficiency: 1 });
  pool.upgrade(0);
  assert.equal(pool.ability, 2);
  assert.equal(pool.proficiency, 1);
});

test("upgrade: adds an ability die when none remain to convert", () => {
  const pool = new DicePoolFFG({ proficiency: 2 });
  pool.upgrade();
  assert.equal(pool.ability, 1, "an upgrade with nothing to convert adds an ability die");
  assert.equal(pool.proficiency, 2, "existing proficiency dice are untouched");
});

test("upgrade: converting never changes the number of dice in the pool", () => {
  const pool = new DicePoolFFG({ ability: 4 });
  pool.upgrade(4);
  assert.equal(pool.ability + pool.proficiency, 4);
  assert.equal(pool.proficiency, 4);
  assert.equal(pool.ability, 0);
});

test("upgrade: upgrading past the pool size alternates adding and converting", () => {
  // Ability 2, upgraded five times:
  //   1 -> 1a 1p, 2 -> 0a 2p, 3 -> 1a 2p, 4 -> 0a 3p, 5 -> 1a 3p
  const pool = new DicePoolFFG({ ability: 2 });
  pool.upgrade(5);
  assert.equal(pool.proficiency, 3);
  assert.equal(pool.ability, 1);
});

test("upgrade: n upgrades of an empty pool give floor(n/2) proficiency and n%2 ability", () => {
  for (let n = 0; n <= 10; n++) {
    const pool = new DicePoolFFG();
    pool.upgrade(n);
    assert.equal(pool.proficiency, Math.floor(n / 2), `${n} upgrades: proficiency`);
    assert.equal(pool.ability, n % 2, `${n} upgrades: ability`);
  }
});

test("upgrade: one at a time is the same as all at once", () => {
  const stepwise = new DicePoolFFG({ ability: 1, proficiency: 1 });
  for (let i = 0; i < 6; i++) stepwise.upgrade();
  const atOnce = new DicePoolFFG({ ability: 1, proficiency: 1 });
  atOnce.upgrade(6);
  assert.equal(stepwise.ability, atOnce.ability);
  assert.equal(stepwise.proficiency, atOnce.proficiency);
});

test("upgrade: leaves the difficulty side of the pool alone", () => {
  const pool = new DicePoolFFG({ ability: 1, difficulty: 2, challenge: 1, boost: 1, setback: 1, force: 1 });
  pool.upgrade(3);
  assert.equal(pool.difficulty, 2);
  assert.equal(pool.challenge, 1);
  assert.equal(pool.boost, 1);
  assert.equal(pool.setback, 1);
  assert.equal(pool.force, 1);
});

/* -------------------------------------------------------------------------- */
/* Downgrading ability                                                        */
/* -------------------------------------------------------------------------- */

test("downgrade: turns a proficiency die back into an ability die", () => {
  const pool = new DicePoolFFG({ proficiency: 2, ability: 1 });
  pool.upgrade(-1);
  assert.equal(pool.proficiency, 1);
  assert.equal(pool.ability, 2);
});

test("downgrade: undoes an upgrade that converted a die", () => {
  const pool = new DicePoolFFG({ ability: 3 });
  pool.upgrade(2);
  pool.upgrade(-2);
  assert.equal(pool.ability, 3);
  assert.equal(pool.proficiency, 0);
});

test("downgrade: with no proficiency dice left, an ability die is removed", { todo: "Pending a rules check: does downgrading with no proficiency/challenge die remove a die, or do nothing? pool.js currently does nothing." }, () => {
  // Downgrading is the reverse of upgrading. Upgrading an empty pool adds an
  // ability die, so downgrading a pool of plain ability dice takes one away.
  const pool = new DicePoolFFG({ ability: 2 });
  pool.upgrade(-1);
  assert.equal(pool.ability, 1);
  assert.equal(pool.proficiency, 0);
});

test("downgrade: undoes an upgrade that added a die", { todo: "Pending a rules check: does downgrading with no proficiency/challenge die remove a die, or do nothing? pool.js currently does nothing." }, () => {
  const pool = new DicePoolFFG();
  pool.upgrade(1);
  pool.upgrade(-1);
  assert.equal(pool.ability, 0, "the added ability die is taken back off the pool");
  assert.equal(pool.proficiency, 0);
});

test("downgrade: never drives the pool below zero dice", () => {
  const pool = new DicePoolFFG();
  pool.upgrade(-3);
  assert.equal(pool.ability, 0);
  assert.equal(pool.proficiency, 0);
  assert.ok(pool.ability >= 0 && pool.proficiency >= 0);
});

/* -------------------------------------------------------------------------- */
/* Upgrading and downgrading difficulty                                       */
/* -------------------------------------------------------------------------- */

test("upgradeDifficulty: converts a difficulty die into a challenge die", () => {
  const pool = new DicePoolFFG({ difficulty: 3 });
  pool.upgradeDifficulty();
  assert.equal(pool.difficulty, 2);
  assert.equal(pool.challenge, 1);
});

test("upgradeDifficulty: adds a difficulty die when none remain to convert", () => {
  const pool = new DicePoolFFG({ challenge: 1 });
  pool.upgradeDifficulty();
  assert.equal(pool.difficulty, 1);
  assert.equal(pool.challenge, 1);
});

test("upgradeDifficulty: n upgrades of an empty pool give floor(n/2) challenge and n%2 difficulty", () => {
  for (let n = 0; n <= 10; n++) {
    const pool = new DicePoolFFG();
    pool.upgradeDifficulty(n);
    assert.equal(pool.challenge, Math.floor(n / 2), `${n} upgrades: challenge`);
    assert.equal(pool.difficulty, n % 2, `${n} upgrades: difficulty`);
  }
});

test("upgradeDifficulty: upgrading past the pool size alternates adding and converting", () => {
  const pool = new DicePoolFFG({ difficulty: 2 });
  pool.upgradeDifficulty(5);
  assert.equal(pool.challenge, 3);
  assert.equal(pool.difficulty, 1);
});

test("upgradeDifficulty: leaves the ability side of the pool alone", () => {
  const pool = new DicePoolFFG({ ability: 2, proficiency: 1, difficulty: 1 });
  pool.upgradeDifficulty(3);
  assert.equal(pool.ability, 2);
  assert.equal(pool.proficiency, 1);
});

test("downgradeDifficulty: turns a challenge die back into a difficulty die", () => {
  const pool = new DicePoolFFG({ challenge: 2, difficulty: 1 });
  pool.upgradeDifficulty(-1);
  assert.equal(pool.challenge, 1);
  assert.equal(pool.difficulty, 2);
});

test("downgradeDifficulty: undoes an upgrade that converted a die", () => {
  const pool = new DicePoolFFG({ difficulty: 3 });
  pool.upgradeDifficulty(2);
  pool.upgradeDifficulty(-2);
  assert.equal(pool.difficulty, 3);
  assert.equal(pool.challenge, 0);
});

test("downgradeDifficulty: with no challenge dice left, a difficulty die is removed", { todo: "Pending a rules check: does downgrading with no proficiency/challenge die remove a die, or do nothing? pool.js currently does nothing." }, () => {
  const pool = new DicePoolFFG({ difficulty: 2 });
  pool.upgradeDifficulty(-1);
  assert.equal(pool.difficulty, 1);
  assert.equal(pool.challenge, 0);
});

test("downgradeDifficulty: never drives the pool below zero dice", () => {
  const pool = new DicePoolFFG();
  pool.upgradeDifficulty(-3);
  assert.equal(pool.difficulty, 0);
  assert.equal(pool.challenge, 0);
});

/* -------------------------------------------------------------------------- */
/* renderDiceExpression                                                       */
/* -------------------------------------------------------------------------- */

test("expression: every die type gets its own denomination", () => {
  setSetbackMods(false);
  const pool = new DicePoolFFG({
    proficiency: 1, ability: 2, challenge: 3, difficulty: 4, boost: 5, setback: 6, force: 7,
  });
  assert.equal(pool.renderDiceExpression(), "1dp+2da+3dc+4di+5db+6ds+7df");
});

test("expression: an empty pool rolls nothing", () => {
  setSetbackMods(false);
  assert.equal(new DicePoolFFG().renderDiceExpression(), "");
});

test("expression: die types with no dice are left out", () => {
  setSetbackMods(false);
  assert.equal(new DicePoolFFG({ ability: 2, difficulty: 1 }).renderDiceExpression(), "2da+1di");
});

test("expression: double-digit pools are not truncated", () => {
  setSetbackMods(false);
  assert.equal(new DicePoolFFG({ ability: 10 }).renderDiceExpression(), "10da");
});

test("expression: symbols added to the pool are not rolled as dice", () => {
  // Automatic successes/advantages are applied to the result, not rolled.
  setSetbackMods(false);
  const pool = new DicePoolFFG({ ability: 1, success: 2, advantage: 3, triumph: 1 });
  assert.equal(pool.renderDiceExpression(), "1da");
});

test("expression: removed setback dice are taken out of the pool when the setting is on", () => {
  setSetbackMods(true);
  const pool = new DicePoolFFG({ ability: 1, setback: 3, remsetback: 2 });
  assert.equal(pool.renderDiceExpression(), "1da+1ds");
});

test("expression: removing more setback dice than the pool holds leaves none, never a negative", () => {
  setSetbackMods(true);
  const pool = new DicePoolFFG({ ability: 1, setback: 1, remsetback: 4 });
  assert.equal(pool.renderDiceExpression(), "1da");
});

test("expression: removed setback dice are ignored while the setting is off", () => {
  setSetbackMods(false);
  const pool = new DicePoolFFG({ ability: 1, setback: 3, remsetback: 2 });
  assert.equal(pool.renderDiceExpression(), "1da+3ds");
});

test("expression: reflects an upgraded pool", () => {
  setSetbackMods(false);
  const pool = new DicePoolFFG({ ability: 3, difficulty: 2 });
  pool.upgrade(2);
  pool.upgradeDifficulty(1);
  assert.equal(pool.renderDiceExpression(), "2dp+1da+1dc+1di");
});
