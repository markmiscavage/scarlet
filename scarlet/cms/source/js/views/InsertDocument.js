import Insert from 'views/Insert'

const InsertDocument = Insert.extend({
  bindInputs() {
    Insert.prototype.bindInputs.apply(this)
    this.$el.find('[data-respond="true"]').on('change', this.onInput.bind(this))
  },

  onInput(e) {
    const $target = $(e.currentTarget)
    const attribute = $target.data('attribute')
    let value = $(e.currentTarget).val()
    const $document = this.$el.find('document')

    // Adjusts the source to come from the data attribute.
    if ($target.attr('data-src') && value) {
      value = $target.attr('data-src')
    }

    let linktext = this.vars.$inputs[1].value;
    let linkurl = this.vars.$inputs[0].getAttribute('data-src')

    this.vars.$node = `<a href="${linkurl}" target="_blank" rel="noreferrer noopener">${linktext}</a>`
  },
})

export default InsertDocument
