import { View } from 'backbone'
import datepicker from 'jquery-ui/datepicker'


const DatePicker = View.extend({
  render: function() {
    this.$el.datepicker({
      dateFormat: this.$el.data('date-format'),
    })
  }
})



export default DatePicker