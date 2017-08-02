const nodeOptions = {
  nodeName: 'A',
  toggle: true,
  className: 'editor-link',
  classRegExp: new RegExp('editor-link', 'g'),
};

function getOptions(value) {
  const options = typeof value === 'object' ? value : { href: value };
  return wysihtml.lang.object({}).merge(nodeOptions).merge({ attribute: options }).get();
}

export default {
  exec(composer, command, value) {
    const opts = getOptions(value);

    if (composer.selection.isCollapsed() && !this.state(composer, command)) {
      const textNode = composer.doc.createTextNode(opts.attribute.href);
      composer.selection.insertNode(textNode);
      composer.selection.selectNode(textNode);
    }
    wysihtml.commands.formatInline.exec(composer, command, opts);
  },

  state(composer, command) {
    return wysihtml.commands.formatInline.state(composer, command, nodeOptions);
  },
};
