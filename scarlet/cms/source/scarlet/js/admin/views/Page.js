define(

	[
		"rosy/base/DOMClass",
		"$"
	],

	function (DOMClass, $) {

		"use strict";

		var $body = $("body");

		return DOMClass.extend({

			$content : "",

			init : function () {
				this.sup();
				this.$content = $("#main");
			},

			transitionIn : function () {
				this.$content.animate({opacity : 1}, 500, this.transitionInComplete);
			},

			transitionOut : function () {
				this.$content.animate({opacity : 0}, 500, this.transitionOutComplete);
			},

			destroy : function () {
				this.$content = null;
			}
		});
	}
);
