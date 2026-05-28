import js from "@eslint/js";
import globals from "globals";

const foundryGlobals = {
  game: "readonly",
  CONFIG: "readonly",
  Hooks: "readonly",
  canvas: "readonly",
  ui: "readonly",
  foundry: "readonly",
  CONST: "readonly",
  ChatMessage: "readonly",
  PIXI: "readonly",
  $: "readonly",
};

const testGlobals = {
  afterEach: "readonly",
  beforeEach: "readonly",
  cy: "readonly",
  Cypress: "readonly",
  describe: "readonly",
  expect: "readonly",
  it: "readonly",
};

const maintainabilityRules = {
  "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],
  complexity: ["error", 10],
  "max-depth": ["error", 4],
  "max-params": ["error", 5],
};

const recommendedRulesAsWarnings = Object.fromEntries(
  Object.keys(js.configs.recommended.rules).map((ruleName) => [ruleName, "warn"])
);

const legacyMaintainabilityRules = {
  "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
  complexity: ["warn", 10],
  "max-depth": ["warn", 4],
  "max-params": ["warn", 5],
};

export default [
  {
    ignores: ["lib/**", "dist/**", "build/**", "node_modules/**"],
  },
  {
    ...js.configs.recommended,
    rules: recommendedRulesAsWarnings,
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...foundryGlobals,
        ...testGlobals,
      },
    },
    rules: {
      "no-undef": "warn",
      "no-unused-vars": "warn",
    },
  },
  {
    files: ["modules/**/*.js"],
    rules: legacyMaintainabilityRules,
  },
  {
    files: [
      "modules/rules/**/*.{js,ts}",
      "modules/data/**/*.{js,ts}",
      "modules/hooks/**/*.{js,ts}",
      "modules/migrations/**/*.{js,ts}",
    ],
    rules: maintainabilityRules,
  },
];
