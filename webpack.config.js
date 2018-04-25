const path = require('path');
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const discardFonts = require('postcss-discard-font-face');

const miyoutvConfigMain = {
  entry: {
    index: path.join(__dirname, 'miyoutv/src/index.ts'),
  },
  output: {
    path: path.join(__dirname, 'miyoutv/dist/'),
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: {
        loader: 'awesome-typescript-loader',
        options: {
          configFileName: 'miyoutv/tsconfig.json',
        },
      },
    }]
  },
  devtool: 'source-map',
  target: 'electron-main',
  externals: [{
    react: true,
  }],
  plugins: [
    new webpack.EnvironmentPlugin(process.env.IS_PACK ? {
      NODE_ENV: 'development',
    } : []),
  ],
  node: false,
};

const miyoutvConfigRenderer = {
  entry: {
    vendor: [
      path.join(__dirname, 'miyoutv/src/vendor.ts'),
      path.join(__dirname, 'miyoutv/src/vendor.scss'),
    ],
    app: path.join(__dirname, 'miyoutv/src/main.ts'),
    style: path.join(__dirname, 'miyoutv/src/style.scss'),
  },
  output: {
    path: path.join(__dirname, 'miyoutv/dist/'),
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: [{
        loader: 'awesome-typescript-loader',
        options: {
          configFileName: 'miyoutv/tsconfig.json',
        },
      }, {
        loader: 'angular2-template-loader',
      }, {
        loader: 'angular-router-loader',
      }],
    }, {
      test: /\.component\.html$/,
      use: {
        loader: 'html-loader',
        options: {
          attrs: false,
        },
      },
    }, {
      test: /\.component\.scss$/,
      use: [{
        loader: 'raw-loader',
      }, {
        loader: 'sass-loader',
      }],
    }, {
      test: /\.scss$/,
      exclude: /\.component\.scss$/,
      use: ExtractTextPlugin.extract({
        use: [{
          loader: 'css-loader',
          options: {
            minimize: true,
            sourceMap: true,
            importLoaders: 1,
          },
        }, {
          loader: 'postcss-loader',
          options: {
            ident: 'postcss',
            plugins: [discardFonts(['woff2'])],
            sourceMap: true,
          },
        }, {
          loader: 'sass-loader',
        }],
      }),
    }, {
      test: /(typeface|fonts).+\.(eot|otf|svg|ttf|woff2?)$/,
      use: 'file-loader?name=fonts/[name].[ext]',
    }],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: 'source-map',
  target: 'electron-renderer',
  externals: [{
    'webchimera.js': 'require("webchimera.js")',
    'wcjs-prebuilt': 'require("wcjs-prebuilt")',
  }],
  plugins: [
    new webpack.EnvironmentPlugin(process.env.IS_PACK ? {
      NODE_ENV: 'development',
      GARAPON_DEVID: '',
    } : []),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['app', 'vendor'],
    }),
    new ExtractTextPlugin('[name].css'),
  ],
  node: false,
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

if (process.env.IS_PACK) {
  miyoutvConfigMain.plugins.push(new UglifyJSPlugin({
    parallel: true,
    sourceMap: true,
  }));
  miyoutvConfigRenderer.plugins.push(new UglifyJSPlugin({
    parallel: true,
    sourceMap: true,
  }));
}

module.exports = (env) => {
  const config = [];
  if (env.miyoutv || !env.agent) {
    if (env.main) {
      config.push(miyoutvConfigMain);
    }
    if (env.renderer) {
      config.push(miyoutvConfigRenderer);
    }
    if (config.length < 1) {
      config.push(miyoutvConfigMain);
      config.push(miyoutvConfigRenderer);
    }
  }
  if (env.agent) {
    config.push(agentConfig);
  }
  return config;
};
