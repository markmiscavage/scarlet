import { View } from 'backbone';
import cropper from 'cropper';
import _ from 'underscore';
import imagesready from 'imagesready';
import pubsub from 'helpers/pubsub';

const ImageCropper = View.extend({
  classPrefix: '.image-cropper__',

  initialize() {
    this.cropCoords = {};
    this.scaled = {
      width: 0,
      height: 0,
    };
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
    // this.setConstraints();
    this.setupCropper();
  },

  setupCropper() {
    this.$original.cropper({
      data: this.setInitialCroparea.bind(this),
      cropmove: this.updateCropArea.bind(this),
      ready: this.cropperReady.bind(this),
      aspectRatio: this.scaled.width / this.scaled.height,
      autoCrop: true,
      autoCropArea: 1,
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
    console.log('aspect', this.scaled.width);
  },

  cropperReady() {
    const aspectRatio = this.scaled.width / this.scaled.height;
    this.$original.cropper('setAspectRatio', aspectRatio);
    console.log(this.$original.cropper('getCropBoxData'));
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
      this.cropCoords[prop] = parseInt($item.attr(`data-${prop}`), 10);
    });

    const { x, y, x2, y2, width, height } = this.cropCoords;
    this.scaled.width = width;
    this.scaled.height = height;
    const scaleX = this.scaled.width / this.$original[0].naturalWidth;
    const scaleY = this.scaled.height / this.$original[0].naturalHeight;

    /* Server sets the x2, y2 values relative to the original image, therefore we can
     check to see if the x2 / y2 values are greater than the current crop width / height
     to determine if the values have been calculated properly */
    const obj = {
      x: x2 > width ? Math.round(x * scaleX) : x,
      y: y2 > height ? Math.round(y * scaleY) : y,
      x2: x2 > width ? width : x2,
      y2: y2 > height ? height : y2,
      width,
      height,
    };
    console.log('FROM SETUP', {
      left: Math.round(obj.x / scaleX),
      top: Math.round(obj.y / scaleY),
      width: Math.round((obj.x2 - obj.x) / scaleX),
      height: Math.round((obj.y2 - obj.y) / scaleY),
    });
    this.$original.cropper('setCropBoxData', {
      left: Math.round(obj.x / scaleX),
      top: Math.round(obj.y / scaleY),
      width: Math.round((obj.x2 - obj.x) / scaleX),
      height: Math.round((obj.y2 - obj.y) / scaleY),
    });
    return obj;
  },

  getScale() {
    return {
      scaleX: this.scaled.width / this.$original[0].naturalWidth,
      scaleY: this.scaled.height / this.$original[0].naturalHeight,
    };
  },

  updateCropArea() {
    const data = this.$original.cropper('getData');
    this.setCropCoords(data);
    pubsub.trigger('update-crop', this.cropCoords);
  },

  setCropCoords(coords) {
    const { scaleX, scaleY } = this.getScale();

    this.cropCoords = Object.assign({}, coords, {
      x: Math.round(coords.x * scaleX),
      y: Math.round(coords.y * scaleY),
      x2: Math.round((coords.x + coords.width) * scaleX),
      y2: Math.round((coords.y + coords.height) * scaleY),
    });
  },
});

export default ImageCropper;
