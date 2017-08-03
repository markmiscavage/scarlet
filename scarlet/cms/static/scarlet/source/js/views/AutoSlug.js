import { View } from 'backbone';
import { dasherize } from 'helpers/utils';

const AutoSlug = View.extend({
  render() {
    this.slugNode = this.$el.find('input');
    this.sourceNode = this.$el
      .parents('fieldset')
      .find(`[name=${this.$el.data('input-data-source-fields')}]`);
    this.bindListeners();
  },

  bindListeners() {
    this.slugNode.on('keyup', this.setSlugFromSelf.bind(this));
    this.sourceNode.on('keyup', this.setSlugFromSource.bind(this));
  },

  setSlugFromSelf(e) {
    // disable value matching from sourceNode if values diverge
    if (!this.shouldEnableMatching()) {
      this.sourceNode.off('keyup');
    }
  },

  setSlugFromSource() {
    this.slugNode.val(this.getSourceValue());
  },

  shouldEnableMatching() {
    return this.getSelfValue() === this.getSourceValue();
  },

  getSourceValue() {
    return dasherize(this.sourceNode.val());
  },

  getSelfValue() {
    return dasherize(this.slugNode.val());
  },
});

export default AutoSlug;
