import test from "node:test";
import assert from "node:assert/strict";

import {
  installImporterEnvironment,
  fixtureXml,
  storedByKey,
} from "./harness/oggdude-importer-harness.mjs";

/**
 * The OggDude skill import does two jobs. It writes a journal entry per skill,
 * and it builds CONFIG.temporary.skills - the OggDude-key to system-key map
 * every later phase uses to turn "RANGLT" into "Ranged: Light". Getting that
 * map wrong silently mis-files every weapon, species bonus and career skill in
 * the dataset, so it is worth pinning down against the real Skills.xml.
 */

const env = await installImporterEnvironment();
const { ImportHelpers, OggDude, stored } = env;

const skillsXml = fixtureXml("Skills.xml");
const SKILLS = globalThis.JXON.xmlToJs(fixtureXml("Skills.xml")).Skills.Skill;

// The zip is only consulted for artwork, which the harness stubs out.
await OggDude.Import.Skills(skillsXml, { files: {} });

const { defaultSkillList } = await import("../../modules/config/ffg-skillslist.js");
const systemSkills = defaultSkillList.find((list) => list.id === "starwars").skills;

/** OggDude's characteristic keys, as the rulebooks name them. */
const CHARACTERISTIC = {
  BR: "Brawn",
  AG: "Agility",
  INT: "Intellect",
  CUN: "Cunning",
  WIL: "Willpower",
  PR: "Presence",
};

const byKey = (key) => SKILLS.find((skill) => skill.Key === key);

/* -------------------------------------------------------------------------- */
/* Key normalisation                                                          */
/*                                                                            */
/* OggDude writes "Piloting - Planetary" and a bare "Core Worlds"; the system */
/* keys them "Piloting: Planetary" and "Knowledge: Core Worlds".              */
/* -------------------------------------------------------------------------- */

test("a plain skill key resolves to its system key", () => {
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("ASTRO"), "Astrogation");
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("BRAWL"), "Brawl");
});

test("a hyphenated skill key resolves to the colon-separated system key", () => {
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("PILOTPL"), "Piloting: Planetary");
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("RANGLT"), "Ranged: Light");
});

test("a knowledge skill key gains the Knowledge prefix the system uses", () => {
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("CORE"), "Knowledge: Core Worlds");
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("XEN"), "Knowledge: Xenology");
});

test("an unknown key resolves to nothing rather than a guess", () => {
  assert.equal(ImportHelpers.oggSkillKeyToSystemKey("NOTASKILL"), undefined);
});

test("every skill in Skills.xml resolves to a skill the system knows", () => {
  const unresolved = SKILLS
    .map((skill) => [skill.Key, ImportHelpers.oggSkillKeyToSystemKey(skill.Key)])
    .filter(([, systemKey]) => !systemKey || !(systemKey in systemSkills));
  assert.deepEqual(unresolved, [], "these OggDude skill keys have no system skill");
});

/* -------------------------------------------------------------------------- */
/* The skill cache the rest of the import depends on                          */
/* -------------------------------------------------------------------------- */

test("the import publishes every skill into CONFIG.temporary.skills", () => {
  for (const skill of SKILLS) {
    assert.equal(
      CONFIG.temporary.skills[skill.Key],
      ImportHelpers.oggSkillKeyToSystemKey(skill.Key),
      `${skill.Key} (${skill.Name})`,
    );
  }
  assert.equal(Object.keys(CONFIG.temporary.skills).length, SKILLS.length);
});

/* -------------------------------------------------------------------------- */
/* Characteristic and category                                                */
/*                                                                            */
/* The dataset states a skill's governing characteristic; the system carries  */
/* its own copy in the default skill list. They have to agree, or a character */
/* imported from the dataset rolls the wrong characteristic.                  */
/* -------------------------------------------------------------------------- */

test("Astrogation is an Intellect skill in both the dataset and the system", () => {
  const skill = byKey("ASTRO");
  assert.equal(skill.CharKey, "INT");
  assert.equal(systemSkills["Astrogation"].characteristic, "Intellect");
});

test("Lightsaber is a Brawn combat skill in both the dataset and the system", () => {
  const skill = byKey("LTSABER");
  assert.equal(skill.CharKey, "BR");
  assert.equal(skill.TypeValue, "stCombat");
  assert.equal(systemSkills["Lightsaber"].characteristic, "Brawn");
  assert.equal(systemSkills["Lightsaber"].type, "Combat");
});

