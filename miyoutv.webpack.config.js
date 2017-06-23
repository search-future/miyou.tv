const path = require('path');
const webpack = require('webpack');
const glob = require('glob');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: {
    app: glob.sync(path.join(__dirname, 'miyoutv/src/app/**/*.js'), {
      nosort: true
    }),
    index: path.join(__dirname, 'miyoutv/src/index.js'),
    patch: path.join(__dirname, 'miyoutv/src/patch.js')
  },
  output: {
    path: path.join(__dirname, 'miyoutv/dist/'),
    filename: '[name].js'
  },
  module: {
    noParse: /\.js$/,
    rules: [{
      test: /\.js$/,
      use: 'ng-annotate-loader'
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
      sourceMap: process.env.NODE_ENV !== 'production'
    })
  ]
};
