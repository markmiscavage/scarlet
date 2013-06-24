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

			// Generates or updates the image with the latest input value.
			onInput : function (e) {

				var $target = $(e.currentTarget),
					attribute = $target.data('attribute'),
					value = $(e.currentTarget).val(),
					$preview = this.$dom.find(".image-preview"),
					$img = $preview.find('img');

				// Adjusts the source to come from the data attribute.
				if ($target.attr('data-src')) {
					$preview.empty();
					$img = $preview.find('img');
					value = $target.attr('data-src');
				}

				if (!$img.length) {

					$img = $("<img />");
					$preview.append($img);

					this.vars.$node = $img;

					$img.on("load", this.proxy(function (e) {

						var width = $img.width(),
							height = $img.height();

						this.vars.size.width = width;
						this.vars.size.height = height;

						this.setAttribute("width", width);
						this.setAttribute("height", height);

					}));

				} else {
					this.vars.$node = $img;
				}

				if (attribute === "width" || attribute === "height") {

					value = value.replace("px", "");

					if (this.vars.constrain) {
						this.constrainProportion(attribute, value);
					}

					this.vars.size[attribute] = value;

				}

				this.vars.$node = $img.attr(attribute, value);

			}


		});

	});
