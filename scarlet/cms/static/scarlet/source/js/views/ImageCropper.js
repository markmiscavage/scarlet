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
      ready: this.cropperReady.bind(this),
      crop: this.cropperClone.bind(this),
      cropmove: this.updateCropArea.bind(this),
      aspectRatio: this.cropScale.w / this.cropScale.h,
      autoCropArea: 1,
      background: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      dragMode: 'crop',
      guides: true,
      highlight: true,
      modal: false,
      responsive: true,
      restore: true,
      viewMode: 3,
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
    const { x, y, x2, y2, width, height } = $('.crop-list__item').data();
    const data = $('.crop-list__item').data();
    const coords = this.buildMap(data);

    for (const [key, value] in coords) {
      this.cropCoords[key] = value;
    }
    return {
      x,
      y,
      x2,
      y2,
      width,
      height,
      ...this.getScale(),
    };
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
      scaleX = this.cropScale.w / this.cropCoords.w;
      scaleY = this.cropScale.h / this.cropCoords.h;
    } else if (this.constrainHeight) {
      // set equal scaling ratio (to prevent distortion)
      scaleX = scaleY = this.cropScale.h / this.cropCoords.h;
    } else if (this.constrainWidth) {
      scaleX = scaleY = this.cropScale.w / this.cropCoords.w;
    } else {
      scaleX = scaleY =
        this.$original[0].naturalWidth /
        this.cropCoords.w /
        (this.$original[0].naturalHeight / this.cropCoords.h);
    }

    return {
      scaleX,
      scaleY,
    };
  },

  updateCropArea(coords) {
    const data = this.$original.cropper('getData');
    clearTimeout(this.refreshTimeout);

    if (parseInt(data.width, 10) < 0) {
      return;
    }

    let scale = this.getScale(),
      width,
      height;

    if (!this.constrainRatio) {
      if (this.constrainHeight) {
        // update preview width
        width = Math.round(scale.scaleY * data.width);

        this.$preview
          .find('.mask')
          .css({
            width: `${width}px`,
          })
          .end()
          .find('strong')
          .text(`${width} x ${this.cropScale.h}`);
      } else if (this.constrainWidth) {
        // update preview height
        height = Math.round(scale.scaleX * data.height);

        this.$mask
          .css({
            height: `${height}px`,
          })
          .end()
          .find('strong')
          .text(`${this.cropScale.w} x ${height}`);
      } else {
        // update preview height and width
        height = Math.round(scale.scaleY * data.height);
        width = Math.round(scale.scaleX * data.width);

        this.$mask
          .css({
            width: `${width}px`,
            height: `${height}px`,
          })
          .end()
          .find('strong')
          .text(`${width} x ${height}`);
      }
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

    this.constrainHeight = data.scaleH !== 'None';
    this.constrainWidth = data.scaleW !== 'None';
    this.constrainRatio = this.constrainHeight && this.constrainWidth;

    // set aspect ratio for crop
    // also defines .mask box size
    this.cropScale = {
      w: this.constrainWidth ? data.scaleW : this.$original[0].naturalWidth,
      h: this.constrainHeight ? data.scaleH : this.$original[0].naturalHeight,
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
