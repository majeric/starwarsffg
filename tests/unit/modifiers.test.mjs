import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

const harness = installFoundryGlobals();

const { default: ModifierHelpers } = await import("../../modules/helpers/modifiers.js");

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/*                                                                            */
/* Modifiers live in an item's system.attributes: each entry names the thing   */
/* it changes (mod), the family that thing belongs to (modtype) and the amount.*/
/* Only the fields the aggregation reads are modelled.                        */
/* -------------------------------------------------------------------------- */

let nextAttr = 0;
const attrs = (...entries) =>
  Object.fromEntries(entries.map((e) => [`attr${nextAttr++}`, e]));

const mod = (mod_, modtype, value) => ({ mod: mod_, modtype, value });

const itemModifier = ({ name = "Superior", rank, attributes = {}, active = true } = {}) => ({
  name,
  type: "itemmodifier",
  system: { rank, attributes, active },
});

const talent = ({ name = "Grit", ranked = false, current = 1, attributes = {} } = {}) => ({
  name,
  type: "talent",
  system: { attributes, ranks: { ranked, current } },
});

const gear = ({ name = "Stimpack", quantity, attributes = {} } = {}) => ({
  name,
  type: "gear",
  system: { attributes, quantity: quantity === undefined ? undefined : { value: quantity } },
});

const armour = ({
  name = "Heavy Clothing",
  equipped = true,
  soak,
  defence,
  attributes = {},
  itemmodifier = [],
  itemattachment = [],
} = {}) => ({
  name,
  type: "armour",
  system: {
    attributes,
    equippable: { equipped },
    soak: soak === undefined ? undefined : { adjusted: soak },
    defence: defence === undefined ? undefined : { adjusted: defence },
    itemmodifier,
    itemattachment,
  },
});

const totalOf = (items, key, modtype) =>
  ModifierHelpers.getCalculatedValueFromItems(items, key, modtype, true).total;

const sourcesOf = (items, key, modtype) =>
  ModifierHelpers.getCalculatedValueFromItems(items, key, modtype, true).sources;

test.beforeEach(() => harness.reset());

/* -------------------------------------------------------------------------- */
/* A modifier's own ranks                                                     */
/*                                                                            */
/* An item modification can be installed more than once ("+1 damage" twice is  */
/* a rank 2 modification), and the rank multiplies what it contributes. This   */
/* is the rule ItemHelpers.syncAEStatus writes into the active effect:         */
/* value = ranks * attribute value.                                           */
/* -------------------------------------------------------------------------- */

test("a modification contributes its value once per rank", () => {
  const superior = itemModifier({ rank: 3, attributes: attrs(mod("damage", "Weapon Stat", 1)) });

  assert.equal(
    ModifierHelpers.getCalculatedValueFromCurrentAndArray(superior, [], "damage", "Weapon Stat"),
    3,
  );
});

test("a modification with no rank counts once", () => {
  const superior = itemModifier({ attributes: attrs(mod("damage", "Weapon Stat", 2)) });

  assert.equal(
    ModifierHelpers.getCalculatedValueFromCurrentAndArray(superior, [], "damage", "Weapon Stat"),
    2,
  );
});

test("a modification that changes something else contributes nothing", () => {
  const superior = itemModifier({ rank: 2, attributes: attrs(mod("critical", "Weapon Stat", 1)) });

  assert.equal(
    ModifierHelpers.getCalculatedValueFromCurrentAndArray(superior, [], "damage", "Weapon Stat"),
    0,
  );
});

test("the family of the modifier has to match as well as the name", () => {
  // "soak" as an Armor Stat and "Soak" as a Stat are different questions.
  const superior = itemModifier({ attributes: attrs(mod("soak", "Armor Stat", 1)) });

  assert.equal(
    ModifierHelpers.getCalculatedValueFromCurrentAndArray(superior, [], "soak", "Stat"),
    0,
  );
});

test("several modifiers of the same kind on one modification stack", () => {
  const superior = itemModifier({
    rank: 2,
    attributes: attrs(mod("damage", "Weapon Stat", 1), mod("damage", "Weapon Stat", 2)),
  });

  assert.equal(
    ModifierHelpers.getCalculatedValueFromCurrentAndArray(superior, [], "damage", "Weapon Stat"),
    6,
  );
});

test("a modification with no modifiers at all contributes nothing", () => {
  // A modification that has never been edited has no attributes key whatsoever.
  const plain = { name: "Plain", type: "itemmodifier", system: { rank: 2 } };

  assert.equal(
    ModifierHelpers.getCalculatedValueFromCurrentAndArray(plain, [], "damage", "Weapon Stat"),
    0,
  );
});

