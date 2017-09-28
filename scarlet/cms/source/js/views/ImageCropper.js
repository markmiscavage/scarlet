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
  },

  cropperReady() {
    const aspectRatio = this.scaled.width / this.scaled.height;
    this.$original.cropper('setAspectRatio', aspectRatio);
    
    const containerWidth = this.$el.find('.cropper-container').width();
    const containerHeight = this.$el.find('.cropper-container').height();
    const displayWidth = this.$el.find('.cropper-canvas').width();
    const displayHeight = this.$el.find('.cropper-canvas').height();
    const originalWidth = this.$original[0].naturalWidth;
    const originalHeight = this.$original[0].naturalHeight;
    const displayScaleX = displayWidth / originalWidth;
    const displayScaleY = displayHeight / originalHeight;

    const startX = ((containerWidth - displayWidth) / 2);
    const startY = ((containerHeight - displayHeight) / 2);
    const x1 = (this.cropCoords.x / originalWidth) * displayWidth;
    const x2 = (this.cropCoords.x2 / originalWidth) * displayWidth;
    const y1 = (this.cropCoords.y / originalHeight) * displayHeight;
    const y2 = (this.cropCoords.y2 / originalHeight) * displayHeight;

    const initCropArea = {
      left: startX + x1,
      top: startY + y1,
      width: x2 - x1,
      height: y2 - y1,
    };

    this.$original.cropper('setCropBoxData', initCropArea);
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

    /* Server sets the x2, y2 values relative to the original image, so we 
    have to scale the coordinate values; don't have to scale width and 
    height because that attribute is being set in the django template */
    const obj = {
      x: x * scaleX,
      y: y * scaleY,
      x2: x2 * scaleX,
      y2: y2 * scaleX,
      width,
      height,
    };

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
    // comment out scale adjustment since backend sizes the cropped section properly
    // const { scaleX, scaleY } = this.getScale();

    this.cropCoords = Object.assign({}, coords, {
      x: Math.round(coords.x/* * scaleX*/),
      y: Math.round(coords.y/* * scaleY*/),
      x2: Math.round((coords.x + coords.width)/* * scaleX*/),
      y2: Math.round((coords.y + coords.height)/* * scaleY*/)
    });
  },
});

export default ImageCropper;
