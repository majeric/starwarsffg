/**
 * A deliberately small stand-in for the Foundry globals.
 *
 * It exists so that unit tests can import the system's own modules, which
 * reference `game`, `CONFIG`, `CONST`, `ui` and `foundry.utils` from inside
 * their functions. It is NOT a Foundry emulator: anything that depends on real
 * document behaviour, rendering, or the database belongs in the Playwright
 * suite under tests/, not here.
 *
 * Call installFoundryGlobals() BEFORE importing the module under test, because
 * some modules read globals while they are being evaluated:
 *
 *   import { installFoundryGlobals } from "./harness/foundry.mjs";
 *   installFoundryGlobals();
 *   const { default: Thing } = await import("../../modules/thing.js");
 */

/* -------------------------------------------------------------------------- */
/* utils                                                                      */
/* -------------------------------------------------------------------------- */

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

export function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepClone(v)]));
  }
  return value;
}

export function mergeObject(original, other = {}, { insertKeys = true, overwrite = true } = {}) {
  const result = deepClone(original ?? {});
  for (const [key, value] of Object.entries(other ?? {})) {
    const exists = Object.prototype.hasOwnProperty.call(result, key);
    if (!exists && !insertKeys) continue;
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeObject(result[key], value, { insertKeys, overwrite });
    } else if (!exists || overwrite) {
      result[key] = deepClone(value);
    }
  }
  return result;
}

export function getProperty(object, key) {
  if (!key || !object) return undefined;
  return key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), object);
}

export function setProperty(object, key, value) {
  const parts = key.split(".");
  const last = parts.pop();
  const target = parts.reduce((o, k) => (o[k] ??= {}), object);
  const changed = target[last] !== value;
  target[last] = value;
  return changed;
}

export function flattenObject(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v) && Object.keys(v).length) Object.assign(out, flattenObject(v, key));
    else out[key] = v;
  }
  return out;
}

export function expandObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) setProperty(out, k, v);
  return out;
}

