var nodeOptions = {
	nodeName: 'A',
	toggle: false,
	className: 'editor-link',
	classRegExp: new RegExp('editor-link', 'g'),
}

function getOptions(value) {
	var options = typeof value === 'object' ? value : { href: value }
	return wysihtml.lang
		.object({})
		.merge(nodeOptions)
		.merge({ attribute: options })
		.get()
}

export default {
	exec: function(composer, command, value) {
		var opts = getOptions(value)

		if (composer.selection.isCollapsed() && !this.state(composer, command)) {
			var textNode = composer.doc.createTextNode(opts.attribute.href)
			composer.selection.insertNode(textNode)
			composer.selection.selectNode(textNode)
		}
		wysihtml.commands.formatInline.exec(composer, command, opts)
	},

	state: function(composer, command) {
		return wysihtml.commands.formatInline.state(composer, command, nodeOptions)
	},
}
