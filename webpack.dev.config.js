const config = require('./webpack.config');
const webpack = require('webpack');
const BundleTracker = require('webpack-bundle-tracker');

const NoEmitOnErrorsPlugin = webpack.NoEmitOnErrorsPlugin;
const HOST = '10.0.6.29';
const PORT = '3030';

function createWebpackLoaders() {
  const rules = [];

  return rules;
}

function createWebpackPlugins() {
  const plugins = [
    new NoEmitOnErrorsPlugin(),
    new BundleTracker({
      filename: './webpack-stats.json',
    }),
  ];

  return plugins;
}

config.output.publicPath = `http://${HOST}:${PORT}/static/scarlet/build`;
config.devtool = 'cheap-source-map';
config.module.rules.push(...createWebpackLoaders());
config.plugins.push(...createWebpackPlugins());
module.exports = config;
