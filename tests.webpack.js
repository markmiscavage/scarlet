
var context = require.context('./scarlet/cms/static/scarlet/source/js', true, /\.spec\.js$/); //make sure you have your directory and regex test set correctly!
context.keys().forEach(context);
