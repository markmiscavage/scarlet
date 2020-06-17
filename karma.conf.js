var webpackConfig = require('./webpack.config.js');
webpackConfig.devtool = 'inline-source-map';

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine-jquery', 'jasmine'],
    browsers: ['Chrome'],
    files: [
      'tests.webpack.js'
    ],
    reporters: ['coverage','progress'],
    preprocessors: {
      'tests.webpack.js' : ['webpack', 'sourcemap']
    },
    coverageReporter: {
      reporters: [
        {type: 'html', dir: 'coverage/'}
      ]
    },
    webpack: webpackConfig,
    colors: true,
    node: {
      fs: "empty"
    },
    webpackServer: {
      noInfo: true 
    },
    singleRun:true,
    autoWatch:true
  });
};
