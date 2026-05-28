#!/usr/bin/env node

import { spawn } from "node:child_process";

const gates = [
  { name: "typecheck", command: "npx", args: ["tsc", "--noEmit"] },
  { name: "lint", command: "npx", args: ["eslint", ".", "--max-warnings", "0"] },
  { name: "comments", command: "node", args: ["scripts/check-comments.mjs"] },
  { name: "unit tests", command: "npx", args: ["vitest", "run"] },
  { name: "build", command: "npx", args: ["vite", "build"] },
  { name: "smoke load", command: "node", args: ["scripts/smoke-load.mjs"] },
  { name: "migration replay", command: "node", args: ["scripts/replay-migrations.mjs"] },
];

function runGate(gate) {
  return new Promise((resolve) => {
    const child = spawn(gate.command, gate.args, {
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

const results = [];

for (const gate of gates) {
  const code = await runGate(gate);

  if (code === 0) {
    console.log(`[PASS] ${gate.name}`);
    results.push({ ...gate, code });
    continue;
  }

  console.error(`[FAIL] ${gate.name}`);
  results.push({ ...gate, code });
}

console.log("");
console.log("Verification summary:");

for (const result of results) {
  const status = result.code === 0 ? "PASS" : "FAIL";
  console.log(`[${status}] ${result.name}`);
}

const firstFailure = results.find((result) => result.code !== 0);

if (firstFailure) {
  console.error("[FAIL] verify");
  process.exit(firstFailure.code);
}

console.log("[PASS] verify");
