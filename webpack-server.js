const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const config = require('./webpack.dev.config');
const logger = require('morgan');

const app = express();
const compiler = webpack(config);

const HOST = '10.0.6.29';
const PORT = '3030';

app.use(logger('combined'));
app.use(
  webpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath,
    stats: {
      colors: true,
    },
    watch: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  }),
);

app.listen(PORT, HOST, err => {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`Listening at http://${HOST}:${PORT}`);
});
