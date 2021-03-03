import path from "path";
import webpack from "webpack";

const tsLoaderConfiguration: webpack.RuleSetRule = {
  test: /\.tsx?$/,
  use: {
    loader: "babel-loader",
    options: {
      cacheDirectory: true,
      presets: ["module:metro-react-native-babel-preset"],
      plugins: [
        "react-native-web",
        ["babel-plugin-transform-react-remove-prop-types", { mode: "remove" }]
      ]
    }
  }
};
const jsLoaderConfiguration: webpack.RuleSetRule = {
  test: /\.js$/,
  include: [path.resolve(__dirname, "node_modules/")],
  use: {
    loader: "babel-loader",
    options: {
      cacheDirectory: true,
      presets: ["module:metro-react-native-babel-preset"],
      plugins: [
        "react-native-web",
        ["babel-plugin-transform-react-remove-prop-types", { mode: "remove" }]
      ]
    }
  }
};

const imageLoaderConfiguration: webpack.RuleSetRule = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: "url-loader",
    options: {
      name: "[name].[ext]",
      esModule: false
    }
  }
};

const iconLoaderConfiguration: webpack.RuleSetRule = {
  test: /\.ttf$/,
  loader: "url-loader",
  include: path.resolve(__dirname, "node_modules/react-native-vector-icons")
};

const factory: webpack.MultiConfigurationFactory = (env, args) => [
  {
    entry: path.resolve(__dirname, "index.web.js"),

    output: {
      path: path.resolve(__dirname, "dist/")
    },

    target: "electron-renderer",

    module: {
      rules: [
        tsLoaderConfiguration,
        jsLoaderConfiguration,
        imageLoaderConfiguration,
        iconLoaderConfiguration
      ]
    },

    resolve: {
      alias: {
        "react-native": "react-native-web"
      },
      extensions: [
        ".webpack.js",
        ".web.ts",
        ".web.tsx",
        ".web.js",
        ".ts",
        ".tsx",
        ".js"
      ]
    },

    plugins: [
      new webpack.DefinePlugin({
        __DEV__: args.mode !== "production"
      })
    ]
  },

  {
    entry: path.resolve(__dirname, "src/electron/preload/index.ts"),

    output: {
      filename: "preload.js",
      path: path.resolve(__dirname, "dist/")
    },

    target: "electron-preload",

    module: {
      rules: [tsLoaderConfiguration, jsLoaderConfiguration]
    },

    resolve: { extensions: [".ts", ".js"] }
  },

  {
    entry: path.resolve(__dirname, "src/electron/bundle/index.ts"),

    output: {
      filename: "bundle.js",
      path: path.resolve(__dirname, "dist/")
    },

    target: "electron-main",

    module: {
      rules: [tsLoaderConfiguration, jsLoaderConfiguration]
    },

    resolve: { extensions: [".ts", ".js"] }
  }
];

module.exports = factory;
