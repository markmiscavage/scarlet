import { View } from 'backbone';
import cropper from 'cropper';
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
    this.$original.cropper({
      data: this.setInitialCroparea(),
      cropmove: this.updateCropArea.bind(this),
      aspectRatio: this.cropScale.w / this.cropScale.h,
      autoCropArea: 1,
      responsive: true,
      viewMode: 1,
      zoomable: false,
    });
  },

  cropperReady() {
    const $clone = this.$original.clone().removeClass('cropper-hidden');
    $clone.css({
      display: 'block',
      width: '100%',
      minWidth: 0,
      minHeight: 0,
      maxWidth: 'none',
      maxHeight: 'none',
    });
    this.$preview
      .css({
        width: '300px',
        overflow: 'hidden',
      })
      .html($clone);
  },

  cropperClone(e) {
    const imageData = this.$original.cropper('getImageData');
    const previewAspectRatio = e.width / e.height;
    const previewWidth = this.$preview.width();
    const previewHeight = previewWidth / previewAspectRatio;
    const imageScaledRatio = e.width / previewWidth;
    this.$preview.height(previewHeight).find('img').css({
      width: imageData.naturalWidth / imageScaledRatio,
      height: imageData.naturalHeight / imageScaledRatio,
      marginLeft: -e.x / imageScaledRatio,
      marginTop: -e.y / imageScaledRatio,
    });
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

  // set initial croparea from (x,y,x2,y2) field values
  setInitialCroparea() {
    const data = $('.crop-list__item').data();
    const coords = this.buildMap(data);
    console.log(coords);
    for (const [key, value] of coords) {
      this.cropCoords[key] = value;
    }
    console.log('COORS', this.cropCoords);
    console.log('get scale', this.getScale());
    // this.$original.css({ width: coords.get('width') });
    const obj = {
      x: coords.get('x'),
      y: coords.get('y'),
      width: coords.get('width'),
      height: coords.get('height'),
      ...this.getScale(),
    };
    console.log('OBJECT', obj);
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
    const data = this.$original.cropper('getData');

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
