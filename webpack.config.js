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
      'font-awesome-sass!./webpack-font-awesome-sass.config.js',
      'babel-polyfill',
      'eventsource-polyfill',
      'webpack-hot-middleware/client?path=http://localhost:3000/__webpack_hmr',
      './scarlet/cms/static/scarlet/source/js/init'
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
  },

  resolve: {
    modulesDirectories: ['scarlet/cms/static/scarlet/source/js', 'node_modules'],
    alias: {
      'jquery.ui': 'jquery-ui/jquery-ui',
      'imagesready': 'imagesready/dist/jquery-imagesready',
      'wysihtml5': path.resolve(__dirname, './scarlet/cms/static/scarlet/source/js/views/wysiwyg/lib/wysihtml5')
    }
  }
}

// ..................................................

function defineWebpackDevtool () {
  return ENV_IS_PRODUCTION ? null : 'cheap-module-source-map'
}

function createWebpackLoaders () {
  var loaders = [{
    test: /\.js$/,
    loaders: ['babel'],
    exclude: /node_modules|bower_components/,
    include: CONFIG.src
  }, {
    test: /\.(ogg|mp?4a|mp3|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'file'
  }, {
    test: /\.(woff|png|jpg|gif)$/,
    loader: 'url?limit=8192'
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
  }];

  if (ENV_IS_PRODUCTION) {
  loaders.push({
    test: /\.scss$/,
    loader: ExtractTextPlugin.extract('style',
      'css?sourceMap!postcss!sass'),
    include: CONFIG.src
  })
  } else {
    loaders.push({
      test: /\.scss$/,
      // loaders :
      // [
      //   'style-loader',
      //   'css-loader?importLoaders=2&sourceMap',
      //   'postcss-loader',
      //   'sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true'
      // ],
      loader: ExtractTextPlugin.extract('style',
        'css?sourceMap!postcss!sass'),
      include: path.join(CONFIG.src, 'stylesheets')
    })
  }
  return loaders;
}

function createWebpackPlugins () {
  const plugins = [
    new DefinePlugin({
      'process.env': {
          NODE_ENV: JSON.stringify('development'),
          BROWSER: JSON.stringify(true)
        }
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
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
      new ExtractTextPlugin('css/bundle.css'),
      new webpack.HotModuleReplacementPlugin(),
      new NoErrorsPlugin())
  }
  return plugins
}
