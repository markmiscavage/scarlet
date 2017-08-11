import { View } from 'backbone';
import hotspot from './lib/jquery.hotspot.js';
import SelectAsset from '../../../../../cms/source/js/views/SelectAsset';
import Editor from '../../../../../cms/source/js/views/editor/Editor';

import '../../../css/jquery.hotspot.css';

const Hotspot = View.extend({
  events: {
    'click .btnDelete': 'delete',
    'click .order-inp': 'select',
    'focusout .order-inp': 'unselect',
  },

  initialize() {
    this.$hotspot = $('#img-hotspot');
    this.moduleId = $('#hotspot-module-id').val();
    console.log($('#hotspot-module-id').val());
  },

  render() {
    $.ajax({
      url: `/hotspots/${this.moduleId}/get-data/`,
      dataType: 'json',
    })
      .done(result => {
        $('#img-hotspot').hotspot({
          data: result.hotspots,
          formFields: result.fields,
          emptyFields: result.emptyFields,
        });
      })
      .fail(err => {
        console.error('Error: ', err);
      });

    setTimeout(() => {
      const overlayStyle = $('.HotspotPlugin_Overlay').attr('style');
      const matched = overlayStyle.match(/height: (\d+)px; width: (\d+)px/);
      $('#overlay-size').attr('value', `${matched[2]}-${matched[1]}`);
    }, 1000);

    document.addEventListener(
      'hotspot-click',
      e => {
        console.log('THiNG WAS CLICKED');
        $('.asset').each((i, dom) => {
          if (!$(dom).find('input').hasClass('selectized')) {
            const selectAsset = new SelectAsset({
              el: dom,
            }).render();
          }
        });

        $('.editor:not(.editor--rendered)').each((i, dom) => {
          const editor = new Editor({
            el: dom,
          }).render();
        });
      },
      false,
    );
  },

  delete(e) {
    $(`#${$(e.target).attr('data')}`).remove();
    $(`#frm-${$(e.target).attr('data')}`).remove();
  },

  select() {
    const thisId = this.id.split('order-input-')[1];
    const spanNewColor = `div#spot-${thisId}`;
    $(spanNewColor).removeClass('unselected-hotspot');
    $(spanNewColor).addClass('selected-hotspot');
  },

  unselect() {
    const thisId = this.id.split('input-')[1];
    const spanNewColor = `div#spot-${thisId}`;
    $(spanNewColor).removeClass('selected-hotspot');
    $(spanNewColor).addClass('unselected-hotspot');
  },
});

export default Hotspot;
