import { View } from 'backbone';
import _ from 'underscore';
import Cookies from 'js-cookie';
import selectize from 'selectize';
import ImageCropper from 'views/ImageCropper';
import pubsub from 'helpers/pubsub';

const CropList = View.extend({
  initialize() {
    this.items = [];
    // TODO: FIX THIS
    const $urlSelector = $('.widget-asset-simple');
    this.url = $urlSelector
      ? $urlSelector.find('a')[0].href
      : $('.crop-info').attr('data-asset-url');
    this.id = $('.crop-info').attr('data-asset-id');
    this.$selected = null;
    this.edits = {};
    this.current = {};
    this.csrf = Cookies.get('csrftoken');
    this.submittedCrops = 0
    this.submittedCropsComplete = 0
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
          console.log('new crop', data, this.$selected)
          this.edits[name] = data;
        }
      }, 500),
    );

    $('.image-cropper').detach();

    $('.crop-info__cropper').append(
      `<div class="image-cropper">
      <img class="image-cropper__original" src="${this.url}" />
      <div class="image-cropper__preview" data-scaleH=${height} data-scaleW=${width}/></div>
      <div class="image-cropper__status"></div>`,
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

  checkForResubmit () {
    if (this.submittedCrops === this.submittedCropsComplete) {
      pubsub.trigger('scarlet:hideLoader');
      this.$el.find('.button--primary').trigger('click')
    }
  },

  submit(e) {
    const numberOfCrops = Object.keys(this.edits).length

    // if crops exist, we have to make separate API calls to submit them
    if (numberOfCrops > 0) {

      // submit each crop if they haven't already been submitted
      if (this.submittedCropsComplete !== numberOfCrops) {
        e.preventDefault();

        const _this = this
        Object.keys(this.edits).forEach(crop => {
          const { x, y, x2, y2 } = this.edits[crop];
          // console.log(crop)
          $.get(`/admin/assets/${this.id}/crops/${crop}/edit/`)
            .then(data => {
              return data;
            })
            .then(res => {
              const csrf = $(res)
                .find('input[name="csrfmiddlewaretoken"]')
                .val();
                // console.log('csrf:', csrf)
              const form = new FormData();
              form.append('x', x);
              form.append('y', y);
              form.append('x2', x2);
              form.append('y2', y2);
              form.append('csrfmiddlewaretoken', csrf);
              // console.log('sending form:', x, y, x2, y2)
              _this.submittedCrops++

              $.ajax({
                url: `/admin/assets/${this.id}/crops/${crop}/edit/`,
                type: 'POST',
                processData: false,
                contentType: false,
                // dataType: 'json',
                data: form,
                headers: {
                  'X-CSRFToken': csrf,
                },
                success: data => {
                  _this.submittedCropsComplete++
                  _this.checkForResubmit()

                },
                error: (error, message) => {
                  // console.log('error happened', error, message)
                  this.$el.find('.save-status').empty()
                  this.$el.find('.save-status').append(
                    `<span class='fail'>Could not save crop</span>`
                  )
                }
              });
            });

            pubsub.trigger('scarlet:showLoader');
          
          return

        }); 
      }
    }

    // if the above if statements don't trigger, default submission behavior occurs
  },

  onChange() {
    console.log('this');
  },
});

export default CropList;
