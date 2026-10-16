import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryGlobals } from "./harness/foundry.mjs";

/**
 * Rules under test: the seven FFG narrative dice and their printed faces.
 *
 * The real dice (Edge of the Empire / Age of Rebellion / Force and Destiny CRB,
 * "The Dice"):
 *
 *   Boost       d6  blue    2 blank, 1 success, 1 success+advantage,
 *                           1 advantage, 1 double advantage
 *   Setback     d6  black   2 blank, 2 failure, 2 threat
 *   Ability     d8  green   1 blank, 2 success, 1 double success,
 *                           2 advantage, 1 success+advantage, 1 double advantage
 *   Difficulty  d8  purple  1 blank, 1 failure, 1 double failure,
 *                           3 threat, 1 double threat, 1 failure+threat
 *   Proficiency d12 yellow  1 blank, 2 success, 2 double success, 1 advantage,
 *                           3 success+advantage, 2 double advantage, 1 Triumph
 *   Challenge   d12 red     1 blank, 2 failure, 2 double failure, 2 threat,
 *                           2 failure+threat, 2 double threat, 1 Despair
 *   Force       d12 white   6 single dark, 1 double dark,
 *                           2 single light, 3 double light
 *
 * A Triumph also counts as a success; a Despair also counts as a failure.
 */

/* -------------------------------------------------------------------------- */
/* Local stand-ins the shared harness does not provide                        */
/*                                                                            */
/* foundry.dice.terms in the harness is a Proxy that mints a brand new class   */
/* on every property read, so `x instanceof foundry.dice.terms.DiceTerm` is    */
/* never true and the die classes cannot inherit real rolling behaviour. These */
/* replacements are installed locally (the harness is shared, so it is not     */
/* modified) and mimic the parts of DiceTerm the die classes rely on.          */
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
    // Faces this die will show, in order; falls back to face 1.
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

globalThis.foundry.dice.terms = {
  DiceTerm: StubDiceTerm,
  OperatorTerm: class { constructor({ operator = "+" } = {}) { this.operator = operator; } },
  StringTerm: class { constructor({ term = "" } = {}) { this.term = term; } },
  NumericTerm: class { constructor({ number = 0 } = {}) { this.number = number; } },
};

const { configureDice } = await import("../../modules/config/ffg-dice.js");
configureDice();

const { AbilityDie } = await import("../../modules/dice/dietype/AbilityDie.js");
const { BoostDie } = await import("../../modules/dice/dietype/BoostDie.js");
const { ChallengeDie } = await import("../../modules/dice/dietype/ChallengeDie.js");
const { DifficultyDie } = await import("../../modules/dice/dietype/DifficultyDie.js");
const { ForceDie } = await import("../../modules/dice/dietype/ForceDie.js");
const { ProficiencyDie } = await import("../../modules/dice/dietype/ProficiencyDie.js");
const { SetbackDie } = await import("../../modules/dice/dietype/SetbackDie.js");

const DICE = [
  { name: "Ability", cls: AbilityDie, denomination: "a", faces: 8, table: () => CONFIG.FFG.ABILITY_RESULTS },
  { name: "Boost", cls: BoostDie, denomination: "b", faces: 6, table: () => CONFIG.FFG.BOOST_RESULTS },
  { name: "Challenge", cls: ChallengeDie, denomination: "c", faces: 12, table: () => CONFIG.FFG.CHALLENGE_RESULTS },
  { name: "Difficulty", cls: DifficultyDie, denomination: "i", faces: 8, table: () => CONFIG.FFG.DIFFICULTY_RESULTS },
  { name: "Force", cls: ForceDie, denomination: "f", faces: 12, table: () => CONFIG.FFG.FORCE_RESULTS },
  { name: "Proficiency", cls: ProficiencyDie, denomination: "p", faces: 12, table: () => CONFIG.FFG.PROFICIENCY_RESULTS },
  { name: "Setback", cls: SetbackDie, denomination: "s", faces: 6, table: () => CONFIG.FFG.SETBACK_RESULTS },
];

const SYMBOLS = ["success", "failure", "advantage", "threat", "triumph", "despair", "light", "dark"];

/** Describe one face as a sorted "symbol xN" signature, e.g. "advantage x1,success x1". */
const signature = (face) =>
  SYMBOLS.filter((s) => face[s] > 0)
    .map((s) => `${s} x${face[s]}`)
    .join(",") || "blank";

