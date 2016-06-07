/**
 *		`new CropImage($el, options, coordinates)`
 *
 *		$el // the <.jcrop> container
 *		options // {} to override default jcrop options
 *			aspectRatio : auto  //   automatically sets aspectRatio to default rectangle
 *		coordinates // {} to override default first time coordinates // note self <inputs> for coords override all else
 */

define(
	[
		"rosy/base/DOMClass",
		"$",
		"$plugin!jcrop",
		"$plugin!naturalWidth",
		"$plugin!throttle-debounce",
		"$plugin!imagesloaded"
	],
	function (DOMClass, $, $jcrop, $naturalWidth, $throttle, $imagesLoaded) {

		"use strict";

		var $win = $(window),
			EVENTS = {
				COMPLETE : "cropimage:complete"
			};

		return DOMClass.extend({

			"static" : EVENTS,

			options : { // initial options, override with `new CropImage(el, options, coordinates)`
				aspectRatio : 0
			},

			$ : null,
			$win : $(window),
			$img : null,
			$preview : null,
			_jcrop : null,
			cropScale : null, // { w : 100, h: 100} // special case for scaling the resulting crop to a specified size in the preview

			init : function ($el, options, extra) {
				this.sup();

				this.$ = $el;
				this.$img = this.$.find(".original");
				this.$preview = this.$.find(".preview");
				this.$thumb = this.$preview.find(".thumb");
				this.options = options;

				this.$img.imagesLoaded(this.onReady);
			},

			onReady : function () {
				this.setConstraints();
				this.setupPreview();
				this.setupJcrop();
			},

			setupJcrop : function () {
				var self = this,
					options = $.extend({}, this.options, {
						onSelect : $.proxy(this.updateCropCoords, this),
						onChange : $.proxy(this.updateCropCoords, this),
						aspectRatio : (this.constrainRatio ? (this.cropScale.w / this.cropScale.h) : 0),
						allowSelect : (this.constrainRatio ? true : false),
						boxWidth : (this.$.width() * 0.75),
						minSize : [20, 20]
					});

				if (this._jcrop) {
					this._jcrop.destroy();
				}

				this.$img.Jcrop(options, function () {
					self._jcrop = this;
					self.onJCropReady();
				});
			},

			onJCropReady : function () {
				this.setInitialCroparea();
			},

			setConstraints : function () {
				var data = this.$preview.data();

				this.constrainHeight = data.scaleH === "None" ? false : true;
				this.constrainWidth = data.scaleW === "None" ? false : true;
				this.constrainRatio = (this.constrainHeight && this.constrainWidth);

				// set aspect ratio for crop;
				// also defines .mask box size
				this.cropScale = {
					w : (this.constrainWidth ? data.scaleW : this.$img.naturalWidth()),
					h : (this.constrainHeight ? data.scaleH : this.$img.naturalHeight())
				};
			},

			setupPreview : function () {
				this.$preview.find(".mask").css({
					width: this.cropScale.w,
					height: this.cropScale.h
				}).addClass("active");

				if (this.constrainRatio) {
					this.$preview.find("strong").text(this.cropScale.w + " x " + this.cropScale.h);
				}
			},

			updatePreview : function () {
				var scale = this.getScale(),
					coords = this.cropCoords,
					width,
					height;

				if (!this.constrainRatio) {

					if (this.constrainHeight) {

						// update preview width
						width = Math.round(scale.scaleY * coords.w);

						this.$preview.find(".mask").css({
							width: width + "px"
						}).end().find("strong").text(width + " x " + this.cropScale.h);

					} else if (this.constrainWidth) {

						// update preview height
						height = Math.round(scale.scaleX * coords.h);

						this.$preview.find(".mask").css({
							height: height + "px"
						}).end().find("strong").text(this.cropScale.w + " x " + height);

					} else {

						// update preview height and width
						height = Math.round(scale.scaleY * coords.h);
						width = Math.round(scale.scaleX * coords.w);

						this.$preview.find(".mask").css({
							width: width + "px",
							height: height + "px"
						}).end().find("strong").text(width + " x " + height);
					}
				}

				// update preview img
				this.$thumb.css({
					width: Math.round(scale.scaleX * this.$img.naturalWidth()) + "px",
					height: Math.round(scale.scaleY * this.$img.naturalHeight()) + "px",
					marginLeft: "-" + Math.round(scale.scaleX * coords.x) + "px",
					marginTop: "-" + Math.round(scale.scaleY * coords.y) + "px"
				});
			},

			getScale : function () {
				var scaleX,
					scaleY;

				if (this.constrainRatio) {

					scaleX = this.cropScale.w / this.cropCoords.w;
					scaleY = this.cropScale.h / this.cropCoords.h;

				} else {

					if (this.constrainHeight) {
						// set equal scaling ratio (to prevent distortion)
						scaleX = scaleY = this.cropScale.h / this.cropCoords.h;
					} else if (this.constrainWidth) {
						scaleX = scaleY = this.cropScale.w / this.cropCoords.w;
					} else {
						scaleX = scaleY = (this.$img.naturalWidth() / this.cropCoords.w) / (this.$img.naturalHeight() / this.cropCoords.h);
					}
				}

				return {
					scaleX: scaleX,
					scaleY: scaleY
				};
			},

			// update cropCoord values onChange or onSelect of jcrop
			updateCropCoords : function (coords) {
				clearTimeout(this.refreshTimeout);

				if (parseInt(coords.w, 10) < 0) {
					return;
				}

				this.cropCoords = {
					x: Math.round(coords.x),
					y: Math.round(coords.y),
					x2: Math.round(coords.x2),
					y2: Math.round(coords.y2),
					w: coords.w,
					h: coords.h
				};

				this.updatePreview();

				// debounce update of coord values (form fields) after interaction
				this.refreshTimeout = setTimeout(this.updateCoordFields, 250);
			},

			// store current crop coordinates as field values
			updateCoordFields : function () {
				this.loopCoordProps(function (prop) {
					var $coord = $("input[data-property='" + prop + "']");

					if ($coord.length) {
						$coord.attr("value", this.cropCoords[prop]); // sync field val
					}
				});
			},

			// iterate over coordinate property keys
			loopCoordProps : function (cb) {
				var props = ["x", "y", "x2", "y2", "w", "h"],
					i = props.length - 1,
					prop;

				for (i; i >= 0; i--) {
					prop = props[i];
					cb.call(this, prop);
				}
			},

			// set initial croparea from ss field values
			setInitialCroparea : function () {
				this.cropCoords = this.cropCoords || {};

				this.loopCoordProps(function (prop) {
					var $coord = $("input[data-property='" + prop + "']");

					if ($coord.length) {
						this.cropCoords[prop] = $coord.val();
					}
				});

				// set jcrop selection
				this._jcrop.setSelect([this.cropCoords.x, this.cropCoords.y, this.cropCoords.x2, this.cropCoords.y2]);
			}
		});
	}
);
