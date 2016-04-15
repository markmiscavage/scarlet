import $ from 'jquery'

import AutoSlug from './components/autoSlug/AutoSlug'
import DatePicker from './components/datePicker/DatePicker'
import Select from './components/select/Select'

// AutoSlug
$('.auto-slug').each((el, i) => {
  new AutoSlug({ el: el }).render()
})

// DATEPICKER
const datePicker = new DatePicker()
datePicker.render()

// SELECT
const select = new Select()
select.render()