let idCounter = 0;
export function randomID(length = 16) {
  idCounter += 1;
  return `id${String(idCounter).padStart(length - 2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* CONST                                                                      */
/* -------------------------------------------------------------------------- */

export const CONST = Object.freeze({
  CHAT_MESSAGE_STYLES: { OTHER: 0, OOC: 1, IC: 2, EMOTE: 3 },
  TOKEN_DISPOSITIONS: { SECRET: -2, HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1 },
  DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 },
  ACTIVE_EFFECT_MODES: { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 },
  ACTIVE_EFFECT_CHANGE_TYPES: {
    custom: 0, multiply: 10, add: 20, subtract: 20, downgrade: 30, upgrade: 40, override: 50,
  },
  JOURNAL_ENTRY_PAGE_FORMATS: { HTML: 1, MARKDOWN: 2 },
  USER_ROLES: { NONE: 0, PLAYER: 1, TRUSTED: 2, ASSISTANT: 3, GAMEMASTER: 4 },
  BASE_DOCUMENT_TYPE: "base",
});

/* -------------------------------------------------------------------------- */
/* installation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * @param {object}  [options]
 * @param {object}  [options.settings]   Pre-seeded settings, keyed "namespace.key".
 * @param {object}  [options.config]     Extra CONFIG entries (merged over the defaults).
 * @param {object}  [options.game]       Extra game entries (merged over the defaults).
 * @param {boolean} [options.isGM]       Whether the acting user is a GM. Defaults to true.
 * @returns {{notifications: object[], logs: object[], reset: Function}}
 *          `notifications` and `logs` collect what the code under test tried to
 *          surface, so a test can assert on a warning instead of it vanishing.
 */
/**
 * Minimal stand-ins for the Foundry base classes. Modules under test subclass
 * these at import time, so they only have to exist and be constructible; the
 * tests exercise the subclass's own pure methods, not Foundry's behaviour.
 */
function makeBaseClasses() {
  class StubApplication {
    constructor(object = {}, opts = {}) {
      this.object = object;
      this.options = opts;
      this.rendered = false;
    }
    static get defaultOptions() { return {}; }
    render() { this.rendered = true; return this; }
    close() { this.rendered = false; return Promise.resolve(); }
    activateListeners() {}
    getData() { return {}; }
  }
  class StubDocument {
    constructor(data = {}, ctx = {}) {
      Object.assign(this, data);
      this.parent = ctx.parent ?? null;
      this.flags ??= {};
      this.system ??= {};
    }
    static create(data) { return Promise.resolve(new this(data)); }
    update(data) { Object.assign(this, data); return Promise.resolve(this); }
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
    setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
      return Promise.resolve(this);
    }
    toObject() { return deepClone({ ...this }); }
    toJSON() { return this.toObject(); }
  }
  class StubRoll {
    constructor(formula = "", data = {}) {
      this.terms = [];
      this._formula = formula;
      this.data = data;
      this._evaluated = false;
      this._total = 0;
    }
    get formula() { return this._formula; }
    get total() { return this._total; }
    async evaluate() { this._evaluated = true; return this; }
    async roll() { return this.evaluate(); }
    static safeEval(expr) { return Number(expr) || 0; }
  }

  return { StubApplication, StubDocument, StubRoll };
}

export function installFoundryGlobals(options = {}) {
  const notifications = [];
  const logs = [];
  const settings = new Map(Object.entries(options.settings ?? {}));
  const { StubApplication, StubDocument, StubRoll } = makeBaseClasses();

  for (const name of [
    "Application", "FormApplication", "DocumentSheet", "Dialog",
    "ActorSheet", "ItemSheet", "JournalSheet", "JournalPageSheet",
    "CanvasLayer", "InteractionLayer", "PlaceableObject",
  ]) {
    globalThis[name] = class extends StubApplication {};
  }
  for (const name of [
    "Actor", "Item", "Combat", "Combatant", "ActiveEffect", "ChatMessage",
    "JournalEntry", "Folder", "Macro", "Scene", "TokenDocument",
  ]) {
    globalThis[name] = class extends StubDocument {};
  }
  globalThis.Roll = StubRoll;
  globalThis.Collection = Map;
  globalThis.getDocumentClass = (name) => globalThis[name];
  globalThis.fromUuid = async () => null;
  globalThis.fromUuidSync = () => null;
  globalThis.renderTemplate = async (path) => `<!-- ${path} -->`;
  globalThis.getTemplate = async () => () => "";
  globalThis.Handlebars = { registerHelper: () => {}, compile: () => () => "", SafeString: String };
  globalThis.PIXI = { Container: class {}, Text: class {}, Graphics: class {}, Sprite: { from: () => ({}) }, utils: { rgb2hex: () => 0 } };

  const record = (type) => (message) => {
    notifications.push({ type, message });
    return message;
  };

  globalThis.CONST = CONST;
  globalThis.foundry = {
    utils: {
      mergeObject, deepClone, duplicate: deepClone, randomID,
      getProperty, setProperty, flattenObject, expandObject,
      isEmpty: (v) => v == null || Object.keys(v).length === 0,
      debounce: (fn) => fn,
      fromUuid: async () => null,
    },
    CONST,
    applications: {
      handlebars: {
        renderTemplate: async (path) => `<!-- ${path} -->`,
        getTemplate: async () => () => "",
        loadTemplates: async () => [],
      },
      ux: {
        TextEditor: {
          implementation: { enrichHTML: async (html) => html },
          enrichHTML: async (html) => html,
        },
        ContextMenu: class {},
        DragDrop: class {},
        Draggable: class {},
        Tabs: class {},
      },
      api: {
        ApplicationV2: globalThis.Application,
        DialogV2: globalThis.Dialog,
        HandlebarsApplicationMixin: (Base) => class extends Base {},
      },
      apps: { FilePicker: class { browse() { return Promise.resolve(); } } },
      sheets: {},
      sidebar: { tabs: { CombatTracker: globalThis.Application } },
      ui: { GamePause: globalThis.Application },
      fields: {},
    },
    appv1: {
      api: {
        Application: globalThis.Application,
        FormApplication: globalThis.FormApplication,
        DocumentSheet: globalThis.DocumentSheet,
        Dialog: globalThis.Dialog,
      },
      sheets: { ActorSheet: globalThis.ActorSheet, ItemSheet: globalThis.ItemSheet },
    },
    abstract: { TypeDataModel: class { static defineSchema() { return {}; } } },
    data: {
      fields: new Proxy({}, { get: () => class { constructor(opts = {}) { this.options = opts; } } }),
    },
    dice: {
      terms: new Proxy(
        { DiceTerm: class { constructor(d = {}) { Object.assign(this, d); } async evaluate() { return this; } async roll() { return {}; } } },
        { get: (t, k) => t[k] ?? class { constructor(d = {}) { Object.assign(this, d); } } },
      ),
    },
    documents: {
      collections: {
        Actors: { registerSheet: () => {}, unregisterSheet: () => {} },
        Items: { registerSheet: () => {}, unregisterSheet: () => {} },
        CompendiumCollection: { createCompendium: async () => ({}) },
      },
    },
    canvas: {
      placeables: { Token: class {} },
      layers: { CanvasLayer: globalThis.CanvasLayer },
      geometry: { Ray: class { constructor(a, b) { this.A = a; this.B = b; } } },
    },
    audio: { AudioHelper: { play: () => {} } },
    nue: { Tour: class {} },
  };

  globalThis.game = mergeObject(
    {
      system: { version: "2.0.4", id: "starwarsffg" },
      user: { id: "user1", isGM: options.isGM ?? true, name: "Tester" },
      users: [],
      actors: new Map(),
      items: new Map(),
      packs: new Map(),
      folders: new Map(),
      messages: new Map(),
      combats: new Map(),
      i18n: {
        // Return the key itself so assertions can match on it without a lang file.
        localize: (key) => key,
        format: (key, data = {}) =>
          `${key}:${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(",")}`,
        has: () => true,
      },
      settings: {
        get: (namespace, key) => settings.get(`${namespace}.${key}`),
        set: async (namespace, key, value) => settings.set(`${namespace}.${key}`, value),
        register: (namespace, key, cfg) => {
          if (!settings.has(`${namespace}.${key}`)) settings.set(`${namespace}.${key}`, cfg?.default);
        },
        registerMenu: () => {},
        settings: new Map(),
        menus: new Map(),
      },
      ffg: {},
    },
    options.game ?? {},
  );

  globalThis.ui = {
    notifications: {
      error: record("error"),
      warn: record("warn"),
      info: record("info"),
      notify: record("info"),
    },
  };

  globalThis.CONFIG = mergeObject(
    {
      FFG: {},
      Dice: { terms: {}, rolls: [] },
      logger: {
        debug: (...a) => logs.push({ level: "debug", a }),
        warn: (...a) => logs.push({ level: "warn", a }),
        error: (...a) => logs.push({ level: "error", a }),
      },
    },
    options.config ?? {},
  );

  globalThis.Hooks = { on: () => {}, once: () => {}, call: () => true, callAll: () => true, events: {} };

  return {
    notifications,
    logs,
    settings,
    reset() {
      notifications.length = 0;
      logs.length = 0;
    },
  };
}
