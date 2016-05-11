module.exports = {
  fontAwesomeCustomizations: './scarlet/cms/static/scarlet/source/stylesheets/base/_font-awesome.config.scss',
 
 	styleLoader: require('extract-text-webpack-plugin').extract('style-loader', 'css-loader!sass-loader'),

  styles: {
    'mixins': true,
 
    'core': true,
    'icons': true,
 
    'larger': true,
    'path': true,
  }
};