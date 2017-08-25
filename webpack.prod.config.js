const webpack = require('webpack');
const config = require('./webpack.config');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');

const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

const UGLIFY_CONFIG = {
  mangle: true,
  comments: false,
  compress: {
    drop_debugger: false,
  },
  sourceMap: true,
};

function createWebpackLoaders() {
  const rules = [];

  return rules;
}

function createWebpackPlugins() {
  const plugins = [
    new ProgressBarPlugin({ width: 60 }),
    new UglifyJsPlugin(UGLIFY_CONFIG),
    new BundleTracker({
      filename: './webpack-stats.json',
    }),
  ];

  return plugins;
}

config.devtool = 'source-map'; // 'cheap-source-map' doesn't work with uglify
config.output.publicPath = '/static/';
config.module.rules.push(...createWebpackLoaders());
config.plugins.push(...createWebpackPlugins());
module.exports = config;
