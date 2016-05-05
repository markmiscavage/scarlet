'use strict'
import Insert from './Insert'

const InsertAudio = Insert.extend({

  bindInputs : function () {
    Insert.prototype.bindInputs.apply(this)
    this.$dom.find('[data-respond=\"true\"]').on('change', this.onInput.bind(this))
  },

  onInput : function (e) {

    let $target = $(e.currentTarget)
    let attribute = $target.data('attribute')
    let value = $(e.currentTarget).val()
    let $audio = this.$dom.find('audio')

  // Adjusts the source to come from the data attribute.
  if ($target.attr('data-src') && value) {
    value = $target.attr('data-src')
  }

  $audio[0].src = value
  $audio[0].load()
  this.vars.$node = $audio
  }

})

export default InsertAudio


