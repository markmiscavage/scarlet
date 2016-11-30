import { View } from 'backbone'

const Tabs = View.extend({

	initialize: function () {
		this.data = this.$el.data()
		this.bindTabEvents()
		this.autoSelectFirstTab()
	},

  bindTabEvents : function () {
  	this.$container = $(this.data.tabsContainer)
  	this.$tabs = this.$el.find('[data-tabs-content]')

  	if (!this.$container.length) {
  		return
  	}

  	this.$tabs.on('click', this.onTabClick.bind(this))
  },

  unbindTabEvents : function () {
  	if (this.$tabs && this.$tabs.length) {
  		this.$tabs.off()
  	}
  },

  onTabClick : function (e) {
  	e.preventDefault()

  	let $tab = $(e.currentTarget)

  	this.highlightTab($tab)
  	this.selectTab($tab.data('tabsContent'))
  },

  highlightTab : function ($tab) {
  	this.$tabs.removeClass('active')
  	$tab.addClass('active')
  },

  selectTab : function (selector) {
  	let $content = this.$container.find(selector)

  	if (!$content.length) {
  		return
  	}

  	this.hideTabContent()
  	$content.show()
  },

  hideTabContent : function () {
  	this.$container.children().hide()
  },

  autoSelectFirstTab : function () {
  	let $firstTab = this.$tabs.eq(0)
  	this.highlightTab($firstTab)
  	this.selectTab($firstTab.data('tabsContent'))
  },

  destroy : function () {
  	this.unbindTabEvents()
  	this.sup()
  }
})

export default Tabs
