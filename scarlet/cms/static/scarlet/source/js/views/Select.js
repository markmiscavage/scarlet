import { View } from 'backbone'
import selectize from 'selectize'

const Select = View.extend({
	render: function() {
		this.selectize = this.$el.selectize({
			selectOnTab: true,
			onChange: function() {
				const $parentForm = this.$input.parents('form')

				// NOTE: hacky workaround to submit filter value on dashboard...
				// ...could not modify form field (select) to reflect this config
				if ($parentForm && $parentForm.hasClass('js-submit-on-change')) {
					this.$input.parents('form').submit()
				}
			},
		})
	},
})

export default Select
