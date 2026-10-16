import test from "node:test";
import assert from "node:assert/strict";

import {
  installImporterEnvironment,
  fixtureXml,
  storedByKey,
  attributeFor,
  findBrokenValues,
} from "./harness/oggdude-importer-harness.mjs";

/**
 * Weapons, armour, gear, item modifiers and talents, run through the real
 * importers against the real OggDude fixtures.
 *
 * The expected values come from the fixtures and from the printed stat blocks
 * they describe, not from what the importer happens to emit.
 */

const env = await installImporterEnvironment();
const { OggDude, stored } = env;

// Phase order matters: skills first (so skill keys resolve), then the item
// modifiers a weapon's qualities point at, then the items themselves.
await OggDude.Import.Skills(fixtureXml("Skills.xml"), { files: {} });
await OggDude.Import.ItemModifiers(fixtureXml("ItemDescriptors.xml"));
await OggDude.Import.Weapon(fixtureXml("Weapons.xml"), { files: {} });
await OggDude.Import.Armor(fixtureXml("Armor.xml"), { files: {} });
await OggDude.Import.Gear(fixtureXml("Gear.xml"), { files: {} });
await OggDude.Import.Talent(fixtureXml("Talents.xml"), { files: {} });

const { personal_ranges } = await import("../../modules/config/ffg-ranges.js");

const item = (key) => {
  const found = storedByKey(stored, key);
  assert.ok(found, `nothing was imported for ${key}`);
  return found;
};

/**
 * What the weapon itself contributes to a damage roll, mirroring how
 * ItemFFG derives it: the stored value plus every "Weapon Stat" damage
 * modifier the item carries. A characteristic, if any, is added on top of this.
 */
function weaponDamage(weapon) {
  const fromMods = Object.values(weapon.system.attributes ?? {})
    .filter((a) => a.mod === "damage" && a.modtype === "Weapon Stat")
    .reduce((sum, a) => sum + Number(a.value), 0);
  return weapon.system.damage.value + fromMods;
}

/* -------------------------------------------------------------------------- */
/* Weapons                                                                    */
/*                                                                            */
/* Blaster Pistol, EotE p.161: Ranged (Light), Damage 6, Crit 3, Medium,      */
/* Encumbrance 1, HP 3, Price 400, Rarity 4.                                  */
/* -------------------------------------------------------------------------- */

test("a ranged weapon carries its printed profile", () => {
  const weapon = item("BLASTPIS");
  assert.equal(weapon.name, "Blaster Pistol");
  assert.equal(weapon.type, "weapon");
  assert.equal(weapon.system.damage.value, 6);
  assert.equal(weapon.system.crit.value, 3);
  assert.equal(weapon.system.range.value, "Medium");
  assert.equal(weapon.system.skill.value, "Ranged: Light");
  assert.equal(weapon.system.encumbrance.value, 1);
  assert.equal(weapon.system.hardpoints.value, 3);
  assert.equal(weapon.system.price.value, 400);
  assert.equal(weapon.system.rarity.value, 4);
  assert.equal(weapon.system.rarity.isrestricted, false);
});

test("a ranged weapon adds no characteristic to its damage", () => {
  const weapon = item("BLASTPIS");
  assert.equal(weapon.system.skill.useBrawn, false);
  assert.equal(weapon.system.characteristic.value, "");
  assert.equal(weaponDamage(weapon), 6);
});

test("encumbrance starts out unadjusted, equal to the printed value", () => {
  const weapon = item("BLASTPIS");
  assert.equal(weapon.system.encumbrance.adjusted, weapon.system.encumbrance.value);
});

test("every imported weapon's range is a band the system can place", () => {
  for (const key of ["BLASTPIS", "BRASS", "MONCALSPBLASTSP"]) {
    const range = item(key).system.range.value;
    assert.ok(range in personal_ranges, `${key}: "${range}" is not one of ${Object.keys(personal_ranges)}`);
  }
});

test("a weapon's source books are recorded with their page numbers", () => {
  assert.deepEqual(item("BLASTPIS").system.metadata.sources, [
    "Edge of the Empire Core Rulebook pg.161",
    "Age of Rebellion Core Rulebook pg.174",
    "Force and Destiny Core Rulebook pg.167",
  ]);
});

test("a single unwrapped Source element is recorded just like a wrapped list", () => {
  // Mon Calamari Spear Blaster has <Source Page="106">, not <Sources><Source/>.
  assert.deepEqual(item("MONCALSPBLASTSP").system.metadata.sources, [
    "Strongholds of Resistance pg.106",
  ]);
});

test("a weapon is tagged with its categories and its type", () => {
  const tags = item("BLASTPIS").system.metadata.tags;
  assert.deepEqual(tags, ["weapon", "blaster pistol", "blaster", "pistol", "ranged", "energy weapon"]);
});

test("a weapon's description is HTML, with no OggDude markup left behind", () => {
  const description = item("BLASTPIS").system.description;
  assert.match(description, /<h3>Blaster Pistol<\/h3>/);
  assert.doesNotMatch(description, /\[[A-Za-z]\d?\]/, "unconverted OggDude markup");
});

