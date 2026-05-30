// Foundry V13 types are provided by the fvtt-types npm alias.
// Source: @league-of-foundry-developers/foundry-vtt-types@13.346.0-beta.20250812191140.
// The declarations are installed as a dependency instead of vendored here.
/// <reference types="fvtt-types" />

declare global {
  // FIXME(types): FFG dice results attached to DiceTerm results and die instances
  interface FFGDiceResult {
    success: number;
    failure: number;
    advantage: number;
    threat: number;
    triumph: number;
    despair: number;
    light: number;
    dark: number;
  }

  // FIXME(types): RollFFG added result entry
  interface FFGAddedResult {
    type: string;
    symbol: string;
    value: number;
    negative: boolean;
  }

  interface SettingConfig {
    [key: `starwarsffg.${string}`]: any;
  }

  interface CONFIG {
    FFG: Record<string, any>;
    logger: Pick<Console, "debug" | "error" | "info" | "log" | "warn">;
  }

  interface Canvas {
    groupmanager?: {
      window?: {
        render: (...args: any[]) => void;
      };
    };
  }

  // FIXME(types): game.ffg namespace used by the system
  interface Game {
    ffg: {
      RollFFG: any;
      diceterms: any[];
      [key: string]: any;
    };
  }

}

export {};
