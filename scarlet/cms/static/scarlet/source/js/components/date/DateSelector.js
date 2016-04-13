import Backbone, { View } from 'backbone'
import $ from 'jquery'
import datepicker from 'jquery-ui/datepicker'

const DateSelector = View.extend({
	el: $('input.date'),

  initialize: function() {
    this.listenTo(this.model, "change", this.render)
  },

  render: function() {
    this.$el.datepicker({
      dateFormat: this.$el.data("date-format"),
    })
  }

})

export default DateSelector