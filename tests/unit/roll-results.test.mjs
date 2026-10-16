import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryGlobals } from "./harness/foundry.mjs";

/**
 * Rules under test: how a pool of FFG dice resolves into a result.
 *
 *   - Successes and failures cancel one for one. What is left is the net
 *     result; a check succeeds when at least one net success remains.
 *   - Advantages and threats cancel one for one, independently of
 *     successes and failures. Advantage never cancels a failure.
 *   - A Triumph counts as a success (and so can be cancelled as a success),
 *     but the Triumph itself is never cancelled.
 *   - A Despair counts as a failure, but the Despair itself is never
 *     cancelled. Triumphs and Despairs do not cancel each other.
 *   - Light and dark Force pips never cancel each other.
 */

/* -------------------------------------------------------------------------- */
/* Local stand-ins the shared harness does not provide                        */
/*                                                                            */
/* The harness is shared with other suites, so these live here instead:       */
/*   - foundry.dice.terms: the harness exposes a Proxy that mints a new class  */
/*     on every read, so `instanceof` can never succeed. Replaced with stable  */
/*     classes that mimic DiceTerm/OperatorTerm/StringTerm.                    */
/*   - Roll: the harness stub has no toJSON/fromData/safeEval behaviour.       */
/*     Replaced with a small stand-in shaped like core's Roll.                 */
/*   - Number.isNumeric: a Foundry extension RollFFG#evaluate calls.           */
/* -------------------------------------------------------------------------- */

installFoundryGlobals({ settings: { "starwarsffg.dicetheme": "starwars" } });

class StubDiceTerm {
  constructor(termData) {
    const data = termData !== null && typeof termData === "object" ? termData : {};
    this.number = data.number ?? 1;
    this.faces = data.faces ?? 6;
    this.modifiers = data.modifiers ?? [];
    this.options = data.options ?? {};
    this.results = [];
    this._evaluated = false;
    this._forcedFaces = data.forcedFaces ? [...data.forcedFaces] : [];
  }
  async roll() {
    const result = this._forcedFaces.length ? this._forcedFaces.shift() : 1;
    const roll = { result, active: true };
    this.results.push(roll);
    return roll;
  }
  async _evaluateModifiers() {}
}

class StubOperatorTerm {
  constructor({ operator = "+" } = {}) { this.operator = operator; }
}
class StubStringTerm {
  constructor({ term = "" } = {}) { this.term = term; }
}

globalThis.foundry.dice.terms = {
  DiceTerm: StubDiceTerm,
  OperatorTerm: StubOperatorTerm,
  StringTerm: StubStringTerm,
  NumericTerm: class { constructor({ number = 0 } = {}) { this.number = number; } },
};

Number.isNumeric = function (n) {
  if (n instanceof Array) return false;
  if ([null, ""].includes(n)) return false;
  return +n === +n;
};

class StubRoll {
  constructor(formula = "", data = {}, options = {}) {
    this._formula = formula;
    this.data = data;
    this.options = options;
    this.terms = [];
    this._dice = [];
    this._total = undefined;
    this._evaluated = false;
  }
  get formula() { return this._formula; }
  get total() { return this._total; }
  get dice() { return this._dice; }
  async evaluate() { this._evaluated = true; this._total ??= 0; return this; }
  static safeEval(expression) {
    return Function(`"use strict"; return (${expression})`)();
  }
  static cleanFormula(terms) { return terms.join(""); }
  toJSON() {
    return {
      class: this.constructor.name,
      options: this.options,
      dice: this._dice,
      formula: this._formula,
      terms: this.terms,
      total: this._total,
      evaluated: this._evaluated,
    };
  }
  static fromData(data) {
    const roll = new this(data.formula, data.data, data.options);
    roll.terms = data.terms ?? [];
    roll._total = data.total;
    roll._evaluated = data.evaluated ?? false;
    return roll;
  }
}
globalThis.Roll = StubRoll;

const { configureDice } = await import("../../modules/config/ffg-dice.js");
configureDice();

const { AbilityDie } = await import("../../modules/dice/dietype/AbilityDie.js");
const { BoostDie } = await import("../../modules/dice/dietype/BoostDie.js");
const { ChallengeDie } = await import("../../modules/dice/dietype/ChallengeDie.js");
const { DifficultyDie } = await import("../../modules/dice/dietype/DifficultyDie.js");
const { ForceDie } = await import("../../modules/dice/dietype/ForceDie.js");
const { ProficiencyDie } = await import("../../modules/dice/dietype/ProficiencyDie.js");
const { SetbackDie } = await import("../../modules/dice/dietype/SetbackDie.js");

