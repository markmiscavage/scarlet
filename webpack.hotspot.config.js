const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');

const DefinePlugin = webpack.DefinePlugin;
const NODE_ENV = getEnvVar('NODE_ENV', 'development');
const ENV_IS_PRODUCTION = NODE_ENV === 'production';

const PATHS = {
  static: path.join(__dirname, 'scarlet/cms/static/scarlet'),
  src: path.join(__dirname, 'scarlet/hotspots/source'),
  core: path.join(__dirname, 'scarlet/cms/source'),
};

const COPY_PATHS = [];

const AUTOPREFIXER_CONFIG = {
  remove: false,
  browsers: ['> 1%', 'last 2 versions'],
};

const WEBPACK_ENV = {
  NODE_ENV: JSON.stringify(NODE_ENV),
};

module.exports = {
  context: PATHS.src,
  devtool: 'cheap-source-map',
  target: 'web',

  entry: {
    hotspot: ['./js/init'],
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
    modules: [`${PATHS.src}/js`, 'node_modules', `${PATHS.core}/js`],
    alias: {
      'jquery.ui': 'jquery-ui',
      imagesready: 'imagesready/dist/jquery-imagesready',
      hotspot: path.resolve(PATHS.src, 'js/views/hotspot/lib/jquery.hotspot.js'),
    },
  },
};

// ..................................................

function getEnvVar(key, defaultValue) {
  const value = process.env[key];
  return value != null ? value : defaultValue;
}

function createWebpackLoaders() {
  const rules = [
    {
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: [/node_modules/, /wysihtml/],
      include: path.join(PATHS.src, 'js'),
    },
    {
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: [
          {
            loader: 'css-loader',
          },
        ],
      }),
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
  ];

  return rules;
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
    new BundleTracker({
      filename: './webpack-stats.json',
    }),
  ];

  return plugins;
}
