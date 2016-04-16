'use strict'

import Backbone, { View } from 'backbone'
import $ from 'jquery'
import selectize  from 'selectize'
import '../../../stylesheets/components/select.scss'

const Select = View.extend({
	el: $('select'),

  render: function() {
  	this.$el.selectize({
			sortField: 'text'
		})
  }

})

export default Select