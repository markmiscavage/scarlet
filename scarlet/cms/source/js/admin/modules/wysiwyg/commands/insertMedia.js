// Insert Media WYSIHTML5 Command Module
define(
	[
		"$",
		"admin/modules/WindowPopup",
		"wysihtml5"
	],
	function ($, WindowPopup, wysihtml5) {

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

			// Base execute (executes when "insert media" is clicked)
			exec : function (composer, command, value) {

				// `value` should be valid JSON
				try {
					value = JSON.parse(value);
				} catch (e) {
					throw "You must pass valid JSON to the insertMedia `command-value` data attribute.";
				}

				// Launches a popup, given a URL.
				this.launchWindow(value.mediaUrl, 1025, 600, null, null, function (data) {

					// Inserts the response form the popup as a DOM node
					composer.selection.insertNode($(data)[0]);
				});

			}

		};
	});
