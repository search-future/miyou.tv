const path = require('path');
const webpack = require('webpack');
const glob = require('glob');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    app: glob.sync(path.join(__dirname, 'miyoutv/src/app/**/*.js'), {
      nosort: true
    }),
    index: path.join(__dirname, 'miyoutv/src/index.js'),
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
    noParse: [
      /miyoutv\/src\/app\/.+\.js$/,
      /miyoutv\\src\\app\\.+\.js$/,
      /miyoutv\/src\/index\.js$/,
      /miyoutv\\src\\index\.js$/,
    ],
    rules: [{
      test: /\.js$/,
      use: 'ng-annotate-loader',
    }, {
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        use: `css-loader?${JSON.stringify({
          minimize: true,
          sourceMap: process.env.NODE_ENV !== 'production',
        })}`,
      }),
    }, {
      test: /(typeface|fonts).+\.(eot|otf|svg|ttf|woff2?)$/,
      use: 'file-loader?name=fonts/[name].[ext]',
    }]
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin(
      process.env.IS_PACK ? {
        NODE_ENV: process.env.NODE_ENV,
        GARAPON_DEVID: process.env.GARAPON_DEVID,
      } : {}
    ),
    new UglifyJSPlugin({
      sourceMap: process.env.NODE_ENV !== 'production',
    }),
    new ExtractTextPlugin('[name].css'),
  ]
};
