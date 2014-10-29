/* jshint loopfunc: true */

define(

	[
		"rosy/base/DOMClass",
		"$",
		"$ui",
		"$plugin!select2",
		"./WidgetEvents",
		"./wysiwyg/Wysiwyg",
	],

	function (DOMClass, $, $ui, jQuerySelect2, WidgetEvents, Wysiwyg) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			forms : null,

			types: [],

			prefix : '',

			isDraggable : false,

			init : function (dom) {
				this.dom = dom;
				this.forms = dom.find('.widget-formset-forms');
				this.controls = dom.next('.widget-formset-controls');
				this.prefix = this.dom.data('prefix');

				this.dom.on('click', '.widget-formset-delete', this._delete);

				this._initTypes();
				this._initSort();
				this._initControls();
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

			_count : function (typeOf) {
				return this.dom.find('.widget-formset-form[data-prefix=' + typeOf + ']').length;
			},

			_add : function (e) {
				var $scope = $(e.currentTarget),
					typeOf = $scope.data('prefix'),
					clone = $('<div>').addClass('widget-formset-form added-with-js').attr('data-prefix', typeOf),
					html = $scope.find('.widget-formset-form-template').html();

				html = html.replace(/(__prefix__)/g, this._count(typeOf));
				clone.html(html);

				this.forms.append(clone);

				if (this.isDraggable) {
					clone.addClass('draggable');
				}

				this.publish(WidgetEvents.RENDER, {
					dom : clone
				});

				if (this.types.indexOf(typeOf) === -1) {
					this.types.push(typeOf);
				}

				this._initSort();
			},

			/************************************
				Sorting
			************************************/

			_initSort : function () {
				if (this.forms.find('.widget-formset-order').length) {
					this.forms.sortable({
						update : this._resort,
						//change : this._resort,
						stop   : this._repairWysiwyg
					});
					this.dom.find('.widget-formset-form').addClass('draggable');
					this.isDraggable = true;
				}
				this._resort();
			},

			_resort : function () {
				var helper = this.dom.find('.ui-sortable-helper'),
					placeholder = this.dom.find('.ui-sortable-placeholder');

				this.dom.find('.widget-formset-form').each(function (i, dom) {
					dom = $(dom);

					if (dom.is('.was-deleted, .ui-sortable-helper')) {
						return;
					}

					if (i % 2) {
						dom.addClass('odd');
					} else {
						dom.removeClass('odd');
					}

					dom.find('.widget-formset-order input').val(i);
				});

				if (placeholder.hasClass('odd')) {
					helper.addClass('odd');
				} else {
					helper.removeClass('odd');
				}

				this._updateMetadata();
			},

			// workaround for WYSIHTML5 failing after iframe is moved
			_repairWysiwyg : function (e, elem) {
				var $wysiwyg = $(elem.item[0]).find('.widget-wysiwyg');

				if ($wysiwyg.length) {
					$('.wysihtml5-sandbox', $wysiwyg).remove();
					var wysiwyg = new Wysiwyg($wysiwyg);
				}
			},

			/************************************
				Metadata
			************************************/

			_initTypes : function () {
				var self = this;
				this.controls.find('.widget-formset-add').each(function () {
					self.types.push($(this).data('prefix'));
				});
			},

			_updateMetadata : function () {
				for (var i = 0; i < this.types.length; i++) {

					var typeOf = this.types[i],
						$formset = $('.widget-formset-form[data-prefix=' + typeOf + ']');

					$formset.each(function (n, el) {
						var $this = $(this);
						$this.find('.widget-formset-order input').val($this.prevAll().length);
					});

					$('#id_' + typeOf + '-TOTAL_FORMS').val($formset.length);
				}
			},

			/************************************
				Controls
			************************************/

			_initControls : function () {
				var attrDataPrefix = this.prefix ? '[data-prefix=' + this.prefix + ']' : '[data-prefix]';

				$('.widget-formset-add' + attrDataPrefix).on('click', this._add);

				this.controls.filter('.dropdown')
					.on('click', this._toggleOptions)
					.on('mouseout', this._closeOptions);
			},

			_toggleOptions : function (e) {
				$(e.currentTarget).toggleClass('show');
			},

			_closeOptions : function (e) {
				var parent = e.currentTarget,
					child = e.toElement || e.relatedTarget;

				// check all children (checking from bottom up)
				// prevent closing on child event
				while (child && child.parentNode && child.parentNode !== window) {

					if (child.parentNode === parent || child === parent) {

						if (child.preventDefault) {
							child.preventDefault();
						}

						return false;
					}

					child = child.parentNode;
				}

				$(parent).removeClass('show');
			}
		});
	}
);
