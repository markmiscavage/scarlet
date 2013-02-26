/*jshint node:true*/
module.exports = function (grunt) {
	"use strict";

	var timestamp = new Date().getTime();

	grunt.registerMultiTask("copy", "Copy source files to static dir.", function (soft) {
		this.requiresConfig("copy");

		var fs = require("fs");
		var path = require("path");
		var cwd = process.cwd() + path.sep;

		var data = this.data;

		var exclude = [
			"**/test/**/*"
		];

		for (var i = 0, j = data.length; i < j; i++) {
			var src = data[i].src;
			var dest = data[i].dest;

			var wildcard = src;

			if (fs.existsSync(src) && fs.statSync(src).isDirectory() && src.indexOf("*") === -1) {
				wildcard = path.join(src, "**", "*");
			}

			var files = grunt.file.expandFiles(wildcard);

			for (var k = 0, l = files.length; k < l; k++) {
				var file = files[k];

				if (fs.existsSync(file) && !grunt.file.isMatch(exclude, file)) {
					var stats = fs.statSync(file);

					if (!!soft && new Date(stats.ctime).getTime() < timestamp) {
						continue;
					}

					console.log("Copy ".green + file.replace(src, dest).grey);
					grunt.file.copy(file, file.replace(src, dest));
				}
			}
		}

		timestamp = new Date().getTime();
	});

};
