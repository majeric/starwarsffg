type AnyRecord = Record<string, any>;

const root = globalThis as AnyRecord;

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeObject(original: AnyRecord = {}, other: AnyRecord = {}) {
  for (const [key, value] of Object.entries(other)) {
    if (isPlainObject(original[key]) && isPlainObject(value)) {
      original[key] = mergeObject(original[key], value);
      continue;
    }

    original[key] = value;
  }

  return original;
}

export function resetFoundryGlobals() {
  root.game = {
    i18n: {
      localize: (key: string) => key,
    },
    settings: {
      get: () => undefined,
      register: () => undefined,
      set: () => undefined,
    },
  };
  root.CONFIG = {};
  root.Hooks = {
    call: () => undefined,
    callAll: () => undefined,
    on: () => undefined,
    once: () => undefined,
  };
  root.CONST = {};
  root.foundry = {
    utils: {
      mergeObject,
    },
  };
  root.ui = {
    notifications: {
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined,
    },
  };
}

root.resetFoundryGlobals = resetFoundryGlobals;
resetFoundryGlobals();