// Mirror what swffg-main.js registers at startup.
game.ffg.diceterms = [AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie];
CONFIG.Dice.terms = {
  a: AbilityDie, b: BoostDie, c: ChallengeDie, i: DifficultyDie,
  f: ForceDie, p: ProficiencyDie, s: SetbackDie,
};

const { RollFFG } = await import("../../modules/dice/roll.js");

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** A die of the given type showing exactly the listed faces. */
const dice = (cls, ...faces) => new cls({ number: faces.length, forcedFaces: faces });

/** Build and evaluate a roll over the given dice, joined by "+" as a real formula is. */
async function rollDice(...terms) {
  const roll = new RollFFG("");
  const joined = [];
  terms.forEach((term, index) => {
    if (index) joined.push(new StubOperatorTerm({ operator: "+" }));
    joined.push(term);
  });
  roll.terms = joined;
  await roll.evaluate();
  return roll;
}

// Face shorthands, read off the printed dice.
const ABILITY = { BLANK: 1, SUCCESS: 2, TWO_SUCCESS: 4, ADVANTAGE: 5, SUCCESS_ADVANTAGE: 7, TWO_ADVANTAGE: 8 };
const PROFICIENCY = { SUCCESS: 2, TWO_SUCCESS: 4, ADVANTAGE: 6, SUCCESS_ADVANTAGE: 7, TWO_ADVANTAGE: 10, TRIUMPH: 12 };
const DIFFICULTY = { BLANK: 1, FAILURE: 2, TWO_FAILURE: 3, THREAT: 4, TWO_THREAT: 7, FAILURE_THREAT: 8 };
const CHALLENGE = { FAILURE: 2, TWO_FAILURE: 4, THREAT: 6, FAILURE_THREAT: 8, TWO_THREAT: 10, DESPAIR: 12 };
const FORCE = { DARK: 1, TWO_DARK: 7, LIGHT: 8, TWO_LIGHT: 10 };
const BOOST = { SUCCESS: 3, SUCCESS_ADVANTAGE: 4, TWO_ADVANTAGE: 5, ADVANTAGE: 6 };
const SETBACK = { FAILURE: 3, THREAT: 5 };

/* -------------------------------------------------------------------------- */
/* Netting successes and failures                                             */
/* -------------------------------------------------------------------------- */

test("netting: successes and failures cancel one for one", async () => {
  // Three successes against one failure.
  const roll = await rollDice(dice(AbilityDie, ABILITY.TWO_SUCCESS, ABILITY.SUCCESS), dice(DifficultyDie, DIFFICULTY.FAILURE));
  assert.equal(roll.ffg.success, 2);
  assert.equal(roll.ffg.failure, 0);
});

test("netting: more failures than successes leaves a net failure", async () => {
  const roll = await rollDice(dice(AbilityDie, ABILITY.SUCCESS), dice(DifficultyDie, DIFFICULTY.TWO_FAILURE, DIFFICULTY.FAILURE));
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.failure, 2);
});

test("netting: equal successes and failures leave neither, and the check fails", async () => {
  const roll = await rollDice(dice(AbilityDie, ABILITY.TWO_SUCCESS), dice(DifficultyDie, DIFFICULTY.TWO_FAILURE));
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.failure, 0);
  assert.ok(roll.ffg.success < 1, "a check needs at least one net success to pass");
});

test("netting: a check passes only when at least one net success survives", async () => {
  const cases = [
    { successes: [ABILITY.SUCCESS], failures: [], passes: true },
    { successes: [ABILITY.SUCCESS], failures: [DIFFICULTY.FAILURE], passes: false },
    { successes: [ABILITY.TWO_SUCCESS], failures: [DIFFICULTY.FAILURE], passes: true },
    { successes: [ABILITY.TWO_SUCCESS], failures: [DIFFICULTY.TWO_FAILURE], passes: false },
    { successes: [], failures: [DIFFICULTY.FAILURE], passes: false },
    { successes: [ABILITY.BLANK], failures: [DIFFICULTY.BLANK], passes: false },
  ];
  for (const { successes, failures, passes } of cases) {
    const terms = [];
    if (successes.length) terms.push(dice(AbilityDie, ...successes));
    if (failures.length) terms.push(dice(DifficultyDie, ...failures));
    const roll = await rollDice(...terms);
    assert.equal(roll.ffg.success >= 1, passes, `${JSON.stringify({ successes, failures })}`);
  }
});

