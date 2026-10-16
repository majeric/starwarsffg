import test from "node:test";
import assert from "node:assert/strict";

import { installFoundryGlobals } from "./harness/foundry.mjs";

installFoundryGlobals();

const { migrateDataToSystem } = await import("../../modules/helpers/migration.js");

/* -------------------------------------------------------------------------- */
/* The contract                                                               */
/*                                                                            */
/* Foundry stopped shimming "data" into "system" in v12, so the system does it */
/* itself on the way into Document#update. The rewriter therefore has exactly  */
/* one job: the document's own data bag, submitted as "data", must arrive as   */
/* "system". Everything else in the payload is somebody else's key and has to  */
/* come through untouched, because an update object addresses real stored      */
/* paths - renaming one either writes to the wrong place or silently drops the */
/* value.                                                                      */
/* -------------------------------------------------------------------------- */

test("moves a nested data bag to system", () => {
  const result = migrateDataToSystem({
    data: { stats: { credits: { value: 250 } }, attributes: { attr1: { value: 2 } } },
  });

  assert.deepEqual(result, {
    system: { stats: { credits: { value: 250 } }, attributes: { attr1: { value: 2 } } },
  });
});

test("rewrites a flattened data path to a system path", () => {
  const result = migrateDataToSystem({ "data.stats.credits.value": 250 });
  assert.deepEqual(result, { "system.stats.credits.value": 250 });
});

test("leaves keys that are not the data bag alone", () => {
  const result = migrateDataToSystem({
    name: "Jedi",
    img: "icons/svg/mystery-man.svg",
    "flags.starwarsffg.loaded": false,
    _id: "abc123",
  });

  assert.deepEqual(result, {
    name: "Jedi",
    img: "icons/svg/mystery-man.svg",
    "flags.starwarsffg.loaded": false,
    _id: "abc123",
  });
});

test("rewrites only the data bag and nothing else in the same payload", () => {
  const result = migrateDataToSystem({ name: "Jedi", "data.stats.wounds.value": 3 });
  assert.deepEqual(result, { name: "Jedi", "system.stats.wounds.value": 3 });
});

/* -------------------------------------------------------------------------- */
/* Keys that merely contain the word "data"                                   */
/*                                                                            */
/* "data" is an ordinary word. A key is the data bag only when "data" is its   */
/* first path segment; anywhere else it is part of somebody's field name and   */
/* must survive untouched.                                                     */
/* -------------------------------------------------------------------------- */

test("a key that merely contains the word data is left alone", () => {
  const result = migrateDataToSystem({ metadata: 1, dataset: 2, data_source: 3, mydata: 4 });
  assert.deepEqual(result, { metadata: 1, dataset: 2, data_source: 3, mydata: 4 });
});

test("a path whose first segment merely ends in 'data' is left alone", () => {
  // "metadata.source" is a path into a field called metadata. Renaming it to
  // "metasystem.source" writes to a field that does not exist and loses the value.
  const result = migrateDataToSystem({ "metadata.source": "swa-importer" });
  assert.deepEqual(result, { "metadata.source": "swa-importer" });
});

test("a 'data' segment deeper in a path is left alone", () => {
  // Only the leading segment names the document's data bag.
  const result = migrateDataToSystem({ "flags.starwarsffg.data.version": 2 });
  assert.deepEqual(result, { "flags.starwarsffg.data.version": 2 });
});

test("only the leading data segment is rewritten when the path repeats it", () => {
  const result = migrateDataToSystem({ "data.data.value": 7 });
  assert.deepEqual(result, { "system.data.value": 7 });
});

/* -------------------------------------------------------------------------- */
/* Values                                                                     */
/*                                                                            */
/* The rewriter renames keys; it never inspects or rewrites values.           */
/* -------------------------------------------------------------------------- */

test("array values are carried across unchanged", () => {
  const result = migrateDataToSystem({
    data: { itemmodifier: [{ name: "Superior", system: { rank: 2 } }] },
  });

  assert.deepEqual(result.system.itemmodifier, [{ name: "Superior", system: { rank: 2 } }]);
});

test("a nested 'data' key inside a value is not rewritten", () => {
  const result = migrateDataToSystem({ data: { payload: { data: "keep me" } } });
  assert.deepEqual(result, { system: { payload: { data: "keep me" } } });
});

test("falsy values survive the move", () => {
  const result = migrateDataToSystem({ data: { zero: 0, empty: "", no: false, nothing: null } });
  assert.deepEqual(result, { system: { zero: 0, empty: "", no: false, nothing: null } });
});

/* -------------------------------------------------------------------------- */
/* Mixed and already-migrated payloads                                        */
/* -------------------------------------------------------------------------- */

test("merges the data bag into an existing system bag", () => {
  const result = migrateDataToSystem({
    system: { stats: { wounds: { value: 3 } } },
    data: { stats: { strain: { value: 1 } } },
  });

  assert.deepEqual(result, {
    system: { stats: { wounds: { value: 3 }, strain: { value: 1 } } },
  });
  assert.ok(!("data" in result), "the data bag must not be left behind");
});

test("an already-migrated payload is returned unchanged", () => {
  const already = { system: { stats: { wounds: { value: 3 } } }, name: "Jedi" };
  assert.deepEqual(migrateDataToSystem({ ...already }), already);
});

test("migrating twice gives the same result as migrating once", () => {
  const once = migrateDataToSystem({
    name: "Jedi",
    data: { stats: { wounds: { value: 3 } } },
    "data.experience.available": 15,
  });
  const twice = migrateDataToSystem(JSON.parse(JSON.stringify(once)));

  assert.deepEqual(twice, once);
});

/* -------------------------------------------------------------------------- */
/* Empty and absent input                                                     */
/* -------------------------------------------------------------------------- */

test("an empty update object stays empty", () => {
  assert.deepEqual(migrateDataToSystem({}), {});
});

test("an empty data bag still becomes an empty system bag", () => {
  assert.deepEqual(migrateDataToSystem({ data: {} }), { system: {} });
});

test("a missing update object is tolerated rather than thrown over", () => {
  // Nothing is lost by migrating nothing; a rewriter that crashes on an absent
  // payload turns a no-op save into a broken one.
  assert.doesNotThrow(() => migrateDataToSystem(null));
  assert.doesNotThrow(() => migrateDataToSystem(undefined));
});
