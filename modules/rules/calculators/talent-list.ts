interface SourceRef {
  type: string;
  typeLabel: string;
  name: string;
  id: string;
}

interface TalentEntry {
  name: string;
  itemId?: string;
  description?: string;
  activation?: string;
  activationLabel?: string;
  isRanked: boolean;
  rank: number | string;
  firstSpecialization?: string;
  source: SourceRef[];
  isDirectlyAdded?: boolean;
  tier?: number;
}

interface MergeOpts {
  rankDelta: number;
  directlyAdded?: boolean;
  genesysTierSource?: number;
}

interface SpecializationItem {
  id: string;
  name: string;
  system: {
    talents: Record<string, Record<string, unknown>>;
  };
}

interface TalentItem {
  id: string;
  name: string;
  system?: Record<string, unknown>;
  flags?: Record<string, unknown>;
}

interface TalentListInput {
  specializations: SpecializationItem[];
  talents: TalentItem[];
  isStarWars: boolean;
  sortByActivation: boolean;
}

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
 */
export function buildTalentList({ specializations, talents, isStarWars, sortByActivation }: TalentListInput): TalentEntry[] {
  const list: TalentEntry[] = [];
  for (const spec of specializations) {
    addSpecializationTalents(list, spec);
  }
  for (const talent of talents) {
    addStandaloneTalent(list, talent, isStarWars);
  }
  sortList(list, isStarWars);
  return sortByActivation ? applyActivationSort(list) : list;
}

function addSpecializationTalents(list: TalentEntry[], spec: SpecializationItem): void {
  const talents = spec.system.talents || {};
  const learnedKeys = Object.keys(talents).filter((k) => talents[k].islearned === true);
  for (const key of learnedKeys) {
    const entry = cloneTalent(talents[key]) as unknown as TalentEntry;
    entry.firstSpecialization = spec.id;
    const sourceRef = makeSourceRef("specialization", "SWFFG.Specialization", spec);
    entry.source = [sourceRef];
    entry.rank = entry.isRanked ? ((talents[key].rank as number) || 1) : "N/A";
    const rankDelta = (talents[key].rank as number) || 1;
    mergeOrPush(list, entry, sourceRef, { rankDelta });
  }
}

function addStandaloneTalent(list: TalentEntry[], talent: TalentItem, isStarWars: boolean): void {
  const sourceMeta = standaloneSourceMeta(talent);
  const entry = buildStandaloneEntry(talent, sourceMeta, isStarWars);
  const sourceRef: SourceRef = { ...sourceMeta, name: talent.name, id: talent.id };
  const opts = standaloneMergeOpts(entry, talent, isStarWars);
  mergeOrPush(list, entry, sourceRef, opts);
}

function standaloneSourceMeta(talent: TalentItem): { type: string; typeLabel: string } {
  const fromSpecies = (talent?.flags as Record<string, unknown>)?.starwarsffg as Record<string, unknown> | undefined;
  if (fromSpecies?.fromSpecies === true) return { type: "species", typeLabel: "SWFFG.Species" };
  return { type: "talent", typeLabel: "SWFFG.Talent" };
}

function standaloneMergeOpts(entry: TalentEntry, talent: TalentItem, isStarWars: boolean): MergeOpts {
  const ranks = talent.system?.ranks as Record<string, unknown> | undefined;
  const rankDelta = entry.isRanked ? ((ranks?.current as number) || 0) : 0;
  const opts: MergeOpts = { rankDelta, directlyAdded: true };
  if (!isStarWars) opts.genesysTierSource = parseInt(talent.system?.tier as string, 10);
  return opts;
}

function buildStandaloneEntry(talent: TalentItem, sourceMeta: { type: string; typeLabel: string }, isStarWars: boolean): TalentEntry {
  const base = standaloneEntryBase(talent);
  base.source = [{ ...sourceMeta, name: talent.name, id: talent.id }];
  if (!isStarWars) base.tier = parseInt(talent.system?.tier as string, 10);
  return base;
}

function standaloneEntryBase(talent: TalentItem): TalentEntry {
  const sys = talent.system || {};
  const activation = (sys.activation || {}) as Record<string, unknown>;
  const ranks = (sys.ranks || {}) as Record<string, unknown>;
  const isRanked = ranks.ranked === true;
  return {
    name: talent.name,
    itemId: talent.id,
    description: sys.description as string | undefined,
    activation: activation.value as string | undefined,
    activationLabel: activation.label as string | undefined,
    isRanked,
    rank: isRanked ? (ranks.current as number) : "N/A",
    source: [],
  };
}

function mergeOrPush(list: TalentEntry[], entry: TalentEntry, sourceRef: SourceRef, opts: MergeOpts): void {
  const idx = list.findIndex((existing) => existing.name === entry.name);
  if (idx < 0 || !entry.isRanked) {
    if (opts.directlyAdded) entry.isDirectlyAdded = true;
    list.push(entry);
    return;
  }
  applyMerge(list[idx], sourceRef, opts);
}

function applyMerge(existing: TalentEntry, sourceRef: SourceRef, opts: MergeOpts): void {
  if (opts.directlyAdded) existing.isDirectlyAdded = true;
  existing.source.push(sourceRef);
  (existing.rank as number) += opts.rankDelta;
  if (opts.genesysTierSource !== undefined) {
    existing.tier = Math.abs(parseInt(existing.rank as string) + (opts.genesysTierSource - 1));
  }
}

function sortList(list: TalentEntry[], isStarWars: boolean): void {
  if (isStarWars) list.sort(compareByName);
  else list.sort(compareByTier);
}

function compareByName(a: TalentEntry, b: TalentEntry): number {
  if (a.name > b.name) return 1;
  if (a.name < b.name) return -1;
  return 0;
}

function compareByTier(a: TalentEntry, b: TalentEntry): number {
  if ((a.tier ?? 0) > (b.tier ?? 0)) return 1;
  if ((a.tier ?? 0) < (b.tier ?? 0)) return -1;
  return 0;
}

function applyActivationSort(list: TalentEntry[]): TalentEntry[] {
  return list.slice().reverse().sort(compareByActivation);
}

const ACTIVATION_PRIORITY = ["Out", "Maneuver", "Incidental"];

function compareByActivation(a: TalentEntry, b: TalentEntry): number {
  for (const category of ACTIVATION_PRIORITY) {
    const result = compareActiveCategory(a, b, category);
    if (result !== 0) return result;
  }
  const activePlain = compareSimpleActivation(a, b, "Active");
  if (activePlain !== 0) return activePlain;
  return compareSimpleActivation(a, b, "Passive");
}

function compareActiveCategory(a: TalentEntry, b: TalentEntry, category: string): number {
  const aMatch = matchesActiveCategory(a, category);
  const bMatch = matchesActiveCategory(b, category);
  if (aMatch && !bMatch) return -1;
  if (bMatch && !aMatch) return 1;
  return 0;
}

function matchesActiveCategory(entry: TalentEntry, category: string): boolean {
  const activation = entry?.activation || "";
  return activation.includes("Active") && activation.includes(category);
}

function compareSimpleActivation(a: TalentEntry, b: TalentEntry, label: string): number {
  const aHas = (a?.activation || "").includes(label);
  const bHas = (b?.activation || "").includes(label);
  if (aHas && !bHas) return -1;
  if (bHas && !aHas) return 1;
  return 0;
}

function cloneTalent(talent: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(talent));
}

function makeSourceRef(type: string, typeLabel: string, item: { name: string; id: string }): SourceRef {
  return { type, typeLabel, name: item.name, id: item.id };
}
