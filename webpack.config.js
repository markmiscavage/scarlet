const path = require('path')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')

const BundleTracker = require('webpack-bundle-tracker')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const DefinePlugin = webpack.DefinePlugin
const NoErrorsPlugin = webpack.NoErrorsPlugin
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin

const NODE_ENV = process.env.NODE_ENV || 'development'
const ENV_IS_PRODUCTION = NODE_ENV !== 'development'
const BROWSER = true

const CONFIG = {
	static: path.join(__dirname, 'scarlet/cms/static/scarlet/build'),
	src: path.join(__dirname, 'scarlet/cms/static/scarlet/source')
}
const UGLIFY_CONFIG = {
	sourceMap: false,
	mangle: true,
	compress: {
		warnings: false
	}
}
const WEBPACK_ENV = {
	NODE_ENV: JSON.stringify(NODE_ENV),
	BROWSER: JSON.stringify(BROWSER)
}

module.exports = {
	debug: !ENV_IS_PRODUCTION,
	devtool: defineWebpackDevtool(),

	entry: [
			'babel-polyfill',
			'eventsource-polyfill',
			'webpack-hot-middleware/client?path=http://localhost:3000/__webpack_hmr',
			'./scarlet/cms/static/scarlet/source/init'
	],

	output: {
		path: CONFIG.static,
		filename: 'js/[name]-[hash].js',
		publicPath: 'http://localhost:3000/build/'
	},

	module: {
		loaders: createWebpackLoaders()
	},

	plugins: createWebpackPlugins(),

	postcss: function () {
		return [autoprefixer];
	}
}

// ..................................................

function defineWebpackDevtool () {
	return ENV_IS_PRODUCTION ? null : 'cheap-module-eval-source-map'
}

function createWebpackLoaders () {
	return [{
		test: /\.js$/,
		loaders: ['react-hot', 'babel'],
		exclude: /node_modules|bower_components/,
		include: CONFIG.src
	}, {
		test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
		loader: 'file'
	}, {
		test: /\.(ogg|mp?4a|mp3)$/,
		loader: 'file'
	}, {
		test: /\.scss$/,
		loader: ExtractTextPlugin.extract('style',
			'css?sourceMap!postcss!sass'),
		include: CONFIG.src
	}, {
		test: /\.(jpg|png)$/,
		loader: 'url?limit=8192'
	}, {
		test: /\.json$/,
		loader: 'json'
	}]
}

function createWebpackPlugins () {
	const plugins = [
		new DefinePlugin({
				'process.env': {
						NODE_ENV: JSON.stringify('development'),
						BROWSER: JSON.stringify(true)
				}
		}),
		new BundleTracker({ filename: './webpack-stats.json' })
	]

	if (ENV_IS_PRODUCTION) {
		plugins.push(
			new ExtractTextPlugin('css/[name]-[hash].css', { allChunks: true }),
			new ProgressBarPlugin({ width: 60 }),
			new UglifyJsPlugin(UGLIFY_CONFIG))
	} else {
		plugins.push(
			new webpack.HotModuleReplacementPlugin(),
			new NoErrorsPlugin())
	}
	return plugins
}
