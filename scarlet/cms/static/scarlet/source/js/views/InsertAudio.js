import Insert from 'views/Insert'

const InsertAudio = Insert.extend({
  bindInputs() {
    Insert.prototype.bindInputs.apply(this)
    this.$el.find('[data-respond="true"]').on('change', this.onInput.bind(this))
  },

  onInput(e) {
    const $target = $(e.currentTarget)
    const attribute = $target.data('attribute')
    let value = $(e.currentTarget).val()
    const $audio = this.$el.find('audio')

    // Adjusts the source to come from the data attribute.
    if ($target.attr('data-src') && value) {
      value = $target.attr('data-src')
    }

    $audio[0].src = value
    $audio[0].load()
    this.vars.$node = $audio
  },
})

export default InsertAudio
