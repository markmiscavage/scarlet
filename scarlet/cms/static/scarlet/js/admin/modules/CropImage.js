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
		"$plugin!imagesLoaded"
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

			_cropScaling : null, // { w : 100, h: 100} // special case for scaling the resulting crop to a specified size in the preview
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
				// $("#crop").Jcrop({
				// 	onChange: this.test,
				// 	onSelect: this.test,
				// 	aspectRatio: 1
				// });
			},

			onReady : function () {
				// this.$.addClass("ready");
				// this.addListeners();

				this.setupPreview();
				this.setupJcrop();
			},

			setupJcrop : function () {
				var self = this,
					options = $.extend({}, this.options, {
						onSelect : $.proxy(this.updatePreview, this),
						onChange : $.proxy(this.updatePreview, this),
						aspectRatio : (this._cropScaling.w/this._cropScaling.h)
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
				this._jcrop.setSelect([this._cropCoords.x, this._cropCoords.y, this._cropCoords.x2, this._cropCoords.y2]);
			},

			setupPreview : function () {
				var data = this.$preview.data();

				// set aspect ratio for crop;
				// also defines .mask box size
				this._cropScaling = {
					w : data.scaleW,
					h : data.scaleH
				};

				this.$preview.find(".mask").css({
					width: this._cropScaling.w,
					height: this._cropScaling.h
				});
			},

			updatePreview : function (coords) {
				clearTimeout(this.refreshTimeout);

				if (parseInt(coords.w) > 0)
				{
					var scaleX = this._cropScaling.w / coords.w;
					var scaleY = this._cropScaling.h / coords.h;

					this.$thumb.css({
						width: Math.round(scaleX * this.$img.naturalWidth()) + "px",
						height: Math.round(scaleY * this.$img.naturalHeight()) + "px",
						marginLeft: "-" + Math.round(scaleX * coords.x) + "px",
						marginTop: "-" + Math.round(scaleY * coords.y) + "px",
					});

					this._cropCoords = coords;

					this.refreshTimeout = setTimeout(this.updateCoords, 250);
				}
			},

			// store current crop coordinates as field values
			updateCoords : function () {

				this.loopCoordProps(function (prop) {
					var $coord = $("input[data-property='" + prop + "']");

					if ($coord.length) {
						$coord.attr("value", this._cropCoords[prop]); // sync field val
					}
				})

				console.log("UPDATE Coords", this._cropCoords)
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
				this._cropCoords = this._cropCoords || {};

				this.loopCoordProps(function (prop) {
					var $coord = $("input[data-property='" + prop + "']");

					if ($coord.length) {
						this._cropCoords[prop] = $coord.val();
					}
				});

				console.log("UPDATE updateCroparea", this._cropCoords);
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

			setupPreviewX : function () {
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
					this._cropScaling = { // means the target crop size will stay the same
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


			updatePreviewX : function (c) {
				//console.log("update", this._cropScaling);
				// 1. preview updates to match selected size with ability to zoom to actual pixels
				var scaleFactor = this._jcrop.getScaleFactor(),
					maxW = Math.min(this.getMaxWidth(), this._cropScaling.w),
					maxH = Math.min(this.getMaxHeight(), this._cropScaling.h),
					r = c.h / c.w,
					sfX = (1 / scaleFactor[0]),
					sfY = (1 / scaleFactor[1]),
					zoom = this._isPreviewOriginal ? 1 : 0,
					scaleX,
					scaleY;

				if (!zoom) {
					zoom = (maxW > maxH * r) ? (maxW / this._cropScaling.w) : (maxH / this._cropScaling.h);
				}

				scaleX = (this._cropScaling.w / c.w) * zoom;
				scaleY = (this._cropScaling.h / c.h) * zoom;


				this.$previewThumb.width(this._cropScaling.w * zoom);
				this.$previewThumb.height(this._cropScaling.h * zoom);

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
				var o = this._cropScaling || {},
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
