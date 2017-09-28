import { View } from 'backbone';
import { sortable } from 'jquery-ui/ui/widgets/sortable';
import selectize from 'selectize';
import { clickOpenPopup } from 'helpers/WindowPopup';
import pubsub from 'helpers/pubsub';
import Editor from './editor/Editor';

const FormsetForm = View.extend({
  events: {
    'click .formset__button--delete': 'delete',
    'click .formset__reorder': 'handleCollapseAllClick',
    'click .formset__button--minimize': 'handleCollapseClick',
    // 'click .button': function(e) {
    //   clickOpenPopup(e, data => {
    //     if (data.thumbnail) {
    //       this.selectize.addOption(data);
    //       this.selectize.setValue(data.id);
    //       this.addOpen = false;
    //     }
    //   });
    // },
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
    this.prefix = this.$el.data('prefix') || new Date().valueOf();

    this.$el.prepend(
      '<span class="formset__reorder-btn-group"><h4>collapse all: </h4><input class="formset__reorder" id="' + this.prefix + '-reorder" type="checkbox" /><label for="' + this.prefix + '-reorder" class="formset__toggle-switch" /></span>',
    );

    this.setFormsetTypes();
    this.delegateEvents();
    this.enableSort();
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
    // const $parent = this.$el.parent();
    // const $targetFormset = $parent.find(`.formset[data-prefix="${formsetType}"]`)
    const $targetFormset = this.$el.find('.formset__forms')

    const clone = $('<div>')
      .addClass('formset__form added-with-js')
      .attr('data-prefix', formsetType)
      .attr('data-module-type', '')
      .attr('data-module-name', '');

    let html = $(`.formset__form-template[data-prefix="${formsetType}"]`).html();

    const count = this.count(formsetType)
    
    html = html.replace(/(__prefix__)/g, count);
    
    clone.html(html);

    $targetFormset.append(clone);

    if (this.formsetTypes.indexOf(formsetType) === -1) {
      this.formsetTypes.push({
        value: formsetType,
      });
    }

    this.resort();
    pubsub.trigger('scarlet:render');
  },

  count(formsetType) {
    const selector = `.formset__form[data-prefix="${formsetType}"]`
    return $(selector).length;
  },

  /* ***********************************
  Sorting
  *********************************** */

  enableSort() {
    if (!this.sortMode) {
      if (this.$forms.find('.formset__order').length) {
        this.$forms.sortable({
          update: this.resort.bind(this),
          helper: 'clone',
          stop: this.repairEditor.bind(this),
          containment: '#content',
          iframeFix: true,
          axis: 'y',
          scroll: true,
          snap: true,
          snapMode: 'outer',
          snapTolerance: -100,
          handle: '.formset__draggable',
          zIndex: 1000,
        });
        this.$('.formset__form').addClass('draggable');
        this.$('.formset__form')
          .find('.formset__draggable')
        this.isDraggable = true;
      }
      this.sortMode = true;
      this.resort();
    } else {
      this.$('.formset__form').removeClass('draggable');
      this.$('.formset__form')
        .find('.formset__draggable')
        .first()
      this.sortMode = false;
      this.resort();
    }
  },

  resort(...args) {
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

  handleCollapseAllClick(e) {

    var checkbox = this.$el.find('.formset__reorder[id=' + this.prefix + '-reorder]'),
        isChecked = checkbox.prop('checked');

    this.setAllFormsetCollapsedStates (isChecked)
  },

  setAllFormsetCollapsedStates ($toCollapsed) {
    const self = this;

    const collapseFormset = this.collapseFormset.bind(this)
    const expandFormset = this.expandFormset.bind(this)
    
     this.$el.find('.formset__forms').find('.formset__form').each((index, el) => {
      const $el = $(el);
      // if (this.sortMode) {
        if ($toCollapsed) {
          collapseFormset($el)
        } else {
          expandFormset($el)
        }
      }
    )
  },

  handleCollapseClick(e) {
    const formset = $(e.currentTarget).closest('.formset__form');
    this.toggleCollapsedState(formset);
  },

  toggleCollapsedState($formset) {
    const isCollapsed = $($formset).hasClass('formset__form--collapsed')
    if (!isCollapsed) {
      this.collapseFormset($formset)
    } else {
      this.expandFormset($formset)
    }
  },

  collapseFormset($formset) {
    const button = $formset.find('.fa-minus-square-o')
    const name = $formset.data('module-name');
    const type = $formset.data('module-type');

    $(button)
      .removeClass('fa-minus-square-o')
      .addClass('fa-plus-square-o');
    $formset
      .addClass('formset__form--collapsed formset__form--edit draggable')
      .css({ height: '100px' })
      .append(`<h3><i class="fa ${this.iconMap[type]} " aria-hidden="true"></i>${name}</h3>`)
      .children()
      .each((i, dom) => {
        if ($(dom).hasClass('formset__field')) {
          $(dom).css({ display: 'none' });
        }
    });
  },

  expandFormset($formset) {
    const button = $formset.find('.fa-plus-square-o')
    const name = $formset.data('module-name');
    const type = $formset.data('module-type');

    $(button)
      .removeClass('fa-plus-square-o')
      .addClass('fa-minus-square-o');
    $formset.find('h3').remove();
    $formset
      .removeClass('formset__form--edit')
      .removeClass('formset__form--collapsed')
      .css({ height: 'auto' })
      .children()
      .each((i, dom) => {
        if ($(dom).hasClass('formset__field')) {
          $(dom).css({ display: 'block' });
        }
      });
  },

  repairEditor(e, elem) {
    const $editor = $(elem.item[0]).find('.editor');

    if ($editor.length) {
      $('.wysihtml-sandbox', $editor).remove();
      const editor = new Editor({ el: $editor }).render();
    }
  },

  /* ***********************************
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

export default FormsetForm;
