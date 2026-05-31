import { beforeEach, describe, expect, it } from "vitest";
import { DicePoolFFG } from "../../modules/dice/pool.js";

beforeEach(() => {
  globalThis.resetFoundryGlobals();
});

describe("DicePoolFFG upgrade", () => {
  it("promotes ability dice to proficiency dice before adding new ability dice", () => {
    const pool = new DicePoolFFG({ ability: 2 });

    pool.upgrade(3);

    expect(pool.ability).toBe(1);
    expect(pool.proficiency).toBe(2);
  });

  it("downgrades proficiency dice back to ability dice", () => {
    const pool = new DicePoolFFG({ ability: 1, proficiency: 2 });

    pool.upgrade(-2);

    expect(pool.ability).toBe(3);
    expect(pool.proficiency).toBe(0);
  });
});

describe("DicePoolFFG upgradeDifficulty", () => {
  it("promotes difficulty dice to challenge dice before adding new difficulty dice", () => {
    const pool = new DicePoolFFG({ difficulty: 1 });

    pool.upgradeDifficulty(2);

    expect(pool.difficulty).toBe(1);
    expect(pool.challenge).toBe(1);
  });

  it("downgrades challenge dice back to difficulty dice", () => {
    const pool = new DicePoolFFG({ difficulty: 1, challenge: 2 });

    pool.upgradeDifficulty(-2);

    expect(pool.difficulty).toBe(3);
    expect(pool.challenge).toBe(0);
  });
});

describe("DicePoolFFG renderDiceExpression", () => {
  it("renders only dice with positive counts in FFG shorthand order", () => {
    const pool = new DicePoolFFG({
      proficiency: 1,
      ability: 2,
      challenge: 0,
      difficulty: 3,
      boost: 1,
      setback: 0,
      force: 2,
    });

    expect(pool.renderDiceExpression()).toBe("1dp+2da+3di+1db+2df");
  });

  it("applies remove-setback modifiers when the setting is enabled", () => {
    globalThis.game.settings.get = (namespace, key) => namespace === "starwarsffg" && key === "ApplyRemoveSetbackMods";
    const pool = new DicePoolFFG({ setback: 3, remsetback: 1 });

    expect(pool.renderDiceExpression()).toBe("2ds");
  });
});
