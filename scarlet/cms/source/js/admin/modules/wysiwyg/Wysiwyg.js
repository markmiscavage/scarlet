define(

	[
		"rosy/base/DOMClass",
		"$",
		"wysihtml5",
		"./commands/commands",
		"./WysiwygRules",
		"text!./toolbar.html"
	],

	function (DOMClass, $, wysihtml5, commands, wysihtml5ParserRules, toolbar) {

		"use strict";

		var guid = 0;

		return DOMClass.extend({

			dom : null,
			toolbar : null,

			count : 0,

			init : function (dom) {
				this.dom = dom;

				this.toolbar = $(toolbar);

				this._initWysihtml5();
			},

			_initWysihtml5 : function () {
				var id = "wysihtml5-" + (++guid),
					textareaId = id + '-textarea',
					toolbarId = id + '-toolbar',
					editor;

				this.dom.before(this.toolbar);

				this.toolbar.attr('id', toolbarId);
				this.dom.attr('id', textareaId);

				editor = new wysihtml5.Editor(textareaId, {
					parserRules: wysihtml5ParserRules,
					style: false,
					toolbar: toolbarId,
					stylesheets: "/static/css/wysiwyg.css"
				});
			}
		});
	}
);
