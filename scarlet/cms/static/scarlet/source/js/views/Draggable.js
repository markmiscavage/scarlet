class Draggable {
	constructor(el) {
		this.$el = $(el)
		this.init()
	}

	init () {
		let draggable = this.$el.find("tr[draggable]").parents("tbody")

		draggable.sortable({
			stop: function (e, ui) {
				let inputs = $(ui.item.context.offsetParent).find(":text")

				for (var i = 0; i < inputs.length; i++) {
					inputs[i].value = i + 1
				}
			}
		})
	}
}

export default Draggable
