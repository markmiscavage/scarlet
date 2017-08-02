import { View } from 'backbone';
import { dasherize } from 'helpers/utils';

const AutoSlug = View.extend({
<<<<<<< HEAD
	render: function() {
		this.slugNode = this.$el.find('input')
		this.sourceNode = this.$el
			.parents('fieldset')
			.find('[name=' + this.$el.data('input-data-source-fields') + ']')
		this.bindListeners()
	},

	bindListeners: function() {
		this.slugNode.on('keyup', this.setSlugFromSelf.bind(this))
		this.sourceNode.on('keyup', this.setSlugFromSource.bind(this))
	},

	setSlugFromSelf: function(e) {
		// disable value matching from sourceNode if values diverge
		if (!this.shouldEnableMatching()) {
			this.sourceNode.off('keyup')
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
	},
})
=======
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
>>>>>>> f3f8ecd88458029771bd777226daaf85bf2c93cc

export default AutoSlug;
