const path = require('path')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const DefinePlugin = webpack.DefinePlugin
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const NODE_ENV = getEnvVar('NODE_ENV', 'development')
const ENV_IS_PRODUCTION = NODE_ENV === 'production'

const PATHS = {
	static: path.join(__dirname, 'scarlet/cms/static/scarlet/build'),
	src: path.join(__dirname, 'scarlet/cms/static/scarlet/source'),
}

const COPY_PATHS = [
	{
		context: PATHS.src,
		from: 'images/**/*',
	},
	{
		context: PATHS.src,
		from: 'js/views/editor/lib/wysihtml.js',
		to: `${PATHS.static}/js/libs`,
	},
	{
		context: PATHS.src,
		from: 'js/views/editor/lib/wysihtml.toolbar.js',
		to: `${PATHS.static}/js/libs`,
	},
]

const AUTOPREFIXER_CONFIG = {
	remove: false,
	browsers: ['> 1%', 'last 2 versions'],
}

const WEBPACK_ENV = {
	NODE_ENV: JSON.stringify(NODE_ENV),
}

module.exports = {
	context: PATHS.src,
	devtool: null,
	target: 'web',

	entry: {
		main: [
			'babel-polyfill',
			`font-awesome-sass-loader!${path.resolve(
				'./webpack-font-awesome-sass.config.js'
			)}`,
			'eventsource-polyfill',
			'./js/init',
		],
	},

	output: {
		path: PATHS.static,
		filename: 'js/[name].js',
	},

	module: {
		rules: createWebpackLoaders(),
	},

	plugins: createWebpackPlugins(),

	resolve: {
		modules: ['scarlet/cms/static/scarlet/source/js', 'node_modules'],
		alias: {
			'jquery.ui': 'jquery-ui',
			imagesready: 'imagesready/dist/jquery-imagesready',
			wysihtml: path.resolve(
				__dirname,
				'./scarlet/cms/static/scarlet/source/js/views/editor/lib/wysihtml'
			),
		},
	},
}

// ..................................................

function getEnvVar(key, defaultValue) {
	const value = process.env[key]
	return value != null ? value : defaultValue
}

function createWebpackLoaders() {
	var rules = [
		{
			test: /\.js$/,
			loader: 'babel-loader',
			exclude: [/node_modules/, /wysihtml/],
			include: path.join(PATHS.src, 'js'),
		},
		{
			test: /\.scss$/,
			use: ExtractTextPlugin.extract({
				fallback: 'style-loader',
				use: [
					{
						loader: 'css-loader',
						options: {
							sourceMap: true,
						},
					},
					{
						loader: 'postcss-loader',
						options: {
							plugins: () => [require('autoprefixer')(AUTOPREFIXER_CONFIG)],
						},
					},
					{
						loader: 'sass-loader',
					},
				],
			}),
			include: path.join(PATHS.src, 'stylesheets'),
		},
		{
			test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
			loader: 'url-loader',
			options: {
				limit: 10000,
				mimetype: 'application/font-woff',
			},
		},
		{
			test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
			loader: 'file-loader',
			options: {
				name: 'fonts/[name].[ext]',
			},
		},
		{
			test: /\.(ogg|mp?4a|mp3)$/,
			loader: 'file-loader',
			options: {
				name: 'media/[name].[ext]',
			},
		},
		{
			test: /\.(png|jpg|gif|svg)$/,
			loader: 'file-loader',
			options: {
				context: '/source/images',
				name: 'images/[name].[ext]',
			},
		},
	]

	return rules
}

function createWebpackPlugins() {
	const plugins = [
		new DefinePlugin({
			'process.env': WEBPACK_ENV,
		}),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery',
		}),
		new ExtractTextPlugin({ filename: 'css/[name].css', allChunks: true }),
		new CopyWebpackPlugin(COPY_PATHS),
	]

	return plugins
}
