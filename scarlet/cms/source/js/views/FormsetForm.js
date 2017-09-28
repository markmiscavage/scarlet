import { View } from 'backbone';
import { sortable } from 'jquery-ui/ui/widgets/sortable';
import selectize from 'selectize';
import { clickOpenPopup } from 'helpers/WindowPopup';
import pubsub from 'helpers/pubsub';
import Editor from './editor/Editor';

const FormsetForm = View.extend({
  events: {
    
  },

  initialize() {
    this.prefix = '';
    this.didInitialize = true;
  },

  render() {
    // this.enableSort();
    this.bindControls();
    const $editor = $(this)
      .find('.wysihtml-sandbox')
      .contents()
      .find('body');
  },


});

export default FormsetForm;
