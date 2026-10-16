import test from "node:test";
import assert from "node:assert/strict";

// DicePoolFFG#renderDiceExpression consults a world setting. Nothing else in the
// rules module touches Foundry, so a single stub is enough to run these in plain Node.
globalThis.game = {
  settings: {
    get: (_namespace, key) => (key === "ApplyRemoveSetbackMods" ? false : undefined),
  },
};

const {
  buildInitiativePool,
  encodeInitiative,
  decodeInitiative,
  sortInit,
} = await import("../../modules/combat/initiative-rules.js");

/* -------------------------------------------------------------------------- */
/* Pool construction                                                          */
/*                                                                            */
/* An Initiative check is an ordinary skill check: ability dice equal to the   */
/* greater of characteristic and skill rank, upgraded a number of times equal  */
/* to the lesser of the two.                                                   */
/* -------------------------------------------------------------------------- */

test("pool: characteristic higher than rank", () => {
  // Willpower 3, Vigilance 2 -> three dice, two of them upgraded
  const pool = buildInitiativePool(3, 2);
  assert.equal(pool.ability, 1);
  assert.equal(pool.proficiency, 2);
});

test("pool: rank higher than characteristic", () => {
  // Willpower 2, Vigilance 4 -> four dice, two of them upgraded.
  // The pool must not shrink just because the skill outstrips the characteristic.
  const pool = buildInitiativePool(2, 4);
  assert.equal(pool.ability, 2);
  assert.equal(pool.proficiency, 2);
});

test("pool: characteristic equals rank", () => {
  const pool = buildInitiativePool(2, 2);
  assert.equal(pool.ability, 0);
  assert.equal(pool.proficiency, 2);
});

test("pool: untrained skill is all ability dice", () => {
  const pool = buildInitiativePool(4, 0);
  assert.equal(pool.ability, 4);
  assert.equal(pool.proficiency, 0);
});

test("pool: ranks with no characteristic still roll", () => {
  const pool = buildInitiativePool(0, 3);
  assert.equal(pool.ability, 3);
  assert.equal(pool.proficiency, 0);
});

test("pool: total dice always equals the greater of characteristic and rank", () => {
  for (let characteristic = 0; characteristic <= 6; characteristic++) {
    for (let rank = 0; rank <= 6; rank++) {
      const pool = buildInitiativePool(characteristic, rank);
      assert.equal(
        pool.ability + pool.proficiency,
        Math.max(characteristic, rank),
        `characteristic ${characteristic}, rank ${rank}`,
      );
      assert.equal(
        pool.proficiency,
        Math.min(characteristic, rank),
        `characteristic ${characteristic}, rank ${rank} upgrades`,
      );
    }
  }
});

test("pool: boost, setback and force dice are carried through", () => {
  const pool = buildInitiativePool(3, 1, { boost: 2, setback: 1, force: 1 });
  assert.equal(pool.boost, 2);
  assert.equal(pool.setback, 1);
  assert.equal(pool.force, 1);
});

test("pool: renders a dice expression the roller understands", () => {
  const expression = buildInitiativePool(3, 2).renderDiceExpression();
  assert.match(expression, /2dp/, "two proficiency dice");
  assert.match(expression, /1da/, "one ability die");
});

/* -------------------------------------------------------------------------- */
/* Ranking                                                                    */
/*                                                                            */
/* Slots rank by successes; advantages break ties.                            */
/* -------------------------------------------------------------------------- */

test("ranking: more successes always wins, however many advantages", () => {
  const better = encodeInitiative(3, 0);
  const worse = encodeInitiative(2, 99);
  assert.equal(sortInit(worse, better), -1);
  assert.equal(sortInit(better, worse), 1);
});

test("ranking: equal successes are broken by advantages", () => {
  const better = encodeInitiative(3, 2);
  const worse = encodeInitiative(3, 1);
  assert.equal(sortInit(worse, better), -1);
  assert.equal(sortInit(better, worse), 1);
});

test("ranking: identical results tie", () => {
  assert.equal(sortInit(encodeInitiative(2, 1), encodeInitiative(2, 1)), 0);
});

test("ranking: combatants who have not rolled sort below everyone", () => {
  assert.equal(sortInit(null, encodeInitiative(0, 0)), -1);
  assert.equal(sortInit(encodeInitiative(0, 0), null), 1);
});

test("ranking: sorting then taking from the end yields descending order", () => {
  // This is how prepareDerivedData consumes the list: sort ascending, then pop.
  const rolled = [
    encodeInitiative(1, 5),
    encodeInitiative(3, 0),
    encodeInitiative(3, 2),
    encodeInitiative(2, 9),
  ];
  rolled.sort(sortInit);

  const order = [];
  while (rolled.length) order.push(decodeInitiative(rolled.pop()));

  assert.deepEqual(order, [
    { successes: 3, advantages: 2 },
    { successes: 3, advantages: 0 },
    { successes: 2, advantages: 9 },
    { successes: 1, advantages: 5 },
  ]);
});

/* -------------------------------------------------------------------------- */
/* Encoding                                                                   */
/* -------------------------------------------------------------------------- */

test("encoding: round-trips a result", () => {
  assert.deepEqual(decodeInitiative(encodeInitiative(3, 2)), { successes: 3, advantages: 2 });
  assert.deepEqual(decodeInitiative(encodeInitiative(0, 0)), { successes: 0, advantages: 0 });
});

test("encoding: survives ten or more advantages", () => {
  // A big pool can beat nine advantages; the display must not misread them.
  assert.deepEqual(decodeInitiative(encodeInitiative(3, 12)), { successes: 3, advantages: 12 });
  assert.deepEqual(decodeInitiative(encodeInitiative(1, 10)), { successes: 1, advantages: 10 });
});

test("encoding: advantages never outweigh a success", () => {
  for (let advantages = 0; advantages <= 99; advantages++) {
    assert.ok(
      encodeInitiative(2, advantages) < encodeInitiative(3, 0),
      `2 successes and ${advantages} advantages must rank below 3 successes`,
    );
  }
});
