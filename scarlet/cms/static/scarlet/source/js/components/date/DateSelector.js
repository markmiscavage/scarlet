import Backbone, { View } from 'backbone'
import $ from 'jquery'
import datepicker from 'jquery-ui/datepicker'

const DateSelector = View.extend({
	el: $('input.date'),
	
  render: function() {
    this.$el.datepicker({
      dateFormat: this.$el.data("date-format"),
    })
  }

})

export default DateSelector