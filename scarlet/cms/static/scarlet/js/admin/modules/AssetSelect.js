define(

	[
		"rosy/base/DOMClass",
		"$",
		"$plugin!select2",
		"./WidgetEvents",
		"./WindowPopup"
	],

	function (DOMClass, $, jQuerySelect2, WidgetEvents, WindowPopup) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			preview : null,
			input : null,

			count : 0,

			popup : null,

			init : function (dom) {
				this.dom = dom;
				this.input = dom.find('input');
				this.preview = dom.find('.widget-asset-preview');

				this.cropsList = dom.find('.crops-list');
				this.baseLink = this.cropsList.data('base-link');

				this._autoTag();
				this._initSelect2();
				this._linkifyCrops();
			},

			_initSelect2 : function () {
				this.input.select2({
					placeholder : "Choose an asset",
					//minimumInputLength : 2,
					allowClear : true,
					initSelection : this.initSelection,
					formatSelection : this.formatSelection,
					formatResult : this.formatResult,
					ajax : {
						url : this.dom.data('api'),
						quietMillis : 500,
						dataType : "json",
						data : this._ajaxData,
						results : this._ajaxResults
					}
				});

				this.input.on('change', this.onChange);

				this._tag();

				this.dom.on('click', '.button, .crop-link', this._openPopup);
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

			_linkifyCrops : function (dom) {
				var guidLink = this.baseLink + this.cropsList.parent().find('[type=hidden]').val();

				this.cropsList.find('li').each(function (i, el) {
					el = $(el);

					var editLink = guidLink + "/" + el.data("crop-link") + '?popup=1';

					el.find('a').attr('href', editLink);
				});
			},

			_autoTag : function () {
				var tags = [];
				$('[data-auto-tag]').each(function (i, dom) {
					var data_auto_tag = $(dom).data('auto-tag');
					if (data_auto_tag) {
						var allTags = data_auto_tag.toLowerCase().split(',');
						while (allTags.length) {
							var tag = allTags.shift();
							var splitTag = tag.split(" ");
							tags.push(tag);

							// if splitTag length > 3, push individual values
							if (tag.match(/[a-z0-9]/i) && splitTag.length > 3) {
								while (splitTag.length) {
									var newTag = splitTag.shift();
									if (tags.indexOf(newTag) === -1) {
										tags.push(newTag);
									}
								}
							}
						}
						tags = tags.concat(allTags);
					}
				});
				$('#auto_tags').val(tags.join(','));
				this._auto_tags = tags;
			},

			_tag : function () {

				if (!this.dom.find('a.button').length) {
					return;
				}

				var dom = this.dom.find('a.button'),
					params = this._unparam(dom[0].search),
					tags = ($(this.dom).data('tags') || '').toLowerCase().split(',');

				tags = tags.concat(this._auto_tags);
				params.tags = encodeURIComponent(tags.join(','));
				dom[0].search = this._param(params);
			},

			_param : function (obj) {
				var op = [],
					i;
				for (i in obj) {
					op.push(i + '=' + obj[i]);
				}
				return "?" + op.join('&');
			},

			_unparam : function (path) {
				var ret = {},
					seg = path.replace(/^\?/, '').split('&'),
					len = seg.length,
					i = 0,
					s;
				for (i; i < len; i++) {
					if (!seg[i]) {
						continue;
					}
					s = seg[i].split('=');
					ret[s[0]] = s[1];
				}
				return ret;
			},

			_ajaxData : function (term, page, context) {
				return {
					page : page,
					tag : term
				};
			},

			_ajaxResults : function (data, page, context) {
				// sanitize data
				$.each(data.results, function (i, result) {
					result.text = result.user_filename;
				});

				return {
					results : data.results,
					more : !!data.next
				};
			},

			onChange : function () {
				this._linkifyCrops();

				if (!this.input.val()) {
					this.preview.css('background-image', "none");
				}
			},

			initSelection : function (element, callback) {
				callback({
					id: element.val(),
					text: this.dom.data('title')
				});
			},

			formatSelection : function (object, container) {
				if (object.thumbnail) {
					this.preview.css('background-image', 'url(' + object.thumbnail + ")");
				}
				if (object.url) {
					this.input.attr('data-src', object.url);
				}
				return object.text;
			},

			formatResult : function (object, container, query) {
				var thumb = $('<div>').addClass('select2-result-image-thumbnail');
				if (object.thumbnail) {
					thumb.css('background-image', 'url(' + object.thumbnail + ")");
				}
				container.addClass('select2-result-image');
				container.append(object.text);
				container.append(thumb);
			}
		});
	}
);
