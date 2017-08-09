import { View } from 'backbone'
import 'jquery-ui-timepicker-addon/dist/jquery-ui-timepicker-addon'
import 'jquery-ui/ui/widgets/slider'

const DateTimePicker = View.extend({
  initialize() {
    this.dateTimeFormat = this.$el.data('date-format')
    this.sliceAt = this.dateTimeFormat.toLowerCase().indexOf(' h')
    this.dateFormat = this.dateTimeFormat.slice(0, this.sliceAt)
    this.timeFormat = this.dateTimeFormat.slice(this.sliceAt)
  },

  render() {
    this.$el.datetimepicker({
      dateFormat: this.dateFormat,
      timeFormat: this.timeFormat,
      showButtonPanel: false,
      showSecond: false,
      timeText: unescape(
        `Time <span class="timezone">(${this.$el.data('timezone')})</span>`
      ),
    })
  },
})

export default DateTimePicker
