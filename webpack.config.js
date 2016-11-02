const path = require('path')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')

const BundleTracker = require('webpack-bundle-tracker')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const DefinePlugin = webpack.DefinePlugin
const NoErrorsPlugin = webpack.NoErrorsPlugin
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin

const NODE_ENV = getEnvVar('NODE_ENV', 'development')
const ENV_IS_PRODUCTION = NODE_ENV === 'production'
const DEBUG = !ENV_IS_PRODUCTION

const PATHS = {
	static: path.join(__dirname, 'scarlet/cms/static/scarlet/build'),
	src: path.join(__dirname, 'scarlet/cms/static/scarlet/source')
}

const COPY_PATHS = [{
	context: PATHS.src,
	from: 'images/**/*'
}]

const AUTOPREFIXER_CONFIG = {
	remove: false,
	browsers: ['> 1%', 'last 2 versions']
}

const UGLIFY_CONFIG = {
	sourceMap: false,
	mangle: true,
	comments: false,
	compress: {
		warnings: false
	}
}

const WEBPACK_ENV = {
	NODE_ENV: JSON.stringify(NODE_ENV),
	DEBUG: JSON.stringify(DEBUG)
}

module.exports = {
	debug: DEBUG,
	devtool: defineWebpackDevtool(),
	entry: [
			'babel-polyfill',
			'font-awesome-sass!./webpack-font-awesome-sass.config.js',
			'eventsource-polyfill',
			'./scarlet/cms/static/scarlet/source/js/init'
	],

	output: {
		path: PATHS.static,
		filename: 'js/[name]-[hash].js',
		publicPath: 'http://localhost:3000/build/'
	},

	module: {
		loaders: createWebpackLoaders()
	},

	plugins: createWebpackPlugins(),

	postcss: function () {
		return [autoprefixer];
	},

	resolve: {
		modulesDirectories: ['scarlet/cms/static/scarlet/source/js', 'node_modules'],
		alias: {
			'jquery.ui': 'jquery-ui',
			'imagesready': 'imagesready/dist/jquery-imagesready',
			'wysihtml5': path.resolve(__dirname, './scarlet/cms/static/scarlet/source/js/views/wysiwyg/lib/wysihtml5')
		}
	}
}

function getEnvVar (key, defaultValue) {
	const value = process.env[key]
	return value != null ? value : defaultValue
}

function defineWebpackDevtool () {
	return ENV_IS_PRODUCTION ? null : 'cheap-source-map'
}

function createWebpackLoaders () {
	var loaders = [{
		test: /\.js$/,
		loader: 'babel',
		exclude: /node_modules/,
		include: PATHS.src
	}, {
		test: /\.svg$/,
		loader: 'svg-sprite'
	}, {
		test: /\.(otf|ttf|eot|woff(2)?)(\?[a-z0-9]+)?$/,
		loader: 'file'
	}, {
		test: /\.(ogg|mp?4a|mp3)$/,
		loader: 'file'
	}, {
		test: /\.scss$/,
		loader: ExtractTextPlugin.extract('style',
			'css?sourceMap!postcss!sass'),
		include: PATHS.src
	}, {
		test: /\.(ogg|mp?4a|mp3|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		loader: 'file'
	}, {
		test: /\.(woff|png|jpg|gif)$/,
		loader: 'file'
	}, {
		test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		loader: 'url?limit=10000&mimetype=application/font-woff'
	}, {
		test: /\.json$/,
		loader: 'json'
	},
	{
		test: /wysihtml5/,
		loader: 'exports?wysihtml5'
	}]

	return loaders
}

function createWebpackPlugins () {
	const plugins = [
		new DefinePlugin({ 'process.env': WEBPACK_ENV }),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		}),
		new BundleTracker({ filename: './webpack-stats.json' }),
		new ExtractTextPlugin('css/bundle.css'),
		new CopyWebpackPlugin(COPY_PATHS),
		new NoErrorsPlugin()
	]

	return plugins
}
