import test from "node:test";
import assert from "node:assert/strict";

import {
  installImporterEnvironment,
  fixtureXml,
  readFixture,
  storedByKey,
  attributeFor,
  findBrokenValues,
} from "./harness/oggdude-importer-harness.mjs";

/**
 * Species are the one importer that reads the zip itself rather than being
 * handed a parsed document, so it gets a stand-in zip whose files are the real
 * fixtures under tests/fixtures/oggdude/Species. Everything from the XML text
 * onwards - DOMParser, JXON, the characteristic and threshold mapping - is the
 * system's own code.
 */

const env = await installImporterEnvironment();
const { OggDude, stored } = env;

const SPECIES_FILES = ["Human", "Kaminoan", "Chadra-Fan"];
const zip = {
  files: Object.fromEntries(
    SPECIES_FILES.map((name) => [
      `Data/Species/${name}.xml`,
      { name: `Data/Species/${name}.xml`, dir: false },
    ]),
  ),
  file: (name) => ({
    async: async () => readFixture(name.replace("Data/Species/", "Species/")),
  }),
};

// Skills first: a species' bonus skill is resolved through the skill cache.
await OggDude.Import.Skills(fixtureXml("Skills.xml"), { files: {} });
await OggDude.Import.Species(zip);

const species = (key) => {
  const found = storedByKey(stored, key);
  assert.ok(found, `nothing was imported for ${key}`);
  return found;
};

/** The six starting characteristics, in rulebook order. */
function startingCharacteristics(data) {
  return ["Brawn", "Agility", "Intellect", "Cunning", "Willpower", "Presence"].map((name) => {
    const attribute = attributeFor(data.system.attributes, name, "Characteristic");
    return attribute?.value;
  });
}

/* -------------------------------------------------------------------------- */
/* Human, EotE p.48: 2 in every characteristic, WT 10 + Brawn, ST 10 + Will,  */
/* 110 starting XP.                                                           */
/* -------------------------------------------------------------------------- */

test("a species is imported as a species item keyed by its OggDude id", () => {
  const human = species("HUMAN");
  assert.equal(human.name, "Human");
  assert.equal(human.type, "species");
  assert.equal(human.flags.starwarsffg.ffgimportid, "HUMAN");
});

test("Human starts with 2 in every characteristic", () => {
  assert.deepEqual(startingCharacteristics(species("HUMAN")), [2, 2, 2, 2, 2, 2]);
});

test("Human's wound and strain thresholds are carried over as stat modifiers", () => {
  const human = species("HUMAN");
  const wounds = attributeFor(human.system.attributes, "Wounds", "Stat");
  const strain = attributeFor(human.system.attributes, "Strain", "Stat");
  assert.equal(wounds?.value, 10);
  assert.equal(strain?.value, 10);
});

test("Human starts with 110 experience", () => {
  assert.equal(species("HUMAN").system.startingXP, 110);
});

test("starting characteristics and thresholds are excluded from the modifier tab", () => {
  // They are the species' baseline, not bonuses stacked on top of one, so the
  // sheet must not offer them for editing as ordinary modifiers.
  const human = species("HUMAN");
  for (const name of ["Brawn", "Presence", "Wounds", "Strain"]) {
    const attribute = Object.values(human.system.attributes).find((a) => a.mod === name);
    assert.equal(attribute.exclude, true, `${name} is not excluded`);
  }
});

test("Experience is not turned into a modifier of its own", () => {
  const names = Object.values(species("HUMAN").system.attributes).map((a) => a.mod);
  assert.ok(!names.includes("Experience"), `attributes: ${names.join(", ")}`);
});

test("a species ability is recorded with its name and description", () => {
  const abilities = Object.values(species("HUMAN").system.abilities);
  assert.equal(abilities.length, 1);
  assert.equal(abilities[0].name, "Additional Non-Career Skills");
  assert.equal(abilities[0].type, "ability");
  assert.match(abilities[0].system.description, /one rank in two different non-career/);
});

test("a species description drops the duplicated heading and converts the markup", () => {
  const description = species("HUMAN").system.description;
  assert.doesNotMatch(description, /\[[A-Za-z]\d?\]/, "unconverted OggDude markup");
  assert.doesNotMatch(description, /^\s*Humans\b/, "the heading duplicating the item name was kept");
  assert.match(description, /Please see page 48/);
});

test("a species records its source books with page numbers", () => {
  assert.deepEqual(species("HUMAN").system.metadata.sources, [
    "Edge of the Empire Core Rulebook pg.48",
    "Age of Rebellion Core Rulebook pg.57",
    "Force and Destiny Core Rulebook pg.55",
  ]);
  // Chadra-Fan uses a bare <Source Page="20"> with no <Sources> wrapper.
  assert.deepEqual(species("CHADRA").system.metadata.sources, ["Stay on Target pg.20"]);
});

