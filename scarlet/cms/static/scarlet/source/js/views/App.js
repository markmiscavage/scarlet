import { View } from 'backbone'
import pubsub from 'helpers/pubsub'
import AutoSlug from 'views/AutoSlug'
import BatchActions from 'views/BatchActions'
import DatePicker from 'views/DatePicker'
import DateTimePicker from 'views/DateTimePicker'
import Editor from 'views/editor/Editor'
import Filters from 'views/Filters'
import Formset from 'views/Formset'
import ImageCropper from 'views/ImageCropper'
import InsertImage from 'views/InsertImage'
import InsertVideo from 'views/InsertVideo'
import InsertAudio from 'views/InsertAudio'
import Select from 'views/Select'
import SelectApi from 'views/SelectApi'
import SelectAsset from 'views/SelectAsset'
import Sortable from 'views/Sortable'
import Tabs from 'views/Tabs'
import { handlePopup } from 'helpers/WindowPopup'

import '../../stylesheets/app.scss'

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

    // Formset
    new Formset().render()

    // ImageCropper
    $('.jcrop').each(function () {
      new ImageCropper({ el: $(this) }).render()
    })

    // Insert Image
    $('.widget-insert-image').each(function () {
      let insertImage = new InsertImage({el : $(this)})
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
    // Bind Popup triggers
    handlePopup()

    // Editor
    $('.editor:not(.editor--rendered)').each((i, dom) => {
      new Editor({ el: dom }).render()
    })

    // Select
    const select = new Select().render()

    // SELECTAPI
    $('.api-select').each( (i, dom) => {
      let selectApi = new SelectApi({el: dom}).render()
    })

    // SELECTASSET
    $('.asset').each( (i, dom) => {
      if(!$(dom).find('input').hasClass('selectized')){
        let selectAsset = new SelectAsset({el: dom}).render()
      }
    })

  }
})

export default App
