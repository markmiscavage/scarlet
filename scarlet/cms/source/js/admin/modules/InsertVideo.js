define(
	[
		"./Insert",
		"$",
	],
	function (Insert, $) {

		"use strict";

		return Insert.extend({

			vars : {
				size : {
					width : 560,
					height : 315
				},
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
			},

			// Generates or updates the iframe with the latest input value.
			onInput : function (e) {

				var $target = $(e.currentTarget),
					attribute = $target.data("attribute"),
					value = $(e.currentTarget).val(),
					$preview = this.$dom.find(".video-preview"),
					$video = $preview.find("iframe");

				if (attribute === "src") {
					value = this.validateVideo(value);
				}

				if (!$video.length) {

					$video = $("<iframe />");
					$video.attr({
						"frameborder" : "0",
						"allowfullscreen" : ""
					});

					$preview.append($video);

					this.vars.$node = $video;

					this.setAttribute("width", this.vars.size.width);
					this.setAttribute("height", this.vars.size.height);

				} else {
					this.vars.$node = $video;
				}

				if (attribute === "width" || attribute === "height") {

					value = value.replace("px", "");

					if (this.vars.constrain) {
						this.constrainProportion(attribute, value);
					}

					this.vars.size[attribute] = value;

				}

				this.vars.$node = $video.attr(attribute, value);

			},

			// Validates the video URL to a matching provider.
			// Useful for video URLs that are not necessarily "embeddable" URLs.
			validateVideo : function (url) {

				var i = 0,
					match,
					providers = this.vars.providers,
					provider;

				for (; i < providers.length; i++) {

					provider = providers[i];
					match = url.match(provider.regex);

					if (match) {
						return provider.embed + match[1];
					}

				}

				return url;

			},

		});

	});
