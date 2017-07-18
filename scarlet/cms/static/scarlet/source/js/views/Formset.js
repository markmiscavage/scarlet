import { View } from 'backbone';
import { sortable } from 'jquery-ui/ui/widgets/sortable';
import selectize from 'selectize';
import { clickOpenPopup } from 'helpers/WindowPopup';
import pubsub from 'helpers/pubsub';
import Editor from './editor/Editor';

const Formset = View.extend({
  events: {
    'click .formset__button--delete': 'delete',
    'click .sweet-btn': 'enableSort',
    // 'click .button' : function(e){clickOpenPopup(e, (data) => console.log('thing', data));},
    // 'clidk .crop-link' : function(e){clickOpenPopup(e, (data) => console.log('thing', data))}
  },

  initialize() {
    this.prefix = '';
    this.formsetTypes = [];
    this.isDraggable = false;
    this.didInitialize = true;
    this.sortMode = false;
  },

  render() {
    this.$forms = this.$('.formset__forms');
    this.$controls = this.$el.next('.formset__controls');
    this.prefix = this.$el.data('prefix');
    this.$el.prepend('<button class="sweet-btn" type="button">Toggle sort</button>');
    this.setFormsetTypes();
    this.delegateEvents();
    // this.enableSort()
    this.bindControls();
  },

  bindControls() {
    this.setupSelect();
    this.$controls.on('click', '.formset__button--add', () => this.add(this.formsetTypes[0].value));
  },

  setupSelect() {
    this.selectize = $('.formset__select').selectize({
      selectOnTab: true,
      maxItems: 1,
      placeholder: 'Add a Module',
      options: this.formsetTypes,
      onChange: function(value) {
        this.selectize[0].selectize.clear(true);
        this.add(value);
      }.bind(this),
    });
  },

  delete(e) {
    const $dom = $(e.currentTarget);
    const $form = $dom.closest('.formset__form');

    $dom.find('input').attr('checked', true);

    $form.addClass('formset__form--is-deleted');
    $form.find('.formset__order input').val(0);

    this.resort();
  },

  add(formsetType) {
    const clone = $('<div>')
      .addClass('formset__form added-with-js')
      .attr('data-prefix', formsetType);
    let html = $(`.formset__form-template[data-prefix="${formsetType}"]`).html();

    html = html.replace(/(__prefix__)/g, this.count(formsetType));
    clone.html(html);

    this.$forms.append(clone);

    if (this.isDraggable) {
      clone.addClass('draggable');
    }

    if (this.formsetTypes.indexOf(formsetType) === -1) {
      this.formsetTypes.push({
        value: formsetType,
      });
    }

    this.enableSort();
    pubsub.trigger('scarlet:render');
  },

  count(formsetType) {
    return this.$(`.formset__form[data-prefix="${formsetType}"]`).length;
  },

  /** **********************************
  Sorting
  ************************************/

  enableSort() {
    if (!this.sortMode) {
      if (this.$forms.find('.formset__order').length) {
        this.$forms.sortable({
          update: this.resort.bind(this),
          // change : this._resort,
          stop: this.repairEditor.bind(this),
          containment: '#content',
          iframeFix: true,
          axis: 'y',
          scroll: true,
          snap: true,
          snapMode: 'outer',
          snapTolerance: -100,
        });
        this.$('.formset__form').addClass('draggable');
        this.isDraggable = true;
      }
      this.sortMode = true;
      this.resort();
    } else {
      this.$('.formset__form').removeClass('draggable');
      this.sortMode = false;
      this.resort();
    }
  },

  resort() {
    const $helper = this.$('.ui-sortable-helper');
    const $placeholder = this.$('.ui-sortable-placeholder');
    if (this.sortMode) {
      console.log('going to sort mode');
      $('.formset__form').each(function findTextFields(index, value) {
        debugger;
        if ($(this).data('prefix') === 'textformformset') {
          $(this).find('.formset__field').each(function textPreview() {
            const $editor = $(this).find('.wysihtml-sandbox').contents().find('body').html();
            debugger;
            if ($editor) {
              $(this).children('label').text(`Text: ${$editor.substr(0, 49)}...`);
            }
            $(this).children('.editor').hide();
          });
        }
        $(value).css({ height: '100px' });
      });
    } else {
      $('.formset__form').each(function(index, value) {
        if ($(this).data('prefix') === 'textformformset') {
          $(this).find('.formset__field').each(function() {
            const $editor = $(this).find('.wysihtml-sandbox').contents().find('body').html();
            if ($editor) {
              $(this).children('label').text('Text:');
            }
            $(this).children('.editor').show();
          });
        }
        $(value).css({ height: 'auto' });
      });
    }

    this.$forms.find('.formset__form').each(function(i) {
      const $dom = $(this);

      if ($dom.is('.was-deleted, .ui-sortable-helper')) {
        return;
      }

      if (i % 2) {
        $dom.addClass('odd');
      } else {
        $dom.removeClass('odd');
      }

      $dom.find('.formset__order input').val(i);
    });

    if ($placeholder.hasClass('odd')) {
      $helper.addClass('odd');
    } else {
      $helper.removeClass('odd');
    }

    this.updateMetadata();
  },

  repairEditor(e, elem) {
    const $editor = $(elem.item[0]).find('.editor');

    if ($editor.length) {
      $('.wysihtml-sandbox', $editor).remove();
      const editor = new Editor({ el: $editor }).render();
    }
  },

  /** **********************************
  Metadata
  ************************************/

  setFormsetTypes() {
    $('.formset__type').each((i, el) => {
      const $el = $(el);
      this.formsetTypes.push({
        text: $el.data('text'),
        value: $el.data('prefix'),
      });
    });
  },

  updateMetadata() {
    for (let i = 0; i < this.formsetTypes.length; i++) {
      let formsetType = this.formsetTypes[i].value,
        $formset = $(`.formset__form[data-prefix=${formsetType}]`);

      $formset.each(function(n, el) {
        const $this = $(this);
        $this.find('.formset__order input').val($this.prevAll().length);
      });

      $(`#id_${formsetType}-TOTAL_FORMS`).val($formset.length);
    }
  },
});

export default Formset;
