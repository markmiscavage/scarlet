define(
	[
		"wysihtml5",
		"./insertMedia"
	],
	function (wysihtml5, insertMedia) {

		// Extend list of wysiwyg commands here.
		wysihtml5.commands.insertMedia = insertMedia;

	});
