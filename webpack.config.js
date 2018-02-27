const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './app/main.js',
  output: {
    path: __dirname,
    filename: 'browser/noflo-ui.min.js',
    sourceMapFilename: 'browser/noflo-ui.min.js.map',
  },
  devtool: 'source-map',
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true,
    })
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
              sourceMap: true,
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
  },
  resolve: {
    extensions: [".coffee", ".js"],
  },
  node: {
    child_process: 'empty',
    fs: 'empty',
  },
};
