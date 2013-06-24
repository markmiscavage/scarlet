define(
	[
		"wysihtml5",
		"./insertMedia"
	],
	function (wysihtml5, insertMedia) {

		wysihtml5.commands.insertMedia = insertMedia;

	});
