define(
	[
		"./Insert",
		"$"
	],
	function (Insert, $) {

		"use strict";

		return Insert.extend({

			// Extending to bind to a special data-respond attribute for Select2.
			bindInputs : function () {
				this.sup();
				this.$dom.find('[data-respond=\"true\"]').on("change", this.onInput);
			},

			// Generates or updates the audio with the latest input value.
			onInput : function (e) {

				var $target = $(e.currentTarget),
					attribute = $target.data('attribute'),
					value = $(e.currentTarget).val(),
					$audio = this.$dom.find('audio');

				// Adjusts the source to come from the data attribute.
				if ($target.attr('data-src') && value) {
					value = $target.attr('data-src');
				}

				$audio[0].src = value;
				$audio[0].load();

				this.vars.$node = $audio;
			}

		});

	});