test("asking for sources names the modification and what it contributed", () => {
  const superior = itemModifier({
    name: "Superior",
    rank: 2,
    attributes: attrs(mod("damage", "Weapon Stat", 1)),
  });

  const result = ModifierHelpers.getCalculatedValueFromCurrentAndArray(
    superior, [], "damage", "Weapon Stat", true,
  );

  assert.equal(result.total, 2);
  assert.deepEqual(result.sources, [
    { modtype: "Weapon Stat", key: "damage", name: "Superior", value: 2, type: "itemmodifier" },
  ]);
});

test("a ranked modification inside an attachment also counts once per rank", () => {
  // Installing an attachment does not make its modifications count for less than
  // the same modifications installed directly on the weapon.
  const attachment = { name: "Weapon Sling", type: "itemattachment", system: { attributes: {} } };
  const modifications = [
    itemModifier({ name: "Superior", rank: 2, attributes: attrs(mod("damage", "Weapon Stat", 1)) }),
  ];

  const result = ModifierHelpers.getCalculatedValueFromCurrentAndArray(
    attachment, modifications, "damage", "Weapon Stat", true,
  );

  assert.equal(result.total, 2);
});

/* -------------------------------------------------------------------------- */
/* Talents                                                                    */
/*                                                                            */
/* A ranked talent's modifier applies once per rank taken; an unranked talent  */
/* applies once however often it appears.                                     */
/* -------------------------------------------------------------------------- */

test("a ranked talent contributes its value once per rank", () => {
  const toughened = talent({
    name: "Toughened",
    ranked: true,
    current: 3,
    attributes: attrs(mod("Wounds", "Stat", 2)),
  });

  assert.equal(totalOf([toughened], "Wounds", "Stat"), 6);
});

test("an unranked talent contributes its value once", () => {
  const grit = talent({ name: "Grit", ranked: false, current: 4, attributes: attrs(mod("Strain", "Stat", 1)) });

  assert.equal(totalOf([grit], "Strain", "Stat"), 1);
});

test("talents from different sources stack", () => {
  const items = [
    talent({ name: "Grit", attributes: attrs(mod("Strain", "Stat", 1)) }),
    talent({ name: "Grit (Soldier)", ranked: true, current: 2, attributes: attrs(mod("Strain", "Stat", 1)) }),
  ];

  assert.equal(totalOf(items, "Strain", "Stat"), 3);
});

test("a talent that modifies something else is not counted", () => {
  const items = [
    talent({ name: "Grit", attributes: attrs(mod("Strain", "Stat", 1)) }),
    talent({ name: "Toughened", attributes: attrs(mod("Wounds", "Stat", 2)) }),
  ];

  assert.equal(totalOf(items, "Strain", "Stat"), 1);
});

test("a wildcard modifier applies to whatever is being asked about", () => {
  const oddity = talent({ name: "Oddity", attributes: attrs(mod("*", "Stat", 1)) });

  assert.equal(totalOf([oddity], "Wounds", "Stat"), 1);
  assert.equal(totalOf([oddity], "Strain", "Stat"), 1);
});

/* -------------------------------------------------------------------------- */
/* Quantities, absences and inactive modifications                            */
/* -------------------------------------------------------------------------- */

test("a stack of gear contributes once per item in the stack", () => {
  const items = [gear({ quantity: 3, attributes: attrs(mod("Encumbrance", "Stat", 1)) })];

  assert.equal(totalOf(items, "Encumbrance", "Stat"), 3);
});

test("gear with no quantity recorded counts once", () => {
  const items = [gear({ attributes: attrs(mod("Encumbrance", "Stat", 2)) })];

  assert.equal(totalOf(items, "Encumbrance", "Stat"), 2);
});

test("nothing at all contributes nothing", () => {
  assert.equal(totalOf([], "Wounds", "Stat"), 0);
  assert.equal(sourcesOf([], "Wounds", "Stat").length, 0);
});

test("items with no modifiers contribute nothing", () => {
  assert.equal(totalOf([talent({ attributes: {} }), gear({ attributes: {} })], "Wounds", "Stat"), 0);
});

test("a missing item in the list is skipped rather than fatal", () => {
  const items = [null, talent({ attributes: attrs(mod("Wounds", "Stat", 2)) }), undefined];

  assert.equal(totalOf(items, "Wounds", "Stat"), 2);
});

test("an uninstalled modification contributes nothing", () => {
  const inactive = itemModifier({ active: false, attributes: attrs(mod("Wounds", "Stat", 5)) });

  assert.equal(totalOf([inactive], "Wounds", "Stat"), 0);
});

test("an installed modification contributes", () => {
  const active = itemModifier({ active: true, attributes: attrs(mod("Wounds", "Stat", 5)) });

  assert.equal(totalOf([active], "Wounds", "Stat"), 5);
});