/** Count how many faces of a die show each signature. */
function faceCounts(table) {
  const counts = {};
  for (const face of Object.values(table)) {
    const key = signature(face);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Total of one symbol across every face of a die. */
const symbolTotal = (table, symbol) =>
  Object.values(table).reduce((sum, face) => sum + face[symbol], 0);

/* -------------------------------------------------------------------------- */
/* Shape of every die                                                         */
/* -------------------------------------------------------------------------- */

for (const { name, cls, denomination, faces, table } of DICE) {
  test(`${name}: is a d${faces} with denomination "${denomination}"`, () => {
    assert.equal(cls.DENOMINATION, denomination);
    assert.equal(new cls({ number: 1 }).faces, faces);
  });

  test(`${name}: the result table has one entry per face, numbered 1..${faces}`, () => {
    const keys = Object.keys(table()).map(Number).sort((a, b) => a - b);
    assert.deepEqual(keys, Array.from({ length: faces }, (_, i) => i + 1));
  });

  test(`${name}: every face declares all eight symbols as numbers`, () => {
    for (const [key, face] of Object.entries(table())) {
      for (const symbol of SYMBOLS) {
        assert.equal(typeof face[symbol], "number", `${name} face ${key} is missing ${symbol}`);
        assert.ok(face[symbol] >= 0, `${name} face ${key} has a negative ${symbol}`);
      }
      assert.ok(face.image, `${name} face ${key} has no image`);
    }
  });

  test(`${name}: renders its own formula`, () => {
    assert.equal(new cls({ number: 3 }).formula, `3${denomination}`);
    assert.equal(new cls({ number: 1, modifiers: ["kh", "r1"] }).formula, `1${denomination}khr1`);
  });

  test(`${name}: labels a rolled face with that face's image and name`, () => {
    const die = new cls({ number: 1 });
    const label = die.getResultLabel({ result: 1 });
    assert.match(label, /^<img src='/);
    assert.ok(label.includes(table()[1].image), "the label shows the face's own image");
  });
}

test("denominations: no two dice share a letter", () => {
  const letters = DICE.map((d) => d.denomination);
  assert.equal(new Set(letters).size, letters.length);
});

test("denominations: difficulty uses 'i' so that 'd' stays free for the dice separator", () => {
  assert.equal(DifficultyDie.DENOMINATION, "i");
  assert.notEqual(DifficultyDie.DENOMINATION, "d");
});

/* -------------------------------------------------------------------------- */
/* Printed faces: positive dice                                               */
/* -------------------------------------------------------------------------- */

test("Boost die: 2 blank, 1 success, 1 success+advantage, 1 advantage, 1 double advantage", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.BOOST_RESULTS), {
    "blank": 2,
    "success x1": 1,
    "success x1,advantage x1": 1,
    "advantage x1": 1,
    "advantage x2": 1,
  });
});

test("Ability die: 1 blank, 2 success, 1 double success, 2 advantage, 1 success+advantage, 1 double advantage", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.ABILITY_RESULTS), {
    "blank": 1,
    "success x1": 2,
    "success x2": 1,
    "advantage x1": 2,
    "success x1,advantage x1": 1,
    "advantage x2": 1,
  });
});

test("Proficiency die: 1 blank, 2 success, 2 double success, 1 advantage, 3 success+advantage, 2 double advantage, 1 Triumph", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.PROFICIENCY_RESULTS), {
    "blank": 1,
    "success x1": 2,
    "success x2": 2,
    "advantage x1": 1,
    "success x1,advantage x1": 3,
    "advantage x2": 2,
    "success x1,triumph x1": 1,
  });
});

test("positive dice never show failures or threats", () => {
  for (const table of [CONFIG.FFG.BOOST_RESULTS, CONFIG.FFG.ABILITY_RESULTS, CONFIG.FFG.PROFICIENCY_RESULTS]) {
    assert.equal(symbolTotal(table, "failure"), 0);
    assert.equal(symbolTotal(table, "threat"), 0);
    assert.equal(symbolTotal(table, "despair"), 0);
  }
});

test("only the Proficiency die can roll a Triumph, and exactly one face does", () => {
  assert.equal(symbolTotal(CONFIG.FFG.PROFICIENCY_RESULTS, "triumph"), 1);
  for (const { name, table } of DICE.filter((d) => d.cls !== ProficiencyDie)) {
    assert.equal(symbolTotal(table(), "triumph"), 0, `${name} must not roll a Triumph`);
  }
});

test("the Triumph face also counts as a success", () => {
  const triumphFace = Object.values(CONFIG.FFG.PROFICIENCY_RESULTS).find((f) => f.triumph > 0);
  assert.equal(triumphFace.success, 1, "a Triumph counts as a success as well as a Triumph");
  assert.equal(triumphFace.advantage, 0, "a Triumph is not an advantage");
});

/* -------------------------------------------------------------------------- */
/* Printed faces: negative dice                                               */
/* -------------------------------------------------------------------------- */

test("Setback die: 2 blank, 2 failure, 2 threat", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.SETBACK_RESULTS), {
    "blank": 2,
    "failure x1": 2,
    "threat x1": 2,
  });
});

test("Difficulty die: 1 blank, 1 failure, 1 double failure, 3 threat, 1 double threat, 1 failure+threat", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.DIFFICULTY_RESULTS), {
    "blank": 1,
    "failure x1": 1,
    "failure x2": 1,
    "threat x1": 3,
    "threat x2": 1,
    "failure x1,threat x1": 1,
  });
});

test("Challenge die: 1 blank, 2 failure, 2 double failure, 2 threat, 2 failure+threat, 2 double threat, 1 Despair", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.CHALLENGE_RESULTS), {
    "blank": 1,
    "failure x1": 2,
    "failure x2": 2,
    "threat x1": 2,
    "failure x1,threat x1": 2,
    "threat x2": 2,
    "failure x1,despair x1": 1,
  });
});

