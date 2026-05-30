/**
 * RulesSystem interface — abstracts Star Wars vs Genesys differences.
 *
 * The active implementation is set during init as CONFIG.FFG.rules and
 * read by any code that previously branched on CONFIG.FFG.theme.
 *
 * Phase 10: replaces inline `if (CONFIG.FFG.theme !== "starwars")` checks
 * with method calls on the active rules system.
 */

export class StarWarsRules {
  get id() { return "starwars"; }
  get displayName() { return "Star Wars"; }

  get sortTalentsByTier() { return false; }
  get diceFont() { return "EotE Symbol"; }

  diceImagePath(color) {
    return `systems/starwarsffg/images/dice/starwars/${color}.png`;
  }

  talentTier() { return undefined; }

  compareTalents(a, b) {
    return a.name.localeCompare(b.name);
  }
}

export class GenesysRules {
  get id() { return "genesys"; }
  get displayName() { return "Genesys"; }

  get sortTalentsByTier() { return true; }
  get diceFont() { return "Genesys"; }

  diceImagePath(color) {
    return `systems/starwarsffg/images/dice/genesys/${color}.png`;
  }

  talentTier(element) {
    return parseInt(element?.system?.tier, 10);
  }

  compareTalents(a, b) {
    return (a.tier ?? 0) - (b.tier ?? 0);
  }
}

export function createRulesSystem(themeId) {
  if (themeId && themeId !== "starwars") {
    return new GenesysRules();
  }
  return new StarWarsRules();
}
