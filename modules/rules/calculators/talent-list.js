/**
 * Build an aggregated talent list for a character-like actor.
 *
 * Mirrors the legacy logic in modules/actors/actor-ffg.js:399-540
 * (`_prepareCharacterData` talent aggregation block) and the
 * `_sortTalents` comparator. Combines learned talents from each
 * specialization with standalone talent items, merging same-named ranked
 * entries by summing ranks and combining source attributions.
 *
 * Inputs are plain objects. The legacy code reads `CONFIG.FFG.theme` and a
 * world setting; this calculator takes `isStarWars` and `sortByActivation`
 * as resolved booleans so it stays pure.
 *
 * @param {{
 *   specializations: Array<{id:string, name:string, system:{talents:object}}>,
 *   talents:         Array<{id:string, name:string, system:object, flags?:object}>,
 *   isStarWars:      boolean,
 *   sortByActivation:boolean
 * }} input
 * @returns {Array<object>} aggregated talent list
 */
export function buildTalentList({ specializations, talents, isStarWars, sortByActivation }) {
  const list = [];
  for (const spec of specializations) {
    addSpecializationTalents(list, spec);
  }
  for (const talent of talents) {
    addStandaloneTalent(list, talent, isStarWars);
  }
  sortList(list, isStarWars);
  return sortByActivation ? applyActivationSort(list) : list;
}

function addSpecializationTalents(list, spec) {
  const talents = spec.system.talents || {};
  const learnedKeys = Object.keys(talents).filter((k) => talents[k].islearned === true);
  for (const key of learnedKeys) {
    const entry = cloneTalent(talents[key]);
    entry.firstSpecialization = spec.id;
    const sourceRef = makeSourceRef("specialization", "SWFFG.Specialization", spec);
    entry.source = [sourceRef];
    entry.rank = entry.isRanked ? (talents[key].rank || 1) : "N/A";
    const rankDelta = talents[key].rank || 1;
    mergeOrPush(list, entry, sourceRef, { rankDelta });
  }
}

function addStandaloneTalent(list, talent, isStarWars) {
  const sourceMeta = standaloneSourceMeta(talent);
  const entry = buildStandaloneEntry(talent, sourceMeta, isStarWars);
  const sourceRef = { ...sourceMeta, name: talent.name, id: talent.id };
  const opts = standaloneMergeOpts(entry, talent, isStarWars);
  mergeOrPush(list, entry, sourceRef, opts);
}

function standaloneSourceMeta(talent) {
  const fromSpecies = talent?.flags?.starwarsffg?.fromSpecies === true;
  if (fromSpecies) return { type: "species", typeLabel: "SWFFG.Species" };
  return { type: "talent", typeLabel: "SWFFG.Talent" };
}

function standaloneMergeOpts(entry, talent, isStarWars) {
  const ranks = talent.system?.ranks;
  const rankDelta = entry.isRanked ? (ranks?.current || 0) : 0;
  const opts = { rankDelta, directlyAdded: true };
  if (!isStarWars) opts.genesysTierSource = parseInt(talent.system?.tier, 10);
  return opts;
}

function buildStandaloneEntry(talent, sourceMeta, isStarWars) {
  const base = standaloneEntryBase(talent);
  base.source = [{ ...sourceMeta, name: talent.name, id: talent.id }];
  if (!isStarWars) base.tier = parseInt(talent.system?.tier, 10);
  return base;
}

function standaloneEntryBase(talent) {
  const sys = talent.system || {};
  const activation = sys.activation || {};
  const ranks = sys.ranks || {};
  const isRanked = ranks.ranked === true;
  return {
    name: talent.name,
    itemId: talent.id,
    description: sys.description,
    activation: activation.value,
    activationLabel: activation.label,
    isRanked,
    rank: isRanked ? ranks.current : "N/A",
  };
}

function mergeOrPush(list, entry, sourceRef, opts) {
  const idx = list.findIndex((existing) => existing.name === entry.name);
  if (idx < 0 || !entry.isRanked) {
    if (opts.directlyAdded) entry.isDirectlyAdded = true;
    list.push(entry);
    return;
  }
  applyMerge(list[idx], sourceRef, opts);
}

function applyMerge(existing, sourceRef, opts) {
  if (opts.directlyAdded) existing.isDirectlyAdded = true;
  existing.source.push(sourceRef);
  existing.rank += opts.rankDelta;
  if (opts.genesysTierSource !== undefined) {
    existing.tier = Math.abs(parseInt(existing.rank) + (opts.genesysTierSource - 1));
  }
}

function sortList(list, isStarWars) {
  if (isStarWars) list.sort(compareByName);
  else list.sort(compareByTier);
}

function compareByName(a, b) {
  if (a.name > b.name) return 1;
  if (a.name < b.name) return -1;
  return 0;
}

function compareByTier(a, b) {
  if (a.tier > b.tier) return 1;
  if (a.tier < b.tier) return -1;
  return 0;
}

function applyActivationSort(list) {
  return list.slice().reverse().sort(compareByActivation);
}

const ACTIVATION_PRIORITY = ["Out", "Maneuver", "Incidental"];

function compareByActivation(a, b) {
  for (const category of ACTIVATION_PRIORITY) {
    const result = compareActiveCategory(a, b, category);
    if (result !== 0) return result;
  }
  const activePlain = compareSimpleActivation(a, b, "Active");
  if (activePlain !== 0) return activePlain;
  return compareSimpleActivation(a, b, "Passive");
}

function compareActiveCategory(a, b, category) {
  const aMatch = matchesActiveCategory(a, category);
  const bMatch = matchesActiveCategory(b, category);
  if (aMatch && !bMatch) return -1;
  if (bMatch && !aMatch) return 1;
  return 0;
}

function matchesActiveCategory(entry, category) {
  const activation = entry?.activation || "";
  return activation.includes("Active") && activation.includes(category);
}

function compareSimpleActivation(a, b, label) {
  const aHas = (a?.activation || "").includes(label);
  const bHas = (b?.activation || "").includes(label);
  if (aHas && !bHas) return -1;
  if (bHas && !aHas) return 1;
  return 0;
}

function cloneTalent(talent) {
  return JSON.parse(JSON.stringify(talent));
}

function makeSourceRef(type, typeLabel, item) {
  return { type, typeLabel, name: item.name, id: item.id };
}
