import Backbone, { View } from 'backbone'
import $ from 'jquery'
import select2 from 'select2'
import '../../../stylesheets/components/select.scss'

const Select = View.extend({
	el: $('select'),

  render: function() {
  	this.$el.select2({
			minimumResultsForSearch : 20
		})
  }

})

export default Select