import { View } from 'backbone';

const SortLink = View.extend({
  events: {
    'click': 'handleSort',
  },

  handleSort(e) {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('sf', this.$el.data('id'));
    urlParams.set('ot', this.$el.data('type'));
    
    const href = window.location.origin + window.location.pathname + '?' + urlParams.toString()
    window.location.href = href;
  },
});

export default SortLink;
