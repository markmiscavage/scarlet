import { View } from 'backbone';
import selectize from 'selectize';

const CropList = View.extend({
  initialize() {
    this.items = [];
    this.$input = $('<select />');
    this.$el.append(this.$input);
    this.getListItems();
    $('.asset__crop-list').hide();
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
    console.log('options', options);
    this.$input.selectize(options);
  },

  getListItems() {
    $('.asset__crop-list').find('li').each((i, dom) => {
      const props = $(dom).children();
      const obj = {
        name: props[0].innerText,
        dimensions: props[1].innerText,
        path: $(props[2]).find('a')[0].pathname,
      };
      this.items = [obj, ...this.items];
    });
    console.log(this.items);
  },

  renderOptions() {
    return {
      item: (item, escape) => {
        return `<div>${item.name
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
    window.location.href = `${value}?popup=1`;
    console.log('ITEM: ', $item, value);
    const link = $('.widget-asset-simple').find('a')[0].href;
    // $('.crop').remove();
    // this.$el.append(`<img class="crop" src=${link} />`);
  },
});

export default CropList;
