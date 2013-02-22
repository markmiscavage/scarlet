define(

	[
		"rosy/base/DOMClass",
		"$",
		"$plugin!select2",
		"$plugin!ui",
		"./WidgetEvents"
	],

	function (DOMClass, $, jQuerySelect2, jQueryUI, WidgetEvents) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			forms : null,

			prefix : '',

			isDraggable : false,

			init : function (dom) {
				this.dom = dom;
				this.forms = dom.find('.widget-formset-forms');
				this.prefix = this.dom.data('prefix');

				this.dom.on('click', '.widget-formset-delete', this._delete);
				this.dom.on('click', '.widget-formset-add', this._add);

				this._initSort();
			},

			_delete : function (e) {
				var dom = $(e.currentTarget),
					form = dom.closest('.widget-formset-form');

				dom.find('input').attr('checked', true);

				form.addClass('was-deleted');
				form.find('.widget-formset-order input').val(0);

				this._resort();
			},

			/************************************
				Add
			************************************/

			_count : function () {
				return this.dom.find('.widget-formset-form').length;
			},

			_add : function () {
				var clone = $('<div>').addClass('widget-formset-form added-with-js'),
					html = this.dom.find('.widget-formset-form-template').html();

				html = html.replace(/(__prefix__)/g, this._count());
				clone.html(html);

				this.forms.append(clone);

				if (this.isDraggable) {
					clone.addClass('draggable');
				}

				this.publish(WidgetEvents.RENDER, {
					dom : clone
				});

				this._resort();
			},

			/************************************
				Sorting
			************************************/

			_initSort : function () {
				if (this.forms.find('.widget-formset-order').length) {
					this.forms.sortable({
						update : this._resort,
						change : this._resort
					});
					this.dom.find('.widget-formset-form').addClass('draggable');
					this.isDraggable = true;
				}
				this._resort();
			},

			_resort : function () {
				var order = 0,
					forms = this.dom.find('.widget-formset-form'),
					helper = this.dom.find('.ui-sortable-helper'),
					placeholder = this.dom.find('.ui-sortable-placeholder');

				forms.each(function (i, dom) {
					dom = $(dom);

					if (dom.is('.was-deleted, .ui-sortable-helper')) {
						return;
					}

					if (order % 2) {
						dom.addClass('odd');
					} else {
						dom.removeClass('odd');
					}

					dom.find('.widget-formset-order input').val(order);
					order++;
				});

				if (placeholder.hasClass('odd')) {
					helper.addClass('odd');
				} else {
					helper.removeClass('odd');
				}

				this.dom.find('#id_' + this.prefix + '-TOTAL_FORMS').val(forms.length);
			}
		});
	}
);
