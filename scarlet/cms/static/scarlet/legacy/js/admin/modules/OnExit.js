define(
	function (require, exports, module) {

		"use strict";

		var DOMClass             = require("rosy/base/DOMClass"),
			$                    = require("$"),
			OnExit;

		OnExit = DOMClass.extend({

			_isSubmitting : false,

			forms : {},

			init : function (dom) {
				// console.warn("OnExit : init(dom)", dom);
				// console.log("forms", this.forms);
				// $('form').on('submit', this.onSubmit);
				// $(window).on('beforeunload', this.onUnload);
				// this.cacheValues();
			},

			cacheValues : function () {
				// console.warn("OnExit : cacheValues()");
				// console.log("forms", this.forms);
				$('form').each(this.proxy(function (i, form) {
					form = $(form);
					var id = form.data('form-id'),
						values = {};

					if (!id) {
						return;
					}

					form.find('[name]').each(function (i, input) {
						input = $(input);
						values[input.attr('name')] = input.val();
					});

					this.forms[id] = values;
				}));
			},

			isDirty : function () {
				// console.warn("OnExit : isDirty()");
				// console.log("forms", this.forms);
				var isDirty = false;

				$('form').each(this.proxy(function (i, form) {
					form = $(form);
					var id = form.data('form-id'),
						values = this.forms[id],
						value;

					if (!id) {
						return;
					}

					form.find('[name]').each(function (i, input) {
						input = $(input);
						value = values[input.attr('name')];

						if (value !== undefined && value !== input.val()) {
							isDirty = true;
							/*
							window.console.log("In form", id, input.attr('name'),
								'changed from', values[input.attr('name')],
								'to', input.val());
							*/
						}
					});
				}));

				return isDirty;
			},

			onSubmit : function (e) {
				// console.warn("OnExit : onSubmit(e)", e);
				// console.log("forms", this.forms);
				this._isSubmitting = true;
			},

			onUnload : function (e) {
				// console.warn("OnExit : onUnload(e)", e);
				// console.log("forms", this.forms);
				if (!this._isSubmitting && this.isDirty()) {
					if (e) {
						e.returnValue = "You have unsaved changes";
					}
					return "You have unsaved changes";
				}
			}

		});

		return new OnExit();
	}
);
