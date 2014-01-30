require.config({

	paths : {
		"$" : "//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min",
		"$ui": "libs/jquery-ui",
		"$plugin" : "libs/plugins/amd/jquery-plugin",
		"wysihtml5" : "libs/wysihtml5",
		"text" : "libs/plugins/amd/text",
		"rosy" : "libs/rosy/src",
		"detailsShim" : "libs/details-shim"
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

		"$ui/jquery.ui-timepicker" : {
			exports : "$.ui.timepicker",
			deps : ["$", "$ui/jquery.ui"]
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
