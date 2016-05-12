import { View } from 'backbone'
import 'jquery-ui-timepicker-addon/dist/jquery-ui-timepicker-addon'
import '../../stylesheets/views/datetimepicker.scss'

const DateTimePicker = View.extend({

	initialize: function () {
		this.dateTimeFormat = this.$el.data('date-format')
		this.sliceAt = this.dateTimeFormat.toLowerCase().indexOf(' h')
		this.dateFormat = this.dateTimeFormat.slice(0, this.sliceAt)
		this.timeFormat = this.dateTimeFormat.slice(this.sliceAt)
	},

  render: function() {
    this.$el.datetimepicker({
			dateFormat: this.dateFormat,
			timeFormat : this.timeFormat,
			showButtonPanel : false,
			showSecond : false,
			timeText : 'Time (' + this.$el.data('timezone') + ')'
		})
  }
})

export default DateTimePicker