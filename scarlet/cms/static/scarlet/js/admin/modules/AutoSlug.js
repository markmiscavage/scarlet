define(

	[
		"rosy/base/DOMClass",
		"$"
	],

	function (DOMClass, $) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			slug : null,

			init : function (dom) {
				this.dom = dom;
				this.slug = dom.parent('fieldset').find('[name=' + dom.data('auto-slug') + ']');

				if (this.isValueMatch()) {
					this.addListeners();
				}
			},

			isValueMatch : function () {
				var currVal = this.dom.val().replace(/\s+/g, '-').toLowerCase();

				// if values are different, disable matching
				if (currVal !== this.slug.val()) {
					this.dom.addClass("disable-match");

					return false;
				}

				return true;
			},

			addListeners : function () {
				this.slug.on("keyup", this.disableSync);
				this.dom.not(".disable-match").on("keyup", this.syncSlug);
			},

			syncSlug : function () {
				var currVal = this.dom.val().replace(/\s+/g, '-').toLowerCase();
				this.slug.val(currVal);
			},

			// if slug is modified, disable matching
			disableSync : function () {
				//this.slug.val(this.slug.val().replace(/\s+/g, '-').toLowerCase());
				this.dom.addClass("disable-match").add(this.slug).off("keyup");
			}
		});
	}
);
