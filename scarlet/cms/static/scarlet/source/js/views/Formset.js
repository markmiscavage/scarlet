import { View } from 'backbone';
import { sortable } from 'jquery-ui/ui/widgets/sortable';
import selectize from 'selectize';
import { clickOpenPopup } from 'helpers/WindowPopup';
import pubsub from 'helpers/pubsub';
import Editor from './editor/Editor';

const Formset = View.extend({
  events: {
    'click .formset__button--delete': 'delete',
    'click .formset__reorder': 'minimize',
    'click .formset__button--minimize': 'collapseSingle',
    // 'click .button' : function(e){clickOpenPopup(e, (data) => console.log('thing', data));},
    // 'clidk .crop-link' : function(e){clickOpenPopup(e, (data) => console.log('thing', data))}
  },

  initialize() {
    this.prefix = '';
    this.formsetTypes = [];
    this.isDraggable = false;
    this.didInitialize = true;
    this.sortMode = false;
    this.iconMap = {
      image: 'fa-picture-o',
      text: 'fa-file-text-o',
      video: 'fa-video-camera',
      link: 'fa-link',
      social: 'fa-users',
      promo: 'fa-bullhorn',
      newsletter: 'fa-newspaper-o',
      audio: 'fa-headphones',
      quote: 'fa-quote-left',
      quiz: 'fa-question',
      poll: 'fa-bar-chart',
      seo: 'fa-search',
    };
  },

  render() {
    this.$forms = this.$('.formset__forms');
    this.$controls = this.$el.next('.formset__controls');
    this.prefix = this.$el.data('prefix');
    this.$el.prepend(
      '<span class="formset__reorder-btn-group"><h4>collapse all: </h4><input class="formset__reorder" id="reorder" type="checkbox" /><label for="reorder" class="formset__toggle-switch" /></span>',
    );
    this.setFormsetTypes();
    this.delegateEvents();
    // this.enableSort();
    this.bindControls();
    const $editor = $(this).find('.wysihtml-sandbox').contents().find('body');
    $editor.keypress(e => {
      console.log('keypress', e);
    });
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
      .attr('data-prefix', formsetType)
      .attr('data-module-type', '')
      .attr('data-module-name', '');
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
  *********************************** */

  enableSort() {
    if (!this.sortMode) {
      if (this.$forms.find('.formset__order').length) {
        this.$forms.sortable({
          update: this.resort.bind(this),
          change: this._resort,
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

  minimize() {
    const self = this;
    this.enableSort();
    if (this.sortMode) {
      $('.formset__form').each(function(index, value) {
        if (!$(this).hasClass('formset__form--edit')) {
          $(this).addClass('formset__form--edit');
          $(this).css({ height: '100px' });
          const name = $(this).data('module-name');
          const type = $(this).data('module-type');

          $(this).append(
            `<h3><i class="fa ${self.iconMap[type]} " aria-hidden="true"></i>${name}</h3>`,
          );

          $(this).children().each(function() {
            if ($(this).hasClass('formset__field')) {
              $(this).css({ display: 'none' });
            }
          });
        }
      });
    } else {
      $('.formset__form').each(function(index, value) {
        $(this).css({ height: 'auto' });
        $('h3').remove();
        $(this).removeClass('formset__form--edit');
        $(this).children().each(function() {
          if ($(this).hasClass('formset__field')) {
            $(this).css({ display: 'block' });
          }
        });
      });
    }
  },

  collapseSingle(e) {
    const $formset = $(e.currentTarget).closest('.formset__form');
    const name = $formset.data('module-name');
    const type = $formset.data('module-type');

    if (!$($formset).hasClass('formset__form--edit')) {
      $(e.target).removeClass('fa-minus').addClass('fa-plus');
      $formset
        .addClass('formset__form--edit')
        .css({ height: '100px' })
        .append(`<h3><i class="fa ${this.iconMap[type]} " aria-hidden="true"></i>${name}</h3>`)
        .children()
        .each((i, dom) => {
          if ($(dom).hasClass('formset__field')) {
            $(dom).css({ display: 'none' });
          }
        });
    } else {
      $(e.target).removeClass('fa-plus').addClass('fa-minus');
      $formset.find('h3').remove();
      $formset
        .removeClass('formset__form--edit')
        .css({ height: 'auto' })
        .children()
        .each((i, dom) => {
          if ($(dom).hasClass('formset__field')) {
            $(dom).css({ display: 'block' });
          }
        });
    }
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
  *********************************** */

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
