import { View } from 'backbone';
import Cropper from 'cropperjs';

import imagesready from 'imagesready';

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
    this.$mask = this.$(`${this.classPrefix}mask`);
    this.$thumb = this.$preview.find('img');

    this.$original.imagesReady().then(this.onReady.bind(this), this.onError);
  },

  onReady() {
    this.setConstraints();
    // this.setupPreview();
    this.setupCropper();
  },

  setupCropper() {
    this.cropper = new Cropper(this.$original[0], {
      aspectRatio: this.cropScale.w / this.cropScale.h,
      cropmove: this.updateCropArea.bind(this),
      autoCrop: true,
      responsive: true,
      viewMode: 1,
      zoomable: false,
    });

    this.$original[0].addEventListener('ready', function () {
      this.setCropBox();
    }.bind(this));
  },

  setCropBox() {
    this.cropDiemensions = this.getInitialCroparea();
    this.cropper.setCropBoxData(this.cropDiemensions);
  },

  // iterate over coordinate property keys
  loopCoordProps(cb) {
    const props = ['x', 'y', 'x2', 'y2', 'w', 'h'];
    let i = props.length - 1;
    let prop;

    for (i; i >= 0; i -= 1) {
      prop = props[i];
      cb.call(this, prop);
    }
  },

  // get initial croparea from (x,y,x2,y2) field values
  getInitialCroparea() {
    const data = $('.crop-list__item').data();
    const coords = this.buildMap(data);

    for (const [key, value] of coords) {
      this.cropCoords[key] = value;
    }

    // set DOM vars used in calculations
    this.cropperBox = document.querySelector('.cropper-wrap-box');
    this.cropperCanvasStyleTransform = document.querySelector('.cropper-canvas').style.transform;

    // get canvas height to add to top position and set the crop ratio used to calculate width/height
    this.cropperCanvasHeight = 0;
    if (this.cropperCanvasStyleTransform.indexOf('translateY') >= 0) {
      this.cropperCanvasHeight = document.querySelector('.cropper-canvas').style.transform.replace(/[^\d.]/g, '');
      this.cropRatio = this.cropperBox.clientWidth / this.$original[0].naturalWidth;
    }

    // get canvas width to add to left position and set the crop ratio used to calculate width/height
    this.cropperCanvasWidth = 0;
    if (this.cropperCanvasStyleTransform.indexOf('translateX') >= 0) {
      this.cropperCanvasWidth = document.querySelector('.cropper-canvas').style.transform.replace(/[^\d.]/g, '');
      this.cropRatio = this.cropperBox.clientHeight / this.$original[0].naturalHeight;
    }

    // set the crop ratio
    this.cropRatioW = this.cropperBox.clientWidth / this.$original[0].naturalWidth;

    // set crop height and width
    this.cropWidth = coords.get('x2') - coords.get('x');
    this.cropHeight = coords.get('y2') - coords.get('y');

    //set left and top
    this.cropLeft = coords.get('x');
    this.cropTop = coords.get('y');

    // define crop object
    const obj = {
      left: this.cropLeft * this.cropRatio + parseFloat(this.cropperCanvasWidth),
      top: this.cropTop * this.cropRatio + parseFloat(this.cropperCanvasHeight),
      width: this.cropWidth * this.cropRatio,
      height: this.cropHeight * this.cropRatio,
    };

    return obj;
  },

  buildMap(obj) {
    const map = new Map();
    Object.keys(obj).forEach(key => {
      map.set(key, obj[key]);
    });
    return map;
  },

  // store current crop coordinates as field values
  updateCoords() {
    this.loopCoordProps(prop => {
      const $coord = $(`input[data-property="${prop}"]`);

      if ($coord.length) {
        // sync field val
        $coord.attr('value', this.cropCoords[prop]);
      }
    });

    // update crop name
    this.inputCurrentCropName = document.querySelector('.crop-values[name=name]');
    this.currentCropName = document.querySelector('.crop-info .selectized [selected]').innerHTML
    if (this.inputCurrentCropName) {
      this.inputCurrentCropName.value = this.currentCropName;
    }
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

  updateCropArea(coords) {
    const data = this.cropper.getData();

    if (parseInt(data.width, 10) < 0) {
      return;
    }

    this.setCropCoords(data);

    // debounce update of coord values (form fields) after interaction
    this.refreshTimeout = setTimeout(this.updateCoords.bind(this), 250);
  },

  setCropCoords(coords) {
    this.cropCoords = Object.assign({}, coords, {
      x: Math.round(coords.x),
      y: Math.round(coords.y),
      x2: Math.round(coords.x + coords.width),
      y2: Math.round(coords.y + coords.height),
    });
  },

  setConstraints() {
    const data = this.$preview.data();
    this.constrainHeight = data.scaleh !== 'None';
    this.constrainWidth = data.scalew !== 'None';
    this.constrainRatio = this.constrainHeight && this.constrainWidth;

    // set aspect ratio for crop
    // also defines .mask box size
    this.cropScale = {
      w: this.constrainWidth ? data.scalew : this.$original[0].naturalWidth,
      h: this.constrainHeight ? data.scaleh : this.$original[0].naturalHeight,
    };
  },

  setupPreview() {
    this.$mask
      .css({
        width: this.cropScale.w,
        height: this.cropScale.h,
      })
      .addClass('active');

    if (this.constrainRatio) {
      this.$preview.find('strong').text(`${this.cropScale.w} x ${this.cropScale.h}`);
    }
  },
});

export default ImageCropper;
