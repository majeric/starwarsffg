/**
 * Harness for the OggDude importer unit tests.
 *
 * The importers are written against a browser: they parse XML with DOMParser,
 * walk it with the vendored JXON library, show progress through jQuery, and
 * finish by writing documents into a compendium pack. Node has none of that.
 *
 * This module supplies the missing pieces so that the *real* importer code can
 * be run end to end against the real fixtures in tests/fixtures/oggdude:
 *
 *   - a tiny XML reader, installed as globalThis.DOMParser, that produces nodes
 *     with just enough of the DOM surface for the real JXON to walk
 *     (nodeType / nodeName / nodeValue / childNodes / attributes);
 *   - the real lib/jxon/jxon.min.js, evaluated into globalThis.JXON;
 *   - a no-op jQuery stand-in for the progress bars;
 *   - stubs for the handful of ImportHelpers methods that talk to the database,
 *     the zip file or the image folder. Everything between "here is the XML"
 *     and "here is the document to store" is the system's own code.
 *
 * The one deliberate substitution is the XML reader itself: Node ships no
 * DOMParser and the repo has no XML dependency installed. JXON's output shape
 * (the "$Attr" / "_" convention the importers rely on) is still produced by the
 * real JXON.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { installFoundryGlobals } from "./foundry.mjs";

/* -------------------------------------------------------------------------- */
/* A minimal XML reader                                                       */
/* -------------------------------------------------------------------------- */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_NODE = 4;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

class StubNodeList {
  constructor(items = []) { this.items = items; }
  get length() { return this.items.length; }
  item(index) { return this.items[index]; }
}

function makeNode(nodeType, nodeName) {
  return {
    ELEMENT_NODE,
    TEXT_NODE,
    CDATA_SECTION_NODE: CDATA_NODE,
    COMMENT_NODE,
    DOCUMENT_NODE,
    nodeType,
    nodeName,
    nodeValue: null,
    childNodes: new StubNodeList(),
    attributes: new StubNodeList(),
    hasChildNodes() { return this.childNodes.length > 0; },
    hasAttributes() { return this.attributes.length > 0; },
  };
}

/** Index of the ">" that closes the tag opening at `start`, quote-aware. */
function findTagEnd(text, start) {
  let quote = null;
  for (let i = start + 1; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return i;
    }
  }
  return -1;
}

/**
 * Parse an XML string into a document-like tree. One contiguous run of
 * character data becomes one text node, as a real DOMParser produces.
 */
export function parseXmlDocument(source) {
  const text = String(source).replace(/^﻿/, "");
  const doc = makeNode(DOCUMENT_NODE, "#document");
  const open = [doc];
  const append = (node) => open[open.length - 1].childNodes.items.push(node);

  let index = 0;
  while (index < text.length) {
    const lt = text.indexOf("<", index);
    if (lt === -1) {
      const node = makeNode(TEXT_NODE, "#text");
      node.nodeValue = decodeEntities(text.slice(index));
      append(node);
      break;
    }
    if (lt > index) {
      const node = makeNode(TEXT_NODE, "#text");
      node.nodeValue = decodeEntities(text.slice(index, lt));
      append(node);
    }

    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt);
      const node = makeNode(COMMENT_NODE, "#comment");
      node.nodeValue = text.slice(lt + 4, end);
      append(node);
      index = end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt);
      const node = makeNode(CDATA_NODE, "#cdata-section");
      node.nodeValue = text.slice(lt + 9, end);
      append(node);
      index = end + 3;
      continue;
    }
    if (text.startsWith("<?", lt)) {
      index = text.indexOf("?>", lt) + 2;
      continue;
    }
    if (text.startsWith("<!", lt)) {
      index = text.indexOf(">", lt) + 1;
      continue;
    }

    const gt = findTagEnd(text, lt);
    if (gt === -1) throw new Error(`Unterminated tag at offset ${lt}`);
    const raw = text.slice(lt + 1, gt);

    if (raw[0] === "/") {
      open.pop();
      index = gt + 1;
      continue;
    }

    const selfClosing = raw.endsWith("/");
    const body = selfClosing ? raw.slice(0, -1) : raw;
    const nameMatch = /^([^\s/>]+)([\s\S]*)$/.exec(body);
    if (!nameMatch) throw new Error(`Unreadable tag "${raw}"`);

    const element = makeNode(ELEMENT_NODE, nameMatch[1]);
    const attrPattern = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let attr;
    while ((attr = attrPattern.exec(nameMatch[2])) !== null) {
      element.attributes.items.push({
        name: attr[1],
        value: decodeEntities(attr[2] ?? attr[3]),
      });
    }

    append(element);
    if (!selfClosing) open.push(element);
    index = gt + 1;
  }

  return doc;
}

/* -------------------------------------------------------------------------- */
/* The real JXON, loaded without a module system                              */
/* -------------------------------------------------------------------------- */

const JXON_SOURCE = readFileSync(
  fileURLToPath(new URL("../../../lib/jxon/jxon.min.js", import.meta.url)),
  "utf8",
);

