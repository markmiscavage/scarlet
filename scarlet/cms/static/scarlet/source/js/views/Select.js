import { View } from 'backbone'
import selectize  from 'selectize'

const Select = View.extend({
  render: function () {
    this.selectize = this.$el.selectize({
    	selectOnTab: true
    })
  }
})

export default Select
