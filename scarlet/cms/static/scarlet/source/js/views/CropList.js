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
        return `<div class="crop-list__item" data-width="${item.width}" data-height="${item.height}" data-x="${item.x}" data-y="${item.y}" data-x2="${item.x2}" data-y2="${item.y2}">${item.name
          ? `<span class="crop-list__name">${escape(item.name)}</span>`
          : ''}${item.dimensions
          ? `<span class="crop-list__dimensions">${escape(item.dimensions)}</span>`
          : ''}</div>`;
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
  },

  onChange() {
    console.log('this');
  },
});

export default CropList;
