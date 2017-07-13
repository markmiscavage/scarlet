import { View } from 'backbone'
import { sortable } from 'jquery-ui/ui/widgets/sortable'
import selectize from 'selectize'
import { clickOpenPopup } from 'helpers/WindowPopup'
import pubsub from 'helpers/pubsub'
import Editor from './editor/Editor'

const Formset = View.extend({
	events: {
		'click .formset__button--delete': 'delete',
		// 'click .button' : function(e){clickOpenPopup(e, (data) => console.log('thing', data));},
		// 'clidk .crop-link' : function(e){clickOpenPopup(e, (data) => console.log('thing', data))}
	},

	initialize: function() {
		this.prefix = ''
		this.formsetTypes = []
		this.isDraggable = false
		this.didInitialize = true
	},

	render: function() {
		this.$forms = this.$('.formset__forms')
		this.$controls = this.$el.next('.formset__controls')
		this.prefix = this.$el.data('prefix')

		this.setFormsetTypes()
		this.enableSort()
		this.bindControls()
	},

	bindControls: function() {
		this.setupSelect()
		this.$controls.on('click', '.formset__button--add', () =>
			this.add(this.formsetTypes[0].value)
		)
	},

	setupSelect: function() {
		this.selectize = $('.formset__select').selectize({
			selectOnTab: true,
			maxItems: 1,
			placeholder: 'Add a Module',
			options: this.formsetTypes,
			onChange: function(value) {
				this.selectize[0].selectize.clear(true)
				this.add(value)
			}.bind(this),
		})
	},

	delete: function(e) {
		var $dom = $(e.currentTarget)
		var $form = $dom.closest('.formset__form')

		$dom.find('input').attr('checked', true)

		$form.addClass('formset__form--is-deleted')
		$form.find('.formset__order input').val(0)

		this.resort()
	},

	add: function(formsetType) {
		var clone = $('<div>')
			.addClass('formset__form added-with-js')
			.attr('data-prefix', formsetType)
		var html = $(
			'.formset__form-template[data-prefix="' + formsetType + '"]'
		).html()

		html = html.replace(/(__prefix__)/g, this.count(formsetType))
		clone.html(html)

		this.$forms.append(clone)

		if (this.isDraggable) {
			clone.addClass('draggable')
		}

		if (this.formsetTypes.indexOf(formsetType) === -1) {
			this.formsetTypes.push({
				value: formsetType,
			})
		}

		this.enableSort()
		pubsub.trigger('scarlet:render')
	},

	count: function(formsetType) {
		return this.$('.formset__form[data-prefix="' + formsetType + '"]').length
	},

	/************************************
  Sorting
  ************************************/

	enableSort: function() {
		if (this.$forms.find('.formset__order').length) {
			this.$forms.sortable({
				update: this.resort.bind(this),
				//change : this._resort,
				stop: this.repairEditor.bind(this),
				containment: $('#container'),
			})
			this.$('.formset__form').addClass('draggable')
			this.isDraggable = true
		}
		this.resort()
	},

	resort: function() {
		var $helper = this.$('.ui-sortable-helper')
		var $placeholder = this.$('.ui-sortable-placeholder')

		$('.formset__form').each(function(index, value) {
			if ($(this).data('prefix') === 'textformformset') {
				$(this).find('.formset__field').each(function() {
					const $editor = $(this)
						.find('.wysihtml-sandbox')
						.contents()
						.find('body')
						.html()
					console.log($editor)
					if ($editor) {
						$(this).children('label').text(`Text: ${$editor.substr(0, 49)}...`)
					}
					$(this).children('.editor').hide()
				})
			}
			$(value).css({ height: '100px' })
		})

		this.$forms.find('.formset__form').each(function(i) {
			var $dom = $(this)

			if ($dom.is('.was-deleted, .ui-sortable-helper')) {
				return
			}

			if (i % 2) {
				$dom.addClass('odd')
			} else {
				$dom.removeClass('odd')
			}

			$dom.find('.formset__order input').val(i)
		})

		if ($placeholder.hasClass('odd')) {
			$helper.addClass('odd')
		} else {
			$helper.removeClass('odd')
		}

		this.updateMetadata()
	},

	repairEditor: function(e, elem) {
		var $editor = $(elem.item[0]).find('.editor')

		if ($editor.length) {
			$('.wysihtml-sandbox', $editor).remove()
			var editor = new Editor({ el: $editor }).render()
		}
	},

	/************************************
  Metadata
  ************************************/

	setFormsetTypes: function() {
		$('.formset__type').each(
			function(i, el) {
				var $el = $(el)
				this.formsetTypes.push({
					text: $el.data('text'),
					value: $el.data('prefix'),
				})
			}.bind(this)
		)
	},

	updateMetadata: function() {
		for (var i = 0; i < this.formsetTypes.length; i++) {
			var formsetType = this.formsetTypes[i].value,
				$formset = $('.formset__form[data-prefix=' + formsetType + ']')

			$formset.each(function(n, el) {
				var $this = $(this)
				$this.find('.formset__order input').val($this.prevAll().length)
			})

			$('#id_' + formsetType + '-TOTAL_FORMS').val($formset.length)
		}
	},
})

export default Formset
