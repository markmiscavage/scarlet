import { View } from 'backbone'
import pubsub from 'helpers/pubsub'
import AutoSlug from 'views/AutoSlug'
import BatchActions from 'views/BatchActions'
import DatePicker from 'views/DatePicker'
import DateTimePicker from 'views/DateTimePicker'
import Sortable from 'views/Sortable'
import Filters from 'views/Filters'
import Formset from 'views/Formset'
import ImageCropper from 'views/ImageCropper'
import Select from 'views/Select'
import SelectApi from 'views/SelectApi'
import SelectAsset from 'views/SelectAsset'
import InsertImage from 'views/InsertImage'
import InsertVideo from 'views/InsertVideo'
import InsertAudio from 'views/InsertAudio'
import Tabs from 'views/Tabs'
import Wysiwyg from 'views/wysiwyg/Wysiwyg'
import { handlePopup } from 'helpers/WindowPopup'
import '../../stylesheets/base/app.scss'


const App = View.extend({

  initialize: function () {
  	pubsub.on('scarlet:render', this.render)

    // AutoSlug
    $('.auto-slug').each(function () {
      new AutoSlug({ el: $(this) }).render()
    })

    // BatchActions
    new BatchActions().render()

    // Filters
    $('.filters').each(function () {
      new Filters({ el: $(this) }).render()
    })

    // ImageCropper
    $('.jcrop').each(function () {
      new ImageCropper({ el: $(this) }).render()
    })

    // Wysiwyg
    $('.widget-wysiwyg').each((i, dom) => {
      new Wysiwyg({ el: dom }).render()
    })

    // Insert Image
    $('.widget-insert-image').each(function (i, dom) {
      let insertImage = new InsertImage({el : dom})
    })

    // Insert Video
    $('.widget-insert-video').each(function (i, dom) {
      let insertVideo = new InsertVideo({el : dom})
    })

    // Insert Audio
    $('.widget-insert-audio').each( (i, dom) => {
      let insertAudio = new InsertAudio({el : dom})
    })

    // Tabs
    $('.widget-tabs').each( (i, dom) => {
      let tabs = new Tabs({el: dom})
    })

    // DATEPICKER
    $('input.date').each(function (i, dom) {
      let datePicker = new DatePicker({el: dom}).render()
    })

    // DATETIMEPICKER
    $('input.datetime').each(function (i, dom) {
      let dateTimePicker = new DateTimePicker({el: dom}).render()
    })

    // SORTABLE
    $('table').each(function (i, dom) {
      let sortable = new Sortable({el: dom}).render()
    })

  },

  render: function() {
    // HANDLE WINDOWPOPUP
    handlePopup()

    // Formset
    new Formset().render()

    // SELECT
    const select = new Select().render()

    // SELECTAPI
    $('.api-select').each( (i, dom) => {
      let selectApi = new SelectApi({el: dom}).render()
    })

    // SELECTASSET
    $('.widget-asset').each( (i, dom) => {
      if(!$(dom).find('input').hasClass('selectized')){
       let selectAsset = new SelectAsset({el: dom}).render()
      }
    })

  }
})

export default App
