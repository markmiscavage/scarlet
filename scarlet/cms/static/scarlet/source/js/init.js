import $ from 'jquery'
import DateSelector from './components/date/DateSelector'
import AutoSlug from './components/autoSlug/AutoSlug'



// DATEPICKER
const datePicker = new DatePicker()
datePicker.render()

// SELECT
const select = new Select()
select.render()

// AutoSlug
$('.auto-slug').each((el, i) => {
  new AutoSlug({ el: el }).render()
})


