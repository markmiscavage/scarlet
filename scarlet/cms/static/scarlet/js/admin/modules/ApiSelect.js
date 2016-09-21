define(

	[
		"rosy/base/DOMClass",
		"$",
		"$plugin!select2",
		"./WindowPopup"
	],

	function (DOMClass, $, jQuerySelect2, WindowPopup) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			input : null,
			label : null,
			name : null,
			toggle : null,
			isMultiple : false,

			select2 : null,

			names : [],

			param : null,
			params : [],

			values : [],

			init : function (dom) {
				this.dom = dom;
				this.dom.on('click', '[data-param]', this.clickParam);
				this.input = dom.find('input');
				this.label = $('label[for="' + this.input.attr('id') + '"]');
				this.name = this.input.attr('name');

				if (this.dom.data('add')) {
					this._initAdd();
				}

				// initialize $.select2
				if (this.input.length) {
					this.isMultiple = this.input.is('[data-multiple]');
					if (this.isMultiple) {
						this.input = this.input.eq(0);
						this.input.on('change.select2', this.updateHiddenValues);
					}

					this._initSelect2();
				}
			},

			/**********************
				Add One
			**********************/

			_initAdd : function () {
				var url = this.dom.data('add'),
					add = $('<a>').attr('href', url).addClass('button add-button').text('+');

				this.dom.prepend(add);
				this.dom.addClass('has-add-button');

				add.on('click', this._openPopup);
			},

			_openPopup : function (e) {
				var dom = $(e.currentTarget),
					url = dom.attr('href'),
					options = 'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800';

				WindowPopup.request(url, options, this._gotDataFromPopup);

				return false;
			},

			_gotDataFromPopup : function (data) {
				if (this.isMultiple) {
					var currData = this.input.select2('data');
					currData.push(data);
					this.input.after($('<input />', { value: data.id, name: this.name, type: 'hidden' })).select2('data', currData);
				} else {
					this.input.select2('data', data);
				}
			},

			/**********************
				Select 2
			**********************/

			_initSelect2 : function () {
				var placeholder = this.label.text() || 'one';
				placeholder = placeholder.replace(/[^a-z0-9]/i, '').toLowerCase();

				var opts = {
					placeholder : "Select " + placeholder,
					//minimumInputLength : 2,
					allowClear : true,
					initSelection : this.initSelection,
					formatResult : this.formatResult,
					minimumResultsForSearch : 5,
					ajax : {
						url : this.dom.data('api'),
						quietMillis : 400,
						dataType : "json",
						data : this._ajaxData,
						results : this._ajaxResults
					}
				};

				if (this.isMultiple) {
					opts.tags = this.initSelection;

					// clone this.input to preserve its value before manipulation
					if (this.input.val()) {
						this.input.after(this.input.clone());
					}

					// suffix this.input name so its comma-delimitted tags won't be submitted
					this.input.attr('name', this.input.attr('name') + '_');
				}

				this.input.select2(opts);
				this.select2 = this.input.data().select2;
			},

			formatResult : function (object, container, query) {
				return object.text;
			},

			initSelection : function (element, callback) {
				var data;

				if (this.isMultiple) {
					data = [];

					// add sibling hidden values as initial value
					this.dom.find('input[name=' + this.name + ']').each(function () {
						data.push({
							id: $(this).val(),
							text: $(this).data('title')
						});
					});

				} else {
					data = {
						id: element.val(),
						text: this.dom.data('title')
					};
				}

				callback(data);
			},

			updateHiddenValues : function (e) {
				if (e.added) {
					this.input.after($('<input />', { name: this.name, value: e.added.id, type: 'hidden' }));
				} else if (e.removed) {
					this.input.siblings('[value=' + e.removed.id + ']').remove();
				}
			},

			/**********************
				Fetching Data
			**********************/

			_ajaxData : function (term, page, context) {
				var output = {
					page : page,
					query : term
				};

				if (this.param) {
					output[this.param] = term;
				}

				return output;
			},

			_ajaxResults : function (data, page, context) {
				var param, field;

				this.names = [];
				this.params = [];

				for (param in data.params) {
					this.param = this.param || param;
					this.params.push({
						id : param,
						name : data.params[param].label
					});
				}

				for (field in data.fields) {
					this.names.push(field);
				}

				// this._initParams();
				// this._toggleSearch();

				// sanitize data
				$.each(data.results, this.proxy(function (index, result) {
					var text = [],
						i;

					for (i = 0; i < this.names.length; i++) {
						text.push(result[this.names[i]]);
					}

					result.text = text.join(' - ');
				}));

				return {
					results : data.results,
					more : !!data.next
				};
			},

			/**********************
				Params
			**********************/

			// TODO: evaluate need (ux) for sort functionality

			_initParams : function () {
				// dont init search option twice
				// dont init if there are no options
				if (this.toggle || this.params.length < 2) {
					return;
				}
				var param, i, dom;

				this.toggle = $('<div>').addClass('toggle');
				this.dom.append(this.toggle);

				for (i = 0; i < this.params.length; i++) {
					param = this.params[i];
					dom = $('<div>').attr('data-param', param.id).text(param.name);
					dom.addClass('toggle-button');
					if (i === 0) {
						dom.addClass('first');
					}
					if (i === this.params.length - 1) {
						dom.addClass('last');
					}
					this.toggle.append(dom);
					this.useParam(param.id);
				}
			},

			useParam : function (param) {
				this.dom.find('[data-param]').removeClass('active');
				this.dom.find('[data-param="' + param + '"]').addClass('active');
				this.param = param;
			},

			clickParam : function (e) {
				this.useParam($(e.currentTarget).data('param'));
			},

			_toggleSearch : function () {
				if (!this.param) {
					this.select2.search.parent().css('display', 'none');
				} else {
					this.select2.search.parent().css('display', '');
				}
			}
		});
	}
);
