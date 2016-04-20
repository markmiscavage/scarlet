import { View } from 'backbone'
import Jcrop from 'jcrop'
import imagesready from 'imagesready'

const ImageCropper = View.extend({

  initialize: function () {
    this.options = {
      aspectRatio: 0
    }
  },

  render: function () {
    this.$original = this.$('.original')
    this.$preview = this.$('.preview')
    this.$thumb = this.$preview.find('.thumb')

    this.$original.imagesReady().then(this.onReady.bind(this), this.onError)
  },

  onReady: function () {
    this.setConstraints()
    this.setupPreview()
    this.setupJcrop()
  },

  onError: function (error) {
    console.log('ERROR', error)
  },

  setupJcrop: function () {
    var self = this
    var options = $.extend({}, this.options, {
      onSelect : this.updatePreview.bind(this),
      onChange : this.updatePreview.bind(this),
      aspectRatio : (this.constrainRatio ? (this.cropScale.w / this.cropScale.h) : 0),
      allowSelect : (this.constrainRatio ? true : false),
      boxWidth : (this.$el.width() * 0.75),
      minSize : [20, 20]
    })

    if (this._jcrop) {
      this._jcrop.destroy()
    }

    this.$original.Jcrop(options, function () {
      self._jcrop = this
      self.setInitialCroparea()
    })
  },

  // iterate over coordinate property keys
  loopCoordProps : function (cb) {
    var props = ['x', 'y', 'x2', 'y2', 'w', 'h'],
      i = props.length - 1,
      prop

    for (i; i >= 0; i--) {
      prop = props[i]
      cb.call(this, prop)
    }
  },

  // set initial croparea from (x,y,x2,y2) field values
  setInitialCroparea : function () {
    this.cropCoords = this.cropCoords || {}

    this.loopCoordProps(function (prop) {
      var $coord = $('input[data-property="' + prop + '"]')

      if ($coord.length) {
        this.cropCoords[prop] = $coord.val()
      }
    })

    // set jcrop selection
    this._jcrop.setSelect([this.cropCoords.x, this.cropCoords.y, this.cropCoords.x2, this.cropCoords.y2])
  },

  // store current crop coordinates as field values
  updateCoords : function () {
    this.loopCoordProps(function (prop) {
      var $coord = $('input[data-property="' + prop + '"]')

      if ($coord.length) {
        console.log('updateCoords', prop, this.cropCoords[prop])
        $coord.attr('value', this.cropCoords[prop]) // sync field val
      }
    })
  },

  getScale : function () {
    var scaleX,
      scaleY

    if (this.constrainRatio) {

      scaleX = this.cropScale.w / this.cropCoords.w
      scaleY = this.cropScale.h / this.cropCoords.h

    } else {

      if (this.constrainHeight) {
        // set equal scaling ratio (to prevent distortion)
        scaleX = scaleY = this.cropScale.h / this.cropCoords.h
      } else if (this.constrainWidth) {
        scaleX = scaleY = this.cropScale.w / this.cropCoords.w
      } else {
        scaleX = scaleY = (this.$original[0].naturalWidth / this.cropCoords.w) / (this.$original[0].naturalHeight / this.cropCoords.h)
      }
    }

    return {
      scaleX: scaleX,
      scaleY: scaleY
    }
  },

  updatePreview : function (coords) {
    clearTimeout(this.refreshTimeout)

    if (parseInt(coords.w, 10) < 0) {
      return
    }

    this.cropCoords = coords

    var scale = this.getScale(),
      width,
      height

    if (!this.constrainRatio) {

      if (this.constrainHeight) {
        // update preview width
        width = Math.round(scale.scaleY * coords.w)

        this.$preview.find('.mask').css({
          width: width + 'px'
        }).end().find('strong').text(width + ' x ' + this.cropScale.h)

      } else if (this.constrainWidth) {
        // update preview height
        height = Math.round(scale.scaleX * coords.h)

        this.$preview.find('.mask').css({
          height: height + 'px'
        }).end().find('strong').text(this.cropScale.w + ' x ' + height)

      } else {
        // update preview height and width
        height = Math.round(scale.scaleY * coords.h)
        width = Math.round(scale.scaleX * coords.w)

        this.$preview.find('.mask').css({
          width: width + 'px',
          height: height + 'px'
        }).end().find('strong').text(width + ' x ' + height)
      }
    }

    // update preview img
    this.$thumb.css({
      width: Math.round(scale.scaleX * this.$original[0].naturalWidth) + 'px',
      height: Math.round(scale.scaleY * this.$original[0].naturalHeight) + 'px',
      marginLeft: '-' + Math.round(scale.scaleX * coords.x) + 'px',
      marginTop: '-' + Math.round(scale.scaleY * coords.y) + 'px'
    })

    // debounce update of coord values (form fields) after interaction
    this.refreshTimeout = setTimeout(this.updateCoords.bind(this), 250)
  },

  setConstraints: function () {
    var data = this.$preview.data()

    this.constrainHeight = data.scaleH === 'None' ? false : true
    this.constrainWidth = data.scaleW === 'None' ? false : true
    this.constrainRatio = (this.constrainHeight && this.constrainWidth)

    // set aspect ratio for crop
    // also defines .mask box size
    this.cropScale = {
      w: (this.constrainWidth ? data.scaleW : this.$original[0].naturalWidth),
      h: (this.constrainHeight ? data.scaleH : this.$original[0].naturalHeight)
    }
  },

  setupPreview : function () {
    this.$preview.find('.mask').css({
      width: this.cropScale.w,
      height: this.cropScale.h
    }).addClass('active')

    if (this.constrainRatio) {
      this.$preview.find('strong').text(this.cropScale.w + ' x ' + this.cropScale.h)
    }
  },
})

export default ImageCropper