/* -------------------------------------------------------------------------- */
/* Brawn-based weapons                                                        */
/*                                                                            */
/* Brass Knuckles, EotE p.166: Brawl, Damage +1, Crit 4, Engaged.             */
/* Mon Calamari Spear Blaster (Spear), SoR p.106: Melee, Damage +2, Crit 3.   */
/*                                                                            */
/* Both are "Brawn plus a number" weapons. The number must be counted once.   */
/* -------------------------------------------------------------------------- */

test("a Brawl weapon rolls Brawn plus its damage bonus", () => {
  const weapon = item("BRASS");
  assert.equal(weapon.system.skill.value, "Brawl");
  assert.equal(weapon.system.skill.useBrawn, true);
  assert.equal(weapon.system.characteristic.value, "Brawn");
  assert.equal(weapon.system.crit.value, 4);
  assert.equal(weapon.system.range.value, "Engaged");
  assert.equal(weaponDamage(weapon), 1, "Brass Knuckles are Brawn + 1");
});

test("a Melee weapon written with DamageAdd and no Damage rolls Brawn plus that bonus once", () => {
  // <DamageAdd>2</DamageAdd> with no <Damage> element at all. The weapon is
  // Brawn + 2; it must not be counted both as a base damage and as a bonus.
  const weapon = item("MONCALSPBLASTSP");
  assert.equal(weapon.system.skill.value, "Melee");
  assert.equal(weapon.system.skill.useBrawn, true);
  assert.equal(weapon.system.characteristic.value, "Brawn");
  assert.equal(weaponDamage(weapon), 2, "Mon Calamari Spear Blaster (Spear) is Brawn + 2");
});

test("a weapon quality imported earlier is attached as a ranked item modifier", () => {
  // Brass Knuckles carry Pierce 1, and Pierce Quality is in ItemDescriptors.xml.
  const pierce = item("BRASS").system.itemmodifier.find((m) => m.name === "Pierce Quality");
  assert.ok(pierce, "the Pierce quality was not attached");
  assert.equal(pierce.type, "itemmodifier");
  assert.equal(pierce.system.rank, 1);
});

test("a free-text base modifier becomes an item modifier of its own", () => {
  const unique = item("BRASS").system.itemmodifier.find((m) => m.name !== "Pierce Quality");
  assert.ok(unique, "the free-text base modifier was dropped");
  assert.match(unique.system.description, /Perception checks to find brass knuckles/);
});

/* -------------------------------------------------------------------------- */
/* Armour                                                                     */
/*                                                                            */
/* Armored Robes, F&D p.179: Def 1, Soak 2, Price 4500 (R), Enc 5, HP 2, R 8. */
/* Heavy Battle Armor, EotE p.170: Def 1, Soak 2, 5000 (R), Enc 6, HP 4, R 7. */
/* Laminate, EotE p.169: Def 0, Soak 2, Price 2500, Enc 4, HP 3, Rarity 5.    */
/* -------------------------------------------------------------------------- */

test("armour carries its printed defence, soak and encumbrance", () => {
  const armour = item("ARMROBE");
  assert.equal(armour.type, "armour");
  assert.equal(armour.name, "Armored Robes");
  assert.equal(armour.system.defence.value, 1);
  assert.equal(armour.system.soak.value, 2);
  assert.equal(armour.system.encumbrance.value, 5);
  assert.equal(armour.system.encumbrance.adjusted, 5);
  assert.equal(armour.system.hardpoints.value, 2);
  assert.equal(armour.system.price.value, 4500);
  assert.equal(armour.system.rarity.value, 8);
});

test("restricted armour is flagged, unrestricted armour is not", () => {
  assert.equal(item("ARMROBE").system.rarity.isrestricted, true);
  assert.equal(item("HBA").system.rarity.isrestricted, true);
  assert.equal(item("LAM").system.rarity.isrestricted, false);
});

test("a zero defence value survives as 0 rather than being treated as missing", () => {
  const laminate = item("LAM");
  assert.equal(laminate.system.defence.value, 0);
  assert.equal(laminate.system.soak.value, 2);
  assert.equal(laminate.system.hardpoints.value, 3);
});

test("armour is tagged with every one of its categories", () => {
  assert.deepEqual(item("HBA").system.metadata.tags, [
    "armor", "sealable", "full body", "hard full body", "hard", "heavy", "resistant",
  ]);
});

/* -------------------------------------------------------------------------- */
/* Gear                                                                       */
/* -------------------------------------------------------------------------- */

test("gear carries its price, encumbrance and rarity", () => {
  const stimpack = item("STIMPACK");
  assert.equal(stimpack.type, "gear");
  assert.equal(stimpack.system.price.value, 25);
  assert.equal(stimpack.system.encumbrance.value, 0);
  assert.equal(stimpack.system.rarity.value, 1);
  assert.equal(stimpack.system.rarity.isrestricted, false);
});

