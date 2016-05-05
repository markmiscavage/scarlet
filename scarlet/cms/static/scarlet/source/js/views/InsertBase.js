'use strict'
import { respond } from '../helpers/WindowPopup'
import { View } from 'backbone'

const InsertBase = View.extend({

	initialize: function () {
		this.$dom = this.$el
		this.vars = {
			$inputs : null,
			$form : null,
			$node : false,
			constrain : false,
			size : {
				width : null,
				height : null
			}
		}
		this.vars.$inputs = this.$dom.find("[data-attribute]")
		this.vars.$form = this.$dom.find("form")
		this.onSubmit = this.onSubmit.bind(this)
		this.bindInputs()
	},

	bindInputs : function () {
		this.vars.$inputs.on("keypress paste", this.onDelayInput.bind(this))
		this.vars.$form.on("submit", this.onSubmit)
		this.vars.$form.find(".cancel").on("click", this.onCancel)
		this.$dom.find(".constrain").on("change", this.onConstrainChange)
	},

	unbindInputs : function () {
		this.vars.$inputs.off()
		this.vars.$form.off()
		this.vars.$form.find(".cancel").off()
		this.$dom.find(".constrain").off()
	},

	// Helper to delay onInput call on paste
	// http://stackoverflow.com/a/1503425
	onDelayInput : function (e) {
		setTimeout(() => {
			this.onInput(e)
		})
	},

	// NOTE: this method must be overwritten by the extending class.
	onInput : function (e) {
		throw "You must override the `onInput` method."
	},

	// Helper to constrain proportions
	// given a dimension("width" || "height") and integer value.
	constrainProportion : function (dimension, value) {

		value = parseInt(value, 10)

		if (!this.vars.$node || isNaN(value)) {
			return
		}

		let opposite = (dimension === "width") ? "height" : "width"
		let oppositeValue = this.vars.size[opposite]
		let ratio = ((value - this.vars.size[dimension]) / this.vars.size[dimension]) + 1

		// Sets the opposing axis based on the ratio difference in value.
		this.vars.size[opposite] = Math.round(oppositeValue * ratio)

		// Updates the proportion attribute.
		this.setAttribute(opposite, this.vars.size[opposite])

	},

	// Helper to set a given attribute
	setAttribute : function (attr, val) {
		this.vars.$inputs.filter("[data-attribute=\"" + attr + "\"]").val(val)
		this.vars.$node.attr(attr, val)
	},

	// Sets the constrain value to the state of the check-box
	onConstrainChange : function (e) {
		this.vars.constrain = !!($(e.currentTarget).is(":checked"))
	},

	// Sends data back to the parent window.
	onSubmit : function (e) {
		e.preventDefault()
		respond(this.vars.$node)
	},

	onCancel : function () {
		window.close()
	},

	destroy : function () {
		this.unbindInputs()
	}
})


export default InsertBase