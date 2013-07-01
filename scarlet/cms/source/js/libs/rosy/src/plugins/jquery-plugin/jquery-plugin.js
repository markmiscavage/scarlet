define(

	[
		"module",
		"text"
	],

	function (module, text) {

		return {

			load: function (name, req, load, config) {

				req(['$'], function ($) {

					if (!config.isBuild) {

						req(["text!" + name + ".js"], function (val) {

							var contents = "define('" + module.id + "!" + name  +
							"', ['$'], function ($) {\nvar jQuery = $;\n" + val + ";\nreturn $;\n});\n";

							eval(contents);

							req([module.id + "!" + name], function (val) {
								load(val);
							});

						});

					}
					else {
						load("");
					}
				});
			},

			loadFromFileSystem : function (plugin, name) {
				var fs = nodeRequire('fs');
				var file = require.toUrl(name) + ".js";
				var contents = fs.readFileSync(file).toString();

				contents = "define('" + plugin + "!" + name  +
				"', ['$'], function ($) {\nvar jQuery = $;\n" + contents + ";\nreturn $;\n});\n";

				return contents;
			},

			write: function (pluginName, moduleName, write, config) {
				write(this.loadFromFileSystem(pluginName, moduleName));
			}

		};
	}
);