test("a gear base modifier with only prose becomes a ranked item modifier", () => {
  const mods = item("STIMPACK").system.itemmodifier;
  assert.equal(mods.length, 1);
  assert.equal(mods[0].system.description, "Heals 5 wounds.");
  assert.equal(mods[0].system.rank, 1);
});

test("a gear die modifier becomes a skill boost on the named skill", () => {
  // Medpac: "Grants [BOOST] to all Medicine skill checks", as <SkillKey>MED</SkillKey>
  // with <BoostCount>1</BoostCount>.
  const boost = attributeFor(item("MEDPAC").system.attributes, "Medicine", "Skill Boost");
  assert.ok(boost, "the Medicine boost was lost");
  assert.equal(boost.value, 1);
});

/* -------------------------------------------------------------------------- */
/* Item modifiers (OggDude "item descriptors")                                */
/* -------------------------------------------------------------------------- */

test("a weapon modifier lands in the weapon modifier pack and is typed weapon", () => {
  const accurate = item("ACCURATE");
  assert.equal(accurate.type, "itemmodifier");
  assert.equal(accurate.system.type, "weapon");
  assert.equal(stored.find((e) => e.data === accurate).pack, "oggdude.WeaponMods");
});

test("an untyped modifier falls back to the generic pack and type", () => {
  const cortosis = item("CORTOSIS");
  assert.equal(cortosis.system.type, "all");
  assert.equal(stored.find((e) => e.data === cortosis).pack, "oggdude.GenericMods");
});

test("an armour modifier lands in the armour modifier pack", () => {
  assert.equal(item("DEFADD").system.type, "armor");
  assert.equal(stored.find((e) => e.data === item("DEFADD")).pack, "oggdude.ArmorMods");
});

test("a modifier with an empty Description falls back to its ModDesc", () => {
  assert.equal(item("PIERCE").system.description, "Pierce {0}");
  assert.equal(item("CUMBERSOME").system.description, "Cumbersome {0}");
});

test("the Accurate quality becomes an added boost die", () => {
  const boost = attributeFor(item("ACCURATE").system.attributes, "Add Boost", "Roll Modifiers");
  assert.ok(boost, "Accurate grants no boost die");
  assert.equal(Number(boost.value), 1);
});

/* -------------------------------------------------------------------------- */
/* Talents                                                                    */
/* -------------------------------------------------------------------------- */

test("a passive ranked talent records its activation, rank flag and stat bonus", () => {
  // Grit: ranked, passive, +1 strain threshold per rank.
  const grit = item("GRIT");
  assert.equal(grit.type, "talent");
  assert.equal(grit.system.ranks.ranked, true);
  assert.equal(grit.system.activation.value, "Passive");
  assert.equal(grit.system.activation.label, "SWFFG.TalentActivationsPassive");
  assert.equal(grit.system.isForceTalent, false);
  assert.equal(grit.system.isConflictTalent, false);
  const strain = attributeFor(grit.system.attributes, "Strain", "Stat");
  assert.ok(strain, "Grit grants no strain");
  assert.equal(strain.value, 1);
});

test("Toughened grants two wounds per rank", () => {
  const wounds = attributeFor(item("TOUGH").system.attributes, "Wounds", "Stat");
  assert.ok(wounds);
  assert.equal(wounds.value, 2);
});

test("an out-of-turn incidental talent is labelled as such", () => {
  const dodge = item("DODGE");
  assert.equal(dodge.system.activation.value, "Active (Incidental, Out of Turn)");
  assert.equal(dodge.system.activation.label, "SWFFG.TalentActivationsActiveIncidentalOutofTurn");
  assert.equal(dodge.system.ranks.ranked, true);
});

test("an unranked incidental talent is not marked ranked", () => {
  const quickDraw = item("QUICKDR");
  assert.equal(quickDraw.system.ranks.ranked, false);
  assert.equal(quickDraw.system.activation.value, "Active (Incidental)");
});

test("a Force talent is flagged and raises the Force pool", () => {
  const forceRating = item("FORCERAT");
  assert.equal(forceRating.system.isForceTalent, true);
  const pool = attributeFor(forceRating.system.attributes, "ForcePool", "Stat");
  assert.ok(pool, "Force Rating does not raise the Force pool");
  assert.equal(pool.value, 1);
});

test("a talent with no attributes block gets an empty one, not a missing one", () => {
  assert.deepEqual(item("QUICKDR").system.attributes, {});
  assert.deepEqual(item("QUICKDR").system.metadata.tags, ["talent"]);
});

/* -------------------------------------------------------------------------- */
/* Absent fields                                                              */
/* -------------------------------------------------------------------------- */

test("nothing imported carries an undefined or NaN value", () => {
  const broken = [];
  for (const entry of stored.filter((e) => e.type === "Item")) {
    for (const problem of findBrokenValues(entry.data.system, "")) {
      broken.push(`${entry.data.name} (${entry.data.type}): ${problem}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("the import finished without logging an error", () => {
  assert.deepEqual(env.logs.filter((l) => l.level === "error"), []);
});
