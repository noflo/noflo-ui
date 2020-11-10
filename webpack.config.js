const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    backend: './app/main.js',
    ui: './elements/noflo-ui',
  },
  output: {
    path: path.resolve(__dirname, './browser/'),
    filename: '[name].[contenthash].min.js',
    sourceMapFilename: '[name].[contenthash].min.js.map',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
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
        test: /\.jsx$/,
        loader: 'babel-loader',
        query: {
          presets: ['@babel/preset-react', '@babel/preset-env'],
        },
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
    extensions: ['.coffee', '.js', '.jsx'],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.dist.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'css/noflo-ui.css',
          to: 'css/noflo-ui.css',
          flatten: true,
        },
        {
          from: 'css/*.woff',
          to: 'css',
          flatten: true,
        },
        {
          from: 'node_modules/font-awesome/fonts/*',
          to: 'vendor/font-awesome',
          flatten: true,
        },
        {
          from: 'node_modules/hammerjs/hammer.min.js',
          to: 'vendor/hammerjs/hammer.min.js',
        },
        {
          from: 'node_modules/hammerjs/hammer.min.js.map',
          to: 'vendor/hammerjs/hammer.min.js.map',
        },
        {
          from: 'node_modules/klayjs/klay.js',
          to: 'vendor/klayjs/klay.js',
        },
        {
          from: 'node_modules/klayjs-noflo/klay-noflo.js',
          to: 'vendor/klayjs-noflo/klay-noflo.js',
        },
        {
          from: 'node_modules/@webcomponents/webcomponentsjs/webcomponents-*.js',
          to: 'vendor/webcomponentsjs/',
          flatten: true,
        },
      ],
    }),
  ],
  node: {
    child_process: 'empty',
    fs: 'empty',
  },
};
