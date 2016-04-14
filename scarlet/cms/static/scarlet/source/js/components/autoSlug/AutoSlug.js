import Backbone, { View } from 'backbone'
import $ from 'jquery'
import { dasherize } from './autoSlugUtils'

const AutoSlug = View.extend({
  el: $('.auto-slug'),

  render: function() {
    this.slugNode = this.$('input')
    this.sourceNode = this.$el.parents('fieldset').find('[name=' + this.$el.data('input-data-source-fields') + ']')
    this.bindListeners()
  },

  bindListeners: function() {
    this.slugNode.on('keyup', this.setSlugFromSelf.bind(this))
    this.sourceNode.on('keyup', this.setSlugFromSource.bind(this))
  },

  setSlugFromSelf: function(e) {
    // disable value matching from sourceNode if values diverge
    if (!this.shouldEnableMatching()) {
      this.sourceNode.off('keyup', this.setSlugFromSource)
    }
  },

  setSlugFromSource: function() {
    this.slugNode.val(this.getSourceValue())
  },

  shouldEnableMatching: function() {
    return this.getSelfValue() === this.getSourceValue()
  },

  getSourceValue: function() {
    return dasherize(this.sourceNode.val())
  },

  getSelfValue: function() {
    return dasherize(this.slugNode.val())
  }
})

export default AutoSlug
