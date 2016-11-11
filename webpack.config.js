const path = require('path')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const DefinePlugin = webpack.DefinePlugin
const ExtractTextPlugin = require('extract-text-webpack-plugin')

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

const WEBPACK_ENV = {
  NODE_ENV: JSON.stringify(NODE_ENV),
  DEBUG: JSON.stringify(DEBUG)
}

module.exports = {
  context: PATHS.src,
  debug: DEBUG,
  devtool: null,
  target: 'web',

  entry: {
    main: [
      'babel-polyfill',
      'font-awesome-sass!'+ path.resolve('./webpack-font-awesome-sass.config.js'),
      'eventsource-polyfill',
      './js/init'
    ]
  },

  output: {
    path: PATHS.static,
    filename: 'js/[name].js'
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
      'wysihtml5': path.resolve(__dirname, './scarlet/cms/static/scarlet/source/js/views/editor/lib/wysihtml5')
    }
  }
}

// ..................................................

function getEnvVar (key, defaultValue) {
  const value = process.env[key]
  return value != null ? value : defaultValue
}

function createWebpackLoaders () {
  var loaders = [{
    test: /\.js$/,
    loader: 'babel-loader',
    exclude: [
      /node_modules/,
      /wysihtml5/
    ],
    include: path.join(PATHS.src, 'js')
  },
  {
    test: /\.scss$/,
    loader: ExtractTextPlugin.extract('style',
      'css?sourceMap!postcss!sass'),
    include: path.join(PATHS.src, 'stylesheets')
  },
  {
    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'url-loader?limit=10000&mimetype=application/font-woff&name=fonts/[name].[ext]'
  },
  {
    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'file?name=fonts/[name].[ext]'
  },
  {
    test: /\.(ogg|mp?4a|mp3)$/,
    loader: 'file?name=media/[name].[ext]'
  },
  {
    test: /\.(png|jpg|gif|svg)$/,
    loader: 'file?context=/source/images&name=images/[name].[ext]'
  },
  {
    test: /\.json$/,
    loader: 'json?name=data/[name].[ext]'
  },
  {
    test: /wysihtml5/,
    loader: 'exports?wysihtml5'
  }]

  return loaders
}

function createWebpackPlugins () {
  const plugins = [
    new DefinePlugin({
      'process.env': WEBPACK_ENV
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
    }),
    new ExtractTextPlugin('css/[name].css', { allChunks: true }),
    new CopyWebpackPlugin(COPY_PATHS)
  ]

  return plugins
}
