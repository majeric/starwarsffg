import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

const harness = installFoundryGlobals();

// The XP log whispers the GM when a purchase is made. The harness has no chat,
// so stand one up here and record what the helpers tried to send.
const whispers = [];
globalThis.ChatMessage = class {
  static getWhisperRecipients(role) {
    return [`${role}-user`];
  }
  static async create(data) {
    whispers.push(data);
    return data;
  }
};

const { xpLogEarn, xpLogSpend, xpLogUndo } = await import("../../modules/helpers/actor-helpers.js");

/**
 * The XP log lives in a flag, so an actor only has to be able to hold flags and
 * report its own experience. Nothing else of a real Actor is touched.
 */
function makeActor({ available = 100, total = 100, xpLog } = {}) {
  const flags = { starwarsffg: {} };
  if (xpLog) flags.starwarsffg.xpLog = xpLog;
  return {
    id: "actor1",
    name: "Dex Nova",
    flags,
    system: { experience: { available, total } },
    getFlag(scope, key) {
      return this.flags[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
      return this;
    },
  };
}

const logOf = (actor) => actor.getFlag("starwarsffg", "xpLog") ?? [];
const today = () => new Date().toISOString().slice(0, 10);

test.beforeEach(() => {
  whispers.length = 0;
  harness.reset();
  harness.settings.set("starwarsffg.notifyOnXpSpend", false);
});

/* -------------------------------------------------------------------------- */
/* What an entry records                                                      */
/*                                                                            */
/* The log is the audit trail a GM reads to answer "where did this character's */
/* XP go". Every entry therefore has to carry the amount moved AND the         */
/* available/total it left behind, so the ledger can be read top to bottom.    */
/* -------------------------------------------------------------------------- */

test("a purchase records the cost and the totals it leaves behind", async () => {
  const actor = makeActor({ available: 100, total: 100 });

  await xpLogSpend(actor, "skill rank Astrogation 1 --> 2", 10, 90, 100);

  assert.deepEqual(logOf(actor), [
    {
      action: "purchased",
      id: undefined,
      xp: { cost: 10, available: 90, total: 100 },
      date: today(),
      description: "skill rank Astrogation 1 --> 2",
    },
  ]);
});

test("a purchase remembers the active effect that carried it out", async () => {
  // The refund flow finds the effect to delete by the id stored on the entry.
  const actor = makeActor();

  await xpLogSpend(actor, "characteristic Brawn level 2 --> 3", 30, 70, 100, "ae-brawn-3");

  assert.equal(logOf(actor)[0].id, "ae-brawn-3");
});

test("a grant from the GM is recorded as granted", async () => {
  const actor = makeActor({ available: 0, total: 0 });

  await xpLogEarn(actor, 20, 20, 20, "session 4 reward");

  assert.deepEqual(logOf(actor), [
    {
      action: "granted",
      id: undefined,
      xp: { cost: 20, available: 20, total: 20 },
      date: today(),
      description: "session 4 reward",
    },
  ]);
});

test("a change the player made to themselves is recorded as adjusted", async () => {
  // "granted" means the GM handed XP out; anything else is the sheet being edited.
  const actor = makeActor();

  await xpLogEarn(actor, 5, 105, 105, "manual adjustment", "Self");

  assert.equal(logOf(actor)[0].action, "adjusted");
});

test("an undone grant is recorded as undone, with the amount taken back", async () => {
  const actor = makeActor({ available: 110, total: 110 });

  await xpLogUndo(actor, 10, 100, 100);

  assert.deepEqual(logOf(actor), [
    {
      action: "undid",
      id: undefined,
      xp: { cost: 10, available: 100, total: 100 },
      date: today(),
      description: "Species XP",
    },
  ]);
});

/* -------------------------------------------------------------------------- */
/* The log is an append-only ledger, newest first                             */
/*                                                                            */
/* The sheet renders the flag in order and the refund flow unshifts onto it,   */
/* so the newest entry must be at the head and nothing already written may be  */
/* altered or dropped.                                                        */
/* -------------------------------------------------------------------------- */

test("the newest entry goes to the head of the log", async () => {
  const actor = makeActor();

  await xpLogEarn(actor, 20, 120, 120, "session 1");
  await xpLogSpend(actor, "new talent Grit", 5, 115, 120);
  await xpLogUndo(actor, 20, 95, 100);

  assert.deepEqual(
    logOf(actor).map((e) => e.description),
    ["Species XP", "new talent Grit", "session 1"],
  );
});

test("earlier entries are preserved exactly", async () => {
  const existing = [
    {
      action: "granted",
      id: undefined,
      xp: { cost: 50, available: 50, total: 50 },
      date: "2024-01-01",
      description: "starting XP",
    },
  ];
  const actor = makeActor({ xpLog: structuredClone(existing) });

  await xpLogSpend(actor, "new talent Grit", 5, 45, 50);

  assert.equal(logOf(actor).length, 2);
  assert.deepEqual(logOf(actor)[1], existing[0]);
});

test("nothing is ever removed from the log, including by an undo", async () => {
  // Undoing a grant reverses the XP, but the grant still happened: the record of
  // it has to stay, otherwise the ledger no longer explains the current totals.
  const actor = makeActor();
  await xpLogEarn(actor, 10, 110, 110, "species Wookiee");

  await xpLogUndo(actor, 10, 100, 100);

  assert.equal(logOf(actor).length, 2);
  assert.equal(logOf(actor)[1].description, "species Wookiee");
  assert.equal(logOf(actor)[1].action, "granted");
});

test("an actor with no log yet starts one", async () => {
  const actor = makeActor();
  assert.equal(actor.getFlag("starwarsffg", "xpLog"), undefined);

  await xpLogSpend(actor, "new talent Grit", 5, 95, 100);

  assert.equal(logOf(actor).length, 1);
});

test("replaying the log from the oldest entry reproduces the running totals", async () => {
  const actor = makeActor({ available: 0, total: 0 });

  await xpLogEarn(actor, 100, 100, 100, "starting XP");
  await xpLogSpend(actor, "skill rank Astrogation 0 --> 1", 5, 95, 100);
  await xpLogSpend(actor, "characteristic Brawn 2 --> 3", 30, 65, 100);
  await xpLogEarn(actor, 10, 75, 110, "session 2");

  let available = 0;
  let total = 0;
  for (const entry of [...logOf(actor)].reverse()) {
    if (entry.action === "purchased") {
      available -= entry.xp.cost;
    } else if (entry.action === "undid") {
      available -= entry.xp.cost;
      total -= entry.xp.cost;
    } else {
      available += entry.xp.cost;
      total += entry.xp.cost;
    }
    assert.equal(entry.xp.available, available, `available after "${entry.description}"`);
    assert.equal(entry.xp.total, total, `total after "${entry.description}"`);
  }
});

/* -------------------------------------------------------------------------- */
/* Amounts the log must not quietly swallow                                   */
/*                                                                            */
/* Affordability is the caller's gate (every purchase path checks it and warns */
/* with NotEnoughXP). The log's own job is to record faithfully whatever it is */
/* handed, so that a bad purchase elsewhere is visible rather than invisible.  */
/* -------------------------------------------------------------------------- */

test("a purchase that overdraws the pool is still recorded, debt and all", async () => {
  const actor = makeActor({ available: 5, total: 100 });

  await xpLogSpend(actor, "characteristic Brawn 3 --> 4", 40, -35, 100);

  assert.equal(logOf(actor).length, 1);
  assert.equal(logOf(actor)[0].xp.cost, 40);
  assert.equal(logOf(actor)[0].xp.available, -35);
});

test("a free purchase is still recorded", async () => {
  const actor = makeActor();

  await xpLogSpend(actor, "specialization talent granted by species", 0, 100, 100);

  assert.equal(logOf(actor).length, 1);
  assert.equal(logOf(actor)[0].xp.cost, 0);
});

/* -------------------------------------------------------------------------- */
/* Telling the GM                                                             */
/*                                                                            */
/* Only purchases are whispered, and only when the world asks for it.         */
/* -------------------------------------------------------------------------- */

test("a purchase is whispered to the GM when the world asks for it", async () => {
  harness.settings.set("starwarsffg.notifyOnXpSpend", true);
  const actor = makeActor();

  await xpLogSpend(actor, "new talent Grit", 5, 95, 100);

  assert.equal(whispers.length, 1);
  assert.match(whispers[0].content, /Grit/);
  assert.deepEqual(whispers[0].whisper, ["GM-user"]);
});

test("no whisper is sent when the world has the notice turned off", async () => {
  harness.settings.set("starwarsffg.notifyOnXpSpend", false);
  const actor = makeActor();

  await xpLogSpend(actor, "new talent Grit", 5, 95, 100);

  assert.equal(whispers.length, 0);
});

test("grants and undos are not whispered", async () => {
  harness.settings.set("starwarsffg.notifyOnXpSpend", true);
  const actor = makeActor();

  await xpLogEarn(actor, 20, 120, 120, "session 1");
  await xpLogUndo(actor, 20, 100, 100);

  assert.equal(whispers.length, 0);
});