test("every skill's characteristic matches the system's default skill list", () => {
  const mismatches = [];
  for (const skill of SKILLS) {
    const systemKey = ImportHelpers.oggSkillKeyToSystemKey(skill.Key);
    const definition = systemSkills[systemKey];
    const expected = CHARACTERISTIC[skill.CharKey];
    if (!definition || definition.characteristic !== expected) {
      mismatches.push(`${skill.Key}: dataset says ${expected}, system says ${definition?.characteristic}`);
    }
  }
  assert.deepEqual(mismatches, []);
});

test("combat and knowledge skills are categorised the same way on both sides", () => {
  // The system splits OggDude's "General" into General and Social, which is a
  // presentation choice, so only the two categories both sides name are pinned.
  const mismatches = [];
  for (const skill of SKILLS) {
    const definition = systemSkills[ImportHelpers.oggSkillKeyToSystemKey(skill.Key)];
    const expected = { stCombat: "Combat", stKnowledge: "Knowledge" }[skill.TypeValue];
    if (expected && definition?.type !== expected) {
      mismatches.push(`${skill.Key}: dataset says ${expected}, system says ${definition?.type}`);
    }
    if (!expected && ["Combat", "Knowledge"].includes(definition?.type)) {
      mismatches.push(`${skill.Key}: dataset says ${skill.TypeValue}, system says ${definition?.type}`);
    }
  }
  assert.deepEqual(mismatches, []);
});

/* -------------------------------------------------------------------------- */
/* The journal entries                                                        */
/* -------------------------------------------------------------------------- */

test("one journal entry is written per skill, keyed by its OggDude id", () => {
  assert.equal(stored.length, SKILLS.length);
  assert.ok(stored.every((entry) => entry.type === "JournalEntry"));
  for (const skill of SKILLS) {
    assert.ok(storedByKey(stored, skill.Key), `no journal entry for ${skill.Key}`);
  }
});

test("a knowledge skill's journal is named the way the system keys it", () => {
  const journal = storedByKey(stored, "CORE");
  assert.equal(journal.name, "Knowledge: Core Worlds");
  assert.equal(journal.pages[0].name, "Knowledge: Core Worlds");
});

test("a hyphenated skill's journal name uses the system's colon form", () => {
  assert.equal(storedByKey(stored, "PILOTPL").name, "Piloting: Planetary");
  assert.equal(storedByKey(stored, "RANGHVY").name, "Ranged: Heavy");
});

test("a plain skill's journal name is left alone", () => {
  assert.equal(storedByKey(stored, "BRAWL").name, "Brawl");
});

test("the journal page holds the description with the OggDude markup converted", () => {
  const page = storedByKey(stored, "ASTRO").pages[0];
  assert.equal(page.type, "text");
  assert.ok(page.text.content.includes("Please see page 104"), page.text.content);
  // [H4]Astrogation (Intellect)[h4] duplicates the entry title and is dropped;
  // nothing else may survive as raw dataset markup.
  assert.doesNotMatch(page.text.content, /\[[A-Za-z]+\]/, "unconverted OggDude markup left in the page");
  assert.doesNotMatch(page.text.content, /Astrogation \(Intellect\)/, "the duplicated heading was not dropped");
});

test("a skill with no description still gets page text rather than an empty page", () => {
  for (const skill of SKILLS) {
    const page = storedByKey(stored, skill.Key).pages[0];
    assert.ok(page.text.content.length > 0, `${skill.Key} has an empty page`);
  }
});

test("journal icons distinguish combat, knowledge and general skills", () => {
  assert.equal(storedByKey(stored, "BRAWL").img, "icons/svg/combat.svg");
  assert.equal(storedByKey(stored, "CORE").img, "icons/svg/book.svg");
  assert.equal(storedByKey(stored, "ASTRO").img, "icons/svg/eye.svg");
});

test("a skill journal records its source books and invents no stray fields", () => {
  // The importer gathers "Page 104 - Edge of the Empire Core Rulebook..." for
  // every skill, so that text has to reach the reader - i.e. the page - and
  // nothing the importer writes may carry an interpolated "undefined".
  const journal = storedByKey(stored, "ASTRO");
  const junk = Object.entries(journal)
    .filter(([, value]) => typeof value === "string" && /\b(undefined|NaN)\b/.test(value))
    .map(([key, value]) => `${key}: ${JSON.stringify(value.slice(0, 60))}`);
  assert.deepEqual(junk, [], "a field was built out of an undefined value");
  assert.match(
    journal.pages[0].text.content,
    /Edge of the Empire Core Rulebook/,
    "the source books the importer collected never reach the journal page",
  );
});
