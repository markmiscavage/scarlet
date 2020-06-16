import { View } from 'backbone';
import editorRules from './rules';
// import insertAnnotation from './commands/insertAnnotation';
import insertLink from './commands/insertLink';
import insertMedia from './commands/insertMedia';

let guid = 0;

const Editor = View.extend({
  events: {
    'click .unlink': 'onRemoveLink',
  },

  render() {
    this.$toolbar = this.$('.editor__toolbar');
    this.$textarea = this.$('.editor__textarea');
    //
    this.setupEditor();
    this.attachCommands();
    $('form[data-form-id=edit] .button-group--submit .button--primary').on('click', this.onSubmitForm.bind(this));
  },

  onSubmitForm(){
    // If Wysiwyg is empty, show native textarea error
    if(this.$textarea.val().length == 0){
      this.$textarea.show();
      this.$textarea.on('keyup', this.onTextAreaKeydown.bind(this));
    }
  },

  onTextAreaKeydown(e){
    this.$textarea.hide();    
    this.$textarea.off('keyup', this.onTextAreaKeydown.bind(this));
    $('iframe')[0].contentWindow.document.body.focus();
  },

  setupEditor() {
    let editor;
    const id = `wysihtml-${++guid}`;
    const textareaId = `${id}-textarea`;
    const toolbarId = `${id}-toolbar`;

    // TODO: improve -> access publicPath from webpack process.env
    const envPath = '/';

    this.$toolbar.attr('id', toolbarId);
    this.$textarea.attr('id', textareaId);

    editor = new wysihtml.Editor(textareaId, {
      parserRules: editorRules,
      style: false,
      toolbar: toolbarId,
      stylesheets: `${envPath}static/scarlet/build/css/main.css`,
      showToolbarDialogsOnSelection: false,
      id,
      useLineBreaks: false,
    });

    editor.on('load', () => {
      editor.id = id;

      // load audio sources
      this.$('audio').each(function() {
        $(this)[0].load();
      });

      if (this.$el.hasClass('editor--annotations')) {
        this.addListeners();
      }

      this.$el.addClass('editor--rendered');
    });

    this.editor = editor;
  },

  attachCommands() {
    // wysihtml.commands.insertAnnotation = insertAnnotation
    wysihtml.commands.createLink = insertLink;
    wysihtml.commands.insertImage = insertMedia;
  },

  addListeners() {
    this.editor.on('show:dialog', this.onShowDialog.bind(this));
    this.editor.on('save:dialog', this.onSaveDialog.bind(this));
    this.editor.on('update:dialog', this.onUpdateDialog.bind(this));
    this.editor.on('cancel:dialog', this.onCancelDialog.bind(this));

    $('form[data-form-id=edit]').on('submit', this.onSubmit.bind(this));
  },

  enableEditor() {
    $(this.editor.composer.sandbox.getDocument()).find('a').off('click', this.preventClick);
    this.editor.composer.enable();
  },

  disableEditor() {
    $(this.editor.composer.sandbox.getDocument()).find('a').on('click', this.preventClick);
    this.editor.composer.disable();
  },

  onSubmit() {
    const $editor = $(document.createElement('div')).html(this.editor.composer.getValue());
    debugger;
    const $annotations = $(document.createElement('div')).html(
      this.$('.editor__annotations').val(),
    );
    let $this;

    $annotations.find('span').each(function() {
      $this = $(this);

      if ($editor.find(`[data-annotation-id=${$this.attr('id')}]`).length === 0) {
        $this.remove();
      }
    });

    this.$('.editor__annotations').val($annotations.html());
    this.enableEditor();
  },

  onShowDialog(data) {
    const command = data.command;
    const $button = this.$toolbar.find(`.editor__buttons a[data-wysihtml-command=${data.command}]`);

    // force dialog to close if command is disabled
    if ($button.hasClass('disabled')) {
      $button.removeClass('wysihtml-command-dialog-opened');
      $(data.dialogContainer).hide();
      return;
    }

    const annotationId = $(
      this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode,
    ).attr('data-annotation-id');
    const annotationsHtml = this.$('.editor__annotations').val();
    const $annotationTextarea = $(data.dialogContainer).find('textarea');
    const $annotation = $(document.createElement('div'))
      .html(annotationsHtml)
      .find(`#${annotationId}`);

    if ($annotation) {
      $annotationTextarea.val($annotation.html());
    } else {
      $annotationTextarea.val('');
    }
    this.disableEditor();
  },

  onSaveDialog(data) {
    const annotationId = $(
      this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode,
    ).attr('data-annotation-id');
    const annotationsEl = this.$('.editor__annotations');
    const annotationHtml = `<span id="${annotationId}">${$(data.dialogContainer)
      .find('textarea')
      .val()}</span>`;

    annotationsEl.val(annotationsEl.val() + annotationHtml);
    this.enableEditor();
  },

  onUpdateDialog(data) {
    const annotationId = $(
      this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode,
    ).attr('data-annotation-id');
    const annotationsHtml = this.$('.editor__annotations').val();
    const annotationHtml = $(data.dialogContainer).find('textarea').val();
    const tempEl = $(document.createElement('div'));

    $(tempEl).html(annotationsHtml).find(`#${annotationId}`).html(annotationHtml);
    this.$('.editor__annotations').val($(tempEl).html());
    this.enableEditor();
  },

  onCancelDialog(data) {
    this.enableEditor();
  },

  onRemoveLink() {
    console.log('removing link');
    this.editor.composer.commands.exec('removeLink');
  },

  preventClick(e) {
    e.preventDefault();
  },
});

export default Editor;
