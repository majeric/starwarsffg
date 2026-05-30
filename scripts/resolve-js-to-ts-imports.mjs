import fs from "node:fs";
import path from "node:path";

function stripQuery(id) {
  return id.split("?")[0];
}

function resolveTsSibling(source, importer) {
  if (!importer || !source.startsWith(".") || !source.endsWith(".js")) {
    return null;
  }

  const importerPath = stripQuery(importer);
  const jsPath = path.resolve(path.dirname(importerPath), source);
  const tsPath = jsPath.replace(/\.js$/, ".ts");

  if (fs.existsSync(jsPath) || !fs.existsSync(tsPath)) {
    return null;
  }

  return tsPath;
}

export function resolveJsToTsImports() {
  return {
    name: "resolve-js-to-ts-imports",
    enforce: "pre",
    resolveId(source, importer) {
      return resolveTsSibling(source, importer);
    },
  };
}
