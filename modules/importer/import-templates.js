/**
 * Default actor data templates used by the NPC and character importers.
 * Extracted from ImportHelpers to reduce the monolith's size (~460 lines of
 * data literals). These are the starting shapes that the import orchestrators
 * deep-clone and populate from OggDude XML data.
 */

/* eslint-disable max-lines -- data literals */

const SKILL_KEYS = [
  ["Astrogation", "ASTRO"],
  ["Athletics", "ATHL"],
  ["Brawl", "BRAWL"],
  ["Charm", "CHARM"],
  ["Coercion", "COERC"],
  ["Computers", "COMP"],
  ["Cool", "COOL"],
  ["Coordination", "COORD"],
  ["Deception", "DECEP"],
  ["Discipline", "DISC"],
  ["Gunnery", "GUNN"],
  ["Leadership", "LEAD"],
  ["Lightsaber", "LTSABER"],
  ["Mechanics", "MECH"],
  ["Medicine", "MED"],
  ["Melee", "MELEE"],
  ["Negotiation", "NEG"],
  ["Perception", "PERC"],
  ["Piloting: Planetary", "PILOTPL"],
  ["Piloting: Space", "PILOTSP"],
  ["Ranged: Heavy", "RANGHVY"],
  ["Ranged: Light", "RANGLT"],
  ["Resilience", "RESIL"],
  ["Skulduggery", "SKUL"],
  ["Stealth", "STEAL"],
  ["Streetwise", "SW"],
  ["Survival", "SURV"],
  ["Vigilance", "VIGIL"],
  ["Knowledge: Core Worlds", "CORE"],
  ["Knowledge: Education", "EDU"],
  ["Knowledge: Lore", "LORE"],
  ["Knowledge: Outer Rim", "OUT"],
  ["Knowledge: Underworld", "UND"],
  ["Knowledge: Warfare", "WARF"],
  ["Knowledge: Xenology", "XEN"],
];

function buildSkills(defaultKey) {
  const skills = {};
  for (const [name, key] of SKILL_KEYS) {
    skills[name] = { rank: 0, [defaultKey]: false, Key: key };
  }
  skills.Cybernetics = {
    rank: 0,
    [defaultKey]: false,
    Key: "CYBERNETICS",
    custom: true,
    type: "General",
    characteristic: "Intellect",
    label: "Cybernetics",
  };
  return skills;
}

function buildCharacteristics() {
  const result = {};
  for (const name of ["Brawn", "Agility", "Intellect", "Cunning", "Willpower", "Presence"]) {
    result[name] = { value: 0 };
  }
  return result;
}

export const minionTemplate = {
  name: "no name",
  type: "minion",
  data: {
    biography: "",
    stats: { forcePool: { max: 0 }, credits: { value: 0 } },
    characteristics: buildCharacteristics(),
    skills: buildSkills("groupskill"),
    attributes: {},
    quantity: { value: 1, max: 1 },
  },
  flags: {},
  items: [],
};

export const characterTemplate = {
  name: "No Name",
  type: "character",
  flags: {},
  data: {
    attributes: {},
    characteristics: buildCharacteristics(),
    skills: buildSkills("careerskill"),
    stats: { forcePool: { max: 0 }, credits: { value: 0 } },
    experience: {},
    obligationlist: {},
    dutylist: {},
    morality: {},
    biography: "",
    general: {},
  },
  items: [],
};
