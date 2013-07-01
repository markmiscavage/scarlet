/* jshint node: true */
module.exports = function (grunt) {
	"use strict";

	var path = require("path");
	var fs = require("fs");

	var cwd = process.cwd();

	var sourcePath = path.join("scarlet", "cms", "source");
	var staticPath = path.join("scarlet", "cms", "static");

	// Config options
	grunt.config.set("caboose", {});

	grunt.config.set("caboose.admin", {
		http_path: "/",
		sass_dir: path.join(sourcePath, "compass", "scss", "admin"),
		css_dir: path.join(staticPath, "css"),
		images_dir: path.join(sourcePath, "img"),
		fonts_dir: path.join(sourcePath, "fonts"),
		javascripts_dir: path.join(staticPath, "js"),
		additional_import_paths: [
			path.join(sourcePath, "compass", "scss", "caboose")
		],
		output_style: ":expanded",
		line_comments: true,
		relative_assets: true,
		bundle_exec: true,
		force_compile: false,
		clean: true
	});

	grunt.config.set("build.caboose", ["caboose:admin"]);
};
