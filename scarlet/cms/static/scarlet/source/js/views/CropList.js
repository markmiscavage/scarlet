import { View } from 'backbone';
import selectize from 'selectize';
import ImageCropper from 'views/ImageCropper';

const CropList = View.extend({
  initialize() {
    this.items = [];
    this.$input = $('<select />');
    this.$el.append(this.$input);
    this.getListItems();
    $('.asset__crop-list').hide();
    this.url = $('.widget-asset-simple').find('a')[0].href;
    console.log('URL', this.url);

    this.addApplyCropBtn();
    this.initializeElements();
    this.addEventListeners();
  },

  addApplyCropBtn() {
    var btnGroup = document.querySelector('.button-group--submit');
    if (btnGroup) {
      var btnApply = `<a class="button button--tertiary apply-crop apply-crop--hidden">Apply Crop
                        <span class='check'>
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
                            <polyline class="path check" fill="none" stroke="#f00" stroke-width="10" stroke-linecap="round" stroke-miterlimit="10" points="100.2,40.2 51.5,88.8 29.8,67.5 "/>
                          </svg>
                        </span>
                      </a>`;
      var temp = document.createElement("div");
      temp.innerHTML = btnApply;
      btnGroup.prepend(temp.childNodes[0]);
    }
  },

  initializeElements() {
    this.cropObj = [];
    this.btnApplyCrop = document.querySelector('.apply-crop');
    this.inputCropValues = document.querySelectorAll('input.crop-values');
    this.inputCrops = document.querySelector('input[name=crops]');
  },

  addEventListeners() {
    this.btnApplyCrop.addEventListener('click', this.handleApplyCropClick.bind(this));
    window.addEventListener('DOMContentLoaded', this.scrollToHeadline);
  },

  scrollToHeadline() {
    var eleHeader = document.querySelector('.header-object__breadcrumb');
    if (eleHeader) {
      eleHeader.scrollIntoView();
    }
  },

  handleApplyCropClick() {
    this.cropObjBuilder = {};
    for (var i = 0; i < this.inputCropValues.length; i++) {
      var cropImageName = this.inputCropValues[i].name;
      this.cropObjBuilder[cropImageName] = this.inputCropValues[i].value;
    };

    // start populating the crop object
    if (this.cropObj.length == 0) {
      this.cropObj.push(this.cropObjBuilder);
    }

    this.isInCropObj = false;
    // check the crop obj to see if it contains the current item, if it does overwrite it
    for (var j = 0; j < this.cropObj.length; j++) {
      if (this.cropObj[j].name == this.cropObjBuilder.name) {
        // replace current item
        this.cropObj[j] = this.cropObjBuilder;

        // update boolean so we don't append this obj
        this.isInCropObj = true;
      }
    }

    // crop obj doesn't have current image, add it
    if (this.isInCropObj == false) {
      this.cropObj.push(this.cropObjBuilder);
    }

    // add crop'd item as stringified json object
    this.inputCrops.value = JSON.stringify(this.cropObj);

    // show user that interaction
    this.btnApplyCrop.classList.add('clicked');
    setTimeout(function() {
      this.btnApplyCrop.classList.remove('clicked');
    }.bind(this), 2000);
  },

  render() {
    const options = {
      maxItems: 1,
      valueField: 'path',
      labelField: 'name',
      options: this.items,
      searchField: ['name', 'dimensions'],
      render: this.renderOptions(),
      onItemAdd: this.edit.bind(this),
      // onInitialize: this.getListItems.bind(this),
    };
    this.$input.selectize(options);
    return this;
  },

  getListItems() {
    $('.asset__crop-list').find('li').each((i, dom) => {
      const props = $(dom).children();
      const { width, height, x, x2, y, y2 } = $(dom).data();

      const obj = {
        name: props[0].innerText,
        dimensions: props[1].innerText,
        path: $(props[2]).find('a')[0].pathname,
        height,
        width,
        x,
        x2,
        y,
        y2,
      };
      this.items = [obj, ...this.items];
    });
    console.log(this.items);
  },

  renderOptions() {
    return {
      item: (item, escape) => {
        console.log('THIS IS AN ITEM', item);

        // set image name
        var fieldName = document.querySelector("input[name=name]");
        if (fieldName) {
          fieldName.value = item.name;
        }

        return `<div class="crop-list__item" data-name="${item.name}" data-width="${item.width}" data-height="${item.height}" data-x="${item.x}" data-y="${item.y}" data-x2="${item.x2}" data-y2="${item.y2}">
          ${item.name ? `<span class="crop-list__name">${escape(item.name)}</span>` : ''}
          ${item.dimensions ? `<span class="crop-list__dimensions">${escape(item.dimensions)}</span>` : ''}
        </div>`;
      },
      option: (item, escape) => {
        const label = item.name || item.dimensions;
        const caption = item.name ? item.dimensions : null;
        return `<div><span class="crop-list__name">${escape(label)}</span>${caption
          ? `<span class="crop-list__dimensions">${escape(caption)}</span>`
          : ''}</div>`;
      },
    };
  },

  load(query, cb) {
    cb(this.items);
  },

  edit(value, $item) {
    // window.location.href = value;
    $('.image-cropper').detach();
    $('.crop-info').append(
      `<div class="image-cropper">
      <img class="image-cropper__original" src="${this.url}" />
      <div class="image-cropper__preview" data-scaleH=${$item.data()
        .height} data-scaleW=${$item.data().width}/></div>`,
    );
    const dom = $('.image-cropper');
    const imageCropper = new ImageCropper({
      el: dom,
    }).render();

    // show apply crop button
    if (this.btnApplyCrop.classList.contains('apply-crop--hidden')) {
      this.btnApplyCrop.classList.remove('apply-crop--hidden');
    }
  },

  onChange() {
    console.log('this');
  },
});

export default CropList;
