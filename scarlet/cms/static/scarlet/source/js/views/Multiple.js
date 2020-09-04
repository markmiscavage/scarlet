import { View } from 'backbone';

const Multiple = View.extend({
  initialize() {
    this.onChange();
    var observer = new MutationObserver(this.onChange.bind(this));
    observer.observe(this.$el[0], {subtree: true, childList: true});
  },

  onChange(){
    if (this.$el.find('.has-items').length == 0) {
      this.$el.find('input').attr('placeholder', 'Select one');
      setTimeout(() => {
        this.$el.find('input').css({
          position: 'relative',
          left: '0',
          width: 'auto',
          opacity: 1,
        });
      }, 25);
    } else {
      this.$el.find('input').attr('placeholder', '');
    }
  }
});

export default Multiple
