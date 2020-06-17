import { View } from 'backbone';
import SortableJS from 'sortablejs';

const Sortable = View.extend({

  render() {
    SortableJS.create(this.el,{
      animation: 150,
    });
  },
});

export default Sortable;
