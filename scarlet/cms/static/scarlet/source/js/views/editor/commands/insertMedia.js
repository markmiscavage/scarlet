import Modal from '../../../helpers/Modal';
import WindowPopup from '../../../helpers/WindowPopup';

export default {
  // Launches a centered popup.
  launchWindow(url, width, height, top, left, cb) {
    left = left || screen.width ? (screen.width - width) / 2 : 0;
    top = top || screen.height ? (screen.height - height) / 2 : 0;
    const pop = new WindowPopup(
      url,
      'insertMedia',
      [
        `width=${width}`,
        `height=${height}`,
        `top=${top}`,
        `left=${left}`,
        'scrollbars=yes',
        'location=no',
        'directories=no',
        'status=no',
        'menubar=no',
        'toolbar=no',
        'resizable=no',
      ].join(','),
      cb,
    );
    pop.request();

    // TODO(JM) use case for Modal
    // let modal = this.modal = new Modal(url, 'modal-insert-media', false, cb)
    // modal.open()
  },

  // Base execute (executes when "insert media" is clicked)
  exec(composer, command, value) {
    // `value` should be valid JSON
    try {
      value = JSON.parse(value);
    } catch (e) {
      throw 'You must pass valid JSON to the insertMedia `command-value` data attribute.';
    }

    // Launches a popup, given a URL.
    this.launchWindow(value.mediaUrl, 1025, 600, null, null, data => {
      // Inserts the node from Insert : onSubmit() in Editor
      composer.selection.insertNode($(data)[0]);

      // TODO: concept to retrieve node from form submit event
      // Inserts the node found at nodeId in Editor

      // const nodeId = $(data).data('node-id')
      // if (nodeId) {
      //   composer.selection.insertNode($(data).find('[data-id=' + nodeId + ']')[0]);
      // }
    });
  },
};
