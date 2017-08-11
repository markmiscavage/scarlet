import { View } from 'backbone';
import pubsub from '../helpers/pubsub';
import Hotspot from './hotspot/hotspot';

const App = View.extend({
  initialize() {
    pubsub.on('scarlet:render', this.render);

    $('.hotspots').each((i, dom) => {
      const hotspot = new Hotspot({
        el: dom,
      }).render();
    });
  },

  render() {},
});

export default App;
