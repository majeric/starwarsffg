// Foundry V13 types are provided by the fvtt-types npm alias.
// Source: @league-of-foundry-developers/foundry-vtt-types@13.346.0-beta.20250812191140.
// The declarations are installed as a dependency instead of vendored here.
/// <reference types="fvtt-types" />

declare global {
  interface SettingConfig {
    [key: `starwarsffg.${string}`]: any;
  }

  interface CONFIG {
    FFG: Record<string, any>;
  }

  interface Canvas {
    groupmanager?: {
      window?: {
        render: (...args: any[]) => void;
      };
    };
  }
}

export {};
