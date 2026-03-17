import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { config } from "../config.js";

let cachedFreighterBundle: Promise<string> | null = null;

function resolveBrowserEntry() {
  const tsEntry = fileURLToPath(new URL("../browser/freighter-x402.ts", import.meta.url));
  if (existsSync(tsEntry)) {
    return tsEntry;
  }

  return fileURLToPath(new URL("../browser/freighter-x402.js", import.meta.url));
}

export async function getFreighterBrowserBundle() {
  if (!cachedFreighterBundle || config.nodeEnv === "development") {
    const bundlePromise = build({
      entryPoints: [resolveBrowserEntry()],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: ["es2022"],
      write: false,
      minify: config.nodeEnv !== "development",
      sourcemap: config.nodeEnv === "development" ? "inline" : false,
    })
      .then((result) => result.outputFiles[0]?.text || "")
      .catch((error) => {
        if (cachedFreighterBundle === bundlePromise) {
          cachedFreighterBundle = null;
        }
        throw error;
      });

    cachedFreighterBundle = bundlePromise;
  }

  return cachedFreighterBundle;
}
