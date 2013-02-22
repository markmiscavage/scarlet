define(

	[
		"module"
	],

	function (module) {

		"use strict";

		var prefix = module.id.split("/");
		prefix.splice(prefix.length - 2, 2, "");
		prefix = prefix.join("/");

		return {

			"aliases" : {
				"/" : "/index.html"
			},

			"viewGroups" : [
				{
					"config" : {
						"id" : "main",
						"selector" : "#main",
						"useHistory" : true, // true|false|"#"
						"transition" : "sync" // sync|async|preload|reverse
					},

					"routes" : [
						{
							"viewClass" : prefix + "views/Admin",
							"route" : /\/admin(.*)/,
							"config" : {
								"bodyClass" : "admin",
								"title" : "Admin"
							}
						}
					]
				}
			]
		};
	}
);
