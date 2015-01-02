// Insert Media WYSIHTML5 Command Module
define(
	[
		"$",
		"wysihtml5"
	],
	function ($, wysihtml5) {
		var undef,
			NODE_NAME = "A",
			dom       = wysihtml5.dom;

		function _removeFormat(composer, anchors) {
			var length  = anchors.length,
				i       = 0,
				anchor,
				codeElement,
				textContent;
			for (; i < length; i++) {
				anchor      = anchors[i];
				codeElement = dom.getParentElement(anchor, { nodeName: "code" });
				textContent = dom.getTextContent(anchor);

				// if <a> contains url-like text content, rename it to <code> to prevent re-autolinking
				// else replace <a> with its childNodes
				if (textContent.match(dom.autoLink.URL_REG_EXP) && !codeElement) {
					// <code> element is used to prevent later auto-linking of the content
					codeElement = dom.renameElement(anchor, "code");
				} else {
					dom.replaceWithChildNodes(anchor);
				}
			}
		}

		function _format(composer, attributes) {
			var doc             = composer.doc,
				tempClass       = "_wysihtml5-temp-" + (+new Date()),
				tempClassRegExp = /non-matching-class/g,
				i               = 0,
				length,
				anchors,
				anchor,
				hasElementChild,
				isEmpty,
				elementToSetCaretAfter,
				textContent,
				whiteSpace,
				j;
			wysihtml5.commands.formatInline.exec(composer, undef, NODE_NAME, tempClass, tempClassRegExp);
			anchors = doc.querySelectorAll(NODE_NAME + "." + tempClass);
			length  = anchors.length;
			for (; i < length; i++) {
				anchor = anchors[i];
				anchor.removeAttribute("class");
				for (j in attributes) {
					anchor.setAttribute(j, attributes[j]);
				}
			}

			elementToSetCaretAfter = anchor;
			if (length === 1) {
				textContent = dom.getTextContent(anchor);
				hasElementChild = !!anchor.querySelector("*");
				isEmpty = textContent === "" || textContent === wysihtml5.INVISIBLE_SPACE;
				if (!hasElementChild && isEmpty) {
					dom.setTextContent(anchor, attributes.text || anchor.href);
					whiteSpace = doc.createTextNode(" ");
					composer.selection.setAfter(anchor);
					dom.insert(whiteSpace).after(anchor);
					elementToSetCaretAfter = whiteSpace;
				}
			}
			composer.selection.setAfter(elementToSetCaretAfter);
		}

		return {

			exec: function (composer, command, value) {
				var anchors = this.state(composer, command);

				if (anchors) {
					// Selection contains links
					composer.selection.executeAndRestore(function () {
						_removeFormat(composer, anchors);
					});
				} else {
					// Create links
					value = typeof(value) === "object" ? value : { href: value };
					_format(composer, value);
				}
			},

			state: function (composer, command) {
				var className = "wysiwyg-link";
				return wysihtml5.commands.formatInline.state(composer, command, "A", className, new RegExp(className, "g"));
			}
		};
	}
);
