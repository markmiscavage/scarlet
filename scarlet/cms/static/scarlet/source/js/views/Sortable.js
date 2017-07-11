import { View } from 'backbone'

const Sortable = View.extend({
	events: {
		'mousedown td:last-child': 'getRowWidth',
		'mouseup td:last-child': 'setRowWidth',
	},

	render: function() {
		let draggable = this.$el.find('tr[draggable]').parents('tbody')

		draggable.sortable({
			stop: function(e, ui) {
				let inputs = $(ui.item.context.offsetParent).find(':text')

				for (var i = 0, len = inputs.length; i < len; i++) {
					inputs[i].value = i + 1
				}
			},
			containment: 'parent',
		})
	},

	getRowWidth: function() {
		let $last = this.$el.find('td:last-child')
		$last.css('width', $last.outerWidth())
	},

	setRowWidth: function() {
		this.$el.find('td:last-child').css('width', 'auto')
	},
})

export default Sortable
