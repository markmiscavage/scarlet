import { View } from 'backbone';
import _ from 'underscore';
import selectize from 'selectize';
import ImageCropper from 'views/ImageCropper';
import pubsub from 'helpers/pubsub';

const CropList = View.extend({
  initialize() {
    this.items = [];
    // this.$input = $('<select />');
    this.$el.append(this.$input);
    this.getListItems();
    // $('.asset__crop-list').hide();
    this.url = $('.widget-asset-simple').find('a')[0].href;
    this.$selected = null;
    this.edits = {};
    this.current = {};

    // pubsub.on('test', _.throttle(msg => console.log(msg), 2000));
  },

  events: {
    'click .row': 'edit',
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
  },

  renderOptions() {
    return {
      item: (item, escape) => {
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

  toggleActive(target) {
    $('.row').each((index, value) => {
      if ($(value).hasClass('row--active')) {
        $(value).removeClass('row--active');
      }
    });
    target.addClass('row--active');
  },

  edit(e) {
    // window.location.href = value;
    const $target = $(e.target).closest('.row');
    this.$selected = $target;
    this.toggleActive($target);
    const { x, y, x2, y2, width, height, name } = $target.data();
    pubsub.on(
      'test',
      _.debounce(data => {
        this.edits[name] = data;
        console.log(this.edits);
      }, 250),
    );
    $('.image-cropper').detach();
    $('.crop-info__cropper').append(
      `<div class="image-cropper">
      <img class="image-cropper__original" src="${this.url}" />
      <div class="image-cropper__preview" data-scaleH=${height} data-scaleW=${width}/></div>`,
    );
    $('.crop-info__cropper')
      .append('<div />')
      .addClass('crop-list__item')
      .attr('data-x', x)
      .attr('data-y', y)
      .attr('data-x2', x2)
      .attr('data-y2', y2)
      .attr('data-width', width)
      .attr('data-height', height);
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
