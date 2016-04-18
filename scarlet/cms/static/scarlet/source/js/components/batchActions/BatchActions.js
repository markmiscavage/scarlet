import { View } from 'backbone'

const BatchActions = View.extend({
  el: '.list',

  events: {
    'click .select-all': 'selectAll',
    'click .batch-check': 'selectRow',
    'click .link-cell': 'goToRowUrl'
  },

  initialize: function () {
    this.idList = []
  },

  render: function () {
    this.$actions = this.$el.find('.batch-action')
    this.$batchCheck = this.$el.find('.batch-check')
    this.$selectAll = this.$el.find('.select-all')
  },

  selectAll: function (e) {
    this.$batchCheck.each(function () {
      $(this).trigger('click')
    })
  },

  selectRow : function (e) {
    const id = $(e.currentTarget).val()
    const idIndex = this.idList.indexOf(id)

    if (idIndex > -1) {
      this.idList.slice(idIndex, 1)
    } else {
      this.idList.push(id)
    }

    this.toggleActions()
    this.updateActionUrl(idIndex)
  },

  toggleActions: function () {
    if (this.idList.length) {
      this.enableActions()
    } else {
      this.disableActions()
    }
  },

  enableActions : function () {
    this.$actions.removeClass('disabled')
  },

  disableActions : function () {
    this.$actions.addClass('disabled')
    this.$selectAll.prop('checked', false)
  },

  updateActionUrl : function (index) {
    const self = this;

    this.$actions.each(function () {
      const $this = $(this)
      const href = $this.attr('href').replace(/(_selected=)[^\&]+/, '$1')
      $this.attr('href',  href + self.idList.join(','))
    });
  }
})

export default BatchActions
