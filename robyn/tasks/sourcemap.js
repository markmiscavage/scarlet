/* jshint node: true */

module.exports = function (grunt) {
	"use strict";

	grunt.registerTask("requirejs:srcmapfix", "Fix source map paths.", function () {
		var done = this.async();

		var fs = require("fs"),
			path = require("path"),
			cwd = process.cwd(),
			colors = require("colors"),
			output = path.join(cwd, "scarlet", "cms", "static", "scarlet"),
			source = path.join(cwd, "scarlet", "cms", "source", "scarlet");

		var mapsPath = path.join(output, "**", "*.map");
		var maps = grunt.file.expand(mapsPath);

		console.log();

		maps.forEach(function (mapPath) {
			var map = grunt.file.readJSON(mapPath);
			var sources = map.sources;

			if (sources.length) {
				sources.forEach(function (src, i) {
					var absPath = path.resolve(path.dirname(mapPath), src);
					sources[i] = absPath.replace(path.join(source, path.sep), "");
				});

				grunt.log.writeln(("Update paths in " + mapPath.replace(path.join(cwd, path.sep), "")).grey);
				grunt.file.write(mapPath, JSON.stringify(map));
			}
		});

		done();
	});

};
