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

	grunt.config.set("build.caboose", {
		"pre": ["caboose:bundle"],
		"build": ["caboose:admin"]
	});

	grunt.config.set("watch.caboose", {
		files: path.join(sourcePath, "**", "*.s{a,c}ss"),
		tasks: ["caboose:admin"],
		options: {
			interrupt: true
		}
	});

	grunt.config.set("watch.livereload", {
		files: [
			path.join(staticPath, "css", "**", "*.css"),
			path.join(staticPath, "img", "**", "*.{png,jpg,jpeg,gif,webm,svg}")
		],
		options: {
			interrupt: true,
			livereload: true,
			debounceDelay: 250
		}
	});

};
