import { View } from 'backbone'
import datepicker from 'jquery-ui/ui/widgets/datepicker'
import '../../stylesheets/views/date-picker.scss'

const DatePicker = View.extend({
  render: function() {
    this.$el.datepicker({
      dateFormat: this.$el.data('date-format'),
    })
  }
})



export default DatePicker
