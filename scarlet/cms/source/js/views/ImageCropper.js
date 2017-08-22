import { View } from 'backbone';
import cropper from 'cropper';
import _ from 'underscore';
import imagesready from 'imagesready';
import pubsub from 'helpers/pubsub';

const ImageCropper = View.extend({
  classPrefix: '.image-cropper__',

  initialize() {
    this.cropCoords = {};
    this.options = {
      aspectRatio: 0,
    };
  },

  render() {
    this.$original = this.$(`${this.classPrefix}original`);
    this.$preview = this.$(`${this.classPrefix}preview`);
    this.$original.imagesReady().then(this.onReady.bind(this), this.onError);
  },

  onReady() {
    this.setConstraints();
    this.setupCropper();
  },

  setupCropper() {
    this.$original.cropper({
      data: this.setInitialCroparea.bind(this),
      cropmove: this.updateCropArea.bind(this),
      ready: this.cropperReady.bind(this),
      aspectRatio: this.cropScale.w / this.cropScale.h,
      autoCropArea: false,
      background: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      dragMode: 'crop',
      guides: true,
      highlight: true,
      modal: false,
      responsive: true,
      viewMode: 1,
      zoomable: false,
    });
  },

  cropperReady() {
    console.log(this.$original.cropper('getData'));
  },

  // iterate over coordinate property keys
  loopCoordProps(cb) {
    const props = ['x', 'y', 'x2', 'y2', 'width', 'height'];
    let i = props.length - 1;
    let prop;

    for (i; i >= 0; i -= 1) {
      prop = props[i];
      cb.call(this, prop);
    }
  },

  // set initial croparea from (x,y,x2,y2) field values
  setInitialCroparea() {
    const $item = $('.crop-list__item');

    this.loopCoordProps(prop => {
      this.cropCoords[prop] = $item.attr(`data-${prop}`);
    });

    const obj = {
      x: $item.attr('data-x'),
      y: $item.attr('data-y'),
      width: $item.attr('data-width'),
      height: $item.attr('data-height'),
      rotate: 0,
      ...this.getScale(),
    };

    return obj;
  },

  getScale() {
    let scaleX, scaleY;

    if (this.constrainRatio) {
      scaleX = this.cropScale.w / this.cropCoords.width;
      scaleY = this.cropScale.h / this.cropCoords.height;
    } else if (this.constrainHeight) {
      // set equal scaling ratio (to prevent distortion)
      scaleX = scaleY = this.cropScale.h / this.cropCoords.height;
    } else if (this.constrainWidth) {
      scaleX = scaleY = this.cropScale.w / this.cropCoords.width;
    } else {
      scaleX = scaleY =
        this.$original[0].naturalWidth /
        this.cropCoords.width /
        (this.$original[0].naturalHeight / this.cropCoords.height);
    }

    return {
      scaleX,
      scaleY,
    };
  },

  updateCropArea() {
    const data = this.$original.cropper('getData');
    pubsub.trigger('update-crop', data);
    this.setCropCoords(data);
  },

  setCropCoords(coords) {
    this.cropCoords = Object.assign({}, coords, {
      x: Math.round(coords.x),
      y: Math.round(coords.y),
      x2: Math.round(coords.x + coords.width),
      y2: Math.round(coords.y + coords.height),
    });
  },
});

export default ImageCropper;
