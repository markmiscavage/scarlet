import { View } from 'backbone';

const Dashboard = View.extend({
  // el: '.nav-dashboard',

  initialize() {
    this.iconMap = {
      posts: 'list',
      pages: 'file',
      galleries: 'picture-o',
      comments: 'comments',
    };
  },

  render() {
    this.mapIcons();
  },

  mapIcons() {
    const self = this;
    this.$el.find('.nav-dashboard__item').find('.nav-dashboard__item-title').each(function(i) {
      const text = $(this).text().replace(/\s/g, '').toLowerCase();
      console.log(self.iconMap);
      $(this).children().first().removeClass(`fa-${text}`).addClass(`fa-${self.iconMap[text]}`);
    });
  },
});

export default Dashboard;
