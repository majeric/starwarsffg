import { describe, it, expect } from "vitest";
import { buildTalentList } from "../../modules/rules/calculators/talent-list.js";

function makeSpec(id, name, talents) {
  return { id, name, system: { talents } };
}

function makeTalent(id, name, opts = {}) {
  return {
    id,
    name,
    flags: opts.fromSpecies ? { starwarsffg: { fromSpecies: true } } : undefined,
    system: {
      description: opts.description,
      activation: { value: opts.activation, label: opts.activationLabel },
      ranks: { ranked: opts.isRanked === true, current: opts.rank ?? 1 },
      tier: opts.tier,
    },
  };
}

describe("buildTalentList", () => {
  it("returns empty list when no specializations or talents", () => {
    const result = buildTalentList({
      specializations: [],
      talents: [],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result).toEqual([]);
  });

  it("includes only learned talents from a specialization", () => {
    const spec = makeSpec("s1", "Spec One", {
      a: { name: "Alpha", islearned: true, isRanked: false },
      b: { name: "Beta", islearned: false, isRanked: false },
    });
    const result = buildTalentList({
      specializations: [spec],
      talents: [],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result.map((e) => e.name)).toEqual(["Alpha"]);
    expect(result[0].rank).toBe("N/A");
  });

  it("sums ranks across multiple specializations teaching the same ranked talent", () => {
    const t = { name: "Grit", islearned: true, isRanked: true, rank: 1 };
    const specA = makeSpec("a", "A", { x: { ...t } });
    const specB = makeSpec("b", "B", { x: { ...t, rank: 2 } });
    const result = buildTalentList({
      specializations: [specA, specB],
      talents: [],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(3);
    expect(result[0].source).toHaveLength(2);
    expect(result[0].source.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("does not merge non-ranked talents with the same name", () => {
    const t = { name: "Same", islearned: true, isRanked: false };
    const specA = makeSpec("a", "A", { x: { ...t } });
    const specB = makeSpec("b", "B", { x: { ...t } });
    const result = buildTalentList({
      specializations: [specA, specB],
      talents: [],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result).toHaveLength(2);
  });

  it("uses Species source type for talents flagged from species", () => {
    const talent = makeTalent("t1", "Defel Stealth", { fromSpecies: true });
    const result = buildTalentList({
      specializations: [],
      talents: [talent],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result[0].source[0].type).toBe("species");
    expect(result[0].source[0].typeLabel).toBe("SWFFG.Species");
  });

  it("uses Talent source type for ordinary standalone talents", () => {
    const talent = makeTalent("t1", "Toughened");
    const result = buildTalentList({
      specializations: [],
      talents: [talent],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result[0].source[0].type).toBe("talent");
    expect(result[0].source[0].typeLabel).toBe("SWFFG.Talent");
  });

  it("Star Wars mode sorts alphabetically by name", () => {
    const tA = makeTalent("a", "Zeta");
    const tB = makeTalent("b", "Alpha");
    const tC = makeTalent("c", "Mu");
    const result = buildTalentList({
      specializations: [],
      talents: [tA, tB, tC],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result.map((e) => e.name)).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  it("Genesys mode sets tier and sorts by tier", () => {
    const tA = makeTalent("a", "Aa", { tier: 3 });
    const tB = makeTalent("b", "Bb", { tier: 1 });
    const tC = makeTalent("c", "Cc", { tier: 2 });
    const result = buildTalentList({
      specializations: [],
      talents: [tA, tB, tC],
      isStarWars: false,
      sortByActivation: false,
    });
    expect(result.map((e) => e.tier)).toEqual([1, 2, 3]);
  });

  it("marks standalone talents with isDirectlyAdded", () => {
    const talent = makeTalent("t1", "Toughened");
    const result = buildTalentList({
      specializations: [],
      talents: [talent],
      isStarWars: true,
      sortByActivation: false,
    });
    expect(result[0].isDirectlyAdded).toBe(true);
  });

  it("activation sort places Active(Out) before Active(Maneuver) before plain Active before Passive", () => {
    const passive = makeTalent("p", "PassiveOne", { activation: "Passive" });
    const active = makeTalent("a", "ActiveOne", { activation: "Active" });
    const out = makeTalent("o", "OutOne", { activation: "Active (Out of Turn)" });
    const maneuver = makeTalent("m", "ManeuverOne", { activation: "Active (Maneuver)" });
    const result = buildTalentList({
      specializations: [],
      talents: [passive, active, out, maneuver],
      isStarWars: true,
      sortByActivation: true,
    });
    expect(result.map((e) => e.activation)).toEqual([
      "Active (Out of Turn)",
      "Active (Maneuver)",
      "Active",
      "Passive",
    ]);
  });

  it("deep-clones specialization talent entries so source is not mutated", () => {
    const spec = makeSpec("s1", "Spec", {
      a: { name: "Talent", islearned: true, isRanked: false },
    });
    const result = buildTalentList({
      specializations: [spec],
      talents: [],
      isStarWars: true,
      sortByActivation: false,
    });
    result[0].name = "Mutated";
    expect(spec.system.talents.a.name).toBe("Talent");
  });
});
