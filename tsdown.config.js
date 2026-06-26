import { defineConfig } from 'tsdown';
import { esmExternalRequirePlugin } from 'rolldown/plugins';

export default defineConfig([
  {
    entry: 'node_modules/noflo/src/lib/NoFlo.js',
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
    },
  },
  {
    entry: {
      'fa-icon-map': './utils/icon-map.js',
    },
    platform: 'browser',
    format: 'esm',
    outDir: 'vendor',
  }
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
