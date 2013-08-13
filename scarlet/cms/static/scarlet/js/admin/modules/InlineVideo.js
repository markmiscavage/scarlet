define(
	[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		"use strict";

		return DOMClass.extend({

			vars : {
				$dom : null
			},

			init : function () {
				this.sup();
				this.bindInput();
			},

			bindInput : function () {
				this.vars.$dom.on("click", this.onImageClick);
			},

			onImageClick : function (e) {
				var $el = $(e.currentTarget),
					url = $el.data("videoUrl"),
					width = $el.width(),
					height = $el.height(),
					str;

				str = [
					'<iframe width="' + width + '" height="' + height + '"',
					'src="' + url + '"',
					'frameborder="0" allowfullscreen></iframe>'
				].join("");



				this.vars.$dom.replaceWith(str);
			},

			destroy : function () {
				this.sup();
			}

		});

	}
);
