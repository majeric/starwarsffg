/**
 * RulesSystem interface — abstracts Star Wars vs Genesys differences.
 *
 * The active implementation is set during init as CONFIG.FFG.rules and
 * read by any code that previously branched on CONFIG.FFG.theme.
 *
 * Phase 10: replaces inline `if (CONFIG.FFG.theme !== "starwars")` checks
 * with method calls on the active rules system.
 */

export interface TalentLike {
  name?: string;
  tier?: number;
  system?: Record<string, unknown> & { tier?: string | number };
}

export interface RulesSystem {
  readonly id: string;
  readonly displayName: string;
  readonly sortTalentsByTier: boolean;
  readonly diceFont: string;
  diceImagePath(color: string): string;
  talentTier(element?: TalentLike): number | undefined;
  compareTalents(a: TalentLike, b: TalentLike): number;
}

export class StarWarsRules implements RulesSystem {
  get id(): string { return "starwars"; }
  get displayName(): string { return "Star Wars"; }

  get sortTalentsByTier(): boolean { return false; }
  get diceFont(): string { return "EotE Symbol"; }

  diceImagePath(color: string): string {
    return `systems/starwarsffg/images/dice/starwars/${color}.png`;
  }

  talentTier(): undefined { return undefined; }

  compareTalents(a: TalentLike, b: TalentLike): number {
    return a.name!.localeCompare(b.name!);
  }
}

export class GenesysRules implements RulesSystem {
  get id(): string { return "genesys"; }
  get displayName(): string { return "Genesys"; }

  get sortTalentsByTier(): boolean { return true; }
  get diceFont(): string { return "Genesys"; }

  diceImagePath(color: string): string {
    return `systems/starwarsffg/images/dice/genesys/${color}.png`;
  }

  talentTier(element?: TalentLike): number {
    return Number.parseInt(String(element?.system?.tier), 10);
  }

  compareTalents(a: TalentLike, b: TalentLike): number {
    return (a.tier ?? 0) - (b.tier ?? 0);
  }
}

export function createRulesSystem(themeId?: string | null): RulesSystem {
  if (themeId && themeId !== "starwars") {
    return new GenesysRules();
  }
  return new StarWarsRules();
}
