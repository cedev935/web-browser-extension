const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const { optimize } = require("webpack")
const { join } = require("path")
const exec = require("child_process").exec

const combineManifestPlugin = {
	apply: (compiler) => {
		compiler.hooks.afterEmit.tap("AfterEmitPlugin", () => {
			exec(
				"./scripts/combineJsonFiles.js manifest.json manifest.testing.json > testing/manifest.json",
				console.log,
			)
		})
	},
}

const envPlugins =
	{
		production: [new optimize.AggressiveMergingPlugin()],
		development: [combineManifestPlugin],
	}[process.env.NODE_ENV] || []

const devtool = process.env.NODE_ENV === "development" ? "source-map" : undefined
const outputDir = process.env.NODE_ENV === "development" ? "testing" : "dist"

module.exports = {
	mode: process.env.NODE_ENV,
	devtool,
	entry: {
		contentscript: join(__dirname, "src/contentscript/contentscript.ts"),
		background: join(__dirname, "src/background/background.ts"),
		switchCookies: join(__dirname, "src/inject/switchCookies.ts"),
	},
	output: {
		path: join(__dirname, outputDir),
		filename: "[name].js",
	},
	module: {
		rules: [
			{
				exclude: /node_modules/,
				test: /\.ts?$/,
				use: "ts-loader",
			},
			{
				test: /\.sass$/,
				use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
			},
		],
	},
	plugins: [
		...envPlugins,
		new MiniCssExtractPlugin({
			filename: "[name].css",
			chunkFilename: "[id].css",
		}),
	],
	resolve: {
		extensions: [".ts", ".js"],
	},
}
