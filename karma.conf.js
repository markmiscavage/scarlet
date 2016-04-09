var webpackConfig = require('./webpack.config.js');
webpackConfig.devtool = 'inline-source-map';

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    browsers: ['Chrome'],
    files: [
      // 'scarlet/cms/static/scarlet/source/js/**/*.spec.js'
      'tests.webpack.js'
    ],
    reporters: ['coverage','progress'],
    preprocessors: {
      // 'scarlet/cms/static/scarlet/source/js/**/*.spec.js' : ['webpack', 'sourcemap']
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
    singleRun:false
  });
};
