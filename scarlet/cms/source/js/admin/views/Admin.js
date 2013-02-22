define(

	[
		"./Page",
		"$",
		"$plugin!select2",
		"../modules/Widgets",
		"../modules/WidgetEvents"
	],

	function (Page, $, jQuerySelect2, Widgets, WidgetEvents) {

		"use strict";

		return Page.extend({

			widgets : null,

			init : function () {

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

			loadComplete : function () {
				this.tableDnD();

				// widgets
				this.widgets = new Widgets();
				this.publish(WidgetEvents.RENDER, {
					dom : document
				});

				this.sup();
			},

			update : function () {
				console.log("UPDATE");
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
