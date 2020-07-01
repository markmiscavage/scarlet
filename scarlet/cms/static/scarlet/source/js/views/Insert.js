
import { respond } from 'helpers/WindowPopup';
import { View } from 'backbone';

const Insert = View.extend({
  initialize() {
    this.vars = {
      nodeId: 'insert-media',
      $inputs: null,
      $form: null,
      $node: false,
      constrain: true,
      size: {
        width: null,
        height: null,
      },
    };
    this.vars.$inputs = this.$el.find('[data-attribute]');
		// TODO: concept to assign nodeId for Modal communication
    this.vars.$form = this.$el.find('form').attr('data-node-id', this.vars.nodeId);
    this.onSubmit = this.onSubmit.bind(this);
    this.$el.find('.constrain').attr('checked', true);
    this.bindInputs();
  },

  bindInputs() {
    this.vars.$inputs.on('keypress paste', this.onDelayInput.bind(this));
    this.vars.$form.on('submit', this.onSubmit);
    this.vars.$form.find('.cancel').on('click', this.onCancel);
    this.$el.find('.constrain').on('change', this.onConstrainChange.bind(this));
  },

  unbindInputs() {
    this.vars.$inputs.off();
    this.vars.$form.off();
    this.vars.$form.find('.cancel').off();
    this.$el.find('.constrain').off();
  },

	// Helper to delay onInput call on paste
	// http://stackoverflow.com/a/1503425
  onDelayInput(e) {
    setTimeout(() => {
      this.onInput(e);
    });
  },

	// NOTE: this method must be overwritten by the extending class.
  onInput(e) {
    throw 'You must override the `onInput` method.';
  },

	// Helper to constrain proportions
	// given a dimension('width' || 'height') and integer value.
  constrainProportion(dimension, value) {
    value = parseInt(value, 10);

    if (!this.vars.$node || isNaN(value)) {
      return;
    }

    const opposite = dimension === 'width' ? 'height' : 'width';
    const oppositeValue = this.vars.size[opposite];
    const ratio = (value - this.vars.size[dimension]) / this.vars.size[dimension] + 1;

		// Sets the opposing axis based on the ratio difference in value.
    this.vars.size[opposite] = oppositeValue * ratio;

		// Updates the proportion attribute.
    this.setAttribute(opposite, Math.round(this.vars.size[opposite]));
  },

	// Helper to set a given attribute
  setAttribute(attr, val) {
    this.vars.$inputs.filter(`[data-attribute="${attr}"]`).val(val);
    this.vars.$node.attr(attr, val);
  },

	// Sets the constrain value to the state of the check-box
  onConstrainChange(e) {
    this.vars.constrain = !!$(e.currentTarget).is(':checked');
  },

	// Sends data back to the parent window.
  onSubmit(e) {
    e.preventDefault();
    respond(this.vars.$node);

		// TODO: concept to assign nodeId for Modal communication
		// this.vars.$node.attr('data-id', this.vars.nodeId)
  },

  onCancel() {
    window.close();
  },

  destroy() {
    this.unbindInputs();
  },
});

export default Insert;
