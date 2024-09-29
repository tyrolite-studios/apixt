const path = require("node:path")
const fs = require("node:fs")
require("dotenv").config()

const baseDir = path.resolve(__dirname, "../../")
const { DefinePlugin } = require("webpack")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const TerserPlugin = require("terser-webpack-plugin")

const npmScript = process.env.npm_lifecycle_script
if (!npmScript) {
    // we only allow calls as npm script to determine if we run in prod or dev mode
    console.error("Please use npm to run this script!")
    process.exit(1)
}
const isDist = !npmScript.includes("webpack-dev-server")

if (!isDist) {
    // create dev-directory and file if missing...
    const devDir = path.resolve(baseDir, "src", "dev")
    if (!fs.existsSync(devDir)) {
        fs.mkdirSync(devDir, { recursive: true })
    }
    const userFilePath = path.resolve(devDir, "config.js")

    if (!fs.existsSync(userFilePath)) {
        const defaults = require(
            path.resolve(baseDir, "src", "build", "defaults.cjs")
        )
        const fileContent = fs.writeFileSync(
            userFilePath,
            `export default ${JSON.stringify(defaults, null, 4)}`
        )
    }
}

const plugins = []
let minimizer = []
if (!isDist) {
    minimizer = undefined
    plugins.push(
        new DefinePlugin({
            definitions: {}
        }),
        new HtmlWebpackPlugin({
            filename: "index.html",
            cache: false,
            inject: "head"
        })
    )
} else {
    minimizer.push(
        new TerserPlugin({
            terserOptions: {
                compress: {
                    dead_code: false,
                    toplevel: false,
                    side_effects: false,
                    unused: false
                },
                format: {
                    comments: /@license/i
                }
            },
            extractComments: true
        })
    )
    const cssMinPlugin = new CssMinimizerPlugin({
        minimizerOptions: {
            preset: [
                "default",
                {
                    discardComments: { removeAll: true },
                    discardUnused: false
                }
            ]
        }
    })
    minimizer.push(cssMinPlugin)
    plugins.push(cssMinPlugin)
}

plugins.push(
    new MiniCssExtractPlugin({
        filename: "[name].css"
    })
)

const devtool = isDist ? undefined : "eval-cheap-source-map"

const indexEntry = path.resolve(baseDir, "src/index.js")
const apixtEntry = path.resolve(baseDir, "src/apixt.js")
const uiEntry = path.resolve(baseDir, "src/ui.js")

const optimization = !isDist
    ? {
          minimize: false,
          runtimeChunk: "single"
      }
    : {
          minimize: true,
          minimizer,
          runtimeChunk: false,
          splitChunks: false
      }

const getWebpackConfig = (name, entryFiles) => {
    const isIndex = name === "index"

    const devServer =
        isDist || !isIndex
            ? undefined
            : {
                  server: {
                      type: "http",
                      options: {}
                  },
                  client: { progress: true, overlay: true, logging: "info" },
                  open: true,
                  compress: undefined,
                  static: path.resolve(baseDir, "dist"),
                  port: process.env.APIXT_DEV_PORT ?? 8080,
                  host: process.env.APIXT_DEV_HOST ?? "localhost"
              }

    const webpackConfig = {
        mode: isDist ? "production" : "development",
        stats: { preset: "normal" },
        ignoreWarnings: [{ message: /Critical dependency/ }],
        performance: {
            //        hints: false,
            //        maxEntrypointSize: 250000
        },
        name,
        context: path.resolve(baseDir),
        dependencies: name !== "index" ? ["index"] : [],
        devtool,
        entry: entryFiles,
        output: {
            path: path.resolve(baseDir, "dist"),
            clean: isIndex,
            filename: "[name].js",
            publicPath: "/"
        },
        optimization,
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            browsers: [
                                                ">2.25%, not ie 11, not op_mini all"
                                            ]
                                        },
                                        exclude: ["proposal-dynamic-import"]
                                    }
                                ],
                                [
                                    "@babel/preset-react",
                                    {
                                        runtime: "automatic"
                                    }
                                ]
                            ]
                        }
                    }
                },
                {
                    test: /\.(css)$/,
                    use: [
                        isDist ? MiniCssExtractPlugin.loader : "style-loader",
                        {
                            loader: "css-loader",
                            options: { sourceMap: !isDist, importLoaders: 1 }
                        },
                        "postcss-loader"
                    ]
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/i,
                    type: "asset/resource",
                    generator: { filename: "[name][ext]" }
                },
                { test: /\.m?js$/, resolve: { fullySpecified: false } }
            ]
        },
        plugins,
        resolve: {
            alias: {
                core: path.resolve(baseDir, "src/core") + "/",
                components: path.resolve(baseDir, "src/components") + "/",
                plugins: path.resolve(baseDir, "src/plugins") + "/",
                themes: path.resolve(baseDir, "src/themes") + "/"
            },
            extensions: [".js", ".cjs", ".jsx"]
        },
        devServer
    }
    return webpackConfig
}

const getWebpackConfigs = (target) => {
    if (target === "ui") {
        return getWebpackConfig("index", { index: uiEntry })
    }
    if (isDist) {
        return [
            getWebpackConfig("index", { index: indexEntry }),
            getWebpackConfig("apixt", { apixt: apixtEntry })
        ]
    }
    return [
        getWebpackConfig("index", [
            indexEntry,
            apixtEntry,
            path.resolve(baseDir, "src/dev.js")
        ])
    ]
}

module.exports = getWebpackConfigs
