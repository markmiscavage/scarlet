import AutoSlug from './views/AutoSlug'
import BatchActions from './views/BatchActions'
import DatePicker from './views/DatePicker'
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

// ImageCropper
$('.jcrop').each(function () {
  new ImageCropper({ el: $(this) }).render()
})

// SELECT
const select = new Select()
select.render()
