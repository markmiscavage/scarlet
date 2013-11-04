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
		// 1. resize to whatever
		// 2. resize to a constrained width / height

		var $win = $(window),
			EVENTS = {
				COMPLETE : "cropimage:complete"
			};

		return DOMClass.extend({

			"static" : EVENTS,

			options : { // initial options, override with `new CropImage(el, options, coordinates)`
				aspectRatio : 0
			},

			coordinates : null, // {x:0,y:0,x1:100,y1:100}

			extra : null, // passed back to the oncomplete call

			$ : null,
			$img : null,
			$constrain : null,
			$preview : null,
			$confirm : null,

			$previewThumb : null,
			$previewThumbImg : null,
			$previewZoom : null,

			// automatically set vars
			_properties : null,
			_jcrop : null,
			_curProps : null,
			_isPreviewThumbActualSize : false,
			_isPreviewOriginal : false,
			_isShowingPreview : false,

			cropScale : null, // { w : 100, h: 100} // special case for scaling the resulting crop to a specified size in the preview
			_onResize : null,

			init : function ($el, options, extra) {
				this.sup();

				this.$ = $el;
				this.$img = this.$.find(".original");
				this.$preview = this.$.find(".preview");
				this.$thumb = this.$preview.find(".thumb");
				this.options = options;

				//this.extraSetup();

				// this.$constrain = this.$.find("#constrain");
				// this.$confirm = this.$.find(".confirm");

				// this.extra = extra;

				this.$img.imagesLoaded(this.onReady);
			},

			onReady : function () {
				// this.$.addClass("ready");
				// this.addListeners();
				this.setConstraints();
				this.setupPreview();
				this.setupJcrop();
			},

			setupJcrop : function () {
				var self = this,
					options = $.extend({}, this.options, {
						onSelect : $.proxy(this.updatePreview, this),
						onChange : $.proxy(this.updatePreview, this),
						aspectRatio : (this.constrainRatio ? (this.cropScale.w / this.cropScale.h) : 0)
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

			updatePreview : function (coords) {
				clearTimeout(this.refreshTimeout);

				if (parseInt(coords.w, 10) < 0) {
					return;
				}

				this.cropCoords = coords;

				var scale = this.getScale(),
					width,
					height;

				//console.log(this.cropScale.h, scaleX, scaleY, this._jcrop.tellSelect())

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

				// debounce update of coord values (form fields) after interaction
				this.refreshTimeout = setTimeout(this.updateCoords, 250);
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

			// store current crop coordinates as field values
			updateCoords : function () {

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
			},

			// TODO: REMOVE if obsolete
			// prbly not need methods below //
			//////////////////////////////////
			/*

			addListeners : function	() {
				if (this.$constrain.length) {
					this.$constrain.on("change", this.onChangeConstrain);
				}

				if (this.$preview.length) {
					this.$preview.on("click", this.onClickPreview);
				}

				this.$confirm.on("click", this.onFinish);

				this._onResize = $.proxy($.debounce(500, this.onResize), this);
				$(window).on("resize", this._onResize);
			},

			removeListeners : function () {
				if (this._jcrop) {
					this._jcrop.destroy();
				}

				$(window).off("resize", this._onResize);

				this.$constrain.off("change", this.onChangeConstrain);
				this.$preview.off("click", this.onClickPreview);
			},

			setupPreview : function () {
				if (this.$preview.length) {

					this.$previewThumb = this.$preview.find(".thumb");
					this.$previewThumbImg = this.$img.clone();

					this.$previewZoom = this.$preview.find(".zoom");

					this.$previewThumb.append(this.$previewThumbImg);
				}
			},

			extraSetup : function () {
				// automatically set the aspect ratio to the incoming coordinates
				// force preview to zoom in/out to a specified width height (generally assumes you're also locking aspectRatio to self w/h)
				var data = this.$.data();

				if (data.scaleW && data.scaleH) {
					this.cropScale = { // means the target crop size will stay the same
						w : data.scaleW,
						h : data.scaleH
					};
				}

				this._isPreviewOriginal = (data.zoom === "out") ? false : true;
			},

			// determines max available width for jcrop - this could probably be done better
			getMaxWidth : function () {
				return Math.max($win.width() - 160, 200);
			},

			getMaxHeight : function () {
				return $win.height() * 0.5;
			},

			onResize : function (e) {
				if (this._jcrop) {
					this.resetJcrop();
				}
			},

			onSelect : function	(c) {
				// console.log("select", c);
			},

			onChange : function	(c) {
				var i,
					prop;

				if (!isNaN(c.x)) {
					this._curProps = c;
				}

				for (i in c) {
					prop = this._properties[i];

					if (prop) {
						prop.val(c[i]);
					}
				}

				if (this.$preview.length) {
					this.updatePreview(c);
				}
			},

			onChangeConstrain : function (e) {
				var $targ = $(e.currentTarget),
					isOn = $targ.attr("checked");

				this._jcrop.setOptions({
					aspectRatio : isOn ? (this._curProps.w / this._curProps.h) : 0
				});
			},


			updatePreview : function (c) {
				//console.log("update", this.cropScale);
				// 1. preview updates to match selected size with ability to zoom to actual pixels
				var scaleFactor = this._jcrop.getScaleFactor(),
					maxW = Math.min(this.getMaxWidth(), this.cropScale.w),
					maxH = Math.min(this.getMaxHeight(), this.cropScale.h),
					r = c.h / c.w,
					sfX = (1 / scaleFactor[0]),
					sfY = (1 / scaleFactor[1]),
					zoom = this._isPreviewOriginal ? 1 : 0,
					scaleX,
					scaleY;

				if (!zoom) {
					zoom = (maxW > maxH * r) ? (maxW / this.cropScale.w) : (maxH / this.cropScale.h);
				}

				scaleX = (this.cropScale.w / c.w) * zoom;
				scaleY = (this.cropScale.h / c.h) * zoom;


				this.$previewThumb.width(this.cropScale.w * zoom);
				this.$previewThumb.height(this.cropScale.h * zoom);

				if (c.w && c.h) {
					if (!this._isShowingPreview) {
						this._isShowingPreview = true;
						this.$preview.removeClass("hidden");
					}
				} else if (this._isShowingPreview) {
					this._isShowingPreview = false;
					this.$preview.addClass("hidden");
				}

				var o = {
					width : (scaleX * this.$img.naturalWidth()),
					height : (scaleY * this.$img.naturalHeight()),
					left : -(c.x * scaleX),
					top : -(c.y * scaleY)
				};
				this.$previewThumbImg.css(o);
			},

			onClickPreview : function (e) {
				this._isPreviewOriginal = !this._isPreviewOriginal;

				this.updatePreview(this._curProps);
				this.$preview.attr("data-zoom", (this._isPreviewOriginal) ? "in" : "out");
			},

			onFinish : function (e) {
				var o = this.cropScale || {},
					c = $.extend({}, this._curProps, {
						targetWidth : (o.w || 0),
						targetHeight : (o.h || 0),
						naturalWidth : this.$img.naturalWidth(),
						naturalHeight : this.$img.naturalHeight()
					});

				this.publish(EVENTS.COMPLETE, c, this.extra);
			},

			destroy : function () {

			}
			*/

		});
	}
);
