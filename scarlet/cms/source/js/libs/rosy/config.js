require.config({
	paths: {
		"$": "libs/jquery/index",
		"json": "libs/json3/index",
		"Cookies": "libs/cookies/index",
		"text": "libs/requirejs-text/index",
		"Handlebars": "libs/handlebars/index",
		"templates": "../../templates",
		"rosy": "libs/rosy/src",
		"jsonFile": "libs/rosy/src/plugins/json-file/jsonFile",
		"$plugin": "libs/rosy/src/plugins/jquery-plugin/jquery-plugin"
	},

	waitSeconds: 15,

	shim: {
		"$": {
			exports: "jQuery"
		},

		"Handlebars": {
			exports: "Handlebars"
		}
	}
});
