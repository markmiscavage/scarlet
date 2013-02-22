require.config({

	paths : {
		"$" : "//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min",
		"CFInstall" : "//ajax.googleapis.com/ajax/libs/chrome-frame/1.0.3/CFInstall.min",
		"ChromeFrame" : "rosy/modules/google-chrome-frame/ChromeFrame",
		"Cookies" : "libs/cookies",
		"Handlebars" : "libs/handlebars",
		"async" : "libs/plugins/amd/async",
		"gmaps" : "libs/gmaps",
		"wysihtml5" : "libs/wysihtml5",
		"zynga" : "libs/zynga",
		"templates" : "../../templates",
		"json" : "libs/json3",
		"$plugin" : "libs/plugins/amd/jquery-plugin",
		"jsonFile" : "libs/plugins/amd/jsonFile",
		"text" : "libs/plugins/amd/text",
		"rosy" : "../../js/rosy"
	},

	waitSeconds : 15,

	shim : {
		"$" : {
			exports : "jQuery"
		},

		"zynga/Scroller" : {
			exports : "Scroller",
			deps : ["zynga/Animate"]
		},

		"wysihtml5" : {
			exports : "wysihtml5"
		},

		"CFInstall" : {
			exports : "CFInstall"
		},

		"Handlebars" : {
			exports : "Handlebars"
		}
	}
});
