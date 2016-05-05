import { View } from 'backbone'
import datepicker from 'jquery-ui/datepicker'
import '../../stylesheets/views/datetimepicker.scss'

const DatePicker = View.extend({
  render: function() {
    this.$el.datepicker({
      dateFormat: this.$el.data('date-format'),
    })
  }
})



export default DatePicker