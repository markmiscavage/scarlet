define(

	[
		"rosy/base/DOMClass",
		"$"
	],

	function (DOMClass, $) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			origin : null,

			init : function (dom) {
				this.dom = dom;
				this.origin = dom.parents('fieldset').find('[name=' + dom.data('source-fields') + ']');

				if (this.isValueMatch()) {
					this.addListeners();
				}
			},

			getOriginValue : function () {
				return this.origin.val().replace(/\s+/g, '-').toLowerCase();
			},

			isValueMatch : function () {
				var currVal = this.getOriginValue();

				// if values are different, disable matching
				if (currVal !== this.dom.val()) {
					this.origin.addClass("disable-match");

					return false;
				}

				return true;
			},

			addListeners : function () {
				this.dom.on("keyup", this.disableSync);
				this.origin.not(".disable-match").on("keyup", this.syncValue);
			},

			syncValue : function () {
				var currVal = this.getOriginValue();
				this.dom.val(currVal);
			},

			disableSync : function () {
				if (!this.isValueMatch()) {
					this.origin.addClass("disable-match").add(this.dom).off("keyup");
				}
			}
		});
	}
);
