import AutoSlug from './views/AutoSlug'
import BatchActions from './views/BatchActions'
import DatePicker from './views/DatePicker'
import Filters from './views/Filters'
import ImageCropper from './views/ImageCropper'
import Select from './views/Select'

// AutoSlug
$('.auto-slug').each(function () {
  new AutoSlug({ el: $(this) }).render()
})

// BatchActions
new BatchActions().render()

// DATEPICKER
const datePicker = new DatePicker()
datePicker.render()

// Filters
$('.filters').each(function () {
  new Filters({ el: $(this) }).render()
})

// ImageCropper
$('.jcrop').each(function () {
  new ImageCropper({ el: $(this) }).render()
})

// SELECT
const select = new Select()
select.render()
