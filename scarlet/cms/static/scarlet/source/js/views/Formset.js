import { sortable } from 'jquery-ui/sortable'
import { View } from 'backbone'
import { clickOpenPopup } from '../helpers/WindowPopup'
import pubsub from '../helpers/pubsub'

const Formset = View.extend({
  el: '.widget-formset',

  /**
   * Backbone Events Object
   */
  events: {
    'click .widget-formset-delete': 'delete',
    // 'click .button' : function(e){clickOpenPopup(e, (data) => console.log('thing', data));},
    // 'clidk .crop-link' : function(e){clickOpenPopup(e, (data) => console.log('thing', data))}
  },

  initialize: function () {
    this.types = []
    this.prefix = ''
    this.isDraggable = false
  },

  render: function () {
    this.$forms = this.$('.widget-formset-forms')
    this.$controls = this.$el.next('.widget-formset-controls')
    this.prefix = this.$el.data('prefix')

    this.setTypes()
    this.enableSort()
    this.bindControls()
  },

  bindControls: function () {
    var attrDataPrefix = this.prefix ? '[data-prefix=' + this.prefix + ']' : '[data-prefix]'

    $('.widget-formset-add' + attrDataPrefix).on('click', this.add.bind(this))

    this.$controls.filter('.dropdown')
        .on('click', this.toggleOptions)
        .on('mouseout', this.closeOptions)
  },

  delete: function (e) {
    var $dom = $(e.currentTarget)
    var $form = $dom.closest('.widget-formset-form')

    $dom.find('input').attr('checked', true)

    $form.addClass('was-deleted')
    $form.find('.widget-formset-order input').val(0)

    this.resort()
  },

  add: function (e) {
    var $scope = $(e.currentTarget)
    var typeOf = $scope.data('prefix')
    var clone = $('<div>').addClass('widget-formset-form added-with-js').attr('data-prefix', typeOf)
    var html = $scope.find('.widget-formset-form-template').html()

    html = html.replace(/(__prefix__)/g, this.count(typeOf))
    clone.html(html)

    this.$forms.append(clone)

    if (this.isDraggable) {
      clone.addClass('draggable')
    }

    if (this.types.indexOf(typeOf) === -1) {
      this.types.push(typeOf)
    }

    this.enableSort()
    pubsub.trigger('scarlet:render')
  },

  count : function (typeOf) {
    return this.$('.widget-formset-form[data-prefix=' + typeOf + ']').length;
  },

  /************************************
  Sorting
  ************************************/

  enableSort: function () {
    if (this.$forms.find('.widget-formset-order').length) {
      this.$forms.sortable({
        update : this.resort.bind(this),
        //change : this._resort,
        stop   : this.repairWysiwyg.bind(this)
      })
      this.$('.widget-formset-form').addClass('draggable')
      this.isDraggable = true
    }
    this.resort()
  },

  resort: function () {
    var $helper = this.$('.ui-sortable-helper')
    var $placeholder = this.$('.ui-sortable-placeholder')

    this.$('.widget-formset-form').each(function (i) {
      var $dom = $(this)

      if ($dom.is('.was-deleted, .ui-sortable-helper')) {
        return
      }

      if (i % 2) {
        $dom.addClass('odd')
      } else {
        $dom.removeClass('odd')
      }

      $dom.find('.widget-formset-order input').val(i)
    })

    if ($placeholder.hasClass('odd')) {
      $helper.addClass('odd')
    } else {
      $helper.removeClass('odd')
    }

    this.updateMetadata()
  },

  repairWysiwyg: function () {

  },

  /************************************
  Metadata
  ************************************/

  setTypes: function () {
    var self = this
    this.$controls.find('.widget-formset-add').each(function () {
      self.types.push($(this).data('prefix'))
    })
  },

  updateMetadata: function () {
    for (var i = 0; i < this.types.length; i++) {

      var typeOf = this.types[i],
        $formset = $('.widget-formset-form[data-prefix=' + typeOf + ']')

      $formset.each(function (n, el) {
        var $this = $(this)
        $this.find('.widget-formset-order input').val($this.prevAll().length)
      })

      $('#id_' + typeOf + '-TOTAL_FORMS').val($formset.length)
    }
  },

  /************************************
  Controls
  ************************************/

  toggleOptions : function (e) {
    $(e.currentTarget).toggleClass('show')
  },

  closeOptions : function (e) {
    var parent = e.currentTarget
    var child = e.toElement || e.relatedTarget

    // check all children (checking from bottom up)
    // prevent closing on child event
    while (child && child.parentNode && child.parentNode !== window) {
      if (child.parentNode === parent || child === parent) {
        if (child.preventDefault) {
          child.preventDefault()
        }
        return false
      }
      child = child.parentNode
    }

    $(parent).removeClass('show')
  }
})

export default Formset
