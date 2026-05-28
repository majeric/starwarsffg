#!/usr/bin/env node
/**
 * Replay all registered migrations against fixture worlds in test-worlds/.
 *
 * Each fixture is a directory with:
 *   - version.txt    (one line: the upstream version this fixture was captured at)
 *   - actors.json    (array of actor source objects)
 *   - items.json     (array of top-level world item source objects)
 *   - settings.json  (key-value of relevant settings at capture time)
 *
 * When test-worlds/ does not exist or contains no fixtures, the script
 * prints "no fixtures yet" and exits 0 (matches the Phase 0 placeholder
 * behavior so the verify gate stays green during the period before
 * fixtures are captured).
 *
 * NOTE: Full replay requires Foundry document instances that this
 * script does not provide; only fixture parsing + the runner's
 * version-selection logic is exercised here. End-to-end replay against
 * real worlds is a Phase 11 follow-up that runs Foundry headless.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fixturesRoot = join(repoRoot, "test-worlds");
const runnerUrl = pathToFileURL(join(repoRoot, "modules/migrations/runner.js")).href;

if (!existsSync(fixturesRoot)) {
  console.log("migration replay: no fixtures yet");
  process.exit(0);
}

const fixtureDirs = readdirSync(fixturesRoot)
  .map((name) => join(fixturesRoot, name))
  .filter((path) => statSync(path).isDirectory());

if (fixtureDirs.length === 0) {
  console.log("migration replay: no fixtures yet");
  process.exit(0);
}

const { compareVersions } = await import(runnerUrl);

let failed = 0;

for (const dir of fixtureDirs) {
  const summary = replayFixture(dir);
  if (summary.errors.length > 0) {
    failed += 1;
    console.error(`[FAIL] ${summary.name}: ${summary.errors.length} error(s)`);
    for (const err of summary.errors) {
      console.error(`  - ${err}`);
    }
  } else {
    console.log(`[PASS] ${summary.name}: parsed ${summary.docCount} docs, version ${summary.version}`);
  }
}

if (failed > 0) {
  console.error(`migration replay: ${failed} fixture(s) failed`);
  process.exit(1);
}

console.log(`migration replay: ${fixtureDirs.length} fixture(s) passed`);

function replayFixture(dir) {
  const name = dir.split(/[\\/]/).pop();
  const errors = [];
  const version = readFile(dir, "version.txt", errors)?.trim();
  const actors = parseJson(dir, "actors.json", errors) ?? [];
  const items = parseJson(dir, "items.json", errors) ?? [];
  const settings = parseJson(dir, "settings.json", errors) ?? {};

  if (!version) {
    errors.push("missing or unreadable version.txt");
    return { name, errors, docCount: 0 };
  }

  if (compareVersions(version, "0.0.1") < 0) {
    errors.push(`invalid version string: ${JSON.stringify(version)}`);
  }

  void settings;
  return {
    name,
    errors,
    version,
    docCount: (Array.isArray(actors) ? actors.length : 0) + (Array.isArray(items) ? items.length : 0),
  };
}

function readFile(dir, filename, errors) {
  const path = join(dir, filename);
  if (!existsSync(path)) {
    errors.push(`missing ${filename}`);
    return undefined;
  }
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    errors.push(`unreadable ${filename}: ${err.message}`);
    return undefined;
  }
}

function parseJson(dir, filename, errors) {
  const raw = readFile(dir, filename, errors);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch (err) {
    errors.push(`invalid JSON in ${filename}: ${err.message}`);
    return undefined;
  }
}
