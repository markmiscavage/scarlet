define(
	function (require, exports, module) {

		"use strict";

		var DOMClass             = require("rosy/base/DOMClass"),
			$                    = require("$"),

			guid = 0,

			WindowPopup = DOMClass.extend({

			init : function (dom) {

			},

			request : function (url, options, cb) {
				var name = 'windowpopupguid' + (++guid),
					newWin;

				window[name] = function (data) {
					cb(data);
					newWin.close();
					window[name] = null;
					delete window[name];
				};

				newWin = window.open(url, name, options);
			},

			respond : function (data) {
				var name = window.name;

				if (window.opener && window.opener[name] && typeof window.opener[name] === 'function') {
					window.opener[name](data);
				}
			}
		});

		return new WindowPopup();
	}
);
