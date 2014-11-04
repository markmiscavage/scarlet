// Insert Media WYSIHTML5 Command Module
define(
	[
		"$",
		"admin/modules/WindowPopup"
	],
	function ($, WindowPopup) {

		return {

			// Launches a centered popup.
			launchWindow : function (url, width, height, top, left, cb) {

				left = left || (screen.width) ? (screen.width - width) / 2 : 0;
				top = top || (screen.height) ? (screen.height - height) / 2 : 0;

				WindowPopup.request(url, [
					'width=' + width,
					'height=' + height,
					'top=' + top,
					'left=' + left,
					'scrollbars=yes',
					'location=no',
					'directories=no',
					'status=no',
					'menubar=no',
					'toolbar=no',
					'resizable=no'
				].join(','), cb);

			},

			// Base execute (executes when "insert annotation" is clicked)
			exec : function (composer, command, value) {

				var pre = this.state(composer);

				if (pre) {
					composer.selection.executeAndRestore(function() {
						var code = pre.querySelector("code");
						wysihtml5.dom.replaceWithChildNodes(pre);
						if (code) {
							wysihtml5.dom.replaceWithChildNodes(pre);
						}
					});

				} else {

					// Launches a popup, given a URL.
					this.launchWindow(value.mediaUrl, 1025, 600, null, null, function (data) {

						// Inserts the response from the popup as a DOM node
						var range = composer.selection.getRange(),
							selectedNodes = range.extractContents(),
							annotationHtml = $(data)[0].value,
							pre = composer.doc.createElement("pre"),
							code = composer.doc.createElement("code");

						pre.setAttribute("class", "annotated");
						code.setAttribute("class", "annotation");

						pre.appendChild(selectedNodes);
						pre.appendChild(code);

						code.innerText = annotationHtml;

						range.insertNode(pre);
						composer.selection.selectNode(pre);

					}.bind(this));
				}
			},

			state: function (composer, command, value) {
				var selectedNode = composer.selection.getSelectedNode();

				return wysihtml5.dom.getParentElement(selectedNode, { nodeName: "code" });
			}

		};
	});
