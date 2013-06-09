define(
	[
		"rosy/base/Class",
		"admin/modules/WindowPopup",
		"wysihtml5"
	],
	function (Class, WindowPopup, wysihtml5) {

		var NODE_NAME = "IFRAME";

		return {

			launchWindow : function (url, width, height, top, left) {
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
				].join(','));

			},

			exec : function (composer, command, value) {

				try {
					value = JSON.parse(value);
				} catch (e) {
					throw "You must pass a valid JSON Object to the insertMedia command-value data attribute.";
				}

				this.launchWindow(value.mediaUrl, 1025, 600);

			}

		};
	});
