import { View } from 'backbone'
import datepicker from 'jquery-ui/ui/widgets/datepicker'

const DatePicker = View.extend({
  render() {
    this.$el.datepicker({
      dateFormat: this.$el.data('date-format'),
    })
  },
})

export default DatePicker
