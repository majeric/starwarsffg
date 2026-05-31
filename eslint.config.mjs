import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

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

function warningRule(ruleValue) {
  if (ruleValue === "off" || ruleValue === 0) return ruleValue;
  if (Array.isArray(ruleValue)) {
    const [severity, ...options] = ruleValue;
    if (severity === "off" || severity === 0) return ruleValue;
    return ["warn", ...options];
  }
  return "warn";
}

const typescriptRecommendedConfigs = tseslint.configs.recommended.map((config) => {
  const recommendedConfig = {
    ...config,
    files: config.files ?? ["**/*.ts"],
  };
  if (config.rules) {
    recommendedConfig.rules = Object.fromEntries(
      Object.entries(config.rules).map(([ruleName, ruleValue]) => [ruleName, warningRule(ruleValue)])
    );
  }
  return recommendedConfig;
});

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
  ...typescriptRecommendedConfigs,
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
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
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
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
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
