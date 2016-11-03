const config = require('./webpack.config')

const webpack = require('webpack')
const path = require('path')

const BundleTracker = require('webpack-bundle-tracker')
const DefinePlugin = webpack.DefinePlugin
const NoErrorsPlugin = webpack.NoErrorsPlugin
const ProvidePlugin = webpack.ProvidePlugin

function createWebpackLoaders () {
  const loaders = [{
    test: /\.scss$/,
    loaders: [
      'style-loader',
      'css-loader?importLoaders=2&sourceMap',
      'postcss-loader',
      'sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true'
    ],
    include: path.join(config.context, 'stylesheets')
  }]

  return loaders
}

function createWebpackPlugins () {
  const plugins = [
    new NoErrorsPlugin(),
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
        BROWSER: JSON.stringify(true)
      }
    }),
    new BundleTracker({
      filename: './webpack-stats.json'
    })
  ]

  return plugins
}

config.devtool = 'cheap-source-map'
config.module.loaders.push(...createWebpackLoaders())
config.plugins.push(...createWebpackPlugins())

module.exports = config
