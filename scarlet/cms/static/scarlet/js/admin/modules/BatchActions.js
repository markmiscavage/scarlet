define(
	[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		"use strict";

		return DOMClass.extend({

			init : function (dom) {
				this.ids = [],
				this.dom = dom,
				this.$actions = $('.actions-toolbar').find('.batch-action');

				var self = this;

				dom.find('.select-all').on('click', this.selectAll);

				dom.find('.batch-check')
					.on('click', function () {
						self.selectRow($(this).val());
					})
					.filter(':checked').each(function () {
						self.selectRow($(this).val());
					});

				dom.find('.batch-action')
					.on('click', function (e) {
						if ($(this).hasClass('disabled')) {
							return false;
						}
					});
			},

			selectAll : function (e) {
				var self = this;

				this.dom.find('.batch-check').each(function () {
					var $this = $(this);
					$this.prop('checked', $(e.currentTarget)[0].checked);
					self.selectRow($this.val());
				});
			},

			selectRow : function (id) {
				var idIndex = $.inArray(id, this.ids);

				if (idIndex > -1) {
					this.ids.splice(idIndex, 1);
				} else {
					this.ids.push(id);
				}

				this.updateActionUrl(idIndex);

				if (this.ids.length) {
					this.enableActions();
				} else {
					this.disableActions();
				}
			},

			updateActionUrl : function (index) {
				var self = this;

				this.$actions.each(function () {
					var $this = $(this),
						href = $this.attr('href').replace(/(_selected=)[^\&]+/, '$1');
					$this.attr('href',  href + self.ids.join(','));
				});
			},

			enableActions : function () {
				this.$actions.removeClass('disabled');
			},

			disableActions : function () {
				this.$actions.addClass('disabled');
			}
		});
	});