/* -------------------------------------------------------------------------- */
/* Kaminoan, Rise of the Separatists p.14: 1/2/3/2/2/2, WT 9, ST 10, 100 XP,  */
/* one rank of Medicine, and a setback on Charm checks.                       */
/* -------------------------------------------------------------------------- */

test("Kaminoan's uneven starting characteristics are read in the right order", () => {
  assert.deepEqual(startingCharacteristics(species("KAMINOAN")), [1, 2, 3, 2, 2, 2]);
});

test("Kaminoan's thresholds and experience match the printed entry", () => {
  const kaminoan = species("KAMINOAN");
  assert.equal(attributeFor(kaminoan.system.attributes, "Wounds", "Stat")?.value, 9);
  assert.equal(attributeFor(kaminoan.system.attributes, "Strain", "Stat")?.value, 10);
  assert.equal(kaminoan.system.startingXP, 100);
});

test("a species bonus skill becomes a rank in that skill, under its system key", () => {
  const medicine = attributeFor(species("KAMINOAN").system.attributes, "Medicine", "Skill Rank");
  assert.ok(medicine, "the free rank of Medicine was lost");
  assert.equal(medicine.value, 1);
  // A free starting rank is a bonus the player keeps, not part of the baseline.
  assert.equal(medicine.exclude, false);
});

test("a species ability that adds a setback becomes a setback on that skill", () => {
  const charm = attributeFor(species("KAMINOAN").system.attributes, "Charm", "Skill Setback");
  assert.ok(charm, "Expressionless adds no setback to Charm");
  assert.equal(charm.value, 1);
});

test("every option of every option choice becomes an ability", () => {
  const abilities = Object.values(species("KAMINOAN").system.abilities);
  assert.deepEqual(
    abilities.map((a) => a.system.description),
    [
      "Kaminoans add [SE] to all Charm checks they make.",
      "Other characters add [SE] to all social skill checks made against Kaminoans.",
    ],
  );
});

/* -------------------------------------------------------------------------- */
/* Chadra-Fan, Stay on Target p.20: 1/3/3/2/1/2, WT 9, ST 11, 90 XP, one rank */
/* of Mechanics, and up to two setbacks removed from Perception.              */
/* -------------------------------------------------------------------------- */

test("Chadra-Fan's characteristics, thresholds and experience match the printed entry", () => {
  const chadra = species("CHADRA");
  assert.deepEqual(startingCharacteristics(chadra), [1, 3, 3, 2, 1, 2]);
  assert.equal(attributeFor(chadra.system.attributes, "Wounds", "Stat")?.value, 9);
  assert.equal(attributeFor(chadra.system.attributes, "Strain", "Stat")?.value, 11);
  assert.equal(chadra.system.startingXP, 90);
});

test("Chadra-Fan's free rank of Mechanics survives the import", () => {
  const mechanics = attributeFor(species("CHADRA").system.attributes, "Mechanics", "Skill Rank");
  assert.ok(mechanics);
  assert.equal(mechanics.value, 1);
});

test("an ability that removes setbacks is a removal, not an addition", () => {
  // Acute Senses removes up to two setback dice from Perception; importing it
  // as an added setback would invert the species' signature ability.
  const perception = attributeFor(species("CHADRA").system.attributes, "Perception");
  assert.ok(perception, "Acute Senses was lost");
  assert.equal(perception.modtype, "Skill Remove Setback");
  assert.equal(perception.value, 2);
});

test("an empty TalentModifiers element does not break the import", () => {
  assert.deepEqual(species("CHADRA").system.talents, {});
});

/* -------------------------------------------------------------------------- */
/* Shape                                                                      */
/* -------------------------------------------------------------------------- */

test("all three species are imported, and tagged as species", () => {
  const imported = stored.filter((entry) => entry.data.type === "species");
  assert.equal(imported.length, 3);
  for (const entry of imported) {
    assert.deepEqual(entry.data.system.metadata.tags, ["species"]);
    assert.equal(entry.pack, "oggdude.Species");
  }
});

test("no species carries an undefined or NaN value", () => {
  const broken = [];
  for (const entry of stored.filter((e) => e.data.type === "species")) {
    for (const problem of findBrokenValues(entry.data.system, "")) {
      broken.push(`${entry.data.name}: ${problem}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("the species import finished without logging an error", () => {
  assert.deepEqual(env.logs.filter((l) => l.level === "error"), []);
});
