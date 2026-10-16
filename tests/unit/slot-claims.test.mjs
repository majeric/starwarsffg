import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryGlobals } from "./harness/foundry.mjs";

const harness = installFoundryGlobals({
  settings: { "starwarsffg.useGenericSlots": true, "starwarsffg.enableDebug": false },
});

const { CombatFFG } = await import("../../modules/combat-ffg.js");

/**
 * Initiative produces slots, and a slot is claimed by whichever character takes
 * it that round. Claims live in a flag shaped
 *   flags.starwarsffg.combatClaims = { [round]: { [slotId]: claimantId } }
 *
 * These exercise the claim methods against a stand-in that implements just the
 * flag behaviour they rely on, including Foundry's dotted-path unsetFlag.
 */
function makeCombat({ claims = {}, isGM = true, combatants = [] } = {}) {
  globalThis.game.user.isGM = isGM;
  globalThis.game.socket = {
    emitted: [],
    emit(channel, payload) {
      this.emitted.push({ channel, payload });
    },
  };

  const combat = Object.create(CombatFFG.prototype);
  combat.id = "combat1";
  combat.round = 1;
  combat.flags = { starwarsffg: { combatClaims: structuredClone(claims) } };
  combat.combatants = new Map(combatants.map((c) => [c.id, c]));

  combat.getFlag = (scope, key) => combat.flags?.[scope]?.[key];
  combat.setFlag = async (scope, key, value) => {
    combat.flags[scope] ??= {};
    combat.flags[scope][key] = value;
    return combat;
  };
  combat.unsetFlag = async (scope, key) => {
    // Foundry accepts a dotted path here, which unclaimSlot relies on.
    const parts = key.split(".");
    const last = parts.pop();
    let target = combat.flags[scope];
    for (const p of parts) {
      if (target == null) return combat;
      target = target[p];
    }
    if (target) delete target[last];
    return combat;
  };

  return combat;
}

const claimsOf = (combat, round) => combat.flags.starwarsffg.combatClaims?.[round] ?? {};

/* -------------------------------------------------------------------------- */
/* Looking claims up                                                          */
/* -------------------------------------------------------------------------- */

test("a claimed slot is found by slot id", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");
  assert.equal(combat.getSlotClaims(1, "slotA"), "pcZara");
});

test("a claimed slot is found by claimant id", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");
  assert.equal(combat.findSlotClaims(1, "pcZara"), "slotA");
});

test("an unclaimed slot reports no claim", () => {
  const combat = makeCombat();
  assert.equal(combat.getSlotClaims(1, "slotA"), undefined);
  assert.equal(combat.findSlotClaims(1, "pcZara"), undefined);
});

test("looking up a round with no claims does not throw", () => {
  const combat = makeCombat({ claims: { 1: { slotA: "pcZara" } } });
  assert.equal(combat.getSlotClaims(99, "slotA"), undefined);
  assert.equal(combat.findSlotClaims(99, "pcZara"), undefined);
});

/* -------------------------------------------------------------------------- */
/* Rounds are independent                                                     */
/* -------------------------------------------------------------------------- */

test("claims are scoped to their round", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");
  await combat.claimSlot(2, "slotA", "pcAhsoka");

  assert.equal(combat.getSlotClaims(1, "slotA"), "pcZara");
  assert.equal(combat.getSlotClaims(2, "slotA"), "pcAhsoka");
});

test("claiming in a later round leaves earlier rounds intact", async () => {
  const combat = makeCombat({ claims: { 1: { slotA: "pcZara" } } });
  await combat.claimSlot(2, "slotB", "pcZara");
  assert.deepEqual(claimsOf(combat, 1), { slotA: "pcZara" });
  assert.deepEqual(claimsOf(combat, 2), { slotB: "pcZara" });
});

/* -------------------------------------------------------------------------- */
/* Releasing a slot                                                           */
/* -------------------------------------------------------------------------- */

test("unclaiming frees the slot and only that slot", async () => {
  const combat = makeCombat({ claims: { 1: { slotA: "pcZara", slotB: "pcAhsoka" } } });
  await combat.unclaimSlot(1, "slotA");
  assert.equal(combat.getSlotClaims(1, "slotA"), undefined);
  assert.equal(combat.getSlotClaims(1, "slotB"), "pcAhsoka");
});

test("a freed slot can be claimed by someone else", async () => {
  const combat = makeCombat({ claims: { 1: { slotA: "pcZara" } } });
  await combat.unclaimSlot(1, "slotA");
  await combat.claimSlot(1, "slotA", "pcAhsoka");
  assert.equal(combat.getSlotClaims(1, "slotA"), "pcAhsoka");
});

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

test("a player's claim is sent to the GM rather than written locally", async () => {
  const combat = makeCombat({ isGM: false });
  await combat.claimSlot(1, "slotA", "pcZara");

  assert.equal(combat.getSlotClaims(1, "slotA"), undefined, "the player must not write the flag");
  assert.equal(globalThis.game.socket.emitted.length, 1);
  const { payload } = globalThis.game.socket.emitted[0];
  assert.equal(payload.event, "combat");
  assert.deepEqual(payload.data, {
    combatId: "combat1", round: 1, slot: "slotA", combatantId: "pcZara",
  });
});

test("a player cannot release a slot", async () => {
  const combat = makeCombat({ claims: { 1: { slotA: "pcZara" } }, isGM: false });
  await combat.unclaimSlot(1, "slotA");
  assert.equal(combat.getSlotClaims(1, "slotA"), "pcZara");
});

/* -------------------------------------------------------------------------- */
/* One slot per character per round                                           */
/*                                                                            */
/* Each character acts once per round, so a combatant must not end up holding */
/* two slots in the same round.                                               */
/* -------------------------------------------------------------------------- */

test("a combatant holds at most one slot in a round", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");
  await combat.claimSlot(1, "slotB", "pcZara");

  const held = Object.entries(claimsOf(combat, 1))
    .filter(([, claimant]) => claimant === "pcZara")
    .map(([slot]) => slot);

  assert.deepEqual(
    held,
    ["slotB"],
    "claiming a second slot should move the character, not let them act twice",
  );
});

test("findSlotClaims is unambiguous when a combatant claims twice", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");
  await combat.claimSlot(1, "slotB", "pcZara");

  // A value search over a map cannot describe a character in two places at once;
  // whatever it returns, only one slot should be held.
  const found = combat.findSlotClaims(1, "pcZara");
  assert.equal(Object.values(claimsOf(combat, 1)).filter((c) => c === "pcZara").length, 1);
  assert.ok(found, "the single held slot should be discoverable");
});

/* -------------------------------------------------------------------------- */
/* Claim listing                                                              */
/* -------------------------------------------------------------------------- */

test("getClaims maps each claimed slot to its claimant", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");
  await combat.claimSlot(1, "slotB", "pcAhsoka");

  assert.deepEqual(combat.getClaims(1), { slotA: "pcZara", slotB: "pcAhsoka" });
});

test("getClaims is empty for a round with no claims", () => {
  const combat = makeCombat();
  assert.deepEqual(Object.entries(combat.getClaims(1)), []);
});

test("hasClaims reports the slot a combatant holds, or false", async () => {
  const combat = makeCombat();
  await combat.claimSlot(1, "slotA", "pcZara");

  assert.equal(combat.hasClaims("pcZara"), "slotA");
  assert.equal(combat.hasClaims("pcAhsoka"), false);
});
