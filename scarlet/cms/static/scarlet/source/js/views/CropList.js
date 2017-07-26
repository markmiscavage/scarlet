import { View } from 'backbone';
import selectize from 'selectize';

const CropList = View.extend({
  initialize() {
    this.options = [];
    this.getListItems();
  },

  render() {
    const options = {
      maxItems: 1,
      valueField: ' dimensions',
      labelField: 'name',
      searchField: ['name', 'dimensions'],
      options: this.getListItems,
      render: this.renderOptions,
    };
    this.$el.append($('<select />').selectize(options));
  },

  getListItems() {
    $('asset__crop-list').find('li').each((i, dom) => {
      const props = $(dom).children();
      const obj = {
        name: props[0].innerText,
        dimensions: props[1].innerText,
        uri: props[2].innerText,
      };
      this.options = [obj, ...self.options];
    });
  },

  renderOptions() {
    this.getListItems();
    return {
      item(item, escape) {
        return `<div>${item.name
          ? `<span class="crop-list__name">${escape(item.name)}</span>`
          : ''}${item.dimensions
          ? `<span class="crop-list__dimensions">${escape(item.dimensions)}</span>`
          : ''}</div>`;
      },
      options(item, escape) {
        const label = item.name || item.dimensions;
        const caption = item.name ? item.dimensions : null;
        return `<div><span class="label">${escape(label)}</span>${caption
          ? `<span class="caption">${escape(caption)}</span>`
          : ''}</div>`;
      },
    };
  },
});

export default CropList;
