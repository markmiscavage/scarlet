const webpack = require('webpack')
const path = require('path')
const config = require('./webpack.config')

const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const UGLIFY_CONFIG = {
  mangle: true,
  comments: false,
}

function createWebpackLoaders() {
  const rules = []

  return rules
}

function createWebpackPlugins() {
  const plugins = [
    new ProgressBarPlugin({ width: 60 }),
    new UglifyJsPlugin(UGLIFY_CONFIG),
  ]

  return plugins
}

config.devtool = 'cheap-source-map'
config.output.publicPath = '/build/'
config.module.rules.push(...createWebpackLoaders())
config.plugins.push(...createWebpackPlugins())
module.exports = config
