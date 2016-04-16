import $ from 'jquery'
 import AutoSlug from './components/autoSlug/AutoSlug'
import BatchActions from './components/batchActions/BatchActions'
import DatePicker from './components/datePicker/DatePicker'
import ImageCropper from './components/imageCropper/ImageCropper'
import Select from './components/select/Select'
import SelectApi from './components/select/SelectApi'


// AutoSlug
$('.auto-slug').each(function () {
  new AutoSlug({ el: $(this) }).render()
})

// BatchActions
new BatchActions().render()

// DATEPICKER
const datePicker = new DatePicker().render()

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