test("netting: advantages and threats cancel one for one", async () => {
  // Three advantages against two threats.
  const roll = await rollDice(dice(AbilityDie, ABILITY.TWO_ADVANTAGE, ABILITY.ADVANTAGE), dice(DifficultyDie, DIFFICULTY.TWO_THREAT));
  assert.equal(roll.ffg.advantage, 1);
  assert.equal(roll.ffg.threat, 0);
});

test("netting: more threats than advantages leaves net threat", async () => {
  const roll = await rollDice(dice(BoostDie, BOOST.ADVANTAGE), dice(SetbackDie, SETBACK.THREAT, SETBACK.THREAT));
  assert.equal(roll.ffg.advantage, 0);
  assert.equal(roll.ffg.threat, 1);
});

test("netting: advantage does not cancel failure, and success does not cancel threat", async () => {
  // Two advantages and one failure: a failed check that still earned advantage.
  const roll = await rollDice(dice(AbilityDie, ABILITY.TWO_ADVANTAGE), dice(DifficultyDie, DIFFICULTY.FAILURE));
  assert.equal(roll.ffg.advantage, 2);
  assert.equal(roll.ffg.failure, 1);
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.threat, 0);
});

test("netting: the two axes are resolved independently", async () => {
  // 1 success + 1 advantage vs 1 failure + 1 threat on one die each.
  const roll = await rollDice(
    dice(AbilityDie, ABILITY.SUCCESS_ADVANTAGE, ABILITY.TWO_SUCCESS),
    dice(DifficultyDie, DIFFICULTY.FAILURE_THREAT),
  );
  assert.equal(roll.ffg.success, 2);
  assert.equal(roll.ffg.failure, 0);
  assert.equal(roll.ffg.advantage, 0);
  assert.equal(roll.ffg.threat, 0);
});

/* -------------------------------------------------------------------------- */
/* Triumph and Despair                                                        */
/* -------------------------------------------------------------------------- */

test("triumph: counts as a success and is reported as a Triumph", async () => {
  const roll = await rollDice(dice(ProficiencyDie, PROFICIENCY.TRIUMPH));
  assert.equal(roll.ffg.triumph, 1);
  assert.equal(roll.ffg.success, 1);
});

test("triumph: the success it grants can be cancelled, the Triumph cannot", async () => {
  // A Triumph against one failure: the check fails, but the Triumph still lands.
  const roll = await rollDice(dice(ProficiencyDie, PROFICIENCY.TRIUMPH), dice(DifficultyDie, DIFFICULTY.FAILURE));
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.failure, 0);
  assert.equal(roll.ffg.triumph, 1, "the Triumph survives however the check turns out");
});

test("despair: counts as a failure and is reported as a Despair", async () => {
  const roll = await rollDice(dice(ChallengeDie, CHALLENGE.DESPAIR));
  assert.equal(roll.ffg.despair, 1);
  assert.equal(roll.ffg.failure, 1);
});

test("despair: the failure it brings can be cancelled, the Despair cannot", async () => {
  const roll = await rollDice(dice(AbilityDie, ABILITY.TWO_SUCCESS), dice(ChallengeDie, CHALLENGE.DESPAIR));
  assert.equal(roll.ffg.success, 1, "a successful check despite the Despair");
  assert.equal(roll.ffg.failure, 0);
  assert.equal(roll.ffg.despair, 1);
});

test("triumph and despair do not cancel each other", async () => {
  const roll = await rollDice(dice(ProficiencyDie, PROFICIENCY.TRIUMPH), dice(ChallengeDie, CHALLENGE.DESPAIR));
  assert.equal(roll.ffg.triumph, 1);
  assert.equal(roll.ffg.despair, 1);
  // The success from the Triumph and the failure from the Despair do cancel.
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.failure, 0);
});

test("triumph: several Triumphs all count", async () => {
  const roll = await rollDice(dice(ProficiencyDie, PROFICIENCY.TRIUMPH, PROFICIENCY.TRIUMPH));
  assert.equal(roll.ffg.triumph, 2);
  assert.equal(roll.ffg.success, 2);
});

