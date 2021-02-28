const path = require("path");
const { StatsWriterPlugin } = require("webpack-stats-plugin");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    chunkFilename: "[name].js",
  },
  optimization: {
    minimize: false,
    concatenateModules: false,
    namedModules: false,
    namedChunks: true,
    sideEffects: true,
    // splitChunks: {
    //   hidePathInfo: false,
    //   minSize: 1,
    // },
  },
  plugins: [
    new StatsWriterPlugin({
      filename: "stats.json",
      stats: {
        all: true,
      },
    }),
  ],
};
