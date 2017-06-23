define(
	[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		"use strict";

		return DOMClass.extend({

			init : function (dom) {
				this.ids = [];
				this.dom = dom;
				this.$actions = dom.find('.batch-action');
				this.$batchCheck = dom.find('.batch-check');
				this.$selectAll = dom.find('.select-all');

				var self = this;

				this.$selectAll.on('click', this.selectAll);

				this.$batchCheck
					.on('click', function () {
						self.selectRow($(this).val());
					})
					.filter(':checked').each(function () {
						self.selectRow($(this).val());
					});

				this.$actions
					.on('click', function (e) {
						if ($(this).hasClass('disabled')) {
							return false;
						}
					});

				this.linkCell();
			},

			linkCell: function () {
				this.dom.find('.link-cell').on('click', function () {
					window.location.href = $(this).data('edit-url');
				});
			},

			selectAll : function (e) {
				var self = this;

				this.$batchCheck.each(function () {
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
				this.$selectAll.prop('checked', false);
			}
		});
	});