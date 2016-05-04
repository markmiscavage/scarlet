import { View } from 'backbone'
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
