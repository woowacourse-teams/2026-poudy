const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

module.exports = (_, argv) => {
  const mode = argv.mode ?? "development";
  const isDevelopment = mode === "development";

  return {
    mode,
    entry: "./src/index.tsx",

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].bundle.js",
      clean: true, // 빌드 전 dist 비우기
      publicPath: "/", // SPA 라우팅에 필요
    },

    resolve: {
      extensions: [".tsx", ".ts", ".js"], // import 시 확장자 생략 허용
      alias: { "@": path.resolve(__dirname, "src") },
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "swc-loader",
            options: {
              sourceMaps: true,
              jsc: {
                parser: { syntax: "typescript", tsx: true },
                target: "es2020",
                transform: {
                  react: { runtime: "automatic", development: isDevelopment, refresh: isDevelopment },
                },
              },
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.(png|svg|jpe?g|gif|webp)$/i,
          type: "asset", // 8 KiB 미만 base64 인라인, 초과는 파일 방출
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: "asset/resource", // 항상 파일로 방출
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: "./public/index.html" }),
      ...(isDevelopment ? [new ReactRefreshWebpackPlugin()] : []),
    ],

    devtool: isDevelopment ? "eval-source-map" : "hidden-source-map",

    devServer: {
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: true, // SPA: 새로고침 시 404 방지
    },
  };
};
