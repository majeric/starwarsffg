/**
 * Pure utility functions for OggDude data conversion.
 * No Foundry runtime dependencies — testable in isolation.
 */

const OG_CHARACTERISTICS = {
  BR: "Brawn",
  AG: "Agility",
  INT: "Intellect",
  CUN: "Cunning",
  WIL: "Willpower",
  PR: "Presence",
};

export function convertOGCharacteristic(value) {
  return OG_CHARACTERISTICS[value];
}

export function getAttributeObject(attrs) {
  const result = {};
  const STAT_MAP = {
    SoakValue: { mod: "Soak", modtype: "Stat" },
    ForceRating: { mod: "ForcePool", modtype: "Stat" },
    StrainThreshold: { mod: "Strain", modtype: "Stat" },
    DefenseRanged: { mod: "Defence-Ranged", modtype: "Stat" },
    DefenseMelee: { mod: "Defence-Melee", modtype: "Stat" },
    WoundThreshold: { mod: "Wounds", modtype: "Stat" },
  };

  for (const [key, mapping] of Object.entries(STAT_MAP)) {
    if (attrs[key]) {
      result[mapping.mod] = { ...mapping, value: attrs[key] };
    }
  }
  return result;
}

export function getSources(sources) {
  if (!sources) return "";

  let sourceArray = [];
  if (!sources?.Source) {
    sourceArray = [sources];
  } else if (!Array.isArray(sources.Source)) {
    sourceArray = [sources.Source];
  } else {
    sourceArray = sources.Source;
  }

  const text = sourceArray.map((s) => {
    if (s?.$Page) return `Page ${s.$Page} - ${s._}<br>`;
    return `${s}<br>`;
  });

  return `<p><h3>Sources:</h3>${text.join("")}</p>`;
}

export function getSourcesAsArray(sources) {
  const parsed = [];
  if (!sources) return parsed;

  if (sources?._) sources.Source = [sources];

  try {
    if (!Array.isArray(sources.Source)) {
      sources.Source = [sources.Source];
    }
    for (const source of sources.Source) {
      if (source?.$Page) {
        parsed.push(`${source._} pg.${source.$Page}`);
      } else {
        parsed.push(source._);
      }
    }
  } catch {
    return parsed;
  }
  return parsed;
}

export function prepareBaseObject(obj, type) {
  return {
    name: obj.Name,
    type,
    flags: { starwarsffg: { ffgimportid: obj.Key } },
    data: {},
  };
}
