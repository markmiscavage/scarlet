import { View } from 'backbone';
import SortableJS from 'sortablejs';

const Sortable = View.extend({

  initialize(){
    this.currentPage = this.$el.attr('data-current-page');
    this.perPage = this.$el.attr('data-per-page');
  },

  render() {
    SortableJS.create(this.el,{
      animation: 150,
      onEnd: () => {
        this.setIndex()
      }
    });
  },

  setIndex(){
    $.each(this.$el.find('tr .orderfield'), (index,item) => {
      $(item).val((this.currentPage - 1) * this.perPage + index);
    });
  }
});

export default Sortable;
