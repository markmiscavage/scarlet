import { View } from 'backbone';

const SelectTags = View.extend({
  initialize() {
    this.$input = $('.widget-tags');
    this.$selectizeInput = this.$input.after('<input />');
  },

  render() {
    console.log(this.$input);
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
