var path = require('path')
var express = require('express')
var webpack = require('webpack')
var webpackDevMiddleware = require('webpack-dev-middleware')
var config = require('./webpack.dev.config')
const logger = require('morgan')

var app = express()
var compiler = webpack(config)

const HOST = 'localhost'
const PORT = '3030'

app.use(logger('combined'))
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
  })
)

app.listen(PORT, HOST, function(err) {
  if (err) {
    console.log(err)
    return
  }
  console.log(`Listening at http://${HOST}:${PORT}`)
})
