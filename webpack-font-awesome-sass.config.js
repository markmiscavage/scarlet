const path = require('path');

module.exports = {
  // extractStyles: true,

  styles: {
    mixins: true,
    core: true,
    icons: true,
    larger: true,
    path: true,
  },

  // styleLoader: require('extract-text-webpack-plugin').extract({
  //   fallback: 'style-loader',
  //   use: ['css-loader', 'sass-loader'],
  // }),

  fontAwesomeCustomizations: path.join(__dirname, 'scarlet/cms/static/scarlet/source/stylesheets/vendor/_font-awesome.scss'),
}
