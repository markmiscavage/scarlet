import { View } from 'backbone';

const Filters = View.extend({
  events: {
    'click summary': 'closeSiblings',
  },

  render() {
    this.$dropDowns = this.$('summary');
  },

  closeSiblings(e) {
    this.$dropDowns.not($(e.currentTarget)).each(function(i) {
      const details = $(this).parent();
      if (details.attr('open') !== undefined) {
        details.removeAttr('open');
      } else if (details.hasClass('open')) {
        details.removeClass('open').addClass('closed').attr('data-open', 'closed');
      }
    });
  },
});

export default Filters;
