import { fromSuedeRoot, suederoot } from "./dirname.js";
import { findNearestNodeModules, copyRecursive } from "./utils.js";
import svgr from "vite-plugin-svgr";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @type {import('vite').UserConfig['server']}
 */
export const server = {
  host: "0.0.0.0",
  fs: {
    allow: [suederoot],
  },
};

export const plugin = {
  /**
   * @param {string} assetsDir
   * @returns {import('vite').Plugin}
   */
  copyLibToAssets: (assetsDir) => ({
    name: "copy-videosdk-lib",
    buildStart() {
      const nodeModulesPath = findNearestNodeModules(suederoot);

      if (!nodeModulesPath)
        return console.error("Could not find node_modules directory");

      const sourceDir = resolve(nodeModulesPath, "@zoom/videosdk/dist/lib");
      if (!existsSync(sourceDir))
        return console.error(`Source directory not found: ${sourceDir}`);

      const targetDir = resolve(assetsDir, "lib");
      if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

      copyRecursive(sourceDir, targetDir);
    },
  }),
  /**
   * @param {string} assetsDir
   * @returns {import('vite').Plugin}
   */
  copyProcessorsToAssets: (assetsDir) => ({
    name: "copy-videosdk-processors",
    buildStart() {
      const sourceDir = resolve(suederoot, "assets/static/processors");
      if (!existsSync(sourceDir))
        return console.error(`Source directory not found: ${sourceDir}`);

      const targetDir = resolve(assetsDir, "static/processors");
      if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

      copyRecursive(sourceDir, targetDir);
    },
  }),
  svgr: svgr({
    svgrOptions: {
      exportType: "named",
      ref: true,
      svgo: false,
      titleProp: true,
    },
    include: fromSuedeRoot("**/*.svg"),
  }),
};

/**
 * @param {{ assetDir: string }} options
 * @returns {import('vite').Plugin[]}
 */
export const plugins = ({ assetDir }) => [
  plugin.copyLibToAssets(assetDir),
  plugin.copyProcessorsToAssets(assetDir),
  plugin.svgr,
];
