const path = require('path');

var fontAwesomeFile = '_font-awesome.scss';
if (process.env.BUILD_ENV === 'prod') {
  fontAwesomeFile = '_font-awesome-prod.scss'
}

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

  fontAwesomeCustomizations: path.join(__dirname, `scarlet/cms/static/scarlet/source/stylesheets/vendor/${fontAwesomeFile}`),
}