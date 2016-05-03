import Backbone, { View } from 'backbone'
import pubsub from '../helpers/pubsub'
import AutoSlug from './AutoSlug'
import BatchActions from './BatchActions'
import DatePicker from './DatePicker'
import DateTimePicker from './DateTimePicker'
import Filters from './Filters'
import Formset from './Formset'
import ImageCropper from './ImageCropper'
import Select from './Select'
import SelectApi from './SelectApi'
import SelectAsset from './SelectAsset'
import InsertImage from './InsertImage'
import InsertVideo from './InsertVideo'
import InsertAudio from './InsertAudio'
import Tabs from './Tabs'
import { handlePopup } from '../helpers/WindowPopup'
import Wysiwyg from './wysiwyg/Wysiwyg'

const App = View.extend({

  initialize: function () {
  	pubsub.on('scarlet:render', this.render)

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
