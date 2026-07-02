import { defineConfig } from 'tsdown';
import { esmExternalRequirePlugin } from 'rolldown/plugins';
import info from './package-lock.json' with { type: 'json' };

const { packages } = info;

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
