import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

const harness = installFoundryGlobals();

const { default: ItemHelpers } = await import("../../modules/helpers/item-helpers.js");

test.beforeEach(() => harness.reset());

/* -------------------------------------------------------------------------- */
/* Normalising an update payload                                              */
/*                                                                            */
/* Item#update is handed "data" by older code and by the editors; the stored   */
/* document only has "system". Everything under data has to arrive under       */
/* system, and the caller's own object must come back unharmed, because        */
/* itembase-ffg normalises on the way into super.update().                     */
/* -------------------------------------------------------------------------- */

test("the data bag becomes the system bag", () => {
  const result = ItemHelpers.normalizeDataStructure({ data: { damage: { value: 7 } } });

  assert.deepEqual(result, { system: { damage: { value: 7 } } });
});

test("a payload that is already in system form is left as it is", () => {
  const payload = { system: { damage: { value: 7 } }, name: "Blaster" };

  assert.deepEqual(ItemHelpers.normalizeDataStructure(payload), payload);
});

test("a payload that mixes data and system keeps both", () => {
  const result = ItemHelpers.normalizeDataStructure({
    system: { damage: { value: 7 } },
    data: { crit: { value: 3 } },
  });

  assert.deepEqual(result, { system: { damage: { value: 7 }, crit: { value: 3 } } });
  assert.ok(!("data" in result), "the data bag must not be left behind");
});

test("keys that are not the data bag are carried through", () => {
  const result = ItemHelpers.normalizeDataStructure({
    _id: "item1",
    name: "Blaster",
    data: { damage: { value: 7 } },
  });

  assert.deepEqual(result, { _id: "item1", name: "Blaster", system: { damage: { value: 7 } } });
});

test("the caller's own payload is not modified", () => {
  const payload = { data: { damage: { value: 7 } } };

  ItemHelpers.normalizeDataStructure(payload);

  assert.deepEqual(payload, { data: { damage: { value: 7 } } });
});

test("an empty payload stays empty", () => {
  assert.deepEqual(ItemHelpers.normalizeDataStructure({}), {});
});

test("a system key with nothing in it becomes an empty system bag", () => {
  assert.deepEqual(ItemHelpers.normalizeDataStructure({ system: undefined }), { system: {} });
});

test("an empty data bag becomes an empty system bag", () => {
  assert.deepEqual(ItemHelpers.normalizeDataStructure({ data: {} }), { system: {} });
});

test("normalising twice gives the same result as normalising once", () => {
  const once = ItemHelpers.normalizeDataStructure({ name: "Blaster", data: { damage: { value: 7 } } });

  assert.deepEqual(ItemHelpers.normalizeDataStructure(once), once);
});

/* -------------------------------------------------------------------------- */
/* Indexed form fields                                                        */
/*                                                                            */
/* A form carrying a list of modifications submits them as "itemmodifier[0]",  */
/* "itemmodifier[1]" and so on. The item stores a plain array, in the order    */
/* the form listed them.                                                      */
/* -------------------------------------------------------------------------- */

test("a single indexed field becomes a one-element array", () => {
  const result = ItemHelpers.explodeFormData({ "system.itemmodifier[0]": { name: "Superior" } });

  assert.deepEqual(result.system.itemmodifier, [{ name: "Superior" }]);
});

test("indexed fields keep the order the form submitted them in", () => {
  const result = ItemHelpers.explodeFormData({
    "system.itemmodifier[0]": { name: "Superior" },
    "system.itemmodifier[1]": { name: "Vicious" },
    "system.itemmodifier[2]": { name: "Accurate" },
  });

  assert.deepEqual(
    result.system.itemmodifier.map((m) => m.name),
    ["Superior", "Vicious", "Accurate"],
  );
});

test("the indexed keys themselves are gone afterwards", () => {
  const result = ItemHelpers.explodeFormData({ "system.itemmodifier[0]": { name: "Superior" } });

  assert.deepEqual(Object.keys(result.system), ["itemmodifier"]);
});

test("two different indexed lists are gathered separately", () => {
  const result = ItemHelpers.explodeFormData({
    "system.itemmodifier[0]": { name: "Superior" },
    "system.itemattachment[0]": { name: "Weapon Sling" },
  });

  assert.equal(result.system.itemmodifier.length, 1);
  assert.equal(result.system.itemattachment.length, 1);
});

test("ordinary fields are left alone", () => {
  const result = ItemHelpers.explodeFormData({
    "system.damage.value": 7,
    "system.itemmodifier[0]": { name: "Superior" },
  });

  assert.equal(result.system.damage.value, 7);
  assert.deepEqual(result.system.itemmodifier, [{ name: "Superior" }]);
});

test("a form with no lists in it comes back unchanged", () => {
  const result = ItemHelpers.explodeFormData({ "system.damage.value": 7 });

  assert.deepEqual(result, { system: { damage: { value: 7 } } });
});

