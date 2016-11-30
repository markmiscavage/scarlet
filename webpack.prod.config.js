const webpack = require('webpack')
const path = require('path')
const config = require('./webpack.config')

const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin
const OccurenceOrderPlugin = webpack.optimize.OccurenceOrderPlugin
const DedupePlugin = webpack.optimize.DedupePlugin
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const UGLIFY_CONFIG = {
  sourceMap: false,
  mangle: true,
  comments: false,
  compress: {
    warnings: false
  }
}

function createWebpackLoaders () {
  const loaders = []

  return loaders
}


function createWebpackPlugins () {
  const plugins = [
    new ProgressBarPlugin({ width: 60 }),
    new DedupePlugin(),
    new OccurenceOrderPlugin(),
    new UglifyJsPlugin(UGLIFY_CONFIG)
  ]

  return plugins
}

config.devtool = 'cheap-source-map'
config.output.publicPath = '/build/'
config.module.loaders.push(...createWebpackLoaders())
config.plugins.push(...createWebpackPlugins())
module.exports = config
