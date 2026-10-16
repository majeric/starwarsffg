import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

const harness = installFoundryGlobals();

globalThis.ChatMessage = class {
  static getWhisperRecipients() {
    return [];
  }
  static async create() {}
};

const { default: ActorHelpers } = await import("../../modules/helpers/actor-helpers.js");

/**
 * ActorHelpers.updateActor is a sheet submit handler: it runs with `this` bound to
 * the sheet, reads the actor through `this.object`, and hands the finished payload
 * to Actor#update. Only those three things are modelled here, and the payload the
 * actor would have been updated with is captured for inspection.
 */
function makeSheet({ type, system }) {
  const updates = [];
  const flags = { starwarsffg: {} };
  const object = {
    id: "actor1",
    name: "Dex Nova",
    type,
    system,
    flags,
    getFlag(scope, key) {
      return this.flags[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
      return this;
    },
    async update(data) {
      updates.push(data);
      return this;
    },
  };
  return { actor: { ...object, items: [] }, object, updates };
}

const submit = (sheet, formData) => ActorHelpers.updateActor.call(sheet, null, formData);
const xpLog = (sheet) => sheet.object.getFlag("starwarsffg", "xpLog") ?? [];

test.beforeEach(() => {
  harness.reset();
  harness.settings.set("starwarsffg.notifyOnXpSpend", false);
});

/* -------------------------------------------------------------------------- */
/* Editing XP on the sheet                                                    */
/*                                                                            */
/* The XP log is the only record of where a character's experience went, so    */
/* every change made by hand has to land in it. The one thing that must NOT be */
/* logged is a save that never mentioned experience at all - most sheet saves. */
/* -------------------------------------------------------------------------- */

function characterSheet({ available, total }) {
  return makeSheet({
    type: "character",
    system: { experience: { available, total }, attributes: {}, stats: {} },
  });
}

test("raising available XP by hand is recorded in the log", async () => {
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.experience.available": 25 });

  assert.equal(xpLog(sheet).length, 1);
  assert.equal(xpLog(sheet)[0].action, "adjusted");
  assert.equal(xpLog(sheet)[0].xp.cost, 15);
  assert.equal(xpLog(sheet)[0].xp.available, 25);
});

test("lowering available XP by hand is recorded in the log", async () => {
  const sheet = characterSheet({ available: 25, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.experience.available": 10 });

  assert.equal(xpLog(sheet).length, 1);
  assert.equal(xpLog(sheet)[0].xp.cost, -15);
});

test("a save that does not touch experience is not logged", async () => {
  // Most sheet saves have nothing to do with XP; they must not litter the ledger.
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.stats.wounds.value": 3 });

  assert.deepEqual(xpLog(sheet), []);
});

test("a save that leaves experience where it was is not logged", async () => {
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.experience.available": 10 });

  assert.deepEqual(xpLog(sheet), []);
});

test("spending the last of the available XP by hand is recorded", async () => {
  // Reaching exactly zero is an ordinary edit. If it goes unlogged the ledger
  // stops adding up, and 0 is precisely the state a GM is most likely to query.
  const sheet = characterSheet({ available: 15, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.experience.available": 0 });

  assert.equal(xpLog(sheet).length, 1, "an edit down to zero XP must still be logged");
  assert.equal(xpLog(sheet)[0].xp.cost, -15);
});

test("granting XP to a character that had none is recorded", async () => {
  const sheet = characterSheet({ available: 0, total: 0 });

  await submit(sheet, { name: "Dex Nova", "data.experience.available": 20 });

  assert.equal(xpLog(sheet).length, 1, "an edit up from zero XP must still be logged");
  assert.equal(xpLog(sheet)[0].xp.cost, 20);
});

/* -------------------------------------------------------------------------- */
/* Minion groups                                                              */
/*                                                                            */
/* A minion group's wound threshold is unit_wounds x group size, and every     */
/* unit_wounds points of damage kills one minion. The number still standing    */
/* drives the whole group's dice pool, so it has to be a whole number and can  */
/* never fall below zero. Actor#prepareDerivedData states the rule:            */
/*                                                                            */
/*   quantity.value = max(min(max, max - floor((wounds - 1) / unit_wounds)), 0)*/
/* -------------------------------------------------------------------------- */

const aliveMinions = (max, wounds, unitWounds) =>
  Math.max(Math.min(max, max - Math.floor((wounds - 1) / unitWounds)), 0);

function minionSheet({ quantity = 4, unitWounds = 5, skills = {} } = {}) {
  return makeSheet({
    type: "minion",
    system: {
      skills,
      attributes: {},
      stats: {},
      quantity: { value: quantity, max: quantity },
      unit_wounds: { value: unitWounds },
    },
  });
}

async function submitMinionDamage({ max, unitWounds, wounds, skills = {}, formSkills = {} }) {
  const sheet = minionSheet({ quantity: max, unitWounds, skills });
  await submit(sheet, {
    name: "Stormtroopers",
    "data.skills": formSkills,
    "data.quantity.max": max,
    "data.quantity.value": max,
    "data.unit_wounds.value": unitWounds,
    "data.stats.wounds.value": wounds,
  });
  return sheet.updates.at(-1).system.quantity.value;
}

test("an undamaged group is at full strength", async () => {
  assert.equal(await submitMinionDamage({ max: 4, unitWounds: 5, wounds: 0 }), aliveMinions(4, 0, 5));
});

test("damage short of a minion's wound threshold kills nobody", async () => {
  assert.equal(await submitMinionDamage({ max: 4, unitWounds: 5, wounds: 3 }), aliveMinions(4, 3, 5));
});

test("every full wound threshold of damage kills one minion", async () => {
  assert.equal(await submitMinionDamage({ max: 4, unitWounds: 5, wounds: 6 }), aliveMinions(4, 6, 5));
  assert.equal(await submitMinionDamage({ max: 4, unitWounds: 5, wounds: 11 }), aliveMinions(4, 11, 5));
});

test("a part-damaged group still has a whole number of minions standing", async () => {
  // 8 wounds on a group of 5-wound minions is one dead and three hurt but alive.
  const standing = await submitMinionDamage({ max: 4, unitWounds: 5, wounds: 8 });

  assert.equal(standing, aliveMinions(4, 8, 5));
  assert.ok(Number.isInteger(standing), `${standing} minions cannot be standing`);
});

test("a wiped-out group has no minions left, not a negative number of them", async () => {
  const standing = await submitMinionDamage({ max: 2, unitWounds: 5, wounds: 16 });

  assert.ok(standing >= 0, `${standing} minions cannot be standing`);
  assert.equal(standing, aliveMinions(2, 16, 5));
});

/* -------------------------------------------------------------------------- */
/* Minion group skills                                                        */
/*                                                                            */
/* A group skill's rank is derived from the group size (one rank per minion    */
/* beyond the first). Clearing the group-skill box hands the skill back to the */
/* stored rank - which, whatever else it is, is not negative.                  */
/* -------------------------------------------------------------------------- */

test("clearing a group skill does not leave the skill at a negative rank", async () => {
  const sheet = minionSheet({
    quantity: 3,
    skills: { Brawl: { groupskill: true, rank: 2 } },
  });

  await submit(sheet, {
    name: "Stormtroopers",
    // the sheet submits the derived rank the player was looking at: quantity - 1
    "data.skills": { Brawl: { groupskill: false, rank: 2 } },
    "data.quantity.max": 3,
    "data.quantity.value": 3,
    "data.unit_wounds.value": 5,
    "data.stats.wounds.value": 0,
  });

  const rank = sheet.updates.at(-1).system.skills.Brawl.rank;
  assert.ok(rank >= 0, `a skill rank of ${rank} is not a rank`);
});

test("a skill that was never a group skill keeps the rank that was submitted", async () => {
  const sheet = minionSheet({
    quantity: 3,
    skills: { Brawl: { groupskill: false, rank: 1 } },
  });

  await submit(sheet, {
    name: "Stormtroopers",
    "data.skills": { Brawl: { groupskill: false, rank: 4 } },
    "data.quantity.max": 3,
    "data.quantity.value": 3,
    "data.unit_wounds.value": 5,
    "data.stats.wounds.value": 0,
  });

  assert.equal(sheet.updates.at(-1).system.skills.Brawl.rank, 4);
});

test("a group skill that stays checked keeps the rank that was submitted", async () => {
  const sheet = minionSheet({
    quantity: 3,
    skills: { Brawl: { groupskill: true, rank: 2 } },
  });

  await submit(sheet, {
    name: "Stormtroopers",
    "data.skills": { Brawl: { groupskill: true, rank: 2 } },
    "data.quantity.max": 3,
    "data.quantity.value": 3,
    "data.unit_wounds.value": 5,
    "data.stats.wounds.value": 0,
  });

  assert.equal(sheet.updates.at(-1).system.skills.Brawl.rank, 2);
});

/* -------------------------------------------------------------------------- */
/* Credits                                                                    */
/*                                                                            */
/* Players type credits with separators; the stored value is a number.        */
/* -------------------------------------------------------------------------- */

test("credits typed with separators are stored as a number", async () => {
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.stats.credits.value": "1,250" });

  assert.equal(sheet.updates.at(-1).system.stats.credits.value, 1250);
});

test("credits typed with a decimal part are truncated to whole credits", async () => {
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.stats.credits.value": "1250.75" });

  assert.equal(sheet.updates.at(-1).system.stats.credits.value, 1250);
});

/* -------------------------------------------------------------------------- */
/* The shape of the payload                                                   */
/* -------------------------------------------------------------------------- */

test("the actor is updated with system keys, never with data keys", async () => {
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.stats.wounds.value": 3 });

  const payload = sheet.updates.at(-1);
  assert.ok(!("data" in payload), "v12 and later no longer shim data into system");
  assert.equal(payload.system.stats.wounds.value, 3);
});

test("the save marks the sheet as needing a reload of its cached data", async () => {
  const sheet = characterSheet({ available: 10, total: 50 });

  await submit(sheet, { name: "Dex Nova", "data.stats.wounds.value": 3 });

  assert.equal(sheet.updates.at(-1).flags.starwarsffg.loaded, false);
});

test("an attribute that is gone from the form is marked for deletion", async () => {
  // Foundry removes a stored key when the update carries "-=key": null.
  const sheet = makeSheet({
    type: "character",
    system: {
      experience: { available: 10, total: 50 },
      attributes: { attr1: { modtype: "Stat", mod: "Wounds", value: 1 } },
      stats: {},
    },
  });

  await submit(sheet, { name: "Dex Nova", "data.stats.wounds.value": 3 });

  assert.equal(sheet.updates.at(-1).system.attributes["-=attr1"], null);
});

/* -------------------------------------------------------------------------- */
/* Edit mode                                                                  */
/*                                                                            */
/* Active effects write derived values back onto the sheet, so editing a value */
/* by hand while they are live loops. Edit mode suspends every effect on the   */
/* actor and on its items, and leaving edit mode has to put each one back the  */
/* way it was found - including the ones that were already switched off.       */
/* Suspending must not reach the database unless the caller asks for it.       */
/* -------------------------------------------------------------------------- */

function makeEffect(id, disabled) {
  return {
    id,
    name: id,
    disabled,
    sourceWrites: 0,
    dbWrites: 0,
    async updateSource(data) {
      this.sourceWrites += 1;
      Object.assign(this, data);
    },
    async update(data) {
      this.dbWrites += 1;
      Object.assign(this, data);
    },
  };
}

function makeActorWithEffects() {
  const own = [makeEffect("own-on", false), makeEffect("own-off", true)];
  const itemEffects = [makeEffect("item-on", false)];
  return {
    actor: {
      name: "Dex Nova",
      effects: own,
      items: [{ id: "item1", name: "Heavy Battle Armour", effects: itemEffects }],
    },
    own,
    itemEffects,
  };
}

test("entering edit mode switches off every effect on the actor and its items", async () => {
  const { actor, own, itemEffects } = makeActorWithEffects();

  await ActorHelpers.beginEditMode(actor);

  assert.ok(own.every((e) => e.disabled), "the actor's own effects must be suspended");
  assert.ok(itemEffects.every((e) => e.disabled), "effects from items must be suspended too");
});

test("entering edit mode does not write the suspension to the database", async () => {
  const { actor, own, itemEffects } = makeActorWithEffects();

  await ActorHelpers.beginEditMode(actor);

  assert.deepEqual(
    [...own, ...itemEffects].map((e) => e.dbWrites),
    [0, 0, 0],
    "suspending effects for an edit must not be persisted",
  );
});

test("leaving edit mode puts every effect back the way it was", async () => {
  const { actor, own, itemEffects } = makeActorWithEffects();

  const state = await ActorHelpers.beginEditMode(actor);
  await ActorHelpers.endEditMode(actor, state);

  assert.equal(own.find((e) => e.id === "own-on").disabled, false);
  assert.equal(own.find((e) => e.id === "own-off").disabled, true, "an effect that was off stays off");
  assert.equal(itemEffects[0].disabled, false);
});

test("leaving edit mode works from the state kept on the actor", async () => {
  // The sheet can be closed and thrown away between the two calls.
  const { actor, own } = makeActorWithEffects();

  await ActorHelpers.beginEditMode(actor);
  await ActorHelpers.endEditMode(actor);

  assert.equal(own.find((e) => e.id === "own-on").disabled, false);
  assert.equal(actor.suspendedEffects, undefined, "the stashed state is spent once it is used");
});

test("leaving edit mode when it was never entered does nothing", async () => {
  const { actor, own } = makeActorWithEffects();

  await assert.doesNotReject(() => ActorHelpers.endEditMode(actor));

  assert.equal(own.find((e) => e.id === "own-on").disabled, false);
});

test("a GM granting XP suspends and restores through the database", async () => {
  // Granting XP changes stored values, so here the suspension has to be real.
  const { actor, own, itemEffects } = makeActorWithEffects();

  const state = await ActorHelpers.beginEditMode(actor, true);
  assert.ok([...own, ...itemEffects].every((e) => e.dbWrites > 0));
  assert.ok([...own, ...itemEffects].every((e) => e.sourceWrites === 0));

  await ActorHelpers.endEditMode(actor, state, true);
  assert.equal(own.find((e) => e.id === "own-on").disabled, false);
  assert.equal(own.find((e) => e.id === "own-off").disabled, true);
});

test("an effect added while editing is left alone on the way out", async () => {
  const { actor, own } = makeActorWithEffects();

  const state = await ActorHelpers.beginEditMode(actor);
  const newcomer = makeEffect("latecomer", false);
  actor.effects.push(newcomer);
  await ActorHelpers.endEditMode(actor, state);

  assert.equal(newcomer.disabled, false);
  assert.equal(own.find((e) => e.id === "own-off").disabled, true);
});
