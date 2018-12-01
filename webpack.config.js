const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './app/main.js',
  output: {
    path: __dirname,
    filename: 'browser/noflo-ui.min.js',
    sourceMapFilename: 'browser/noflo-ui.min.js.map',
  },
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /noflo([\\]+|\/)lib([\\]+|\/)loader([\\]+|\/)register.js$/,
        use: [
          {
            loader: 'noflo-component-loader',
            options: {
              graph: 'ui/main',
              debug: false,
              baseDir: __dirname,
              manifest: {
                runtimes: ['noflo'],
                discover: true,
                recursive: true,
              },
              runtimes: [
                'noflo',
                'noflo-browser',
              ],
            },
          },
        ],
      },
      {
        test: /noflo([\\]+|\/)lib([\\]+|\/)(.*)\.js$|noflo([\\]+|\/)components([\\]+|\/)(.*)\.js$|fbp-graph([\\]+|\/)lib([\\]+|\/)(.*)\.js$|noflo-runtime-([a-z]+)([\\]+|\/)(.*).js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        ],
      },
      {
        test: /\.coffee$/,
        use: [
          {
            loader: 'coffee-loader',
            options: {
              sourceMap: true,
              transpile: {
                presets: ['@babel/preset-env'],
              },
            },
          },
        ],
      },
      {
        test: /\.fbp$/,
        use: [
          'fbp-loader',
        ],
      },
      {
        test: /\.yaml$/,
        use: [
          'json-loader',
          'yaml-loader',
        ],
      },
    ],
  },
  externals: {
    canvas: 'commonjs canvas', // Required by noflo-image
  },
  resolve: {
    extensions: ['.coffee', '.js'],
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'node_modules/@polymer/polymer/*.html',
        to: 'browser/vendor/polymer',
        flatten: true,
      },
      {
        from: 'node_modules/@polymer/polymer/lib/elements/*.html',
        to: 'browser/vendor/polymer/lib/elements',
        flatten: true,
      },
      {
        from: 'node_modules/@polymer/polymer/lib/legacy/*.html',
        to: 'browser/vendor/polymer/lib/legacy',
        flatten: true,
      },
      {
        from: 'node_modules/@polymer/polymer/lib/mixins/*.html',
        to: 'browser/vendor/polymer/lib/mixins',
        flatten: true,
      },
      {
        from: 'node_modules/@polymer/polymer/lib/utils/*.html',
        to: 'browser/vendor/polymer/lib/utils',
        flatten: true,
      },
      {
        from: 'node_modules/noflo-polymer/noflo-polymer/noflo-polymer.html',
        to: 'browser/vendor/noflo-polymer/noflo-polymer.html',
      },
      {
        from: 'node_modules/codemirror/lib/codemirror.js',
        to: 'browser/vendor/codemirror/lib/codemirror.js',
      },
      {
        from: 'node_modules/codemirror/mode/xml/xml.js',
        to: 'browser/vendor/codemirror/mode/xml.js',
      },
      {
        from: 'node_modules/codemirror/mode/javascript/javascript.js',
        to: 'browser/vendor/codemirror/mode/javascript.js',
      },
      {
        from: 'node_modules/codemirror/mode/css/css.js',
        to: 'browser/vendor/codemirror/mode/css.js',
      },
      {
        from: 'node_modules/codemirror/mode/vbscript/vbscript.js',
        to: 'browser/vendor/codemirror/mode/vbscript.js',
      },
      {
        from: 'node_modules/codemirror/mode/coffeescript/coffeescript.js',
        to: 'browser/vendor/codemirror/mode/coffeescript.js',
      },
      {
        from: 'node_modules/codemirror/mode/clike/clike.js',
        to: 'browser/vendor/codemirror/mode/clike.js',
      },
      {
        from: 'node_modules/codemirror/mode/htmlmixed/htmlmixed.js',
        to: 'browser/vendor/codemirror/mode/htmlmixed.js',
      },
      {
        from: 'node_modules/codemirror/mode/smalltalk/smalltalk.js',
        to: 'browser/vendor/codemirror/mode/smalltalk.js',
      },
      {
        from: 'node_modules/codemirror/mode/yaml/yaml.js',
        to: 'browser/vendor/codemirror/mode/yaml.js',
      },
      {
        from: 'node_modules/codemirror/mode/python/python.js',
        to: 'browser/vendor/codemirror/mode/python.js',
      },
      {
        from: 'node_modules/font-awesome/fonts/*',
        to: 'browser/vendor/font-awesome',
        flatten: true,
      },
      {
        from: 'node_modules/hammerjs/hammer.min.js',
        to: 'browser/vendor/hammerjs/hammer.min.js',
      },
      {
        from: 'node_modules/hammerjs/hammer.min.js.map',
        to: 'browser/vendor/hammerjs/hammer.min.js.map',
      },
      {
        from: 'node_modules/klayjs/klay.js',
        to: 'browser/vendor/klayjs/klay.js',
      },
      {
        from: 'node_modules/klayjs-noflo/klay-noflo.js',
        to: 'browser/vendor/klayjs-noflo/klay-noflo.js',
      },
      {
        from: 'node_modules/observe-js/src/observe.js',
        to: 'browser/vendor/observe-js/observe.js',
      },
      {
        from: 'node_modules/@webcomponents/webcomponentsjs/webcomponents-lite.js',
        to: 'browser/vendor/webcomponentsjs/webcomponents-lite.js',
      },
    ]),
  ],
  node: {
    child_process: 'empty',
    fs: 'empty',
  },
};
