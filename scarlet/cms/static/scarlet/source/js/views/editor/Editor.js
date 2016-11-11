import { View } from 'backbone'
import wysihtml5 from 'wysihtml5'
import editorRules from './rules'
import insertAnnotation from './commands/insertAnnotation'
import insertLink from './commands/insertLink'
import insertMedia from './commands/insertMedia'
import '../../../stylesheets/views/editor.scss'


let guid = 0

const Editor = View.extend({

  render: function (dom) {
    this.$toolbar = this.$('.editor-toolbar')
    this.$textarea = this.$('.editor-textarea')

    this.setupEditor()
    this.attachCommands()
  },

  setupEditor: function () {
    var editor
    var id = 'wysihtml5-' + (++guid)
    var textareaId = id + '-textarea'
    var toolbarId = id + '-toolbar'

    // TODO: improve -> access publicPath from webpack process.env
    var envPath = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/' : '/'

    this.$toolbar.attr('id', toolbarId)
    this.$textarea.attr('id', textareaId)

    editor = new wysihtml5.Editor(textareaId, {
        parserRules: editorRules,
        style: false,
        toolbar: toolbarId,
        stylesheets: envPath + 'build/css/main.css',
        id: id
    })

    editor.on('load', function () {
        editor.id = id

        // load audio sources
        this.$('audio').each(function () {
            $(this)[0].load()
        })

        if (this.$el.hasClass('annotation')) {
            this.addListeners()
        }
    }.bind(this))

    this.editor = editor
  },

  attachCommands: function () {
    wysihtml5.commands.insertAnnotation = insertAnnotation
    wysihtml5.commands.insertLink = insertLink
    wysihtml5.commands.insertMedia = insertMedia
  },

  addListeners: function () {
    this.editor.on('show:dialog', this.onShowDialog.bind(this))
    this.editor.on('save:dialog', this.onSaveDialog.bind(this))
    this.editor.on('update:dialog', this.onUpdateDialog.bind(this))
    this.editor.on('cancel:dialog', this.onCancelDialog.bind(this))

    $('form[data-form-id=edit]').on('submit', this.onSubmit)
  },

  enableEditor: function () {
    $(this.editor.composer.sandbox.getDocument()).find('a').off('click', this.preventClick)
    this.editor.composer.enable()
  },

  disableEditor: function () {
    $(this.editor.composer.sandbox.getDocument()).find('a').on('click', this.preventClick)
    this.editor.composer.disable()
  },

  onSubmit: function () {
    var $editor = $(document.createElement('div')).html(this.editor.composer.getValue())
    var $annotations = $(document.createElement('div')).html(this.$('.editor-annotations').val())
    var $this

    $annotations.find('span').each(function () {
      $this = $(this)

      if ($editor.find('[data-annotation-id=' + $this.attr('id') + ']').length === 0) {
        $this.remove()
      }
    })

    this.$('.editor-annotations').val($annotations.html())
    this.enableEditor()
  },

  onShowDialog: function (data) {
    var command = data.command
    var $button = this.$toolbar.find('.editor-buttons a[data-wysihtml5-command=' + data.command + ']')

    // force dialog to close if command is disabled
    if ($button.hasClass('disabled')) {
        $button.removeClass('wysihtml5-command-dialog-opened')
        $(data.dialogContainer).hide()
        return
    }

    var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id')
    var annotationsHtml = this.$('.editor-annotations').val()
    var $annotationTextarea = $(data.dialogContainer).find('textarea')
    var $annotation = $(document.createElement('div')).html(annotationsHtml).find('#' + annotationId)

    if ($annotation) {
        $annotationTextarea.val($annotation.html())
    } else {
        $annotationTextarea.val('')
    }

    this.disableEditor()
  },

  onSaveDialog: function (data) {
    var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id')
    var annotationsEl = this.$('.editor-annotations')
    var annotationHtml = '<span id="' + annotationId + '">' + $(data.dialogContainer).find('textarea').val() + '</span>'

    annotationsEl.val(annotationsEl.val() + annotationHtml)
    this.enableEditor()
  },

  onUpdateDialog: function (data) {
    var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id')
    var annotationsHtml = this.$('.editor-annotations').val()
    var annotationHtml = $(data.dialogContainer).find('textarea').val()
    var tempEl = $(document.createElement('div'))

    $(tempEl).html(annotationsHtml).find('#' + annotationId).html(annotationHtml)
    this.$('.editor-annotations').val($(tempEl).html())
    this.enableEditor()
  },

  onCancelDialog: function (data) {
    this.enableEditor()
  },

  preventClick: function (e) {
    e.preventDefault()
  }
})

export default Editor