export function loadJxon() {
  const root = {};
  // The library sniffs for AMD / CommonJS and otherwise attaches itself to the
  // object it was called with. Hide the module globals so it takes that branch.
  const load = new Function(
    "window",
    `var define = undefined, exports = undefined, module = undefined, require = undefined;
     ${JXON_SOURCE}
     return this.JXON;`,
  );
  return load.call(root, root);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

export function fixturePath(relative) {
  return fileURLToPath(new URL(`../../fixtures/oggdude/${relative}`, import.meta.url));
}

export function readFixture(relative) {
  return readFileSync(fixturePath(relative), "utf8");
}

export function fixtureXml(relative) {
  return parseXmlDocument(readFixture(relative));
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

/** A chainable no-op standing in for the jQuery the progress bars use. */
function makeJQueryStub() {
  const chain = new Proxy(function () {}, {
    get: () => () => chain,
    apply: () => chain,
  });
  return () => chain;
}

/**
 * Install everything the OggDude importers expect to find on the global object,
 * then return the module under test together with a record of what it stored.
 *
 * @param {object} [options]
 * @param {object} [options.skills] Pre-seeded CONFIG.temporary.skills.
 * @returns {Promise<object>} { ImportHelpers, OggDude, stored, logs, notifications }
 */
export async function installImporterEnvironment({ skills } = {}) {
  const { skills: ffgSkills } = await import("../../../modules/config/ffg-skills.js");
  const { defaultSkillList } = await import("../../../modules/config/ffg-skillslist.js");

  const harness = installFoundryGlobals({
    config: { FFG: { skills: ffgSkills }, temporary: { skills: skills ?? {} } },
    settings: {
      "starwarsffg.skilltheme": "starwars",
      "starwarsffg.arraySkillList": defaultSkillList,
    },
  });

  globalThis.DOMParser = class {
    parseFromString(text) { return parseXmlDocument(text); }
  };
  globalThis.JXON = loadJxon();
  globalThis.$ = makeJQueryStub();
  globalThis.randomId = () => globalThis.foundry.utils.randomID();

  const { default: ImportHelpers } = await import("../../../modules/importer/import-helpers.js");
  const { default: OggDude } = await import("../../../modules/importer/oggdude/oggdude.js");
  const { migrateDataToSystem } = await import("../../../modules/helpers/migration.js");

  /** Everything the importer tried to write, in order. */
  const stored = [];

  ImportHelpers.getCompendiumPack = async (type, name) => ({
    documentName: type,
    collection: name,
    metadata: { id: name, name, package: "world" },
  });
  // Stands in for the compendium write. The real one renames `data` to `system`
  // and stamps an id on the way in, which later phases then look up, so do the
  // same here rather than storing something no later phase would recognise.
  ImportHelpers.addImportItemToCompendium = async (type, data, pack) => {
    const document = migrateDataToSystem(data);
    document._id ??= globalThis.foundry.utils.randomID();
    document.id ??= document._id;
    document.uuid ??= `Compendium.${pack?.collection}.${document._id}`;
    stored.push({ type, data: document, pack: pack?.collection });
    return document;
  };
  // A later phase resolving a key an earlier phase imported (a weapon quality
  // finding its item modifier, say) is part of what is under test, so serve
  // those lookups out of what has already been stored.
  ImportHelpers.findCompendiumEntityByImportId = async (type, id) =>
    stored.find((e) => e.type === type && e.data?.flags?.starwarsffg?.ffgimportid === id)?.data;
  ImportHelpers.findCompendiumEntityByName = async (type, name) =>
    stored.find((e) => e.type === type && e.data?.name === name)?.data;
  ImportHelpers.findCompendiumEntityById = async (type, id) =>
    stored.find((e) => e.type === type && e.data?._id === id)?.data;
  // No zip, so no artwork: the importers must cope with that on their own.
  ImportHelpers.getImageFilename = async () => undefined;
  ImportHelpers.importImage = async () => undefined;

  return { ...harness, ImportHelpers, OggDude, stored };
}

/** Find a stored document by its OggDude import id. */
export function storedByKey(stored, key) {
  return stored.find((entry) => entry.data?.flags?.starwarsffg?.ffgimportid === key)?.data;
}

/** The single attribute entry matching a mod/modtype pair, or undefined. */
export function attributeFor(attributes, mod, modtype) {
  const matches = Object.values(attributes ?? {}).filter(
    (a) => a.mod === mod && (modtype === undefined || a.modtype === modtype),
  );
  if (matches.length > 1) throw new Error(`expected one "${mod}" attribute, found ${matches.length}`);
  return matches[0];
}

/**
 * Walk a value and collect dotted paths whose leaf is undefined, NaN, or a
 * string that has had "undefined"/"NaN" interpolated into it.
 */
export function findBrokenValues(value, path = "", found = []) {
  if (value === undefined) {
    found.push(`${path} is undefined`);
  } else if (typeof value === "number" && Number.isNaN(value)) {
    found.push(`${path} is NaN`);
  } else if (typeof value === "string" && /\b(undefined|NaN)\b/.test(value)) {
    found.push(`${path} contains "${value.match(/\b(undefined|NaN)\b/)[0]}": ${JSON.stringify(value.slice(0, 80))}`);
  } else if (Array.isArray(value)) {
    value.forEach((entry, i) => findBrokenValues(entry, `${path}[${i}]`, found));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      findBrokenValues(entry, path ? `${path}.${key}` : key, found);
    }
  }
  return found;
}
