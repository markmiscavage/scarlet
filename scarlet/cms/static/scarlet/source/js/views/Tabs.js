import { View } from 'backbone';

const Tabs = View.extend({
  initialize() {
    this.data = this.$el.data();
    this.bindTabEvents();
    this.autoSelectFirstTab();
  },

  bindTabEvents() {
    this.$container = $(this.data.tabsContainer);
    this.$tabs = this.$el.find('[data-tabs-content]');

    if (!this.$container.length) {
      return;
    }

    this.$tabs.on('click', this.onTabClick.bind(this));
  },

  unbindTabEvents() {
    if (this.$tabs && this.$tabs.length) {
      this.$tabs.off();
    }
  },

  onTabClick(e) {
    e.preventDefault();

    const $tab = $(e.currentTarget);

    this.highlightTab($tab);
    this.selectTab($tab.data('tabsContent'));
  },

  highlightTab($tab) {
    this.$tabs.removeClass('active');
    $tab.addClass('active');
  },

  selectTab(selector) {
    const $content = this.$container.find(selector);

    if (!$content.length) {
      return;
    }

    this.hideTabContent();
    $content.show();
  },

  hideTabContent() {
    this.$container.children().hide();
  },

  autoSelectFirstTab() {
    const $firstTab = this.$tabs.eq(0);
    this.highlightTab($firstTab);
    this.selectTab($firstTab.data('tabsContent'));
  },

  destroy() {
    this.unbindTabEvents();
    this.sup();
  },
});

export default Tabs;
