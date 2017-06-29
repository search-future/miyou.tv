const path = require('path');
const webpack = require('webpack');
const glob = require('glob');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const miyoutvConfigJs = {
  entry: {
    app: glob.sync(path.join(__dirname, 'miyoutv/src/app/**/*.js'), {
      nosort: true,
    }),
    index: path.join(__dirname, 'miyoutv/src/index.js'),
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
  target: 'electron',
  externals: [{
    'electron-prebuilt': 'require("electron-prebuilt")',
    'electron-reload': 'require("electron-reload")',
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
  node: {
    global: false,
    process: false,
    __filename: false,
    __dirname: false,
  },
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
        use: `css-loader?${JSON.stringify({
          minimize: true,
          sourceMap: true,
        })}`,
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
  node: {
    global: false,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
  },
};

module.exports = (env) => {
  const config = [];
  if (env.miyoutv || !env.agent) {
    if (env.js) {
      config.push(miyoutvConfigJs);
    }
    if (env.bundle) {
      config.push(miyoutvConfigBundle);
    }
    if (config.length < 1) {
      config.push(miyoutvConfigJs);
      config.push(miyoutvConfigBundle);
    }
  }
  if (env.agent) {
    config.push(agentConfig);
  }
  return config;
};