/* -------------------------------------------------------------------------- */
/* Worn armour                                                                */
/*                                                                            */
/* Armour only protects you while you are wearing it.                         */
/* -------------------------------------------------------------------------- */

test("worn armour contributes its soak", () => {
  assert.equal(totalOf([armour({ equipped: true, soak: 2 })], "Soak", "Stat"), 2);
});

test("armour that is not worn contributes nothing", () => {
  assert.equal(totalOf([armour({ equipped: false, soak: 2 })], "Soak", "Stat"), 0);
});

test("a modifier on worn armour contributes", () => {
  const worn = armour({ equipped: true, attributes: attrs(mod("Wounds", "Stat", 1)) });

  assert.equal(totalOf([worn], "Wounds", "Stat"), 1);
});

test("a modifier on armour in the pack contributes nothing", () => {
  const stowed = armour({ equipped: false, attributes: attrs(mod("Wounds", "Stat", 1)) });

  assert.equal(totalOf([stowed], "Wounds", "Stat"), 0);
});

test("defence does not stack: the best worn source is the one that counts", () => {
  // Defence is not cumulative - the code's own comment says "get the highest
  // defense item" - so a character wearing two defensive items has the better
  // of the two ratings, not their sum.
  const items = [
    armour({ name: "Armoured Clothing", equipped: true, defence: 1 }),
    armour({ name: "Heavy Battle Armour", equipped: true, defence: 2 }),
  ];

  assert.equal(totalOf(items, "Defence-Melee", "Stat"), 2);
});

/* -------------------------------------------------------------------------- */
/* Career skills                                                              */
/*                                                                            */
/* A career skill is a yes/no, not an amount: the question is only whether     */
/* anything the character owns makes the skill a career skill.                */
/* -------------------------------------------------------------------------- */

const careerSkill = (name) => ({
  name,
  type: "specialization",
  system: { attributes: attrs(mod("Astrogation", "Career Skill", true)), talents: {} },
});

test("a specialization that grants a career skill reports it as granted", () => {
  const result = ModifierHelpers.getCalculatedValueFromItems(
    [careerSkill("Pilot")], "Astrogation", "Career Skill", true,
  );

  assert.equal(result.checked, true);
  assert.equal(result.sources.length, 1);
});

test("nothing granting a career skill reports it as not granted", () => {
  const result = ModifierHelpers.getCalculatedValueFromItems([], "Astrogation", "Career Skill", true);

  assert.equal(result.checked, false);
  assert.deepEqual(result.sources, []);
});

/* -------------------------------------------------------------------------- */
/* Species                                                                    */
/*                                                                            */
/* A species sets the starting value of a characteristic; everything else only */
/* modifies it.                                                               */
/* -------------------------------------------------------------------------- */

const species = (attributes) => ({ name: "Wookiee", type: "species", system: { attributes } });

test("the base value comes from the species", () => {
  const items = [species(attrs(mod("Brawn", "Characteristic", 3)))];

  assert.equal(ModifierHelpers.getBaseValue(items, "Brawn", "Characteristic"), 3);
});

test("talents do not contribute to the base value", () => {
  const items = [
    species(attrs(mod("Brawn", "Characteristic", 3))),
    talent({ name: "Brawn boost", attributes: attrs(mod("Brawn", "Characteristic", 1)) }),
  ];

  assert.equal(ModifierHelpers.getBaseValue(items, "Brawn", "Characteristic"), 3);
});

test("a species that says nothing about the characteristic gives nothing", () => {
  const items = [species(attrs(mod("Agility", "Characteristic", 3)))];

  assert.equal(ModifierHelpers.getBaseValue(items, "Brawn", "Characteristic"), 0);
});

/* -------------------------------------------------------------------------- */
/* Which stored field a modifier writes to                                    */
/* -------------------------------------------------------------------------- */

test("a characteristic modifier writes to the characteristic", () => {
  assert.equal(
    ModifierHelpers.getModKeyPath("Characteristic", "Brawn"),
    "system.characteristics.Brawn.value",
  );
});

test("thresholds are raised, not set: they write to max, whatever family they claim", () => {
  for (const [mod_, path] of [
    ["Wounds", "system.stats.wounds.max"],
    ["Strain", "system.stats.strain.max"],
    ["EncumbranceMax", "system.stats.encumbrance.max"],
    ["Hulltrauma", "system.stats.hullTrauma.max"],
    ["Systemstrain", "system.stats.systemStrain.max"],
  ]) {
    assert.equal(ModifierHelpers.getModKeyPath("Stat", mod_), path, mod_);
    assert.equal(ModifierHelpers.getModKeyPath("Threshold", mod_), path, mod_);
  }
});

