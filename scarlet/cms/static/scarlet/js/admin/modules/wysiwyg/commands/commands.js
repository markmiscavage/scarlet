define(
	[
		"wysihtml5",
		"./insertMedia",
		"./insertAnnotation"
	],
	function (wysihtml5, insertMedia, insertAnnotation) {

		// Extend list of wysiwyg commands here.
		wysihtml5.commands.insertMedia = insertMedia;
		wysihtml5.commands.insertAnnotation = insertAnnotation;
	});
