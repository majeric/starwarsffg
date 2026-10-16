import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

installFoundryGlobals();

const { default: EffectHelpers } = await import("../../modules/helpers/effects.js");

/**
 * Minimal stand-ins for an ActiveEffect as the two Foundry generations present it.
 * Only the fields transformEffects actually reads are modelled; the real documents
 * cannot be structuredClone()d, which is why the helper copies what it needs by hand.
 */
function v13Effect({ changes = [], duration = {}, ...rest } = {}) {
  return {
    id: "ae13",
    name: "Superior",
    parent: { name: "Heavy Clothing" },
    active: true,
    duration,
    changes,
    ...rest,
  };
}

function v14Effect({ changes = [], duration = {}, start, ...rest } = {}) {
  return {
    id: "ae14",
    name: "Superior",
    parent: { name: "Heavy Clothing" },
    active: true,
    duration,
    start,
    system: { changes },
    ...rest,
  };
}

const transform = (effect) => EffectHelpers.transformEffects(effect, 0, [effect]);

/* -------------------------------------------------------------------------- */
/* Where the changes come from                                                */
/*                                                                            */
/* v14 moved ActiveEffect#changes to #system.changes. The sheet has to render  */
/* the same rows whichever generation it is handed.                           */
/* -------------------------------------------------------------------------- */

test("v13: reads the changes off the effect itself", () => {
  const result = transform(
    v13Effect({ changes: [{ key: "system.stats.soak.value", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 }] }),
  );

  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].value, 2);
});

test("v14: reads the changes out of system.changes", () => {
  const result = transform(
    v14Effect({ changes: [{ key: "system.stats.soak.value", type: "add", value: 2 }] }),
  );

  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].value, 2);
});

test("an effect with no changes renders no change rows", () => {
  assert.deepEqual(transform(v13Effect()).changes, []);
  assert.deepEqual(transform(v14Effect()).changes, []);
});

test("an effect that carries neither changes list is tolerated", () => {
  const bare = { id: "x", name: "Bare", parent: { name: "Nothing" }, active: true };
  assert.deepEqual(transform(bare).changes, []);
});

test("the source effect is left untouched", () => {
  // The sheet renders a view of the effect; rewriting the document's own change
  // entries would corrupt the stored effect.
  const source = v13Effect({
    changes: [{ key: "system.stats.soak.value", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 }],
  });
  transform(source);

  assert.equal(source.changes[0].key, "system.stats.soak.value");
  assert.equal(source.changes[0].mode, CONST.ACTIVE_EFFECT_MODES.ADD);
});

/* -------------------------------------------------------------------------- */
/* Mode                                                                       */
/*                                                                            */
/* The sheet prints the mode next to the value, so it has to be a name a       */
/* reader understands and never the raw enum number.                          */
/* -------------------------------------------------------------------------- */

test("v13: a numeric mode is rendered as its name", () => {
  const result = transform(
    v13Effect({ changes: [{ key: "a", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }] }),
  );

  assert.equal(typeof result.changes[0].mode, "string");
  assert.match(result.changes[0].mode, /^add$/i);
});

test("v13: every mode in the enum has a name", () => {
  for (const [name, value] of Object.entries(CONST.ACTIVE_EFFECT_MODES)) {
    const result = transform(v13Effect({ changes: [{ key: "a", mode: value, value: 1 }] }));
    assert.equal(typeof result.changes[0].mode, "string", `mode ${name}`);
    assert.match(result.changes[0].mode, new RegExp(`^${name}$`, "i"), `mode ${value}`);
  }
});

test("v14: the string change type is used as the mode", () => {
  const result = transform(v14Effect({ changes: [{ key: "a", type: "override", value: 1 }] }));
  assert.equal(result.changes[0].mode, "override");
});

test("v14: a change type is preferred over a leftover numeric mode", () => {
  const result = transform(
    v14Effect({ changes: [{ key: "a", type: "upgrade", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }] }),
  );
  assert.equal(result.changes[0].mode, "upgrade");
});

/* -------------------------------------------------------------------------- */
/* Keys                                                                       */
/*                                                                            */
/* Every change an item makes writes into the actor's system data, so the      */
/* "system." prefix is noise in the sheet - but only as a prefix.              */
/* -------------------------------------------------------------------------- */

