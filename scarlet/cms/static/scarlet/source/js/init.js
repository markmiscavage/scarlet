import AutoSlug from './views/AutoSlug'
import BatchActions from './views/BatchActions'
import DatePicker from './views/DatePicker'
import Filters from './views/Filters'
import Formset from './views/Formset'
import ImageCropper from './views/ImageCropper'
import Wysiwyg from './views/wysiwyg/Wysiwyg'
import App from './views/App'



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

// Formset
new Formset().render()

// ImageCropper
$('.jcrop').each(function () {
  new ImageCropper({ el: $(this) }).render()
})


// Wysiwyg
$('.widget-wysiwyg').each((i, dom) => {
  new Wysiwyg({ el: dom }).render()
})

new App().render();