import { View } from 'backbone';
import pubsub from 'helpers/pubsub';
import AutoSlug from 'views/AutoSlug';
import BatchActions from 'views/BatchActions';
import CropList from 'views/CropList';
import Dashboard from 'views/Dashboard';
import DatePicker from 'views/DatePicker';
import DateTimePicker from 'views/DateTimePicker';
import Editor from 'views/editor/Editor';
import Filters from 'views/Filters';
import Formset from 'views/Formset';
import ImageCropper from 'views/ImageCropper';
import InsertImage from 'views/InsertImage';
import InsertVideo from 'views/InsertVideo';
import InsertAudio from 'views/InsertAudio';
import Multiple from 'views/Multiple';
import Select from 'views/Select';
import SelectApi from 'views/SelectApi';
import SelectAsset from 'views/SelectAsset';
import SelectTags from 'views/SelectTags';
import Sortable from 'views/Sortable';
import SortLink from 'views/SortLink';
import Tabs from 'views/Tabs';
import { handlePopup } from 'helpers/WindowPopup';

import '../../stylesheets/app.scss';

const App = View.extend({
  initialize() {
    pubsub.on('scarlet:render', this.render);

    // AutoSlug
    $('.auto-slug').each((i, dom) => {
      const autoSlug = new AutoSlug({
        el: dom,
      }).render();
    });

    // BatchActions
    $('.list').each((i, dom) => {
      const batchActions = new BatchActions({
        el: dom,
      }).render();
    });

    // Filters
    $('.filters').each((i, dom) => {
      const filters = new Filters({
        el: dom,
      }).render();
    });

    // Formset
    $('.formset').each((i, dom) => {
      const formset = new Formset({
        el: dom,
      }).render();
    });

    // ImageCropper
    $('.image-cropper').each((i, dom) => {
      const imageCropper = new ImageCropper({
        el: dom,
      }).render();
    });

    // Insert Image
    $('.insert-image').each((i, dom) => {
      const insertImage = new InsertImage({
        el: dom,
      });
    });

    // Insert Video
    $('.insert-video').each((i, dom) => {
      const insertVideo = new InsertVideo({
        el: dom,
      });
    });

    // Insert Audio
    $('.insert-audio').each((i, dom) => {
      const insertAudio = new InsertAudio({
        el: dom,
      });
    });

    // Tabs
    $('.tabs').each((i, dom) => {
      const tabs = new Tabs({
        el: dom,
      });
    });

    // DATEPICKER
    $('input.date').each((i, dom) => {
      const datePicker = new DatePicker({
        el: dom,
      }).render();
    });

    // DATETIMEPICKER
    $('input.datetime').each((i, dom) => {
      const dateTimePicker = new DateTimePicker({
        el: dom,
      }).render();
    });

    // SORTABLE
    $('tbody[draggable]').each((i, dom) => {
      const sortable = new Sortable({
        el: dom,
      }).render();
    });

    $('a.sort').each((i, dom) => {
      const sorting = new SortLink({
        el: dom,
      }).render();
    });

    $('.nav-dashboard__list').each((i, dom) => {
      const dashboard = new Dashboard({
        el: dom,
      }).render();
    });
  },

  render() {
    // Bind Popup triggers
    handlePopup();
    // Editor
    $('.editor:not(.editor--rendered)').each((i, dom) => {
      const editor = new Editor({
        el: dom,
      }).render();
    });

    // Select
    $('select').each((i, dom) => {
      const select = new Select({
        el: dom,
      }).render();
    });

    // SELECTAPI
    $('.api-select').each((i, dom) => {
      const selectApi = new SelectApi({
        el: dom,
      }).render();
    });

    // SELECTASSET
    $('.asset').each((i, dom) => {
      if (!$(dom).find('input').hasClass('selectized')) {
        const selectAsset = new SelectAsset({
          el: dom,
        }).render();
      }
    });

    // tags
    $('.widget-tags').each((i, dom) => {
      const selectTags = new SelectTags({
        el: dom,
      }).render();
    });

    // cropsList
    $('.crop-info').each((i, dom) => {
      const cropList = new CropList({
        el: dom,
      }).render();
    });

    $('.image-cropper').each((i, dom) => {
      const imageCropper = new ImageCropper({
        el: dom,
      }).render();
    });

    $('.selectize-control.multi').each((i, dom) => {
      const multiple = new Multiple({
        el: dom,
      }).render();
    });
  },
});

export default App;
