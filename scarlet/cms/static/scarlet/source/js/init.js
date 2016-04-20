import $ from 'jquery'

import AutoSlug from './components/autoSlug/AutoSlug'
import BatchActions from './components/batchActions/BatchActions'
import DatePicker from './components/datePicker/DatePicker'
import Select from './components/select/Select'

// AutoSlug
$('.auto-slug').each(function () {
  new AutoSlug({ el: $(this) }).render()
})

// BatchActions
new BatchActions().render()

// DATEPICKER
const datePicker = new DatePicker()
datePicker.render()

// SELECT
const select = new Select()
select.render()
