define(

	[
		"rosy/base/DOMClass",
		"$",
		"wysihtml5",
		"./commands/commands",
		"./WysiwygRules"
	],

	function (DOMClass, $, wysihtml5, commands, wysihtml5ParserRules) {

		"use strict";

		var guid = 0;

		return DOMClass.extend({

			dom : null,
			toolbar : null,
			textarea : null,

			count : 0,

			init : function (dom) {
				this.dom = dom;
				this.toolbar = this.dom.find('.wysiwyg-toolbar');
				this.textarea = this.dom.find('.wysiwyg-textarea');

				this._initWysihtml5();
			},

			_initWysihtml5 : function () {
				var id = "wysihtml5-" + (++guid),
					textareaId = id + '-textarea',
					toolbarId = id + '-toolbar',
					editor;

				this.toolbar.attr('id', toolbarId);
				this.textarea.attr('id', textareaId);

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
