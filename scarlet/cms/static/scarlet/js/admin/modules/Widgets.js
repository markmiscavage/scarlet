define(
	function (require, exports, module) {

		"use strict";

		var DOMClass             = require("rosy/base/DOMClass"),
			$                    = require("$"),
			jQuerySelect2        = require("$plugin!select2"),
			jQueryDetails        = require("$plugin!details"),
			jQueryTimePicker     = require("$plugin-ui!timepicker"),
			AssetSelect          = require("./AssetSelect"),
			ApiSelect            = require("./ApiSelect"),
			Formset              = require("./Formset"),
			Tabs                 = require("./Tabs"),
			InsertVideo          = require("./InsertVideo"),
			InsertImage          = require("./InsertImage"),
			InsertAudio          = require("./InsertAudio"),
			InsertAnnotation     = require("./InsertAnnotation"),
			Wysiwyg              = require("./wysiwyg/Wysiwyg"),
			WidgetEvents         = require("./WidgetEvents"),
			WindowPopup          = require("./WindowPopup"),
			OnExit               = require("./OnExit"),
			InlineVideo          = require("./InlineVideo"),
			FilterBar            = require("./FilterBar"),
			CropImage            = require("./CropImage"),
			AutoSlug             = require("./AutoSlug"),
			BatchActions         = require("./BatchActions");

		return DOMClass.extend({

			init : function (dom) {
				this.subscribe(WidgetEvents.RENDER, this._render);
			},

			_render : function (n) {
				var dom = $(n.data.dom);

				this._renderSelect(dom);
				this._renderAssetSelect(dom);
				this._renderFormset(dom);
				this._renderApiSelect(dom);
				this._renderDatePicker(dom);
				this._renderDateTimePicker(dom);
				this._renderWysiwig(dom);
				this._renderTabs(dom);
				this._renderInsertVideo(dom);
				this._renderInsertImage(dom);
				this._renderInsertAudio(dom);
				this._renderInlineVideo(dom);
				this._renderInsertAnnotation(dom);
				this._renderFilterBar(dom);
				this._renderjQueryCrop(dom);
				this._renderDragWidth(dom);

				this._autoSlug(dom);
				this._handlePopup(dom);
				this._handleBatchActions(dom);
			},

			_handleBatchActions : function (dom) {
				dom.find('.list').each(function (i, el) {
					var actions = new BatchActions($(el));
				});
			},

			_renderDateTimePicker : function (dom) {
				dom.find('input.datetime').each(function (i, el) {
					el = $(el);

					// parse date and time from django format
					var dateTimeFormat = el.data('date-format'),
						sliceAt = dateTimeFormat.toLowerCase().indexOf(' h'),
						dateFormat = dateTimeFormat.slice(0, sliceAt),
						timeFormat = dateTimeFormat.slice(sliceAt);

					el.datetimepicker({
						dateFormat: dateFormat,
						timeFormat : timeFormat,
						showButtonPanel : false,
						showSecond : false,
						timeText : 'Time (' + el.data('timezone') + ')'
					});
				});
			},

			_renderWysiwig : function (dom) {
				dom.find('.widget-wysiwyg').each(function (i, textarea) {
					var wysiwyg = new Wysiwyg($(textarea));
				});
			},

			_renderDatePicker : function (dom) {
				dom.find(".date").each(function (i, el) {
					el = $(el);

					el.datepicker({
						dateFormat: el.data("date-format"),
						showButtonPanel : false
					});
				});
			},

			_renderSelect : function (dom) {
				dom.find("select").select2({
					minimumResultsForSearch : 20
				});

				dom.find(".widget-tags").select2({
					tags: [],
					tokenSeparators : [',']
				});
			},

			_renderFilterBar : function (dom) {
				var filterBarDom = dom.find(".filters");
				var filterBar = new FilterBar(filterBarDom);
			},

			_renderAssetSelect : function (dom) {
				dom.find(".widget-asset").each(function (i, dom) {
					var picker = new AssetSelect($(dom));
				});
			},

			_renderFormset : function (dom) {
				dom.find(".widget-formset").each(function (i, dom) {
					var formset = new Formset($(dom));
				});
			},

			_renderApiSelect : function (dom) {
				dom.find(".api-select").each(function (i, dom) {
					var select = new ApiSelect($(dom));
				});
			},

			_autoSlug : function () {
				$("[data-source-fields]").each(function (i, dom) {
					var autoSlug = new AutoSlug($(dom));
				});
			},

			_handlePopup : function (dom) {
				if (!window.opener) {
					return;
				}

				dom.find('.close-popup').click(function (i, dom) {
					window.close();
				});

				dom.find('.widget-popup-data').each(function (i, dom) {
					WindowPopup.respond($(dom).data());
				});
			},

			_renderTabs : function (dom) {
				dom.find(".widget-tabs").each(function (i, el) {
					var tabs = new Tabs($(el));
				});
			},

			_renderInsertVideo : function (dom) {
				dom.find(".widget-insert-video").each(function (i, el) {
					var insertVideo = new InsertVideo({
						$dom : $(el)
					});
				});
			},

			_renderInsertImage : function (dom) {
				dom.find(".widget-insert-image").each(function (i, el) {
					var insertImage = new InsertImage({
						$dom : $(el)
					});
				});
			},

			_renderInsertAudio : function (dom) {
				dom.find(".widget-insert-audio").each(function (i, el) {
					var insertAudio = new InsertAudio({
						$dom : $(el)
					});
				});
			},

			_renderInlineVideo : function (dom) {
				dom.find(".widget-inline-video").each(function (i, el) {
					var vid = new InlineVideo({
						$dom : $(el)
					});
				});
			},

			_renderInsertAnnotation : function (dom) {
				dom.find(".widget-insert-annotation").each(function (i, el) {
					var insertAnnotation = new InsertAnnotation({
						$dom : $(el)
					});
				});
			},

			_renderjQueryCrop : function (dom) {
				dom.find(".jcrop").each(function (i, el) {
					var cropImage = new CropImage($(el), {
						aspectRatio : 'auto'
					}, {

					}); // options, coordinates, extra
					// this.content = new ContentClass(this.$content, options, this.$content.data(), extra);
				});
			},

			_renderDragWidth : function (dom) {
				// maintain draggable td:last-child width on drag
				dom.find("[draggable]")
				.on("mousedown", function (i, el) {
					var $el = $(this).find("td:last-child");
					$el.css('width', $el.outerWidth());
				})
				.on("mouseup", function (i, el) {
					$(this).find("td:last-child").css('width', 'auto');
				});
			}
		});
	}
);
