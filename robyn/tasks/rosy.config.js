/* jshint node: true */

module.exports = function (grunt) {
	"use strict";

	var fs = require("fs"),
		cwd = process.cwd(),
		path = require("path"),
		output = path.join(cwd, "scarlet", "cms", "static", "scarlet"),
		source = path.join(cwd, "scarlet", "cms", "source", "scarlet"),
		rosyConfig = path.join("config.js");

	// Project configuration.
	grunt.config.set("requirejs", {});

	grunt.config.set("requirejs.admin", {
		options : {
			//By default all the configuration for optimization happens from the command
			//line or by properties in the config file, and configuration that was
			//passed to requirejs as part of the app's runtime "main" JS file is *not*
			//considered. However, if you prefer the "main" JS file configuration
			//to be read for the build so that you do not have to duplicate the values
			//in a separate configuration, set this property to the location of that
			//main JS file. The first requirejs({}), require({}), requirejs.config({}),
			//or require.config({}) call found in that file will be used.
			mainConfigFile : path.join(source, "js", rosyConfig),

			urlArgs : null,

			//Just specifying a module name means that module will be converted into
			//a built file that contains all of its dependencies. If that module or any
			//of its dependencies includes i18n bundles, they may not be included in the
			//built file unless the locale: section is set above.
			name : path.join("admin", "Site"),
			include : [rosyConfig],

			// The name of the optimized file is specified by 'out'.
			out : path.join(output, "scarlet.js"),

			//Introduced in 2.1.2 and considered experimental.
			//If the minifier specified in the "optimize" option supports generating
			//source maps for the minfied code, then generate them. The source maps
			//generated only translate minified JS to non-minified JS, it does not do
			//anything magical for translating minfied JS to transpiled source code.
			//Currently only optimize: "uglify2" is supported when running in node or
			//rhino, and if running in rhino, "closure" with a closure compiler jar
			//build after r1592 (20111114 release).
			//The source files will show up in a browser developer tool that supports
			//source maps as ".js.src" files.
			generateSourceMaps : false, // true

			//By default, comments that have a license in them are preserved in the
			//output. However, for a larger built files there could be a lot of
			//comment files that may be better served by having a smaller comment
			//at the top of the file that points to the list of all the licenses.
			//This option will turn off the auto-preservation, but you will need
			//work out how best to surface the license information.
			preserveLicenseComments : false,

			//How to optimize all the JS files in the build output directory.
			//Right now only the following values
			//are supported:
			//- "uglify": (default) uses UglifyJS to minify the code.
			//- "uglify2": in version 2.1.2+. Uses UglifyJS2.
			//- "closure": uses Google's Closure Compiler in simple optimization
			//mode to minify the code. Only available if running the optimizer using
			//Java.
			//- "closure.keepLines": Same as closure option, but keeps line returns
			//in the minified files.
			//- "none": no minification will be done.
			optimize : "none", // "uglify2"

			//If using UglifyJS for script optimization, these config options can be
			//used to pass configuration values to UglifyJS.
			//For possible values see:
			//http://lisperator.net/uglifyjs/codegen
			//http://lisperator.net/uglifyjs/compress
			uglify2 : {
				warnings : false
			},

			//If skipModuleInsertion is false, then files that do not use define()
			//to define modules will get a define() placeholder inserted for them.
			//Also, require.pause/resume calls will be inserted.
			//Set it to true to avoid this. This is useful if you are building code that
			//does not use require() in the built project or in the JS files, but you
			//still want to use the optimization tool from RequireJS to concatenate modules
			//together.
			skipModuleInsertion: false
		}
	});

	grunt.config.set("watch.rosy", {
		files: [
			path.join(source, "js", "*.js"),
			path.join(source, "js", "admin", "**", "*.js")
		],
		options: {
			interrupt: true,
			livereload: true,
			debounceDelay: 250
		}
	});

};
