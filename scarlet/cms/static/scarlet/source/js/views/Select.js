import Backbone, { View } from 'backbone'
import select2 from 'select2'
import selectize  from 'selectize'
import '../../stylesheets/views/select.scss'

const Select = View.extend({
  el: $('select'),

  render: function() {
    this.$el.selectize({
    	selectOnTab: true
    })
  }
})

export default Select
