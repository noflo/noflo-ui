import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';
import { esmExternalRequirePlugin } from 'rolldown/plugins';
import info from './package-lock.json' with { type: 'json' };

const { packages } = info;
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    entry: {
      [`noflo-${packages['node_modules/noflo'].version}`]: 'node_modules/noflo/src/lib/NoFlo.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    alias: {
      'node:events': 'eventemitter3',
      'events': 'eventemitter3',
    },
    banner: {
      js: `var require = () => ({}); var fs = {};`,
    },
    dts: true,
    comments: true,
    compilerOptions: {
      allowJs: true,
      declarationMap: true,
      isolatedDeclarations: true,
    },
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
      [`fontawesome-icons-${packages['node_modules/@fortawesome/fontawesome-free'].version}`]: './utils/icon-map.js',
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
      [`jedison-${packages['node_modules/jedison'].version}`]: './node_modules/jedison/dist/esm/jedison.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    outputOptions: {
      banner: '// @ts-nocheck',
    },
  },
  {
    entry: {
      'engine': './src/worker/engine.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    // The worker cannot resolve bare imports (no import maps there), so
    // everything must be inlined into the single bundle.
    noExternal: [/./],
    alias: {
      'node:events': 'eventemitter3',
      'events': 'eventemitter3',
      'fs': resolve(here, './src/worker/empty-fs.js'),
      'node:fs': resolve(here, './src/worker/empty-fs.js'),
    },
    banner: {
      js: `var require = () => ({}); var fs = {};`,
    },
  },
  {
    entry: {
      'yjs': 'node_modules/yjs/dist/yjs.mjs',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
  },
  /*
  {
    name: 'noflo-core',
    entry: 'node_modules/noflo-core/components/*.js',
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
    comments: false,
    banner: {
      js: `var require = () => ({}); var util = {};`,
    },
    plugins: [
      esmExternalRequirePlugin({
        external: ['noflo'],
      }),
    ],
    alias: {
      'events': 'eventemitter3',
    },
  },
  */
])