/* -------------------------------------------------------------------------- */
/* Force pips                                                                 */
/* -------------------------------------------------------------------------- */

test("force: light and dark pips do not cancel each other", async () => {
  const roll = await rollDice(dice(ForceDie, FORCE.TWO_LIGHT, FORCE.DARK));
  assert.equal(roll.ffg.light, 2);
  assert.equal(roll.ffg.dark, 1);
});

test("force: pips are untouched by successes and failures in the same pool", async () => {
  const roll = await rollDice(
    dice(ForceDie, FORCE.LIGHT, FORCE.TWO_DARK),
    dice(AbilityDie, ABILITY.TWO_SUCCESS),
    dice(DifficultyDie, DIFFICULTY.FAILURE),
  );
  assert.equal(roll.ffg.light, 1);
  assert.equal(roll.ffg.dark, 2);
  assert.equal(roll.ffg.success, 1);
});

test("force: a pure Force roll produces no successes or failures", async () => {
  const roll = await rollDice(dice(ForceDie, FORCE.TWO_LIGHT, FORCE.TWO_DARK));
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.failure, 0);
  assert.equal(roll.ffg.advantage, 0);
  assert.equal(roll.ffg.threat, 0);
  assert.equal(roll.ffg.light, 2);
  assert.equal(roll.ffg.dark, 2);
});

/* -------------------------------------------------------------------------- */
/* Results added to the pool rather than rolled                               */
/* -------------------------------------------------------------------------- */

test("added results: a roll with nothing added starts clean", () => {
  const roll = new RollFFG("1da");
  assert.deepEqual(roll.addedResults, []);
  assert.deepEqual(roll.ffg, { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 });
});

test("added results: automatic symbols are counted and listed", () => {
  const roll = new RollFFG("1da", {}, { success: 2, advantage: 1, threat: 3, dark: 1 });
  assert.equal(roll.ffg.success, 2);
  assert.equal(roll.ffg.advantage, 1);
  assert.equal(roll.ffg.threat, 3);
  assert.equal(roll.ffg.dark, 1);
  assert.deepEqual(
    roll.addedResults.map((r) => [r.type, r.symbol, r.value, r.negative]),
    [["Success", "[SU]", 2, false], ["Advantage", "[AD]", 1, false], ["Threat", "[TH]", 3, false], ["Dark", "[DA]", 1, false]],
  );
});

test("added results: an added Triumph also adds a success", () => {
  const roll = new RollFFG("1dp", {}, { triumph: 1 });
  assert.equal(roll.ffg.triumph, 1);
  assert.equal(roll.ffg.success, 1);
});

test("added results: an added Despair also adds a failure", () => {
  const roll = new RollFFG("1dc", {}, { despair: 1 });
  assert.equal(roll.ffg.despair, 1);
  assert.equal(roll.ffg.failure, 1);
});

test("added results: a negative modifier is recorded as a negative of that symbol", () => {
  const roll = new RollFFG("1da", {}, { success: -1 });
  assert.equal(roll.ffg.success, -1);
  assert.deepEqual(roll.addedResults, [{ type: "Success", symbol: "[SU]", value: 1, negative: true }]);
});

test("added results: an added failure cancels a rolled success", async () => {
  const roll = new RollFFG("", {}, { failure: 1 });
  roll.terms = [dice(AbilityDie, ABILITY.TWO_SUCCESS)];
  await roll.evaluate();
  assert.equal(roll.ffg.success, 1);
  assert.equal(roll.ffg.failure, 0);
});

test("added results: an added success is cancelled by a rolled failure", async () => {
  const roll = new RollFFG("", {}, { success: 1 });
  roll.terms = [dice(DifficultyDie, DIFFICULTY.TWO_FAILURE)];
  await roll.evaluate();
  assert.equal(roll.ffg.success, 0);
  assert.equal(roll.ffg.failure, 1);
});

test("added results: symbols cancel even when the pool has no dice to roll", async () => {
  // A pool can be made entirely of automatic results (an empty dice expression).
  // Cancellation is a rule about the result, not about the dice, so it still applies.
  const roll = new RollFFG("", {}, { success: 2, failure: 1, advantage: 1, threat: 3 });
  await roll.evaluate();
  assert.equal(roll.ffg.success, 1);
  assert.equal(roll.ffg.failure, 0);
  assert.equal(roll.ffg.advantage, 0);
  assert.equal(roll.ffg.threat, 2);
});

