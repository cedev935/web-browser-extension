const CopyPlugin = require("copy-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const { EnvironmentPlugin, optimize } = require("webpack")
const { join } = require("path")
const { execSync } = require("child_process")
const { version } = require("./manifest.json")

const isDevelopmentMode = process.env.NODE_ENV === "development"
const isSentryMode = process.env.NODE_ENV === "sentry"

const mode = isDevelopmentMode ? "development" : "production"
const outputDir =
	{
		development: "dev-build",
		beta: "beta",
		production: "dist",
		sentry: "dist",
	}[process.env.NODE_ENV] ?? "dist"

const target = process.env.TARGET || "chrome"

const defaultChannel = isDevelopmentMode ? "dev" : "stable"
const channel = process.env.NODE_ENV === "beta" ? "beta" : defaultChannel

const CombineManifestPlugin = {
	apply: (compiler) => {
		compiler.hooks.afterEmit.tap("AfterEmitPlugin", () => {
			if (["dev", "beta"].includes(channel)) {
				console.log(`Generate manifest for ${channel}`)
				execSync(
					`./scripts/combineJsonFiles.js manifest.json manifest.${channel}.json > ${outputDir}/manifest.json`,
				)
			}

			if (target === "firefox") {
				console.log("Adjusting manifest for Firefox")
				execSync(`./scripts/patchManifestForFirefox.js ${outputDir}/manifest.json`)
			}
		})
	},
}

module.exports = {
	mode,
	devtool: "source-map",
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
		new EnvironmentPlugin({
			version,
		}),
		new CopyPlugin({
			patterns: [
				{
					from: "src/assets/*.png",
					to: "assets/[name][ext]",
				},
				{
					from: "manifest.json",
				},
			],
		}),
		new MiniCssExtractPlugin({
			filename: "[name].css",
			chunkFilename: "[id].css",
		}),
		...(isDevelopmentMode ? [] : [new optimize.AggressiveMergingPlugin()]),
		...(isSentryMode ? [] : [CombineManifestPlugin]),
	],
	resolve: {
		extensions: [".ts", ".js"],
	},
}
