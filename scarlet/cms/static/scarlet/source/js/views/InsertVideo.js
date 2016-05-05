'use strict'
import InsertBase from './InsertBase'

const InsertImage = InsertBase.extend({

  initialize: function () {
    InsertBase.prototype.initialize.apply(this)
    this.vars = Object.assign(this.vars, {
      size : {
        width : 560,
        height : 315
      },
      providers : [
        {
          name : "youtube",
          regex : /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/,
          embed : "http://www.youtube.com/embed/"
        },
        {
          name : "vimeo",
          regex : /(?:vimeo.com\/(.*))/,
          embed : "http://player.vimeo.com/video/"
        }
      ],
    })
  },

  // Generates or updates the image with the latest input value.
  onInput : function (e) {
    let $target = $(e.currentTarget)
    let attribute = $target.data('attribute')
    let value = $(e.currentTarget).val()
    let $preview = this.$dom.find(".image-preview")
    let $video = $preview.find("iframe")

    if (attribute === "src") {
      value = this.validateVideo(value)
    }

    if (!$video.length) {

      $video = $("<iframe />")
      $video.attr({
        "frameborder" : "0",
        "allowfullscreen" : ""
      })

      $preview.append($video)

      this.vars.$node = $video

      this.setAttribute("width", this.vars.size.width)
      this.setAttribute("height", this.vars.size.height)

    } else {
      this.vars.$node = $video
    }

    if (attribute === "width" || attribute === "height") {

      value = value.replace("px", "")

      if (this.vars.constrain) {
        this.constrainProportion(attribute, value)
      }

      this.vars.size[attribute] = value

    }

    this.vars.$node = $video.attr(attribute, value)

  },

  validateVideo : function (url) {
    let providers = this.vars.providers;

    for (let i = 0, len = this.vars.providers.length; i < len; i++) {
      let provider = providers[i]
      let match = url.match(provider.regex)
      
      if (match) {
        return provider.embed + match[1]
      }
    }

    return url

  }


})

export default InsertImage