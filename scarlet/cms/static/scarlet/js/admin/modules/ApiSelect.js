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
			toggle : null,

			select2 : null,

			count : 0,

			name : "title",
			names : [],

			param : null,
			params : [],

			init : function (dom) {
				this.dom = dom;
				this.dom.on('click', '[data-param]', this.clickParam);
				this.input = dom.find('input');
				this.label = $('label[for="' + this.input.attr('id') + '"]');

				if (this.dom.data('add')) {
					this._initAdd();
				}

				this.names = [];
				this.params = [];

				this._initSelect2();
			},

			/**********************
				Params
			**********************/

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

			_showOrHideSearch : function () {
				if (!this.param) {
					this.select2.search.parent().css('display', 'none');
				} else {
					this.select2.search.parent().css('display', '');
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
				this.input.select2('data', data);
			},

			/**********************
				Select 2
			**********************/

			_initSelect2 : function () {
				var placeholder = this.label.text() || "one";
				placeholder = placeholder.replace(/[^a-z0-9]/i, '').toLowerCase();

				this.input.select2({
					placeholder : "Select " + placeholder,
					//minimumInputLength : 2,
					allowClear : true,
					initSelection : this.initSelection,
					formatResult : this.formatResult,
					//minimumResultsForSearch : 9999,
					ajax : {
						url : this.dom.data('api'),
						quietMillis : 400,
						dataType : "json",
						data : this._ajaxData,
						results : this._ajaxResults
					}
				});

				this.select2 = this.input.data().select2;

				this._showOrHideSearch();
			},

			formatResult : function (object, container, query) {
				return object.text;
			},

			initSelection : function (element, callback) {
				callback({
					id: element.val(),
					text: this.dom.data('title')
				});
			},

			/**********************
				Fetching Data
			**********************/

			_ajaxData : function (term, page, context) {
				var output = {
					page : page
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
					this.name = field;
					this.names.push(field);
				}

				this._initParams();
				this._showOrHideSearch();

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
			}
		});
	}
);
