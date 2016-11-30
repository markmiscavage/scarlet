import { View } from 'backbone'

const BatchActions = View.extend({
  events: {
    'click [data-type=batch-check-all]': 'selectAll',
    'click [data-type=batch-check-row]': 'selectRow',
    'click [data-edit-url]': 'goToRowUrl'
  },

  initialize: function () {
    this.idList = []
  },

  render: function () {
    this.$actions = this.$el.find('[data-type=batch-action]')
    this.$batchCheck = this.$el.find('[data-type=batch-check-row]')
    this.$selectAll = this.$el.find('[data-type=batch-check-all]')
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
      this.idList.splice(idIndex, 1)
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
    this.$actions.removeClass('button--disabled').addClass('button--primary')
  },

  disableActions : function () {
    this.$actions.addClass('button--disabled').removeClass('button--primary')
    this.$selectAll.prop('checked', false)
  },

  updateActionUrl : function (index) {
    const self = this;

    this.$actions.each(function () {
      const $this = $(this)
      const href = $this.attr('href').replace(/(_selected=)[^\&]+/, '$1')
      $this.attr('href',  href + self.idList.join(','))
    });
  },

  goToRowUrl : function () {
   window.location.href = this.$el.find('[data-edit-url]').data('edit-url')
  }
})

export default BatchActions
