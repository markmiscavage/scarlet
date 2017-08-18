import { View } from 'backbone';
import selectize from 'selectize';

const SelectTags = View.extend({
  initialize() {
    this.$input = $('.widget-tags');
    this.$selectizeInput = this.$input.after('<input />');
  },

  render() {
    const options = {
      delimiter: ',',
      plugins: ['remove_button'],
      persist: false,
      create(input) {
        return {
          value: input,
          text: input,
        };
      },
    };
    this.$selectizeInput.selectize(options);
  },
});

export default SelectTags;
