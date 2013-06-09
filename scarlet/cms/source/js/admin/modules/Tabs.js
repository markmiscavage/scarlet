define(
	[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			tabs : null,

			init : function (dom) {
				this.dom = dom;
				this.data = this.dom.data();
				this.bindTabEvents();
				this.autoSelectFirstTab();
			},

			bindTabEvents : function () {
				this.$container = $(this.data.tabsContainer);
				this.$tabs = this.dom.find('[data-tabs-content]');

				if (!this.$container.length) {
					return;
				}

				this.$tabs.on('click', this.onTabClick);

			},

			unbindTabEvents : function () {
				if (this.$tabs && this.$tabs.length) {
					this.$tabs.off();
				}
			},

			onTabClick : function (e) {
				e.preventDefault();

				var $tab = $(e.currentTarget);

				this.highlightTab($tab);
				this.selectTab($tab.data('tabsContent'));

			},

			highlightTab : function ($tab) {
				this.$tabs.removeClass('active');
				$tab.addClass('active');
			},

			selectTab : function (selector) {
				var $content = this.$container.find(selector);

				if (!$content.length) {
					return;
				}

				this.hideTabContent();
				$content.show();

			},

			hideTabContent : function () {
				this.$container.children().hide();
			},

			autoSelectFirstTab : function () {
				var $firstTab = this.$tabs.eq(0);
				this.highlightTab($firstTab);
				this.selectTab($firstTab.data('tabsContent'));
			},

			destroy : function () {
				this.unbindTabEvents();
				this.sup();
			}

		});

	});
