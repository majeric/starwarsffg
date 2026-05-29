import { describe, it, expect } from "vitest";
import { CharacterData } from "../../../modules/data/actor/character-data.js";

describe("CharacterData schema", () => {
  const schema = CharacterData.defineSchema();

  it("composes the full humanoid templates plus the player-character meta fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "attributes",
      "biography",
      "career",
      "characteristics",
      "conflict",
      "duty",
      "encumbrance",
      "experience",
      "general",
      "metadata",
      "morality",
      "obligation",
      "skills",
      "specialisation",
      "species",
      "stats",
    ]);
  });

  it("keeps a top-level encumbrance distinct from stats.encumbrance", () => {
    expect(schema.encumbrance.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.stats.getInitial()).toHaveProperty("encumbrance");
  });

  it("defaults the meta point pools and experience to zero", () => {
    expect(schema.obligation.getInitial()).toEqual({ value: 0 });
    expect(schema.experience.getInitial()).toEqual({ total: 0, available: 0 });
  });
});
