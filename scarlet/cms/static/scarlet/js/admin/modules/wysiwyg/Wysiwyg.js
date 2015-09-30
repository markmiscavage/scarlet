define(

	[
		'rosy/base/DOMClass',
		'$',
		'wysihtml5',
		'./commands/commands',
		'./WysiwygRules'
	],

	function (DOMClass, $, wysihtml5, commands, wysihtml5ParserRules) {

		'use strict';

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
				var id = 'wysihtml5-' + (++guid),
					textareaId = id + '-textarea',
					toolbarId = id + '-toolbar',
					editor;

				this.toolbar.attr('id', toolbarId);
				this.textarea.attr('id', textareaId);

				editor = new wysihtml5.Editor(textareaId, {
					parserRules: wysihtml5ParserRules,
					style: false,
					toolbar: toolbarId,
					stylesheets: '/static/scarlet/css/wysiwyg.css',
					id: id
				});

				editor.on('load', function () {
					editor.id = id;

					// load audio sources
					this.dom.find('audio').each(function () {
						$(this)[0].load();
					});

					if (this.dom.hasClass('annotation')) {
						this._addListeners();
					}

				}.bind(this));

				this.editor = editor;
			},

			_addListeners : function () {
				this.editor.on('show:dialog', this.onShowDialog);
				this.editor.on('save:dialog', this.onSaveDialog);
				this.editor.on('update:dialog', this.onUpdateDialog);
				this.editor.on('cancel:dialog', this.onCancelDialog);

				$('form[data-form-id=edit]').on('submit', this.onSubmit);
			},

			enableEditor: function () {
				$(this.editor.composer.sandbox.getDocument()).find('a').off('click', this.preventClick);
				this.editor.composer.enable();
			},

			disableEditor: function () {
				$(this.editor.composer.sandbox.getDocument()).find('a').on('click', this.preventClick);
				this.editor.composer.disable();
			},

			preventClick: function (e) {
				e.preventDefault();
			},

			onSubmit: function () {
				var $editor = $(document.createElement('div')).html(this.editor.composer.getValue()),
					$annotations = $(document.createElement('div')).html(this.dom.find('.wysiwyg-annotations').val()),
					$this;

				$annotations.find('span').each(function () {
					$this = $(this);

					if ($editor.find('[data-annotation-id=' + $this.attr('id') + ']').length === 0) {
						$this.remove();
					}
				});

				this.dom.find('.wysiwyg-annotations').val($annotations.html());
				this.enableEditor();
			},

			onShowDialog: function (data) {
				var command = data.command,
					$button = this.toolbar.find('.wysiwyg-buttons a[data-wysihtml5-command=' + data.command + ']');

				// force dialog to close if command is disabled
				if ($button.hasClass('disabled')) {
					$button.removeClass('wysihtml5-command-dialog-opened');
					$(data.dialogContainer).hide();
					return;
				}

				var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id'),
					annotationsHtml = this.dom.find('.wysiwyg-annotations').val(),
					$annotationTextarea = $(data.dialogContainer).find('textarea'),
					$annotation = $(document.createElement('div')).html(annotationsHtml).find('#' + annotationId);

				if ($annotation) {
					$annotationTextarea.val($annotation.html());
				} else {
					$annotationTextarea.val('');
				}

				this.disableEditor();
			},

			onSaveDialog: function (data) {
				var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id'),
					annotationsEl = this.dom.find('.wysiwyg-annotations'),
					annotationHtml = '<span id="' + annotationId + '">' + $(data.dialogContainer).find('textarea').val() + '</span>';

				annotationsEl.val(annotationsEl.val() + annotationHtml);
				this.enableEditor();
			},

			onUpdateDialog: function (data) {
				var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id'),
					annotationsHtml = this.dom.find('.wysiwyg-annotations').val(),
					annotationHtml = $(data.dialogContainer).find('textarea').val(),
					tempEl = $(document.createElement('div'));

				$(tempEl).html(annotationsHtml).find('#' + annotationId).html(annotationHtml);
				this.dom.find('.wysiwyg-annotations').val($(tempEl).html());
				this.enableEditor();

			},

			onCancelDialog: function (data) {
				this.enableEditor();
			}
		});
	}
);
