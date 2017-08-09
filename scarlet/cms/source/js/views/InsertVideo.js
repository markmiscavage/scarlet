import Insert from 'views/Insert'

const InsertVideo = Insert.extend({
  initialize() {
    Insert.prototype.initialize.apply(this)
    this.vars = Object.assign(this.vars, {
      size: {
        width: 560,
        height: 315,
      },
      providers: [
        {
          name: 'youtube',
          regex: /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/,
          embed: 'http://www.youtube.com/embed/',
        },
        {
          name: 'vimeo',
          regex: /(?:vimeo.com\/(.*))/,
          embed: 'http://player.vimeo.com/video/',
        },
      ],
    })
  },

  // Generates or updates the image with the latest input value.
  onInput(e) {
    const $target = $(e.currentTarget)
    const attribute = $target.data('attribute')
    let value = $(e.currentTarget).val()
    const $preview = this.$('.video-preview')
    let $video = $preview.find('iframe')

    if (attribute === 'src') {
      value = this.validateVideo(value)
    }

    if (!$video.length) {
      $video = $('<iframe />')
      $video.attr({
        frameborder: '0',
        allowfullscreen: '',
      })

      $preview.append($video)

      this.vars.$node = $video

      this.setAttribute('width', this.vars.size.width)
      this.setAttribute('height', this.vars.size.height)
    } else {
      this.vars.$node = $video
    }

    if (attribute === 'width' || attribute === 'height') {
      value = value.replace('px', '')

      if (this.vars.constrain) {
        this.constrainProportion(attribute, value)
      }

      this.vars.size[attribute] = value
    }

    this.vars.$node = $video.attr(attribute, value)
  },

  validateVideo(url) {
    const providers = this.vars.providers

    for (let i = 0, len = this.vars.providers.length; i < len; i++) {
      const provider = providers[i]
      const match = url.match(provider.regex)

      if (match) {
        return provider.embed + match[1]
      }
    }

    return url
  },
})

export default InsertVideo
