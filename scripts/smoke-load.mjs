#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const buildDir = path.resolve("dist");
const manifestPath = path.join(buildDir, "system.json");

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`Unable to parse ${manifestPath}`);
    console.error(error);
    process.exit(1);
  }
}

const manifest = readManifest();
const missingEntries = manifest.esmodules.filter((entry) => !fs.existsSync(path.join(buildDir, entry)));

if (missingEntries.length > 0) {
  console.error("Build output is missing Foundry ESM entries:");
  for (const entry of missingEntries) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

console.log("system.json parses and all Foundry ESM entries exist in dist/");
