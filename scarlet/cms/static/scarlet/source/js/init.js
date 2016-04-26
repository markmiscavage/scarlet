import $ from 'jquery'
import AutoSlug from './views/AutoSlug'
import BatchActions from './views/BatchActions'
import DatePicker from './views/DatePicker'
import Filters from './views/Filters'
import ImageCropper from './views/ImageCropper'
import Select from './views/Select'
import SelectApi from './views/SelectApi'
import { handlePopup } from './helpers/WindowPopup'


// AutoSlug
$('.auto-slug').each(function () {
  new AutoSlug({ el: $(this) }).render()
})

// BatchActions
new BatchActions().render()

// DATEPICKER
const datePicker = new DatePicker().render()

// Filters
$('.filters').each(function () {
  new Filters({ el: $(this) }).render()
})

// ImageCropper
$('.jcrop').each(function () {
  new ImageCropper({ el: $(this) }).render()
})

// SELECT
const select = new Select().render()

// SELECTAPI
$('.api-select').each( (i, dom) => {
	let selectApi = new SelectApi({el: dom}).render()
})
// Handle Popup functionality
handlePopup()