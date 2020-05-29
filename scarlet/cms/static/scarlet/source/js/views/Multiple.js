import { View } from 'backbone';
import selectize from 'selectize';
import WindowPopup from 'helpers/WindowPopup';
import { clickOpenPopup } from 'helpers/WindowPopup';

const Multiple = View.extend({
  initialize() {
    // button should have a data-add attribute
    this.$el.data('add', 'http://localhost:8000/admin/blog/tags/add/');    
    this.createAddButton();
  },

  createAddButton() {
    const url = this.$el.data('add');
    let name = this.$el.parent().find('select').attr('name');
    name = name.charAt(name.length-1) == 's' ? name.slice(0, -1) : name;
    const add = $('<a>')
      .attr('href', url)
      .addClass('button button--primary')
      .html(`<i class="fa fa-plus-circle" aria-hidden="true"></i>Add ${name}`);

    this.$el.after(add).parent().addClass('formset__field--has-add-button');
    this.$el.parent().find('.button').on('click', this.handlePopup.bind(this));
  },

  /**
   * Window open trigger
   * @param  {object} event object
   */
  handlePopup(e) {
    clickOpenPopup(e, this.setSelected.bind(this));
  },

  setSelected(options) {
    if (options.thumbnail) {
      this.selectize.addOption(options);
      this.selectize.setValue(options.id);
      this.addOpen = false;
    }
  },

});

export default Multiple
