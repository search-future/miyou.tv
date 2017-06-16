const path = require('path');
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
    new UglifyJSPlugin({
      sourceMap: true
    })
  ]
};
