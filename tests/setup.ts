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

/**
 * Minimal stand-ins for Foundry's DataModel field classes. They are
 * introspection-only: each records its declared options and can report its
 * declared initial value, which is all the Phase 5 schema tests need. They do
 * NOT validate or clean inputs — that is Foundry's responsibility (ADR-010).
 */
class MockDataField {
  options: AnyRecord;
  constructor(options: AnyRecord = {}) {
    this.options = options;
  }
  getInitial(): unknown {
    return this.options.initial;
  }
}

class StringField extends MockDataField {
  getInitial(): unknown {
    return this.options.initial ?? "";
  }
}

class NumberField extends MockDataField {
  getInitial(): unknown {
    return this.options.initial ?? null;
  }
}

class BooleanField extends MockDataField {
  getInitial(): unknown {
    return this.options.initial ?? false;
  }
}

class HTMLField extends StringField {}

class ObjectField extends MockDataField {
  getInitial(): unknown {
    return this.options.initial ?? {};
  }
}

class ArrayField extends MockDataField {
  element: unknown;
  constructor(element: unknown, options: AnyRecord = {}) {
    super(options);
    this.element = element;
  }
  getInitial(): unknown {
    return this.options.initial ?? [];
  }
}

class SchemaField extends MockDataField {
  fields: AnyRecord;
  constructor(fields: AnyRecord, options: AnyRecord = {}) {
    super(options);
    this.fields = fields;
  }
  getInitial(): AnyRecord {
    const initial: AnyRecord = {};
    for (const [key, field] of Object.entries(this.fields)) {
      initial[key] = (field as MockDataField).getInitial();
    }
    return initial;
  }
}

class TypeDataModel {
  constructor(data: AnyRecord = {}) {
    Object.assign(this, data);
  }
  static defineSchema(): AnyRecord {
    return {};
  }
}

const mockFields = { SchemaField, StringField, NumberField, BooleanField, HTMLField, ObjectField, ArrayField };

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
    abstract: {
      TypeDataModel,
    },
    data: {
      fields: mockFields,
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
