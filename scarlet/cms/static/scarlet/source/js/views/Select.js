import { View } from 'backbone'

const Select = View.extend({
  render() {
    var self = this;
    this.selectize = this.$el.selectize({
      selectOnTab: true,
      persist: true,
      onItemAdd(value, item) {
        if(self.isMulti){
          self.populate(item);
        }
      },
      onInitialize() {
        self.isMulti = self.$el.next().is('.selectize-control.multi');
        if(self.isMulti){
          $.each(self.$el.next().find('.item'), function(index, item){
            self.populate(item);
          });
        }
      },
      onChange(e) {
        const $parentForm = this.$input.parents('form')
        // NOTE: hacky workaround to submit filter value on dashboard...
        // ...could not modify form field (select) to reflect this config
        if ($parentForm && $parentForm.hasClass('js-submit-on-change')) {
          this.$input.parents('form').submit()
        }
      },
    })[0].selectize;
  },

  populate(item){
    $(item).append('<i class="fa fa-times" aria-hidden="true"></i>');
    $(item).on('click', this.removeItem.bind(this));
  },

  removeItem(e){
    this.selectize.removeItem($(e.currentTarget).attr('data-value'));
    this.selectize.refreshItems();
    this.selectize.refreshOptions();
  }
})

export default Select
