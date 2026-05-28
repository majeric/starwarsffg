#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const roots = ["modules", "tests"];
const newCodePrefixes = [
  "modules/rules/",
  "modules/data/",
  "modules/settings/",
  "modules/hooks/",
  "modules/migrations/",
];
const findings = [];

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) return walkFiles(entryPath);
    if (/\.(js|ts)$/.test(entry.name)) return [entryPath];
    return [];
  });
}

function words(text) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[a-z][a-z0-9]+/g) ?? [];
}

function identifierWords(line) {
  return words(line.replace(/(["'`]).*?\1/g, " "));
}

function isVacuousComment(comment, nextLine) {
  const commentWords = new Set(words(comment));
  const codeWords = new Set(identifierWords(nextLine));
  if (commentWords.size === 0 || codeWords.size === 0) return false;

  const overlap = [...commentWords].filter((word) => codeWords.has(word)).length;
  return overlap / commentWords.size > 0.5;
}

function isNewCode(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  return newCodePrefixes.some((prefix) => normalized.startsWith(prefix));
}

function inspectFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (let index = 0; index < lines.length - 1; index += 1) {
    const commentStart = lines[index].indexOf("//");
    if (commentStart === -1) continue;
    if (index > 0 && lines[index - 1].includes("// keep-comment")) continue;

    const comment = lines[index].slice(commentStart + 2);
    if (!isVacuousComment(comment, lines[index + 1])) continue;

    findings.push({
      filePath,
      line: index + 1,
      isNewCode: isNewCode(filePath),
    });
  }
}

for (const root of roots) {
  for (const filePath of walkFiles(root)) {
    inspectFile(filePath);
  }
}

for (const finding of findings) {
  console.error(`${finding.filePath}:${finding.line} possible vacuous comment`);
}

if (findings.some((finding) => finding.isNewCode)) {
  process.exit(1);
}
