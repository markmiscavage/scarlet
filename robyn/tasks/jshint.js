/*jslint node: true */
module.exports = function (grunt) {
	"use strict";

	var fs = require("fs"),
		cwd = process.cwd(),
		path = require("path"),
		source = path.join(cwd, "scarlet", "cms", "source", "js"),
		jshint = require("jshint").JSHINT;

	var FILES = path.join(source, "**", "*[^.min].js");

	function pad(str, len, padChar) {

		str = str.toString();

		if (typeof padChar === "undefined") {
			padChar = " ";
		}

		while (str.length < len) {
			str = padChar + str;
		}
		return str;
	}

	function trim(str) {
		str = str.replace(/^\s\s*/, '');
		var	ws = /\s/,
			i = str.length - 1;

		while (ws.test(str.charAt(i))) {
			i = i - 1;
		}
		return str.slice(0, i + 1);
	}

	grunt.registerTask("jshint", "JSHint your JavaScript.", function (mode) {

		var done = this.async();
		var jshintOptions = grunt.file.readJSON(path.join(source, ".jshintrc"));

		if (mode === "browser") {
			jshintOptions.node = false;
			jshintOptions.devel = false;
			jshintOptions.browser = true;
		}

		var hasErrors = false;

		var exclude = grunt.file.read(path.join(source, ".jshintignore")).trim().split("\n");
		var files = grunt.file.expand({
			filter: "isFile"
		}, FILES).filter(function (file) {
			return exclude.every(function (x) {
				x = x.replace(/\./g, "\\.");
				x = x.replace(/^\*/g, ".*");

				var match = (new RegExp(x).test(file));
				return !match;
			});
		});

		var length = files.length;
		var x = 0;

		var handleContents = function (filename) {
			return function (stderr, contents) {
				if (!jshint(contents, jshintOptions)) {
					hasErrors = true;

					grunt.log.writeln();
					grunt.log.writeln("Err ".red + filename);

					for (var j = 0; j < jshint.errors.length; j ++) {
						var err = jshint.errors[j],
							line = ["line", pad(err.line, 1, " "), ": char", pad(err.character, 1, " "), pad("", 1)].join(" ").grey.bold,
							reason = err.reason.yellow;

						grunt.log.writeln(pad("", 4) + line + reason);
						grunt.log.writeln(pad("", 22) + trim(err.evidence).white);
						grunt.log.writeln();
					}
				} else if (!grunt.option("quiet")) {
					grunt.log.writeln("Ok  ".green + filename);
				}

				if (length === ++x) {
					return done(!hasErrors);
				}
			};
		};

		for (var i = 0; i < files.length; i ++) {
			var file = files[i];

			var fa = file.split(path.sep);
			fa[fa.length - 1] = fa[fa.length - 1].white;
			var filename = fa.join(path.sep).grey;

			fs.readFile(file, "utf8", handleContents(filename));
		}

	});

	grunt.config.set("build.jshint", ["jshint:browser"]);
};
