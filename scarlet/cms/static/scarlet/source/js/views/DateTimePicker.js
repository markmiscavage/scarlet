import { View } from 'backbone'
import 'jquery-ui-timepicker-addon/dist/jquery-ui-timepicker-addon'
import 'jquery-ui/ui/widgets/slider'

const DateTimePicker = View.extend({
  render() {
    this.$el.datetimepicker({
      dateFormat: 'mm/dd/yy', 
      timeFormat: "hh:mm:ss TT",
      showButtonPanel: false,
      showSecond: false
    })
    this.$el.datetimepicker('setDate', (new Date()) );
  },

  pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
  },
})

export default DateTimePicker