test("plain stats write to their current value", () => {
  assert.equal(ModifierHelpers.getModKeyPath("Stat", "Soak"), "system.stats.soak.value");
  assert.equal(ModifierHelpers.getModKeyPath("Stat", "ForcePool"), "system.stats.forcePool.max");
  assert.equal(ModifierHelpers.getModKeyPath("Stat", "Defence.Melee"), "system.stats.defence.melee");
  assert.equal(ModifierHelpers.getModKeyPath("Stat", "Defence.Ranged"), "system.stats.defence.ranged");
});

test("each shield facing has its own field", () => {
  assert.equal(ModifierHelpers.getModKeyPath("Vehicle Stat", "Shields.Fore"), "system.stats.shields.fore");
  assert.equal(ModifierHelpers.getModKeyPath("Vehicle Stat", "Shields.Aft"), "system.stats.shields.aft");
  assert.equal(ModifierHelpers.getModKeyPath("Vehicle Stat", "Shields.Port"), "system.stats.shields.port");
  assert.equal(
    ModifierHelpers.getModKeyPath("Vehicle Stat", "Shields.Starboard"),
    "system.stats.shields.starboard",
  );
});

test("an unknown family writes nowhere instead of guessing", () => {
  assert.equal(ModifierHelpers.getModKeyPath("Nonsense", "Whatever"), undefined);
});

test("every skill modifier round-trips between its path and its family", () => {
  const families = [
    "Force Boost", "Skill Add Advantage", "Skill Add Dark", "Skill Add Despair",
    "Skill Add Failure", "Skill Add Light", "Skill Add Success", "Skill Add Threat",
    "Skill Add Triumph", "Skill Add Upgrade", "Skill Boost", "Skill Rank",
    "Skill Remove Setback", "Skill Setback", "Career Skill",
  ];

  for (const family of families) {
    const path = ModifierHelpers.getModKeyPath(family, "Astrogation");
    assert.ok(path?.startsWith("system.skills.Astrogation."), `${family} -> ${path}`);
    assert.equal(ModifierHelpers.getModTypeByModPath(path), family, path);
  }
});

/* -------------------------------------------------------------------------- */
/* Modifiers that imply others                                                */
/*                                                                            */
/* Changing one number on the sheet can change several stored fields: Brawn    */
/* carries encumbrance and soak with it, and Defence covers both kinds.        */
/* -------------------------------------------------------------------------- */

test("raising Brawn also raises what you can carry and how much you soak", () => {
  const exploded = ModifierHelpers.explodeMod("Characteristic", "Brawn");

  assert.deepEqual(exploded, [
    { modType: "Characteristic", mod: "Brawn" },
    { modType: "Characteristic", mod: "EncumbranceMax" },
    { modType: "Stat", mod: "Soak" },
  ]);
});

test("defence with no side named covers both melee and ranged", () => {
  assert.deepEqual(ModifierHelpers.explodeMod("Stat", "Defence"), [
    { modType: "Stat", mod: "Defence.Melee" },
    { modType: "Stat", mod: "Defence.Ranged" },
  ]);
});

test("the American spelling of defence is understood too", () => {
  assert.deepEqual(
    ModifierHelpers.explodeMod("Stat", "defense"),
    ModifierHelpers.explodeMod("Stat", "Defence"),
  );
  assert.deepEqual(
    ModifierHelpers.explodeMod("Stat", "Defense-Melee"),
    ModifierHelpers.explodeMod("Stat", "Defence-Melee"),
  );
});

test("shields are raised on all four facings", () => {
  assert.deepEqual(
    ModifierHelpers.explodeMod("Vehicle Stat", "Shields").map((m) => m.mod),
    ["Shields.Fore", "Shields.Aft", "Shields.Port", "Shields.Starboard"],
  );
  assert.ok(
    ModifierHelpers.explodeMod("Vehicle Stat", "Shields").every((m) => m.modType === "Vehicle Stat"),
  );
});

test("anything with no knock-on effects explodes to just itself", () => {
  assert.deepEqual(ModifierHelpers.explodeMod("Stat", "Soak"), [{ modType: "Stat", mod: "Soak" }]);
});

/* -------------------------------------------------------------------------- */
/* Damage from a characteristic                                               */
/* -------------------------------------------------------------------------- */

test("a weapon with a damage characteristic adds it to damage", () => {
  assert.equal(ModifierHelpers.shouldApplyCharacteristicToDamage({ characteristic: { value: "Brawn" } }), true);
});

test("a weapon with no damage characteristic does not", () => {
  assert.equal(ModifierHelpers.shouldApplyCharacteristicToDamage({ characteristic: { value: "" } }), false);
  assert.equal(ModifierHelpers.shouldApplyCharacteristicToDamage({ characteristic: {} }), false);
  assert.equal(ModifierHelpers.shouldApplyCharacteristicToDamage({}), false);
});
