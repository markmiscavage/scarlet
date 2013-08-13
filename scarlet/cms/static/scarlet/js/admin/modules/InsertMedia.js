define(
	[
		"rosy/base/DOMClass",
		"$",
		"admin/modules/WindowPopup",
	],
	function (DOMClass, $, WindowPopup) {

		"use strict";

		return DOMClass.extend({

			dom : null,
			width : 560,
			height : 315,
			currentVideo : false,
			// List of embeddable video providers
			providers : [
				{
					name : "youtube",
					regex : /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/,
					embed : "http://www.youtube.com/embed/"
				},
				{
					name : "vimeo",
					regex : /(?:vimeo.com\/(.*))/,
					embed : "http://player.vimeo.com/video/"
				}
			],

			init : function (dom) {
				this.dom = dom;
				this.$videoInput = this.dom.find("input.video-input");
				this.$sizeInputs = this.dom.find("input.video-size");
				this.$form = this.dom.find("form");
				this.bindInputs();

				this.updateCurrentSizeInput();

			},

			bindInputs : function () {
				this.$videoInput.on("change keypress paste", this.onDelayVideoInput);
				this.$sizeInputs.on("change keypress", this.onSizeInput);
				this.$form.on("submit", this.onSubmit);
			},

			unbindInputs : function () {
				this.$videoInput.off();
				this.$sizeInputs.off();
				this.$form.off();
			},

			// Helper to delay onVideoInput response
			// http://stackoverflow.com/a/1503425
			onDelayVideoInput : function (e) {
				this.setTimeout(function () {
					this.onVideoInput(e);
				}, 0);
			},

			onVideoInput : function (e) {
				var value = $(e.currentTarget).val(),
					video = this.parseVideoURL(value);

				if (video) {
					this.previewVideo(video);
				}

			},

			// Parse Video URL
			parseVideoURL : function (url) {

				var i = 0,
					match,
					providers = this.providers,
					provider;

				for (; i < providers.length; i++) {

					provider = providers[i];
					match = url.match(provider.regex);

					if (match) {
						return {
							provider : provider.name,
							id : match[1],
							embed : provider.embed
						};
					}

				}

				return false;

			},

			buildVideoIframe : function (video, width, height) {
				var source = video.embed,
					iframe;

				if (!video) {
					return "";
				}

				source += video.id;

				width = width || this.width;
				height = height || this.height;

				// this.width = width;
				// this.height = height;

				// WARNING: any attributes added to the iframe
				// must be specified within WysiwygRules.js
				// Otherwise wysihtml5 will remove them
				iframe = [
					"<iframe width=\"" + width + "\" height=\"" + height + "\"",
					"src=\"" + source + "\"",
					"frameborder=\"0\" allowfullscreen></iframe>"
				].join("");

				return iframe;
			},

			previewVideo : function (video, width, height) {
				// If no current video exists
				// or the current video is already previewed
				//		and the width and height haven't been specified
				// then don't preview.
				if (!this.currentVideo || (video.id === this.currentVideo.id && !width && !height)) {
					return;
				}

				// Update this as the current video.
				this.currentVideo = video;

				var $preview = this.dom.find(".video-preview"),
					$video = $(this.buildVideoIframe(video, width, height));

				this.dom.find('[name="embed_src"]').val($video.attr('src'));

				$preview.empty().append($video);
			},

			onSizeInput : function (e) {
				var $input = $(e.currentTarget),
					type = $input.attr('name');

				if (!$input.val().length) {
					return;
				}

				this.setTimeout(function () {
					this.setSize($input.val(), type);
				}, 10);

			},

			setSize : function (value, type) {

				var ratio;

				if (!this.currentVideo.id.length) {
					return;
				}

				if (type === "width") {
					this.width = value;
				} else if (type === "height") {
					this.height = value;
				}

				if (this.dom.find('input[name="constrain"]:checked').length) {

					if (type === "width") {
						ratio = ((value - this.height) / value) + 1;
						this.height = Math.round(this.height * ratio);
						this.updateCurrentSizeInput("height");
					} else if (type === "height") {
						ratio = ((value - this.height) / value) + 1;
						this.width = Math.round(this.width * ratio);
						this.updateCurrentSizeInput("width");
					}
				}

				this.dom.find(".video-preview iframe").attr("width", this.width);
				this.dom.find(".video-preview iframe").attr("height", this.height);

			},

			updateCurrentSizeInput : function (type) {
				if (type) {
					this.$sizeInputs.filter('[name="' + type + '"]').val(this[type]);
				} else {
					this.$sizeInputs.filter('[name="width"]').val(this.width);
					this.$sizeInputs.filter('[name="height"]').val(this.height);
				}
			},

			onSubmit : function (e) {
				e.preventDefault();
				WindowPopup.respond(this.buildVideoIframe(this.currentVideo));
			},

			destroy : function () {
				this.unbindInputs();
				this.sup();
			}

		});

	});
