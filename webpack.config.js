const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');
const path = require('path');
const pkg = require('./package.json');

const theme = process.env.NOFLO_THEME || 'noflo';

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
    new EnvironmentPlugin({
      // UI theming
      NOFLO_THEME: theme,
      NOFLO_APP_NAME: 'NoFlo UI',
      NOFLO_APP_TITLE: 'NoFlo Development Environment',
      NOFLO_APP_LOADING: 'Preparing NoFlo UI...',
      NOFLO_ORGANIZATION: 'NoFlo Community',
      NOFLO_WEBSITE: 'https://noflojs.org',
      NOFLO_APP_DESCRIPTION: 'Flow-Based Programming Environment',
      NOFLO_APP_VERSION: pkg.version,
      // GitHub login
      NOFLO_USER_LOGIN_ENABLED: true,
      NOFLO_OAUTH_PROVIDER: 'https://github.com',
      NOFLO_OAUTH_GATE: 'https://noflo-gate.herokuapp.com',
      NOFLO_OAUTH_SERVICE_USER: 'https://api.flowhub.io',
      NOFLO_OAUTH_CLIENT_ID: '46fe25abef8d07e6dc2d',
      NOFLO_OAUTH_CLIENT_REDIRECT: 'http://localhost:9999',
      NOFLO_OAUTH_CLIENT_SECRET: null,
      NOFLO_OAUTH_SSL_CLIENT_ID: '',
      NOFLO_OAUTH_SSL_CLIENT_REDIRECT: '',
      NOFLO_OAUTH_SSL_CLIENT_SECRET: null,
      NOFLO_OAUTH_SSL_ENDPOINT_AUTHENTICATE: '/authenticate/ssl',
      NOFLO_OAUTH_ENDPOINT_AUTHORIZE: '/login/oauth/authorize',
      NOFLO_OAUTH_ENDPOINT_TOKEN: '/login/oauth/access_token',
      NOFLO_OAUTH_ENDPOINT_AUTHENTICATE: '/authenticate',
      NOFLO_OAUTH_ENDPOINT_USER: '/user',
      // Runtime registry
      NOFLO_REGISTRY_SERVICE: 'https://api.flowhub.io',
      // Analytics
      NOFLO_APP_ANALYTICS: `<script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
      ga('create', 'UA-75936-14', 'noflojs.org');
      ga('send', 'pageview');
      </script>`,
    }),
    new WebpackPwaManifest({
      name: process.env.NOFLO_APP_TITLE || 'NoFlo Development Environment',
      short_name: process.env.NOFLO_APP_NAME || 'NoFlo UI',
      description: process.env.NOFLO_APP_DESCRIPTION || 'Flow-Based Programming Environment',
      version: process.env.NOFLO_APP_VERSION,
      lang: 'en-US',
      theme_color: '#071112',
      background_color: '#071112',
      orientation: 'landscape',
      display: 'standalone',
      categories: [
        'devtools',
      ],
      icons: [
        36,
        48,
        72,
        96,
        144,
        192,
      ].map((width) => ({
        src: `app/${theme}-${width}.png`,
        sizes: [width],
      })),
      ios: false,
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.dist.html',
      inject: 'head',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'noflo.ico',
          to: 'noflo.ico',
          flatten: true,
        },
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
          from: 'app/*.png',
          to: 'app',
          flatten: true,
        },
        {
          from: 'node_modules/font-awesome/fonts/*',
          to: 'vendor/font-awesome',
          flatten: true,
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
  devServer: {
    contentBase: path.resolve(__dirname, './browser'),
    compress: true,
    port: 9999,
  },
};
