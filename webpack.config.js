const path = require('path');
const webpack = require('webpack');
const glob = require('glob');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const miyoutvConfigMain = {
  entry: {
    index: path.join(__dirname, 'miyoutv/src/index.js'),
  },
  output: {
    path: path.join(__dirname, 'miyoutv/dist/'),
    filename: '[name].js',
  },
  devtool: 'source-map',
  target: 'electron-main',
  externals: [{
    'electron-prebuilt': 'require("electron-prebuilt")',
    'electron-reload': 'require("electron-reload")',
  }],
  plugins: [
    new webpack.EnvironmentPlugin(
      process.env.IS_PACK ? {
        NODE_ENV: 'development',
      } : []
    ),
    new UglifyJSPlugin({
      sourceMap: true,
    }),
  ],
  node: false,
};

const miyoutvConfigRenderer = {
  entry: {
    app: glob.sync(path.join(__dirname, 'miyoutv/src/app/**/*.js'), {
      nosort: true,
    }),
  },
  output: {
    path: path.join(__dirname, 'miyoutv/dist/'),
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: 'ng-annotate-loader',
    }],
  },
  devtool: 'source-map',
  target: 'electron-renderer',
  externals: [{
    'webchimera.js': 'require("webchimera.js")',
    'wcjs-prebuilt': 'require("wcjs-prebuilt")',
  }],
  plugins: [
    new webpack.EnvironmentPlugin(
      process.env.IS_PACK ? {
        NODE_ENV: 'development',
        GARAPON_DEVID: '',
      } : []
    ),
    new UglifyJSPlugin({
      sourceMap: true,
    }),
  ],
  node: false,
};

const miyoutvConfigBundle = {
  entry: {
    bundle: [
      path.join(__dirname, 'miyoutv/src/bundle.js'),
      path.join(__dirname, 'miyoutv/src/bundle.css'),
    ],
  },
  output: {
    path: path.join(__dirname, 'miyoutv/dist/'),
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        use: [{
          loader: 'css-loader',
          options: {
            minimize: true,
            sourceMap: true,
          }
        }],
      }),
    }, {
      test: /(typeface|fonts).+\.(eot|otf|svg|ttf|woff2?)$/,
      use: 'file-loader?name=fonts/[name].[ext]',
    }]
  },
  devtool: 'source-map',
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true,
    }),
    new ExtractTextPlugin('[name].css'),
  ]
};

const agentConfig = {
  entry: {
    'miyoutv-agent': path.join(__dirname, 'miyoutv-agent/src/miyoutv-agent.js'),
    'tools/servicelist': path.join(__dirname, 'miyoutv-agent/src/servicelist.js'),
  },
  output: {
    path: path.join(__dirname, 'build/miyoutv-agent/'),
    filename: '[name].js',
  },
  target: 'node',
  node: false,
};

module.exports = (env) => {
  const config = [];
  if (env.miyoutv || !env.agent) {
    if (env.js) {
      config.push(miyoutvConfigMain);
      config.push(miyoutvConfigRenderer);
    }
    if (env.bundle) {
      config.push(miyoutvConfigBundle);
    }
    if (config.length < 1) {
      config.push(miyoutvConfigMain);
      config.push(miyoutvConfigRenderer);
      config.push(miyoutvConfigBundle);
    }
  }
  if (env.agent) {
    config.push(agentConfig);
  }
  return config;
};
