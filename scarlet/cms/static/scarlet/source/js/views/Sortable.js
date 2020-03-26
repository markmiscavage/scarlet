import { View } from 'backbone';

const Sortable = View.extend({
  events: {
    'mousedown td:last-child': 'getRowWidth',
    'mouseup td:last-child': 'setRowWidth',
  },

  render() {
    const draggable = this.$el.find('tr[draggable]').parents('tbody');
    draggable.sortable({
      stop(e, ui) {
        const inputs = $(ui.item.context.offsetParent).find(':text');

        for (let i = 0, len = inputs.length; i < len; i++) {
          inputs[i].value = i + 1;
        }
      },
      containment: 'parent',
      grid: [0, 10],
      iframeFix: true,
      cursorAt: { left: -50 },
      scroll: true,
      snap: true,
      snapMode: 'outer',
      snapTolerance: 50,
    });
  },

  getRowWidth() {
    const $last = this.$el.find('td:last-child');
    $last.css('width', $last.outerWidth());
  },

  setRowWidth() {
    this.$el.find('td:last-child').css('width', 'auto');
  },
});

export default Sortable;
