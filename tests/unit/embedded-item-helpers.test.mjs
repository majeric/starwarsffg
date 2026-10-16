import test from "node:test";
import assert from "node:assert/strict";

// The helper module pulls in Foundry-facing siblings at import time, so exercise the
// pure tree walk directly. This mirrors EmbeddedItemHelpers.findKeysIncludingStringRecursively
// and is kept in step with it by the "matches the shipped implementation" test below.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../../modules/helpers/embeddeditem-helpers.js", import.meta.url)),
  "utf8",
);

// Pull the method out of the shipped source so the tests exercise the real code
// rather than a copy that can drift away from it.
const body = SOURCE.match(
  /static findKeysIncludingStringRecursively\(obj, str, seen = new WeakSet\(\)\) \{([\s\S]*?)\n  \}/,
);
assert.ok(body, "could not locate findKeysIncludingStringRecursively in the source");

const EmbeddedItemHelpers = {};
EmbeddedItemHelpers.findKeysIncludingStringRecursively = new Function(
  "obj",
  "str",
  "seen",
  `seen = seen ?? new WeakSet();\nconst EmbeddedItemHelpers = this;\n${body[1]}`,
).bind(EmbeddedItemHelpers);

const findKeys = (obj, str) => EmbeddedItemHelpers.findKeysIncludingStringRecursively(obj, str);

/* -------------------------------------------------------------------------- */
/* Finding deletion keys                                                      */
/*                                                                            */
/* Foundry deletes a key from a stored object by submitting "-=key": null.    */
/* The sheet has to find those markers anywhere in an update payload.         */
/* -------------------------------------------------------------------------- */

test("finds a matching key at the top level", () => {
  assert.deepEqual(findKeys({ "-=attr1": null, keep: 1 }, "-=attr"), ["-=attr1"]);
});

test("finds matching keys nested at any depth", () => {
  const payload = { system: { attributes: { "-=attr3": null }, other: { deep: { "-=attr9": null } } } };
  assert.deepEqual(findKeys(payload, "-=attr").sort(), ["-=attr3", "-=attr9"]);
});

test("returns nothing when there is no match", () => {
  assert.deepEqual(findKeys({ system: { attributes: { attr1: { value: 2 } } } }, "-=attr"), []);
});

test("ignores inherited properties", () => {
  const parent = { "-=attrInherited": null };
  const child = Object.create(parent);
  child["-=attrOwn"] = null;
  assert.deepEqual(findKeys(child, "-=attr"), ["-=attrOwn"]);
});

test("handles null and primitive values without throwing", () => {
  assert.deepEqual(findKeys({ a: null, b: 3, c: "x", d: undefined }, "-=attr"), []);
  assert.deepEqual(findKeys(null, "-=attr"), []);
  assert.deepEqual(findKeys(undefined, "-=attr"), []);
  assert.deepEqual(findKeys("a string", "-=attr"), []);
});

test("walks arrays of objects", () => {
  assert.deepEqual(findKeys({ mods: [{ "-=attr1": null }, { "-=attr2": null }] }, "-=attr").sort(), [
    "-=attr1",
    "-=attr2",
  ]);
});

/* -------------------------------------------------------------------------- */
/* Cycles                                                                     */
/*                                                                            */
/* Documents and DataModels reference their parents. Walking one without a    */
/* guard recurses until the stack gives out, which is what broke attack rolls */
/* on Foundry v14.                                                            */
/* -------------------------------------------------------------------------- */

test("survives a direct self-reference", () => {
  const obj = { "-=attr1": null };
  obj.self = obj;
  assert.deepEqual(findKeys(obj, "-=attr"), ["-=attr1"]);
});

test("survives a parent back-reference, as a document holds", () => {
  // item.system.parent === item, which is the shape that caused the crash
  const item = { name: "Blaster pistol" };
  item.system = { "-=attr2": null, parent: item };
  assert.deepEqual(findKeys(item, "-=attr"), ["-=attr2"]);
});

test("survives a long reference cycle", () => {
  const a = { "-=attrA": null };
  const b = { a };
  const c = { b };
  a.c = c;
  assert.deepEqual(findKeys(a, "-=attr"), ["-=attrA"]);
});

test("survives a deep chain without blowing the stack", () => {
  let root = { "-=attrLeaf": null };
  for (let i = 0; i < 2000; i++) root = { child: root };
  assert.deepEqual(findKeys(root, "-=attr"), ["-=attrLeaf"]);
});

test("visits a shared object once, not once per reference", () => {
  const shared = { "-=attrShared": null };
  assert.deepEqual(findKeys({ first: shared, second: shared }, "-=attr"), ["-=attrShared"]);
});

/* -------------------------------------------------------------------------- */
/* Guard                                                                      */
/* -------------------------------------------------------------------------- */

test("the shipped implementation still carries a cycle guard", () => {
  assert.match(
    SOURCE,
    /findKeysIncludingStringRecursively\(obj, str, seen = new WeakSet\(\)\)/,
    "the seen-set parameter has been removed; cycles will overflow the stack again",
  );
  assert.match(SOURCE, /seen\.has\(obj\)/, "the visited check has been removed");
});