test("negative dice never show successes or advantages", () => {
  for (const table of [CONFIG.FFG.SETBACK_RESULTS, CONFIG.FFG.DIFFICULTY_RESULTS, CONFIG.FFG.CHALLENGE_RESULTS]) {
    assert.equal(symbolTotal(table, "success"), 0);
    assert.equal(symbolTotal(table, "advantage"), 0);
    assert.equal(symbolTotal(table, "triumph"), 0);
  }
});

test("only the Challenge die can roll a Despair, and exactly one face does", () => {
  assert.equal(symbolTotal(CONFIG.FFG.CHALLENGE_RESULTS, "despair"), 1);
  for (const { name, table } of DICE.filter((d) => d.cls !== ChallengeDie)) {
    assert.equal(symbolTotal(table(), "despair"), 0, `${name} must not roll a Despair`);
  }
});

test("the Despair face also counts as a failure", () => {
  const despairFace = Object.values(CONFIG.FFG.CHALLENGE_RESULTS).find((f) => f.despair > 0);
  assert.equal(despairFace.failure, 1, "a Despair counts as a failure as well as a Despair");
  assert.equal(despairFace.threat, 0, "a Despair is not a threat");
});

/* -------------------------------------------------------------------------- */
/* Printed faces: the Force die                                               */
/* -------------------------------------------------------------------------- */

test("Force die: 6 single dark, 1 double dark, 2 single light, 3 double light", () => {
  assert.deepEqual(faceCounts(CONFIG.FFG.FORCE_RESULTS), {
    "dark x1": 6,
    "dark x2": 1,
    "light x1": 2,
    "light x2": 3,
  });
});

test("Force die: eight light pips and eight dark pips, and no blank face", () => {
  assert.equal(symbolTotal(CONFIG.FFG.FORCE_RESULTS, "light"), 8);
  assert.equal(symbolTotal(CONFIG.FFG.FORCE_RESULTS, "dark"), 8);
  for (const [key, face] of Object.entries(CONFIG.FFG.FORCE_RESULTS)) {
    assert.ok(face.light + face.dark > 0, `Force face ${key} must show a pip`);
  }
});

test("Force die: no face mixes light and dark pips", () => {
  for (const [key, face] of Object.entries(CONFIG.FFG.FORCE_RESULTS)) {
    assert.ok(face.light === 0 || face.dark === 0, `Force face ${key} mixes light and dark`);
  }
});

test("Force die: contributes no successes, failures, advantages or threats", () => {
  for (const symbol of ["success", "failure", "advantage", "threat", "triumph", "despair"]) {
    assert.equal(symbolTotal(CONFIG.FFG.FORCE_RESULTS, symbol), 0, `Force dice must not generate ${symbol}`);
  }
});

test("light and dark pips appear on the Force die alone", () => {
  for (const { name, table } of DICE.filter((d) => d.cls !== ForceDie)) {
    assert.equal(symbolTotal(table(), "light"), 0, `${name} must not generate light pips`);
    assert.equal(symbolTotal(table(), "dark"), 0, `${name} must not generate dark pips`);
  }
});

/* -------------------------------------------------------------------------- */
/* Evaluating a die totals the symbols on the faces it showed                 */
/* -------------------------------------------------------------------------- */

test("evaluate: a die totals the symbols from each face it rolled", async () => {
  // Three ability dice showing double success, success+advantage and double advantage.
  const die = new AbilityDie({ number: 3, forcedFaces: [4, 7, 8] });
  await die.evaluate();
  assert.equal(die.ffg.success, 3);
  assert.equal(die.ffg.advantage, 3);
  assert.equal(die.ffg.failure, 0);
  assert.equal(die.ffg.threat, 0);
});

test("evaluate: a Triumph face reports both a success and a Triumph", async () => {
  const die = new ProficiencyDie({ number: 1, forcedFaces: [12] });
  await die.evaluate();
  assert.equal(die.ffg.triumph, 1);
  assert.equal(die.ffg.success, 1);
});

test("evaluate: a Despair face reports both a failure and a Despair", async () => {
  const die = new ChallengeDie({ number: 1, forcedFaces: [12] });
  await die.evaluate();
  assert.equal(die.ffg.despair, 1);
  assert.equal(die.ffg.failure, 1);
});

test("evaluate: a Force die reports pips and nothing else", async () => {
  const die = new ForceDie({ number: 2, forcedFaces: [10, 1] });
  await die.evaluate();
  assert.equal(die.ffg.light, 2);
  assert.equal(die.ffg.dark, 1);
  assert.equal(die.ffg.success, 0);
  assert.equal(die.ffg.failure, 0);
});

test("evaluate: a die cannot be rolled twice", async () => {
  const die = new BoostDie({ number: 1, forcedFaces: [3] });
  await die.evaluate();
  await assert.rejects(() => die.evaluate(), /already been evaluated/);
});
