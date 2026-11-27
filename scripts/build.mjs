#!/usr/bin/env node
/**
 * Build self-contained OpenKatsura plugin bundle into `dist/`:
 *   dist/
 *     manifest.json
 *     index.js       (single-file ESM bundle with `ws` inlined)
 *
 * Pass `--install-dev` to also copy `dist/` into `~/.katsura-dev/plugins/bridge-qq`
 * (or `$HANA_HOME/plugins/bridge-qq` when HANA_HOME is set).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(ROOT, "src", "index.ts")],
  outfile: path.join(DIST, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  // Provide CJS `require` shim for bundled CommonJS dependencies (e.g. `ws`)
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
  sourcemap: false,
  minify: false,
});

fs.copyFileSync(path.join(ROOT, "manifest.json"), path.join(DIST, "manifest.json"));
console.log(`[build] built self-contained plugin bundle in ${DIST}`);

if (process.argv.includes("--install-dev")) {
  const hanaHome = process.env.HANA_HOME || path.join(os.homedir(), ".katsura-dev");
  const targetDir = path.join(hanaHome, "plugins", "bridge-qq");
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(DIST, targetDir, { recursive: true });
  console.log(`[build] installed dev plugin to ${targetDir}`);
}