test("a leading system. is stripped from the key", () => {
  const result = transform(
    v13Effect({ changes: [{ key: "system.skills.Astrogation.rank", mode: 2, value: 1 }] }),
  );
  assert.equal(result.changes[0].key, "skills.Astrogation.rank");
});

test("a key without the prefix is left as it is", () => {
  const result = transform(v13Effect({ changes: [{ key: "name", mode: 5, value: "Bob" }] }));
  assert.equal(result.changes[0].key, "name");
});

test("'system.' is only stripped from the start of the key", () => {
  const result = transform(
    v13Effect({ changes: [{ key: "flags.starwarsffg.system.value", mode: 2, value: 1 }] }),
  );
  assert.equal(result.changes[0].key, "flags.starwarsffg.system.value");
});

test("every change in the effect is converted, not just the first", () => {
  const result = transform(
    v13Effect({
      changes: [
        { key: "system.stats.defence.melee", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },
        { key: "system.stats.defence.ranged", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 },
      ],
    }),
  );

  assert.deepEqual(
    result.changes.map((c) => c.key),
    ["stats.defence.melee", "stats.defence.ranged"],
  );
  assert.ok(result.changes.every((c) => typeof c.mode === "string"));
});

/* -------------------------------------------------------------------------- */
/* Duration                                                                   */
/*                                                                            */
/* The sheet shows a phrase, not a data structure. Combat-scoped effects win   */
/* over any other measurement, then seconds, rounds and turns; anything with   */
/* no duration at all is permanent.                                           */
/* -------------------------------------------------------------------------- */

test("v13: an effect lasting the current combat says so", () => {
  const result = transform(v13Effect({ duration: { combat: "combat1" } }));
  assert.equal(result.duration, "SWFFG.Effect.Duration.CurrentCombat");
});

test("v14: the combat is read off the effect's start", () => {
  const result = transform(v14Effect({ duration: {}, start: { combat: "combat1" } }));
  assert.equal(result.duration, "SWFFG.Effect.Duration.CurrentCombat");
});

test("seconds, rounds and turns are rendered with their unit", () => {
  assert.equal(
    transform(v13Effect({ duration: { seconds: 60 } })).duration,
    "60 SWFFG.Effect.Duration.Seconds",
  );
  assert.equal(
    transform(v13Effect({ duration: { rounds: 3 } })).duration,
    "3 SWFFG.Effect.Duration.Rounds",
  );
  assert.equal(
    transform(v13Effect({ duration: { turns: 2 } })).duration,
    "2 SWFFG.Effect.Duration.Turns",
  );
});

test("an effect with no duration is permanent", () => {
  assert.equal(transform(v13Effect()).duration, "SWFFG.Effect.Duration.Permanent");
  assert.equal(transform(v14Effect()).duration, "SWFFG.Effect.Duration.Permanent");
  assert.equal(
    transform({ id: "x", name: "n", parent: { name: "p" }, active: true }).duration,
    "SWFFG.Effect.Duration.Permanent",
  );
});

test("a combat duration outranks a measured one", () => {
  const result = transform(v13Effect({ duration: { combat: "combat1", rounds: 3, seconds: 60 } }));
  assert.equal(result.duration, "SWFFG.Effect.Duration.CurrentCombat");
});

/* -------------------------------------------------------------------------- */
/* What the sheet needs alongside the changes                                 */
/* -------------------------------------------------------------------------- */

test("the row keeps the effect id, the name of its source, and whether it applies", () => {
  const result = transform(v13Effect({ active: false }));

  assert.equal(result.id, "ae13");
  assert.equal(result.name, "Superior");
  assert.equal(result.parentName, "Heavy Clothing");
  assert.equal(result.active, false);
});

test("works as a bare Array#map callback, which is how the sheet calls it", () => {
  const effects = [
    v13Effect({ changes: [{ key: "system.stats.soak.value", mode: 2, value: 1 }] }),
    v14Effect({ changes: [{ key: "system.stats.soak.value", type: "add", value: 1 }] }),
  ];

  const rows = effects.map(EffectHelpers.transformEffects);

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.changes[0].key),
    ["stats.soak.value", "stats.soak.value"],
  );
});
