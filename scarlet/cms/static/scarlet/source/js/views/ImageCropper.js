import { View } from 'backbone'
import Jcrop from 'jcrop'
import imagesready from 'imagesready'

const ImageCropper = View.extend({
  classPrefix: '.image-cropper__',

  initialize() {
    this.cropCoords = {}
    this.options = {
      aspectRatio: 0,
    }
  },

  render() {
    this.$original = this.$(`${this.classPrefix}original`)
    this.$preview = this.$(`${this.classPrefix}preview`)
    this.$mask = this.$(`${this.classPrefix}mask`)
    this.$thumb = this.$preview.find('img')

    this.$original.imagesReady().then(this.onReady.bind(this), this.onError)
  },

  onReady() {
    this.setConstraints()
    this.setupPreview()
    this.setupJcrop()
  },

  onError(error) {
    console.log('ERROR', error)
  },

  setupJcrop() {
    const self = this
    const options = $.extend({}, this.options, {
      onSelect: this.updateCropArea.bind(this),
      onChange: this.updateCropArea.bind(this),
      aspectRatio: this.constrainRatio
        ? this.cropScale.w / this.cropScale.h
        : 0,
      allowSelect: !!this.constrainRatio,
      boxWidth: this.$el.width() * 0.75,
      minSize: [20, 20],
    })
    if (this._jcrop) {
      this._jcrop.destroy()
    }

    this.$original.Jcrop(options, function() {
      self._jcrop = this
      self.setInitialCroparea()
    })
  },

  // iterate over coordinate property keys
  loopCoordProps(cb) {
    let props = ['x', 'y', 'x2', 'y2', 'w', 'h'],
      i = props.length - 1,
      prop

    for (i; i >= 0; i--) {
      prop = props[i]
      cb.call(this, prop)
    }
  },

  // set initial croparea from (x,y,x2,y2) field values
  setInitialCroparea() {
    this.loopCoordProps(function(prop) {
      const $coord = $(`input[data-property="${prop}"]`)

      if ($coord.length) {
        this.cropCoords[prop] = $coord.val()
      }
    })

    // set jcrop selection
    this._jcrop.setSelect([
      this.cropCoords.x,
      this.cropCoords.y,
      this.cropCoords.x2,
      this.cropCoords.y2,
    ])
  },

  // store current crop coordinates as field values
  updateCoords() {
    this.loopCoordProps(function(prop) {
      const $coord = $(`input[data-property="${prop}"]`)

      if ($coord.length) {
        // sync field val
        $coord.attr('value', this.cropCoords[prop])
      }
    })
  },

  getScale() {
    let scaleX, scaleY

    if (this.constrainRatio) {
      scaleX = this.cropScale.w / this.cropCoords.w
      scaleY = this.cropScale.h / this.cropCoords.h
    } else if (this.constrainHeight) {
      // set equal scaling ratio (to prevent distortion)
      scaleX = scaleY = this.cropScale.h / this.cropCoords.h
    } else if (this.constrainWidth) {
      scaleX = scaleY = this.cropScale.w / this.cropCoords.w
    } else {
      scaleX = scaleY =
        this.$original[0].naturalWidth /
        this.cropCoords.w /
        (this.$original[0].naturalHeight / this.cropCoords.h)
    }

    return {
      scaleX,
      scaleY,
    }
  },

  updateCropArea(coords) {
    clearTimeout(this.refreshTimeout)

    if (parseInt(coords.w, 10) < 0) {
      return
    }

    let scale = this.getScale(),
      width,
      height

    if (!this.constrainRatio) {
      if (this.constrainHeight) {
        // update preview width
        width = Math.round(scale.scaleY * coords.w)

        this.$preview
          .find('.mask')
          .css({
            width: `${width}px`,
          })
          .end()
          .find('strong')
          .text(`${width} x ${this.cropScale.h}`)
      } else if (this.constrainWidth) {
        // update preview height
        height = Math.round(scale.scaleX * coords.h)

        this.$mask
          .css({
            height: `${height}px`,
          })
          .end()
          .find('strong')
          .text(`${this.cropScale.w} x ${height}`)
      } else {
        // update preview height and width
        height = Math.round(scale.scaleY * coords.h)
        width = Math.round(scale.scaleX * coords.w)

        this.$mask
          .css({
            width: `${width}px`,
            height: `${height}px`,
          })
          .end()
          .find('strong')
          .text(`${width} x ${height}`)
      }
    }

    // update preview img
    this.$thumb.css({
      width: `${Math.round(scale.scaleX * this.$original[0].naturalWidth)}px`,
      height: `${Math.round(scale.scaleY * this.$original[0].naturalHeight)}px`,
      marginLeft: `-${Math.round(scale.scaleX * coords.x)}px`,
      marginTop: `-${Math.round(scale.scaleY * coords.y)}px`,
    })

    this.setCropCoords(coords)

    // debounce update of coord values (form fields) after interaction
    this.refreshTimeout = setTimeout(this.updateCoords.bind(this), 250)
  },

  setCropCoords(coords) {
    this.cropCoords = Object.assign({}, coords, {
      x: Math.round(coords.x),
      y: Math.round(coords.y),
      x2: Math.round(coords.x2),
      y2: Math.round(coords.y2),
    })
  },

  setConstraints() {
    const data = this.$preview.data()

    this.constrainHeight = data.scaleH !== 'None'
    this.constrainWidth = data.scaleW !== 'None'
    this.constrainRatio = this.constrainHeight && this.constrainWidth

    // set aspect ratio for crop
    // also defines .mask box size
    this.cropScale = {
      w: this.constrainWidth ? data.scaleW : this.$original[0].naturalWidth,
      h: this.constrainHeight ? data.scaleH : this.$original[0].naturalHeight,
    }
  },

  setupPreview() {
    this.$mask
      .css({
        width: this.cropScale.w,
        height: this.cropScale.h,
      })
      .addClass('active')

    if (this.constrainRatio) {
      this.$preview
        .find('strong')
        .text(`${this.cropScale.w} x ${this.cropScale.h}`)
    }
  },
})

export default ImageCropper
