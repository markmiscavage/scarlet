import { View } from 'backbone'


const RenderDragWidth = View.extend({

	initialize: function () {
		this.$el.on("mousedown", function (i, el) {
			let $last = $(this).find("td:last-child")
			$last.css('width', $last.outerWidth())
		})
		this.$el.on("mouseup", function (i, el) {
			$(this).find("td:last-child").css('width', 'auto')
		})
	}
	
})



export default RenderDragWidth