/* -------------------------------------------------------------------------- */
/* Encumbrance of worn armour                                                 */
/*                                                                            */
/* Armour you are wearing counts for 3 less encumbrance than armour you are    */
/* carrying, and never for less than nothing.                                 */
/* -------------------------------------------------------------------------- */

const ENCUMBRANCE_PATH = "system.stats.encumbrance.value";

function makeArmour({ type = "armour", encumbrance = 6 } = {}) {
  const effect = {
    name: "(inherent)",
    changes: [
      { key: "system.stats.soak.value", mode: 2, value: 2 },
      { key: ENCUMBRANCE_PATH, mode: 2, value: encumbrance },
    ],
    updates: [],
    async update(data) {
      this.updates.push(data);
      Object.assign(this, data);
      return this;
    },
  };
  const item = { name: "Heavy Battle Armour", type, system: { encumbrance: { value: encumbrance } } };
  return { item, effect };
}

const encumbranceOf = (effect) => effect.changes.find((c) => c.key === ENCUMBRANCE_PATH).value;

test("wearing armour reduces its encumbrance by three", async () => {
  const { item, effect } = makeArmour({ encumbrance: 6 });

  await ItemHelpers.updateEncumbranceOnEquip(item, effect, true);

  assert.equal(encumbranceOf(effect), 3);
});

test("taking armour off restores its full encumbrance", async () => {
  const { item, effect } = makeArmour({ encumbrance: 6 });

  await ItemHelpers.updateEncumbranceOnEquip(item, effect, true);
  await ItemHelpers.updateEncumbranceOnEquip(item, effect, false);

  assert.equal(encumbranceOf(effect), 6);
});

test("light armour never reaches a negative encumbrance", async () => {
  const { item, effect } = makeArmour({ encumbrance: 2 });

  await ItemHelpers.updateEncumbranceOnEquip(item, effect, true);

  assert.equal(encumbranceOf(effect), 0);
});

test("the other things the armour does are not disturbed", async () => {
  const { item, effect } = makeArmour({ encumbrance: 6 });

  await ItemHelpers.updateEncumbranceOnEquip(item, effect, true);

  assert.equal(effect.changes.find((c) => c.key === "system.stats.soak.value").value, 2);
});

test("only armour gets the discount", async () => {
  const { item, effect } = makeArmour({ type: "gear", encumbrance: 6 });

  await ItemHelpers.updateEncumbranceOnEquip(item, effect, true);

  assert.equal(encumbranceOf(effect), 6);
  assert.deepEqual(effect.updates, [], "a non-armour item needs no effect update at all");
});

/* -------------------------------------------------------------------------- */
/* Effects behind an uninstalled modification                                 */
/*                                                                            */
/* An attachment can hold modifications that have not been installed. Their    */
/* effects must stay suspended even when the item they hang off is equipped.   */
/* -------------------------------------------------------------------------- */

const modification = ({ attr, active }) => ({
  name: `mod-${attr}`,
  system: { active, attributes: { [attr]: { mod: "Wounds", modtype: "Stat", value: 1 } } },
});

const armourWithAttachment = (modifications) => ({
  name: "Heavy Battle Armour",
  type: "armour",
  system: {
    itemattachment: [{ name: "Reinforcement", system: { itemmodifier: modifications } }],
  },
});

test("an effect from an installed modification applies", async () => {
  const item = armourWithAttachment([modification({ attr: "attr1", active: true })]);

  assert.equal(await ItemHelpers.shouldUpdateAEStatus(item, { name: "attr1" }), true);
});

test("an effect from a modification that was never installed does not apply", async () => {
  const item = armourWithAttachment([modification({ attr: "attr1", active: false })]);

  assert.equal(await ItemHelpers.shouldUpdateAEStatus(item, { name: "attr1" }), false);
});

test("an uninstalled modification is found wherever it sits in the attachment", async () => {
  // The first modification in the list says nothing about this effect; the
  // search has to carry on to the one that does.
  const item = armourWithAttachment([
    modification({ attr: "attr1", active: true }),
    modification({ attr: "attr2", active: false }),
  ]);

  assert.equal(await ItemHelpers.shouldUpdateAEStatus(item, { name: "attr2" }), false);
});

test("an effect on an item with no attachments applies", async () => {
  const item = { name: "Blaster", type: "weapon", system: { itemattachment: [] } };

  assert.equal(await ItemHelpers.shouldUpdateAEStatus(item, { name: "attr1" }), true);
});

test("an effect on an item that cannot take attachments applies", async () => {
  const item = { name: "Grit", type: "talent", system: {} };

  assert.equal(await ItemHelpers.shouldUpdateAEStatus(item, { name: "attr1" }), true);
});
