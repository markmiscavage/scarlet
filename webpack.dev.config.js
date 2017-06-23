const config = require('./webpack.config')

const webpack = require('webpack')
const path = require('path')

const BundleTracker = require('webpack-bundle-tracker')
const DefinePlugin = webpack.DefinePlugin
const NoEmitOnErrorsPlugin = webpack.NoEmitOnErrorsPlugin
const ProvidePlugin = webpack.ProvidePlugin
const HOST = '10.0.6.29'
const PORT = '3030'

function createWebpackLoaders() {
	const rules = []

	return rules
}

function createWebpackPlugins() {
	const plugins = [
		new NoEmitOnErrorsPlugin(),
		new BundleTracker({
			filename: './webpack-stats.json',
		}),
	]

	return plugins
}

config.output.publicPath = `http://${HOST}:${PORT}/build/`
config.devtool = 'cheap-source-map'
config.module.rules.push(...createWebpackLoaders())
config.plugins.push(...createWebpackPlugins())
module.exports = config
