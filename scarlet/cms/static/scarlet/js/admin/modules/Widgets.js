define((require, exports, module) => {
	let DOMClass = require('rosy/base/DOMClass'),
		$ = require('$'),
		jQuerySelect2 = require('$plugin!select2'),
		jQueryDetails = require('$plugin!details'),
		jQueryTimePicker = require('$plugin-ui!timepicker'),
		AssetSelect = require('./AssetSelect'),
		ApiSelect = require('./ApiSelect'),
		Formset = require('./Formset'),
		Tabs = require('./Tabs'),
		InsertVideo = require('./InsertVideo'),
		InsertImage = require('./InsertImage'),
		InsertAudio = require('./InsertAudio'),
		InsertAnnotation = require('./InsertAnnotation'),
		Wysiwyg = require('./wysiwyg/Wysiwyg'),
		WidgetEvents = require('./WidgetEvents'),
		WindowPopup = require('./WindowPopup'),
		OnExit = require('./OnExit'),
		InlineVideo = require('./InlineVideo'),
		FilterBar = require('./FilterBar'),
		CropImage = require('./CropImage'),
		AutoSlug = require('./AutoSlug'),
		BatchActions = require('./BatchActions');

	return DOMClass.extend({
		init(dom) {
			this.subscribe(WidgetEvents.RENDER, this._render);
		},

		_render(n) {
			const dom = $(n.data.dom);

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

		_handleBatchActions(dom) {
			dom.find('.list').each((i, el) => {
				const actions = new BatchActions($(el));
			});
		},

		_renderDateTimePicker(dom) {
			dom.find('input.datetime').each((i, el) => {
				el = $(el);

				// parse date and time from django format
				let dateTimeFormat = el.data('date-format'),
					sliceAt = dateTimeFormat.toLowerCase().indexOf(' h'),
					dateFormat = dateTimeFormat.slice(0, sliceAt),
					timeFormat = dateTimeFormat.slice(sliceAt);

				el.datetimepicker({
					dateFormat,
					timeFormat,
					showButtonPanel: false,
					showSecond: false,
					timeText: `Time (${el.data('timezone')})`,
				});
			});
		},

		_renderWysiwig(dom) {
			dom.find('.widget-wysiwyg:not(.widget-wysiwyg--rendered)').each((i, textarea) => {
				const wysiwyg = new Wysiwyg($(textarea));
			});
		},

		_renderDatePicker(dom) {
			dom.find('.date').each((i, el) => {
				el = $(el);

				el.datepicker({
					dateFormat: el.data('date-format'),
					showButtonPanel: false,
				});
			});
		},

		_renderSelect(dom) {
			dom.find('select').select2({
				minimumResultsForSearch: 20,
			});

			dom.find('.widget-tags').select2({
				tags: [],
				tokenSeparators: [','],
			});
		},

		_renderFilterBar(dom) {
			const filterBarDom = dom.find('.filters');
			const filterBar = new FilterBar(filterBarDom);
		},

		_renderAssetSelect(dom) {
			dom.find('.widget-asset').each((i, dom) => {
				const picker = new AssetSelect($(dom));
			});
		},

		_renderFormset(dom) {
			dom.find('.widget-formset').each((i, dom) => {
				const formset = new Formset($(dom));
			});
		},

		_renderApiSelect(dom) {
			dom.find('.api-select').each((i, dom) => {
				const select = new ApiSelect($(dom));
			});
		},

		_autoSlug() {
			$('[data-source-fields]').each((i, dom) => {
				const autoSlug = new AutoSlug($(dom));
			});
		},

		_handlePopup(dom) {
			if (!window.opener) {
				return;
			}

			dom.find('.close-popup').click((i, dom) => {
				window.close();
			});

			dom.find('.widget-popup-data').each((i, dom) => {
				WindowPopup.respond($(dom).data());
			});
		},

		_renderTabs(dom) {
			dom.find('.widget-tabs').each((i, el) => {
				const tabs = new Tabs($(el));
			});
		},

		_renderInsertVideo(dom) {
			dom.find('.widget-insert-video').each((i, el) => {
				const insertVideo = new InsertVideo({
					$dom: $(el),
				});
			});
		},

		_renderInsertImage(dom) {
			dom.find('.widget-insert-image').each((i, el) => {
				const insertImage = new InsertImage({
					$dom: $(el),
				});
			});
		},

		_renderInsertAudio(dom) {
			dom.find('.widget-insert-audio').each((i, el) => {
				const insertAudio = new InsertAudio({
					$dom: $(el),
				});
			});
		},

		_renderInlineVideo(dom) {
			dom.find('.widget-inline-video').each((i, el) => {
				const vid = new InlineVideo({
					$dom: $(el),
				});
			});
		},

		_renderInsertAnnotation(dom) {
			dom.find('.widget-insert-annotation').each((i, el) => {
				const insertAnnotation = new InsertAnnotation({
					$dom: $(el),
				});
			});
		},

		_renderjQueryCrop(dom) {
			dom.find('.jcrop').each((i, el) => {
				const cropImage = new CropImage(
					$(el),
					{
						aspectRatio: 'auto',
					},
					{},
				); // options, coordinates, extra
				// this.content = new ContentClass(this.$content, options, this.$content.data(), extra);
			});
		},

		_renderDragWidth(dom) {
			// maintain draggable td:last-child width on drag
			dom
				.find('[draggable]')
				.on('mousedown', function(i, el) {
					const $el = $(this).find('td:last-child');
					$el.css('width', $el.outerWidth());
				})
				.on('mouseup', function(i, el) {
					$(this).find('td:last-child').css('width', 'auto');
				});
		},
	});
});
