import Insert from 'views/Insert'

const InsertImage = Insert.extend({
  bindInputs() {
    Insert.prototype.bindInputs.apply(this)
    this.$el.find('[data-respond="true"]').on('change', this.onInput.bind(this))
  },

  // Generates or updates the image with the latest input value.
  onInput(e) {
    const $target = $(e.currentTarget)
    const attribute = $target.data('attribute')
    let value = $(e.currentTarget).val()
    const $preview = this.$el.find('.image-preview')
    let $img = $preview.find('img')

    // Adjusts the source to come from the data attribute.
    if ($target.attr('data-src')) {
      $preview.empty()
      $img = $preview.find('img')
      value = $target.attr('data-src')
    }

    if (!$img.length) {
      $img = $('<img />')
      $preview.append($img)

      this.vars.$node = $img

      $img.on('load', e => {
        const width = $img.width()
        const height = $img.height()

        this.vars.size.width = width
        this.vars.size.height = height

        this.setAttribute('width', width)
        this.setAttribute('height', height)
      })
    } else {
      this.vars.$node = $img
    }

    if (attribute === 'width' || attribute === 'height') {
      value = value.replace('px', '')

      if (this.vars.constrain) {
        this.constrainProportion(attribute, value)
      }

      this.vars.size[attribute] = value
    }

    this.vars.$node = $img.attr(attribute, value)
  },
})

export default InsertImage
