import { View } from 'backbone';
import _ from 'underscore';
import selectize from 'selectize';
import ImageCropper from 'views/ImageCropper';
import pubsub from 'helpers/pubsub';

const CropList = View.extend({
  initialize() {
    this.items = [];
    this.url = $('.widget-asset-simple').find('a')[0].href;
    this.$selected = null;
    this.edits = {};
    this.current = {};
  },

  events: {
    'click .row': 'edit',
    'click .button--primary': 'submit',
  },

  render() {
    return this;
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
    const name = $target.attr('data-name');
    const { x, y, x2, y2, width, height } = this.edits.hasOwnProperty(name)
      ? this.edits[name]
      : $target.data();
    pubsub.on(
      'update-crop',
      _.debounce(data => {
        if ($target.attr('data-name') === this.$selected.attr('data-name')) {
          this.edits[name] = data;
        }
      }, 500),
    );

    $('.image-cropper').detach();

    $('.crop-info__cropper').append(
      `<div class="image-cropper">
      <img class="image-cropper__original" src="${this.url}" />
      <div class="image-cropper__preview" data-scaleH=${height} data-scaleW=${width}/></div>`,
    );

    $('.crop-info__cropper')
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

  submit(e) {
    e.preventDefault();
    console.log(e);
    console.log(Object.keys(this.edits));
    Object.keys(this.edits).forEach(crop => {
      const obj = this.edits[crop];
      const { x, y, x2, y2 } = obj;
      const formData = {
        x,
        y,
        x2,
        y2,
      };
      console.log(formData);
      // $.post(`/admin/assets/192/crops/${crop}/edit/`, {
      //   data: formData,
      //   dataType: 'json',
      //   encode: true,
      // }).done(data => {
      //   console.log('SUCCESS');
      //   console.log(data);
      // });
    });
  },

  onChange() {
    console.log('this');
  },
});

export default CropList;
