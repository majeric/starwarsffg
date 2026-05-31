import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { resolveJsToTsImports } from "./scripts/resolve-js-to-ts-imports.mjs";

// Reference: https://foundryvtt.wiki/en/development/guides/vite
// This build writes Foundry-loadable ES modules to dist/ while preserving paths.
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(rootDir, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "system.json"), "utf8"));
const staticPaths = ["system.json", "template.json", "lang", "templates", "styles", "images", "fonts", "lib"];

function normalizeBuildEntry(entry) {
  return entry.startsWith("dist/") ? entry.slice("dist/".length) : entry;
}

function manifestForPackage() {
  return {
    ...manifest,
    esmodules: manifest.esmodules.map(normalizeBuildEntry),
  };
}

function foundryModuleInputs() {
  return Object.fromEntries(
    manifest.esmodules
      .map(normalizeBuildEntry)
      .filter((entry) => entry.startsWith("modules/"))
      .map((entry) => {
        const key = entry.replace(/\.js$/, "");
        const jsPath = path.resolve(rootDir, entry);
        const tsPath = jsPath.replace(/\.js$/, ".ts");
        return [key, fs.existsSync(jsPath) ? jsPath : tsPath];
      })
  );
}

function copyFoundryAssets() {
  return {
    name: "copy-foundry-assets",
    closeBundle() {
      for (const relativePath of staticPaths) {
        const sourcePath = path.resolve(rootDir, relativePath);
        const targetPath = path.resolve(outDir, relativePath);

        if (relativePath === "system.json") {
          fs.writeFileSync(targetPath, `${JSON.stringify(manifestForPackage(), null, 2)}\n`);
          continue;
        }

        fs.cpSync(sourcePath, targetPath, { recursive: true });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isWatchBuild = process.argv.includes("--watch");

  return {
    resolve: {
      extensions: [".ts", ".js", ".mjs", ".cjs", ".json"],
    },
    plugins: [resolveJsToTsImports(), copyFoundryAssets()],
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: mode === "development" || isWatchBuild,
      target: "es2022",
      rollupOptions: {
        input: foundryModuleInputs(),
        preserveEntrySignatures: "strict",
        output: {
          format: "es",
          preserveModules: true,
          preserveModulesRoot: rootDir,
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
        },
      },
    },
  };
});
