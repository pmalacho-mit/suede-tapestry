import preprocessReact from "svelte-preprocess-react/preprocessReact";
import path from "node:path";
import dirname, { suederoot } from "./dirname.js";

/**
 * NOTE: This function appends `preprocessReact()` to your list of preprocessors.
 * `preprocessReact()` MUST BE the last preprocessor in the list.
 * See {@link https://github.com/bfanger/svelte-preprocess-react?tab=readme-ov-file#setup--installation}
 * @param  {import("svelte/compiler").PreprocessorGroup[]} preprocessors
 * @returns
 */
export const preprocess = (...preprocessors) => [
  ...preprocessors,
  preprocessReact(),
];

/**
 * @typedef {Object} TSConfig
 * @property {string[]} [include]
 * @property {string[]} [exclude]
 * @property {string[]} [files]
 * @property {string} [extends]
 * @property {Object} compilerOptions
 * @property {string} [compilerOptions.target]
 * @property {string} [compilerOptions.module]
 * @property {string[]} [compilerOptions.lib]
 * @property {string} [compilerOptions.outDir]
 * @property {string} [compilerOptions.rootDir]
 * @property {boolean} [compilerOptions.strict]
 * @property {boolean} [compilerOptions.esModuleInterop]
 * @property {boolean} [compilerOptions.skipLibCheck]
 * @property {boolean} [compilerOptions.forceConsistentCasingInFileNames]
 * @property {string} [compilerOptions.moduleResolution]
 * @property {boolean} [compilerOptions.resolveJsonModule]
 * @property {boolean} [compilerOptions.isolatedModules]
 * @property {string} [compilerOptions.jsx]
 * @property {boolean} [compilerOptions.allowJs]
 * @property {boolean} [compilerOptions.checkJs]
 * @property {boolean} [compilerOptions.noEmit]
 * @property {boolean} [compilerOptions.incremental]
 * @property {string} [compilerOptions.baseUrl]
 * @property {Object.<string, string[]>} [compilerOptions.paths]
 * @property {string[]} [compilerOptions.types]
 * @property {boolean} [compilerOptions.sourceMap]
 * @property {boolean} [compilerOptions.declaration]
 * @property {boolean} [compilerOptions.declarationMap]
 * @property {boolean} [compilerOptions.composite]
 * @property {string} [compilerOptions.tsBuildInfoFile]
 * @property {boolean} [compilerOptions.allowSyntheticDefaultImports]
 * @property {boolean} [compilerOptions.noUnusedLocals]
 * @property {boolean} [compilerOptions.noUnusedParameters]
 * @property {boolean} [compilerOptions.noImplicitReturns]
 * @property {boolean} [compilerOptions.noFallthroughCasesInSwitch]
 * @property {boolean} [compilerOptions.noUncheckedIndexedAccess]
 * @property {boolean} [compilerOptions.noImplicitOverride]
 * @property {boolean} [compilerOptions.verbatimModuleSyntax]
 */

/** @type {import('@sveltejs/kit').KitConfig} */
export const kit = {
  typescript: {
    /**
     * @param {TSConfig} tsconfig
     */
    config: (tsconfig) => {
      tsconfig.include.push(path.resolve(dirname, "../**/*.tsx"));
      tsconfig.include.push(path.resolve(dirname, "../**/*.ts"));
      tsconfig.include.push(path.resolve(dirname, "../**/*.svelte"));
      tsconfig.compilerOptions.jsx = "react-jsx";
    },
  },
};

/**
 * @param {string} alias
 * @returns {import('@sveltejs/kit').KitConfig}
 */
export const kitWithAlias = (alias) => ({
  ...kit,
  alias: {
    [`${alias}`]: suederoot,
    [`${alias}/*`]: `${suederoot}/*`,
  },
});
