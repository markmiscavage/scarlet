define(

	[
		"./Page",
		"$",
		"$ui",
		"$plugin!select2",
		"../modules/Widgets",
		"../modules/WidgetEvents",
		"detailsShim"
	],

	function (Page, $, $ui, jQuerySelect2, Widgets, WidgetEvents, detailsShim) {

		"use strict";

		return Page.extend({

			widgets : null,

			init : function () {
				this.sup();

				this.tableDnD();

				// widgets
				this.widgets = new Widgets();
				this.publish(WidgetEvents.RENDER, {
					dom : document
				});

				this.transitionIn();
			},

			tableDnD : function () {
				$("table").each(function () {
					var draggable = $(this).find("tr[draggable]").parents("tbody");

					draggable.sortable({
						stop: function (e, ui) {
							var inputs = $(ui.item.context.offsetParent).find(":text");

							for (var i = 0; i < inputs.length; i++) {
								inputs[i].value = i + 1;
							}
						}
					});
				});
			},

			update : function () {

			},

			transitionIn : function () {
				this.sup();
			},

			transitionOut : function () {
				this.sup();
			},

			destroy : function () {
				this.sup();
			}
		});
	}
);