test("added results: flavour text is carried on the roll", () => {
  const roll = new RollFFG("1da", {}, {}, "Called shot");
  assert.equal(roll.flavorText, "Called shot");
});

/* -------------------------------------------------------------------------- */
/* Shorthand parsing                                                          */
/* -------------------------------------------------------------------------- */

test("shorthand: each letter becomes the die it names", () => {
  const roll = new RollFFG("");
  const terms = roll.parseShortHand([new StubStringTerm({ term: "pacibfs" })]);
  const dieTerms = terms.filter((t) => !(t instanceof StubOperatorTerm));
  assert.deepEqual(
    dieTerms.map((t) => t.constructor),
    [ProficiencyDie, AbilityDie, ChallengeDie, DifficultyDie, BoostDie, ForceDie, SetbackDie],
  );
});

test("shorthand: 'd' is read as a difficulty die", () => {
  const roll = new RollFFG("");
  const terms = roll.parseShortHand([new StubStringTerm({ term: "dd" })]);
  const dieTerms = terms.filter((t) => !(t instanceof StubOperatorTerm));
  assert.equal(dieTerms.length, 2);
  assert.ok(dieTerms.every((t) => t instanceof DifficultyDie));
});

test("shorthand: each letter becomes a single die, joined by addition", () => {
  const roll = new RollFFG("");
  const terms = roll.parseShortHand([new StubStringTerm({ term: "aa" })]);
  assert.equal(terms.length, 3);
  assert.ok(terms[0] instanceof AbilityDie);
  assert.ok(terms[1] instanceof StubOperatorTerm);
  assert.equal(terms[1].operator, "+");
  assert.ok(terms[2] instanceof AbilityDie);
  assert.equal(terms[0].number, 1);
});

test("shorthand: an unknown letter is rejected rather than silently dropped", () => {
  const roll = new RollFFG("");
  assert.throws(() => roll.parseShortHand([new StubStringTerm({ term: "az" })]), /Unknown die type/);
});

test("shorthand: a term that already carries a number is left alone", () => {
  const roll = new RollFFG("");
  const term = new StubStringTerm({ term: "2a" });
  assert.deepEqual(roll.parseShortHand([term]), [term]);
});

test("shorthand: dice terms pass through untouched", () => {
  const roll = new RollFFG("");
  const die = new AbilityDie({ number: 2 });
  assert.deepEqual(roll.parseShortHand([die]), [die]);
});

/* -------------------------------------------------------------------------- */
/* Serialisation                                                              */
/* -------------------------------------------------------------------------- */

test("round trip: an unevaluated roll keeps its added results and flavour", () => {
  const original = new RollFFG("1dp+1di", { some: "data" }, { success: 1, triumph: 1 }, "Opportune strike");
  const restored = RollFFG.fromData(original.toJSON());

  assert.deepEqual(restored.ffg, original.ffg);
  assert.deepEqual(restored.addedResults, original.addedResults);
  assert.equal(restored.flavorText, "Opportune strike");
  assert.equal(restored.hasFFG, false);
  assert.equal(restored.hasStandard, false);
  assert.deepEqual(restored.data, { some: "data" });
});

test("round trip: an evaluated roll keeps its netted result", async () => {
  const original = new RollFFG("");
  original.terms = [dice(ProficiencyDie, PROFICIENCY.TRIUMPH, PROFICIENCY.TWO_SUCCESS)];
  await original.evaluate();

  const restored = RollFFG.fromData(original.toJSON());
  assert.equal(restored.hasFFG, true);
  assert.deepEqual(restored.ffg, original.ffg);
  assert.equal(restored.ffg.triumph, 1);
  assert.equal(restored.ffg.success, 3);
});

test("round trip: survives JSON serialisation to and from a string", async () => {
  const original = new RollFFG("1dp", {}, { advantage: 2 }, "From chat");
  original.terms = [dice(ProficiencyDie, PROFICIENCY.SUCCESS_ADVANTAGE)];
  await original.evaluate();

  const restored = RollFFG.fromData(JSON.parse(JSON.stringify(original.toJSON())));
  assert.deepEqual(restored.ffg, original.ffg);
  assert.deepEqual(restored.addedResults, original.addedResults);
  assert.equal(restored.flavorText, "From chat");
});
