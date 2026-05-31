#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const manifestChecks = [
  {
    baseDir: path.resolve("."),
    manifestPath: path.resolve("system.json"),
    label: "root system.json",
  },
  {
    baseDir: path.resolve("dist"),
    manifestPath: path.resolve("dist", "system.json"),
    label: "dist/system.json",
  },
];

function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`Unable to parse ${manifestPath}`);
    console.error(error);
    process.exit(1);
  }
}

for (const check of manifestChecks) {
  const manifest = readManifest(check.manifestPath);
  const missingEntries = manifest.esmodules.filter((entry) => !fs.existsSync(path.join(check.baseDir, entry)));

  if (missingEntries.length > 0) {
    console.error(`${check.label} is missing Foundry ESM entries:`);
    for (const entry of missingEntries) {
      console.error(`- ${entry}`);
    }
    process.exit(1);
  }

  console.log(`${check.label} parses and all Foundry ESM entries exist`);
}
