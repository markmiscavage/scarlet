define(
	[
		"wysihtml5",
		"./insertMedia",
		"./insertAnnotation",
		"./insertLink"
	],
	function (wysihtml5, insertMedia, insertAnnotation, insertLink) {

		// Extend list of wysiwyg commands here.
		wysihtml5.commands.insertMedia = insertMedia;
		wysihtml5.commands.insertAnnotation = insertAnnotation;
		wysihtml5.commands.insertLink = insertLink;
	});
