import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';
import info from './package-lock.json' with { type: 'json' };

const { packages } = info;
const here = dirname(fileURLToPath(import.meta.url));

/**
 * Vendor builds, per SPEC "Build/Vendoring Mechanics": the bundler is used
 * strictly to flatten and export external dependencies into single ES module
 * files inside `vendor/`, so the live application itself runs natively via
 * import maps and native ESM — no build step for first-party code.
 *
 * Vendor file names are unversioned so first-party imports and import maps
 * stay stable across dependency bumps; `git diff` on rebuilds shows what a
 * bump changed.
 */
export default defineConfig([
  {
    entry: {
      'noflo': 'node_modules/noflo/src/lib/NoFlo.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    // Inline all dependencies: import maps map only this one file
    noExternal: [/./],
    alias: {
      'node:events': resolve(here, './src/shims/event-emitter.js'),
      'events': resolve(here, './src/shims/event-emitter.js'),
      // fbp-graph requires fs for journal file persistence, never used in the
      // browser
      'fs': resolve(here, './src/worker/empty-fs.js'),
      'node:fs': resolve(here, './src/worker/empty-fs.js'),
    },
    banner: {
      js: `var require = () => ({}); var fs = {};`,
    },
    comments: true,
    copy: [
      {
        from: 'node_modules/source-code-pro/WOFF2/OTF/SourceCodePro-Regular.otf.woff2',
        to: 'vendor/webfonts',
        rename: `sourcecodepro-${packages['node_modules/source-code-pro'].version}.woff2`
      },
    ],
  },
  {
    entry: {
      'yjs': 'node_modules/yjs/dist/yjs.mjs',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    // Inline lib0 and other transitive dependencies
    noExternal: [/./],
  },
  {
    entry: {
      'y-indexeddb': 'node_modules/y-indexeddb/src/y-indexeddb.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    // yjs stays external: all contexts must share ONE Yjs instance, served as
    // the sibling vendor/yjs.js bundle
    external: ['yjs'],
    outputOptions: {
      paths: {
        yjs: './yjs.js',
      },
    },
  },
  {
    entry: {
      'fontawesome-icons': './utils/icon-map.js',
    },
    copy: [
      {
        from: 'node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2',
        to: 'vendor/webfonts',
        rename: `fontawesome-${packages['node_modules/@fortawesome/fontawesome-free'].version}.woff2`
      },
    ],
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
  },
  {
    entry: {
      'jedison': './node_modules/jedison/dist/esm/jedison.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    outputOptions: {
      banner: '// @ts-nocheck',
    },
  },
])
