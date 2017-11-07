const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './app/main.js',
  output: {
    path: __dirname,
    filename: 'browser/noflo-ui.min.js',
  },
  devtool: 'source-map',
  plugins: [
    new UglifyJSPlugin()
  ],
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
                'noflo-browser'
              ],
            }
          }
        ]
      },
      {
        test: /noflo([\\]+|\/)lib([\\]+|\/)(.*)\.js$|noflo([\\]+|\/)components([\\]+|\/)(.*)\.js$|fbp-graph([\\]+|\/)lib([\\]+|\/)(.*)\.js$|noflo-runtime-([a-z]+)([\\]+|\/)(.*).js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['es2015'],
            }
          }
        ]
      },
      {
        test: /\.coffee$/,
        use: [
          {
            loader: 'coffee-loader',
            options: {
              transpile: {
                presets: ['es2015']
              }
            }
          }
        ]
      },
      {
        test: /\.fbp$/,
        use: [
          'fbp-loader'
        ]
      },
      {
        test: /\.json$/,
        use: [
          'json-loader'
        ]
      },
      {
        test: /\.yaml$/,
        use: [
          'json-loader',
          'yaml-loader'
        ]
      }
    ]
  },
  externals: {
    'canvas': 'commonjs canvas', // Required by noflo-image
    'coffee-script': 'commonjs coffee-script', // Required by noflo-image
  },
  resolve: {
    extensions: [".coffee", ".js"],
  },
  node: {
    child_process: 'empty',
    fs: 'empty',
  },
};
