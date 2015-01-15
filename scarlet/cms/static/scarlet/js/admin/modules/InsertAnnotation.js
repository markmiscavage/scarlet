define(
	[
		"./Insert",
		"$"
	],
	function (Insert, $) {

		"use strict";

		return Insert.extend({

			bindInputs : function () {
				this.sup();
				this.vars.$node = this.$dom.find('.wysiwyg-textarea');

				this.$dom.find('#test').on("click", this.test);
			},

			test : function () {
				this.vars.$form.submit();
			}

		});

	});
