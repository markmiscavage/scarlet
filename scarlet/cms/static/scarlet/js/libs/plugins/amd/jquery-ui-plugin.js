define(

	[
		"module",
		"text"
	],

	function (module, text) {

		var prefix = "libs/plugins/jquery-ui/jquery.ui-";

		return {

			load: function (name, req, load, config) {

				req(['$'], function ($, $ui) {

					if (!config.isBuild) {

						req(["text!" + prefix + name + ".js"], function (val) {

							var contents = "define('" + module.id + "!" + name  +
							"', ['$', '$ui'], function ($, $ui) {\nvar jQuery = $;\n" + val + ";\nreturn $;\n});\n";

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
				var file = require.toUrl(prefix + name) + ".js";
				var contents = fs.readFileSync(file).toString();

				contents = "define('" + plugin + "!" + name  +
				"', ['$', '$ui'], function ($, $ui) {\nvar jQuery = $;\n" + contents + ";\nreturn $;\n});\n";

				return contents;
			},

			write: function (pluginName, moduleName, write, config) {
				write(this.loadFromFileSystem(pluginName, moduleName));
			}

		};
	}
);
