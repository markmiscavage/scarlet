define('rosy/utils/Utils', [], function() {
	/*jshint eqeqeq:false, noempty:false, eqnull:true */

	function extend(target) {
		var deep, options, name, src, copy, copyIsArray, clone, i, length

		// Handle case when target is a string or something (possible in deep copy)
		if (typeof target !== 'object' && !isFunction(target)) {
			target = {}
		}

		i = isObject(arguments[1]) ? 1 : 2
		deep = arguments[1] === true

		for (length = arguments.length; i < length; i++) {
			// Only deal with non-null/undefined values
			if ((options = arguments[i]) != null) {
				// Extend the base object
				for (name in options) {
					src = target[name]
					copy = options[name]

					// Prevent never-ending loop
					if (target === copy) {
						continue
					}

					// Recurse if we're merging plain objects or arrays
					if (
						deep &&
						copy &&
						(isPlainObject(copy) || (copyIsArray = isArray(copy)))
					) {
						if (copyIsArray) {
							copyIsArray = false
							clone = src && isArray(src) ? src : []
						} else {
							clone = src && isPlainObject(src) ? src : {}
						}

						// Never move original objects, clone them
						target[name] = extend(clone, deep, copy)
					} else if (copy !== undefined) {
						// Don't bring in undefined values
						target[name] = copy
					}
				}
			}
		}

		// Return the modified object
		return target
	}

	function isObject(obj) {
		var objectTypes = {
			function: true,
			object: true,
			unknown: true,
		}

		return obj ? !!objectTypes[typeof obj] : false
	}

	function isFunction(obj) {
		return typeof obj == 'function'
	}

	var isArray =
		Array.isArray ||
		function(vArg) {
			return Object.prototype.toString.call(vArg) === '[object Array]'
		}

	function isPlainObject(obj) {
		var hasOwn = Object.prototype.hasOwnProperty

		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if (!obj || !isObject(obj) || obj.nodeType || obj === window) {
			return false
		}

		try {
			// Not own constructor property must be Object
			if (
				obj.constructor &&
				!hasOwn.call(obj, 'constructor') &&
				!hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')
			) {
				return false
			}
		} catch (e) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key
		for (key in obj) {
		}

		return key === undefined || hasOwn.call(obj, key)
	}

	return {
		extend: extend,
		isArray: isArray,
		isFunction: isFunction,
		isObject: isObject,
		isPlainObject: isPlainObject,
	}
})

define('rosy/polyfills/function-bind', [], function() {
	if (!Function.prototype.bind) {
		Function.prototype.bind = function(oThis) {
			if (typeof this !== 'function') {
				// closest thing possible to the ECMAScript 5 internal IsCallable function
				throw new TypeError(
					'Function.prototype.bind - what is trying to be bound is not callable'
				)
			}

			var aArgs = Array.prototype.slice.call(arguments, 1),
				fToBind = this,
				FNOP = function() {},
				fBound = function() {
					return fToBind.apply(
						this instanceof FNOP ? this : oThis || window,
						aArgs.concat(Array.prototype.slice.call(arguments))
					)
				}

			FNOP.prototype = this.prototype
			fBound.prototype = new FNOP()
			return fBound
		}
	}

	return Function.prototype.bind
})

define(
	'rosy/base/AbstractClass',
	['../utils/Utils', '../polyfills/function-bind'],
	function(Utils) {
		/*=========================== HELPER FUNCTIONS ===========================*/

		var _createSuperFunction = function(fn, superFn) {
			return function() {
				var r, tmp = this.sup || null

				// Reference the prototypes method, as super temporarily
				this.sup = superFn

				r = fn.apply(this, arguments)

				// Reset this.sup
				this.sup = tmp
				return r
			}
		}

		/*
		If Function.toString() works as expected, return a regex that checks for `sup()`
		otherwise return a regex that passes everything.
		*/

		var _doesCallSuper = /xyz/.test(function() {
			var xyz
			xyz = true
		})
			? /\bthis\.sup\b/
			: /.*/

		/*=========================== END OF HELPER FUNCTIONS ===========================*/

		return (function() {
			/**
			* Allows us to store module id's on Classes for easier debugging, See;
			* https://github.com/jrburke/requirejs/wiki/Internal-API:-onResourceLoad
			**/

			require.onResourceLoad = function(context, map) {
				var module = context.require(map.id)

				if (module && module._isRosyClass) {
					module._moduleID = module.prototype._moduleID = map.id
				}
			}

			// Setup a dummy constructor for prototype-chaining without any overhead.
			var Prototype = function() {}
			var MClass = function() {}

			MClass.extend = function(props) {
				Prototype.prototype = this.prototype
				var p, proto = Utils.extend(new Prototype(), props)

				function Class(vars) {
					var fn, p

					/**
					* If the prototype has a vars object and the first argument, is an object,
					* deep copy it to this.vars
					**/
					if (this.vars && typeof vars === 'object') {
						this.vars = Utils.extend({}, this.vars, vars)
					}

					if (this.opts) {
						this.opts = Utils.extend({}, this.opts)

						if (this.opts.autoProxy === true) {
							for (p in this) {
								if (typeof this[p] === 'function') {
									this[p] = this[p].bind(this)
								}
							}
						}
					}

					fn = this.__init || this.init || this.prototype.constructor
					return fn.apply(this, arguments)
				}

				for (p in props) {
					if (
						p !== 'static' &&
						typeof props[p] === 'function' &&
						typeof this.prototype[p] === 'function' &&
						_doesCallSuper.test(props[p])
					) {
						// this.sup() magic, as-needed
						proto[p] = _createSuperFunction(props[p], this.prototype[p])
					} else if (typeof props[p] === 'object') {
						if (props[p] instanceof Array) {
							proto[p] = props[p].concat()
						} else if (props[p] !== null) {
							if (p === 'vars' || p === 'opts') {
								proto[p] = Utils.extend({}, true, this.prototype[p], props[p])
							} else if (p === 'static') {
								proto[p] = Utils.extend({}, this.prototype[p], props[p])
							} else {
								proto[p] = Utils.extend({}, props[p])
							}
						}
					}
				}

				proto.extend = MClass.extend.bind(Class)

				Class.prototype = proto
				Utils.extend(Class, this, proto['static'])
				Class._isRosyClass = true

				Class.prototype.constructor = Class

				if (typeof Class.prototype.setup === 'function') {
					Class.prototype.setup.call(Class)
				}

				return Class
			}

			return MClass
		})()
	}
)

define('rosy/polyfills/array-indexof', [], function() {
	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(a, b) {
			if (!this.length || !(this instanceof Array) || arguments.length < 1) {
				return -1
			}

			b = b || 0

			if (b >= this.length) {
				return -1
			}

			while (b < this.length) {
				if (this[b] === a) {
					return b
				}
				b += 1
			}
			return -1
		}
	}

	return Array.prototype.indexOf
})

define(
	'rosy/base/NotificationManager',
	['../utils/Utils', '../polyfills/array-indexof'],
	function(Utils) {
		var Notification = function(name, args, callback) {
			this.name = name
			this.args = args
			this.data = args && args.length === 1 ? args[0] : null
			this.callback = callback
			return this
		}

		Notification.prototype.data = {}
		Notification.prototype.name = ''
		Notification.prototype.dispatcher = null
		Notification.prototype.status = 0
		Notification.prototype.pointer = 0
		Notification.prototype.callback = null

		Notification.prototype.hold = function() {
			this.status = 2
		}

		Notification.prototype.release = function() {
			this.status = 1
			NotificationManager.releaseNotification(this)
		}

		Notification.prototype.cancel = function() {
			this.data = {}
			this.name = ''
			this.status = 0
			this.pointer = 0
			this.dispatcher = null
			this.callback = null

			NotificationManager.cancelNotification(this)
		}

		Notification.prototype.dispatch = function(obj) {
			this.status = 1
			this.pointer = 0
			this.dispatcher = obj
			NotificationManager.publishNotification(this)
		}

		Notification.prototype.respond = function() {
			if (this.callback) {
				this.callback.apply(this.dispatcher, arguments)
				this.cancel()
			}
		}

		var _pendingNotifications = []
		var _interests = {}

		function _publishNotification(notification) {
			_pendingNotifications.push(notification)
			_notifyObjects(notification)
		}

		function _notifyObjects(notification) {
			var name = notification.name

			if (_interests[name]) {
				var subs = _interests[name].slice(0)
				var len = subs.length

				while (notification.pointer < len) {
					if (notification.status === 1) {
						subs[notification.pointer].apply(
							null,
							[].concat(notification, notification.args)
						)
						notification.pointer++
					} else {
						return
					}
				}

				subs = null

				/**
				* Notified all subscribers, notification is no longer needed,
				* unless it has a callback to be called later via notification.respond()
				*/
				if (notification.status === 1 && !notification.callback) {
					notification.cancel()
				}
			}
		}

		var NotificationManager = {}

		NotificationManager.subscribe = function(name, fn, priority) {
			priority = isNaN(priority) ? -1 : priority
			_interests[name] = _interests[name] || []

			if (priority <= -1 || priority >= _interests[name].length) {
				_interests[name].push(fn)
			} else {
				_interests[name].splice(priority, 0, fn)
			}
		}

		NotificationManager.unsubscribe = function(name, fn) {
			var fnIndex = _interests[name].indexOf(fn)
			if (fnIndex > -1) {
				_interests[name].splice(fnIndex, 1)
			}
		}

		NotificationManager.publish = function() {
			var notification,
				args = Array.prototype.slice.call(arguments),
				name = args[0],
				dispatcher = args[args.length - 1],
				callback = args[args.length - 2]

			callback = Utils.isFunction(callback) ? callback : null

			args = args.slice(1, callback ? args.length - 2 : args.length - 1)

			notification = new Notification(name, args, callback)
			notification.status = 1
			notification.pointer = 0
			notification.dispatcher = dispatcher
			_publishNotification(notification)
		}

		NotificationManager.releaseNotification = function(notification) {
			notification.status = 1
			if (_pendingNotifications.indexOf(notification) > -1) {
				_notifyObjects(notification)
			}
		}

		NotificationManager.cancelNotification = function(notification) {
			_pendingNotifications.splice(
				_pendingNotifications.indexOf(notification),
				1
			)
			notification = null
		}

		return NotificationManager
	}
)

define(
	'rosy/base/Class',
	[
		'./AbstractClass',
		'./NotificationManager',
		'../polyfills/function-bind',
		'../polyfills/array-indexof',
	],
	function(AbstractClass, NotificationManager) {
		return AbstractClass.extend({
			opts: {
				autoProxy: true,
			},

			init: function() {},

			/**
			* Subscribes to a notification.
			*/
			subscribe: function(name, handler, priority) {
				this._interestHandlers = this._interestHandlers || {}

				if (handler && !this._interestHandlers[name]) {
					handler = handler
					NotificationManager.subscribe(name, handler, priority)
					this._interestHandlers[name] = handler
				}
			},

			/**
			* Unsubscribes from a notification.
			*/
			unsubscribe: function(name) {
				if (!name) {
					return this.unsubscribeAll()
				}

				if (this._interestHandlers && this._interestHandlers[name]) {
					var handler = this._interestHandlers[name]
					this._interestHandlers[name] = null
					delete this._interestHandlers[name]
					NotificationManager.unsubscribe(name, handler)
				}
			},

			/**
			* Unsubscribes from all notifications registered via this.subscribe();
			*/
			unsubscribeAll: function() {
				for (var interest in this._interestHandlers) {
					if (this._interestHandlers.hasOwnProperty(interest)) {
						this.unsubscribe(interest)
					}
				}
				this._interestHandlers = []
			},

			/**
			* Publishes a notification with the specified data.
			*/
			publish: function(/*name, arg1, arg2, arg3..., callback*/) {
				var args = Array.prototype.slice.call(arguments)
				NotificationManager.publish.apply(
					NotificationManager,
					[].concat(args, this)
				)
			},

			/**
			* Cross-browser shorthand for func.bind(this)
			* or rather, $.proxy(func, this) in jQuery terms
			*/
			proxy: function(fn) {
				return fn ? fn.bind(this) : fn
			},

			/**
			* Middleware setTimeout method. Allows for scope retention inside timers.
			*/
			setTimeout: function(func, delay) {
				return window.setTimeout(this.proxy(func), delay)
			},

			/**
			* Middleware setInterval method. Allows for scope retention inside timers.
			*/
			setInterval: function(func, delay) {
				return window.setInterval(this.proxy(func), delay)
			},

			/**
			* Add pseudo event listener
			*/
			on: function(name, fn) {
				var listeners = (this['on_' + name] = this['on_' + name] || [])
				listeners.push(fn)
				return true
			},

			/**
			* Remove pseudo event listener
			*/
			off: function(name, fn) {
				var listeners = this['on_' + name], i

				if (listeners) {
					if (!fn) {
						this['on_' + name] = []
						return true
					}

					i = listeners.indexOf(fn)
					while (i > -1) {
						listeners.splice(i, 1)
						i = listeners.indexOf(fn)
					}
					return true
				}
			},

			/**
			* Trigger pseudo event
			*/
			trigger: function() {
				var listeners,
					evt,
					i,
					l,
					args = Array.prototype.slice.call(arguments),
					name = args.splice(0, 1)[0].split(':')

				while (name.length) {
					evt = name.join(':')
					listeners = this['on_' + evt]

					if (listeners && listeners.length) {
						args = [].concat(evt, this, args || [])

						for ((i = 0), (l = listeners.length); i < l; i++) {
							listeners[i].apply(null, args)
						}
					}

					name.pop()
				}
			},

			destroy: function() {
				var p

				for (p in this) {
					if (p.indexOf('on_') >= 0) {
						this.off(p.replace('on_'))
					}
				}

				this.unsubscribe()
			},
		})
	}
)

define('rosy/base/DOMClass', ['../base/Class', '$'], function(Class, $) {
	function _matchJQueryGUIDs(instance, jqObj, events) {
		var type, i, j, event
		var func
		var f

		for (type in events) {
			for ((i = 0), (j = events[type].length); i < j; i++) {
				if (!events[type]) {
					break
				}

				event = events[type][i]

				if (!event) {
					break
				}

				for (func in instance) {
					f = instance[func]

					if (f && f.guid && typeof f === 'function') {
						if (f.guid === event.handler.guid) {
							jqObj.off(type, f)
						}
					}
				}
			}
		}
	}

	function _unbindFromObject(instance, obj) {
		if (!obj) {
			return
		}

		var key, jqObj, events

		for (key in obj) {
			jqObj = obj[key]

			if (jqObj instanceof $) {
				var i, j, el

				for ((i = 0), (j = jqObj.length); i < j; i++) {
					el = jqObj[i]
					events = $._data(el, 'events')

					if (events) {
						_matchJQueryGUIDs(instance, jqObj.eq(i), events)
					}
				}
			} else if ($.isPlainObject(jqObj)) {
				_unbindFromObject(instance, jqObj)
			}
		}
	}

	return Class.extend({
		/**
			* Middleware preventDefault method. A shortcut to avoid delegation for a simple task.
			*/
		preventDefault: function(e) {
			e.preventDefault()
		},

		/**
			* Shorthand for $.proxy(func, this)
			*/
		proxy: function(fn) {
			return $.proxy(fn, this)
		},

		destroy: function() {
			this.unbindEvents()
			this.sup()
		},

		unbindEvents: function() {
			for (var key in this) {
				if ($.isPlainObject(this[key])) {
					_unbindFromObject(this, this[key])
				}
			}
		},
	})
})

define('admin/views/Page', ['rosy/base/DOMClass', '$'], function(DOMClass, $) {
	var $body = $('body')

	return DOMClass.extend({
		$content: '',

		init: function() {
			this.sup()
			this.$content = $('#main')
		},

		transitionIn: function() {
			this.$content.animate({ opacity: 1 }, 500, this.transitionInComplete)
		},

		transitionOut: function() {
			this.$content.animate({ opacity: 0 }, 500, this.transitionOutComplete)
		},

		destroy: function() {
			this.$content = null
		},
	})
})

/*! jQuery UI - v1.9.2 - 2013-12-11
* http://jqueryui.com
* Includes: jquery.ui.core.js, jquery.ui.widget.js, jquery.ui.mouse.js, jquery.ui.sortable.js, jquery.ui.datepicker.js, jquery.ui.slider.js
* Copyright 2013 jQuery Foundation and other contributors; Licensed MIT */
;(function($, undefined) {
	var uuid = 0, runiqueId = /^ui-id-\d+$/

	// prevent duplicate loading
	// this is only a problem because we proxy existing functions
	// and we don't want to double proxy them
	$.ui = $.ui || {}
	if ($.ui.version) {
		return
	}

	$.extend($.ui, {
		version: '1.9.2',

		keyCode: {
			BACKSPACE: 8,
			COMMA: 188,
			DELETE: 46,
			DOWN: 40,
			END: 35,
			ENTER: 13,
			ESCAPE: 27,
			HOME: 36,
			LEFT: 37,
			NUMPAD_ADD: 107,
			NUMPAD_DECIMAL: 110,
			NUMPAD_DIVIDE: 111,
			NUMPAD_ENTER: 108,
			NUMPAD_MULTIPLY: 106,
			NUMPAD_SUBTRACT: 109,
			PAGE_DOWN: 34,
			PAGE_UP: 33,
			PERIOD: 190,
			RIGHT: 39,
			SPACE: 32,
			TAB: 9,
			UP: 38,
		},
	})

	// plugins
	$.fn.extend({
		_focus: $.fn.focus,
		focus: function(delay, fn) {
			return typeof delay === 'number'
				? this.each(function() {
						var elem = this
						setTimeout(function() {
							$(elem).focus()
							if (fn) {
								fn.call(elem)
							}
						}, delay)
					})
				: this._focus.apply(this, arguments)
		},

		scrollParent: function() {
			var scrollParent
			if (
				($.ui.ie && /(static|relative)/.test(this.css('position'))) ||
				/absolute/.test(this.css('position'))
			) {
				scrollParent = this.parents()
					.filter(function() {
						return (
							/(relative|absolute|fixed)/.test($.css(this, 'position')) &&
							/(auto|scroll)/.test(
								$.css(this, 'overflow') +
									$.css(this, 'overflow-y') +
									$.css(this, 'overflow-x')
							)
						)
					})
					.eq(0)
			} else {
				scrollParent = this.parents()
					.filter(function() {
						return /(auto|scroll)/.test(
							$.css(this, 'overflow') +
								$.css(this, 'overflow-y') +
								$.css(this, 'overflow-x')
						)
					})
					.eq(0)
			}

			return /fixed/.test(this.css('position')) || !scrollParent.length
				? $(document)
				: scrollParent
		},

		zIndex: function(zIndex) {
			if (zIndex !== undefined) {
				return this.css('zIndex', zIndex)
			}

			if (this.length) {
				var elem = $(this[0]), position, value
				while (elem.length && elem[0] !== document) {
					// Ignore z-index if position is set to a value where z-index is ignored by the browser
					// This makes behavior of this function consistent across browsers
					// WebKit always returns auto if the element is positioned
					position = elem.css('position')
					if (
						position === 'absolute' ||
						position === 'relative' ||
						position === 'fixed'
					) {
						// IE returns 0 when zIndex is not specified
						// other browsers return a string
						// we ignore the case of nested elements with an explicit value of 0
						// <div style="z-index: -10;"><div style="z-index: 0;"></div></div>
						value = parseInt(elem.css('zIndex'), 10)
						if (!isNaN(value) && value !== 0) {
							return value
						}
					}
					elem = elem.parent()
				}
			}

			return 0
		},

		uniqueId: function() {
			return this.each(function() {
				if (!this.id) {
					this.id = 'ui-id-' + ++uuid
				}
			})
		},

		removeUniqueId: function() {
			return this.each(function() {
				if (runiqueId.test(this.id)) {
					$(this).removeAttr('id')
				}
			})
		},
	})

	// selectors
	function focusable(element, isTabIndexNotNaN) {
		var map, mapName, img, nodeName = element.nodeName.toLowerCase()
		if ('area' === nodeName) {
			map = element.parentNode
			mapName = map.name
			if (!element.href || !mapName || map.nodeName.toLowerCase() !== 'map') {
				return false
			}
			img = $('img[usemap=#' + mapName + ']')[0]
			return !!img && visible(img)
		}
		return (
			(/input|select|textarea|button|object/.test(nodeName)
				? !element.disabled
				: 'a' === nodeName
						? element.href || isTabIndexNotNaN
						: isTabIndexNotNaN) &&
			// the element and all of its ancestors must be visible
			visible(element)
		)
	}

	function visible(element) {
		return (
			$.expr.filters.visible(element) &&
			!$(element).parents().andSelf().filter(function() {
				return $.css(this, 'visibility') === 'hidden'
			}).length
		)
	}

	$.extend($.expr[':'], {
		data: $.expr.createPseudo
			? $.expr.createPseudo(function(dataName) {
					return function(elem) {
						return !!$.data(elem, dataName)
					}
				})
			: // support: jQuery <1.8
				function(elem, i, match) {
					return !!$.data(elem, match[3])
				},

		focusable: function(element) {
			return focusable(element, !isNaN($.attr(element, 'tabindex')))
		},

		tabbable: function(element) {
			var tabIndex = $.attr(element, 'tabindex'),
				isTabIndexNaN = isNaN(tabIndex)
			return (
				(isTabIndexNaN || tabIndex >= 0) && focusable(element, !isTabIndexNaN)
			)
		},
	})

	// support
	$(function() {
		var body = document.body,
			div = body.appendChild((div = document.createElement('div')))

		// access offsetHeight before setting the style to prevent a layout bug
		// in IE 9 which causes the element to continue to take up space even
		// after it is removed from the DOM (#8026)
		div.offsetHeight

		$.extend(div.style, {
			minHeight: '100px',
			height: 'auto',
			padding: 0,
			borderWidth: 0,
		})

		$.support.minHeight = div.offsetHeight === 100
		$.support.selectstart = 'onselectstart' in div

		// set display to none to avoid a layout bug in IE
		// http://dev.jquery.com/ticket/4014
		body.removeChild(div).style.display = 'none'
	})

	// support: jQuery <1.8
	if (!$('<a>').outerWidth(1).jquery) {
		$.each(['Width', 'Height'], function(i, name) {
			var side = name === 'Width' ? ['Left', 'Right'] : ['Top', 'Bottom'],
				type = name.toLowerCase(),
				orig = {
					innerWidth: $.fn.innerWidth,
					innerHeight: $.fn.innerHeight,
					outerWidth: $.fn.outerWidth,
					outerHeight: $.fn.outerHeight,
				}

			function reduce(elem, size, border, margin) {
				$.each(side, function() {
					size -= parseFloat($.css(elem, 'padding' + this)) || 0
					if (border) {
						size -= parseFloat($.css(elem, 'border' + this + 'Width')) || 0
					}
					if (margin) {
						size -= parseFloat($.css(elem, 'margin' + this)) || 0
					}
				})
				return size
			}

			$.fn['inner' + name] = function(size) {
				if (size === undefined) {
					return orig['inner' + name].call(this)
				}

				return this.each(function() {
					$(this).css(type, reduce(this, size) + 'px')
				})
			}

			$.fn['outer' + name] = function(size, margin) {
				if (typeof size !== 'number') {
					return orig['outer' + name].call(this, size)
				}

				return this.each(function() {
					$(this).css(type, reduce(this, size, true, margin) + 'px')
				})
			}
		})
	}

	// support: jQuery 1.6.1, 1.6.2 (http://bugs.jquery.com/ticket/9413)
	if ($('<a>').data('a-b', 'a').removeData('a-b').data('a-b')) {
		$.fn.removeData = (function(removeData) {
			return function(key) {
				if (arguments.length) {
					return removeData.call(this, $.camelCase(key))
				} else {
					return removeData.call(this)
				}
			}
		})($.fn.removeData)
	}

	// deprecated

	;(function() {
		var uaMatch = /msie ([\w.]+)/.exec(navigator.userAgent.toLowerCase()) || []
		$.ui.ie = uaMatch.length ? true : false
		$.ui.ie6 = parseFloat(uaMatch[1], 10) === 6
	})()

	$.fn.extend({
		disableSelection: function() {
			return this.bind(
				($.support.selectstart ? 'selectstart' : 'mousedown') +
					'.ui-disableSelection',
				function(event) {
					event.preventDefault()
				}
			)
		},

		enableSelection: function() {
			return this.unbind('.ui-disableSelection')
		},
	})

	$.extend($.ui, {
		// $.ui.plugin is deprecated.  Use the proxy pattern instead.
		plugin: {
			add: function(module, option, set) {
				var i, proto = $.ui[module].prototype
				for (i in set) {
					proto.plugins[i] = proto.plugins[i] || []
					proto.plugins[i].push([option, set[i]])
				}
			},
			call: function(instance, name, args) {
				var i, set = instance.plugins[name]
				if (
					!set ||
					!instance.element[0].parentNode ||
					instance.element[0].parentNode.nodeType === 11
				) {
					return
				}

				for (i = 0; i < set.length; i++) {
					if (instance.options[set[i][0]]) {
						set[i][1].apply(instance.element, args)
					}
				}
			},
		},

		contains: $.contains,

		// only used by resizable
		hasScroll: function(el, a) {
			//If overflow is hidden, the element might have extra content, but the user wants to hide it
			if ($(el).css('overflow') === 'hidden') {
				return false
			}

			var scroll = a && a === 'left' ? 'scrollLeft' : 'scrollTop', has = false

			if (el[scroll] > 0) {
				return true
			}

			// TODO: determine which cases actually cause this to happen
			// if the element doesn't have the scroll set, see if it's possible to
			// set the scroll
			el[scroll] = 1
			has = el[scroll] > 0
			el[scroll] = 0
			return has
		},

		// these are odd functions, fix the API or move into individual plugins
		isOverAxis: function(x, reference, size) {
			//Determines when x coordinate is over "b" element axis
			return x > reference && x < reference + size
		},
		isOver: function(y, x, top, left, height, width) {
			//Determines when x, y coordinates is over "b" element
			return $.ui.isOverAxis(y, top, height) && $.ui.isOverAxis(x, left, width)
		},
	})
})(jQuery)
;(function($, undefined) {
	var uuid = 0, slice = Array.prototype.slice, _cleanData = $.cleanData
	$.cleanData = function(elems) {
		for (var i = 0, elem; (elem = elems[i]) != null; i++) {
			try {
				$(elem).triggerHandler('remove')
				// http://bugs.jquery.com/ticket/8235
			} catch (e) {}
		}
		_cleanData(elems)
	}

	$.widget = function(name, base, prototype) {
		var fullName,
			existingConstructor,
			constructor,
			basePrototype,
			namespace = name.split('.')[0]

		name = name.split('.')[1]
		fullName = namespace + '-' + name

		if (!prototype) {
			prototype = base
			base = $.Widget
		}

		// create selector for plugin
		$.expr[':'][fullName.toLowerCase()] = function(elem) {
			return !!$.data(elem, fullName)
		}

		$[namespace] = $[namespace] || {}
		existingConstructor = $[namespace][name]
		constructor = $[namespace][name] = function(options, element) {
			// allow instantiation without "new" keyword
			if (!this._createWidget) {
				return new constructor(options, element)
			}

			// allow instantiation without initializing for simple inheritance
			// must use "new" keyword (the code above always passes args)
			if (arguments.length) {
				this._createWidget(options, element)
			}
		}
		// extend with the existing constructor to carry over any static properties
		$.extend(constructor, existingConstructor, {
			version: prototype.version,
			// copy the object used to create the prototype in case we need to
			// redefine the widget later
			_proto: $.extend({}, prototype),
			// track widgets that inherit from this widget in case this widget is
			// redefined after a widget inherits from it
			_childConstructors: [],
		})

		basePrototype = new base()
		// we need to make the options hash a property directly on the new instance
		// otherwise we'll modify the options hash on the prototype that we're
		// inheriting from
		basePrototype.options = $.widget.extend({}, basePrototype.options)
		$.each(prototype, function(prop, value) {
			if ($.isFunction(value)) {
				prototype[prop] = (function() {
					var _super = function() {
						return base.prototype[prop].apply(this, arguments)
					},
						_superApply = function(args) {
							return base.prototype[prop].apply(this, args)
						}
					return function() {
						var __super = this._super,
							__superApply = this._superApply,
							returnValue

						this._super = _super
						this._superApply = _superApply

						returnValue = value.apply(this, arguments)

						this._super = __super
						this._superApply = __superApply

						return returnValue
					}
				})()
			}
		})
		constructor.prototype = $.widget.extend(
			basePrototype,
			{
				// TODO: remove support for widgetEventPrefix
				// always use the name + a colon as the prefix, e.g., draggable:start
				// don't prefix for widgets that aren't DOM-based
				widgetEventPrefix: existingConstructor
					? basePrototype.widgetEventPrefix
					: name,
			},
			prototype,
			{
				constructor: constructor,
				namespace: namespace,
				widgetName: name,
				// TODO remove widgetBaseClass, see #8155
				widgetBaseClass: fullName,
				widgetFullName: fullName,
			}
		)

		// If this widget is being redefined then we need to find all widgets that
		// are inheriting from it and redefine all of them so that they inherit from
		// the new version of this widget. We're essentially trying to replace one
		// level in the prototype chain.
		if (existingConstructor) {
			$.each(existingConstructor._childConstructors, function(i, child) {
				var childPrototype = child.prototype

				// redefine the child widget using the same prototype that was
				// originally used, but inherit from the new version of the base
				$.widget(
					childPrototype.namespace + '.' + childPrototype.widgetName,
					constructor,
					child._proto
				)
			})
			// remove the list of existing child constructors from the old constructor
			// so the old child constructors can be garbage collected
			delete existingConstructor._childConstructors
		} else {
			base._childConstructors.push(constructor)
		}

		$.widget.bridge(name, constructor)
	}

	$.widget.extend = function(target) {
		var input = slice.call(arguments, 1),
			inputIndex = 0,
			inputLength = input.length,
			key,
			value
		for (; inputIndex < inputLength; inputIndex++) {
			for (key in input[inputIndex]) {
				value = input[inputIndex][key]
				if (input[inputIndex].hasOwnProperty(key) && value !== undefined) {
					// Clone objects
					if ($.isPlainObject(value)) {
						target[key] = $.isPlainObject(target[key])
							? $.widget.extend({}, target[key], value)
							: // Don't extend strings, arrays, etc. with objects
								$.widget.extend({}, value)
						// Copy everything else by reference
					} else {
						target[key] = value
					}
				}
			}
		}
		return target
	}

	$.widget.bridge = function(name, object) {
		var fullName = object.prototype.widgetFullName || name
		$.fn[name] = function(options) {
			var isMethodCall = typeof options === 'string',
				args = slice.call(arguments, 1),
				returnValue = this

			// allow multiple hashes to be passed on init
			options = !isMethodCall && args.length
				? $.widget.extend.apply(null, [options].concat(args))
				: options

			if (isMethodCall) {
				this.each(function() {
					var methodValue, instance = $.data(this, fullName)
					if (!instance) {
						return $.error(
							'cannot call methods on ' +
								name +
								' prior to initialization; ' +
								"attempted to call method '" +
								options +
								"'"
						)
					}
					if (!$.isFunction(instance[options]) || options.charAt(0) === '_') {
						return $.error(
							"no such method '" +
								options +
								"' for " +
								name +
								' widget instance'
						)
					}
					methodValue = instance[options].apply(instance, args)
					if (methodValue !== instance && methodValue !== undefined) {
						returnValue = methodValue && methodValue.jquery
							? returnValue.pushStack(methodValue.get())
							: methodValue
						return false
					}
				})
			} else {
				this.each(function() {
					var instance = $.data(this, fullName)
					if (instance) {
						instance.option(options || {})._init()
					} else {
						$.data(this, fullName, new object(options, this))
					}
				})
			}

			return returnValue
		}
	}

	$.Widget = function(/* options, element */) {}
	$.Widget._childConstructors = []

	$.Widget.prototype = {
		widgetName: 'widget',
		widgetEventPrefix: '',
		defaultElement: '<div>',
		options: {
			disabled: false,

			// callbacks
			create: null,
		},
		_createWidget: function(options, element) {
			element = $(element || this.defaultElement || this)[0]
			this.element = $(element)
			this.uuid = uuid++
			this.eventNamespace = '.' + this.widgetName + this.uuid
			this.options = $.widget.extend(
				{},
				this.options,
				this._getCreateOptions(),
				options
			)

			this.bindings = $()
			this.hoverable = $()
			this.focusable = $()

			if (element !== this) {
				// 1.9 BC for #7810
				// TODO remove dual storage
				$.data(element, this.widgetName, this)
				$.data(element, this.widgetFullName, this)
				this._on(true, this.element, {
					remove: function(event) {
						if (event.target === element) {
							this.destroy()
						}
					},
				})
				this.document = $(
					element.style
						? // element within the document
							element.ownerDocument
						: // element is window or document
							element.document || element
				)
				this.window = $(
					this.document[0].defaultView || this.document[0].parentWindow
				)
			}

			this._create()
			this._trigger('create', null, this._getCreateEventData())
			this._init()
		},
		_getCreateOptions: $.noop,
		_getCreateEventData: $.noop,
		_create: $.noop,
		_init: $.noop,

		destroy: function() {
			this._destroy()
			// we can probably remove the unbind calls in 2.0
			// all event bindings should go through this._on()
			this.element
				.unbind(this.eventNamespace)
				// 1.9 BC for #7810
				// TODO remove dual storage
				.removeData(this.widgetName)
				.removeData(this.widgetFullName)
				// support: jquery <1.6.3
				// http://bugs.jquery.com/ticket/9413
				.removeData($.camelCase(this.widgetFullName))
			this.widget()
				.unbind(this.eventNamespace)
				.removeAttr('aria-disabled')
				.removeClass(this.widgetFullName + '-disabled ' + 'ui-state-disabled')

			// clean up events and states
			this.bindings.unbind(this.eventNamespace)
			this.hoverable.removeClass('ui-state-hover')
			this.focusable.removeClass('ui-state-focus')
		},
		_destroy: $.noop,

		widget: function() {
			return this.element
		},

		option: function(key, value) {
			var options = key, parts, curOption, i

			if (arguments.length === 0) {
				// don't return a reference to the internal hash
				return $.widget.extend({}, this.options)
			}

			if (typeof key === 'string') {
				// handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
				options = {}
				parts = key.split('.')
				key = parts.shift()
				if (parts.length) {
					curOption = options[key] = $.widget.extend({}, this.options[key])
					for (i = 0; i < parts.length - 1; i++) {
						curOption[parts[i]] = curOption[parts[i]] || {}
						curOption = curOption[parts[i]]
					}
					key = parts.pop()
					if (value === undefined) {
						return curOption[key] === undefined ? null : curOption[key]
					}
					curOption[key] = value
				} else {
					if (value === undefined) {
						return this.options[key] === undefined ? null : this.options[key]
					}
					options[key] = value
				}
			}

			this._setOptions(options)

			return this
		},
		_setOptions: function(options) {
			var key

			for (key in options) {
				this._setOption(key, options[key])
			}

			return this
		},
		_setOption: function(key, value) {
			this.options[key] = value

			if (key === 'disabled') {
				this.widget()
					.toggleClass(
						this.widgetFullName + '-disabled ui-state-disabled',
						!!value
					)
					.attr('aria-disabled', value)
				this.hoverable.removeClass('ui-state-hover')
				this.focusable.removeClass('ui-state-focus')
			}

			return this
		},

		enable: function() {
			return this._setOption('disabled', false)
		},
		disable: function() {
			return this._setOption('disabled', true)
		},

		_on: function(suppressDisabledCheck, element, handlers) {
			var delegateElement, instance = this

			// no suppressDisabledCheck flag, shuffle arguments
			if (typeof suppressDisabledCheck !== 'boolean') {
				handlers = element
				element = suppressDisabledCheck
				suppressDisabledCheck = false
			}

			// no element argument, shuffle and use this.element
			if (!handlers) {
				handlers = element
				element = this.element
				delegateElement = this.widget()
			} else {
				// accept selectors, DOM elements
				element = delegateElement = $(element)
				this.bindings = this.bindings.add(element)
			}

			$.each(handlers, function(event, handler) {
				function handlerProxy() {
					// allow widgets to customize the disabled handling
					// - disabled as an array instead of boolean
					// - disabled class as method for disabling individual parts
					if (
						!suppressDisabledCheck &&
						(instance.options.disabled === true ||
							$(this).hasClass('ui-state-disabled'))
					) {
						return
					}
					return (typeof handler === 'string'
						? instance[handler]
						: handler).apply(instance, arguments)
				}

				// copy the guid so direct unbinding works
				if (typeof handler !== 'string') {
					handlerProxy.guid = handler.guid =
						handler.guid || handlerProxy.guid || $.guid++
				}

				var match = event.match(/^(\w+)\s*(.*)$/),
					eventName = match[1] + instance.eventNamespace,
					selector = match[2]
				if (selector) {
					delegateElement.delegate(selector, eventName, handlerProxy)
				} else {
					element.bind(eventName, handlerProxy)
				}
			})
		},

		_off: function(element, eventName) {
			eventName =
				(eventName || '').split(' ').join(this.eventNamespace + ' ') +
				this.eventNamespace
			element.unbind(eventName).undelegate(eventName)
		},

		_delay: function(handler, delay) {
			function handlerProxy() {
				return (typeof handler === 'string'
					? instance[handler]
					: handler).apply(instance, arguments)
			}
			var instance = this
			return setTimeout(handlerProxy, delay || 0)
		},

		_hoverable: function(element) {
			this.hoverable = this.hoverable.add(element)
			this._on(element, {
				mouseenter: function(event) {
					$(event.currentTarget).addClass('ui-state-hover')
				},
				mouseleave: function(event) {
					$(event.currentTarget).removeClass('ui-state-hover')
				},
			})
		},

		_focusable: function(element) {
			this.focusable = this.focusable.add(element)
			this._on(element, {
				focusin: function(event) {
					$(event.currentTarget).addClass('ui-state-focus')
				},
				focusout: function(event) {
					$(event.currentTarget).removeClass('ui-state-focus')
				},
			})
		},

		_trigger: function(type, event, data) {
			var prop, orig, callback = this.options[type]

			data = data || {}
			event = $.Event(event)
			event.type = (type === this.widgetEventPrefix
				? type
				: this.widgetEventPrefix + type).toLowerCase()
			// the original event may come from any element
			// so we need to reset the target on the new event
			event.target = this.element[0]

			// copy original event properties over to the new event
			orig = event.originalEvent
			if (orig) {
				for (prop in orig) {
					if (!(prop in event)) {
						event[prop] = orig[prop]
					}
				}
			}

			this.element.trigger(event, data)
			return !(($.isFunction(callback) &&
				callback.apply(this.element[0], [event].concat(data)) === false) ||
				event.isDefaultPrevented())
		},
	}

	$.each({ show: 'fadeIn', hide: 'fadeOut' }, function(method, defaultEffect) {
		$.Widget.prototype['_' + method] = function(element, options, callback) {
			if (typeof options === 'string') {
				options = { effect: options }
			}
			var hasOptions,
				effectName = !options
					? method
					: options === true || typeof options === 'number'
							? defaultEffect
							: options.effect || defaultEffect
			options = options || {}
			if (typeof options === 'number') {
				options = { duration: options }
			}
			hasOptions = !$.isEmptyObject(options)
			options.complete = callback
			if (options.delay) {
				element.delay(options.delay)
			}
			if (
				hasOptions &&
				$.effects &&
				($.effects.effect[effectName] ||
					($.uiBackCompat !== false && $.effects[effectName]))
			) {
				element[method](options)
			} else if (effectName !== method && element[effectName]) {
				element[effectName](options.duration, options.easing, callback)
			} else {
				element.queue(function(next) {
					$(this)[method]()
					if (callback) {
						callback.call(element[0])
					}
					next()
				})
			}
		}
	})

	// DEPRECATED
	if ($.uiBackCompat !== false) {
		$.Widget.prototype._getCreateOptions = function() {
			return $.metadata && $.metadata.get(this.element[0])[this.widgetName]
		}
	}
})(jQuery)
;(function($, undefined) {
	var mouseHandled = false
	$(document).mouseup(function(e) {
		mouseHandled = false
	})

	$.widget('ui.mouse', {
		version: '1.9.2',
		options: {
			cancel: 'input,textarea,button,select,option',
			distance: 1,
			delay: 0,
		},
		_mouseInit: function() {
			var that = this

			this.element
				.bind('mousedown.' + this.widgetName, function(event) {
					return that._mouseDown(event)
				})
				.bind('click.' + this.widgetName, function(event) {
					if (
						true ===
						$.data(event.target, that.widgetName + '.preventClickEvent')
					) {
						$.removeData(event.target, that.widgetName + '.preventClickEvent')
						event.stopImmediatePropagation()
						return false
					}
				})

			this.started = false
		},

		// TODO: make sure destroying one instance of mouse doesn't mess with
		// other instances of mouse
		_mouseDestroy: function() {
			this.element.unbind('.' + this.widgetName)
			if (this._mouseMoveDelegate) {
				$(document)
					.unbind('mousemove.' + this.widgetName, this._mouseMoveDelegate)
					.unbind('mouseup.' + this.widgetName, this._mouseUpDelegate)
			}
		},

		_mouseDown: function(event) {
			// don't let more than one widget handle mouseStart
			if (mouseHandled) {
				return
			}

			// we may have missed mouseup (out of window)
			this._mouseStarted && this._mouseUp(event)

			this._mouseDownEvent = event

			var that = this,
				btnIsLeft = event.which === 1,
				// event.target.nodeName works around a bug in IE 8 with
				// disabled inputs (#7620)
				elIsCancel = typeof this.options.cancel === 'string' &&
					event.target.nodeName
					? $(event.target).closest(this.options.cancel).length
					: false
			if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
				return true
			}

			this.mouseDelayMet = !this.options.delay
			if (!this.mouseDelayMet) {
				this._mouseDelayTimer = setTimeout(function() {
					that.mouseDelayMet = true
				}, this.options.delay)
			}

			if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
				this._mouseStarted = this._mouseStart(event) !== false
				if (!this._mouseStarted) {
					event.preventDefault()
					return true
				}
			}

			// Click event may never have fired (Gecko & Opera)
			if (
				true === $.data(event.target, this.widgetName + '.preventClickEvent')
			) {
				$.removeData(event.target, this.widgetName + '.preventClickEvent')
			}

			// these delegates are required to keep context
			this._mouseMoveDelegate = function(event) {
				return that._mouseMove(event)
			}
			this._mouseUpDelegate = function(event) {
				return that._mouseUp(event)
			}
			$(document)
				.bind('mousemove.' + this.widgetName, this._mouseMoveDelegate)
				.bind('mouseup.' + this.widgetName, this._mouseUpDelegate)

			event.preventDefault()

			mouseHandled = true
			return true
		},

		_mouseMove: function(event) {
			// IE mouseup check - mouseup happened when mouse was out of window
			if ($.ui.ie && !(document.documentMode >= 9) && !event.button) {
				return this._mouseUp(event)
			}

			if (this._mouseStarted) {
				this._mouseDrag(event)
				return event.preventDefault()
			}

			if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
				this._mouseStarted =
					this._mouseStart(this._mouseDownEvent, event) !== false
				this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event)
			}

			return !this._mouseStarted
		},

		_mouseUp: function(event) {
			$(document)
				.unbind('mousemove.' + this.widgetName, this._mouseMoveDelegate)
				.unbind('mouseup.' + this.widgetName, this._mouseUpDelegate)

			if (this._mouseStarted) {
				this._mouseStarted = false

				if (event.target === this._mouseDownEvent.target) {
					$.data(event.target, this.widgetName + '.preventClickEvent', true)
				}

				this._mouseStop(event)
			}

			return false
		},

		_mouseDistanceMet: function(event) {
			return (
				Math.max(
					Math.abs(this._mouseDownEvent.pageX - event.pageX),
					Math.abs(this._mouseDownEvent.pageY - event.pageY)
				) >= this.options.distance
			)
		},

		_mouseDelayMet: function(event) {
			return this.mouseDelayMet
		},

		// These are placeholder methods, to be overriden by extending plugin
		_mouseStart: function(event) {},
		_mouseDrag: function(event) {},
		_mouseStop: function(event) {},
		_mouseCapture: function(event) {
			return true
		},
	})
})(jQuery)
;(function($, undefined) {
	$.widget('ui.sortable', $.ui.mouse, {
		version: '1.9.2',
		widgetEventPrefix: 'sort',
		ready: false,
		options: {
			appendTo: 'parent',
			axis: false,
			connectWith: false,
			containment: false,
			cursor: 'auto',
			cursorAt: false,
			dropOnEmpty: true,
			forcePlaceholderSize: false,
			forceHelperSize: false,
			grid: false,
			handle: false,
			helper: 'original',
			items: '> *',
			opacity: false,
			placeholder: false,
			revert: false,
			scroll: true,
			scrollSensitivity: 20,
			scrollSpeed: 20,
			scope: 'default',
			tolerance: 'intersect',
			zIndex: 1000,
		},
		_create: function() {
			var o = this.options
			this.containerCache = {}
			this.element.addClass('ui-sortable')

			//Get the items
			this.refresh()

			//Let's determine if the items are being displayed horizontally
			this.floating = this.items.length
				? o.axis === 'x' ||
						/left|right/.test(this.items[0].item.css('float')) ||
						/inline|table-cell/.test(this.items[0].item.css('display'))
				: false

			//Let's determine the parent's offset
			this.offset = this.element.offset()

			//Initialize mouse events for interaction
			this._mouseInit()

			//We're ready to go
			this.ready = true
		},

		_destroy: function() {
			this.element.removeClass('ui-sortable ui-sortable-disabled')
			this._mouseDestroy()

			for (var i = this.items.length - 1; i >= 0; i--)
				this.items[i].item.removeData(this.widgetName + '-item')

			return this
		},

		_setOption: function(key, value) {
			if (key === 'disabled') {
				this.options[key] = value

				this.widget().toggleClass('ui-sortable-disabled', !!value)
			} else {
				// Don't call widget base _setOption for disable as it adds ui-state-disabled class
				$.Widget.prototype._setOption.apply(this, arguments)
			}
		},

		_mouseCapture: function(event, overrideHandle) {
			var that = this

			if (this.reverting) {
				return false
			}

			if (this.options.disabled || this.options.type == 'static') return false

			//We have to refresh the items data once first
			this._refreshItems(event)

			//Find out if the clicked node (or one of its parents) is a actual item in this.items
			var currentItem = null,
				nodes = $(event.target).parents().each(function() {
					if ($.data(this, that.widgetName + '-item') == that) {
						currentItem = $(this)
						return false
					}
				})
			if ($.data(event.target, that.widgetName + '-item') == that)
				currentItem = $(event.target)

			if (!currentItem) return false
			if (this.options.handle && !overrideHandle) {
				var validHandle = false

				$(this.options.handle, currentItem)
					.find('*')
					.andSelf()
					.each(function() {
						if (this == event.target) validHandle = true
					})
				if (!validHandle) return false
			}

			this.currentItem = currentItem
			this._removeCurrentsFromItems()
			return true
		},

		_mouseStart: function(event, overrideHandle, noActivation) {
			var o = this.options
			this.currentContainer = this

			//We only need to call refreshPositions, because the refreshItems call has been moved to mouseCapture
			this.refreshPositions()

			//Create and append the visible helper
			this.helper = this._createHelper(event)

			//Cache the helper size
			this._cacheHelperProportions()

			/*
		 * - Position generation -
		 * This block generates everything position related - it's the core of draggables.
		 */

			//Cache the margins of the original element
			this._cacheMargins()

			//Get the next scrolling parent
			this.scrollParent = this.helper.scrollParent()

			//The element's absolute position on the page minus margins
			this.offset = this.currentItem.offset()
			this.offset = {
				top: this.offset.top - this.margins.top,
				left: this.offset.left - this.margins.left,
			}

			$.extend(this.offset, {
				click: {
					//Where the click happened, relative to the element
					left: event.pageX - this.offset.left,
					top: event.pageY - this.offset.top,
				},
				parent: this._getParentOffset(),
				relative: this._getRelativeOffset(), //This is a relative to absolute position minus the actual position calculation - only used for relative positioned helper
			})

			// Only after we got the offset, we can change the helper's position to absolute
			// TODO: Still need to figure out a way to make relative sorting possible
			this.helper.css('position', 'absolute')
			this.cssPosition = this.helper.css('position')

			//Generate the original position
			this.originalPosition = this._generatePosition(event)
			this.originalPageX = event.pageX
			this.originalPageY = event.pageY

			//Adjust the mouse offset relative to the helper if 'cursorAt' is supplied
			o.cursorAt && this._adjustOffsetFromHelper(o.cursorAt)

			//Cache the former DOM position
			this.domPosition = {
				prev: this.currentItem.prev()[0],
				parent: this.currentItem.parent()[0],
			}

			//If the helper is not the original, hide the original so it's not playing any role during the drag, won't cause anything bad this way
			if (this.helper[0] != this.currentItem[0]) {
				this.currentItem.hide()
			}

			//Create the placeholder
			this._createPlaceholder()

			//Set a containment if given in the options
			if (o.containment) this._setContainment()

			if (o.cursor) {
				// cursor option
				if ($('body').css('cursor'))
					this._storedCursor = $('body').css('cursor')
				$('body').css('cursor', o.cursor)
			}

			if (o.opacity) {
				// opacity option
				if (this.helper.css('opacity'))
					this._storedOpacity = this.helper.css('opacity')
				this.helper.css('opacity', o.opacity)
			}

			if (o.zIndex) {
				// zIndex option
				if (this.helper.css('zIndex'))
					this._storedZIndex = this.helper.css('zIndex')
				this.helper.css('zIndex', o.zIndex)
			}

			//Prepare scrolling
			if (
				this.scrollParent[0] != document &&
				this.scrollParent[0].tagName != 'HTML'
			)
				this.overflowOffset = this.scrollParent.offset()

			//Call callbacks
			this._trigger('start', event, this._uiHash())

			//Recache the helper size
			if (!this._preserveHelperProportions) this._cacheHelperProportions()

			//Post 'activate' events to possible containers
			if (!noActivation) {
				for (var i = this.containers.length - 1; i >= 0; i--) {
					this.containers[i]._trigger('activate', event, this._uiHash(this))
				}
			}

			//Prepare possible droppables
			if ($.ui.ddmanager) $.ui.ddmanager.current = this

			if ($.ui.ddmanager && !o.dropBehaviour)
				$.ui.ddmanager.prepareOffsets(this, event)

			this.dragging = true

			this.helper.addClass('ui-sortable-helper')
			this._mouseDrag(event) //Execute the drag once - this causes the helper not to be visible before getting its correct position
			return true
		},

		_mouseDrag: function(event) {
			//Compute the helpers position
			this.position = this._generatePosition(event)
			this.positionAbs = this._convertPositionTo('absolute')

			if (!this.lastPositionAbs) {
				this.lastPositionAbs = this.positionAbs
			}

			//Do scrolling
			if (this.options.scroll) {
				var o = this.options, scrolled = false
				if (
					this.scrollParent[0] != document &&
					this.scrollParent[0].tagName != 'HTML'
				) {
					if (
						this.overflowOffset.top +
							this.scrollParent[0].offsetHeight -
							event.pageY <
						o.scrollSensitivity
					)
						this.scrollParent[0].scrollTop = scrolled =
							this.scrollParent[0].scrollTop + o.scrollSpeed
					else if (event.pageY - this.overflowOffset.top < o.scrollSensitivity)
						this.scrollParent[0].scrollTop = scrolled =
							this.scrollParent[0].scrollTop - o.scrollSpeed

					if (
						this.overflowOffset.left +
							this.scrollParent[0].offsetWidth -
							event.pageX <
						o.scrollSensitivity
					)
						this.scrollParent[0].scrollLeft = scrolled =
							this.scrollParent[0].scrollLeft + o.scrollSpeed
					else if (event.pageX - this.overflowOffset.left < o.scrollSensitivity)
						this.scrollParent[0].scrollLeft = scrolled =
							this.scrollParent[0].scrollLeft - o.scrollSpeed
				} else {
					if (event.pageY - $(document).scrollTop() < o.scrollSensitivity)
						scrolled = $(document).scrollTop(
							$(document).scrollTop() - o.scrollSpeed
						)
					else if (
						$(window).height() - (event.pageY - $(document).scrollTop()) <
						o.scrollSensitivity
					)
						scrolled = $(document).scrollTop(
							$(document).scrollTop() + o.scrollSpeed
						)

					if (event.pageX - $(document).scrollLeft() < o.scrollSensitivity)
						scrolled = $(document).scrollLeft(
							$(document).scrollLeft() - o.scrollSpeed
						)
					else if (
						$(window).width() - (event.pageX - $(document).scrollLeft()) <
						o.scrollSensitivity
					)
						scrolled = $(document).scrollLeft(
							$(document).scrollLeft() + o.scrollSpeed
						)
				}

				if (scrolled !== false && $.ui.ddmanager && !o.dropBehaviour)
					$.ui.ddmanager.prepareOffsets(this, event)
			}

			//Regenerate the absolute position used for position checks
			this.positionAbs = this._convertPositionTo('absolute')

			//Set the helper position
			if (!this.options.axis || this.options.axis != 'y')
				this.helper[0].style.left = this.position.left + 'px'
			if (!this.options.axis || this.options.axis != 'x')
				this.helper[0].style.top = this.position.top + 'px'

			//Rearrange
			for (var i = this.items.length - 1; i >= 0; i--) {
				//Cache variables and intersection, continue if no intersection
				var item = this.items[i],
					itemElement = item.item[0],
					intersection = this._intersectsWithPointer(item)
				if (!intersection) continue

				// Only put the placeholder inside the current Container, skip all
				// items form other containers. This works because when moving
				// an item from one container to another the
				// currentContainer is switched before the placeholder is moved.
				//
				// Without this moving items in "sub-sortables" can cause the placeholder to jitter
				// beetween the outer and inner container.
				if (item.instance !== this.currentContainer) continue

				if (
					itemElement != this.currentItem[0] && //cannot intersect with itself
					this.placeholder[intersection == 1 ? 'next' : 'prev']()[0] !=
						itemElement && //no useless actions that have been done before
					!$.contains(this.placeholder[0], itemElement) && //no action if the item moved is the parent of the item checked
					(this.options.type == 'semi-dynamic'
						? !$.contains(this.element[0], itemElement)
						: true)
					//&& itemElement.parentNode == this.placeholder[0].parentNode // only rearrange items within the same container
				) {
					this.direction = intersection == 1 ? 'down' : 'up'

					if (
						this.options.tolerance == 'pointer' ||
						this._intersectsWithSides(item)
					) {
						this._rearrange(event, item)
					} else {
						break
					}

					this._trigger('change', event, this._uiHash())
					break
				}
			}

			//Post events to containers
			this._contactContainers(event)

			//Interconnect with droppables
			if ($.ui.ddmanager) $.ui.ddmanager.drag(this, event)

			//Call callbacks
			this._trigger('sort', event, this._uiHash())

			this.lastPositionAbs = this.positionAbs
			return false
		},

		_mouseStop: function(event, noPropagation) {
			if (!event) return

			//If we are using droppables, inform the manager about the drop
			if ($.ui.ddmanager && !this.options.dropBehaviour)
				$.ui.ddmanager.drop(this, event)

			if (this.options.revert) {
				var that = this
				var cur = this.placeholder.offset()

				this.reverting = true

				$(this.helper).animate(
					{
						left: cur.left -
							this.offset.parent.left -
							this.margins.left +
							(this.offsetParent[0] == document.body
								? 0
								: this.offsetParent[0].scrollLeft),
						top: cur.top -
							this.offset.parent.top -
							this.margins.top +
							(this.offsetParent[0] == document.body
								? 0
								: this.offsetParent[0].scrollTop),
					},
					parseInt(this.options.revert, 10) || 500,
					function() {
						that._clear(event)
					}
				)
			} else {
				this._clear(event, noPropagation)
			}

			return false
		},

		cancel: function() {
			if (this.dragging) {
				this._mouseUp({ target: null })

				if (this.options.helper == 'original')
					this.currentItem
						.css(this._storedCSS)
						.removeClass('ui-sortable-helper')
				else this.currentItem.show()

				//Post deactivating events to containers
				for (var i = this.containers.length - 1; i >= 0; i--) {
					this.containers[i]._trigger('deactivate', null, this._uiHash(this))
					if (this.containers[i].containerCache.over) {
						this.containers[i]._trigger('out', null, this._uiHash(this))
						this.containers[i].containerCache.over = 0
					}
				}
			}

			if (this.placeholder) {
				//$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
				if (this.placeholder[0].parentNode)
					this.placeholder[0].parentNode.removeChild(this.placeholder[0])
				if (
					this.options.helper != 'original' &&
					this.helper &&
					this.helper[0].parentNode
				)
					this.helper.remove()

				$.extend(this, {
					helper: null,
					dragging: false,
					reverting: false,
					_noFinalSort: null,
				})

				if (this.domPosition.prev) {
					$(this.domPosition.prev).after(this.currentItem)
				} else {
					$(this.domPosition.parent).prepend(this.currentItem)
				}
			}

			return this
		},

		serialize: function(o) {
			var items = this._getItemsAsjQuery(o && o.connected)
			var str = []
			o = o || {}

			$(items).each(function() {
				var res = ($(o.item || this).attr(o.attribute || 'id') || '')
					.match(o.expression || /(.+)[-=_](.+)/)
				if (res)
					str.push(
						(o.key || res[1] + '[]') +
							'=' +
							(o.key && o.expression ? res[1] : res[2])
					)
			})

			if (!str.length && o.key) {
				str.push(o.key + '=')
			}

			return str.join('&')
		},

		toArray: function(o) {
			var items = this._getItemsAsjQuery(o && o.connected)
			var ret = []
			o = o || {}

			items.each(function() {
				ret.push($(o.item || this).attr(o.attribute || 'id') || '')
			})
			return ret
		},

		/* Be careful with the following core functions */
		_intersectsWith: function(item) {
			var x1 = this.positionAbs.left,
				x2 = x1 + this.helperProportions.width,
				y1 = this.positionAbs.top,
				y2 = y1 + this.helperProportions.height

			var l = item.left, r = l + item.width, t = item.top, b = t + item.height

			var dyClick = this.offset.click.top, dxClick = this.offset.click.left

			var isOverElement =
				y1 + dyClick > t &&
				y1 + dyClick < b &&
				x1 + dxClick > l &&
				x1 + dxClick < r

			if (
				this.options.tolerance == 'pointer' ||
				this.options.forcePointerForContainers ||
				(this.options.tolerance != 'pointer' &&
					this.helperProportions[this.floating ? 'width' : 'height'] >
						item[this.floating ? 'width' : 'height'])
			) {
				return isOverElement
			} else {
				return (
					l < x1 + this.helperProportions.width / 2 && // Right Half
					x2 - this.helperProportions.width / 2 < r && // Left Half
					t < y1 + this.helperProportions.height / 2 && // Bottom Half
					y2 - this.helperProportions.height / 2 < b
				) // Top Half
			}
		},

		_intersectsWithPointer: function(item) {
			var isOverElementHeight =
				this.options.axis === 'x' ||
				$.ui.isOverAxis(
					this.positionAbs.top + this.offset.click.top,
					item.top,
					item.height
				),
				isOverElementWidth =
					this.options.axis === 'y' ||
					$.ui.isOverAxis(
						this.positionAbs.left + this.offset.click.left,
						item.left,
						item.width
					),
				isOverElement = isOverElementHeight && isOverElementWidth,
				verticalDirection = this._getDragVerticalDirection(),
				horizontalDirection = this._getDragHorizontalDirection()

			if (!isOverElement) return false

			return this.floating
				? (horizontalDirection && horizontalDirection == 'right') ||
						verticalDirection == 'down'
						? 2
						: 1
				: verticalDirection && (verticalDirection == 'down' ? 2 : 1)
		},

		_intersectsWithSides: function(item) {
			var isOverBottomHalf = $.ui.isOverAxis(
				this.positionAbs.top + this.offset.click.top,
				item.top + item.height / 2,
				item.height
			),
				isOverRightHalf = $.ui.isOverAxis(
					this.positionAbs.left + this.offset.click.left,
					item.left + item.width / 2,
					item.width
				),
				verticalDirection = this._getDragVerticalDirection(),
				horizontalDirection = this._getDragHorizontalDirection()

			if (this.floating && horizontalDirection) {
				return (
					(horizontalDirection == 'right' && isOverRightHalf) ||
					(horizontalDirection == 'left' && !isOverRightHalf)
				)
			} else {
				return (
					verticalDirection &&
					((verticalDirection == 'down' && isOverBottomHalf) ||
						(verticalDirection == 'up' && !isOverBottomHalf))
				)
			}
		},

		_getDragVerticalDirection: function() {
			var delta = this.positionAbs.top - this.lastPositionAbs.top
			return delta != 0 && (delta > 0 ? 'down' : 'up')
		},

		_getDragHorizontalDirection: function() {
			var delta = this.positionAbs.left - this.lastPositionAbs.left
			return delta != 0 && (delta > 0 ? 'right' : 'left')
		},

		refresh: function(event) {
			this._refreshItems(event)
			this.refreshPositions()
			return this
		},

		_connectWith: function() {
			var options = this.options
			return options.connectWith.constructor == String
				? [options.connectWith]
				: options.connectWith
		},

		_getItemsAsjQuery: function(connected) {
			var items = []
			var queries = []
			var connectWith = this._connectWith()

			if (connectWith && connected) {
				for (var i = connectWith.length - 1; i >= 0; i--) {
					var cur = $(connectWith[i])
					for (var j = cur.length - 1; j >= 0; j--) {
						var inst = $.data(cur[j], this.widgetName)
						if (inst && inst != this && !inst.options.disabled) {
							queries.push([
								$.isFunction(inst.options.items)
									? inst.options.items.call(inst.element)
									: $(inst.options.items, inst.element)
											.not('.ui-sortable-helper')
											.not('.ui-sortable-placeholder'),
								inst,
							])
						}
					}
				}
			}

			queries.push([
				$.isFunction(this.options.items)
					? this.options.items.call(this.element, null, {
							options: this.options,
							item: this.currentItem,
						})
					: $(this.options.items, this.element)
							.not('.ui-sortable-helper')
							.not('.ui-sortable-placeholder'),
				this,
			])

			for (var i = queries.length - 1; i >= 0; i--) {
				queries[i][0].each(function() {
					items.push(this)
				})
			}

			return $(items)
		},

		_removeCurrentsFromItems: function() {
			var list = this.currentItem.find(':data(' + this.widgetName + '-item)')

			this.items = $.grep(this.items, function(item) {
				for (var j = 0; j < list.length; j++) {
					if (list[j] == item.item[0]) return false
				}
				return true
			})
		},

		_refreshItems: function(event) {
			this.items = []
			this.containers = [this]
			var items = this.items
			var queries = [
				[
					$.isFunction(this.options.items)
						? this.options.items.call(this.element[0], event, {
								item: this.currentItem,
							})
						: $(this.options.items, this.element),
					this,
				],
			]
			var connectWith = this._connectWith()

			if (connectWith && this.ready) {
				//Shouldn't be run the first time through due to massive slow-down
				for (var i = connectWith.length - 1; i >= 0; i--) {
					var cur = $(connectWith[i])
					for (var j = cur.length - 1; j >= 0; j--) {
						var inst = $.data(cur[j], this.widgetName)
						if (inst && inst != this && !inst.options.disabled) {
							queries.push([
								$.isFunction(inst.options.items)
									? inst.options.items.call(inst.element[0], event, {
											item: this.currentItem,
										})
									: $(inst.options.items, inst.element),
								inst,
							])
							this.containers.push(inst)
						}
					}
				}
			}

			for (var i = queries.length - 1; i >= 0; i--) {
				var targetData = queries[i][1]
				var _queries = queries[i][0]

				for (
					var j = 0, queriesLength = _queries.length;
					j < queriesLength;
					j++
				) {
					var item = $(_queries[j])

					item.data(this.widgetName + '-item', targetData) // Data for target checking (mouse manager)

					items.push({
						item: item,
						instance: targetData,
						width: 0,
						height: 0,
						left: 0,
						top: 0,
					})
				}
			}
		},

		refreshPositions: function(fast) {
			//This has to be redone because due to the item being moved out/into the offsetParent, the offsetParent's position will change
			if (this.offsetParent && this.helper) {
				this.offset.parent = this._getParentOffset()
			}

			for (var i = this.items.length - 1; i >= 0; i--) {
				var item = this.items[i]

				//We ignore calculating positions of all connected containers when we're not over them
				if (
					item.instance != this.currentContainer &&
					this.currentContainer &&
					item.item[0] != this.currentItem[0]
				)
					continue

				var t = this.options.toleranceElement
					? $(this.options.toleranceElement, item.item)
					: item.item

				if (!fast) {
					item.width = t.outerWidth()
					item.height = t.outerHeight()
				}

				var p = t.offset()
				item.left = p.left
				item.top = p.top
			}

			if (this.options.custom && this.options.custom.refreshContainers) {
				this.options.custom.refreshContainers.call(this)
			} else {
				for (var i = this.containers.length - 1; i >= 0; i--) {
					var p = this.containers[i].element.offset()
					this.containers[i].containerCache.left = p.left
					this.containers[i].containerCache.top = p.top
					this.containers[i].containerCache.width = this.containers[
						i
					].element.outerWidth()
					this.containers[i].containerCache.height = this.containers[
						i
					].element.outerHeight()
				}
			}

			return this
		},

		_createPlaceholder: function(that) {
			that = that || this
			var o = that.options

			if (!o.placeholder || o.placeholder.constructor == String) {
				var className = o.placeholder
				o.placeholder = {
					element: function() {
						var el = $(document.createElement(that.currentItem[0].nodeName))
							.addClass(
								className ||
									that.currentItem[0].className + ' ui-sortable-placeholder'
							)
							.removeClass('ui-sortable-helper')[0]

						if (!className) el.style.visibility = 'hidden'

						return el
					},
					update: function(container, p) {
						// 1. If a className is set as 'placeholder option, we don't force sizes - the class is responsible for that
						// 2. The option 'forcePlaceholderSize can be enabled to force it even if a class name is specified
						if (className && !o.forcePlaceholderSize) return

						//If the element doesn't have a actual height by itself (without styles coming from a stylesheet), it receives the inline height from the dragged item
						if (!p.height()) {
							p.height(
								that.currentItem.innerHeight() -
									parseInt(that.currentItem.css('paddingTop') || 0, 10) -
									parseInt(that.currentItem.css('paddingBottom') || 0, 10)
							)
						}
						if (!p.width()) {
							p.width(
								that.currentItem.innerWidth() -
									parseInt(that.currentItem.css('paddingLeft') || 0, 10) -
									parseInt(that.currentItem.css('paddingRight') || 0, 10)
							)
						}
					},
				}
			}

			//Create the placeholder
			that.placeholder = $(
				o.placeholder.element.call(that.element, that.currentItem)
			)

			//Append it after the actual current item
			that.currentItem.after(that.placeholder)

			//Update the size of the placeholder (TODO: Logic to fuzzy, see line 316/317)
			o.placeholder.update(that, that.placeholder)
		},

		_contactContainers: function(event) {
			// get innermost container that intersects with item
			var innermostContainer = null, innermostIndex = null

			for (var i = this.containers.length - 1; i >= 0; i--) {
				// never consider a container that's located within the item itself
				if ($.contains(this.currentItem[0], this.containers[i].element[0]))
					continue

				if (this._intersectsWith(this.containers[i].containerCache)) {
					// if we've already found a container and it's more "inner" than this, then continue
					if (
						innermostContainer &&
						$.contains(
							this.containers[i].element[0],
							innermostContainer.element[0]
						)
					)
						continue

					innermostContainer = this.containers[i]
					innermostIndex = i
				} else {
					// container doesn't intersect. trigger "out" event if necessary
					if (this.containers[i].containerCache.over) {
						this.containers[i]._trigger('out', event, this._uiHash(this))
						this.containers[i].containerCache.over = 0
					}
				}
			}

			// if no intersecting containers found, return
			if (!innermostContainer) return

			// move the item into the container if it's not there already
			if (this.containers.length === 1) {
				this.containers[innermostIndex]._trigger(
					'over',
					event,
					this._uiHash(this)
				)
				this.containers[innermostIndex].containerCache.over = 1
			} else {
				//When entering a new container, we will find the item with the least distance and append our item near it
				var dist = 10000
				var itemWithLeastDistance = null
				var posProperty = this.containers[innermostIndex].floating
					? 'left'
					: 'top'
				var sizeProperty = this.containers[innermostIndex].floating
					? 'width'
					: 'height'
				var base =
					this.positionAbs[posProperty] + this.offset.click[posProperty]
				for (var j = this.items.length - 1; j >= 0; j--) {
					if (
						!$.contains(
							this.containers[innermostIndex].element[0],
							this.items[j].item[0]
						)
					)
						continue
					if (this.items[j].item[0] == this.currentItem[0]) continue
					var cur = this.items[j].item.offset()[posProperty]
					var nearBottom = false
					if (
						Math.abs(cur - base) >
						Math.abs(cur + this.items[j][sizeProperty] - base)
					) {
						nearBottom = true
						cur += this.items[j][sizeProperty]
					}

					if (Math.abs(cur - base) < dist) {
						dist = Math.abs(cur - base)
						itemWithLeastDistance = this.items[j]
						this.direction = nearBottom ? 'up' : 'down'
					}
				}

				if (
					!itemWithLeastDistance &&
					!this.options.dropOnEmpty //Check if dropOnEmpty is enabled
				)
					return

				this.currentContainer = this.containers[innermostIndex]
				itemWithLeastDistance
					? this._rearrange(event, itemWithLeastDistance, null, true)
					: this._rearrange(
							event,
							null,
							this.containers[innermostIndex].element,
							true
						)
				this._trigger('change', event, this._uiHash())
				this.containers[innermostIndex]._trigger(
					'change',
					event,
					this._uiHash(this)
				)

				//Update the placeholder
				this.options.placeholder.update(this.currentContainer, this.placeholder)

				this.containers[innermostIndex]._trigger(
					'over',
					event,
					this._uiHash(this)
				)
				this.containers[innermostIndex].containerCache.over = 1
			}
		},

		_createHelper: function(event) {
			var o = this.options
			var helper = $.isFunction(o.helper)
				? $(o.helper.apply(this.element[0], [event, this.currentItem]))
				: o.helper == 'clone' ? this.currentItem.clone() : this.currentItem

			if (
				!helper.parents('body').length //Add the helper to the DOM if that didn't happen already
			)
				$(
					o.appendTo != 'parent' ? o.appendTo : this.currentItem[0].parentNode
				)[0].appendChild(helper[0])

			if (helper[0] == this.currentItem[0])
				this._storedCSS = {
					width: this.currentItem[0].style.width,
					height: this.currentItem[0].style.height,
					position: this.currentItem.css('position'),
					top: this.currentItem.css('top'),
					left: this.currentItem.css('left'),
				}

			if (helper[0].style.width == '' || o.forceHelperSize)
				helper.width(this.currentItem.width())
			if (helper[0].style.height == '' || o.forceHelperSize)
				helper.height(this.currentItem.height())

			return helper
		},

		_adjustOffsetFromHelper: function(obj) {
			if (typeof obj == 'string') {
				obj = obj.split(' ')
			}
			if ($.isArray(obj)) {
				obj = { left: +obj[0], top: +obj[1] || 0 }
			}
			if ('left' in obj) {
				this.offset.click.left = obj.left + this.margins.left
			}
			if ('right' in obj) {
				this.offset.click.left =
					this.helperProportions.width - obj.right + this.margins.left
			}
			if ('top' in obj) {
				this.offset.click.top = obj.top + this.margins.top
			}
			if ('bottom' in obj) {
				this.offset.click.top =
					this.helperProportions.height - obj.bottom + this.margins.top
			}
		},

		_getParentOffset: function() {
			//Get the offsetParent and cache its position
			this.offsetParent = this.helper.offsetParent()
			var po = this.offsetParent.offset()

			// This is a special case where we need to modify a offset calculated on start, since the following happened:
			// 1. The position of the helper is absolute, so it's position is calculated based on the next positioned parent
			// 2. The actual offset parent is a child of the scroll parent, and the scroll parent isn't the document, which means that
			//    the scroll is included in the initial calculation of the offset of the parent, and never recalculated upon drag
			if (
				this.cssPosition == 'absolute' &&
				this.scrollParent[0] != document &&
				$.contains(this.scrollParent[0], this.offsetParent[0])
			) {
				po.left += this.scrollParent.scrollLeft()
				po.top += this.scrollParent.scrollTop()
			}

			if (
				this.offsetParent[0] == document.body || //This needs to be actually done for all browsers, since pageX/pageY includes this information
				(this.offsetParent[0].tagName &&
					this.offsetParent[0].tagName.toLowerCase() == 'html' &&
					$.ui.ie) //Ugly IE fix
			)
				po = { top: 0, left: 0 }

			return {
				top: po.top +
					(parseInt(this.offsetParent.css('borderTopWidth'), 10) || 0),
				left: po.left +
					(parseInt(this.offsetParent.css('borderLeftWidth'), 10) || 0),
			}
		},

		_getRelativeOffset: function() {
			if (this.cssPosition == 'relative') {
				var p = this.currentItem.position()
				return {
					top: p.top -
						(parseInt(this.helper.css('top'), 10) || 0) +
						this.scrollParent.scrollTop(),
					left: p.left -
						(parseInt(this.helper.css('left'), 10) || 0) +
						this.scrollParent.scrollLeft(),
				}
			} else {
				return { top: 0, left: 0 }
			}
		},

		_cacheMargins: function() {
			this.margins = {
				left: parseInt(this.currentItem.css('marginLeft'), 10) || 0,
				top: parseInt(this.currentItem.css('marginTop'), 10) || 0,
			}
		},

		_cacheHelperProportions: function() {
			this.helperProportions = {
				width: this.helper.outerWidth(),
				height: this.helper.outerHeight(),
			}
		},

		_setContainment: function() {
			var o = this.options
			if (o.containment == 'parent') o.containment = this.helper[0].parentNode
			if (o.containment == 'document' || o.containment == 'window')
				this.containment = [
					0 - this.offset.relative.left - this.offset.parent.left,
					0 - this.offset.relative.top - this.offset.parent.top,
					$(o.containment == 'document' ? document : window).width() -
						this.helperProportions.width -
						this.margins.left,
					($(o.containment == 'document' ? document : window).height() ||
						document.body.parentNode.scrollHeight) -
						this.helperProportions.height -
						this.margins.top,
				]

			if (!/^(document|window|parent)$/.test(o.containment)) {
				var ce = $(o.containment)[0]
				var co = $(o.containment).offset()
				var over = $(ce).css('overflow') != 'hidden'

				this.containment = [
					co.left +
						(parseInt($(ce).css('borderLeftWidth'), 10) || 0) +
						(parseInt($(ce).css('paddingLeft'), 10) || 0) -
						this.margins.left,
					co.top +
						(parseInt($(ce).css('borderTopWidth'), 10) || 0) +
						(parseInt($(ce).css('paddingTop'), 10) || 0) -
						this.margins.top,
					co.left +
						(over ? Math.max(ce.scrollWidth, ce.offsetWidth) : ce.offsetWidth) -
						(parseInt($(ce).css('borderLeftWidth'), 10) || 0) -
						(parseInt($(ce).css('paddingRight'), 10) || 0) -
						this.helperProportions.width -
						this.margins.left,
					co.top +
						(over
							? Math.max(ce.scrollHeight, ce.offsetHeight)
							: ce.offsetHeight) -
						(parseInt($(ce).css('borderTopWidth'), 10) || 0) -
						(parseInt($(ce).css('paddingBottom'), 10) || 0) -
						this.helperProportions.height -
						this.margins.top,
				]
			}
		},

		_convertPositionTo: function(d, pos) {
			if (!pos) pos = this.position
			var mod = d == 'absolute' ? 1 : -1
			var o = this.options,
				scroll = this.cssPosition == 'absolute' &&
					!(this.scrollParent[0] != document &&
						$.contains(this.scrollParent[0], this.offsetParent[0]))
					? this.offsetParent
					: this.scrollParent,
				scrollIsRootNode = /(html|body)/i.test(scroll[0].tagName)

			return {
				top: pos.top + // The absolute mouse position
				this.offset.relative.top * mod + // Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.top * mod - // The offsetParent's offset without borders (offset + border)
					(this.cssPosition == 'fixed'
						? -this.scrollParent.scrollTop()
						: scrollIsRootNode ? 0 : scroll.scrollTop()) *
						mod,
				left: pos.left + // The absolute mouse position
				this.offset.relative.left * mod + // Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.left * mod - // The offsetParent's offset without borders (offset + border)
					(this.cssPosition == 'fixed'
						? -this.scrollParent.scrollLeft()
						: scrollIsRootNode ? 0 : scroll.scrollLeft()) *
						mod,
			}
		},

		_generatePosition: function(event) {
			var o = this.options,
				scroll = this.cssPosition == 'absolute' &&
					!(this.scrollParent[0] != document &&
						$.contains(this.scrollParent[0], this.offsetParent[0]))
					? this.offsetParent
					: this.scrollParent,
				scrollIsRootNode = /(html|body)/i.test(scroll[0].tagName)

			// This is another very weird special case that only happens for relative elements:
			// 1. If the css position is relative
			// 2. and the scroll parent is the document or similar to the offset parent
			// we have to refresh the relative offset during the scroll so there are no jumps
			if (
				this.cssPosition == 'relative' &&
				!(this.scrollParent[0] != document &&
					this.scrollParent[0] != this.offsetParent[0])
			) {
				this.offset.relative = this._getRelativeOffset()
			}

			var pageX = event.pageX
			var pageY = event.pageY

			/*
		 * - Position constraining -
		 * Constrain the position to a mix of grid, containment.
		 */

			if (this.originalPosition) {
				//If we are not dragging yet, we won't check for options

				if (this.containment) {
					if (event.pageX - this.offset.click.left < this.containment[0])
						pageX = this.containment[0] + this.offset.click.left
					if (event.pageY - this.offset.click.top < this.containment[1])
						pageY = this.containment[1] + this.offset.click.top
					if (event.pageX - this.offset.click.left > this.containment[2])
						pageX = this.containment[2] + this.offset.click.left
					if (event.pageY - this.offset.click.top > this.containment[3])
						pageY = this.containment[3] + this.offset.click.top
				}

				if (o.grid) {
					var top =
						this.originalPageY +
						Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1]
					pageY = this.containment
						? !(top - this.offset.click.top < this.containment[1] ||
								top - this.offset.click.top > this.containment[3])
								? top
								: !(top - this.offset.click.top < this.containment[1])
										? top - o.grid[1]
										: top + o.grid[1]
						: top

					var left =
						this.originalPageX +
						Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0]
					pageX = this.containment
						? !(left - this.offset.click.left < this.containment[0] ||
								left - this.offset.click.left > this.containment[2])
								? left
								: !(left - this.offset.click.left < this.containment[0])
										? left - o.grid[0]
										: left + o.grid[0]
						: left
				}
			}

			return {
				top: pageY - // The absolute mouse position
				this.offset.click.top - // Click offset (relative to the element)
				this.offset.relative.top - // Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.top + // The offsetParent's offset without borders (offset + border)
					(this.cssPosition == 'fixed'
						? -this.scrollParent.scrollTop()
						: scrollIsRootNode ? 0 : scroll.scrollTop()),
				left: pageX - // The absolute mouse position
				this.offset.click.left - // Click offset (relative to the element)
				this.offset.relative.left - // Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.left + // The offsetParent's offset without borders (offset + border)
					(this.cssPosition == 'fixed'
						? -this.scrollParent.scrollLeft()
						: scrollIsRootNode ? 0 : scroll.scrollLeft()),
			}
		},

		_rearrange: function(event, i, a, hardRefresh) {
			a
				? a[0].appendChild(this.placeholder[0])
				: i.item[0].parentNode.insertBefore(
						this.placeholder[0],
						this.direction == 'down' ? i.item[0] : i.item[0].nextSibling
					)

			//Various things done here to improve the performance:
			// 1. we create a setTimeout, that calls refreshPositions
			// 2. on the instance, we have a counter variable, that get's higher after every append
			// 3. on the local scope, we copy the counter variable, and check in the timeout, if it's still the same
			// 4. this lets only the last addition to the timeout stack through
			this.counter = this.counter ? ++this.counter : 1
			var counter = this.counter

			this._delay(function() {
				if (counter == this.counter) this.refreshPositions(!hardRefresh) //Precompute after each DOM insertion, NOT on mousemove
			})
		},

		_clear: function(event, noPropagation) {
			this.reverting = false
			// We delay all events that have to be triggered to after the point where the placeholder has been removed and
			// everything else normalized again
			var delayedTriggers = []

			// We first have to update the dom position of the actual currentItem
			// Note: don't do it if the current item is already removed (by a user), or it gets reappended (see #4088)
			if (!this._noFinalSort && this.currentItem.parent().length)
				this.placeholder.before(this.currentItem)
			this._noFinalSort = null

			if (this.helper[0] == this.currentItem[0]) {
				for (var i in this._storedCSS) {
					if (this._storedCSS[i] == 'auto' || this._storedCSS[i] == 'static')
						this._storedCSS[i] = ''
				}
				this.currentItem.css(this._storedCSS).removeClass('ui-sortable-helper')
			} else {
				this.currentItem.show()
			}

			if (this.fromOutside && !noPropagation)
				delayedTriggers.push(function(event) {
					this._trigger('receive', event, this._uiHash(this.fromOutside))
				})
			if (
				(this.fromOutside ||
					this.domPosition.prev !=
						this.currentItem.prev().not('.ui-sortable-helper')[0] ||
					this.domPosition.parent != this.currentItem.parent()[0]) &&
				!noPropagation
			)
				delayedTriggers.push(function(event) {
					this._trigger('update', event, this._uiHash())
				}) //Trigger update callback if the DOM position has changed

			// Check if the items Container has Changed and trigger appropriate
			// events.
			if (this !== this.currentContainer) {
				if (!noPropagation) {
					delayedTriggers.push(function(event) {
						this._trigger('remove', event, this._uiHash())
					})
					delayedTriggers.push(
						function(c) {
							return function(event) {
								c._trigger('receive', event, this._uiHash(this))
							}
						}.call(this, this.currentContainer)
					)
					delayedTriggers.push(
						function(c) {
							return function(event) {
								c._trigger('update', event, this._uiHash(this))
							}
						}.call(this, this.currentContainer)
					)
				}
			}

			//Post events to containers
			for (var i = this.containers.length - 1; i >= 0; i--) {
				if (!noPropagation)
					delayedTriggers.push(
						function(c) {
							return function(event) {
								c._trigger('deactivate', event, this._uiHash(this))
							}
						}.call(this, this.containers[i])
					)
				if (this.containers[i].containerCache.over) {
					delayedTriggers.push(
						function(c) {
							return function(event) {
								c._trigger('out', event, this._uiHash(this))
							}
						}.call(this, this.containers[i])
					)
					this.containers[i].containerCache.over = 0
				}
			}

			//Do what was originally in plugins
			if (this._storedCursor) $('body').css('cursor', this._storedCursor) //Reset cursor
			if (this._storedOpacity) this.helper.css('opacity', this._storedOpacity) //Reset opacity
			if (this._storedZIndex)
				this.helper.css(
					'zIndex',
					this._storedZIndex == 'auto' ? '' : this._storedZIndex
				) //Reset z-index

			this.dragging = false
			if (this.cancelHelperRemoval) {
				if (!noPropagation) {
					this._trigger('beforeStop', event, this._uiHash())
					for (var i = 0; i < delayedTriggers.length; i++) {
						delayedTriggers[i].call(this, event)
					} //Trigger all delayed events
					this._trigger('stop', event, this._uiHash())
				}

				this.fromOutside = false
				return false
			}

			if (!noPropagation) this._trigger('beforeStop', event, this._uiHash())

			//$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
			this.placeholder[0].parentNode.removeChild(this.placeholder[0])

			if (this.helper[0] != this.currentItem[0]) this.helper.remove()
			this.helper = null

			if (!noPropagation) {
				for (var i = 0; i < delayedTriggers.length; i++) {
					delayedTriggers[i].call(this, event)
				} //Trigger all delayed events
				this._trigger('stop', event, this._uiHash())
			}

			this.fromOutside = false
			return true
		},

		_trigger: function() {
			if ($.Widget.prototype._trigger.apply(this, arguments) === false) {
				this.cancel()
			}
		},

		_uiHash: function(_inst) {
			var inst = _inst || this
			return {
				helper: inst.helper,
				placeholder: inst.placeholder || $([]),
				position: inst.position,
				originalPosition: inst.originalPosition,
				offset: inst.positionAbs,
				item: inst.currentItem,
				sender: _inst ? _inst.element : null,
			}
		},
	})
})(jQuery)
;(function($, undefined) {
	$.extend($.ui, { datepicker: { version: '1.9.2' } })

	var PROP_NAME = 'datepicker'
	var dpuuid = new Date().getTime()
	var instActive

	/* Date picker manager.
   Use the singleton instance of this class, $.datepicker, to interact with the date picker.
   Settings for (groups of) date pickers are maintained in an instance object,
   allowing multiple different settings on the same page. */

	function Datepicker() {
		this.debug = false // Change this to true to start debugging
		this._curInst = null // The current instance in use
		this._keyEvent = false // If the last event was a key event
		this._disabledInputs = [] // List of date picker inputs that have been disabled
		this._datepickerShowing = false // True if the popup picker is showing , false if not
		this._inDialog = false // True if showing within a "dialog", false if not
		this._mainDivId = 'ui-datepicker-div' // The ID of the main datepicker division
		this._inlineClass = 'ui-datepicker-inline' // The name of the inline marker class
		this._appendClass = 'ui-datepicker-append' // The name of the append marker class
		this._triggerClass = 'ui-datepicker-trigger' // The name of the trigger marker class
		this._dialogClass = 'ui-datepicker-dialog' // The name of the dialog marker class
		this._disableClass = 'ui-datepicker-disabled' // The name of the disabled covering marker class
		this._unselectableClass = 'ui-datepicker-unselectable' // The name of the unselectable cell marker class
		this._currentClass = 'ui-datepicker-current-day' // The name of the current day marker class
		this._dayOverClass = 'ui-datepicker-days-cell-over' // The name of the day hover marker class
		this.regional = [] // Available regional settings, indexed by language code
		this.regional[''] = {
			// Default regional settings
			closeText: 'Done', // Display text for close link
			prevText: 'Prev', // Display text for previous month link
			nextText: 'Next', // Display text for next month link
			currentText: 'Today', // Display text for current month link
			monthNames: [
				'January',
				'February',
				'March',
				'April',
				'May',
				'June',
				'July',
				'August',
				'September',
				'October',
				'November',
				'December',
			], // Names of months for drop-down and formatting
			monthNamesShort: [
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'May',
				'Jun',
				'Jul',
				'Aug',
				'Sep',
				'Oct',
				'Nov',
				'Dec',
			], // For formatting
			dayNames: [
				'Sunday',
				'Monday',
				'Tuesday',
				'Wednesday',
				'Thursday',
				'Friday',
				'Saturday',
			], // For formatting
			dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], // For formatting
			dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], // Column headings for days starting at Sunday
			weekHeader: 'Wk', // Column header for week of the year
			dateFormat: 'mm/dd/yy', // See format options on parseDate
			firstDay: 0, // The first day of the week, Sun = 0, Mon = 1, ...
			isRTL: false, // True if right-to-left language, false if left-to-right
			showMonthAfterYear: false, // True if the year select precedes month, false for month then year
			yearSuffix: '', // Additional text to append to the year in the month headers
		}
		this._defaults = {
			// Global defaults for all the date picker instances
			showOn: 'focus', // 'focus' for popup on focus,
			// 'button' for trigger button, or 'both' for either
			showAnim: 'fadeIn', // Name of jQuery animation for popup
			showOptions: {}, // Options for enhanced animations
			defaultDate: null, // Used when field is blank: actual date,
			// +/-number for offset from today, null for today
			appendText: '', // Display text following the input box, e.g. showing the format
			buttonText: '...', // Text for trigger button
			buttonImage: '', // URL for trigger button image
			buttonImageOnly: false, // True if the image appears alone, false if it appears on a button
			hideIfNoPrevNext: false, // True to hide next/previous month links
			// if not applicable, false to just disable them
			navigationAsDateFormat: false, // True if date formatting applied to prev/today/next links
			gotoCurrent: false, // True if today link goes back to current selection instead
			changeMonth: false, // True if month can be selected directly, false if only prev/next
			changeYear: false, // True if year can be selected directly, false if only prev/next
			yearRange: 'c-10:c+10', // Range of years to display in drop-down,
			// either relative to today's year (-nn:+nn), relative to currently displayed year
			// (c-nn:c+nn), absolute (nnnn:nnnn), or a combination of the above (nnnn:-n)
			showOtherMonths: false, // True to show dates in other months, false to leave blank
			selectOtherMonths: false, // True to allow selection of dates in other months, false for unselectable
			showWeek: false, // True to show week of the year, false to not show it
			calculateWeek: this.iso8601Week, // How to calculate the week of the year,
			// takes a Date and returns the number of the week for it
			shortYearCutoff: '+10', // Short year values < this are in the current century,
			// > this are in the previous century,
			// string value starting with '+' for current year + value
			minDate: null, // The earliest selectable date, or null for no limit
			maxDate: null, // The latest selectable date, or null for no limit
			duration: 'fast', // Duration of display/closure
			beforeShowDay: null, // Function that takes a date and returns an array with
			// [0] = true if selectable, false if not, [1] = custom CSS class name(s) or '',
			// [2] = cell title (optional), e.g. $.datepicker.noWeekends
			beforeShow: null, // Function that takes an input field and
			// returns a set of custom settings for the date picker
			onSelect: null, // Define a callback function when a date is selected
			onChangeMonthYear: null, // Define a callback function when the month or year is changed
			onClose: null, // Define a callback function when the datepicker is closed
			numberOfMonths: 1, // Number of months to show at a time
			showCurrentAtPos: 0, // The position in multipe months at which to show the current month (starting at 0)
			stepMonths: 1, // Number of months to step back/forward
			stepBigMonths: 12, // Number of months to step back/forward for the big links
			altField: '', // Selector for an alternate field to store selected dates into
			altFormat: '', // The date format to use for the alternate field
			constrainInput: true, // The input is constrained by the current date format
			showButtonPanel: false, // True to show button panel, false to not show it
			autoSize: false, // True to size the input for the date format, false to leave as is
			disabled: false, // The initial disabled state
		}
		$.extend(this._defaults, this.regional[''])
		this.dpDiv = bindHover(
			$(
				'<div id="' +
					this._mainDivId +
					'" class="ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all"></div>'
			)
		)
	}

	$.extend(Datepicker.prototype, {
		/* Class name added to elements to indicate already configured with a date picker. */
		markerClassName: 'hasDatepicker',

		//Keep track of the maximum number of rows displayed (see #7043)
		maxRows: 4,

		/* Debug logging (if enabled). */
		log: function() {
			if (this.debug) console.log.apply('', arguments)
		},

		// TODO rename to "widget" when switching to widget factory
		_widgetDatepicker: function() {
			return this.dpDiv
		},

		/* Override the default settings for all instances of the date picker.
	   @param  settings  object - the new settings to use as defaults (anonymous object)
	   @return the manager object */
		setDefaults: function(settings) {
			extendRemove(this._defaults, settings || {})
			return this
		},

		/* Attach the date picker to a jQuery selection.
	   @param  target    element - the target input field or division or span
	   @param  settings  object - the new settings to use for this date picker instance (anonymous) */
		_attachDatepicker: function(target, settings) {
			// check for settings on the control itself - in namespace 'date:'
			var inlineSettings = null
			for (var attrName in this._defaults) {
				var attrValue = target.getAttribute('date:' + attrName)
				if (attrValue) {
					inlineSettings = inlineSettings || {}
					try {
						inlineSettings[attrName] = eval(attrValue)
					} catch (err) {
						inlineSettings[attrName] = attrValue
					}
				}
			}
			var nodeName = target.nodeName.toLowerCase()
			var inline = nodeName == 'div' || nodeName == 'span'
			if (!target.id) {
				this.uuid += 1
				target.id = 'dp' + this.uuid
			}
			var inst = this._newInst($(target), inline)
			inst.settings = $.extend({}, settings || {}, inlineSettings || {})
			if (nodeName == 'input') {
				this._connectDatepicker(target, inst)
			} else if (inline) {
				this._inlineDatepicker(target, inst)
			}
		},

		/* Create a new instance object. */
		_newInst: function(target, inline) {
			var id = target[0].id.replace(/([^A-Za-z0-9_-])/g, '\\\\$1') // escape jQuery meta chars
			return {
				id: id,
				input: target, // associated target
				selectedDay: 0,
				selectedMonth: 0,
				selectedYear: 0, // current selection
				drawMonth: 0,
				drawYear: 0, // month being drawn
				inline: inline, // is datepicker inline or not
				dpDiv: !inline
					? this.dpDiv // presentation div
					: bindHover(
							$(
								'<div class="' +
									this._inlineClass +
									' ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all"></div>'
							)
						),
			}
		},

		/* Attach the date picker to an input field. */
		_connectDatepicker: function(target, inst) {
			var input = $(target)
			inst.append = $([])
			inst.trigger = $([])
			if (input.hasClass(this.markerClassName)) return
			this._attachments(input, inst)
			input
				.addClass(this.markerClassName)
				.keydown(this._doKeyDown)
				.keypress(this._doKeyPress)
				.keyup(this._doKeyUp)
				.bind('setData.datepicker', function(event, key, value) {
					inst.settings[key] = value
				})
				.bind('getData.datepicker', function(event, key) {
					return this._get(inst, key)
				})
			this._autoSize(inst)
			$.data(target, PROP_NAME, inst)
			//If disabled option is true, disable the datepicker once it has been attached to the input (see ticket #5665)
			if (inst.settings.disabled) {
				this._disableDatepicker(target)
			}
		},

		/* Make attachments based on settings. */
		_attachments: function(input, inst) {
			var appendText = this._get(inst, 'appendText')
			var isRTL = this._get(inst, 'isRTL')
			if (inst.append) inst.append.remove()
			if (appendText) {
				inst.append = $(
					'<span class="' + this._appendClass + '">' + appendText + '</span>'
				)
				input[isRTL ? 'before' : 'after'](inst.append)
			}
			input.unbind('focus', this._showDatepicker)
			if (inst.trigger) inst.trigger.remove()
			var showOn = this._get(inst, 'showOn')
			if (
				showOn == 'focus' ||
				showOn == 'both' // pop-up date picker when in the marked field
			)
				input.focus(this._showDatepicker)
			if (showOn == 'button' || showOn == 'both') {
				// pop-up date picker when button clicked
				var buttonText = this._get(inst, 'buttonText')
				var buttonImage = this._get(inst, 'buttonImage')
				inst.trigger = $(
					this._get(inst, 'buttonImageOnly')
						? $('<img/>')
								.addClass(this._triggerClass)
								.attr({ src: buttonImage, alt: buttonText, title: buttonText })
						: $('<button type="button"></button>')
								.addClass(this._triggerClass)
								.html(
									buttonImage == ''
										? buttonText
										: $('<img/>').attr({
												src: buttonImage,
												alt: buttonText,
												title: buttonText,
											})
								)
				)
				input[isRTL ? 'before' : 'after'](inst.trigger)
				inst.trigger.click(function() {
					if (
						$.datepicker._datepickerShowing &&
						$.datepicker._lastInput == input[0]
					)
						$.datepicker._hideDatepicker()
					else if (
						$.datepicker._datepickerShowing &&
						$.datepicker._lastInput != input[0]
					) {
						$.datepicker._hideDatepicker()
						$.datepicker._showDatepicker(input[0])
					} else $.datepicker._showDatepicker(input[0])
					return false
				})
			}
		},

		/* Apply the maximum length for the date format. */
		_autoSize: function(inst) {
			if (this._get(inst, 'autoSize') && !inst.inline) {
				var date = new Date(2009, 12 - 1, 20) // Ensure double digits
				var dateFormat = this._get(inst, 'dateFormat')
				if (dateFormat.match(/[DM]/)) {
					var findMax = function(names) {
						var max = 0
						var maxI = 0
						for (var i = 0; i < names.length; i++) {
							if (names[i].length > max) {
								max = names[i].length
								maxI = i
							}
						}
						return maxI
					}
					date.setMonth(
						findMax(
							this._get(
								inst,
								dateFormat.match(/MM/) ? 'monthNames' : 'monthNamesShort'
							)
						)
					)
					date.setDate(
						findMax(
							this._get(
								inst,
								dateFormat.match(/DD/) ? 'dayNames' : 'dayNamesShort'
							)
						) +
							20 -
							date.getDay()
					)
				}
				inst.input.attr('size', this._formatDate(inst, date).length)
			}
		},

		/* Attach an inline date picker to a div. */
		_inlineDatepicker: function(target, inst) {
			var divSpan = $(target)
			if (divSpan.hasClass(this.markerClassName)) return
			divSpan
				.addClass(this.markerClassName)
				.append(inst.dpDiv)
				.bind('setData.datepicker', function(event, key, value) {
					inst.settings[key] = value
				})
				.bind('getData.datepicker', function(event, key) {
					return this._get(inst, key)
				})
			$.data(target, PROP_NAME, inst)
			this._setDate(inst, this._getDefaultDate(inst), true)
			this._updateDatepicker(inst)
			this._updateAlternate(inst)
			//If disabled option is true, disable the datepicker before showing it (see ticket #5665)
			if (inst.settings.disabled) {
				this._disableDatepicker(target)
			}
			// Set display:block in place of inst.dpDiv.show() which won't work on disconnected elements
			// http://bugs.jqueryui.com/ticket/7552 - A Datepicker created on a detached div has zero height
			inst.dpDiv.css('display', 'block')
		},

		/* Pop-up the date picker in a "dialog" box.
	   @param  input     element - ignored
	   @param  date      string or Date - the initial date to display
	   @param  onSelect  function - the function to call when a date is selected
	   @param  settings  object - update the dialog date picker instance's settings (anonymous object)
	   @param  pos       int[2] - coordinates for the dialog's position within the screen or
	                     event - with x/y coordinates or
	                     leave empty for default (screen centre)
	   @return the manager object */
		_dialogDatepicker: function(input, date, onSelect, settings, pos) {
			var inst = this._dialogInst // internal instance
			if (!inst) {
				this.uuid += 1
				var id = 'dp' + this.uuid
				this._dialogInput = $(
					'<input type="text" id="' +
						id +
						'" style="position: absolute; top: -100px; width: 0px;"/>'
				)
				this._dialogInput.keydown(this._doKeyDown)
				$('body').append(this._dialogInput)
				inst = this._dialogInst = this._newInst(this._dialogInput, false)
				inst.settings = {}
				$.data(this._dialogInput[0], PROP_NAME, inst)
			}
			extendRemove(inst.settings, settings || {})
			date = date && date.constructor == Date
				? this._formatDate(inst, date)
				: date
			this._dialogInput.val(date)

			this._pos = pos ? (pos.length ? pos : [pos.pageX, pos.pageY]) : null
			if (!this._pos) {
				var browserWidth = document.documentElement.clientWidth
				var browserHeight = document.documentElement.clientHeight
				var scrollX =
					document.documentElement.scrollLeft || document.body.scrollLeft
				var scrollY =
					document.documentElement.scrollTop || document.body.scrollTop
				this._pos = [
					// should use actual width/height below
					browserWidth / 2 - 100 + scrollX,
					browserHeight / 2 - 150 + scrollY,
				]
			}

			// move input on screen for focus, but hidden behind dialog
			this._dialogInput
				.css('left', this._pos[0] + 20 + 'px')
				.css('top', this._pos[1] + 'px')
			inst.settings.onSelect = onSelect
			this._inDialog = true
			this.dpDiv.addClass(this._dialogClass)
			this._showDatepicker(this._dialogInput[0])
			if ($.blockUI) $.blockUI(this.dpDiv)
			$.data(this._dialogInput[0], PROP_NAME, inst)
			return this
		},

		/* Detach a datepicker from its control.
	   @param  target    element - the target input field or division or span */
		_destroyDatepicker: function(target) {
			var $target = $(target)
			var inst = $.data(target, PROP_NAME)
			if (!$target.hasClass(this.markerClassName)) {
				return
			}
			var nodeName = target.nodeName.toLowerCase()
			$.removeData(target, PROP_NAME)
			if (nodeName == 'input') {
				inst.append.remove()
				inst.trigger.remove()
				$target
					.removeClass(this.markerClassName)
					.unbind('focus', this._showDatepicker)
					.unbind('keydown', this._doKeyDown)
					.unbind('keypress', this._doKeyPress)
					.unbind('keyup', this._doKeyUp)
			} else if (nodeName == 'div' || nodeName == 'span')
				$target.removeClass(this.markerClassName).empty()
		},

		/* Enable the date picker to a jQuery selection.
	   @param  target    element - the target input field or division or span */
		_enableDatepicker: function(target) {
			var $target = $(target)
			var inst = $.data(target, PROP_NAME)
			if (!$target.hasClass(this.markerClassName)) {
				return
			}
			var nodeName = target.nodeName.toLowerCase()
			if (nodeName == 'input') {
				target.disabled = false
				inst.trigger
					.filter('button')
					.each(function() {
						this.disabled = false
					})
					.end()
					.filter('img')
					.css({ opacity: '1.0', cursor: '' })
			} else if (nodeName == 'div' || nodeName == 'span') {
				var inline = $target.children('.' + this._inlineClass)
				inline.children().removeClass('ui-state-disabled')
				inline
					.find('select.ui-datepicker-month, select.ui-datepicker-year')
					.prop('disabled', false)
			}
			this._disabledInputs = $.map(this._disabledInputs, function(value) {
				return value == target ? null : value
			}) // delete entry
		},

		/* Disable the date picker to a jQuery selection.
	   @param  target    element - the target input field or division or span */
		_disableDatepicker: function(target) {
			var $target = $(target)
			var inst = $.data(target, PROP_NAME)
			if (!$target.hasClass(this.markerClassName)) {
				return
			}
			var nodeName = target.nodeName.toLowerCase()
			if (nodeName == 'input') {
				target.disabled = true
				inst.trigger
					.filter('button')
					.each(function() {
						this.disabled = true
					})
					.end()
					.filter('img')
					.css({ opacity: '0.5', cursor: 'default' })
			} else if (nodeName == 'div' || nodeName == 'span') {
				var inline = $target.children('.' + this._inlineClass)
				inline.children().addClass('ui-state-disabled')
				inline
					.find('select.ui-datepicker-month, select.ui-datepicker-year')
					.prop('disabled', true)
			}
			this._disabledInputs = $.map(this._disabledInputs, function(value) {
				return value == target ? null : value
			}) // delete entry
			this._disabledInputs[this._disabledInputs.length] = target
		},

		/* Is the first field in a jQuery collection disabled as a datepicker?
	   @param  target    element - the target input field or division or span
	   @return boolean - true if disabled, false if enabled */
		_isDisabledDatepicker: function(target) {
			if (!target) {
				return false
			}
			for (var i = 0; i < this._disabledInputs.length; i++) {
				if (this._disabledInputs[i] == target) return true
			}
			return false
		},

		/* Retrieve the instance data for the target control.
	   @param  target  element - the target input field or division or span
	   @return  object - the associated instance data
	   @throws  error if a jQuery problem getting data */
		_getInst: function(target) {
			try {
				return $.data(target, PROP_NAME)
			} catch (err) {
				throw 'Missing instance data for this datepicker'
			}
		},

		/* Update or retrieve the settings for a date picker attached to an input field or division.
	   @param  target  element - the target input field or division or span
	   @param  name    object - the new settings to update or
	                   string - the name of the setting to change or retrieve,
	                   when retrieving also 'all' for all instance settings or
	                   'defaults' for all global defaults
	   @param  value   any - the new value for the setting
	                   (omit if above is an object or to retrieve a value) */
		_optionDatepicker: function(target, name, value) {
			var inst = this._getInst(target)
			if (arguments.length == 2 && typeof name == 'string') {
				return name == 'defaults'
					? $.extend({}, $.datepicker._defaults)
					: inst
							? name == 'all'
									? $.extend({}, inst.settings)
									: this._get(inst, name)
							: null
			}
			var settings = name || {}
			if (typeof name == 'string') {
				settings = {}
				settings[name] = value
			}
			if (inst) {
				if (this._curInst == inst) {
					this._hideDatepicker()
				}
				var date = this._getDateDatepicker(target, true)
				var minDate = this._getMinMaxDate(inst, 'min')
				var maxDate = this._getMinMaxDate(inst, 'max')
				extendRemove(inst.settings, settings)
				// reformat the old minDate/maxDate values if dateFormat changes and a new minDate/maxDate isn't provided
				if (
					minDate !== null &&
					settings['dateFormat'] !== undefined &&
					settings['minDate'] === undefined
				)
					inst.settings.minDate = this._formatDate(inst, minDate)
				if (
					maxDate !== null &&
					settings['dateFormat'] !== undefined &&
					settings['maxDate'] === undefined
				)
					inst.settings.maxDate = this._formatDate(inst, maxDate)
				this._attachments($(target), inst)
				this._autoSize(inst)
				this._setDate(inst, date)
				this._updateAlternate(inst)
				this._updateDatepicker(inst)
			}
		},

		// change method deprecated
		_changeDatepicker: function(target, name, value) {
			this._optionDatepicker(target, name, value)
		},

		/* Redraw the date picker attached to an input field or division.
	   @param  target  element - the target input field or division or span */
		_refreshDatepicker: function(target) {
			var inst = this._getInst(target)
			if (inst) {
				this._updateDatepicker(inst)
			}
		},

		/* Set the dates for a jQuery selection.
	   @param  target   element - the target input field or division or span
	   @param  date     Date - the new date */
		_setDateDatepicker: function(target, date) {
			var inst = this._getInst(target)
			if (inst) {
				this._setDate(inst, date)
				this._updateDatepicker(inst)
				this._updateAlternate(inst)
			}
		},

		/* Get the date(s) for the first entry in a jQuery selection.
	   @param  target     element - the target input field or division or span
	   @param  noDefault  boolean - true if no default date is to be used
	   @return Date - the current date */
		_getDateDatepicker: function(target, noDefault) {
			var inst = this._getInst(target)
			if (inst && !inst.inline) this._setDateFromField(inst, noDefault)
			return inst ? this._getDate(inst) : null
		},

		/* Handle keystrokes. */
		_doKeyDown: function(event) {
			var inst = $.datepicker._getInst(event.target)
			var handled = true
			var isRTL = inst.dpDiv.is('.ui-datepicker-rtl')
			inst._keyEvent = true
			if ($.datepicker._datepickerShowing)
				switch (event.keyCode) {
					case 9:
						$.datepicker._hideDatepicker()
						handled = false
						break // hide on tab out
					case 13:
						var sel = $(
							'td.' +
								$.datepicker._dayOverClass +
								':not(.' +
								$.datepicker._currentClass +
								')',
							inst.dpDiv
						)
						if (sel[0])
							$.datepicker._selectDay(
								event.target,
								inst.selectedMonth,
								inst.selectedYear,
								sel[0]
							)
						var onSelect = $.datepicker._get(inst, 'onSelect')
						if (onSelect) {
							var dateStr = $.datepicker._formatDate(inst)

							// trigger custom callback
							onSelect.apply(inst.input ? inst.input[0] : null, [dateStr, inst])
						} else $.datepicker._hideDatepicker()
						return false // don't submit the form
						break // select the value on enter
					case 27:
						$.datepicker._hideDatepicker()
						break // hide on escape
					case 33:
						$.datepicker._adjustDate(
							event.target,
							event.ctrlKey
								? -$.datepicker._get(inst, 'stepBigMonths')
								: -$.datepicker._get(inst, 'stepMonths'),
							'M'
						)
						break // previous month/year on page up/+ ctrl
					case 34:
						$.datepicker._adjustDate(
							event.target,
							event.ctrlKey
								? +$.datepicker._get(inst, 'stepBigMonths')
								: +$.datepicker._get(inst, 'stepMonths'),
							'M'
						)
						break // next month/year on page down/+ ctrl
					case 35:
						if (event.ctrlKey || event.metaKey)
							$.datepicker._clearDate(event.target)
						handled = event.ctrlKey || event.metaKey
						break // clear on ctrl or command +end
					case 36:
						if (event.ctrlKey || event.metaKey)
							$.datepicker._gotoToday(event.target)
						handled = event.ctrlKey || event.metaKey
						break // current on ctrl or command +home
					case 37:
						if (event.ctrlKey || event.metaKey)
							$.datepicker._adjustDate(event.target, isRTL ? +1 : -1, 'D')
						handled = event.ctrlKey || event.metaKey
						// -1 day on ctrl or command +left
						if (event.originalEvent.altKey)
							$.datepicker._adjustDate(
								event.target,
								event.ctrlKey
									? -$.datepicker._get(inst, 'stepBigMonths')
									: -$.datepicker._get(inst, 'stepMonths'),
								'M'
							)
						// next month/year on alt +left on Mac
						break
					case 38:
						if (event.ctrlKey || event.metaKey)
							$.datepicker._adjustDate(event.target, -7, 'D')
						handled = event.ctrlKey || event.metaKey
						break // -1 week on ctrl or command +up
					case 39:
						if (event.ctrlKey || event.metaKey)
							$.datepicker._adjustDate(event.target, isRTL ? -1 : +1, 'D')
						handled = event.ctrlKey || event.metaKey
						// +1 day on ctrl or command +right
						if (event.originalEvent.altKey)
							$.datepicker._adjustDate(
								event.target,
								event.ctrlKey
									? +$.datepicker._get(inst, 'stepBigMonths')
									: +$.datepicker._get(inst, 'stepMonths'),
								'M'
							)
						// next month/year on alt +right
						break
					case 40:
						if (event.ctrlKey || event.metaKey)
							$.datepicker._adjustDate(event.target, +7, 'D')
						handled = event.ctrlKey || event.metaKey
						break // +1 week on ctrl or command +down
					default:
						handled = false
				}
			else if (
				event.keyCode == 36 &&
				event.ctrlKey // display the date picker on ctrl+home
			)
				$.datepicker._showDatepicker(this)
			else {
				handled = false
			}
			if (handled) {
				event.preventDefault()
				event.stopPropagation()
			}
		},

		/* Filter entered characters - based on date format. */
		_doKeyPress: function(event) {
			var inst = $.datepicker._getInst(event.target)
			if ($.datepicker._get(inst, 'constrainInput')) {
				var chars = $.datepicker._possibleChars(
					$.datepicker._get(inst, 'dateFormat')
				)
				var chr = String.fromCharCode(
					event.charCode == undefined ? event.keyCode : event.charCode
				)
				return (
					event.ctrlKey ||
					event.metaKey ||
					(chr < ' ' || !chars || chars.indexOf(chr) > -1)
				)
			}
		},

		/* Synchronise manual entry and field/alternate field. */
		_doKeyUp: function(event) {
			var inst = $.datepicker._getInst(event.target)
			if (inst.input.val() != inst.lastVal) {
				try {
					var date = $.datepicker.parseDate(
						$.datepicker._get(inst, 'dateFormat'),
						inst.input ? inst.input.val() : null,
						$.datepicker._getFormatConfig(inst)
					)
					if (date) {
						// only if valid
						$.datepicker._setDateFromField(inst)
						$.datepicker._updateAlternate(inst)
						$.datepicker._updateDatepicker(inst)
					}
				} catch (err) {
					$.datepicker.log(err)
				}
			}
			return true
		},

		/* Pop-up the date picker for a given input field.
	   If false returned from beforeShow event handler do not show.
	   @param  input  element - the input field attached to the date picker or
	                  event - if triggered by focus */
		_showDatepicker: function(input) {
			input = input.target || input
			if (
				input.nodeName.toLowerCase() != 'input' // find from button/image trigger
			)
				input = $('input', input.parentNode)[0]
			if (
				$.datepicker._isDisabledDatepicker(input) ||
				$.datepicker._lastInput == input // already here
			)
				return
			var inst = $.datepicker._getInst(input)
			if ($.datepicker._curInst && $.datepicker._curInst != inst) {
				$.datepicker._curInst.dpDiv.stop(true, true)
				if (inst && $.datepicker._datepickerShowing) {
					$.datepicker._hideDatepicker($.datepicker._curInst.input[0])
				}
			}
			var beforeShow = $.datepicker._get(inst, 'beforeShow')
			var beforeShowSettings = beforeShow
				? beforeShow.apply(input, [input, inst])
				: {}
			if (beforeShowSettings === false) {
				//false
				return
			}
			extendRemove(inst.settings, beforeShowSettings)
			inst.lastVal = null
			$.datepicker._lastInput = input
			$.datepicker._setDateFromField(inst)
			if (
				$.datepicker._inDialog // hide cursor
			)
				input.value = ''
			if (!$.datepicker._pos) {
				// position below input
				$.datepicker._pos = $.datepicker._findPos(input)
				$.datepicker._pos[1] += input.offsetHeight // add the height
			}
			var isFixed = false
			$(input).parents().each(function() {
				isFixed |= $(this).css('position') == 'fixed'
				return !isFixed
			})
			var offset = { left: $.datepicker._pos[0], top: $.datepicker._pos[1] }
			$.datepicker._pos = null
			//to avoid flashes on Firefox
			inst.dpDiv.empty()
			// determine sizing offscreen
			inst.dpDiv.css({ position: 'absolute', display: 'block', top: '-1000px' })
			$.datepicker._updateDatepicker(inst)
			// fix width for dynamic number of date pickers
			// and adjust position before showing
			offset = $.datepicker._checkOffset(inst, offset, isFixed)
			inst.dpDiv.css({
				position: $.datepicker._inDialog && $.blockUI
					? 'static'
					: isFixed ? 'fixed' : 'absolute',
				display: 'none',
				left: offset.left + 'px',
				top: offset.top + 'px',
			})
			if (!inst.inline) {
				var showAnim = $.datepicker._get(inst, 'showAnim')
				var duration = $.datepicker._get(inst, 'duration')
				var postProcess = function() {
					var cover = inst.dpDiv.find('iframe.ui-datepicker-cover') // IE6- only
					if (!!cover.length) {
						var borders = $.datepicker._getBorders(inst.dpDiv)
						cover.css({
							left: -borders[0],
							top: -borders[1],
							width: inst.dpDiv.outerWidth(),
							height: inst.dpDiv.outerHeight(),
						})
					}
				}
				inst.dpDiv.zIndex($(input).zIndex() + 1)
				$.datepicker._datepickerShowing = true

				// DEPRECATED: after BC for 1.8.x $.effects[ showAnim ] is not needed
				if ($.effects && ($.effects.effect[showAnim] || $.effects[showAnim]))
					inst.dpDiv.show(
						showAnim,
						$.datepicker._get(inst, 'showOptions'),
						duration,
						postProcess
					)
				else
					inst.dpDiv[showAnim || 'show'](
						showAnim ? duration : null,
						postProcess
					)
				if (!showAnim || !duration) postProcess()
				if (inst.input.is(':visible') && !inst.input.is(':disabled'))
					inst.input.focus()
				$.datepicker._curInst = inst
			}
		},

		/* Generate the date picker content. */
		_updateDatepicker: function(inst) {
			this.maxRows = 4 //Reset the max number of rows being displayed (see #7043)
			var borders = $.datepicker._getBorders(inst.dpDiv)
			instActive = inst // for delegate hover events
			inst.dpDiv.empty().append(this._generateHTML(inst))
			this._attachHandlers(inst)
			var cover = inst.dpDiv.find('iframe.ui-datepicker-cover') // IE6- only
			if (!!cover.length) {
				//avoid call to outerXXXX() when not in IE6
				cover.css({
					left: -borders[0],
					top: -borders[1],
					width: inst.dpDiv.outerWidth(),
					height: inst.dpDiv.outerHeight(),
				})
			}
			inst.dpDiv.find('.' + this._dayOverClass + ' a').mouseover()
			var numMonths = this._getNumberOfMonths(inst)
			var cols = numMonths[1]
			var width = 17
			inst.dpDiv
				.removeClass(
					'ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4'
				)
				.width('')
			if (cols > 1)
				inst.dpDiv
					.addClass('ui-datepicker-multi-' + cols)
					.css('width', width * cols + 'em')
			inst.dpDiv[
				(numMonths[0] != 1 || numMonths[1] != 1 ? 'add' : 'remove') + 'Class'
			]('ui-datepicker-multi')
			inst.dpDiv[(this._get(inst, 'isRTL') ? 'add' : 'remove') + 'Class'](
				'ui-datepicker-rtl'
			)
			if (
				inst == $.datepicker._curInst &&
				$.datepicker._datepickerShowing &&
				inst.input &&
				// #6694 - don't focus the input if it's already focused
				// this breaks the change event in IE
				inst.input.is(':visible') &&
				!inst.input.is(':disabled') &&
				inst.input[0] != document.activeElement
			)
				inst.input.focus()
			// deffered render of the years select (to avoid flashes on Firefox)
			if (inst.yearshtml) {
				var origyearshtml = inst.yearshtml
				setTimeout(function() {
					//assure that inst.yearshtml didn't change.
					if (origyearshtml === inst.yearshtml && inst.yearshtml) {
						inst.dpDiv
							.find('select.ui-datepicker-year:first')
							.replaceWith(inst.yearshtml)
					}
					origyearshtml = inst.yearshtml = null
				}, 0)
			}
		},

		/* Retrieve the size of left and top borders for an element.
	   @param  elem  (jQuery object) the element of interest
	   @return  (number[2]) the left and top borders */
		_getBorders: function(elem) {
			var convert = function(value) {
				return { thin: 1, medium: 2, thick: 3 }[value] || value
			}
			return [
				parseFloat(convert(elem.css('border-left-width'))),
				parseFloat(convert(elem.css('border-top-width'))),
			]
		},

		/* Check positioning to remain on screen. */
		_checkOffset: function(inst, offset, isFixed) {
			var dpWidth = inst.dpDiv.outerWidth()
			var dpHeight = inst.dpDiv.outerHeight()
			var inputWidth = inst.input ? inst.input.outerWidth() : 0
			var inputHeight = inst.input ? inst.input.outerHeight() : 0
			var viewWidth =
				document.documentElement.clientWidth +
				(isFixed ? 0 : $(document).scrollLeft())
			var viewHeight =
				document.documentElement.clientHeight +
				(isFixed ? 0 : $(document).scrollTop())

			offset.left -= this._get(inst, 'isRTL') ? dpWidth - inputWidth : 0
			offset.left -= isFixed && offset.left == inst.input.offset().left
				? $(document).scrollLeft()
				: 0
			offset.top -= isFixed &&
				offset.top == inst.input.offset().top + inputHeight
				? $(document).scrollTop()
				: 0

			// now check if datepicker is showing outside window viewport - move to a better place if so.
			offset.left -= Math.min(
				offset.left,
				offset.left + dpWidth > viewWidth && viewWidth > dpWidth
					? Math.abs(offset.left + dpWidth - viewWidth)
					: 0
			)
			offset.top -= Math.min(
				offset.top,
				offset.top + dpHeight > viewHeight && viewHeight > dpHeight
					? Math.abs(dpHeight + inputHeight)
					: 0
			)

			return offset
		},

		/* Find an object's position on the screen. */
		_findPos: function(obj) {
			var inst = this._getInst(obj)
			var isRTL = this._get(inst, 'isRTL')
			while (
				obj &&
				(obj.type == 'hidden' ||
					obj.nodeType != 1 ||
					$.expr.filters.hidden(obj))
			) {
				obj = obj[isRTL ? 'previousSibling' : 'nextSibling']
			}
			var position = $(obj).offset()
			return [position.left, position.top]
		},

		/* Hide the date picker from view.
	   @param  input  element - the input field attached to the date picker */
		_hideDatepicker: function(input) {
			var inst = this._curInst
			if (!inst || (input && inst != $.data(input, PROP_NAME))) return
			if (this._datepickerShowing) {
				var showAnim = this._get(inst, 'showAnim')
				var duration = this._get(inst, 'duration')
				var postProcess = function() {
					$.datepicker._tidyDialog(inst)
				}

				// DEPRECATED: after BC for 1.8.x $.effects[ showAnim ] is not needed
				if ($.effects && ($.effects.effect[showAnim] || $.effects[showAnim]))
					inst.dpDiv.hide(
						showAnim,
						$.datepicker._get(inst, 'showOptions'),
						duration,
						postProcess
					)
				else
					inst.dpDiv[
						showAnim == 'slideDown'
							? 'slideUp'
							: showAnim == 'fadeIn' ? 'fadeOut' : 'hide'
					](showAnim ? duration : null, postProcess)
				if (!showAnim) postProcess()
				this._datepickerShowing = false
				var onClose = this._get(inst, 'onClose')
				if (onClose)
					onClose.apply(inst.input ? inst.input[0] : null, [
						inst.input ? inst.input.val() : '',
						inst,
					])
				this._lastInput = null
				if (this._inDialog) {
					this._dialogInput.css({
						position: 'absolute',
						left: '0',
						top: '-100px',
					})
					if ($.blockUI) {
						$.unblockUI()
						$('body').append(this.dpDiv)
					}
				}
				this._inDialog = false
			}
		},

		/* Tidy up after a dialog display. */
		_tidyDialog: function(inst) {
			inst.dpDiv
				.removeClass(this._dialogClass)
				.unbind('.ui-datepicker-calendar')
		},

		/* Close date picker if clicked elsewhere. */
		_checkExternalClick: function(event) {
			if (!$.datepicker._curInst) return

			var $target = $(event.target), inst = $.datepicker._getInst($target[0])

			if (
				($target[0].id != $.datepicker._mainDivId &&
					$target.parents('#' + $.datepicker._mainDivId).length == 0 &&
					!$target.hasClass($.datepicker.markerClassName) &&
					!$target.closest('.' + $.datepicker._triggerClass).length &&
					$.datepicker._datepickerShowing &&
					!($.datepicker._inDialog && $.blockUI)) ||
				($target.hasClass($.datepicker.markerClassName) &&
					$.datepicker._curInst != inst)
			)
				$.datepicker._hideDatepicker()
		},

		/* Adjust one of the date sub-fields. */
		_adjustDate: function(id, offset, period) {
			var target = $(id)
			var inst = this._getInst(target[0])
			if (this._isDisabledDatepicker(target[0])) {
				return
			}
			this._adjustInstDate(
				inst,
				offset + (period == 'M' ? this._get(inst, 'showCurrentAtPos') : 0), // undo positioning
				period
			)
			this._updateDatepicker(inst)
		},

		/* Action for current link. */
		_gotoToday: function(id) {
			var target = $(id)
			var inst = this._getInst(target[0])
			if (this._get(inst, 'gotoCurrent') && inst.currentDay) {
				inst.selectedDay = inst.currentDay
				inst.drawMonth = inst.selectedMonth = inst.currentMonth
				inst.drawYear = inst.selectedYear = inst.currentYear
			} else {
				var date = new Date()
				inst.selectedDay = date.getDate()
				inst.drawMonth = inst.selectedMonth = date.getMonth()
				inst.drawYear = inst.selectedYear = date.getFullYear()
			}
			this._notifyChange(inst)
			this._adjustDate(target)
		},

		/* Action for selecting a new month/year. */
		_selectMonthYear: function(id, select, period) {
			var target = $(id)
			var inst = this._getInst(target[0])
			inst['selected' + (period == 'M' ? 'Month' : 'Year')] = inst[
				'draw' + (period == 'M' ? 'Month' : 'Year')
			] = parseInt(select.options[select.selectedIndex].value, 10)
			this._notifyChange(inst)
			this._adjustDate(target)
		},

		/* Action for selecting a day. */
		_selectDay: function(id, month, year, td) {
			var target = $(id)
			if (
				$(td).hasClass(this._unselectableClass) ||
				this._isDisabledDatepicker(target[0])
			) {
				return
			}
			var inst = this._getInst(target[0])
			inst.selectedDay = inst.currentDay = $('a', td).html()
			inst.selectedMonth = inst.currentMonth = month
			inst.selectedYear = inst.currentYear = year
			this._selectDate(
				id,
				this._formatDate(
					inst,
					inst.currentDay,
					inst.currentMonth,
					inst.currentYear
				)
			)
		},

		/* Erase the input field and hide the date picker. */
		_clearDate: function(id) {
			var target = $(id)
			var inst = this._getInst(target[0])
			this._selectDate(target, '')
		},

		/* Update the input field with the selected date. */
		_selectDate: function(id, dateStr) {
			var target = $(id)
			var inst = this._getInst(target[0])
			dateStr = dateStr != null ? dateStr : this._formatDate(inst)
			if (inst.input) inst.input.val(dateStr)
			this._updateAlternate(inst)
			var onSelect = this._get(inst, 'onSelect')
			if (onSelect)
				onSelect.apply(inst.input ? inst.input[0] : null, [dateStr, inst])
			else if (inst.input)
				// trigger custom callback
				inst.input.trigger('change') // fire the change event
			if (inst.inline) this._updateDatepicker(inst)
			else {
				this._hideDatepicker()
				this._lastInput = inst.input[0]
				if (typeof inst.input[0] != 'object') inst.input.focus() // restore focus
				this._lastInput = null
			}
		},

		/* Update any alternate field to synchronise with the main field. */
		_updateAlternate: function(inst) {
			var altField = this._get(inst, 'altField')
			if (altField) {
				// update alternate field too
				var altFormat =
					this._get(inst, 'altFormat') || this._get(inst, 'dateFormat')
				var date = this._getDate(inst)
				var dateStr = this.formatDate(
					altFormat,
					date,
					this._getFormatConfig(inst)
				)
				$(altField).each(function() {
					$(this).val(dateStr)
				})
			}
		},

		/* Set as beforeShowDay function to prevent selection of weekends.
	   @param  date  Date - the date to customise
	   @return [boolean, string] - is this date selectable?, what is its CSS class? */
		noWeekends: function(date) {
			var day = date.getDay()
			return [day > 0 && day < 6, '']
		},

		/* Set as calculateWeek to determine the week of the year based on the ISO 8601 definition.
	   @param  date  Date - the date to get the week for
	   @return  number - the number of the week within the year that contains this date */
		iso8601Week: function(date) {
			var checkDate = new Date(date.getTime())
			// Find Thursday of this week starting on Monday
			checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7))
			var time = checkDate.getTime()
			checkDate.setMonth(0) // Compare with Jan 1
			checkDate.setDate(1)
			return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1
		},

		/* Parse a string value into a date object.
	   See formatDate below for the possible formats.

	   @param  format    string - the expected format of the date
	   @param  value     string - the date in the above format
	   @param  settings  Object - attributes include:
	                     shortYearCutoff  number - the cutoff year for determining the century (optional)
	                     dayNamesShort    string[7] - abbreviated names of the days from Sunday (optional)
	                     dayNames         string[7] - names of the days from Sunday (optional)
	                     monthNamesShort  string[12] - abbreviated names of the months (optional)
	                     monthNames       string[12] - names of the months (optional)
	   @return  Date - the extracted date value or null if value is blank */
		parseDate: function(format, value, settings) {
			if (format == null || value == null) throw 'Invalid arguments'
			value = typeof value == 'object' ? value.toString() : value + ''
			if (value == '') return null
			var shortYearCutoff =
				(settings ? settings.shortYearCutoff : null) ||
				this._defaults.shortYearCutoff
			shortYearCutoff = typeof shortYearCutoff != 'string'
				? shortYearCutoff
				: new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10)
			var dayNamesShort =
				(settings ? settings.dayNamesShort : null) ||
				this._defaults.dayNamesShort
			var dayNames =
				(settings ? settings.dayNames : null) || this._defaults.dayNames
			var monthNamesShort =
				(settings ? settings.monthNamesShort : null) ||
				this._defaults.monthNamesShort
			var monthNames =
				(settings ? settings.monthNames : null) || this._defaults.monthNames
			var year = -1
			var month = -1
			var day = -1
			var doy = -1
			var literal = false
			// Check whether a format character is doubled
			var lookAhead = function(match) {
				var matches =
					iFormat + 1 < format.length && format.charAt(iFormat + 1) == match
				if (matches) iFormat++
				return matches
			}
			// Extract a number from the string value
			var getNumber = function(match) {
				var isDoubled = lookAhead(match)
				var size = match == '@'
					? 14
					: match == '!'
							? 20
							: match == 'y' && isDoubled ? 4 : match == 'o' ? 3 : 2
				var digits = new RegExp('^\\d{1,' + size + '}')
				var num = value.substring(iValue).match(digits)
				if (!num) throw 'Missing number at position ' + iValue
				iValue += num[0].length
				return parseInt(num[0], 10)
			}
			// Extract a name from the string value and convert to an index
			var getName = function(match, shortNames, longNames) {
				var names = $.map(lookAhead(match) ? longNames : shortNames, function(
					v,
					k
				) {
					return [[k, v]]
				}).sort(function(a, b) {
					return -(a[1].length - b[1].length)
				})
				var index = -1
				$.each(names, function(i, pair) {
					var name = pair[1]
					if (
						value.substr(iValue, name.length).toLowerCase() ==
						name.toLowerCase()
					) {
						index = pair[0]
						iValue += name.length
						return false
					}
				})
				if (index != -1) return index + 1
				else throw 'Unknown name at position ' + iValue
			}
			// Confirm that a literal character matches the string value
			var checkLiteral = function() {
				if (value.charAt(iValue) != format.charAt(iFormat))
					throw 'Unexpected literal at position ' + iValue
				iValue++
			}
			var iValue = 0
			for (var iFormat = 0; iFormat < format.length; iFormat++) {
				if (literal)
					if (format.charAt(iFormat) == "'" && !lookAhead("'")) literal = false
					else checkLiteral()
				else
					switch (format.charAt(iFormat)) {
						case 'd':
							day = getNumber('d')
							break
						case 'D':
							getName('D', dayNamesShort, dayNames)
							break
						case 'o':
							doy = getNumber('o')
							break
						case 'm':
							month = getNumber('m')
							break
						case 'M':
							month = getName('M', monthNamesShort, monthNames)
							break
						case 'y':
							year = getNumber('y')
							break
						case '@':
							var date = new Date(getNumber('@'))
							year = date.getFullYear()
							month = date.getMonth() + 1
							day = date.getDate()
							break
						case '!':
							var date = new Date((getNumber('!') - this._ticksTo1970) / 10000)
							year = date.getFullYear()
							month = date.getMonth() + 1
							day = date.getDate()
							break
						case "'":
							if (lookAhead("'")) checkLiteral()
							else literal = true
							break
						default:
							checkLiteral()
					}
			}
			if (iValue < value.length) {
				var extra = value.substr(iValue)
				if (!/^\s+/.test(extra)) {
					throw 'Extra/unparsed characters found in date: ' + extra
				}
			}
			if (year == -1) year = new Date().getFullYear()
			else if (year < 100)
				year +=
					new Date().getFullYear() -
					new Date().getFullYear() % 100 +
					(year <= shortYearCutoff ? 0 : -100)
			if (doy > -1) {
				month = 1
				day = doy
				do {
					var dim = this._getDaysInMonth(year, month - 1)
					if (day <= dim) break
					month++
					day -= dim
				} while (true)
			}
			var date = this._daylightSavingAdjust(new Date(year, month - 1, day))
			if (
				date.getFullYear() != year ||
				date.getMonth() + 1 != month ||
				date.getDate() != day
			)
				throw 'Invalid date' // E.g. 31/02/00
			return date
		},

		/* Standard date formats. */
		ATOM: 'yy-mm-dd', // RFC 3339 (ISO 8601)
		COOKIE: 'D, dd M yy',
		ISO_8601: 'yy-mm-dd',
		RFC_822: 'D, d M y',
		RFC_850: 'DD, dd-M-y',
		RFC_1036: 'D, d M y',
		RFC_1123: 'D, d M yy',
		RFC_2822: 'D, d M yy',
		RSS: 'D, d M y', // RFC 822
		TICKS: '!',
		TIMESTAMP: '@',
		W3C: 'yy-mm-dd', // ISO 8601

		_ticksTo1970: ((1970 - 1) * 365 +
			Math.floor(1970 / 4) -
			Math.floor(1970 / 100) +
			Math.floor(1970 / 400)) *
			24 *
			60 *
			60 *
			10000000,

		/* Format a date object into a string value.
	   The format can be combinations of the following:
	   d  - day of month (no leading zero)
	   dd - day of month (two digit)
	   o  - day of year (no leading zeros)
	   oo - day of year (three digit)
	   D  - day name short
	   DD - day name long
	   m  - month of year (no leading zero)
	   mm - month of year (two digit)
	   M  - month name short
	   MM - month name long
	   y  - year (two digit)
	   yy - year (four digit)
	   @ - Unix timestamp (ms since 01/01/1970)
	   ! - Windows ticks (100ns since 01/01/0001)
	   '...' - literal text
	   '' - single quote

	   @param  format    string - the desired format of the date
	   @param  date      Date - the date value to format
	   @param  settings  Object - attributes include:
	                     dayNamesShort    string[7] - abbreviated names of the days from Sunday (optional)
	                     dayNames         string[7] - names of the days from Sunday (optional)
	                     monthNamesShort  string[12] - abbreviated names of the months (optional)
	                     monthNames       string[12] - names of the months (optional)
	   @return  string - the date in the above format */
		formatDate: function(format, date, settings) {
			if (!date) return ''
			var dayNamesShort =
				(settings ? settings.dayNamesShort : null) ||
				this._defaults.dayNamesShort
			var dayNames =
				(settings ? settings.dayNames : null) || this._defaults.dayNames
			var monthNamesShort =
				(settings ? settings.monthNamesShort : null) ||
				this._defaults.monthNamesShort
			var monthNames =
				(settings ? settings.monthNames : null) || this._defaults.monthNames
			// Check whether a format character is doubled
			var lookAhead = function(match) {
				var matches =
					iFormat + 1 < format.length && format.charAt(iFormat + 1) == match
				if (matches) iFormat++
				return matches
			}
			// Format a number, with leading zero if necessary
			var formatNumber = function(match, value, len) {
				var num = '' + value
				if (lookAhead(match)) while (num.length < len) num = '0' + num
				return num
			}
			// Format a name, short or long as requested
			var formatName = function(match, value, shortNames, longNames) {
				return lookAhead(match) ? longNames[value] : shortNames[value]
			}
			var output = ''
			var literal = false
			if (date)
				for (var iFormat = 0; iFormat < format.length; iFormat++) {
					if (literal)
						if (format.charAt(iFormat) == "'" && !lookAhead("'"))
							literal = false
						else output += format.charAt(iFormat)
					else
						switch (format.charAt(iFormat)) {
							case 'd':
								output += formatNumber('d', date.getDate(), 2)
								break
							case 'D':
								output += formatName(
									'D',
									date.getDay(),
									dayNamesShort,
									dayNames
								)
								break
							case 'o':
								output += formatNumber(
									'o',
									Math.round(
										(new Date(
											date.getFullYear(),
											date.getMonth(),
											date.getDate()
										).getTime() -
											new Date(date.getFullYear(), 0, 0).getTime()) /
											86400000
									),
									3
								)
								break
							case 'm':
								output += formatNumber('m', date.getMonth() + 1, 2)
								break
							case 'M':
								output += formatName(
									'M',
									date.getMonth(),
									monthNamesShort,
									monthNames
								)
								break
							case 'y':
								output += lookAhead('y')
									? date.getFullYear()
									: (date.getYear() % 100 < 10 ? '0' : '') +
											date.getYear() % 100
								break
							case '@':
								output += date.getTime()
								break
							case '!':
								output += date.getTime() * 10000 + this._ticksTo1970
								break
							case "'":
								if (lookAhead("'")) output += "'"
								else literal = true
								break
							default:
								output += format.charAt(iFormat)
						}
				}
			return output
		},

		/* Extract all possible characters from the date format. */
		_possibleChars: function(format) {
			var chars = ''
			var literal = false
			// Check whether a format character is doubled
			var lookAhead = function(match) {
				var matches =
					iFormat + 1 < format.length && format.charAt(iFormat + 1) == match
				if (matches) iFormat++
				return matches
			}
			for (var iFormat = 0; iFormat < format.length; iFormat++)
				if (literal)
					if (format.charAt(iFormat) == "'" && !lookAhead("'")) literal = false
					else chars += format.charAt(iFormat)
				else
					switch (format.charAt(iFormat)) {
						case 'd':
						case 'm':
						case 'y':
						case '@':
							chars += '0123456789'
							break
						case 'D':
						case 'M':
							return null // Accept anything
						case "'":
							if (lookAhead("'")) chars += "'"
							else literal = true
							break
						default:
							chars += format.charAt(iFormat)
					}
			return chars
		},

		/* Get a setting value, defaulting if necessary. */
		_get: function(inst, name) {
			return inst.settings[name] !== undefined
				? inst.settings[name]
				: this._defaults[name]
		},

		/* Parse existing date and initialise date picker. */
		_setDateFromField: function(inst, noDefault) {
			if (inst.input.val() == inst.lastVal) {
				return
			}
			var dateFormat = this._get(inst, 'dateFormat')
			var dates = (inst.lastVal = inst.input ? inst.input.val() : null)
			var date, defaultDate
			date = defaultDate = this._getDefaultDate(inst)
			var settings = this._getFormatConfig(inst)
			try {
				date = this.parseDate(dateFormat, dates, settings) || defaultDate
			} catch (event) {
				this.log(event)
				dates = noDefault ? '' : dates
			}
			inst.selectedDay = date.getDate()
			inst.drawMonth = inst.selectedMonth = date.getMonth()
			inst.drawYear = inst.selectedYear = date.getFullYear()
			inst.currentDay = dates ? date.getDate() : 0
			inst.currentMonth = dates ? date.getMonth() : 0
			inst.currentYear = dates ? date.getFullYear() : 0
			this._adjustInstDate(inst)
		},

		/* Retrieve the default date shown on opening. */
		_getDefaultDate: function(inst) {
			return this._restrictMinMax(
				inst,
				this._determineDate(inst, this._get(inst, 'defaultDate'), new Date())
			)
		},

		/* A date may be specified as an exact value or a relative one. */
		_determineDate: function(inst, date, defaultDate) {
			var offsetNumeric = function(offset) {
				var date = new Date()
				date.setDate(date.getDate() + offset)
				return date
			}
			var offsetString = function(offset) {
				try {
					return $.datepicker.parseDate(
						$.datepicker._get(inst, 'dateFormat'),
						offset,
						$.datepicker._getFormatConfig(inst)
					)
				} catch (e) {
					// Ignore
				}
				var date =
					(offset.toLowerCase().match(/^c/)
						? $.datepicker._getDate(inst)
						: null) || new Date()
				var year = date.getFullYear()
				var month = date.getMonth()
				var day = date.getDate()
				var pattern = /([+-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g
				var matches = pattern.exec(offset)
				while (matches) {
					switch (matches[2] || 'd') {
						case 'd':
						case 'D':
							day += parseInt(matches[1], 10)
							break
						case 'w':
						case 'W':
							day += parseInt(matches[1], 10) * 7
							break
						case 'm':
						case 'M':
							month += parseInt(matches[1], 10)
							day = Math.min(day, $.datepicker._getDaysInMonth(year, month))
							break
						case 'y':
						case 'Y':
							year += parseInt(matches[1], 10)
							day = Math.min(day, $.datepicker._getDaysInMonth(year, month))
							break
					}
					matches = pattern.exec(offset)
				}
				return new Date(year, month, day)
			}
			var newDate = date == null || date === ''
				? defaultDate
				: typeof date == 'string'
						? offsetString(date)
						: typeof date == 'number'
								? isNaN(date) ? defaultDate : offsetNumeric(date)
								: new Date(date.getTime())
			newDate = newDate && newDate.toString() == 'Invalid Date'
				? defaultDate
				: newDate
			if (newDate) {
				newDate.setHours(0)
				newDate.setMinutes(0)
				newDate.setSeconds(0)
				newDate.setMilliseconds(0)
			}
			return this._daylightSavingAdjust(newDate)
		},

		/* Handle switch to/from daylight saving.
	   Hours may be non-zero on daylight saving cut-over:
	   > 12 when midnight changeover, but then cannot generate
	   midnight datetime, so jump to 1AM, otherwise reset.
	   @param  date  (Date) the date to check
	   @return  (Date) the corrected date */
		_daylightSavingAdjust: function(date) {
			if (!date) return null
			date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0)
			return date
		},

		/* Set the date(s) directly. */
		_setDate: function(inst, date, noChange) {
			var clear = !date
			var origMonth = inst.selectedMonth
			var origYear = inst.selectedYear
			var newDate = this._restrictMinMax(
				inst,
				this._determineDate(inst, date, new Date())
			)
			inst.selectedDay = inst.currentDay = newDate.getDate()
			inst.drawMonth = inst.selectedMonth = inst.currentMonth = newDate.getMonth()
			inst.drawYear = inst.selectedYear = inst.currentYear = newDate.getFullYear()
			if (
				(origMonth != inst.selectedMonth || origYear != inst.selectedYear) &&
				!noChange
			)
				this._notifyChange(inst)
			this._adjustInstDate(inst)
			if (inst.input) {
				inst.input.val(clear ? '' : this._formatDate(inst))
			}
		},

		/* Retrieve the date(s) directly. */
		_getDate: function(inst) {
			var startDate = !inst.currentYear ||
				(inst.input && inst.input.val() == '')
				? null
				: this._daylightSavingAdjust(
						new Date(inst.currentYear, inst.currentMonth, inst.currentDay)
					)
			return startDate
		},

		/* Attach the onxxx handlers.  These are declared statically so
	 * they work with static code transformers like Caja.
	 */
		_attachHandlers: function(inst) {
			var stepMonths = this._get(inst, 'stepMonths')
			var id = '#' + inst.id.replace(/\\\\/g, '\\')
			inst.dpDiv.find('[data-handler]').map(function() {
				var handler = {
					prev: function() {
						window['DP_jQuery_' + dpuuid].datepicker._adjustDate(
							id,
							-stepMonths,
							'M'
						)
					},
					next: function() {
						window['DP_jQuery_' + dpuuid].datepicker._adjustDate(
							id,
							+stepMonths,
							'M'
						)
					},
					hide: function() {
						window['DP_jQuery_' + dpuuid].datepicker._hideDatepicker()
					},
					today: function() {
						window['DP_jQuery_' + dpuuid].datepicker._gotoToday(id)
					},
					selectDay: function() {
						window['DP_jQuery_' + dpuuid].datepicker._selectDay(
							id,
							+this.getAttribute('data-month'),
							+this.getAttribute('data-year'),
							this
						)
						return false
					},
					selectMonth: function() {
						window['DP_jQuery_' + dpuuid].datepicker._selectMonthYear(
							id,
							this,
							'M'
						)
						return false
					},
					selectYear: function() {
						window['DP_jQuery_' + dpuuid].datepicker._selectMonthYear(
							id,
							this,
							'Y'
						)
						return false
					},
				}
				$(this).bind(
					this.getAttribute('data-event'),
					handler[this.getAttribute('data-handler')]
				)
			})
		},

		/* Generate the HTML for the current state of the date picker. */
		_generateHTML: function(inst) {
			var today = new Date()
			today = this._daylightSavingAdjust(
				new Date(today.getFullYear(), today.getMonth(), today.getDate())
			) // clear time
			var isRTL = this._get(inst, 'isRTL')
			var showButtonPanel = this._get(inst, 'showButtonPanel')
			var hideIfNoPrevNext = this._get(inst, 'hideIfNoPrevNext')
			var navigationAsDateFormat = this._get(inst, 'navigationAsDateFormat')
			var numMonths = this._getNumberOfMonths(inst)
			var showCurrentAtPos = this._get(inst, 'showCurrentAtPos')
			var stepMonths = this._get(inst, 'stepMonths')
			var isMultiMonth = numMonths[0] != 1 || numMonths[1] != 1
			var currentDate = this._daylightSavingAdjust(
				!inst.currentDay
					? new Date(9999, 9, 9)
					: new Date(inst.currentYear, inst.currentMonth, inst.currentDay)
			)
			var minDate = this._getMinMaxDate(inst, 'min')
			var maxDate = this._getMinMaxDate(inst, 'max')
			var drawMonth = inst.drawMonth - showCurrentAtPos
			var drawYear = inst.drawYear
			if (drawMonth < 0) {
				drawMonth += 12
				drawYear--
			}
			if (maxDate) {
				var maxDraw = this._daylightSavingAdjust(
					new Date(
						maxDate.getFullYear(),
						maxDate.getMonth() - numMonths[0] * numMonths[1] + 1,
						maxDate.getDate()
					)
				)
				maxDraw = minDate && maxDraw < minDate ? minDate : maxDraw
				while (
					this._daylightSavingAdjust(new Date(drawYear, drawMonth, 1)) > maxDraw
				) {
					drawMonth--
					if (drawMonth < 0) {
						drawMonth = 11
						drawYear--
					}
				}
			}
			inst.drawMonth = drawMonth
			inst.drawYear = drawYear
			var prevText = this._get(inst, 'prevText')
			prevText = !navigationAsDateFormat
				? prevText
				: this.formatDate(
						prevText,
						this._daylightSavingAdjust(
							new Date(drawYear, drawMonth - stepMonths, 1)
						),
						this._getFormatConfig(inst)
					)
			var prev = this._canAdjustMonth(inst, -1, drawYear, drawMonth)
				? '<a class="ui-datepicker-prev ui-corner-all" data-handler="prev" data-event="click"' +
						' title="' +
						prevText +
						'"><span class="ui-icon ui-icon-circle-triangle-' +
						(isRTL ? 'e' : 'w') +
						'">' +
						prevText +
						'</span></a>'
				: hideIfNoPrevNext
						? ''
						: '<a class="ui-datepicker-prev ui-corner-all ui-state-disabled" title="' +
								prevText +
								'"><span class="ui-icon ui-icon-circle-triangle-' +
								(isRTL ? 'e' : 'w') +
								'">' +
								prevText +
								'</span></a>'
			var nextText = this._get(inst, 'nextText')
			nextText = !navigationAsDateFormat
				? nextText
				: this.formatDate(
						nextText,
						this._daylightSavingAdjust(
							new Date(drawYear, drawMonth + stepMonths, 1)
						),
						this._getFormatConfig(inst)
					)
			var next = this._canAdjustMonth(inst, +1, drawYear, drawMonth)
				? '<a class="ui-datepicker-next ui-corner-all" data-handler="next" data-event="click"' +
						' title="' +
						nextText +
						'"><span class="ui-icon ui-icon-circle-triangle-' +
						(isRTL ? 'w' : 'e') +
						'">' +
						nextText +
						'</span></a>'
				: hideIfNoPrevNext
						? ''
						: '<a class="ui-datepicker-next ui-corner-all ui-state-disabled" title="' +
								nextText +
								'"><span class="ui-icon ui-icon-circle-triangle-' +
								(isRTL ? 'w' : 'e') +
								'">' +
								nextText +
								'</span></a>'
			var currentText = this._get(inst, 'currentText')
			var gotoDate = this._get(inst, 'gotoCurrent') && inst.currentDay
				? currentDate
				: today
			currentText = !navigationAsDateFormat
				? currentText
				: this.formatDate(currentText, gotoDate, this._getFormatConfig(inst))
			var controls = !inst.inline
				? '<button type="button" class="ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all" data-handler="hide" data-event="click">' +
						this._get(inst, 'closeText') +
						'</button>'
				: ''
			var buttonPanel = showButtonPanel
				? '<div class="ui-datepicker-buttonpane ui-widget-content">' +
						(isRTL ? controls : '') +
						(this._isInRange(inst, gotoDate)
							? '<button type="button" class="ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all" data-handler="today" data-event="click"' +
									'>' +
									currentText +
									'</button>'
							: '') +
						(isRTL ? '' : controls) +
						'</div>'
				: ''
			var firstDay = parseInt(this._get(inst, 'firstDay'), 10)
			firstDay = isNaN(firstDay) ? 0 : firstDay
			var showWeek = this._get(inst, 'showWeek')
			var dayNames = this._get(inst, 'dayNames')
			var dayNamesShort = this._get(inst, 'dayNamesShort')
			var dayNamesMin = this._get(inst, 'dayNamesMin')
			var monthNames = this._get(inst, 'monthNames')
			var monthNamesShort = this._get(inst, 'monthNamesShort')
			var beforeShowDay = this._get(inst, 'beforeShowDay')
			var showOtherMonths = this._get(inst, 'showOtherMonths')
			var selectOtherMonths = this._get(inst, 'selectOtherMonths')
			var calculateWeek = this._get(inst, 'calculateWeek') || this.iso8601Week
			var defaultDate = this._getDefaultDate(inst)
			var html = ''
			for (var row = 0; row < numMonths[0]; row++) {
				var group = ''
				this.maxRows = 4
				for (var col = 0; col < numMonths[1]; col++) {
					var selectedDate = this._daylightSavingAdjust(
						new Date(drawYear, drawMonth, inst.selectedDay)
					)
					var cornerClass = ' ui-corner-all'
					var calender = ''
					if (isMultiMonth) {
						calender += '<div class="ui-datepicker-group'
						if (numMonths[1] > 1)
							switch (col) {
								case 0:
									calender += ' ui-datepicker-group-first'
									cornerClass = ' ui-corner-' + (isRTL ? 'right' : 'left')
									break
								case numMonths[1] - 1:
									calender += ' ui-datepicker-group-last'
									cornerClass = ' ui-corner-' + (isRTL ? 'left' : 'right')
									break
								default:
									calender += ' ui-datepicker-group-middle'
									cornerClass = ''
									break
							}
						calender += '">'
					}
					calender +=
						'<div class="ui-datepicker-header ui-widget-header ui-helper-clearfix' +
						cornerClass +
						'">' +
						(/all|left/.test(cornerClass) && row == 0
							? isRTL ? next : prev
							: '') +
						(/all|right/.test(cornerClass) && row == 0
							? isRTL ? prev : next
							: '') +
						this._generateMonthYearHeader(
							inst,
							drawMonth,
							drawYear,
							minDate,
							maxDate,
							row > 0 || col > 0,
							monthNames,
							monthNamesShort
						) + // draw month headers
						'</div><table class="ui-datepicker-calendar"><thead>' +
						'<tr>'
					var thead = showWeek
						? '<th class="ui-datepicker-week-col">' +
								this._get(inst, 'weekHeader') +
								'</th>'
						: ''
					for (var dow = 0; dow < 7; dow++) {
						// days of the week
						var day = (dow + firstDay) % 7
						thead +=
							'<th' +
							((dow + firstDay + 6) % 7 >= 5
								? ' class="ui-datepicker-week-end"'
								: '') +
							'>' +
							'<span title="' +
							dayNames[day] +
							'">' +
							dayNamesMin[day] +
							'</span></th>'
					}
					calender += thead + '</tr></thead><tbody>'
					var daysInMonth = this._getDaysInMonth(drawYear, drawMonth)
					if (drawYear == inst.selectedYear && drawMonth == inst.selectedMonth)
						inst.selectedDay = Math.min(inst.selectedDay, daysInMonth)
					var leadDays =
						(this._getFirstDayOfMonth(drawYear, drawMonth) - firstDay + 7) % 7
					var curRows = Math.ceil((leadDays + daysInMonth) / 7) // calculate the number of rows to generate
					var numRows = isMultiMonth
						? this.maxRows > curRows ? this.maxRows : curRows
						: curRows //If multiple months, use the higher number of rows (see #7043)
					this.maxRows = numRows
					var printDate = this._daylightSavingAdjust(
						new Date(drawYear, drawMonth, 1 - leadDays)
					)
					for (var dRow = 0; dRow < numRows; dRow++) {
						// create date picker rows
						calender += '<tr>'
						var tbody = !showWeek
							? ''
							: '<td class="ui-datepicker-week-col">' +
									this._get(inst, 'calculateWeek')(printDate) +
									'</td>'
						for (var dow = 0; dow < 7; dow++) {
							// create date picker days
							var daySettings = beforeShowDay
								? beforeShowDay.apply(inst.input ? inst.input[0] : null, [
										printDate,
									])
								: [true, '']
							var otherMonth = printDate.getMonth() != drawMonth
							var unselectable =
								(otherMonth && !selectOtherMonths) ||
								!daySettings[0] ||
								(minDate && printDate < minDate) ||
								(maxDate && printDate > maxDate)
							tbody +=
								'<td class="' +
								((dow + firstDay + 6) % 7 >= 5
									? ' ui-datepicker-week-end'
									: '') + // highlight weekends
								(otherMonth ? ' ui-datepicker-other-month' : '') + // highlight days from other months
								((printDate.getTime() == selectedDate.getTime() &&
									drawMonth == inst.selectedMonth &&
									inst._keyEvent) || // user pressed key
									(defaultDate.getTime() == printDate.getTime() &&
										defaultDate.getTime() == selectedDate.getTime())
									? // or defaultDate is current printedDate and defaultDate is selectedDate
										' ' + this._dayOverClass
									: '') + // highlight selected day
								(unselectable
									? ' ' + this._unselectableClass + ' ui-state-disabled'
									: '') + // highlight unselectable days
								(otherMonth && !showOtherMonths
									? ''
									: ' ' +
										daySettings[1] + // highlight custom dates
										(printDate.getTime() == currentDate.getTime()
											? ' ' + this._currentClass
											: '') + // highlight selected day
											(printDate.getTime() == today.getTime()
												? ' ui-datepicker-today'
												: '')) +
								'"' + // highlight today (if different)
								((!otherMonth || showOtherMonths) && daySettings[2]
									? ' title="' + daySettings[2] + '"'
									: '') + // cell title
								(unselectable
									? ''
									: ' data-handler="selectDay" data-event="click" data-month="' +
											printDate.getMonth() +
											'" data-year="' +
											printDate.getFullYear() +
											'"') +
								'>' + // actions
								(otherMonth && !showOtherMonths
									? '&#xa0;' // display for other months
									: unselectable
											? '<span class="ui-state-default">' +
													printDate.getDate() +
													'</span>'
											: '<a class="ui-state-default' +
												(printDate.getTime() == today.getTime()
													? ' ui-state-highlight'
													: '') +
												(printDate.getTime() == currentDate.getTime()
													? ' ui-state-active'
													: '') + // highlight selected day
												(otherMonth ? ' ui-priority-secondary' : '') + // distinguish dates from other months
													'" href="#">' +
													printDate.getDate() +
													'</a>') +
								'</td>' // display selectable date
							printDate.setDate(printDate.getDate() + 1)
							printDate = this._daylightSavingAdjust(printDate)
						}
						calender += tbody + '</tr>'
					}
					drawMonth++
					if (drawMonth > 11) {
						drawMonth = 0
						drawYear++
					}
					calender +=
						'</tbody></table>' +
						(isMultiMonth
							? '</div>' +
									(numMonths[0] > 0 && col == numMonths[1] - 1
										? '<div class="ui-datepicker-row-break"></div>'
										: '')
							: '')
					group += calender
				}
				html += group
			}
			html +=
				buttonPanel +
				($.ui.ie6 && !inst.inline
					? '<iframe src="javascript:false;" class="ui-datepicker-cover" frameborder="0"></iframe>'
					: '')
			inst._keyEvent = false
			return html
		},

		/* Generate the month and year header. */
		_generateMonthYearHeader: function(
			inst,
			drawMonth,
			drawYear,
			minDate,
			maxDate,
			secondary,
			monthNames,
			monthNamesShort
		) {
			var changeMonth = this._get(inst, 'changeMonth')
			var changeYear = this._get(inst, 'changeYear')
			var showMonthAfterYear = this._get(inst, 'showMonthAfterYear')
			var html = '<div class="ui-datepicker-title">'
			var monthHtml = ''
			// month selection
			if (secondary || !changeMonth)
				monthHtml +=
					'<span class="ui-datepicker-month">' +
					monthNames[drawMonth] +
					'</span>'
			else {
				var inMinYear = minDate && minDate.getFullYear() == drawYear
				var inMaxYear = maxDate && maxDate.getFullYear() == drawYear
				monthHtml +=
					'<select class="ui-datepicker-month" data-handler="selectMonth" data-event="change">'
				for (var month = 0; month < 12; month++) {
					if (
						(!inMinYear || month >= minDate.getMonth()) &&
						(!inMaxYear || month <= maxDate.getMonth())
					)
						monthHtml +=
							'<option value="' +
							month +
							'"' +
							(month == drawMonth ? ' selected="selected"' : '') +
							'>' +
							monthNamesShort[month] +
							'</option>'
				}
				monthHtml += '</select>'
			}
			if (!showMonthAfterYear)
				html +=
					monthHtml +
					(secondary || !(changeMonth && changeYear) ? '&#xa0;' : '')
			// year selection
			if (!inst.yearshtml) {
				inst.yearshtml = ''
				if (secondary || !changeYear)
					html += '<span class="ui-datepicker-year">' + drawYear + '</span>'
				else {
					// determine range of years to display
					var years = this._get(inst, 'yearRange').split(':')
					var thisYear = new Date().getFullYear()
					var determineYear = function(value) {
						var year = value.match(/c[+-].*/)
							? drawYear + parseInt(value.substring(1), 10)
							: value.match(/[+-].*/)
									? thisYear + parseInt(value, 10)
									: parseInt(value, 10)
						return isNaN(year) ? thisYear : year
					}
					var year = determineYear(years[0])
					var endYear = Math.max(year, determineYear(years[1] || ''))
					year = minDate ? Math.max(year, minDate.getFullYear()) : year
					endYear = maxDate ? Math.min(endYear, maxDate.getFullYear()) : endYear
					inst.yearshtml +=
						'<select class="ui-datepicker-year" data-handler="selectYear" data-event="change">'
					for (; year <= endYear; year++) {
						inst.yearshtml +=
							'<option value="' +
							year +
							'"' +
							(year == drawYear ? ' selected="selected"' : '') +
							'>' +
							year +
							'</option>'
					}
					inst.yearshtml += '</select>'

					html += inst.yearshtml
					inst.yearshtml = null
				}
			}
			html += this._get(inst, 'yearSuffix')
			if (showMonthAfterYear)
				html +=
					(secondary || !(changeMonth && changeYear) ? '&#xa0;' : '') +
					monthHtml
			html += '</div>' // Close datepicker_header
			return html
		},

		/* Adjust one of the date sub-fields. */
		_adjustInstDate: function(inst, offset, period) {
			var year = inst.drawYear + (period == 'Y' ? offset : 0)
			var month = inst.drawMonth + (period == 'M' ? offset : 0)
			var day =
				Math.min(inst.selectedDay, this._getDaysInMonth(year, month)) +
				(period == 'D' ? offset : 0)
			var date = this._restrictMinMax(
				inst,
				this._daylightSavingAdjust(new Date(year, month, day))
			)
			inst.selectedDay = date.getDate()
			inst.drawMonth = inst.selectedMonth = date.getMonth()
			inst.drawYear = inst.selectedYear = date.getFullYear()
			if (period == 'M' || period == 'Y') this._notifyChange(inst)
		},

		/* Ensure a date is within any min/max bounds. */
		_restrictMinMax: function(inst, date) {
			var minDate = this._getMinMaxDate(inst, 'min')
			var maxDate = this._getMinMaxDate(inst, 'max')
			var newDate = minDate && date < minDate ? minDate : date
			newDate = maxDate && newDate > maxDate ? maxDate : newDate
			return newDate
		},

		/* Notify change of month/year. */
		_notifyChange: function(inst) {
			var onChange = this._get(inst, 'onChangeMonthYear')
			if (onChange)
				onChange.apply(inst.input ? inst.input[0] : null, [
					inst.selectedYear,
					inst.selectedMonth + 1,
					inst,
				])
		},

		/* Determine the number of months to show. */
		_getNumberOfMonths: function(inst) {
			var numMonths = this._get(inst, 'numberOfMonths')
			return numMonths == null
				? [1, 1]
				: typeof numMonths == 'number' ? [1, numMonths] : numMonths
		},

		/* Determine the current maximum date - ensure no time components are set. */
		_getMinMaxDate: function(inst, minMax) {
			return this._determineDate(inst, this._get(inst, minMax + 'Date'), null)
		},

		/* Find the number of days in a given month. */
		_getDaysInMonth: function(year, month) {
			return (
				32 - this._daylightSavingAdjust(new Date(year, month, 32)).getDate()
			)
		},

		/* Find the day of the week of the first of a month. */
		_getFirstDayOfMonth: function(year, month) {
			return new Date(year, month, 1).getDay()
		},

		/* Determines if we should allow a "next/prev" month display change. */
		_canAdjustMonth: function(inst, offset, curYear, curMonth) {
			var numMonths = this._getNumberOfMonths(inst)
			var date = this._daylightSavingAdjust(
				new Date(
					curYear,
					curMonth + (offset < 0 ? offset : numMonths[0] * numMonths[1]),
					1
				)
			)
			if (offset < 0)
				date.setDate(this._getDaysInMonth(date.getFullYear(), date.getMonth()))
			return this._isInRange(inst, date)
		},

		/* Is the given date in the accepted range? */
		_isInRange: function(inst, date) {
			var minDate = this._getMinMaxDate(inst, 'min')
			var maxDate = this._getMinMaxDate(inst, 'max')
			return (
				(!minDate || date.getTime() >= minDate.getTime()) &&
				(!maxDate || date.getTime() <= maxDate.getTime())
			)
		},

		/* Provide the configuration settings for formatting/parsing. */
		_getFormatConfig: function(inst) {
			var shortYearCutoff = this._get(inst, 'shortYearCutoff')
			shortYearCutoff = typeof shortYearCutoff != 'string'
				? shortYearCutoff
				: new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10)
			return {
				shortYearCutoff: shortYearCutoff,
				dayNamesShort: this._get(inst, 'dayNamesShort'),
				dayNames: this._get(inst, 'dayNames'),
				monthNamesShort: this._get(inst, 'monthNamesShort'),
				monthNames: this._get(inst, 'monthNames'),
			}
		},

		/* Format the given date for display. */
		_formatDate: function(inst, day, month, year) {
			if (!day) {
				inst.currentDay = inst.selectedDay
				inst.currentMonth = inst.selectedMonth
				inst.currentYear = inst.selectedYear
			}
			var date = day
				? typeof day == 'object'
						? day
						: this._daylightSavingAdjust(new Date(year, month, day))
				: this._daylightSavingAdjust(
						new Date(inst.currentYear, inst.currentMonth, inst.currentDay)
					)
			return this.formatDate(
				this._get(inst, 'dateFormat'),
				date,
				this._getFormatConfig(inst)
			)
		},
	})

	/*
 * Bind hover events for datepicker elements.
 * Done via delegate so the binding only occurs once in the lifetime of the parent div.
 * Global instActive, set by _updateDatepicker allows the handlers to find their way back to the active picker.
 */
	function bindHover(dpDiv) {
		var selector =
			'button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a'
		return dpDiv
			.delegate(selector, 'mouseout', function() {
				$(this).removeClass('ui-state-hover')
				if (this.className.indexOf('ui-datepicker-prev') != -1)
					$(this).removeClass('ui-datepicker-prev-hover')
				if (this.className.indexOf('ui-datepicker-next') != -1)
					$(this).removeClass('ui-datepicker-next-hover')
			})
			.delegate(selector, 'mouseover', function() {
				if (
					!$.datepicker._isDisabledDatepicker(
						instActive.inline ? dpDiv.parent()[0] : instActive.input[0]
					)
				) {
					$(this)
						.parents('.ui-datepicker-calendar')
						.find('a')
						.removeClass('ui-state-hover')
					$(this).addClass('ui-state-hover')
					if (this.className.indexOf('ui-datepicker-prev') != -1)
						$(this).addClass('ui-datepicker-prev-hover')
					if (this.className.indexOf('ui-datepicker-next') != -1)
						$(this).addClass('ui-datepicker-next-hover')
				}
			})
	}

	/* jQuery extend now ignores nulls! */
	function extendRemove(target, props) {
		$.extend(target, props)
		for (var name in props)
			if (props[name] == null || props[name] == undefined)
				target[name] = props[name]
		return target
	}

	/* Invoke the datepicker functionality.
   @param  options  string - a command, optionally followed by additional parameters or
	                Object - settings for attaching new datepicker functionality
   @return  jQuery object */
	$.fn.datepicker = function(options) {
		/* Verify an empty collection wasn't passed - Fixes #6976 */
		if (!this.length) {
			return this
		}

		/* Initialise the date picker. */
		if (!$.datepicker.initialized) {
			$(document)
				.mousedown($.datepicker._checkExternalClick)
				.find(document.body)
				.append($.datepicker.dpDiv)
			$.datepicker.initialized = true
		}

		var otherArgs = Array.prototype.slice.call(arguments, 1)
		if (
			typeof options == 'string' &&
			(options == 'isDisabled' || options == 'getDate' || options == 'widget')
		)
			return $.datepicker['_' + options + 'Datepicker'].apply(
				$.datepicker,
				[this[0]].concat(otherArgs)
			)
		if (
			options == 'option' &&
			arguments.length == 2 &&
			typeof arguments[1] == 'string'
		)
			return $.datepicker['_' + options + 'Datepicker'].apply(
				$.datepicker,
				[this[0]].concat(otherArgs)
			)
		return this.each(function() {
			typeof options == 'string'
				? $.datepicker['_' + options + 'Datepicker'].apply(
						$.datepicker,
						[this].concat(otherArgs)
					)
				: $.datepicker._attachDatepicker(this, options)
		})
	}

	$.datepicker = new Datepicker() // singleton instance
	$.datepicker.initialized = false
	$.datepicker.uuid = new Date().getTime()
	$.datepicker.version = '1.9.2'

	// Workaround for #4055
	// Add another global to avoid noConflict issues with inline event handlers
	window['DP_jQuery_' + dpuuid] = $
})(jQuery)
;(function($, undefined) {
	// number of pages in a slider
	// (how many times can you page up/down to go through the whole range)
	var numPages = 5

	$.widget('ui.slider', $.ui.mouse, {
		version: '1.9.2',
		widgetEventPrefix: 'slide',

		options: {
			animate: false,
			distance: 0,
			max: 100,
			min: 0,
			orientation: 'horizontal',
			range: false,
			step: 1,
			value: 0,
			values: null,
		},

		_create: function() {
			var i,
				handleCount,
				o = this.options,
				existingHandles = this.element
					.find('.ui-slider-handle')
					.addClass('ui-state-default ui-corner-all'),
				handle =
					"<a class='ui-slider-handle ui-state-default ui-corner-all' href='#'></a>",
				handles = []

			this._keySliding = false
			this._mouseSliding = false
			this._animateOff = true
			this._handleIndex = null
			this._detectOrientation()
			this._mouseInit()

			this.element.addClass(
				'ui-slider' +
					' ui-slider-' +
					this.orientation +
					' ui-widget' +
					' ui-widget-content' +
					' ui-corner-all' +
					(o.disabled ? ' ui-slider-disabled ui-disabled' : '')
			)

			this.range = $([])

			if (o.range) {
				if (o.range === true) {
					if (!o.values) {
						o.values = [this._valueMin(), this._valueMin()]
					}
					if (o.values.length && o.values.length !== 2) {
						o.values = [o.values[0], o.values[0]]
					}
				}

				this.range = $('<div></div>').appendTo(this.element).addClass(
					'ui-slider-range' +
						// note: this isn't the most fittingly semantic framework class for this element,
						// but worked best visually with a variety of themes
						' ui-widget-header' +
						(o.range === 'min' || o.range === 'max'
							? ' ui-slider-range-' + o.range
							: '')
				)
			}

			handleCount = (o.values && o.values.length) || 1

			for (i = existingHandles.length; i < handleCount; i++) {
				handles.push(handle)
			}

			this.handles = existingHandles.add(
				$(handles.join('')).appendTo(this.element)
			)

			this.handle = this.handles.eq(0)

			this.handles
				.add(this.range)
				.filter('a')
				.click(function(event) {
					event.preventDefault()
				})
				.mouseenter(function() {
					if (!o.disabled) {
						$(this).addClass('ui-state-hover')
					}
				})
				.mouseleave(function() {
					$(this).removeClass('ui-state-hover')
				})
				.focus(function() {
					if (!o.disabled) {
						$('.ui-slider .ui-state-focus').removeClass('ui-state-focus')
						$(this).addClass('ui-state-focus')
					} else {
						$(this).blur()
					}
				})
				.blur(function() {
					$(this).removeClass('ui-state-focus')
				})

			this.handles.each(function(i) {
				$(this).data('ui-slider-handle-index', i)
			})

			this._on(this.handles, {
				keydown: function(event) {
					var allowed,
						curVal,
						newVal,
						step,
						index = $(event.target).data('ui-slider-handle-index')

					switch (event.keyCode) {
						case $.ui.keyCode.HOME:
						case $.ui.keyCode.END:
						case $.ui.keyCode.PAGE_UP:
						case $.ui.keyCode.PAGE_DOWN:
						case $.ui.keyCode.UP:
						case $.ui.keyCode.RIGHT:
						case $.ui.keyCode.DOWN:
						case $.ui.keyCode.LEFT:
							event.preventDefault()
							if (!this._keySliding) {
								this._keySliding = true
								$(event.target).addClass('ui-state-active')
								allowed = this._start(event, index)
								if (allowed === false) {
									return
								}
							}
							break
					}

					step = this.options.step
					if (this.options.values && this.options.values.length) {
						curVal = newVal = this.values(index)
					} else {
						curVal = newVal = this.value()
					}

					switch (event.keyCode) {
						case $.ui.keyCode.HOME:
							newVal = this._valueMin()
							break
						case $.ui.keyCode.END:
							newVal = this._valueMax()
							break
						case $.ui.keyCode.PAGE_UP:
							newVal = this._trimAlignValue(
								curVal + (this._valueMax() - this._valueMin()) / numPages
							)
							break
						case $.ui.keyCode.PAGE_DOWN:
							newVal = this._trimAlignValue(
								curVal - (this._valueMax() - this._valueMin()) / numPages
							)
							break
						case $.ui.keyCode.UP:
						case $.ui.keyCode.RIGHT:
							if (curVal === this._valueMax()) {
								return
							}
							newVal = this._trimAlignValue(curVal + step)
							break
						case $.ui.keyCode.DOWN:
						case $.ui.keyCode.LEFT:
							if (curVal === this._valueMin()) {
								return
							}
							newVal = this._trimAlignValue(curVal - step)
							break
					}

					this._slide(event, index, newVal)
				},
				keyup: function(event) {
					var index = $(event.target).data('ui-slider-handle-index')

					if (this._keySliding) {
						this._keySliding = false
						this._stop(event, index)
						this._change(event, index)
						$(event.target).removeClass('ui-state-active')
					}
				},
			})

			this._refreshValue()

			this._animateOff = false
		},

		_destroy: function() {
			this.handles.remove()
			this.range.remove()

			this.element.removeClass(
				'ui-slider' +
					' ui-slider-horizontal' +
					' ui-slider-vertical' +
					' ui-slider-disabled' +
					' ui-widget' +
					' ui-widget-content' +
					' ui-corner-all'
			)

			this._mouseDestroy()
		},

		_mouseCapture: function(event) {
			var position,
				normValue,
				distance,
				closestHandle,
				index,
				allowed,
				offset,
				mouseOverHandle,
				that = this,
				o = this.options

			if (o.disabled) {
				return false
			}

			this.elementSize = {
				width: this.element.outerWidth(),
				height: this.element.outerHeight(),
			}
			this.elementOffset = this.element.offset()

			position = { x: event.pageX, y: event.pageY }
			normValue = this._normValueFromMouse(position)
			distance = this._valueMax() - this._valueMin() + 1
			this.handles.each(function(i) {
				var thisDistance = Math.abs(normValue - that.values(i))
				if (distance > thisDistance) {
					distance = thisDistance
					closestHandle = $(this)
					index = i
				}
			})

			// workaround for bug #3736 (if both handles of a range are at 0,
			// the first is always used as the one with least distance,
			// and moving it is obviously prevented by preventing negative ranges)
			if (o.range === true && this.values(1) === o.min) {
				index += 1
				closestHandle = $(this.handles[index])
			}

			allowed = this._start(event, index)
			if (allowed === false) {
				return false
			}
			this._mouseSliding = true

			this._handleIndex = index

			closestHandle.addClass('ui-state-active').focus()

			offset = closestHandle.offset()
			mouseOverHandle = !$(event.target)
				.parents()
				.andSelf()
				.is('.ui-slider-handle')
			this._clickOffset = mouseOverHandle
				? { left: 0, top: 0 }
				: {
						left: event.pageX - offset.left - closestHandle.width() / 2,
						top: event.pageY -
							offset.top -
							closestHandle.height() / 2 -
							(parseInt(closestHandle.css('borderTopWidth'), 10) || 0) -
							(parseInt(closestHandle.css('borderBottomWidth'), 10) || 0) +
							(parseInt(closestHandle.css('marginTop'), 10) || 0),
					}

			if (!this.handles.hasClass('ui-state-hover')) {
				this._slide(event, index, normValue)
			}
			this._animateOff = true
			return true
		},

		_mouseStart: function() {
			return true
		},

		_mouseDrag: function(event) {
			var position = { x: event.pageX, y: event.pageY },
				normValue = this._normValueFromMouse(position)

			this._slide(event, this._handleIndex, normValue)

			return false
		},

		_mouseStop: function(event) {
			this.handles.removeClass('ui-state-active')
			this._mouseSliding = false

			this._stop(event, this._handleIndex)
			this._change(event, this._handleIndex)

			this._handleIndex = null
			this._clickOffset = null
			this._animateOff = false

			return false
		},

		_detectOrientation: function() {
			this.orientation = this.options.orientation === 'vertical'
				? 'vertical'
				: 'horizontal'
		},

		_normValueFromMouse: function(position) {
			var pixelTotal, pixelMouse, percentMouse, valueTotal, valueMouse

			if (this.orientation === 'horizontal') {
				pixelTotal = this.elementSize.width
				pixelMouse =
					position.x -
					this.elementOffset.left -
					(this._clickOffset ? this._clickOffset.left : 0)
			} else {
				pixelTotal = this.elementSize.height
				pixelMouse =
					position.y -
					this.elementOffset.top -
					(this._clickOffset ? this._clickOffset.top : 0)
			}

			percentMouse = pixelMouse / pixelTotal
			if (percentMouse > 1) {
				percentMouse = 1
			}
			if (percentMouse < 0) {
				percentMouse = 0
			}
			if (this.orientation === 'vertical') {
				percentMouse = 1 - percentMouse
			}

			valueTotal = this._valueMax() - this._valueMin()
			valueMouse = this._valueMin() + percentMouse * valueTotal

			return this._trimAlignValue(valueMouse)
		},

		_start: function(event, index) {
			var uiHash = {
				handle: this.handles[index],
				value: this.value(),
			}
			if (this.options.values && this.options.values.length) {
				uiHash.value = this.values(index)
				uiHash.values = this.values()
			}
			return this._trigger('start', event, uiHash)
		},

		_slide: function(event, index, newVal) {
			var otherVal, newValues, allowed

			if (this.options.values && this.options.values.length) {
				otherVal = this.values(index ? 0 : 1)

				if (
					this.options.values.length === 2 &&
					this.options.range === true &&
					((index === 0 && newVal > otherVal) ||
						(index === 1 && newVal < otherVal))
				) {
					newVal = otherVal
				}

				if (newVal !== this.values(index)) {
					newValues = this.values()
					newValues[index] = newVal
					// A slide can be canceled by returning false from the slide callback
					allowed = this._trigger('slide', event, {
						handle: this.handles[index],
						value: newVal,
						values: newValues,
					})
					otherVal = this.values(index ? 0 : 1)
					if (allowed !== false) {
						this.values(index, newVal, true)
					}
				}
			} else {
				if (newVal !== this.value()) {
					// A slide can be canceled by returning false from the slide callback
					allowed = this._trigger('slide', event, {
						handle: this.handles[index],
						value: newVal,
					})
					if (allowed !== false) {
						this.value(newVal)
					}
				}
			}
		},

		_stop: function(event, index) {
			var uiHash = {
				handle: this.handles[index],
				value: this.value(),
			}
			if (this.options.values && this.options.values.length) {
				uiHash.value = this.values(index)
				uiHash.values = this.values()
			}

			this._trigger('stop', event, uiHash)
		},

		_change: function(event, index) {
			if (!this._keySliding && !this._mouseSliding) {
				var uiHash = {
					handle: this.handles[index],
					value: this.value(),
				}
				if (this.options.values && this.options.values.length) {
					uiHash.value = this.values(index)
					uiHash.values = this.values()
				}

				this._trigger('change', event, uiHash)
			}
		},

		value: function(newValue) {
			if (arguments.length) {
				this.options.value = this._trimAlignValue(newValue)
				this._refreshValue()
				this._change(null, 0)
				return
			}

			return this._value()
		},

		values: function(index, newValue) {
			var vals, newValues, i

			if (arguments.length > 1) {
				this.options.values[index] = this._trimAlignValue(newValue)
				this._refreshValue()
				this._change(null, index)
				return
			}

			if (arguments.length) {
				if ($.isArray(arguments[0])) {
					vals = this.options.values
					newValues = arguments[0]
					for (i = 0; i < vals.length; i += 1) {
						vals[i] = this._trimAlignValue(newValues[i])
						this._change(null, i)
					}
					this._refreshValue()
				} else {
					if (this.options.values && this.options.values.length) {
						return this._values(index)
					} else {
						return this.value()
					}
				}
			} else {
				return this._values()
			}
		},

		_setOption: function(key, value) {
			var i, valsLength = 0

			if ($.isArray(this.options.values)) {
				valsLength = this.options.values.length
			}

			$.Widget.prototype._setOption.apply(this, arguments)

			switch (key) {
				case 'disabled':
					if (value) {
						this.handles.filter('.ui-state-focus').blur()
						this.handles.removeClass('ui-state-hover')
						this.handles.prop('disabled', true)
						this.element.addClass('ui-disabled')
					} else {
						this.handles.prop('disabled', false)
						this.element.removeClass('ui-disabled')
					}
					break
				case 'orientation':
					this._detectOrientation()
					this.element
						.removeClass('ui-slider-horizontal ui-slider-vertical')
						.addClass('ui-slider-' + this.orientation)
					this._refreshValue()
					break
				case 'value':
					this._animateOff = true
					this._refreshValue()
					this._change(null, 0)
					this._animateOff = false
					break
				case 'values':
					this._animateOff = true
					this._refreshValue()
					for (i = 0; i < valsLength; i += 1) {
						this._change(null, i)
					}
					this._animateOff = false
					break
				case 'min':
				case 'max':
					this._animateOff = true
					this._refreshValue()
					this._animateOff = false
					break
			}
		},

		//internal value getter
		// _value() returns value trimmed by min and max, aligned by step
		_value: function() {
			var val = this.options.value
			val = this._trimAlignValue(val)

			return val
		},

		//internal values getter
		// _values() returns array of values trimmed by min and max, aligned by step
		// _values( index ) returns single value trimmed by min and max, aligned by step
		_values: function(index) {
			var val, vals, i

			if (arguments.length) {
				val = this.options.values[index]
				val = this._trimAlignValue(val)

				return val
			} else {
				// .slice() creates a copy of the array
				// this copy gets trimmed by min and max and then returned
				vals = this.options.values.slice()
				for (i = 0; i < vals.length; i += 1) {
					vals[i] = this._trimAlignValue(vals[i])
				}

				return vals
			}
		},

		// returns the step-aligned value that val is closest to, between (inclusive) min and max
		_trimAlignValue: function(val) {
			if (val <= this._valueMin()) {
				return this._valueMin()
			}
			if (val >= this._valueMax()) {
				return this._valueMax()
			}
			var step = this.options.step > 0 ? this.options.step : 1,
				valModStep = (val - this._valueMin()) % step,
				alignValue = val - valModStep

			if (Math.abs(valModStep) * 2 >= step) {
				alignValue += valModStep > 0 ? step : -step
			}

			// Since JavaScript has problems with large floats, round
			// the final value to 5 digits after the decimal point (see #4124)
			return parseFloat(alignValue.toFixed(5))
		},

		_valueMin: function() {
			return this.options.min
		},

		_valueMax: function() {
			return this.options.max
		},

		_refreshValue: function() {
			var lastValPercent,
				valPercent,
				value,
				valueMin,
				valueMax,
				oRange = this.options.range,
				o = this.options,
				that = this,
				animate = !this._animateOff ? o.animate : false,
				_set = {}

			if (this.options.values && this.options.values.length) {
				this.handles.each(function(i) {
					valPercent =
						(that.values(i) - that._valueMin()) /
						(that._valueMax() - that._valueMin()) *
						100
					_set[that.orientation === 'horizontal' ? 'left' : 'bottom'] =
						valPercent + '%'
					$(this).stop(1, 1)[animate ? 'animate' : 'css'](_set, o.animate)
					if (that.options.range === true) {
						if (that.orientation === 'horizontal') {
							if (i === 0) {
								that.range.stop(1, 1)[animate ? 'animate' : 'css'](
									{ left: valPercent + '%' },
									o.animate
								)
							}
							if (i === 1) {
								that.range[animate ? 'animate' : 'css'](
									{ width: valPercent - lastValPercent + '%' },
									{ queue: false, duration: o.animate }
								)
							}
						} else {
							if (i === 0) {
								that.range.stop(1, 1)[animate ? 'animate' : 'css'](
									{ bottom: valPercent + '%' },
									o.animate
								)
							}
							if (i === 1) {
								that.range[animate ? 'animate' : 'css'](
									{ height: valPercent - lastValPercent + '%' },
									{ queue: false, duration: o.animate }
								)
							}
						}
					}
					lastValPercent = valPercent
				})
			} else {
				value = this.value()
				valueMin = this._valueMin()
				valueMax = this._valueMax()
				valPercent = valueMax !== valueMin
					? (value - valueMin) / (valueMax - valueMin) * 100
					: 0
				_set[this.orientation === 'horizontal' ? 'left' : 'bottom'] =
					valPercent + '%'
				this.handle.stop(1, 1)[animate ? 'animate' : 'css'](_set, o.animate)

				if (oRange === 'min' && this.orientation === 'horizontal') {
					this.range.stop(1, 1)[animate ? 'animate' : 'css'](
						{ width: valPercent + '%' },
						o.animate
					)
				}
				if (oRange === 'max' && this.orientation === 'horizontal') {
					this.range[animate ? 'animate' : 'css'](
						{ width: 100 - valPercent + '%' },
						{ queue: false, duration: o.animate }
					)
				}
				if (oRange === 'min' && this.orientation === 'vertical') {
					this.range.stop(1, 1)[animate ? 'animate' : 'css'](
						{ height: valPercent + '%' },
						o.animate
					)
				}
				if (oRange === 'max' && this.orientation === 'vertical') {
					this.range[animate ? 'animate' : 'css'](
						{ height: 100 - valPercent + '%' },
						{ queue: false, duration: o.animate }
					)
				}
			}
		},
	})
})(jQuery)

define(
	'$ui',
	['$'],
	(function(global) {
		return function() {
			var ret, fn
			return ret || global.jQueryUi
		}
	})(this)
)

/**
 * @license RequireJS text 2.0.3 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false, location: false */

define('text', ['module'], function(module) {
	var text,
		fs,
		progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
		xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
		bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
		hasLocation = typeof location !== 'undefined' && location.href,
		defaultProtocol =
			hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
		defaultHostName = hasLocation && location.hostname,
		defaultPort = hasLocation && (location.port || undefined),
		buildMap = [],
		masterConfig = (module.config && module.config()) || {}

	text = {
		version: '2.0.3',

		strip: function(content) {
			//Strips <?xml ...?> declarations so that external SVG and XML
			//documents can be added to a document without worry. Also, if the string
			//is an HTML document, only the part inside the body tag is returned.
			if (content) {
				content = content.replace(xmlRegExp, '')
				var matches = content.match(bodyRegExp)
				if (matches) {
					content = matches[1]
				}
			} else {
				content = ''
			}
			return content
		},

		jsEscape: function(content) {
			return content
				.replace(/(['\\])/g, '\\$1')
				.replace(/[\f]/g, '\\f')
				.replace(/[\b]/g, '\\b')
				.replace(/[\n]/g, '\\n')
				.replace(/[\t]/g, '\\t')
				.replace(/[\r]/g, '\\r')
				.replace(/[\u2028]/g, '\\u2028')
				.replace(/[\u2029]/g, '\\u2029')
		},

		createXhr: masterConfig.createXhr ||
			function() {
				//Would love to dump the ActiveX crap in here. Need IE 6 to die first.
				var xhr, i, progId
				if (typeof XMLHttpRequest !== 'undefined') {
					return new XMLHttpRequest()
				} else if (typeof ActiveXObject !== 'undefined') {
					for (i = 0; i < 3; i += 1) {
						progId = progIds[i]
						try {
							xhr = new ActiveXObject(progId)
						} catch (e) {}

						if (xhr) {
							progIds = [progId] // so faster next time
							break
						}
					}
				}

				return xhr
			},

		/**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
		parseName: function(name) {
			var strip = false,
				index = name.indexOf('.'),
				modName = name.substring(0, index),
				ext = name.substring(index + 1, name.length)

			index = ext.indexOf('!')
			if (index !== -1) {
				//Pull off the strip arg.
				strip = ext.substring(index + 1, ext.length)
				strip = strip === 'strip'
				ext = ext.substring(0, index)
			}

			return {
				moduleName: modName,
				ext: ext,
				strip: strip,
			}
		},

		xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

		/**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
		useXhr: function(url, protocol, hostname, port) {
			var uProtocol, uHostName, uPort, match = text.xdRegExp.exec(url)
			if (!match) {
				return true
			}
			uProtocol = match[2]
			uHostName = match[3]

			uHostName = uHostName.split(':')
			uPort = uHostName[1]
			uHostName = uHostName[0]

			return (
				(!uProtocol || uProtocol === protocol) &&
				(!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
				((!uPort && !uHostName) || uPort === port)
			)
		},

		finishLoad: function(name, strip, content, onLoad) {
			content = strip ? text.strip(content) : content
			if (masterConfig.isBuild) {
				buildMap[name] = content
			}
			onLoad(content)
		},

		load: function(name, req, onLoad, config) {
			//Name has format: some.module.filext!strip
			//The strip part is optional.
			//if strip is present, then that means only get the string contents
			//inside a body tag in an HTML string. For XML/SVG content it means
			//removing the <?xml ...?> declarations so the content can be inserted
			//into the current doc without problems.

			// Do not bother with the work if a build and text will
			// not be inlined.
			if (config.isBuild && !config.inlineText) {
				onLoad()
				return
			}

			masterConfig.isBuild = config.isBuild

			var parsed = text.parseName(name),
				nonStripName = parsed.moduleName + '.' + parsed.ext,
				url = req.toUrl(nonStripName),
				useXhr = masterConfig.useXhr || text.useXhr

			//Load the text. Use XHR if possible and in a browser.
			if (
				!hasLocation ||
				useXhr(url, defaultProtocol, defaultHostName, defaultPort)
			) {
				text.get(
					url,
					function(content) {
						text.finishLoad(name, parsed.strip, content, onLoad)
					},
					function(err) {
						if (onLoad.error) {
							onLoad.error(err)
						}
					}
				)
			} else {
				//Need to fetch the resource across domains. Assume
				//the resource has been optimized into a JS module. Fetch
				//by the module name + extension, but do not include the
				//!strip part to avoid file system issues.
				req([nonStripName], function(content) {
					text.finishLoad(
						parsed.moduleName + '.' + parsed.ext,
						parsed.strip,
						content,
						onLoad
					)
				})
			}
		},

		write: function(pluginName, moduleName, write, config) {
			if (buildMap.hasOwnProperty(moduleName)) {
				var content = text.jsEscape(buildMap[moduleName])
				write.asModule(
					pluginName + '!' + moduleName,
					"define(function () { return '" + content + "';});\n"
				)
			}
		},

		writeFile: function(pluginName, moduleName, req, write, config) {
			var parsed = text.parseName(moduleName),
				nonStripName = parsed.moduleName + '.' + parsed.ext,
				//Use a '.js' file name so that it indicates it is a
				//script that can be loaded across domains.
				fileName = req.toUrl(parsed.moduleName + '.' + parsed.ext) + '.js'

			//Leverage own load() method to load plugin value, but only
			//write out values that do not have the strip argument,
			//to avoid any potential issues with ! in file names.
			text.load(
				nonStripName,
				req,
				function(value) {
					//Use own write() method to construct full module value.
					//But need to create shell that translates writeFile's
					//write() to the right interface.
					var textWrite = function(contents) {
						return write(fileName, contents)
					}
					textWrite.asModule = function(moduleName, contents) {
						return write.asModule(moduleName, fileName, contents)
					}

					text.write(pluginName, nonStripName, textWrite, config)
				},
				config
			)
		},
	}

	if (
		masterConfig.env === 'node' ||
		(!masterConfig.env &&
			typeof process !== 'undefined' &&
			process.versions &&
			!!process.versions.node)
	) {
		//Using special require.nodeRequire, something added by r.js.
		fs = require.nodeRequire('fs')

		text.get = function(url, callback) {
			var file = fs.readFileSync(url, 'utf8')
			//Remove BOM (Byte Mark Order) from utf8 files if it is there.
			if (file.indexOf('\uFEFF') === 0) {
				file = file.substring(1)
			}
			callback(file)
		}
	} else if (
		masterConfig.env === 'xhr' ||
		(!masterConfig.env && text.createXhr())
	) {
		text.get = function(url, callback, errback) {
			var xhr = text.createXhr()
			xhr.open('GET', url, true)

			//Allow overrides specified in config
			if (masterConfig.onXhr) {
				masterConfig.onXhr(xhr, url)
			}

			xhr.onreadystatechange = function(evt) {
				var status, err
				//Do not explicitly handle errors, those should be
				//visible via console output in the browser.
				if (xhr.readyState === 4) {
					status = xhr.status
					if (status > 399 && status < 600) {
						//An http 4xx or 5xx error. Signal an error.
						err = new Error(url + ' HTTP status: ' + status)
						err.xhr = xhr
						errback(err)
					} else {
						callback(xhr.responseText)
					}
				}
			}
			xhr.send(null)
		}
	} else if (
		masterConfig.env === 'rhino' ||
		(!masterConfig.env &&
			typeof Packages !== 'undefined' &&
			typeof java !== 'undefined')
	) {
		//Why Java, why is this so awkward?
		text.get = function(url, callback) {
			var stringBuffer,
				line,
				encoding = 'utf-8',
				file = new java.io.File(url),
				lineSeparator = java.lang.System.getProperty('line.separator'),
				input = new java.io.BufferedReader(
					new java.io.InputStreamReader(
						new java.io.FileInputStream(file),
						encoding
					)
				),
				content = ''
			try {
				stringBuffer = new java.lang.StringBuffer()
				line = input.readLine()

				// Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
				// http://www.unicode.org/faq/utf_bom.html

				// Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
				// http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
				if (line && line.length() && line.charAt(0) === 0xfeff) {
					// Eat the BOM, since we've already found the encoding on this file,
					// and we plan to concatenating this buffer with others; the BOM should
					// only appear at the top of a file.
					line = line.substring(1)
				}

				stringBuffer.append(line)

				while ((line = input.readLine()) !== null) {
					stringBuffer.append(lineSeparator)
					stringBuffer.append(line)
				}
				//Make sure we return a JavaScript string and not a Java string.
				content = String(stringBuffer.toString()) //String
			} finally {
				input.close()
			}
			callback(content)
		}
	}

	return text
})

define('$plugin', ['module', 'text'], function(module, text) {
	var prefix = 'libs/plugins/jquery/jquery.'

	return {
		load: function(name, req, load, config) {
			req(['$'], function($) {
				if (!config.isBuild) {
					req(['text!' + prefix + name + '.js'], function(val) {
						var contents =
							"define('" +
							module.id +
							'!' +
							name +
							"', ['$'], function ($) {\nvar jQuery = $;\n" +
							val +
							';\nreturn $;\n});\n'

						eval(contents)

						req([module.id + '!' + name], function(val) {
							load(val)
						})
					})
				} else {
					load('')
				}
			})
		},

		loadFromFileSystem: function(plugin, name) {
			var fs = nodeRequire('fs')
			var file = require.toUrl(prefix + name) + '.js'
			var contents = fs.readFileSync(file).toString()

			contents =
				"define('" +
				plugin +
				'!' +
				name +
				"', ['$'], function ($) {\nvar jQuery = $;\n" +
				contents +
				';\nreturn $;\n});\n'

			return contents
		},

		write: function(pluginName, moduleName, write, config) {
			write(this.loadFromFileSystem(pluginName, moduleName))
		},
	}
})

define('$plugin!select2', ['$'], function($) {
	var jQuery = $
	/*
Copyright 2012 Igor Vaynberg

Version: @@ver@@ Timestamp: @@timestamp@@

This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
General Public License version 2 (the "GPL License"). You may choose either license to govern your
use of this software only upon the condition that you accept all of the terms of either the Apache
License or the GPL License.

You may obtain a copy of the Apache License and the GPL License at:

    http://www.apache.org/licenses/LICENSE-2.0
    http://www.gnu.org/licenses/gpl-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the
Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
the specific language governing permissions and limitations under the Apache License and the GPL License.
*/
	;(function($) {
		if (typeof $.fn.each2 == 'undefined') {
			$.fn.extend({
				/*
			* 4-10 times faster .each replacement
			* use it carefully, as it overrides jQuery context of element on each iteration
			*/
				each2: function(c) {
					var j = $([0]), i = -1, l = this.length
					while (
						++i < l &&
						(j.context = j[0] = this[i]) &&
						c.call(j[0], i, j) !== false //"this"=DOM, i=index, j=jQuery object
					);
					return this
				},
			})
		}
	})(jQuery)
	;(function($, undefined) {
		/*global document, window, jQuery, console */

		if (window.Select2 !== undefined) {
			return
		}

		var KEY,
			AbstractSelect2,
			SingleSelect2,
			MultiSelect2,
			nextUid,
			sizer,
			lastMousePosition,
			$document

		KEY = {
			TAB: 9,
			ENTER: 13,
			ESC: 27,
			SPACE: 32,
			LEFT: 37,
			UP: 38,
			RIGHT: 39,
			DOWN: 40,
			SHIFT: 16,
			CTRL: 17,
			ALT: 18,
			PAGE_UP: 33,
			PAGE_DOWN: 34,
			HOME: 36,
			END: 35,
			BACKSPACE: 8,
			DELETE: 46,
			isArrow: function(k) {
				k = k.which ? k.which : k
				switch (k) {
					case KEY.LEFT:
					case KEY.RIGHT:
					case KEY.UP:
					case KEY.DOWN:
						return true
				}
				return false
			},
			isControl: function(e) {
				var k = e.which
				switch (k) {
					case KEY.SHIFT:
					case KEY.CTRL:
					case KEY.ALT:
						return true
				}

				if (e.metaKey) return true

				return false
			},
			isFunctionKey: function(k) {
				k = k.which ? k.which : k
				return k >= 112 && k <= 123
			},
		}

		$document = $(document)

		nextUid = (function() {
			var counter = 1
			return function() {
				return counter++
			}
		})()

		function indexOf(value, array) {
			var i = 0, l = array.length, v

			if (typeof value === 'undefined') {
				return -1
			}

			if (value.constructor === String) {
				for (; i < l; i = i + 1)
					if (value.localeCompare(array[i]) === 0) return i
			} else {
				for (; i < l; i = i + 1) {
					v = array[i]
					if (v.constructor === String) {
						if (v.localeCompare(value) === 0) return i
					} else {
						if (v === value) return i
					}
				}
			}
			return -1
		}

		/**
     * Compares equality of a and b taking into account that a and b may be strings, in which case localeCompare is used
     * @param a
     * @param b
     */
		function equal(a, b) {
			if (a === b) return true
			if (a === undefined || b === undefined) return false
			if (a === null || b === null) return false
			if (a.constructor === String) return a.localeCompare(b) === 0
			if (b.constructor === String) return b.localeCompare(a) === 0
			return false
		}

		/**
     * Splits the string into an array of values, trimming each value. An empty array is returned for nulls or empty
     * strings
     * @param string
     * @param separator
     */
		function splitVal(string, separator) {
			var val, i, l
			if (string === null || string.length < 1) return []
			val = string.split(separator)
			for ((i = 0), (l = val.length); i < l; i = i + 1) val[i] = $.trim(val[i])
			return val
		}

		function getSideBorderPadding(element) {
			return element.outerWidth(false) - element.width()
		}

		function installKeyUpChangeEvent(element) {
			var key = 'keyup-change-value'
			element.bind('keydown', function() {
				if ($.data(element, key) === undefined) {
					$.data(element, key, element.val())
				}
			})
			element.bind('keyup', function() {
				var val = $.data(element, key)
				if (val !== undefined && element.val() !== val) {
					$.removeData(element, key)
					element.trigger('keyup-change')
				}
			})
		}

		$document.bind('mousemove', function(e) {
			lastMousePosition = { x: e.pageX, y: e.pageY }
		})

		/**
     * filters mouse events so an event is fired only if the mouse moved.
     *
     * filters out mouse events that occur when mouse is stationary but
     * the elements under the pointer are scrolled.
     */
		function installFilteredMouseMove(element) {
			element.bind('mousemove', function(e) {
				var lastpos = lastMousePosition
				if (
					lastpos === undefined ||
					lastpos.x !== e.pageX ||
					lastpos.y !== e.pageY
				) {
					$(e.target).trigger('mousemove-filtered', e)
				}
			})
		}

		/**
     * Debounces a function. Returns a function that calls the original fn function only if no invocations have been made
     * within the last quietMillis milliseconds.
     *
     * @param quietMillis number of milliseconds to wait before invoking fn
     * @param fn function to be debounced
     * @param ctx object to be used as this reference within fn
     * @return debounced version of fn
     */
		function debounce(quietMillis, fn, ctx) {
			ctx = ctx || undefined
			var timeout
			return function() {
				var args = arguments
				window.clearTimeout(timeout)
				timeout = window.setTimeout(function() {
					fn.apply(ctx, args)
				}, quietMillis)
			}
		}

		/**
     * A simple implementation of a thunk
     * @param formula function used to lazily initialize the thunk
     * @return {Function}
     */
		function thunk(formula) {
			var evaluated = false, value
			return function() {
				if (evaluated === false) {
					value = formula()
					evaluated = true
				}
				return value
			}
		}

		function installDebouncedScroll(threshold, element) {
			var notify = debounce(threshold, function(e) {
				element.trigger('scroll-debounced', e)
			})
			element.bind('scroll', function(e) {
				if (indexOf(e.target, element.get()) >= 0) notify(e)
			})
		}

		function killEvent(event) {
			event.preventDefault()
			event.stopPropagation()
		}
		function killEventImmediately(event) {
			event.preventDefault()
			event.stopImmediatePropagation()
		}

		function measureTextWidth(e) {
			if (!sizer) {
				var style = e[0].currentStyle || window.getComputedStyle(e[0], null)
				sizer = $('<div></div>').css({
					position: 'absolute',
					left: '-10000px',
					top: '-10000px',
					display: 'none',
					fontSize: style.fontSize,
					fontFamily: style.fontFamily,
					fontStyle: style.fontStyle,
					fontWeight: style.fontWeight,
					letterSpacing: style.letterSpacing,
					textTransform: style.textTransform,
					whiteSpace: 'nowrap',
				})
				$('body').append(sizer)
			}
			sizer.text(e.val())
			return sizer.width()
		}

		function markMatch(text, term, markup) {
			var match = text.toUpperCase().indexOf(term.toUpperCase()),
				tl = term.length

			if (match < 0) {
				markup.push(text)
				return
			}

			markup.push(text.substring(0, match))
			markup.push("<span class='select2-match'>")
			markup.push(text.substring(match, match + tl))
			markup.push('</span>')
			markup.push(text.substring(match + tl, text.length))
		}

		/**
     * Produces an ajax-based query function
     *
     * @param options object containing configuration paramters
     * @param options.transport function that will be used to execute the ajax request. must be compatible with parameters supported by $.ajax
     * @param options.url url for the data
     * @param options.data a function(searchTerm, pageNumber, context) that should return an object containing query string parameters for the above url.
     * @param options.dataType request data type: ajax, jsonp, other datatatypes supported by jQuery's $.ajax function or the transport function if specified
     * @param options.traditional a boolean flag that should be true if you wish to use the traditional style of param serialization for the ajax request
     * @param options.quietMillis (optional) milliseconds to wait before making the ajaxRequest, helps debounce the ajax function if invoked too often
     * @param options.results a function(remoteData, pageNumber) that converts data returned form the remote request to the format expected by Select2.
     *      The expected format is an object containing the following keys:
     *      results array of objects that will be used as choices
     *      more (optional) boolean indicating whether there are more results available
     *      Example: {results:[{id:1, text:'Red'},{id:2, text:'Blue'}], more:true}
     */
		function ajax(options) {
			var timeout, // current scheduled but not yet executed request
				requestSequence = 0, // sequence used to drop out-of-order responses
				handler = null,
				quietMillis = options.quietMillis || 100

			return function(query) {
				window.clearTimeout(timeout)
				timeout = window.setTimeout(function() {
					requestSequence += 1 // increment the sequence
					var requestNumber = requestSequence, // this request's sequence number
						data = options.data, // ajax data function
						transport = options.transport || $.ajax,
						traditional = options.traditional || false,
						type = options.type || 'GET' // set type of request (GET or POST)

					data = data.call(this, query.term, query.page, query.context)

					if (null !== handler) {
						handler.abort()
					}

					handler = transport.call(null, {
						url: options.url,
						dataType: options.dataType,
						data: data,
						type: type,
						traditional: traditional,
						success: function(data) {
							if (requestNumber < requestSequence) {
								return
							}
							// TODO 3.0 - replace query.page with query so users have access to term, page, etc.
							var results = options.results(data, query.page)
							query.callback(results)
						},
					})
				}, quietMillis)
			}
		}

		/**
     * Produces a query function that works with a local array
     *
     * @param options object containing configuration parameters. The options parameter can either be an array or an
     * object.
     *
     * If the array form is used it is assumed that it contains objects with 'id' and 'text' keys.
     *
     * If the object form is used ti is assumed that it contains 'data' and 'text' keys. The 'data' key should contain
     * an array of objects that will be used as choices. These objects must contain at least an 'id' key. The 'text'
     * key can either be a String in which case it is expected that each element in the 'data' array has a key with the
     * value of 'text' which will be used to match choices. Alternatively, text can be a function(item) that can extract
     * the text.
     */
		function local(options) {
			var data = options, // data elements
				dataText,
				text = function(item) {
					return '' + item.text
				} // function used to retrieve the text portion of a data item that is matched against the search

			if (!$.isArray(data)) {
				text = data.text
				// if text is not a function we assume it to be a key name
				if (!$.isFunction(text)) {
					dataText = data.text // we need to store this in a separate variable because in the next step data gets reset and data.text is no longer available
					text = function(item) {
						return item[dataText]
					}
				}
				data = data.results
			}

			return function(query) {
				var t = query.term, filtered = { results: [] }, process
				if (t === '') {
					query.callback({ results: data })
					return
				}

				process = function(datum, collection) {
					var group, attr
					datum = datum[0]
					if (datum.children) {
						group = {}
						for (attr in datum) {
							if (datum.hasOwnProperty(attr)) group[attr] = datum[attr]
						}
						group.children = []
						$(datum.children).each2(function(i, childDatum) {
							process(childDatum, group.children)
						})
						if (group.children.length || query.matcher(t, text(group))) {
							collection.push(group)
						}
					} else {
						if (query.matcher(t, text(datum))) {
							collection.push(datum)
						}
					}
				}

				$(data).each2(function(i, datum) {
					process(datum, filtered.results)
				})
				query.callback(filtered)
			}
		}

		// TODO javadoc
		function tags(data) {
			// TODO even for a function we should probably return a wrapper that does the same object/string check as
			// the function for arrays. otherwise only functions that return objects are supported.
			if ($.isFunction(data)) {
				return data
			}

			// if not a function we assume it to be an array

			return function(query) {
				var t = query.term, filtered = { results: [] }
				$(data).each(function() {
					var isObject = this.text !== undefined,
						text = isObject ? this.text : this
					if (t === '' || query.matcher(t, text)) {
						filtered.results.push(isObject ? this : { id: this, text: this })
					}
				})
				query.callback(filtered)
			}
		}

		/**
     * Checks if the formatter function should be used.
     *
     * Throws an error if it is not a function. Returns true if it should be used,
     * false if no formatting should be performed.
     *
     * @param formatter
     */
		function checkFormatter(formatter, formatterName) {
			if ($.isFunction(formatter)) return true
			if (!formatter) return false
			throw new Error('formatterName must be a function or a falsy value')
		}

		function evaluate(val) {
			return $.isFunction(val) ? val() : val
		}

		function countResults(results) {
			var count = 0
			$.each(results, function(i, item) {
				if (item.children) {
					count += countResults(item.children)
				} else {
					count++
				}
			})
			return count
		}

		/**
     * Default tokenizer. This function uses breaks the input on substring match of any string from the
     * opts.tokenSeparators array and uses opts.createSearchChoice to create the choice object. Both of those
     * two options have to be defined in order for the tokenizer to work.
     *
     * @param input text user has typed so far or pasted into the search field
     * @param selection currently selected choices
     * @param selectCallback function(choice) callback tho add the choice to selection
     * @param opts select2's opts
     * @return undefined/null to leave the current input unchanged, or a string to change the input to the returned value
     */
		function defaultTokenizer(input, selection, selectCallback, opts) {
			var original = input, // store the original so we can compare and know if we need to tell the search to update its text
				dupe = false, // check for whether a token we extracted represents a duplicate selected choice
				token, // token
				index, // position at which the separator was found
				i,
				l, // looping variables
				separator // the matched separator

			if (
				!opts.createSearchChoice ||
				!opts.tokenSeparators ||
				opts.tokenSeparators.length < 1
			)
				return undefined

			while (true) {
				index = -1

				for ((i = 0), (l = opts.tokenSeparators.length); i < l; i++) {
					separator = opts.tokenSeparators[i]
					index = input.indexOf(separator)
					if (index >= 0) break
				}

				if (index < 0) break // did not find any token separator in the input string, bail

				token = input.substring(0, index)
				input = input.substring(index + separator.length)

				if (token.length > 0) {
					token = opts.createSearchChoice(token, selection)
					if (
						token !== undefined &&
						token !== null &&
						opts.id(token) !== undefined &&
						opts.id(token) !== null
					) {
						dupe = false
						for ((i = 0), (l = selection.length); i < l; i++) {
							if (equal(opts.id(token), opts.id(selection[i]))) {
								dupe = true
								break
							}
						}

						if (!dupe) selectCallback(token)
					}
				}
			}

			if (original.localeCompare(input) != 0) return input
		}

		/**
     * blurs any Select2 container that has focus when an element outside them was clicked or received focus
     *
     * also takes care of clicks on label tags that point to the source element
     */
		$document.ready(function() {
			$document.bind('mousedown touchend', function(e) {
				var target = $(e.target).closest('div.select2-container').get(0), attr
				if (target) {
					$document.find('div.select2-container-active').each(function() {
						if (this !== target) $(this).data('select2').blur()
					})
				} else {
					target = $(e.target).closest('div.select2-drop').get(0)
					$document.find('div.select2-drop-active').each(function() {
						if (this !== target) $(this).data('select2').blur()
					})
				}

				target = $(e.target)
				attr = target.attr('for')
				if ('LABEL' === e.target.tagName && attr && attr.length > 0) {
					attr = attr.replace(
						/([\[\].])/g,
						'\\$1'
					) /* escapes [, ], and . so properly selects the id */
					target = $('#' + attr)
					target = target.data('select2')
					if (target !== undefined) {
						target.focus()
						e.preventDefault()
					}
				}
			})
		})

		/**
     * Creates a new class
     *
     * @param superClass
     * @param methods
     */
		function clazz(SuperClass, methods) {
			var constructor = function() {}
			constructor.prototype = new SuperClass()
			constructor.prototype.constructor = constructor
			constructor.prototype.parent = SuperClass.prototype
			constructor.prototype = $.extend(constructor.prototype, methods)
			return constructor
		}

		AbstractSelect2 = clazz(Object, {
			// abstract
			bind: function(func) {
				var self = this
				return function() {
					func.apply(self, arguments)
				}
			},

			// abstract
			init: function(opts) {
				var results, search, resultsSelector = '.select2-results'

				// prepare options
				this.opts = opts = this.prepareOpts(opts)

				this.id = opts.id

				// destroy if called on an existing component
				if (
					opts.element.data('select2') !== undefined &&
					opts.element.data('select2') !== null
				) {
					this.destroy()
				}

				this.enabled = true
				this.container = this.createContainer()

				this.containerId =
					's2id_' + (opts.element.attr('id') || 'autogen' + nextUid())
				this.containerSelector =
					'#' +
					this.containerId.replace(
						/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g,
						'\\$1'
					)
				this.container.attr('id', this.containerId)

				// cache the body so future lookups are cheap
				this.body = thunk(function() {
					return opts.element.closest('body')
				})

				if (opts.element.attr('class') !== undefined) {
					this.container.addClass(
						opts.element.attr('class').replace(/validate\[[\S ]+] ?/, '')
					)
				}

				this.container.css(evaluate(opts.containerCss))
				this.container.addClass(evaluate(opts.containerCssClass))

				// swap container for the element
				this.opts.element.data('select2', this).hide().before(this.container)
				this.container.data('select2', this)

				this.dropdown = this.container.find('.select2-drop')
				this.dropdown.addClass(evaluate(opts.dropdownCssClass))
				this.dropdown.data('select2', this)

				this.results = results = this.container.find(resultsSelector)
				this.search = search = this.container.find('input.select2-input')

				search.attr('tabIndex', this.opts.element.attr('tabIndex'))

				this.resultsPage = 0
				this.context = null

				// initialize the container
				this.initContainer()
				this.initContainerWidth()

				installFilteredMouseMove(this.results)
				this.dropdown.delegate(
					resultsSelector,
					'mousemove-filtered',
					this.bind(this.highlightUnderEvent)
				)

				installDebouncedScroll(80, this.results)
				this.dropdown.delegate(
					resultsSelector,
					'scroll-debounced',
					this.bind(this.loadMoreIfNeeded)
				)

				// if jquery.mousewheel plugin is installed we can prevent out-of-bounds scrolling of results via mousewheel
				if ($.fn.mousewheel) {
					results.mousewheel(function(e, delta, deltaX, deltaY) {
						var top = results.scrollTop(), height
						if (deltaY > 0 && top - deltaY <= 0) {
							results.scrollTop(0)
							killEvent(e)
						} else if (
							deltaY < 0 &&
							results.get(0).scrollHeight - results.scrollTop() + deltaY <=
								results.height()
						) {
							results.scrollTop(results.get(0).scrollHeight - results.height())
							killEvent(e)
						}
					})
				}

				installKeyUpChangeEvent(search)
				search.bind('keyup-change', this.bind(this.updateResults))
				search.bind('focus', function() {
					search.addClass('select2-focused')
					if (search.val() === ' ') search.val('')
				})
				search.bind('blur', function() {
					search.removeClass('select2-focused')
				})

				this.dropdown.delegate(
					resultsSelector,
					'mouseup',
					this.bind(function(e) {
						if (
							$(e.target).closest(
								'.select2-result-selectable:not(.select2-disabled)'
							).length > 0
						) {
							this.highlightUnderEvent(e)
							this.selectHighlighted(e)
						} else {
							this.focusSearch()
						}
						killEvent(e)
					})
				)

				// trap all mouse events from leaving the dropdown. sometimes there may be a modal that is listening
				// for mouse events outside of itself so it can close itself. since the dropdown is now outside the select2's
				// dom it will trigger the popup close, which is not what we want
				this.dropdown.bind('click mouseup mousedown', function(e) {
					e.stopPropagation()
				})

				if ($.isFunction(this.opts.initSelection)) {
					// initialize selection based on the current value of the source element
					this.initSelection()

					// if the user has provided a function that can set selection based on the value of the source element
					// we monitor the change event on the element and trigger it, allowing for two way synchronization
					this.monitorSource()
				}

				if (
					opts.element.is(':disabled') ||
					opts.element.is("[readonly='readonly']")
				)
					this.disable()
			},

			// abstract
			destroy: function() {
				var select2 = this.opts.element.data('select2')
				if (select2 !== undefined) {
					select2.container.remove()
					select2.dropdown.remove()
					select2.opts.element.removeData('select2').unbind('.select2').show()
				}
			},

			// abstract
			prepareOpts: function(opts) {
				var element, select, idKey, ajaxUrl

				element = opts.element

				if (element.get(0).tagName.toLowerCase() === 'select') {
					this.select = select = opts.element
				}

				if (select) {
					// these options are not allowed when attached to a select because they are picked up off the element itself
					$.each(
						[
							'id',
							'multiple',
							'ajax',
							'query',
							'createSearchChoice',
							'initSelection',
							'data',
							'tags',
						],
						function() {
							if (this in opts) {
								throw new Error(
									"Option '" +
										this +
										"' is not allowed for Select2 when attached to a <select> element."
								)
							}
						}
					)
				}

				opts = $.extend(
					{},
					{
						populateResults: function(container, results, query) {
							var populate,
								data,
								result,
								children,
								id = this.opts.id,
								self = this

							populate = function(results, container, depth) {
								var i,
									l,
									result,
									selectable,
									compound,
									node,
									label,
									innerContainer,
									formatted
								for ((i = 0), (l = results.length); i < l; i = i + 1) {
									result = results[i]
									selectable = id(result) !== undefined
									compound = result.children && result.children.length > 0

									node = $('<li></li>')
									node.addClass('select2-results-dept-' + depth)
									node.addClass('select2-result')
									node.addClass(
										selectable
											? 'select2-result-selectable'
											: 'select2-result-unselectable'
									)
									if (compound) {
										node.addClass('select2-result-with-children')
									}
									node.addClass(self.opts.formatResultCssClass(result))

									label = $('<div></div>')
									label.addClass('select2-result-label')

									formatted = opts.formatResult(result, label, query)
									if (formatted !== undefined) {
										label.html(self.opts.escapeMarkup(formatted))
									}

									node.append(label)

									if (compound) {
										innerContainer = $('<ul></ul>')
										innerContainer.addClass('select2-result-sub')
										populate(result.children, innerContainer, depth + 1)
										node.append(innerContainer)
									}

									node.data('select2-data', result)
									container.append(node)
								}
							}

							populate(results, container, 0)
						},
					},
					$.fn.select2.defaults,
					opts
				)

				if (typeof opts.id !== 'function') {
					idKey = opts.id
					opts.id = function(e) {
						return e[idKey]
					}
				}

				if (select) {
					opts.query = this.bind(function(query) {
						var data = { results: [], more: false },
							term = query.term,
							children,
							firstChild,
							process

						process = function(element, collection) {
							var group
							if (element.is('option')) {
								if (query.matcher(term, element.text(), element)) {
									collection.push({
										id: element.attr('value'),
										text: element.text(),
										element: element.get(),
										css: element.attr('class'),
									})
								}
							} else if (element.is('optgroup')) {
								group = {
									text: element.attr('label'),
									children: [],
									element: element.get(),
									css: element.attr('class'),
								}
								element.children().each2(function(i, elm) {
									process(elm, group.children)
								})
								if (group.children.length > 0) {
									collection.push(group)
								}
							}
						}

						children = element.children()

						// ignore the placeholder option if there is one
						if (this.getPlaceholder() !== undefined && children.length > 0) {
							firstChild = children[0]
							if ($(firstChild).text() === '') {
								children = children.not(firstChild)
							}
						}

						children.each2(function(i, elm) {
							process(elm, data.results)
						})

						query.callback(data)
					})
					// this is needed because inside val() we construct choices from options and there id is hardcoded
					opts.id = function(e) {
						return e.id
					}
					opts.formatResultCssClass = function(data) {
						return data.css
					}
				} else {
					if (!('query' in opts)) {
						if ('ajax' in opts) {
							ajaxUrl = opts.element.data('ajax-url')
							if (ajaxUrl && ajaxUrl.length > 0) {
								opts.ajax.url = ajaxUrl
							}
							opts.query = ajax(opts.ajax)
						} else if ('data' in opts) {
							opts.query = local(opts.data)
						} else if ('tags' in opts) {
							opts.query = tags(opts.tags)
							opts.createSearchChoice = function(term) {
								return { id: term, text: term }
							}
							opts.initSelection = function(element, callback) {
								var data = []
								$(splitVal(element.val(), opts.separator)).each(function() {
									var id = this, text = this, tags = opts.tags
									if ($.isFunction(tags)) tags = tags()
									$(tags).each(function() {
										if (equal(this.id, id)) {
											text = this.text
											return false
										}
									})
									data.push({ id: id, text: text })
								})

								callback(data)
							}
						}
					}
				}
				if (typeof opts.query !== 'function') {
					throw 'query function not defined for Select2 ' +
						opts.element.attr('id')
				}

				return opts
			},

			/**
         * Monitor the original element for changes and update select2 accordingly
         */
			// abstract
			monitorSource: function() {
				this.opts.element.bind(
					'change.select2',
					this.bind(function(e) {
						if (this.opts.element.data('select2-change-triggered') !== true) {
							this.initSelection()
						}
					})
				)
			},

			/**
         * Triggers the change event on the source element
         */
			// abstract
			triggerChange: function(details) {
				details = details || {}
				details = $.extend({}, details, { type: 'change', val: this.val() })
				// prevents recursive triggering
				this.opts.element.data('select2-change-triggered', true)
				this.opts.element.trigger(details)
				this.opts.element.data('select2-change-triggered', false)

				// some validation frameworks ignore the change event and listen instead to keyup, click for selects
				// so here we trigger the click event manually
				this.opts.element.click()

				// ValidationEngine ignorea the change event and listens instead to blur
				// so here we trigger the blur event manually if so desired
				if (this.opts.blurOnChange) this.opts.element.blur()
			},

			// abstract
			enable: function() {
				if (this.enabled) return

				this.enabled = true
				this.container.removeClass('select2-container-disabled')
				this.opts.element.removeAttr('disabled')
			},

			// abstract
			disable: function() {
				if (!this.enabled) return

				this.close()

				this.enabled = false
				this.container.addClass('select2-container-disabled')
				this.opts.element.attr('disabled', 'disabled')
			},

			// abstract
			opened: function() {
				return this.container.hasClass('select2-dropdown-open')
			},

			// abstract
			positionDropdown: function() {
				var offset = this.container.offset(),
					height = this.container.outerHeight(false),
					width = this.container.outerWidth(false),
					dropHeight = this.dropdown.outerHeight(false),
					viewportBottom =
						$(window).scrollTop() + document.documentElement.clientHeight,
					dropTop = offset.top + height,
					dropLeft = offset.left,
					enoughRoomBelow = dropTop + dropHeight <= viewportBottom,
					enoughRoomAbove = offset.top - dropHeight >= this.body().scrollTop(),
					aboveNow = this.dropdown.hasClass('select2-drop-above'),
					bodyOffset,
					above,
					css

				// console.log("below/ droptop:", dropTop, "dropHeight", dropHeight, "sum", (dropTop+dropHeight)+" viewport bottom", viewportBottom, "enough?", enoughRoomBelow);
				// console.log("above/ offset.top", offset.top, "dropHeight", dropHeight, "top", (offset.top-dropHeight), "scrollTop", this.body().scrollTop(), "enough?", enoughRoomAbove);

				// fix positioning when body has an offset and is not position: static

				if (this.body().css('position') !== 'static') {
					bodyOffset = this.body().offset()
					dropTop -= bodyOffset.top
					dropLeft -= bodyOffset.left
				}

				// always prefer the current above/below alignment, unless there is not enough room

				if (aboveNow) {
					above = true
					if (!enoughRoomAbove && enoughRoomBelow) above = false
				} else {
					above = false
					if (!enoughRoomBelow && enoughRoomAbove) above = true
				}

				if (above) {
					dropTop = offset.top - dropHeight
					this.container.addClass('select2-drop-above')
					this.dropdown.addClass('select2-drop-above')
				} else {
					this.container.removeClass('select2-drop-above')
					this.dropdown.removeClass('select2-drop-above')
				}

				css = $.extend(
					{
						top: dropTop,
						left: dropLeft,
						width: width,
					},
					evaluate(this.opts.dropdownCss)
				)

				this.dropdown.css(css)
			},

			// abstract
			shouldOpen: function() {
				var event

				if (this.opened()) return false

				event = $.Event('open')
				this.opts.element.trigger(event)
				return !event.isDefaultPrevented()
			},

			// abstract
			clearDropdownAlignmentPreference: function() {
				// clear the classes used to figure out the preference of where the dropdown should be opened
				this.container.removeClass('select2-drop-above')
				this.dropdown.removeClass('select2-drop-above')
			},

			/**
         * Opens the dropdown
         *
         * @return {Boolean} whether or not dropdown was opened. This method will return false if, for example,
         * the dropdown is already open, or if the 'open' event listener on the element called preventDefault().
         */
			// abstract
			open: function() {
				if (!this.shouldOpen()) return false

				window.setTimeout(this.bind(this.opening), 1)

				return true
			},

			/**
         * Performs the opening of the dropdown
         */
			// abstract
			opening: function() {
				var cid = this.containerId,
					selector = this.containerSelector,
					scroll = 'scroll.' + cid,
					resize = 'resize.' + cid

				this.container.parents().each(function() {
					$(this).bind(scroll, function() {
						var s2 = $(selector)
						if (s2.length == 0) {
							$(this).unbind(scroll)
						}
						s2.select2('close')
					})
				})

				window.setTimeout(function() {
					// this is done inside a timeout because IE will sometimes fire a resize event while opening
					// the dropdown and that causes this handler to immediately close it. this way the dropdown
					// has a chance to fully open before we start listening to resize events
					$(window).bind(resize, function() {
						var s2 = $(selector)
						if (s2.length == 0) {
							$(window).unbind(resize)
						}
						s2.select2('close')
					})
				}, 10)

				this.clearDropdownAlignmentPreference()

				if (this.search.val() === ' ') {
					this.search.val('')
				}

				this.container
					.addClass('select2-dropdown-open')
					.addClass('select2-container-active')

				this.updateResults(true)

				if (this.dropdown[0] !== this.body().children().last()[0]) {
					this.dropdown.detach().appendTo(this.body())
				}

				this.dropdown.show()

				this.positionDropdown()
				this.dropdown.addClass('select2-drop-active')

				this.ensureHighlightVisible()

				this.focusSearch()
			},

			// abstract
			close: function() {
				if (!this.opened()) return

				var self = this

				this.container.parents().each(function() {
					$(this).unbind('scroll.' + self.containerId)
				})
				$(window).unbind('resize.' + this.containerId)

				this.clearDropdownAlignmentPreference()

				this.dropdown.hide()
				this.container
					.removeClass('select2-dropdown-open')
					.removeClass('select2-container-active')
				this.results.empty()
				this.clearSearch()

				this.opts.element.trigger($.Event('close'))
			},

			// abstract
			clearSearch: function() {},

			// abstract
			ensureHighlightVisible: function() {
				var results = this.results, children, index, child, hb, rb, y, more

				index = this.highlight()

				if (index < 0) return

				if (index == 0) {
					// if the first element is highlighted scroll all the way to the top,
					// that way any unselectable headers above it will also be scrolled
					// into view

					results.scrollTop(0)
					return
				}

				children = results.find('.select2-result-selectable')

				child = $(children[index])

				hb = child.offset().top + child.outerHeight(true)

				// if this is the last child lets also make sure select2-more-results is visible
				if (index === children.length - 1) {
					more = results.find('li.select2-more-results')
					if (more.length > 0) {
						hb = more.offset().top + more.outerHeight(true)
					}
				}

				rb = results.offset().top + results.outerHeight(true)
				if (hb > rb) {
					results.scrollTop(results.scrollTop() + (hb - rb))
				}
				y = child.offset().top - results.offset().top

				// make sure the top of the element is visible
				if (y < 0 && child.css('display') != 'none') {
					results.scrollTop(results.scrollTop() + y) // y is negative
				}
			},

			// abstract
			moveHighlight: function(delta) {
				var choices = this.results.find('.select2-result-selectable'),
					index = this.highlight()

				while (index > -1 && index < choices.length) {
					index += delta
					var choice = $(choices[index])
					if (
						choice.hasClass('select2-result-selectable') &&
						!choice.hasClass('select2-disabled')
					) {
						this.highlight(index)
						break
					}
				}
			},

			// abstract
			highlight: function(index) {
				var choices = this.results
					.find('.select2-result-selectable')
					.not('.select2-disabled')

				if (arguments.length === 0) {
					return indexOf(
						choices.filter('.select2-highlighted')[0],
						choices.get()
					)
				}

				if (index >= choices.length) index = choices.length - 1
				if (index < 0) index = 0

				choices.removeClass('select2-highlighted')

				$(choices[index]).addClass('select2-highlighted')
				this.ensureHighlightVisible()
			},

			// abstract
			countSelectableResults: function() {
				return this.results
					.find('.select2-result-selectable')
					.not('.select2-disabled').length
			},

			// abstract
			highlightUnderEvent: function(event) {
				var el = $(event.target).closest('.select2-result-selectable')
				if (el.length > 0 && !el.is('.select2-highlighted')) {
					var choices = this.results.find('.select2-result-selectable')
					this.highlight(choices.index(el))
				} else if (el.length == 0) {
					// if we are over an unselectable item remove al highlights
					this.results
						.find('.select2-highlighted')
						.removeClass('select2-highlighted')
				}
			},

			// abstract
			loadMoreIfNeeded: function() {
				var results = this.results,
					more = results.find('li.select2-more-results'),
					below, // pixels the element is below the scroll fold, below==0 is when the element is starting to be visible
					offset = -1, // index of first element without data
					page = this.resultsPage + 1,
					self = this,
					term = this.search.val(),
					context = this.context

				if (more.length === 0) return
				below = more.offset().top - results.offset().top - results.height()

				if (below <= 0) {
					more.addClass('select2-active')
					this.opts.query({
						term: term,
						page: page,
						context: context,
						matcher: this.opts.matcher,
						callback: this.bind(function(data) {
							// ignore a response if the select2 has been closed before it was received
							if (!self.opened()) return

							self.opts.populateResults.call(this, results, data.results, {
								term: term,
								page: page,
								context: context,
							})

							if (data.more === true) {
								more
									.detach()
									.appendTo(results)
									.text(self.opts.formatLoadMore(page + 1))
								window.setTimeout(function() {
									self.loadMoreIfNeeded()
								}, 10)
							} else {
								more.remove()
							}
							self.positionDropdown()
							self.resultsPage = page
						}),
					})
				}
			},

			/**
         * Default tokenizer function which does nothing
         */
			tokenize: function() {},

			/**
         * @param initial whether or not this is the call to this method right after the dropdown has been opened
         */
			// abstract
			updateResults: function(initial) {
				var search = this.search,
					results = this.results,
					opts = this.opts,
					data,
					self = this,
					input

				// if the search is currently hidden we do not alter the results
				if (
					initial !== true &&
					(this.showSearchInput === false || !this.opened())
				) {
					return
				}

				search.addClass('select2-active')

				function postRender() {
					results.scrollTop(0)
					search.removeClass('select2-active')
					self.positionDropdown()
				}

				function render(html) {
					results.html(self.opts.escapeMarkup(html))
					postRender()
				}

				if (opts.maximumSelectionSize >= 1) {
					data = this.data()
					if (
						$.isArray(data) &&
						data.length >= opts.maximumSelectionSize &&
						checkFormatter(opts.formatSelectionTooBig, 'formatSelectionTooBig')
					) {
						render(
							"<li class='select2-selection-limit'>" +
								opts.formatSelectionTooBig(opts.maximumSelectionSize) +
								'</li>'
						)
						return
					}
				}

				if (search.val().length < opts.minimumInputLength) {
					if (checkFormatter(opts.formatInputTooShort, 'formatInputTooShort')) {
						render(
							"<li class='select2-no-results'>" +
								opts.formatInputTooShort(
									search.val(),
									opts.minimumInputLength
								) +
								'</li>'
						)
					} else {
						render('')
					}
					return
				} else if (opts.formatSearching()) {
					render(
						"<li class='select2-searching'>" + opts.formatSearching() + '</li>'
					)
				}

				// give the tokenizer a chance to pre-process the input
				input = this.tokenize()
				if (input != undefined && input != null) {
					search.val(input)
				}

				this.resultsPage = 1
				opts.query({
					term: search.val(),
					page: this.resultsPage,
					context: null,
					matcher: opts.matcher,
					callback: this.bind(function(data) {
						var def // default choice

						// ignore a response if the select2 has been closed before it was received
						if (!this.opened()) return

						// save context, if any
						this.context = data.context === undefined ? null : data.context

						// create a default choice and prepend it to the list
						if (this.opts.createSearchChoice && search.val() !== '') {
							def = this.opts.createSearchChoice.call(
								null,
								search.val(),
								data.results
							)
							if (
								def !== undefined &&
								def !== null &&
								self.id(def) !== undefined &&
								self.id(def) !== null
							) {
								if (
									$(data.results).filter(function() {
										return equal(self.id(this), self.id(def))
									}).length === 0
								) {
									data.results.unshift(def)
								}
							}
						}

						if (
							data.results.length === 0 &&
							checkFormatter(opts.formatNoMatches, 'formatNoMatches')
						) {
							render(
								"<li class='select2-no-results'>" +
									opts.formatNoMatches(search.val()) +
									'</li>'
							)
							return
						}

						results.empty()
						self.opts.populateResults.call(this, results, data.results, {
							term: search.val(),
							page: this.resultsPage,
							context: null,
						})

						if (
							data.more === true &&
							checkFormatter(opts.formatLoadMore, 'formatLoadMore')
						) {
							results.append(
								"<li class='select2-more-results'>" +
									self.opts.escapeMarkup(
										opts.formatLoadMore(this.resultsPage)
									) +
									'</li>'
							)
							window.setTimeout(function() {
								self.loadMoreIfNeeded()
							}, 10)
						}

						this.postprocessResults(data, initial)

						postRender()
					}),
				})
			},

			// abstract
			cancel: function() {
				this.close()
			},

			// abstract
			blur: function() {
				this.close()
				this.container.removeClass('select2-container-active')
				this.dropdown.removeClass('select2-drop-active')
				// synonymous to .is(':focus'), which is available in jquery >= 1.6
				if (this.search[0] === document.activeElement) {
					this.search.blur()
				}
				this.clearSearch()
				this.selection
					.find('.select2-search-choice-focus')
					.removeClass('select2-search-choice-focus')
				this.opts.element.triggerHandler('blur')
			},

			// abstract
			focusSearch: function() {
				// need to do it here as well as in timeout so it works in IE
				this.search.show()
				this.search.focus()

				/* we do this in a timeout so that current event processing can complete before this code is executed.
             this makes sure the search field is focussed even if the current event would blur it */
				window.setTimeout(
					this.bind(function() {
						// reset the value so IE places the cursor at the end of the input box
						this.search.show()
						this.search.focus()
						this.search.val(this.search.val())
					}),
					10
				)
			},

			// abstract
			selectHighlighted: function() {
				var index = this.highlight(),
					highlighted = this.results
						.find('.select2-highlighted')
						.not('.select2-disabled'),
					data = highlighted
						.closest('.select2-result-selectable')
						.data('select2-data')
				if (data) {
					highlighted.addClass('select2-disabled')
					this.highlight(index)
					this.onSelect(data)
				}
			},

			// abstract
			getPlaceholder: function() {
				return (
					this.opts.element.attr('placeholder') ||
					this.opts.element.attr('data-placeholder') || // jquery 1.4 compat
					this.opts.element.data('placeholder') ||
					this.opts.placeholder
				)
			},

			/**
         * Get the desired width for the container element.  This is
         * derived first from option `width` passed to select2, then
         * the inline 'style' on the original element, and finally
         * falls back to the jQuery calculated element width.
         */
			// abstract
			initContainerWidth: function() {
				function resolveContainerWidth() {
					var style, attrs, matches, i, l

					if (this.opts.width === 'off') {
						return null
					} else if (this.opts.width === 'element') {
						return this.opts.element.outerWidth(false) === 0
							? 'auto'
							: this.opts.element.outerWidth(false) + 'px'
					} else if (
						this.opts.width === 'copy' ||
						this.opts.width === 'resolve'
					) {
						// check if there is inline style on the element that contains width
						style = this.opts.element.attr('style')
						if (style !== undefined) {
							attrs = style.split(';')
							for ((i = 0), (l = attrs.length); i < l; i = i + 1) {
								matches = attrs[i]
									.replace(/\s/g, '')
									.match(
										/width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/
									)
								if (matches !== null && matches.length >= 1) return matches[1]
							}
						}

						if (this.opts.width === 'resolve') {
							// next check if css('width') can resolve a width that is percent based, this is sometimes possible
							// when attached to input type=hidden or elements hidden via css
							style = this.opts.element.css('width')
							if (style.indexOf('%') > 0) return style

							// finally, fallback on the calculated width of the element
							return this.opts.element.outerWidth(false) === 0
								? 'auto'
								: this.opts.element.outerWidth(false) + 'px'
						}

						return null
					} else if ($.isFunction(this.opts.width)) {
						return this.opts.width()
					} else {
						return this.opts.width
					}
				}

				var width = resolveContainerWidth.call(this)
				if (width !== null) {
					this.container.attr('style', 'width: ' + width)
				}
			},
		})

		SingleSelect2 = clazz(AbstractSelect2, {
			// single

			createContainer: function() {
				var container = $('<div></div>', {
					class: 'select2-container',
				}).html(
					[
						"    <a href='javascript:void(0)' onclick='return false;' class='select2-choice'>",
						"   <span></span><abbr class='select2-search-choice-close' style='display:none;'></abbr>",
						'   <div><b></b></div>',
						'</a>',
						"    <div class='select2-drop select2-offscreen'>",
						"   <div class='select2-search'>",
						"       <input type='text' autocomplete='off' class='select2-input'/>",
						'   </div>',
						"   <ul class='select2-results'>",
						'   </ul>',
						'</div>',
					].join('')
				)
				return container
			},

			// single
			opening: function() {
				this.search.show()
				this.parent.opening.apply(this, arguments)
				this.dropdown.removeClass('select2-offscreen')
			},

			// single
			close: function() {
				if (!this.opened()) return
				this.parent.close.apply(this, arguments)
				this.dropdown
					.removeAttr('style')
					.addClass('select2-offscreen')
					.insertAfter(this.selection)
					.show()
			},

			// single
			focus: function() {
				this.close()
				this.selection.focus()
			},

			// single
			isFocused: function() {
				return this.selection[0] === document.activeElement
			},

			// single
			cancel: function() {
				this.parent.cancel.apply(this, arguments)
				this.selection.focus()
			},

			// single
			initContainer: function() {
				var selection,
					container = this.container,
					dropdown = this.dropdown,
					clickingInside = false

				this.selection = selection = container.find('.select2-choice')

				this.search.bind(
					'keydown',
					this.bind(function(e) {
						if (!this.enabled) return

						if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
							// prevent the page from scrolling
							killEvent(e)
							return
						}

						if (this.opened()) {
							switch (e.which) {
								case KEY.UP:
								case KEY.DOWN:
									this.moveHighlight(e.which === KEY.UP ? -1 : 1)
									killEvent(e)
									return
								case KEY.TAB:
								case KEY.ENTER:
									this.selectHighlighted()
									killEvent(e)
									return
								case KEY.ESC:
									this.cancel(e)
									killEvent(e)
									return
							}
						} else {
							if (
								e.which === KEY.TAB ||
								KEY.isControl(e) ||
								KEY.isFunctionKey(e) ||
								e.which === KEY.ESC
							) {
								return
							}

							if (this.opts.openOnEnter === false && e.which === KEY.ENTER) {
								return
							}

							this.open()

							if (e.which === KEY.ENTER) {
								// do not propagate the event otherwise we open, and propagate enter which closes
								return
							}
						}
					})
				)

				this.search.bind(
					'focus',
					this.bind(function() {
						this.selection.attr('tabIndex', '-1')
					})
				)
				this.search.bind(
					'blur',
					this.bind(function() {
						if (!this.opened())
							this.container.removeClass('select2-container-active')
						window.setTimeout(
							this.bind(function() {
								// restore original tab index
								var ti = this.opts.element.attr('tabIndex')
								if (ti) {
									this.selection.attr('tabIndex', ti)
								} else {
									this.selection.removeAttr('tabIndex')
								}
							}),
							10
						)
					})
				)

				selection.delegate(
					'abbr',
					'mousedown',
					this.bind(function(e) {
						if (!this.enabled) return
						this.clear()
						killEventImmediately(e)
						this.close()
						this.triggerChange()
						this.selection.focus()
					})
				)

				selection.bind(
					'mousedown',
					this.bind(function(e) {
						clickingInside = true

						if (this.opened()) {
							this.close()
							this.selection.focus()
						} else if (this.enabled) {
							this.open()
						}

						clickingInside = false
					})
				)

				dropdown.bind(
					'mousedown',
					this.bind(function() {
						this.search.focus()
					})
				)

				selection.bind(
					'focus',
					this.bind(function() {
						this.container.addClass('select2-container-active')
						// hide the search so the tab key does not focus on it
						this.search.attr('tabIndex', '-1')
					})
				)

				selection.bind(
					'blur',
					this.bind(function() {
						if (!this.opened()) {
							this.container.removeClass('select2-container-active')
						}
						window.setTimeout(
							this.bind(function() {
								this.search.attr('tabIndex', this.opts.element.attr('tabIndex'))
							}),
							10
						)
					})
				)

				selection.bind(
					'keydown',
					this.bind(function(e) {
						if (!this.enabled) return

						if (
							e.which == KEY.DOWN ||
							e.which == KEY.UP ||
							(e.which == KEY.ENTER && this.opts.openOnEnter)
						) {
							this.open()
							killEvent(e)
							return
						}

						if (e.which == KEY.DELETE || e.which == KEY.BACKSPACE) {
							if (this.opts.allowClear) {
								this.clear()
							}
							killEvent(e)
							return
						}
					})
				)
				selection.bind(
					'keypress',
					this.bind(function(e) {
						var key = String.fromCharCode(e.which)
						this.search.val(key)
						this.open()
					})
				)

				this.setPlaceholder()

				this.search.bind(
					'focus',
					this.bind(function() {
						this.container.addClass('select2-container-active')
					})
				)
			},

			// single
			clear: function() {
				this.opts.element.val('')
				this.selection.find('span').empty()
				this.selection.removeData('select2-data')
				this.setPlaceholder()
			},

			/**
         * Sets selection based on source element's value
         */
			// single
			initSelection: function() {
				var selected
				if (this.opts.element.val() === '' && this.opts.element.text() === '') {
					this.close()
					this.setPlaceholder()
				} else {
					var self = this
					this.opts.initSelection.call(null, this.opts.element, function(
						selected
					) {
						if (selected !== undefined && selected !== null) {
							self.updateSelection(selected)
							self.close()
							self.setPlaceholder()
						}
					})
				}
			},

			// single
			prepareOpts: function() {
				var opts = this.parent.prepareOpts.apply(this, arguments)

				if (opts.element.get(0).tagName.toLowerCase() === 'select') {
					// install the selection initializer
					opts.initSelection = function(element, callback) {
						var selected = element.find(':selected')
						// a single select box always has a value, no need to null check 'selected'
						if ($.isFunction(callback))
							callback({
								id: selected.attr('value'),
								text: selected.text(),
								element: selected,
							})
					}
				}

				return opts
			},

			// single
			setPlaceholder: function() {
				var placeholder = this.getPlaceholder()

				if (this.opts.element.val() === '' && placeholder !== undefined) {
					// check for a first blank option if attached to a select
					if (this.select && this.select.find('option:first').text() !== '')
						return

					this.selection.find('span').html(this.opts.escapeMarkup(placeholder))

					this.selection.addClass('select2-default')

					this.selection.find('abbr').hide()
				}
			},

			// single
			postprocessResults: function(data, initial) {
				var selected = 0, self = this, showSearchInput = true

				// find the selected element in the result list

				this.results.find('.select2-result-selectable').each2(function(i, elm) {
					if (
						equal(self.id(elm.data('select2-data')), self.opts.element.val())
					) {
						selected = i
						return false
					}
				})

				// and highlight it

				this.highlight(selected)

				// hide the search box if this is the first we got the results and there are a few of them

				if (initial === true) {
					showSearchInput = this.showSearchInput =
						countResults(data.results) >= this.opts.minimumResultsForSearch
					this.dropdown.find('.select2-search')[
						showSearchInput ? 'removeClass' : 'addClass'
					]('select2-search-hidden')

					//add "select2-with-searchbox" to the container if search box is shown
					$(this.dropdown, this.container)[
						showSearchInput ? 'addClass' : 'removeClass'
					]('select2-with-searchbox')
				}
			},

			// single
			onSelect: function(data) {
				var old = this.opts.element.val()

				this.opts.element.val(this.id(data))
				this.updateSelection(data)
				this.close()
				this.selection.focus()

				if (!equal(old, this.id(data))) {
					this.triggerChange()
				}
			},

			// single
			updateSelection: function(data) {
				var container = this.selection.find('span'), formatted

				this.selection.data('select2-data', data)

				container.empty()
				formatted = this.opts.formatSelection(data, container)
				if (formatted !== undefined) {
					container.append(this.opts.escapeMarkup(formatted))
				}

				this.selection.removeClass('select2-default')

				if (this.opts.allowClear && this.getPlaceholder() !== undefined) {
					this.selection.find('abbr').show()
				}
			},

			// single
			val: function() {
				var val, data = null, self = this

				if (arguments.length === 0) {
					return this.opts.element.val()
				}

				val = arguments[0]

				if (this.select) {
					this.select.val(val).find(':selected').each2(function(i, elm) {
						data = { id: elm.attr('value'), text: elm.text() }
						return false
					})
					this.updateSelection(data)
					this.setPlaceholder()
				} else {
					if (this.opts.initSelection === undefined) {
						throw new Error(
							'cannot call val() if initSelection() is not defined'
						)
					}
					// val is an id. !val is true for [undefined,null,'']
					if (!val) {
						this.clear()
						return
					}
					this.opts.element.val(val)
					this.opts.initSelection(this.opts.element, function(data) {
						self.opts.element.val(!data ? '' : self.id(data))
						self.updateSelection(data)
						self.setPlaceholder()
					})
				}
			},

			// single
			clearSearch: function() {
				this.search.val('')
			},

			// single
			data: function(value) {
				var data

				if (arguments.length === 0) {
					data = this.selection.data('select2-data')
					if (data == undefined) data = null
					return data
				} else {
					if (!value || value === '') {
						this.clear()
					} else {
						this.opts.element.val(!value ? '' : this.id(value))
						this.updateSelection(value)
					}
				}
			},
		})

		MultiSelect2 = clazz(AbstractSelect2, {
			// multi
			createContainer: function() {
				var container = $('<div></div>', {
					class: 'select2-container select2-container-multi',
				}).html(
					[
						"    <ul class='select2-choices'>",
						//"<li class='select2-search-choice'><span>California</span><a href="javascript:void(0)" class="select2-search-choice-close"></a></li>" ,
						"  <li class='select2-search-field'>",
						"    <input type='text' autocomplete='off' class='select2-input'>",
						'  </li>',
						'</ul>',
						"<div class='select2-drop select2-drop-multi' style='display:none;'>",
						"   <ul class='select2-results'>",
						'   </ul>',
						'</div>',
					].join('')
				)
				return container
			},

			// multi
			prepareOpts: function() {
				var opts = this.parent.prepareOpts.apply(this, arguments)

				// TODO validate placeholder is a string if specified

				if (opts.element.get(0).tagName.toLowerCase() === 'select') {
					// install sthe selection initializer
					opts.initSelection = function(element, callback) {
						var data = []
						element.find(':selected').each2(function(i, elm) {
							data.push({
								id: elm.attr('value'),
								text: elm.text(),
								element: elm,
							})
						})

						if ($.isFunction(callback)) callback(data)
					}
				}

				return opts
			},

			// multi
			initContainer: function() {
				var selector = '.select2-choices', selection

				this.searchContainer = this.container.find('.select2-search-field')
				this.selection = selection = this.container.find(selector)

				this.search.bind(
					'keydown',
					this.bind(function(e) {
						if (!this.enabled) return

						if (e.which === KEY.BACKSPACE && this.search.val() === '') {
							this.close()

							var choices,
								selected = selection.find('.select2-search-choice-focus')
							if (selected.length > 0) {
								this.unselect(selected.first())
								this.search.width(10)
								killEvent(e)
								return
							}

							choices = selection.find(
								'.select2-search-choice:not(.select2-locked)'
							)
							if (choices.length > 0) {
								choices.last().addClass('select2-search-choice-focus')
							}
						} else {
							selection
								.find('.select2-search-choice-focus')
								.removeClass('select2-search-choice-focus')
						}

						if (this.opened()) {
							switch (e.which) {
								case KEY.UP:
								case KEY.DOWN:
									this.moveHighlight(e.which === KEY.UP ? -1 : 1)
									killEvent(e)
									return
								case KEY.ENTER:
								case KEY.TAB:
									this.selectHighlighted()
									killEvent(e)
									return
								case KEY.ESC:
									this.cancel(e)
									killEvent(e)
									return
							}
						}

						if (
							e.which === KEY.TAB ||
							KEY.isControl(e) ||
							KEY.isFunctionKey(e) ||
							e.which === KEY.BACKSPACE ||
							e.which === KEY.ESC
						) {
							return
						}

						if (this.opts.openOnEnter === false && e.which === KEY.ENTER) {
							return
						}

						this.open()

						if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
							// prevent the page from scrolling
							killEvent(e)
						}
					})
				)

				this.search.bind('keyup', this.bind(this.resizeSearch))

				this.search.bind(
					'blur',
					this.bind(function(e) {
						this.container.removeClass('select2-container-active')
						this.search.removeClass('select2-focused')
						this.clearSearch()
						e.stopImmediatePropagation()
					})
				)

				this.container.delegate(
					selector,
					'mousedown',
					this.bind(function(e) {
						if (!this.enabled) return
						if ($(e.target).closest('.select2-search-choice').length > 0) {
							// clicked inside a select2 search choice, do not open
							return
						}
						this.clearPlaceholder()
						this.open()
						this.focusSearch()
						e.preventDefault()
					})
				)

				this.container.delegate(
					selector,
					'focus',
					this.bind(function() {
						if (!this.enabled) return
						this.container.addClass('select2-container-active')
						this.dropdown.addClass('select2-drop-active')
						this.clearPlaceholder()
					})
				)

				// set the placeholder if necessary
				this.clearSearch()
			},

			// multi
			enable: function() {
				if (this.enabled) return

				this.parent.enable.apply(this, arguments)

				this.search.removeAttr('disabled')
			},

			// multi
			disable: function() {
				if (!this.enabled) return

				this.parent.disable.apply(this, arguments)

				this.search.attr('disabled', true)
			},

			// multi
			initSelection: function() {
				var data
				if (this.opts.element.val() === '' && this.opts.element.text() === '') {
					this.updateSelection([])
					this.close()
					// set the placeholder if necessary
					this.clearSearch()
				}
				if (this.select || this.opts.element.val() !== '') {
					var self = this
					this.opts.initSelection.call(null, this.opts.element, function(data) {
						if (data !== undefined && data !== null) {
							self.updateSelection(data)
							self.close()
							// set the placeholder if necessary
							self.clearSearch()
						}
					})
				}
			},

			// multi
			clearSearch: function() {
				var placeholder = this.getPlaceholder()

				if (
					placeholder !== undefined &&
					this.getVal().length === 0 &&
					this.search.hasClass('select2-focused') === false
				) {
					this.search.val(placeholder).addClass('select2-default')
					// stretch the search box to full width of the container so as much of the placeholder is visible as possible
					this.resizeSearch()
				} else {
					// we set this to " " instead of "" and later clear it on focus() because there is a firefox bug
					// that does not properly render the caret when the field starts out blank
					this.search.val(' ').width(10)
				}
			},

			// multi
			clearPlaceholder: function() {
				if (this.search.hasClass('select2-default')) {
					this.search.val('').removeClass('select2-default')
				} else {
					// work around for the space character we set to avoid firefox caret bug
					if (this.search.val() === ' ') this.search.val('')
				}
			},

			// multi
			opening: function() {
				this.parent.opening.apply(this, arguments)

				this.clearPlaceholder()
				this.resizeSearch()
				this.focusSearch()
			},

			// multi
			close: function() {
				if (!this.opened()) return
				this.parent.close.apply(this, arguments)
			},

			// multi
			focus: function() {
				this.close()
				this.search.focus()
			},

			// multi
			isFocused: function() {
				return this.search.hasClass('select2-focused')
			},

			// multi
			updateSelection: function(data) {
				var ids = [], filtered = [], self = this

				// filter out duplicates
				$(data).each(function() {
					if (indexOf(self.id(this), ids) < 0) {
						ids.push(self.id(this))
						filtered.push(this)
					}
				})
				data = filtered

				this.selection.find('.select2-search-choice').remove()
				$(data).each(function() {
					self.addSelectedChoice(this)
				})
				self.postprocessResults()
			},

			tokenize: function() {
				var input = this.search.val()
				input = this.opts.tokenizer(
					input,
					this.data(),
					this.bind(this.onSelect),
					this.opts
				)
				if (input != null && input != undefined) {
					this.search.val(input)
					if (input.length > 0) {
						this.open()
					}
				}
			},

			// multi
			onSelect: function(data) {
				this.addSelectedChoice(data)
				if (this.select || !this.opts.closeOnSelect) this.postprocessResults()

				if (this.opts.closeOnSelect) {
					this.close()
					this.search.width(10)
				} else {
					if (this.countSelectableResults() > 0) {
						this.search.width(10)
						this.resizeSearch()
						this.positionDropdown()
					} else {
						// if nothing left to select close
						this.close()
					}
				}

				// since its not possible to select an element that has already been
				// added we do not need to check if this is a new element before firing change
				this.triggerChange({ added: data })

				this.focusSearch()
			},

			// multi
			cancel: function() {
				this.close()
				this.focusSearch()
			},

			addSelectedChoice: function(data) {
				var enableChoice = !data.locked,
					enabledItem = $(
						"<li class='select2-search-choice'>" +
							'    <div></div>' +
							"    <a href='#' onclick='return false;' class='select2-search-choice-close' tabindex='-1'></a>" +
							'</li>'
					),
					disabledItem = $(
						"<li class='select2-search-choice select2-locked'>" +
							'<div></div>' +
							'</li>'
					)
				var choice = enableChoice ? enabledItem : disabledItem,
					id = this.id(data),
					val = this.getVal(),
					formatted

				formatted = this.opts.formatSelection(data, choice.find('div'))
				if (formatted != undefined) {
					choice
						.find('div')
						.replaceWith('<div>' + this.opts.escapeMarkup(formatted) + '</div>')
				}

				if (enableChoice) {
					choice
						.find('.select2-search-choice-close')
						.bind('mousedown', killEvent)
						.bind(
							'click dblclick',
							this.bind(function(e) {
								if (!this.enabled) return

								$(e.target)
									.closest('.select2-search-choice')
									.fadeOut(
										'fast',
										this.bind(function() {
											this.unselect($(e.target))
											this.selection
												.find('.select2-search-choice-focus')
												.removeClass('select2-search-choice-focus')
											this.close()
											this.focusSearch()
										})
									)
									.dequeue()
								killEvent(e)
							})
						)
						.bind(
							'focus',
							this.bind(function() {
								if (!this.enabled) return
								this.container.addClass('select2-container-active')
								this.dropdown.addClass('select2-drop-active')
							})
						)
				}

				choice.data('select2-data', data)
				choice.insertBefore(this.searchContainer)

				val.push(id)
				this.setVal(val)
			},

			// multi
			unselect: function(selected) {
				var val = this.getVal(), data, index

				selected = selected.closest('.select2-search-choice')

				if (selected.length === 0) {
					throw 'Invalid argument: ' +
						selected +
						'. Must be .select2-search-choice'
				}

				data = selected.data('select2-data')

				index = indexOf(this.id(data), val)

				if (index >= 0) {
					val.splice(index, 1)
					this.setVal(val)
					if (this.select) this.postprocessResults()
				}
				selected.remove()
				this.triggerChange({ removed: data })
			},

			// multi
			postprocessResults: function() {
				var val = this.getVal(),
					choices = this.results.find('.select2-result-selectable'),
					compound = this.results.find('.select2-result-with-children'),
					self = this

				choices.each2(function(i, choice) {
					var id = self.id(choice.data('select2-data'))
					if (indexOf(id, val) >= 0) {
						choice
							.addClass('select2-disabled')
							.removeClass('select2-result-selectable')
					} else {
						choice
							.removeClass('select2-disabled')
							.addClass('select2-result-selectable')
					}
				})

				compound.each2(function(i, e) {
					if (
						!e.is('.select2-result-selectable') &&
						e.find('.select2-result-selectable').length == 0
					) {
						// FIX FOR HIRECHAL DATA
						e.addClass('select2-disabled')
					} else {
						e.removeClass('select2-disabled')
					}
				})

				if (this.highlight() == -1) {
					choices.each2(function(i, choice) {
						if (
							!choice.hasClass('select2-disabled') &&
							choice.hasClass('select2-result-selectable')
						) {
							self.highlight(0)
							return false
						}
					})
				}
			},

			// multi
			resizeSearch: function() {
				var minimumWidth,
					left,
					maxWidth,
					containerLeft,
					searchWidth,
					sideBorderPadding = getSideBorderPadding(this.search)

				minimumWidth = measureTextWidth(this.search) + 10

				left = this.search.offset().left

				maxWidth = this.selection.width()
				containerLeft = this.selection.offset().left

				searchWidth = maxWidth - (left - containerLeft) - sideBorderPadding
				if (searchWidth < minimumWidth) {
					searchWidth = maxWidth - sideBorderPadding
				}

				if (searchWidth < 40) {
					searchWidth = maxWidth - sideBorderPadding
				}
				this.search.width(searchWidth)
			},

			// multi
			getVal: function() {
				var val
				if (this.select) {
					val = this.select.val()
					return val === null ? [] : val
				} else {
					val = this.opts.element.val()
					return splitVal(val, this.opts.separator)
				}
			},

			// multi
			setVal: function(val) {
				var unique
				if (this.select) {
					this.select.val(val)
				} else {
					unique = []
					// filter out duplicates
					$(val).each(function() {
						if (indexOf(this, unique) < 0) unique.push(this)
					})
					this.opts.element.val(
						unique.length === 0 ? '' : unique.join(this.opts.separator)
					)
				}
			},

			// multi
			val: function() {
				var val, data = [], self = this

				if (arguments.length === 0) {
					return this.getVal()
				}

				val = arguments[0]

				if (!val) {
					this.opts.element.val('')
					this.updateSelection([])
					this.clearSearch()
					return
				}

				// val is a list of ids
				this.setVal(val)

				if (this.select) {
					this.select.find(':selected').each(function() {
						data.push({ id: $(this).attr('value'), text: $(this).text() })
					})
					this.updateSelection(data)
				} else {
					if (this.opts.initSelection === undefined) {
						throw new Error(
							'val() cannot be called if initSelection() is not defined'
						)
					}

					this.opts.initSelection(this.opts.element, function(data) {
						var ids = $(data).map(self.id)
						self.setVal(ids)
						self.updateSelection(data)
						self.clearSearch()
					})
				}
				this.clearSearch()
			},

			// multi
			onSortStart: function() {
				if (this.select) {
					throw new Error(
						"Sorting of elements is not supported when attached to <select>. Attach to <input type='hidden'/> instead."
					)
				}

				// collapse search field into 0 width so its container can be collapsed as well
				this.search.width(0)
				// hide the container
				this.searchContainer.hide()
			},

			// multi
			onSortEnd: function() {
				var val = [], self = this

				// show search and move it to the end of the list
				this.searchContainer.show()
				// make sure the search container is the last item in the list
				this.searchContainer.appendTo(this.searchContainer.parent())
				// since we collapsed the width in dragStarted, we resize it here
				this.resizeSearch()

				// update selection

				this.selection.find('.select2-search-choice').each(function() {
					val.push(self.opts.id($(this).data('select2-data')))
				})
				this.setVal(val)
				this.triggerChange()
			},

			// multi
			data: function(values) {
				var self = this, ids
				if (arguments.length === 0) {
					return this.selection
						.find('.select2-search-choice')
						.map(function() {
							return $(this).data('select2-data')
						})
						.get()
				} else {
					if (!values) {
						values = []
					}
					ids = $.map(values, function(e) {
						return self.opts.id(e)
					})
					this.setVal(ids)
					this.updateSelection(values)
					this.clearSearch()
				}
			},
		})

		$.fn.select2 = function() {
			var args = Array.prototype.slice.call(arguments, 0),
				opts,
				select2,
				value,
				multiple,
				allowedMethods = [
					'val',
					'destroy',
					'opened',
					'open',
					'close',
					'focus',
					'isFocused',
					'container',
					'onSortStart',
					'onSortEnd',
					'enable',
					'disable',
					'positionDropdown',
					'data',
				]

			this.each(function() {
				if (args.length === 0 || typeof args[0] === 'object') {
					opts = args.length === 0 ? {} : $.extend({}, args[0])
					opts.element = $(this)

					if (opts.element.get(0).tagName.toLowerCase() === 'select') {
						multiple = opts.element.attr('multiple')
					} else {
						multiple = opts.multiple || false
						if ('tags' in opts) {
							opts.multiple = multiple = true
						}
					}

					select2 = multiple ? new MultiSelect2() : new SingleSelect2()
					select2.init(opts)
				} else if (typeof args[0] === 'string') {
					if (indexOf(args[0], allowedMethods) < 0) {
						throw 'Unknown method: ' + args[0]
					}

					value = undefined
					select2 = $(this).data('select2')
					if (select2 === undefined) return
					if (args[0] === 'container') {
						value = select2.container
					} else {
						value = select2[args[0]].apply(select2, args.slice(1))
					}
					if (value !== undefined) {
						return false
					}
				} else {
					throw 'Invalid arguments to select2 plugin: ' + args
				}
			})
			return value === undefined ? this : value
		}

		// plugin defaults, accessible to users
		$.fn.select2.defaults = {
			width: 'copy',
			closeOnSelect: true,
			openOnEnter: true,
			containerCss: {},
			dropdownCss: {},
			containerCssClass: '',
			dropdownCssClass: '',
			formatResult: function(result, container, query) {
				var markup = []
				markMatch(result.text, query.term, markup)
				return markup.join('')
			},
			formatSelection: function(data, container) {
				return data ? data.text : undefined
			},
			formatResultCssClass: function(data) {
				return undefined
			},
			formatNoMatches: function() {
				return 'No matches found'
			},
			formatInputTooShort: function(input, min) {
				var n = min - input.length
				return 'Please enter ' + n + ' more character' + (n == 1 ? '' : 's')
			},
			formatSelectionTooBig: function(limit) {
				return (
					'You can only select ' + limit + ' item' + (limit == 1 ? '' : 's')
				)
			},
			formatLoadMore: function(pageNumber) {
				return 'Loading more results...'
			},
			formatSearching: function() {
				return 'Searching...'
			},
			minimumResultsForSearch: 0,
			minimumInputLength: 0,
			maximumSelectionSize: 0,
			id: function(e) {
				return e.id
			},
			matcher: function(term, text) {
				return text.toUpperCase().indexOf(term.toUpperCase()) >= 0
			},
			separator: ',',
			tokenSeparators: [],
			tokenizer: defaultTokenizer,
			escapeMarkup: function(markup) {
				if (markup && typeof markup === 'string') {
					return markup.replace(/&/g, '&amp;')
				}
				return markup
			},
			blurOnChange: false,
		}

		// exports
		window.Select2 = {
			query: {
				ajax: ajax,
				local: local,
				tags: tags,
			},
			util: {
				debounce: debounce,
				markMatch: markMatch,
			},
			class: {
				abstract: AbstractSelect2,
				single: SingleSelect2,
				multi: MultiSelect2,
			},
		}
	})(jQuery)
	return $
})

define('$plugin!details', ['$'], function($) {
	var jQuery = $
	/*! http://mths.be/details v0.1.0 by @mathias | includes http://mths.be/noselect v1.0.3 */
	;(function(document, $) {
		var proto = $.fn,
			details,
			// :'(
			isOpera =
				Object.prototype.toString.call(window.opera) == '[object Opera]',
			// Feature test for native `<details>` support
			isDetailsSupported = (function(doc) {
				var el = doc.createElement('details'), fake, root, diff
				if (!('open' in el)) {
					return false
				}
				root =
					doc.body ||
					(function() {
						var de = doc.documentElement
						fake = true
						return de.insertBefore(
							doc.createElement('body'),
							de.firstElementChild || de.firstChild
						)
					})()
				el.innerHTML = '<summary>a</summary>b'
				el.style.display = 'block'
				root.appendChild(el)
				diff = el.offsetHeight
				el.open = true
				diff = diff != el.offsetHeight
				root.removeChild(el)
				if (fake) {
					root.parentNode.removeChild(root)
				}
				return diff
			})(document),
			toggleOpen = function(
				$details,
				$detailsSummary,
				$detailsNotSummary,
				toggle
			) {
				var isOpen = $details.prop('open'),
					close = (isOpen && toggle) || (!isOpen && !toggle)
				if (close) {
					$details
						.removeClass('open')
						.prop('open', false)
						.triggerHandler('close.details')
					$detailsSummary.attr('aria-expanded', false)
					$detailsNotSummary.hide()
				} else {
					$details
						.addClass('open')
						.prop('open', true)
						.triggerHandler('open.details')
					$detailsSummary.attr('aria-expanded', true)
					$detailsNotSummary.show()
				}
			}

		/* http://mths.be/noselect v1.0.3 */
		proto.noSelect = function() {
			// Since the string 'none' is used three times, storing it in a variable gives better results after minification
			var none = 'none'

			// onselectstart and ondragstart for WebKit & IE
			// onmousedown for WebKit & Opera
			return this.bind('selectstart dragstart mousedown', function() {
				return false
			}).css({
				MozUserSelect: none,
				msUserSelect: none,
				webkitUserSelect: none,
				userSelect: none,
			})
		}

		// Execute the fallback only if there’s no native `details` support
		if (isDetailsSupported) {
			details = proto.details = function() {
				return this.each(function() {
					var $details = $(this), $summary = $('summary', $details).first()
					$summary
						.attr({
							role: 'button',
							'aria-expanded': $details.prop('open'),
						})
						.on('click', function() {
							// the value of the `open` property is the old value
							var close = $details.prop('open')
							$summary.attr('aria-expanded', !close)
							$details.triggerHandler((close ? 'close' : 'open') + '.details')
						})
				})
			}

			details.support = isDetailsSupported
		} else {
			details = proto.details = function() {
				// Loop through all `details` elements
				return this.each(function() {
					// Store a reference to the current `details` element in a variable
					var $details = $(this),
						// Store a reference to the `summary` element of the current `details` element (if any) in a variable
						$detailsSummary = $('summary', $details).first(),
						// Do the same for the info within the `details` element
						$detailsNotSummary = $details.children(':not(summary)'),
						// This will be used later to look for direct child text nodes
						$detailsNotSummaryContents = $details.contents(':not(summary)')

					// If there is no `summary` in the current `details` element…
					if (!$detailsSummary.length) {
						// …create one with default text
						$detailsSummary = $('<summary>').text('Details').prependTo($details)
					}

					// Look for direct child text nodes
					if ($detailsNotSummary.length != $detailsNotSummaryContents.length) {
						// Wrap child text nodes in a `span` element
						$detailsNotSummaryContents
							.filter(function() {
								// Only keep the node in the collection if it’s a text node containing more than only whitespace
								// http://www.whatwg.org/specs/web-apps/current-work/multipage/common-microsyntaxes.html#space-character
								return this.nodeType == 3 && /[^ \t\n\f\r]/.test(this.data)
							})
							.wrap('<span>')
						// There are now no direct child text nodes anymore — they’re wrapped in `span` elements
						$detailsNotSummary = $details.children(':not(summary)')
					}

					// Hide content unless there’s an `open` attribute
					$details.prop('open', typeof $details.attr('open') == 'string')
					toggleOpen($details, $detailsSummary, $detailsNotSummary)

					// Add `role=button` and set the `tabindex` of the `summary` element to `0` to make it keyboard accessible
					$detailsSummary
						.attr('role', 'button')
						.noSelect()
						.prop('tabIndex', 0)
						.on('click', function() {
							// Focus on the `summary` element
							$detailsSummary.focus()
							// Toggle the `open` and `aria-expanded` attributes and the `open` property of the `details` element and display the additional info
							toggleOpen($details, $detailsSummary, $detailsNotSummary, true)
						})
						.keyup(function(event) {
							if (32 == event.keyCode || (13 == event.keyCode && !isOpera)) {
								// Space or Enter is pressed — trigger the `click` event on the `summary` element
								// Opera already seems to trigger the `click` event when Enter is pressed
								event.preventDefault()
								$detailsSummary.click()
							}
						})
				})
			}

			details.support = isDetailsSupported
		}
	})(document, jQuery)
	return $
})

define('admin/modules/WidgetEvents', [], function() {
	var NS = 'admin/modules/widget-events/'

	return {
		RENDER: NS + 'render',
	}
})

define(
	'admin/modules/WindowPopup',
	['require', 'exports', 'module', 'rosy/base/DOMClass', '$'],
	function(require, exports, module) {
		var DOMClass = require('rosy/base/DOMClass'),
			$ = require('$'),
			guid = 0,
			WindowPopup = DOMClass.extend({
				init: function(dom) {},

				request: function(url, options, cb) {
					var name = 'windowpopupguid' + ++guid, newWin

					window[name] = function(data) {
						cb(data)
						newWin.close()
						window[name] = null
						delete window[name]
					}

					newWin = window.open(url, name, options)
				},

				respond: function(data) {
					var name = window.name

					if (
						window.opener &&
						window.opener[name] &&
						typeof window.opener[name] === 'function'
					) {
						window.opener[name](data)
					}
				},
			})

		return new WindowPopup()
	}
)

define(
	'admin/modules/AssetSelect',
	[
		'rosy/base/DOMClass',
		'$',
		'$plugin!select2',
		'./WidgetEvents',
		'./WindowPopup',
	],
	function(DOMClass, $, jQuerySelect2, WidgetEvents, WindowPopup) {
		return DOMClass.extend({
			dom: null,
			preview: null,
			input: null,

			count: 0,

			popup: null,

			init: function(dom) {
				this.dom = dom
				this.input = dom.find('input')
				this.preview = dom.find('.widget-asset-preview')

				this.cropsList = dom.find('.crops-list')
				this.baseLink = this.cropsList.data('base-link')

				this._autoTag()
				this._initSelect2()
				this._linkifyCrops()
			},

			_initSelect2: function() {
				this.input.select2({
					placeholder: 'Choose an asset',
					allowClear: true,
					initSelection: this.initSelection,
					formatSelection: this.formatSelection,
					formatResult: this.formatResult,
					ajax: {
						url: this.dom.data('api'),
						quietMillis: 500,
						dataType: 'json',
						data: this._ajaxData,
						results: this._ajaxResults,
					},
				})

				this.input.on('change', this.onChange)

				this._tag()

				this.dom.on('click', '.button, .crop-link', this._openPopup)
			},

			_openPopup: function(e) {
				var dom = $(e.currentTarget),
					url = dom.attr('href'),
					options =
						'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800'

				WindowPopup.request(url, options, this._gotDataFromPopup)

				return false
			},

			_gotDataFromPopup: function(data) {
				this.input.select2('data', data)
			},

			_linkifyCrops: function(dom) {
				var guidLink =
					this.baseLink + this.cropsList.parent().find('[type=hidden]').val()

				this.cropsList.find('li').each(function(i, el) {
					el = $(el)

					var editLink = guidLink + '/' + el.data('crop-link') + '?popup=1'

					el.find('a').attr('href', editLink)
				})
			},

			_autoTag: function() {
				var tags = []
				$('[data-auto-tag]').each(function(i, dom) {
					var data_auto_tag = $(dom).data('auto-tag')
					if (data_auto_tag) {
						var allTags = data_auto_tag.toLowerCase().split(',')
						while (allTags.length) {
							var tag = allTags.shift()
							var splitTag = tag.split(' ')
							tags.push(tag)

							// if splitTag length > 3, push individual values
							if (tag.match(/[a-z0-9]/i) && splitTag.length > 3) {
								while (splitTag.length) {
									var newTag = splitTag.shift()
									if (tags.indexOf(newTag) === -1) {
										tags.push(newTag)
									}
								}
							}
						}
						tags = tags.concat(allTags)
					}
				})
				$('#auto_tags').val(tags.join(','))
				this._auto_tags = tags
			},

			_tag: function() {
				if (!this.dom.find('a.button').length) {
					return
				}

				var dom = this.dom.find('a.button'),
					params = this._unparam(dom[0].search),
					tags = ($(this.dom).data('tags') || '').toLowerCase().split(',')

				tags = tags.concat(this._auto_tags)
				params.tags = encodeURIComponent(tags.join(','))
				dom[0].search = this._param(params)
			},

			_param: function(obj) {
				var op = [], i
				for (i in obj) {
					op.push(i + '=' + obj[i])
				}
				return '?' + op.join('&')
			},

			_unparam: function(path) {
				var ret = {},
					seg = path.replace(/^\?/, '').split('&'),
					len = seg.length,
					i = 0,
					s
				for (i; i < len; i++) {
					if (!seg[i]) {
						continue
					}
					s = seg[i].split('=')
					ret[s[0]] = s[1]
				}
				return ret
			},

			_ajaxData: function(term, page, context) {
				return {
					page: page,
					tag: term,
				}
			},

			_ajaxResults: function(data, page, context) {
				// sanitize data
				$.each(data.results, function(i, result) {
					result.text = result.user_filename
				})

				return {
					results: data.results,
					more: !!data.next,
				}
			},

			onChange: function() {
				this._linkifyCrops()

				if (!this.input.val()) {
					this.preview.css('background-image', 'none')
				}
			},

			initSelection: function(element, callback) {
				callback({
					id: element.val(),
					text: this.dom.data('title'),
				})
			},

			formatSelection: function(object, container) {
				if (object.thumbnail) {
					this.preview.css('background-image', 'url(' + object.thumbnail + ')')
				}
				if (object.url) {
					this.input.attr('data-src', object.url)
				}
				return object.text
			},

			formatResult: function(object, container, query) {
				var thumb = $('<div>').addClass('select2-result-image-thumbnail')
				if (object.thumbnail) {
					thumb.css('background-image', 'url(' + object.thumbnail + ')')
				}
				container.addClass('select2-result-image')
				container.append(object.text)
				container.append(thumb)
			},
		})
	}
)

define(
	'admin/modules/ApiSelect',
	['rosy/base/DOMClass', '$', '$plugin!select2', './WindowPopup'],
	function(DOMClass, $, jQuerySelect2, WindowPopup) {
		return DOMClass.extend({
			dom: null,
			input: null,
			label: null,
			name: null,
			toggle: null,
			isMultiple: false,

			select2: null,

			names: [],

			param: null,
			params: [],

			values: [],

			init: function(dom) {
				this.dom = dom
				this.dom.on('click', '[data-param]', this.clickParam)
				this.input = dom.find('input')
				this.label = $('label[for="' + this.input.attr('id') + '"]')
				this.name = this.input.attr('name')

				if (this.dom.data('add')) {
					this._initAdd()
				}

				// initialize $.select2
				if (this.input.length) {
					this.isMultiple = this.input.is('[data-multiple]')
					if (this.isMultiple) {
						this.input = this.input.eq(0)
						this.input.on('change.select2', this.updateHiddenValues)
					}

					this._initSelect2()
				}
			},

			/**********************
				Add One
			**********************/

			_initAdd: function() {
				var url = this.dom.data('add'),
					add = $('<a>')
						.attr('href', url)
						.addClass('button add-button')
						.text('+')

				this.dom.prepend(add)
				this.dom.addClass('has-add-button')

				add.on('click', this._openPopup)
			},

			_openPopup: function(e) {
				var dom = $(e.currentTarget),
					url = dom.attr('href'),
					options =
						'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800'

				WindowPopup.request(url, options, this._gotDataFromPopup)

				return false
			},

			_gotDataFromPopup: function(data) {
				if (this.isMultiple) {
					var currData = this.input.select2('data')
					currData.push(data)
					this.input
						.after(
							$('<input />', {
								value: data.id,
								name: this.name,
								type: 'hidden',
							})
						)
						.select2('data', currData)
				} else {
					this.input.select2('data', data)
				}
			},

			/**********************
				Select 2
			**********************/

			_initSelect2: function() {
				var placeholder = this.label.text() || 'one'
				placeholder = placeholder.replace(/[^a-z0-9]/i, '').toLowerCase()

				var opts = {
					placeholder: 'Select ' + placeholder,
					//minimumInputLength : 2,
					allowClear: true,
					initSelection: this.initSelection,
					formatResult: this.formatResult,
					minimumResultsForSearch: 5,
					ajax: {
						url: this.dom.data('api'),
						quietMillis: 400,
						dataType: 'json',
						data: this._ajaxData,
						results: this._ajaxResults,
					},
				}

				if (this.isMultiple) {
					opts.tags = this.initSelection

					// clone this.input to preserve its value before manipulation
					if (this.input.val()) {
						this.input.after(this.input.clone())
					}

					// suffix this.input name so its comma-delimitted tags won't be submitted
					this.input.attr('name', this.input.attr('name') + '_')
				}
				this.input.select2(opts)
				this.select2 = this.input.data().select2
			},

			formatResult: function(object, container, query) {
				return object.text
			},

			initSelection: function(element, callback) {
				var data

				if (this.isMultiple) {
					data = []

					// add sibling hidden values as initial value
					this.dom.find('input[name=' + this.name + ']').each(function() {
						data.push({
							id: $(this).val(),
							text: $(this).data('title'),
						})
					})
				} else {
					data = {
						id: element.val(),
						text: this.dom.data('title'),
					}
				}

				callback(data)
			},

			updateHiddenValues: function(e) {
				if (e.added) {
					this.input.after(
						$('<input />', {
							name: this.name,
							value: e.added.id,
							type: 'hidden',
						})
					)
				} else if (e.removed) {
					this.input.siblings('[value=' + e.removed.id + ']').remove()
				}
			},

			/**********************
				Fetching Data
			**********************/

			_ajaxData: function(term, page, context) {
				var output = {
					page: page,
				}

				if (this.param) {
					output[this.param] = term
				}

				return output
			},

			_ajaxResults: function(data, page, context) {
				var param, field

				this.names = []
				this.params = []
				for (param in data.params) {
					this.param = this.param || param
					this.params.push({
						id: param,
						name: data.params[param].label,
					})
				}

				for (field in data.fields) {
					this.names.push(field)
				}

				// this._initParams();
				// this._toggleSearch();

				// sanitize data
				$.each(
					data.results,
					this.proxy(function(index, result) {
						var text = [], i

						for (i = 0; i < this.names.length; i++) {
							text.push(result[this.names[i]])
						}

						result.text = text.join(' - ')
					})
				)
				return {
					results: data.results,
					more: !!data.next,
				}
			},

			/**********************
				Params
			**********************/

			// TODO: evaluate need (ux) for sort functionality

			_initParams: function() {
				// dont init search option twice
				// dont init if there are no options
				if (this.toggle || this.params.length < 2) {
					return
				}
				var param, i, dom

				this.toggle = $('<div>').addClass('toggle')
				this.dom.append(this.toggle)

				for (i = 0; i < this.params.length; i++) {
					param = this.params[i]
					dom = $('<div>').attr('data-param', param.id).text(param.name)
					dom.addClass('toggle-button')
					if (i === 0) {
						dom.addClass('first')
					}
					if (i === this.params.length - 1) {
						dom.addClass('last')
					}
					this.toggle.append(dom)
					this.useParam(param.id)
				}
			},

			useParam: function(param) {
				this.dom.find('[data-param]').removeClass('active')
				this.dom.find('[data-param="' + param + '"]').addClass('active')
				this.param = param
			},

			clickParam: function(e) {
				this.useParam($(e.currentTarget).data('param'))
			},

			_toggleSearch: function() {
				if (!this.param) {
					this.select2.search.parent().css('display', 'none')
				} else {
					this.select2.search.parent().css('display', '')
				}
			},
		})
	}
)

// define(

// 	[
// 		'rosy/base/DOMClass',
// 		'$',
// 		'wysihtml5',
// 		'./commands/commands',
// 		'./WysiwygRules'
// 	],

// 	function (DOMClass, $, wysihtml5, commands, wysihtml5ParserRules) {

//

// 		var guid = 0;

// 		return DOMClass.extend({

// 			dom : null,
// 			toolbar : null,
// 			textarea : null,

// 			count : 0,

// 			init : function (dom) {
// 				this.dom = dom;
// 				this.toolbar = this.dom.find('.wysiwyg-toolbar');
// 				this.textarea = this.dom.find('.wysiwyg-textarea');

// 				this._initWysihtml5();
// 			},

// 			_initWysihtml5 : function () {
// 				var id = 'wysihtml5-' + (++guid),
// 					textareaId = id + '-textarea',
// 					toolbarId = id + '-toolbar',
// 					editor;

// 				this.toolbar.attr('id', toolbarId);
// 				this.textarea.attr('id', textareaId);

// 				editor = new wysihtml5.Editor(textareaId, {
// 					parserRules: wysihtml5ParserRules,
// 					style: false,
// 					toolbar: toolbarId,
// 					stylesheets: '/static/scarlet/legacy/css/wysiwyg.css',
// 					id: id
// 				});

// 				editor.on('load', function () {
// 					editor.id = id;

// 					// load audio sources
// 					this.dom.find('audio').each(function () {
// 						$(this)[0].load();
// 					});

// 					if (this.dom.hasClass('annotation')) {
// 						this._addListeners();
// 					}

// 				}.bind(this));

// 				this.editor = editor;
// 			},

// 			_addListeners : function () {
// 				this.editor.on('show:dialog', this.onShowDialog);
// 				this.editor.on('save:dialog', this.onSaveDialog);
// 				this.editor.on('update:dialog', this.onUpdateDialog);
// 				this.editor.on('cancel:dialog', this.onCancelDialog);

// 				$('form[data-form-id=edit]').on('submit', this.onSubmit);
// 			},

// 			enableEditor: function () {
// 				$(this.editor.composer.sandbox.getDocument()).find('a').off('click', this.preventClick);
// 				this.editor.composer.enable();
// 			},

// 			disableEditor: function () {
// 				$(this.editor.composer.sandbox.getDocument()).find('a').on('click', this.preventClick);
// 				this.editor.composer.disable();
// 			},

// 			preventClick: function (e) {
// 				e.preventDefault();
// 			},

// 			onSubmit: function () {
// 				var $editor = $(document.createElement('div')).html(this.editor.composer.getValue()),
// 					$annotations = $(document.createElement('div')).html(this.dom.find('.wysiwyg-annotations').val()),
// 					$this;

// 				$annotations.find('span').each(function () {
// 					$this = $(this);

// 					if ($editor.find('[data-annotation-id=' + $this.attr('id') + ']').length === 0) {
// 						$this.remove();
// 					}
// 				});

// 				this.dom.find('.wysiwyg-annotations').val($annotations.html());
// 				this.enableEditor();
// 			},

// 			onShowDialog: function (data) {
// 				var command = data.command,
// 					$button = this.toolbar.find('.wysiwyg-buttons a[data-wysihtml5-command=' + data.command + ']');

// 				// force dialog to close if command is disabled
// 				if ($button.hasClass('disabled')) {
// 					$button.removeClass('wysihtml5-command-dialog-opened');
// 					$(data.dialogContainer).hide();
// 					return;
// 				}

// 				var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id'),
// 					annotationsHtml = this.dom.find('.wysiwyg-annotations').val(),
// 					$annotationTextarea = $(data.dialogContainer).find('textarea'),
// 					$annotation = $(document.createElement('div')).html(annotationsHtml).find('#' + annotationId);

// 				if ($annotation) {
// 					$annotationTextarea.val($annotation.html());
// 				} else {
// 					$annotationTextarea.val('');
// 				}

// 				this.disableEditor();
// 			},

// 			onSaveDialog: function (data) {
// 				var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id'),
// 					annotationsEl = this.dom.find('.wysiwyg-annotations'),
// 					annotationHtml = '<span id="' + annotationId + '">' + $(data.dialogContainer).find('textarea').val() + '</span>';

// 				annotationsEl.val(annotationsEl.val() + annotationHtml);
// 				this.enableEditor();
// 			},

// 			onUpdateDialog: function (data) {
// 				var annotationId = $(this.editor.composer.selection.getSelection().nativeSelection.anchorNode.parentNode).attr('data-annotation-id'),
// 					annotationsHtml = this.dom.find('.wysiwyg-annotations').val(),
// 					annotationHtml = $(data.dialogContainer).find('textarea').val(),
// 					tempEl = $(document.createElement('div'));

// 				$(tempEl).html(annotationsHtml).find('#' + annotationId).html(annotationHtml);
// 				this.dom.find('.wysiwyg-annotations').val($(tempEl).html());
// 				this.enableEditor();

// 			},

// 			onCancelDialog: function (data) {
// 				this.enableEditor();
// 			}
// 		});
// 	}
// );

define('admin/modules/wysiwyg/Wysiwyg', function() {})

/* jshint loopfunc: true */

define(
	'admin/modules/Formset',
	[
		'rosy/base/DOMClass',
		'$',
		'$ui',
		'$plugin!select2',
		'./WidgetEvents',
		'./wysiwyg/Wysiwyg',
	],
	function(DOMClass, $, $ui, jQuerySelect2, WidgetEvents, Wysiwyg) {
		return DOMClass.extend({
			dom: null,
			forms: null,

			types: [],

			prefix: '',

			isDraggable: false,

			init: function(dom) {
				this.dom = dom
				this.forms = dom.find('.widget-formset-forms')
				this.controls = dom.next('.widget-formset-controls')
				this.prefix = this.dom.data('prefix')

				this.dom.on('click', '.widget-formset-delete', this._delete)

				this._initTypes()
				this._initSort()
				this._initControls()
			},

			_delete: function(e) {
				var dom = $(e.currentTarget), form = dom.closest('.widget-formset-form')

				dom.find('input').attr('checked', true)

				form.addClass('was-deleted')
				form.find('.widget-formset-order input').val(0)

				this._resort()
			},

			/************************************
				Add
			************************************/

			_count: function(typeOf) {
				return this.dom.find('.widget-formset-form[data-prefix=' + typeOf + ']')
					.length
			},

			_add: function(e) {
				var $scope = $(e.currentTarget),
					typeOf = $scope.data('prefix'),
					clone = $('<div>')
						.addClass('widget-formset-form added-with-js')
						.attr('data-prefix', typeOf),
					html = $scope.find('.widget-formset-form-template').html()

				html = html.replace(/(__prefix__)/g, this._count(typeOf))
				clone.html(html)

				this.forms.append(clone)

				if (this.isDraggable) {
					clone.addClass('draggable')
				}

				this.publish(WidgetEvents.RENDER, {
					dom: clone,
				})

				if (this.types.indexOf(typeOf) === -1) {
					this.types.push(typeOf)
				}

				this._initSort()
			},

			/************************************
				Sorting
			************************************/

			_initSort: function() {
				if (this.forms.find('.widget-formset-order').length) {
					this.forms.sortable({
						update: this._resort,
						//change : this._resort,
						stop: this._repairWysiwyg,
					})
					this.dom.find('.widget-formset-form').addClass('draggable')
					this.isDraggable = true
				}
				this._resort()
			},

			_resort: function() {
				var helper = this.dom.find('.ui-sortable-helper'),
					placeholder = this.dom.find('.ui-sortable-placeholder')

				this.dom.find('.widget-formset-form').each(function(i, dom) {
					dom = $(dom)

					if (dom.is('.was-deleted, .ui-sortable-helper')) {
						return
					}

					if (i % 2) {
						dom.addClass('odd')
					} else {
						dom.removeClass('odd')
					}

					dom.find('.widget-formset-order input').val(i)
				})

				if (placeholder.hasClass('odd')) {
					helper.addClass('odd')
				} else {
					helper.removeClass('odd')
				}

				this._updateMetadata()
			},

			// workaround for WYSIHTML5 failing after iframe is moved
			_repairWysiwyg: function(e, elem) {
				var $wysiwyg = $(elem.item[0]).find('.widget-wysiwyg')

				if ($wysiwyg.length) {
					$('.wysihtml5-sandbox', $wysiwyg).remove()
					var wysiwyg = new Wysiwyg($wysiwyg)
				}
			},

			/************************************
				Metadata
			************************************/

			_initTypes: function() {
				var self = this
				this.controls.find('.widget-formset-add').each(function() {
					self.types.push($(this).data('prefix'))
				})
			},

			_updateMetadata: function() {
				for (var i = 0; i < this.types.length; i++) {
					var typeOf = this.types[i],
						$formset = $('.widget-formset-form[data-prefix=' + typeOf + ']')

					$formset.each(function(n, el) {
						var $this = $(this)
						$this
							.find('.widget-formset-order input')
							.val($this.prevAll().length)
					})

					$('#id_' + typeOf + '-TOTAL_FORMS').val($formset.length)
				}
			},

			/************************************
				Controls
			************************************/

			_initControls: function() {
				var attrDataPrefix = this.prefix
					? '[data-prefix=' + this.prefix + ']'
					: '[data-prefix]'

				$('.widget-formset-add' + attrDataPrefix).on('click', this._add)

				this.controls
					.filter('.dropdown')
					.on('click', this._toggleOptions)
					.on('mouseout', this._closeOptions)
			},

			_toggleOptions: function(e) {
				$(e.currentTarget).toggleClass('show')
			},

			_closeOptions: function(e) {
				var parent = e.currentTarget, child = e.toElement || e.relatedTarget

				// check all children (checking from bottom up)
				// prevent closing on child event
				while (child && child.parentNode && child.parentNode !== window) {
					if (child.parentNode === parent || child === parent) {
						if (child.preventDefault) {
							child.preventDefault()
						}

						return false
					}

					child = child.parentNode
				}

				$(parent).removeClass('show')
			},
		})
	}
)

define('admin/modules/Tabs', ['rosy/base/DOMClass', '$'], function(
	DOMClass,
	$
) {
	return DOMClass.extend({
		dom: null,
		tabs: null,

		init: function(dom) {
			this.dom = dom
			this.data = this.dom.data()
			this.bindTabEvents()
			this.autoSelectFirstTab()
		},

		bindTabEvents: function() {
			this.$container = $(this.data.tabsContainer)
			this.$tabs = this.dom.find('[data-tabs-content]')

			if (!this.$container.length) {
				return
			}

			this.$tabs.on('click', this.onTabClick)
		},

		unbindTabEvents: function() {
			if (this.$tabs && this.$tabs.length) {
				this.$tabs.off()
			}
		},

		onTabClick: function(e) {
			e.preventDefault()

			var $tab = $(e.currentTarget)

			this.highlightTab($tab)
			this.selectTab($tab.data('tabsContent'))
		},

		highlightTab: function($tab) {
			this.$tabs.removeClass('active')
			$tab.addClass('active')
		},

		selectTab: function(selector) {
			var $content = this.$container.find(selector)

			if (!$content.length) {
				return
			}

			this.hideTabContent()
			$content.show()
		},

		hideTabContent: function() {
			this.$container.children().hide()
		},

		autoSelectFirstTab: function() {
			var $firstTab = this.$tabs.eq(0)
			this.highlightTab($firstTab)
			this.selectTab($firstTab.data('tabsContent'))
		},

		destroy: function() {
			this.unbindTabEvents()
			this.sup()
		},
	})
})

define(
	'admin/modules/Insert',
	['rosy/base/DOMClass', '$', 'admin/modules/WindowPopup'],
	function(DOMClass, $, WindowPopup) {
		return DOMClass.extend({
			$dom: null,

			vars: {
				$inputs: null,
				$form: null,
				$node: false,
				constrain: false,
				size: {
					width: null,
					height: null,
				},
			},

			init: function() {
				this.$dom = this.vars.$dom
				this.vars.$inputs = this.$dom.find('[data-attribute]')
				this.vars.$form = this.$dom.find('form')

				this.bindInputs()
				this.sup()
			},

			bindInputs: function() {
				this.vars.$inputs.on('keypress paste', this.onDelayInput)
				this.vars.$form.on('submit', this.onSubmit)
				this.vars.$form.find('.cancel').on('click', this.onCancel)
				this.$dom.find('.constrain').on('change', this.onConstrainChange)
			},

			unbindInputs: function() {
				this.vars.$inputs.off()
				this.vars.$form.off()
				this.vars.$form.find('.cancel').off()
				this.$dom.find('.constrain').off()
			},

			// Helper to delay onInput call on paste
			// http://stackoverflow.com/a/1503425
			onDelayInput: function(e) {
				this.setTimeout(function() {
					this.onInput(e)
				})
			},

			// NOTE: this method must be overwritten by the extending class.
			onInput: function(e) {
				throw 'You must override the `onInput` method.'
			},

			// Helper to constrain proportions
			// given a dimension("width" || "height") and integer value.
			constrainProportion: function(dimension, value) {
				value = parseInt(value, 10)

				if (!this.vars.$node || isNaN(value)) {
					return
				}

				var opposite = dimension === 'width' ? 'height' : 'width',
					oppositeValue = this.vars.size[opposite],
					ratio =
						(value - this.vars.size[dimension]) / this.vars.size[dimension] + 1

				// Sets the opposing axis based on the ratio difference in value.
				this.vars.size[opposite] = Math.round(oppositeValue * ratio)

				// Updates the proportion attribute.
				this.setAttribute(opposite, this.vars.size[opposite])
			},

			// Helper to set a given attribute
			setAttribute: function(attr, val) {
				this.vars.$inputs.filter('[data-attribute="' + attr + '"]').val(val)
				this.vars.$node.attr(attr, val)
			},

			// Sets the constrain value to the state of the check-box
			onConstrainChange: function(e) {
				this.vars.constrain = !!$(e.currentTarget).is(':checked')
			},

			// Sends data back to the parent window.
			onSubmit: function(e) {
				e.preventDefault()
				WindowPopup.respond(this.vars.$node)
			},

			onCancel: function() {
				window.close()
			},

			destroy: function() {
				this.unbindInputs()
				this.sup()
			},
		})
	}
)

define('admin/modules/InsertVideo', ['./Insert', '$'], function(Insert, $) {
	return Insert.extend({
		vars: {
			size: {
				width: 560,
				height: 315,
			},
			providers: [
				{
					name: 'youtube',
					regex: /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/,
					embed: 'http://www.youtube.com/embed/',
				},
				{
					name: 'vimeo',
					regex: /(?:vimeo.com\/(.*))/,
					embed: 'http://player.vimeo.com/video/',
				},
			],
		},

		// Generates or updates the iframe with the latest input value.
		onInput: function(e) {
			var $target = $(e.currentTarget),
				attribute = $target.data('attribute'),
				value = $(e.currentTarget).val(),
				$preview = this.$dom.find('.video-preview'),
				$video = $preview.find('iframe')

			if (attribute === 'src') {
				value = this.validateVideo(value)
			}

			if (!$video.length) {
				$video = $('<iframe />')
				$video.attr({
					frameborder: '0',
					allowfullscreen: '',
				})

				$preview.append($video)

				this.vars.$node = $video

				this.setAttribute('width', this.vars.size.width)
				this.setAttribute('height', this.vars.size.height)
			} else {
				this.vars.$node = $video
			}

			if (attribute === 'width' || attribute === 'height') {
				value = value.replace('px', '')

				if (this.vars.constrain) {
					this.constrainProportion(attribute, value)
				}

				this.vars.size[attribute] = value
			}

			this.vars.$node = $video.attr(attribute, value)
		},

		// Validates the video URL to a matching provider.
		// Useful for video URLs that are not necessarily "embeddable" URLs.
		validateVideo: function(url) {
			var i = 0, match, providers = this.vars.providers, provider

			for (; i < providers.length; i++) {
				provider = providers[i]
				match = url.match(provider.regex)

				if (match) {
					return provider.embed + match[1]
				}
			}

			return url
		},
	})
})

define('admin/modules/InsertImage', ['./Insert', '$'], function(Insert, $) {
	return Insert.extend({
		// Extending to bind to a special data-respond attribute for Select2.
		bindInputs: function() {
			this.sup()
			this.$dom.find('[data-respond="true"]').on('change', this.onInput)
		},

		// Generates or updates the image with the latest input value.
		onInput: function(e) {
			var $target = $(e.currentTarget),
				attribute = $target.data('attribute'),
				value = $(e.currentTarget).val(),
				$preview = this.$dom.find('.image-preview'),
				$img = $preview.find('img')

			// Adjusts the source to come from the data attribute.
			if ($target.attr('data-src')) {
				$preview.empty()
				$img = $preview.find('img')
				value = $target.attr('data-src')
			}

			if (!$img.length) {
				$img = $('<img />')
				$preview.append($img)

				this.vars.$node = $img

				$img.on(
					'load',
					this.proxy(function(e) {
						var width = $img.width(), height = $img.height()

						this.vars.size.width = width
						this.vars.size.height = height

						this.setAttribute('width', width)
						this.setAttribute('height', height)
					})
				)
			} else {
				this.vars.$node = $img
			}

			if (attribute === 'width' || attribute === 'height') {
				value = value.replace('px', '')

				if (this.vars.constrain) {
					this.constrainProportion(attribute, value)
				}

				this.vars.size[attribute] = value
			}

			this.vars.$node = $img.attr(attribute, value)
		},
	})
})

define('admin/modules/InsertAudio', ['./Insert', '$'], function(Insert, $) {
	return Insert.extend({
		// Extending to bind to a special data-respond attribute for Select2.
		bindInputs: function() {
			this.sup()
			this.$dom.find('[data-respond="true"]').on('change', this.onInput)
		},

		// Generates or updates the audio with the latest input value.
		onInput: function(e) {
			var $target = $(e.currentTarget),
				attribute = $target.data('attribute'),
				value = $(e.currentTarget).val(),
				$audio = this.$dom.find('audio')

			// Adjusts the source to come from the data attribute.
			if ($target.attr('data-src') && value) {
				value = $target.attr('data-src')
			}

			$audio[0].src = value
			$audio[0].load()

			this.vars.$node = $audio
		},
	})
})

define('admin/modules/InsertAnnotation', ['./Insert', '$'], function(
	Insert,
	$
) {
	return Insert.extend({
		bindInputs: function() {
			this.sup()
			this.vars.$node = this.$dom.find('.wysiwyg-textarea')

			this.$dom.find('#test').on('click', this.test)
		},

		test: function() {
			this.vars.$form.submit()
		},
	})
})

define(
	'admin/modules/OnExit',
	['require', 'exports', 'module', 'rosy/base/DOMClass', '$'],
	function(require, exports, module) {
		var DOMClass = require('rosy/base/DOMClass'), $ = require('$'), OnExit

		OnExit = DOMClass.extend({
			_isSubmitting: false,

			forms: {},

			init: function(dom) {
				// console.warn("OnExit : init(dom)", dom);
				// console.log("forms", this.forms);
				// $('form').on('submit', this.onSubmit);
				// $(window).on('beforeunload', this.onUnload);
				// this.cacheValues();
			},

			cacheValues: function() {
				// console.warn("OnExit : cacheValues()");
				// console.log("forms", this.forms);
				$('form').each(
					this.proxy(function(i, form) {
						form = $(form)
						var id = form.data('form-id'), values = {}

						if (!id) {
							return
						}

						form.find('[name]').each(function(i, input) {
							input = $(input)
							values[input.attr('name')] = input.val()
						})

						this.forms[id] = values
					})
				)
			},

			isDirty: function() {
				// console.warn("OnExit : isDirty()");
				// console.log("forms", this.forms);
				var isDirty = false

				$('form').each(
					this.proxy(function(i, form) {
						form = $(form)
						var id = form.data('form-id'), values = this.forms[id], value

						if (!id) {
							return
						}

						form.find('[name]').each(function(i, input) {
							input = $(input)
							value = values[input.attr('name')]

							if (value !== undefined && value !== input.val()) {
								isDirty = true
								/*
							window.console.log("In form", id, input.attr('name'),
								'changed from', values[input.attr('name')],
								'to', input.val());
							*/
							}
						})
					})
				)

				return isDirty
			},

			onSubmit: function(e) {
				// console.warn("OnExit : onSubmit(e)", e);
				// console.log("forms", this.forms);
				this._isSubmitting = true
			},

			onUnload: function(e) {
				// console.warn("OnExit : onUnload(e)", e);
				// console.log("forms", this.forms);
				if (!this._isSubmitting && this.isDirty()) {
					if (e) {
						e.returnValue = 'You have unsaved changes'
					}
					return 'You have unsaved changes'
				}
			},
		})

		return new OnExit()
	}
)

define('admin/modules/InlineVideo', ['rosy/base/DOMClass', '$'], function(
	DOMClass,
	$
) {
	return DOMClass.extend({
		vars: {
			$dom: null,
		},

		init: function() {
			this.sup()
			this.bindInput()
		},

		bindInput: function() {
			this.vars.$dom.on('click', this.onImageClick)
		},

		onImageClick: function(e) {
			var $el = $(e.currentTarget),
				url = $el.data('videoUrl'),
				width = $el.width(),
				height = $el.height(),
				str

			str = [
				'<iframe width="' + width + '" height="' + height + '"',
				'src="' + url + '"',
				'frameborder="0" allowfullscreen></iframe>',
			].join('')

			this.vars.$dom.replaceWith(str)
		},

		destroy: function() {
			this.sup()
		},
	})
})

define('admin/modules/FilterBar', ['rosy/base/DOMClass', '$'], function(
	DOMClass,
	$
) {
	/* mark up sample ----------
			<section class="filters">
				<details id="filter" {% if filter_form.has_changed %}class="filtered"{% endif %}>
					<summary>
						{% if filter_form.has_changed %}
							<a class="filter-clear" href="{{ request.path }}">Clear</a>
						{% endif %}
						Filter
						<i></i>
					</summary>
					<form action="" method="get">
						{{ filter_form }}
						<p><input type="submit" value="Filter" /></p>
					</form>
				</details>
				<details id="filter" {% if filter_form.has_changed %}class="filtered"{% endif %}>
					<summary>
						{% if filter_form.has_changed %}
							<a class="filter-clear" href="{{ request.path }}">Clear</a>
						{% endif %}
						Filter
						<i></i>
					</summary>
					<form action="" method="get">
						{{ filter_form }}
						<p><input type="submit" value="Filter" /></p>
					</form>
				</details>
			</section>
		*/

	return DOMClass.extend({
		init: function(dom) {
			this.dom = dom
			this.data = this.dom.data()
			this.bindDropDownEvents()
		},

		bindDropDownEvents: function() {
			var dropDowns = this.dom.find('summary')

			dropDowns.on('click', function() {
				var dropdown = this
				dropDowns.each(function(i) {
					if (dropdown !== this) {
						var details = $(this).parent()
						if (details.attr('open') !== undefined) {
							details.removeAttr('open')
						} else if (details.hasClass('open')) {
							details.removeClass('open').addClass('closed')
							details.attr('data-open', 'closed')
						}
					}
				})
			})
		},
	})
})
define('$plugin!jcrop', ['$'], function($) {
	var jQuery = $
	/**
 * Includes forked changes from
 * http://github.com/potench/Jcrop
 */

	/**
 * jquery.Jcrop.js v0.9.12
 * jQuery Image Cropping Plugin - released under MIT License
 * Author: Kelly Hallman <khallman@gmail.com>
 * http://github.com/tapmodo/Jcrop
 * Copyright (c) 2008-2013 Tapmodo Interactive LLC {{{
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 */
	;(function($) {
		$.Jcrop = function(obj, opt) {
			var options = $.extend({}, $.Jcrop.defaults),
				docOffset,
				_ua = navigator.userAgent.toLowerCase(),
				is_msie = /msie/.test(_ua),
				ie6mode = /msie [1-6]\./.test(_ua)

			// Internal Methods {{{
			function px(n) {
				return Math.round(n) + 'px'
			}
			function cssClass(cl) {
				return options.baseClass + '-' + cl
			}
			function supportsColorFade() {
				return $.fx.step.hasOwnProperty('backgroundColor')
			}
			function getPos(
				obj //{{{
			) {
				var pos = $(obj).offset()
				return [pos.left, pos.top]
			}
			//}}}
			function mouseAbs(
				e //{{{
			) {
				return [e.pageX - docOffset[0], e.pageY - docOffset[1]]
			}
			//}}}
			function setOptions(
				opt //{{{
			) {
				if (typeof opt !== 'object') opt = {}
				options = $.extend(options, opt)

				$.each(['onChange', 'onSelect', 'onRelease', 'onDblClick'], function(
					i,
					e
				) {
					if (typeof options[e] !== 'function') options[e] = function() {}
				})
			}
			//}}}
			function startDragMode(
				mode,
				pos,
				touch //{{{
			) {
				docOffset = getPos($img)
				Tracker.setCursor(mode === 'move' ? mode : mode + '-resize')

				if (mode === 'move') {
					return Tracker.activateHandlers(createMover(pos), doneSelect, touch)
				}

				var fc = Coords.getFixed()
				var opp = oppLockCorner(mode)
				var opc = Coords.getCorner(oppLockCorner(opp))

				Coords.setPressed(Coords.getCorner(opp))
				Coords.setCurrent(opc)

				Tracker.activateHandlers(dragmodeHandler(mode, fc), doneSelect, touch)
			}
			//}}}
			function dragmodeHandler(
				mode,
				f //{{{
			) {
				return function(pos) {
					if (!options.aspectRatio) {
						switch (mode) {
							case 'e':
								pos[1] = f.y2
								break
							case 'w':
								pos[1] = f.y2
								break
							case 'n':
								pos[0] = f.x2
								break
							case 's':
								pos[0] = f.x2
								break
						}
					} else {
						switch (mode) {
							case 'e':
								pos[1] = f.y + 1
								break
							case 'w':
								pos[1] = f.y + 1
								break
							case 'n':
								pos[0] = f.x + 1
								break
							case 's':
								pos[0] = f.x + 1
								break
						}
					}
					Coords.setCurrent(pos)
					Selection.update()
				}
			}
			//}}}
			function createMover(
				pos //{{{
			) {
				var lloc = pos
				KeyManager.watchKeys()

				return function(pos) {
					Coords.moveOffset([pos[0] - lloc[0], pos[1] - lloc[1]])
					lloc = pos

					Selection.update()
				}
			}
			//}}}
			function oppLockCorner(
				ord //{{{
			) {
				switch (ord) {
					case 'n':
						return 'sw'
					case 's':
						return 'nw'
					case 'e':
						return 'nw'
					case 'w':
						return 'ne'
					case 'ne':
						return 'sw'
					case 'nw':
						return 'se'
					case 'se':
						return 'nw'
					case 'sw':
						return 'ne'
				}
			}
			//}}}
			function createDragger(
				ord //{{{
			) {
				return function(e) {
					if (options.disabled) {
						return false
					}
					if (ord === 'move' && !options.allowMove) {
						return false
					}

					// Fix position of crop area when dragged the very first time.
					// Necessary when crop image is in a hidden element when page is loaded.
					docOffset = getPos($img)

					btndown = true
					startDragMode(ord, mouseAbs(e))
					e.stopPropagation()
					e.preventDefault()
					return false
				}
			}
			//}}}
			function presize(
				$obj,
				w,
				h //{{{
			) {
				var natW = $obj.naturalWidth() || $obj.width(),
					natH = $obj.naturalHeight() || $obj.height()

				var nw = natW, nh = natH

				if (nw > w && w > 0) {
					nw = w
					nh = w / natW * natH
				}
				if (nh > h && h > 0) {
					nh = h
					nw = h / natH * natW
				}

				xscale = natW / nw
				yscale = natH / nh
				$obj.width(nw).height(nh)
			}
			//}}}
			function unscale(
				c //{{{
			) {
				var o = {
					x: Math.floor(c.x * xscale),
					y: Math.floor(c.y * yscale),
					x2: Math.floor(c.x2 * xscale),
					y2: Math.floor(c.y2 * yscale),
					w: Math.floor(c.w * xscale),
					h: Math.floor(c.h * yscale),
				}

				return o
			}
			//}}}
			function doneSelect(
				pos //{{{
			) {
				var c = Coords.getFixed()
				if (c.w > options.minSelect[0] && c.h > options.minSelect[1]) {
					Selection.enableHandles()
					Selection.done()
				} else {
					Selection.release()
				}
				Tracker.setCursor(options.allowSelect ? 'crosshair' : 'default')
			}
			//}}}
			function newSelection(
				e //{{{
			) {
				if (options.disabled) {
					return false
				}
				if (!options.allowSelect) {
					return false
				}
				btndown = true
				docOffset = getPos($img)
				Selection.disableHandles()
				Tracker.setCursor('crosshair')
				var pos = mouseAbs(e)
				Coords.setPressed(pos)
				Selection.update()
				Tracker.activateHandlers(
					selectDrag,
					doneSelect,
					e.type.substring(0, 5) === 'touch'
				)
				KeyManager.watchKeys()

				e.stopPropagation()
				e.preventDefault()
				return false
			}
			//}}}
			function selectDrag(
				pos //{{{
			) {
				Coords.setCurrent(pos)
				Selection.update()
			}
			//}}}
			function newTracker() {
				//{{{
				var trk = $('<div></div>').addClass(cssClass('tracker'))
				if (is_msie) {
					trk.css({
						opacity: 0,
						backgroundColor: 'white',
					})
				}
				return trk
			}
			//}}}

			// }}}
			// Initialization {{{
			// Sanitize some options {{{
			if (typeof obj !== 'object') {
				obj = $(obj)[0]
			}
			if (typeof opt !== 'object') {
				opt = {}
			}
			// }}}
			setOptions(opt)
			// Initialize some jQuery objects {{{
			// The values are SET on the image(s) for the interface
			// If the original image has any of these set, they will be reset
			// However, if you destroy() the Jcrop instance the original image's
			// character in the DOM will be as you left it.
			var img_css = {
				border: 'none',
				visibility: 'visible',
				margin: 0,
				padding: 0,
				position: 'absolute',
				top: 0,
				left: 0,
			}

			var $origimg = $(obj), img_mode = true

			if (obj.tagName == 'IMG') {
				// Fix size of crop image.
				// Necessary when crop image is within a hidden element when page is loaded.
				if ($origimg[0].width != 0 && $origimg[0].height != 0) {
					// Obtain dimensions from contained img element.
					$origimg.width($origimg[0].width)
					$origimg.height($origimg[0].height)
				} else {
					// Obtain dimensions from temporary image in case the original is not loaded yet (e.g. IE 7.0).
					var tempImage = new Image()
					tempImage.src = $origimg[0].src
					$origimg.width(tempImage.width)
					$origimg.height(tempImage.height)
				}

				var $img = $origimg.clone().removeAttr('id').css(img_css).show()

				$img.width($origimg.width())
				$img.height($origimg.height())
				$origimg.after($img).hide()
			} else {
				$img = $origimg.css(img_css).show()
				img_mode = false
				if (options.shade === null) {
					options.shade = true
				}
			}

			presize($img, options.boxWidth, options.boxHeight)

			var boundx = $img.width(),
				boundy = $img.height(),
				$div = $('<div />')
					.width(boundx)
					.height(boundy)
					.addClass(cssClass('holder'))
					.css({
						position: 'relative',
						backgroundColor: options.bgColor,
					})
					.insertAfter($origimg)
					.append($img)

			if (options.addClass) {
				$div.addClass(options.addClass)
			}

			var $img2 = $('<div />'),
				$img_holder = $('<div />').width('100%').height('100%').css({
					zIndex: 310,
					position: 'absolute',
					overflow: 'hidden',
				}),
				$hdl_holder = $('<div />')
					.width('100%')
					.height('100%')
					.css('zIndex', 320),
				$sel = $('<div />')
					.css({
						position: 'absolute',
						zIndex: 600,
					})
					.dblclick(function() {
						var c = Coords.getFixed()
						options.onDblClick.call(api, c)
					})
					.insertBefore($img)
					.append($img_holder, $hdl_holder)

			if (img_mode) {
				;($img2 = $('<img />')
					.attr('src', $img.attr('src'))
					.css(img_css)
					.width(boundx)
					.height(boundy)), $img_holder.append($img2)
			}

			if (ie6mode) {
				$sel.css({
					overflowY: 'hidden',
				})
			}

			var bound = options.boundary
			var $trk = newTracker()
				.width(boundx + bound * 2)
				.height(boundy + bound * 2)
				.css({
					position: 'absolute',
					top: px(-bound),
					left: px(-bound),
					zIndex: 290,
				})
				.mousedown(newSelection)

			/* }}} */
			// Set more variables {{{
			var bgcolor = options.bgColor,
				bgopacity = options.bgOpacity,
				xlimit,
				ylimit,
				xmin,
				ymin,
				xscale,
				yscale,
				enabled = true,
				btndown,
				animating,
				shift_down

			docOffset = getPos($img)
			// }}}
			// }}}
			// Internal Modules {{{
			// Touch Module {{{
			var Touch = (function() {
				// Touch support detection function adapted (under MIT License)
				// from code by Jeffrey Sambells - http://github.com/iamamused/
				function hasTouchSupport() {
					var support = {},
						events = ['touchstart', 'touchmove', 'touchend'],
						el = document.createElement('div'),
						i

					try {
						for (i = 0; i < events.length; i++) {
							var eventName = events[i]
							eventName = 'on' + eventName
							var isSupported = eventName in el
							if (!isSupported) {
								el.setAttribute(eventName, 'return;')
								isSupported = typeof el[eventName] == 'function'
							}
							support[events[i]] = isSupported
						}
						return support.touchstart && support.touchend && support.touchmove
					} catch (err) {
						return false
					}
				}

				function detectSupport() {
					if (options.touchSupport === true || options.touchSupport === false)
						return options.touchSupport
					else return hasTouchSupport()
				}
				return {
					createDragger: function(ord) {
						return function(e) {
							if (options.disabled) {
								return false
							}
							if (ord === 'move' && !options.allowMove) {
								return false
							}
							docOffset = getPos($img)
							btndown = true
							startDragMode(ord, mouseAbs(Touch.cfilter(e)), true)
							e.stopPropagation()
							e.preventDefault()
							return false
						}
					},
					newSelection: function(e) {
						return newSelection(Touch.cfilter(e))
					},
					cfilter: function(e) {
						e.pageX = e.originalEvent.changedTouches[0].pageX
						e.pageY = e.originalEvent.changedTouches[0].pageY
						return e
					},
					isSupported: hasTouchSupport,
					support: detectSupport(),
				}
			})()
			// }}}
			// Coords Module {{{
			var Coords = (function() {
				var x1 = 0, y1 = 0, x2 = 0, y2 = 0, ox, oy

				function setPressed(
					pos //{{{
				) {
					pos = rebound(pos)
					x2 = x1 = pos[0]
					y2 = y1 = pos[1]
				}
				//}}}
				function setCurrent(
					pos //{{{
				) {
					pos = rebound(pos)
					ox = pos[0] - x2
					oy = pos[1] - y2
					x2 = pos[0]
					y2 = pos[1]
				}
				//}}}
				function getOffset() {
					//{{{
					return [ox, oy]
				}
				//}}}
				function moveOffset(
					offset //{{{
				) {
					var ox = offset[0], oy = offset[1]

					if (0 > x1 + ox) {
						ox -= ox + x1
					}
					if (0 > y1 + oy) {
						oy -= oy + y1
					}

					if (boundy < y2 + oy) {
						oy += boundy - (y2 + oy)
					}
					if (boundx < x2 + ox) {
						ox += boundx - (x2 + ox)
					}

					x1 += ox
					x2 += ox
					y1 += oy
					y2 += oy
				}
				//}}}
				function getCorner(
					ord //{{{
				) {
					var c = getFixed()
					switch (ord) {
						case 'ne':
							return [c.x2, c.y]
						case 'nw':
							return [c.x, c.y]
						case 'se':
							return [c.x2, c.y2]
						case 'sw':
							return [c.x, c.y2]
					}
				}
				//}}}
				function getFixed() {
					//{{{
					if (!options.aspectRatio) {
						return getRect()
					}
					// This function could use some optimization I think...
					var aspect = options.aspectRatio,
						min_x = options.minSize[0] / xscale,
						//min_y = options.minSize[1]/yscale,
						max_x = options.maxSize[0] / xscale,
						max_y = options.maxSize[1] / yscale,
						rw = x2 - x1,
						rh = y2 - y1,
						rwa = Math.abs(rw),
						rha = Math.abs(rh),
						real_ratio = rwa / rha,
						xx,
						yy,
						w,
						h

					if (max_x === 0) {
						max_x = boundx * 10
					}
					if (max_y === 0) {
						max_y = boundy * 10
					}
					if (real_ratio < aspect) {
						yy = y2
						w = rha * aspect
						xx = rw < 0 ? x1 - w : w + x1

						if (xx < 0) {
							xx = 0
							h = Math.abs((xx - x1) / aspect)
							yy = rh < 0 ? y1 - h : h + y1
						} else if (xx > boundx) {
							xx = boundx
							h = Math.abs((xx - x1) / aspect)
							yy = rh < 0 ? y1 - h : h + y1
						}
					} else {
						xx = x2
						h = rwa / aspect
						yy = rh < 0 ? y1 - h : y1 + h
						if (yy < 0) {
							yy = 0
							w = Math.abs((yy - y1) * aspect)
							xx = rw < 0 ? x1 - w : w + x1
						} else if (yy > boundy) {
							yy = boundy
							w = Math.abs(yy - y1) * aspect
							xx = rw < 0 ? x1 - w : w + x1
						}
					}

					// Magic %-)
					if (xx > x1) {
						// right side
						if (xx - x1 < min_x) {
							xx = x1 + min_x
						} else if (xx - x1 > max_x) {
							xx = x1 + max_x
						}
						if (yy > y1) {
							yy = y1 + (xx - x1) / aspect
						} else {
							yy = y1 - (xx - x1) / aspect
						}
					} else if (xx < x1) {
						// left side
						if (x1 - xx < min_x) {
							xx = x1 - min_x
						} else if (x1 - xx > max_x) {
							xx = x1 - max_x
						}
						if (yy > y1) {
							yy = y1 + (x1 - xx) / aspect
						} else {
							yy = y1 - (x1 - xx) / aspect
						}
					}

					if (xx < 0) {
						x1 -= xx
						xx = 0
					} else if (xx > boundx) {
						x1 -= xx - boundx
						xx = boundx
					}

					if (yy < 0) {
						y1 -= yy
						yy = 0
					} else if (yy > boundy) {
						y1 -= yy - boundy
						yy = boundy
					}

					return makeObj(flipCoords(x1, y1, xx, yy))
				}
				//}}}
				function rebound(
					p //{{{
				) {
					if (p[0] < 0) p[0] = 0
					if (p[1] < 0) p[1] = 0

					if (p[0] > boundx) p[0] = boundx
					if (p[1] > boundy) p[1] = boundy

					return [Math.round(p[0]), Math.round(p[1])]
				}
				//}}}
				function flipCoords(
					x1,
					y1,
					x2,
					y2 //{{{
				) {
					var xa = x1, xb = x2, ya = y1, yb = y2
					if (x2 < x1) {
						xa = x2
						xb = x1
					}
					if (y2 < y1) {
						ya = y2
						yb = y1
					}
					return [xa, ya, xb, yb]
				}
				//}}}
				function getRect() {
					//{{{
					var xsize = x2 - x1, ysize = y2 - y1, delta

					if (xlimit && Math.abs(xsize) > xlimit) {
						x2 = xsize > 0 ? x1 + xlimit : x1 - xlimit
					}
					if (ylimit && Math.abs(ysize) > ylimit) {
						y2 = ysize > 0 ? y1 + ylimit : y1 - ylimit
					}

					if (ymin / yscale && Math.abs(ysize) < ymin / yscale) {
						y2 = ysize > 0 ? y1 + ymin / yscale : y1 - ymin / yscale
					}
					if (xmin / xscale && Math.abs(xsize) < xmin / xscale) {
						x2 = xsize > 0 ? x1 + xmin / xscale : x1 - xmin / xscale
					}

					if (x1 < 0) {
						x2 -= x1
						x1 -= x1
					}
					if (y1 < 0) {
						y2 -= y1
						y1 -= y1
					}
					if (x2 < 0) {
						x1 -= x2
						x2 -= x2
					}
					if (y2 < 0) {
						y1 -= y2
						y2 -= y2
					}
					if (x2 > boundx) {
						delta = x2 - boundx
						x1 -= delta
						x2 -= delta
					}
					if (y2 > boundy) {
						delta = y2 - boundy
						y1 -= delta
						y2 -= delta
					}
					if (x1 > boundx) {
						delta = x1 - boundy
						y2 -= delta
						y1 -= delta
					}
					if (y1 > boundy) {
						delta = y1 - boundy
						y2 -= delta
						y1 -= delta
					}

					return makeObj(flipCoords(x1, y1, x2, y2))
				}
				//}}}
				function makeObj(
					a //{{{
				) {
					return {
						x: a[0],
						y: a[1],
						x2: a[2],
						y2: a[3],
						w: a[2] - a[0],
						h: a[3] - a[1],
					}
				}
				//}}}

				return {
					flipCoords: flipCoords,
					setPressed: setPressed,
					setCurrent: setCurrent,
					getOffset: getOffset,
					moveOffset: moveOffset,
					getCorner: getCorner,
					getFixed: getFixed,
				}
			})()

			//}}}
			// Shade Module {{{
			var Shade = (function() {
				var enabled = false,
					holder = $('<div />').css({
						position: 'absolute',
						zIndex: 240,
						opacity: 0,
					}),
					shades = {
						top: createShade(),
						left: createShade().height(boundy),
						right: createShade().height(boundy),
						bottom: createShade(),
					}

				function resizeShades(w, h) {
					shades.left.css({ height: px(h) })
					shades.right.css({ height: px(h) })
				}
				function updateAuto() {
					return updateShade(Coords.getFixed())
				}
				function updateShade(c) {
					shades.top.css({
						left: px(c.x),
						width: px(c.w),
						height: px(c.y),
					})
					shades.bottom.css({
						top: px(c.y2),
						left: px(c.x),
						width: px(c.w),
						height: px(boundy - c.y2),
					})
					shades.right.css({
						left: px(c.x2),
						width: px(boundx - c.x2),
					})
					shades.left.css({
						width: px(c.x),
					})
				}
				function createShade() {
					return $('<div />')
						.css({
							position: 'absolute',
							backgroundColor: options.shadeColor || options.bgColor,
						})
						.appendTo(holder)
				}
				function enableShade() {
					if (!enabled) {
						enabled = true
						holder.insertBefore($img)
						updateAuto()
						Selection.setBgOpacity(1, 0, 1)
						$img2.hide()

						setBgColor(options.shadeColor || options.bgColor, 1)
						if (Selection.isAwake()) {
							setOpacity(options.bgOpacity, 1)
						} else setOpacity(1, 1)
					}
				}
				function setBgColor(color, now) {
					colorChangeMacro(getShades(), color, now)
				}
				function disableShade() {
					if (enabled) {
						holder.remove()
						$img2.show()
						enabled = false
						if (Selection.isAwake()) {
							Selection.setBgOpacity(options.bgOpacity, 1, 1)
						} else {
							Selection.setBgOpacity(1, 1, 1)
							Selection.disableHandles()
						}
						colorChangeMacro($div, 0, 1)
					}
				}
				function setOpacity(opacity, now) {
					if (enabled) {
						if (options.bgFade && !now) {
							holder.animate(
								{
									opacity: 1 - opacity,
								},
								{
									queue: false,
									duration: options.fadeTime,
								}
							)
						} else holder.css({ opacity: 1 - opacity })
					}
				}
				function refreshAll() {
					options.shade ? enableShade() : disableShade()
					if (Selection.isAwake()) setOpacity(options.bgOpacity)
				}
				function getShades() {
					return holder.children()
				}

				return {
					update: updateAuto,
					updateRaw: updateShade,
					getShades: getShades,
					setBgColor: setBgColor,
					enable: enableShade,
					disable: disableShade,
					resize: resizeShades,
					refresh: refreshAll,
					opacity: setOpacity,
				}
			})()
			// }}}
			// Selection Module {{{
			var Selection = (function() {
				var awake,
					hdep = 370,
					borders = {},
					handle = {},
					dragbar = {},
					seehandles = false

				// Private Methods
				function insertBorder(
					type //{{{
				) {
					var jq = $('<div />')
						.css({
							position: 'absolute',
							opacity: options.borderOpacity,
						})
						.addClass(cssClass(type))
					$img_holder.append(jq)
					return jq
				}
				//}}}
				function dragDiv(
					ord,
					zi //{{{
				) {
					var jq = $('<div />')
						.mousedown(createDragger(ord))
						.css({
							cursor: ord + '-resize',
							position: 'absolute',
							zIndex: zi,
						})
						.addClass('ord-' + ord)

					if (Touch.support) {
						jq.bind('touchstart.jcrop', Touch.createDragger(ord))
					}

					$hdl_holder.append(jq)
					return jq
				}
				//}}}
				function insertHandle(
					ord //{{{
				) {
					var hs = options.handleSize,
						div = dragDiv(ord, hdep++)
							.css({
								opacity: options.handleOpacity,
							})
							.addClass(cssClass('handle'))

					if (hs) {
						div.width(hs).height(hs)
					}

					return div
				}
				//}}}
				function insertDragbar(
					ord //{{{
				) {
					return dragDiv(ord, hdep++).addClass('jcrop-dragbar')
				}
				//}}}
				function createDragbars(
					li //{{{
				) {
					var i
					for (i = 0; i < li.length; i++) {
						dragbar[li[i]] = insertDragbar(li[i])
					}
				}
				//}}}
				function createBorders(
					li //{{{
				) {
					var cl, i
					for (i = 0; i < li.length; i++) {
						switch (li[i]) {
							case 'n':
								cl = 'hline'
								break
							case 's':
								cl = 'hline bottom'
								break
							case 'e':
								cl = 'vline right'
								break
							case 'w':
								cl = 'vline'
								break
						}
						borders[li[i]] = insertBorder(cl)
					}
				}
				//}}}
				function createHandles(
					li //{{{
				) {
					var i
					for (i = 0; i < li.length; i++) {
						handle[li[i]] = insertHandle(li[i])
					}
				}
				//}}}
				function moveto(
					x,
					y //{{{
				) {
					if (!options.shade) {
						$img2.css({
							top: px(-y),
							left: px(-x),
						})
					}
					$sel.css({
						top: px(y),
						left: px(x),
					})
				}
				//}}}
				function resize(
					w,
					h //{{{
				) {
					$sel.width(Math.round(w)).height(Math.round(h))
				}
				//}}}
				function refresh() {
					//{{{
					var c = Coords.getFixed()

					Coords.setPressed([c.x, c.y])
					Coords.setCurrent([c.x2, c.y2])

					updateVisible()
				}
				//}}}

				// Internal Methods
				function updateVisible(
					select //{{{
				) {
					if (awake) {
						return update(select)
					}
				}
				//}}}
				function update(
					select //{{{
				) {
					var c = Coords.getFixed()

					resize(c.w, c.h)
					moveto(c.x, c.y)
					if (options.shade) Shade.updateRaw(c)

					awake || show()

					if (select) {
						options.onSelect.call(api, unscale(c))
					} else {
						options.onChange.call(api, unscale(c))
					}
				}
				//}}}
				function setBgOpacity(
					opacity,
					force,
					now //{{{
				) {
					if (!awake && !force) return
					if (options.bgFade && !now) {
						$img.animate(
							{
								opacity: opacity,
							},
							{
								queue: false,
								duration: options.fadeTime,
							}
						)
					} else {
						$img.css('opacity', opacity)
					}
				}
				//}}}
				function show() {
					//{{{
					$sel.show()

					if (options.shade) Shade.opacity(bgopacity)
					else setBgOpacity(bgopacity, true)

					awake = true
				}
				//}}}
				function release() {
					//{{{
					disableHandles()
					$sel.hide()

					if (options.shade) Shade.opacity(1)
					else setBgOpacity(1)

					awake = false
					options.onRelease.call(api)
				}
				//}}}
				function showHandles() {
					//{{{
					if (seehandles) {
						$hdl_holder.show()
					}
				}
				//}}}
				function enableHandles() {
					//{{{
					seehandles = true
					if (options.allowResize) {
						$hdl_holder.show()
						return true
					}
				}
				//}}}
				function disableHandles() {
					//{{{
					seehandles = false
					$hdl_holder.hide()
				}
				//}}}
				function animMode(
					v //{{{
				) {
					if (v) {
						animating = true
						disableHandles()
					} else {
						animating = false
						enableHandles()
					}
				}
				//}}}
				function done() {
					//{{{
					animMode(false)
					refresh()
				}
				//}}}
				// Insert draggable elements {{{
				// Insert border divs for outline

				if (options.dragEdges && $.isArray(options.createDragbars))
					createDragbars(options.createDragbars)

				if ($.isArray(options.createHandles))
					createHandles(options.createHandles)

				if (options.drawBorders && $.isArray(options.createBorders))
					createBorders(options.createBorders)

				//}}}

				// This is a hack for iOS5 to support drag/move touch functionality
				$(document).bind('touchstart.jcrop-ios', function(e) {
					if ($(e.currentTarget).hasClass('jcrop-tracker')) e.stopPropagation()
				})

				var $track = newTracker().mousedown(createDragger('move')).css({
					cursor: 'move',
					position: 'absolute',
					zIndex: 360,
				})

				if (Touch.support) {
					$track.bind('touchstart.jcrop', Touch.createDragger('move'))
				}

				$img_holder.append($track)
				disableHandles()

				return {
					updateVisible: updateVisible,
					update: update,
					release: release,
					refresh: refresh,
					isAwake: function() {
						return awake
					},
					setCursor: function(cursor) {
						$track.css('cursor', cursor)
					},
					enableHandles: enableHandles,
					enableOnly: function() {
						seehandles = true
					},
					showHandles: showHandles,
					disableHandles: disableHandles,
					animMode: animMode,
					setBgOpacity: setBgOpacity,
					done: done,
				}
			})()

			//}}}
			// Tracker Module {{{
			var Tracker = (function() {
				var onMove = function() {},
					onDone = function() {},
					trackDoc = options.trackDocument

				function toFront(
					touch //{{{
				) {
					$trk.css({
						zIndex: 450,
					})

					if (touch)
						$(document)
							.bind('touchmove.jcrop', trackTouchMove)
							.bind('touchend.jcrop', trackTouchEnd)
					else if (trackDoc)
						$(document)
							.bind('mousemove.jcrop', trackMove)
							.bind('mouseup.jcrop', trackUp)
				}
				//}}}
				function toBack() {
					//{{{
					$trk.css({
						zIndex: 290,
					})
					$(document).unbind('.jcrop')
				}
				//}}}
				function trackMove(
					e //{{{
				) {
					onMove(mouseAbs(e))
					return false
				}
				//}}}
				function trackUp(
					e //{{{
				) {
					e.preventDefault()
					e.stopPropagation()

					if (btndown) {
						btndown = false

						onDone(mouseAbs(e))

						if (Selection.isAwake()) {
							options.onSelect.call(api, unscale(Coords.getFixed()))
						}

						toBack()
						onMove = function() {}
						onDone = function() {}
					}

					return false
				}
				//}}}
				function activateHandlers(
					move,
					done,
					touch //{{{
				) {
					btndown = true
					onMove = move
					onDone = done
					toFront(touch)
					return false
				}
				//}}}
				function trackTouchMove(
					e //{{{
				) {
					onMove(mouseAbs(Touch.cfilter(e)))
					return false
				}
				//}}}
				function trackTouchEnd(
					e //{{{
				) {
					return trackUp(Touch.cfilter(e))
				}
				//}}}
				function setCursor(
					t //{{{
				) {
					$trk.css('cursor', t)
				}
				//}}}

				if (!trackDoc) {
					$trk.mousemove(trackMove).mouseup(trackUp).mouseout(trackUp)
				}

				$img.before($trk)
				return {
					activateHandlers: activateHandlers,
					setCursor: setCursor,
				}
			})()
			//}}}
			// KeyManager Module {{{
			var KeyManager = (function() {
				var $keymgr = $('<input type="radio" />')
					.css({
						position: 'fixed',
						left: '-120px',
						width: '12px',
					})
					.addClass('jcrop-keymgr'),
					$keywrap = $('<div />')
						.css({
							position: 'absolute',
							overflow: 'hidden',
						})
						.append($keymgr)

				function watchKeys() {
					//{{{
					if (options.keySupport) {
						$keymgr.show()
						$keymgr.focus()
					}
				}
				//}}}
				function onBlur(
					e //{{{
				) {
					$keymgr.hide()
				}
				//}}}
				function doNudge(
					e,
					x,
					y //{{{
				) {
					if (options.allowMove) {
						Coords.moveOffset([x, y])
						Selection.updateVisible(true)
					}
					e.preventDefault()
					e.stopPropagation()
				}
				//}}}
				function parseKey(
					e //{{{
				) {
					if (e.ctrlKey || e.metaKey) {
						return true
					}
					shift_down = e.shiftKey ? true : false
					var nudge = shift_down ? 10 : 1

					switch (e.keyCode) {
						case 37:
							doNudge(e, -nudge, 0)
							break
						case 39:
							doNudge(e, nudge, 0)
							break
						case 38:
							doNudge(e, 0, -nudge)
							break
						case 40:
							doNudge(e, 0, nudge)
							break
						case 27:
							if (options.allowSelect) Selection.release()
							break
						case 9:
							return true
					}

					return false
				}
				//}}}

				if (options.keySupport) {
					$keymgr.keydown(parseKey).blur(onBlur)
					if (ie6mode || !options.fixedSupport) {
						$keymgr.css({
							position: 'absolute',
							left: '-20px',
						})
						$keywrap.append($keymgr).insertBefore($img)
					} else {
						$keymgr.insertBefore($img)
					}
				}

				return {
					watchKeys: watchKeys,
				}
			})()
			//}}}
			// }}}
			// API methods {{{
			function setClass(
				cname //{{{
			) {
				$div.removeClass().addClass(cssClass('holder')).addClass(cname)
			}
			//}}}
			function animateTo(
				a,
				callback //{{{
			) {
				var x1 = a[0] / xscale,
					y1 = a[1] / yscale,
					x2 = a[2] / xscale,
					y2 = a[3] / yscale

				if (animating) {
					return
				}

				var animto = Coords.flipCoords(x1, y1, x2, y2),
					c = Coords.getFixed(),
					initcr = [c.x, c.y, c.x2, c.y2],
					animat = initcr,
					interv = options.animationDelay,
					ix1 = animto[0] - initcr[0],
					iy1 = animto[1] - initcr[1],
					ix2 = animto[2] - initcr[2],
					iy2 = animto[3] - initcr[3],
					pcent = 0,
					velocity = options.swingSpeed

				x1 = animat[0]
				y1 = animat[1]
				x2 = animat[2]
				y2 = animat[3]

				Selection.animMode(true)
				var anim_timer

				function queueAnimator() {
					window.setTimeout(animator, interv)
				}
				var animator = (function() {
					return function() {
						pcent += (100 - pcent) / velocity

						animat[0] = Math.round(x1 + pcent / 100 * ix1)
						animat[1] = Math.round(y1 + pcent / 100 * iy1)
						animat[2] = Math.round(x2 + pcent / 100 * ix2)
						animat[3] = Math.round(y2 + pcent / 100 * iy2)

						if (pcent >= 99.8) {
							pcent = 100
						}
						if (pcent < 100) {
							setSelectRaw(animat)
							queueAnimator()
						} else {
							Selection.done()
							Selection.animMode(false)
							if (typeof callback === 'function') {
								callback.call(api)
							}
						}
					}
				})()
				queueAnimator()
			}
			//}}}
			function setSelect(
				rect //{{{
			) {
				setSelectRaw([
					rect[0] / xscale,
					rect[1] / yscale,
					rect[2] / xscale,
					rect[3] / yscale,
				])
				options.onSelect.call(api, unscale(Coords.getFixed()))
				Selection.enableHandles()
			}
			//}}}
			function setSelectRaw(
				l //{{{
			) {
				Coords.setPressed([l[0], l[1]])
				Coords.setCurrent([l[2], l[3]])
				Selection.update()
			}
			//}}}
			function tellSelect() {
				//{{{
				return unscale(Coords.getFixed())
			}
			//}}}
			function tellScaled() {
				//{{{
				return Coords.getFixed()
			}
			//}}}
			function setOptionsNew(
				opt //{{{
			) {
				setOptions(opt)
				interfaceUpdate()
			}
			//}}}
			function disableCrop() {
				//{{{
				options.disabled = true
				Selection.disableHandles()
				Selection.setCursor('default')
				Tracker.setCursor('default')
			}
			//}}}
			function enableCrop() {
				//{{{
				options.disabled = false
				interfaceUpdate()
			}
			//}}}
			function cancelCrop() {
				//{{{
				Selection.done()
				Tracker.activateHandlers(null, null)
			}
			//}}}
			function destroy() {
				//{{{
				$div.remove()
				$origimg.show()
				$origimg.css('visibility', 'visible')
				$(obj).removeData('Jcrop')
			}
			//}}}
			function setImage(
				src,
				callback //{{{
			) {
				Selection.release()
				disableCrop()
				var img = new Image()
				img.onload = function() {
					var iw = img.width
					var ih = img.height
					var bw = options.boxWidth
					var bh = options.boxHeight
					$img.width(iw).height(ih)
					$img.attr('src', src)
					$img2.attr('src', src)
					presize($img, bw, bh)
					boundx = $img.width()
					boundy = $img.height()
					$img2.width(boundx).height(boundy)
					$trk.width(boundx + bound * 2).height(boundy + bound * 2)
					$div.width(boundx).height(boundy)
					Shade.resize(boundx, boundy)
					enableCrop()

					if (typeof callback === 'function') {
						callback.call(api)
					}
				}
				img.src = src
			}
			//}}}
			function colorChangeMacro($obj, color, now) {
				var mycolor = color || options.bgColor
				if (options.bgFade && supportsColorFade() && options.fadeTime && !now) {
					$obj.animate(
						{
							backgroundColor: mycolor,
						},
						{
							queue: false,
							duration: options.fadeTime,
						}
					)
				} else {
					$obj.css('backgroundColor', mycolor)
				}
			}
			function interfaceUpdate(
				alt //{{{ // This method tweaks the interface based on options object.
			) // Called when options are changed and at end of initialization.
			{
				if (options.allowResize) {
					if (alt) {
						Selection.enableOnly()
					} else {
						Selection.enableHandles()
					}
				} else {
					Selection.disableHandles()
				}

				Tracker.setCursor(options.allowSelect ? 'crosshair' : 'default')
				Selection.setCursor(options.allowMove ? 'move' : 'default')

				if (options.hasOwnProperty('trueSize')) {
					xscale = options.trueSize[0] / boundx
					yscale = options.trueSize[1] / boundy
				}

				if (options.hasOwnProperty('setSelect')) {
					setSelect(options.setSelect)
					Selection.done()
					delete options.setSelect
				}

				Shade.refresh()

				if (options.bgColor != bgcolor) {
					colorChangeMacro(
						options.shade ? Shade.getShades() : $div,
						options.shade
							? options.shadeColor || options.bgColor
							: options.bgColor
					)
					bgcolor = options.bgColor
				}

				if (bgopacity != options.bgOpacity) {
					bgopacity = options.bgOpacity
					if (options.shade) Shade.refresh()
					else Selection.setBgOpacity(bgopacity)
				}

				xlimit = options.maxSize[0] || 0
				ylimit = options.maxSize[1] || 0
				xmin = options.minSize[0] || 0
				ymin = options.minSize[1] || 0

				if (options.hasOwnProperty('outerImage')) {
					$img.attr('src', options.outerImage)
					delete options.outerImage
				}

				Selection.refresh()
			}
			//}}}
			//}}}

			if (Touch.support) $trk.bind('touchstart.jcrop', Touch.newSelection)

			$hdl_holder.hide()
			interfaceUpdate(true)

			var api = {
				setImage: setImage,
				animateTo: animateTo,
				setSelect: setSelect,
				setOptions: setOptionsNew,
				tellSelect: tellSelect,
				tellScaled: tellScaled,
				setClass: setClass,

				disable: disableCrop,
				enable: enableCrop,
				cancel: cancelCrop,
				release: Selection.release,
				destroy: destroy,

				focus: KeyManager.watchKeys,

				getBounds: function() {
					return [boundx * xscale, boundy * yscale]
				},
				getWidgetSize: function() {
					return [boundx, boundy]
				},
				getScaleFactor: function() {
					return [xscale, yscale]
				},
				getOptions: function() {
					// careful: internal values are returned
					return options
				},

				ui: {
					holder: $div,
					selection: $sel,
				},
			}

			if (is_msie)
				$div.bind('selectstart', function() {
					return false
				})

			$origimg.data('Jcrop', api)
			return api
		}

		$.fn.Jcrop = function(
			options,
			callback //{{{
		) {
			var api
			// Iterate over each object, attach Jcrop
			this.each(function() {
				// If we've already attached to this object
				if ($(this).data('Jcrop')) {
					// The API can be requested this way (undocumented)
					if (options === 'api') return $(this).data('Jcrop')
					else
						// Otherwise, we just reset the options...
						$(this).data('Jcrop').setOptions(options)
				} else {
					// If we haven't been attached, preload and attach
					if (this.tagName == 'IMG')
						$.Jcrop.Loader(this, function() {
							$(this).css({ display: 'block', visibility: 'hidden' })
							api = $.Jcrop(this, options)
							if ($.isFunction(callback)) callback.call(api)
						})
					else {
						$(this).css({ display: 'block', visibility: 'hidden' })
						api = $.Jcrop(this, options)
						if ($.isFunction(callback)) callback.call(api)
					}
				}
			})

			// Return "this" so the object is chainable (jQuery-style)
			return this
		}
		//}}}
		// $.Jcrop.Loader - basic image loader {{{

		$.Jcrop.Loader = function(imgobj, success, error) {
			var $img = $(imgobj), img = $img[0]

			function completeCheck() {
				if (img.complete) {
					$img.unbind('.jcloader')
					if ($.isFunction(success)) success.call(img)
				} else window.setTimeout(completeCheck, 50)
			}

			$img
				.bind('load.jcloader', completeCheck)
				.bind('error.jcloader', function(e) {
					$img.unbind('.jcloader')
					if ($.isFunction(error)) error.call(img)
				})

			if (img.complete && $.isFunction(success)) {
				$img.unbind('.jcloader')
				success.call(img)
			}
		}

		//}}}
		// Global Defaults {{{
		$.Jcrop.defaults = {
			// Basic Settings
			allowSelect: true,
			allowMove: true,
			allowResize: true,

			trackDocument: true,

			// Styling Options
			baseClass: 'jcrop',
			addClass: null,
			bgColor: 'black',
			bgOpacity: 0.6,
			bgFade: false,
			borderOpacity: 0.4,
			handleOpacity: 0.5,
			handleSize: null,

			aspectRatio: 0,
			keySupport: true,
			createHandles: ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'],
			createDragbars: ['n', 's', 'e', 'w'],
			createBorders: ['n', 's', 'e', 'w'],
			drawBorders: true,
			dragEdges: true,
			fixedSupport: true,
			touchSupport: null,

			shade: null,

			boxWidth: 0,
			boxHeight: 0,
			boundary: 2,
			fadeTime: 400,
			animationDelay: 20,
			swingSpeed: 3,

			minSelect: [0, 0],
			maxSize: [0, 0],
			minSize: [0, 0],

			// Callbacks / Event Handlers
			onChange: function() {},
			onSelect: function() {},
			onDblClick: function() {},
			onRelease: function() {},
		}

		// }}}
	})(jQuery)
	return $
})

define('$plugin!naturalWidth', ['$'], function($) {
	var jQuery = $
	// jQuery.naturalWidth / jQuery.naturalHeight plugin for (already-loaded) images

	// Triple-licensed: Public Domain, MIT and WTFPL license - share and enjoy!
	;(function($) {
		function img(url) {
			var i = new Image()
			i.src = url
			return i
		}

		if ('naturalWidth' in new Image()) {
			$.fn.naturalWidth = function() {
				return this[0].naturalWidth || img($(this).attr('src')).width
			}
			$.fn.naturalHeight = function() {
				return this[0].naturalHeight || img($(this).attr('src')).height
			}
			return
		}

		$.fn.naturalWidth = function() {
			return img($(this).attr('src')).width
		}
		$.fn.naturalHeight = function() {
			return img($(this).attr('src')).height
		}
	})(jQuery)
	return $
})

define('$plugin!throttle-debounce', ['$'], function($) {
	var jQuery = $
	/*!
 * jQuery throttle / debounce - v1.1 - 3/7/2010
 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
 *
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */

	// Script: jQuery throttle / debounce: Sometimes, less is more!
	//
	// *Version: 1.1, Last updated: 3/7/2010*
	//
	// Project Home - http://benalman.com/projects/jquery-throttle-debounce-plugin/
	// GitHub       - http://github.com/cowboy/jquery-throttle-debounce/
	// Source       - http://github.com/cowboy/jquery-throttle-debounce/raw/master/jquery.ba-throttle-debounce.js
	// (Minified)   - http://github.com/cowboy/jquery-throttle-debounce/raw/master/jquery.ba-throttle-debounce.min.js (0.7kb)
	//
	// About: License
	//
	// Copyright (c) 2010 "Cowboy" Ben Alman,
	// Dual licensed under the MIT and GPL licenses.
	// http://benalman.com/about/license/
	//
	// About: Examples
	//
	// These working examples, complete with fully commented code, illustrate a few
	// ways in which this plugin can be used.
	//
	// Throttle - http://benalman.com/code/projects/jquery-throttle-debounce/examples/throttle/
	// Debounce - http://benalman.com/code/projects/jquery-throttle-debounce/examples/debounce/
	//
	// About: Support and Testing
	//
	// Information about what version or versions of jQuery this plugin has been
	// tested with, what browsers it has been tested in, and where the unit tests
	// reside (so you can test it yourself).
	//
	// jQuery Versions - none, 1.3.2, 1.4.2
	// Browsers Tested - Internet Explorer 6-8, Firefox 2-3.6, Safari 3-4, Chrome 4-5, Opera 9.6-10.1.
	// Unit Tests      - http://benalman.com/code/projects/jquery-throttle-debounce/unit/
	//
	// About: Release History
	//
	// 1.1 - (3/7/2010) Fixed a bug in <jQuery.throttle> where trailing callbacks
	//       executed later than they should. Reworked a fair amount of internal
	//       logic as well.
	// 1.0 - (3/6/2010) Initial release as a stand-alone project. Migrated over
	//       from jquery-misc repo v0.4 to jquery-throttle repo v1.0, added the
	//       no_trailing throttle parameter and debounce functionality.
	//
	// Topic: Note for non-jQuery users
	//
	// jQuery isn't actually required for this plugin, because nothing internal
	// uses any jQuery methods or properties. jQuery is just used as a namespace
	// under which these methods can exist.
	//
	// Since jQuery isn't actually required for this plugin, if jQuery doesn't exist
	// when this plugin is loaded, the method described below will be created in
	// the `Cowboy` namespace. Usage will be exactly the same, but instead of
	// $.method() or jQuery.method(), you'll need to use Cowboy.method().
	;(function(window, undefined) {
		'$:nomunge' // Used by YUI compressor.
		// Since jQuery really isn't required for this plugin, use `jQuery` as the
		// namespace only if it already exists, otherwise use the `Cowboy` namespace,
		// creating it if necessary.
		var $ = window.jQuery || window.Cowboy || (window.Cowboy = {}),
			// Internal method reference.
			jq_throttle

		// Method: jQuery.throttle
		//
		// Throttle execution of a function. Especially useful for rate limiting
		// execution of handlers on events like resize and scroll. If you want to
		// rate-limit execution of a function to a single time, see the
		// <jQuery.debounce> method.
		//
		// In this visualization, | is a throttled-function call and X is the actual
		// callback execution:
		//
		// > Throttled with `no_trailing` specified as false or unspecified:
		// > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
		// > X    X    X    X    X    X        X    X    X    X    X    X
		// >
		// > Throttled with `no_trailing` specified as true:
		// > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
		// > X    X    X    X    X             X    X    X    X    X
		//
		// Usage:
		//
		// > var throttled = jQuery.throttle( delay, [ no_trailing, ] callback );
		// >
		// > jQuery('selector').bind( 'someevent', throttled );
		// > jQuery('selector').unbind( 'someevent', throttled );
		//
		// This also works in jQuery 1.4+:
		//
		// > jQuery('selector').bind( 'someevent', jQuery.throttle( delay, [ no_trailing, ] callback ) );
		// > jQuery('selector').unbind( 'someevent', callback );
		//
		// Arguments:
		//
		//  delay - (Number) A zero-or-greater delay in milliseconds. For event
		//    callbacks, values around 100 or 250 (or even higher) are most useful.
		//  no_trailing - (Boolean) Optional, defaults to false. If no_trailing is
		//    true, callback will only execute every `delay` milliseconds while the
		//    throttled-function is being called. If no_trailing is false or
		//    unspecified, callback will be executed one final time after the last
		//    throttled-function call. (After the throttled-function has not been
		//    called for `delay` milliseconds, the internal counter is reset)
		//  callback - (Function) A function to be executed after delay milliseconds.
		//    The `this` context and all arguments are passed through, as-is, to
		//    `callback` when the throttled-function is executed.
		//
		// Returns:
		//
		//  (Function) A new, throttled, function.

		$.throttle = jq_throttle = function(
			delay,
			no_trailing,
			callback,
			debounce_mode
		) {
			// After wrapper has stopped being called, this timeout ensures that
			// `callback` is executed at the proper times in `throttle` and `end`
			// debounce modes.
			var timeout_id,
				// Keep track of the last time `callback` was executed.
				last_exec = 0

			// `no_trailing` defaults to falsy.
			if (typeof no_trailing !== 'boolean') {
				debounce_mode = callback
				callback = no_trailing
				no_trailing = undefined
			}

			// The `wrapper` function encapsulates all of the throttling / debouncing
			// functionality and when executed will limit the rate at which `callback`
			// is executed.
			function wrapper() {
				var that = this, elapsed = +new Date() - last_exec, args = arguments

				// Execute `callback` and update the `last_exec` timestamp.
				function exec() {
					last_exec = +new Date()
					callback.apply(that, args)
				}

				// If `debounce_mode` is true (at_begin) this is used to clear the flag
				// to allow future `callback` executions.
				function clear() {
					timeout_id = undefined
				}

				if (debounce_mode && !timeout_id) {
					// Since `wrapper` is being called for the first time and
					// `debounce_mode` is true (at_begin), execute `callback`.
					exec()
				}

				// Clear any existing timeout.
				timeout_id && clearTimeout(timeout_id)

				if (debounce_mode === undefined && elapsed > delay) {
					// In throttle mode, if `delay` time has been exceeded, execute
					// `callback`.
					exec()
				} else if (no_trailing !== true) {
					// In trailing throttle mode, since `delay` time has not been
					// exceeded, schedule `callback` to execute `delay` ms after most
					// recent execution.
					//
					// If `debounce_mode` is true (at_begin), schedule `clear` to execute
					// after `delay` ms.
					//
					// If `debounce_mode` is false (at end), schedule `callback` to
					// execute after `delay` ms.
					timeout_id = setTimeout(
						debounce_mode ? clear : exec,
						debounce_mode === undefined ? delay - elapsed : delay
					)
				}
			}

			// Set the guid of `wrapper` function to the same of original callback, so
			// it can be removed in jQuery 1.4+ .unbind or .die by using the original
			// callback as a reference.
			if ($.guid) {
				wrapper.guid = callback.guid = callback.guid || $.guid++
			}

			// Return the wrapper function.
			return wrapper
		}

		// Method: jQuery.debounce
		//
		// Debounce execution of a function. Debouncing, unlike throttling,
		// guarantees that a function is only executed a single time, either at the
		// very beginning of a series of calls, or at the very end. If you want to
		// simply rate-limit execution of a function, see the <jQuery.throttle>
		// method.
		//
		// In this visualization, | is a debounced-function call and X is the actual
		// callback execution:
		//
		// > Debounced with `at_begin` specified as false or unspecified:
		// > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
		// >                          X                                 X
		// >
		// > Debounced with `at_begin` specified as true:
		// > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
		// > X                                 X
		//
		// Usage:
		//
		// > var debounced = jQuery.debounce( delay, [ at_begin, ] callback );
		// >
		// > jQuery('selector').bind( 'someevent', debounced );
		// > jQuery('selector').unbind( 'someevent', debounced );
		//
		// This also works in jQuery 1.4+:
		//
		// > jQuery('selector').bind( 'someevent', jQuery.debounce( delay, [ at_begin, ] callback ) );
		// > jQuery('selector').unbind( 'someevent', callback );
		//
		// Arguments:
		//
		//  delay - (Number) A zero-or-greater delay in milliseconds. For event
		//    callbacks, values around 100 or 250 (or even higher) are most useful.
		//  at_begin - (Boolean) Optional, defaults to false. If at_begin is false or
		//    unspecified, callback will only be executed `delay` milliseconds after
		//    the last debounced-function call. If at_begin is true, callback will be
		//    executed only at the first debounced-function call. (After the
		//    throttled-function has not been called for `delay` milliseconds, the
		//    internal counter is reset)
		//  callback - (Function) A function to be executed after delay milliseconds.
		//    The `this` context and all arguments are passed through, as-is, to
		//    `callback` when the debounced-function is executed.
		//
		// Returns:
		//
		//  (Function) A new, debounced, function.

		$.debounce = function(delay, at_begin, callback) {
			return callback === undefined
				? jq_throttle(delay, at_begin, false)
				: jq_throttle(delay, callback, at_begin !== false)
		}
	})(this)
	return $
})

define('$plugin!imagesloaded', ['$'], function($) {
	var jQuery = $
	/*!
 * jQuery imagesLoaded plugin v2.1.0
 * http://github.com/desandro/imagesloaded
 *
 * MIT License. by Paul Irish et al.
 */

	/*jshint curly: true, eqeqeq: true, noempty: true, strict: true, undef: true, browser: true */
	/*global jQuery: false */
	;(function($, undefined) {
		// blank image data-uri bypasses webkit log warning (thx doug jones)
		var BLANK =
			'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

		$.fn.imagesLoaded = function(callback) {
			var $this = this,
				deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
				hasNotify = $.isFunction(deferred.notify),
				$images = $this.find('img').add($this.filter('img')),
				loaded = [],
				proper = [],
				broken = []

			// Register deferred callbacks
			if ($.isPlainObject(callback)) {
				$.each(callback, function(key, value) {
					if (key === 'callback') {
						callback = value
					} else if (deferred) {
						deferred[key](value)
					}
				})
			}

			function doneLoading() {
				var $proper = $(proper), $broken = $(broken)

				if (deferred) {
					if (broken.length) {
						deferred.reject($images, $proper, $broken)
					} else {
						deferred.resolve($images)
					}
				}

				if ($.isFunction(callback)) {
					callback.call($this, $images, $proper, $broken)
				}
			}

			function imgLoaded(img, isBroken) {
				// don't proceed if BLANK image, or image is already loaded
				if (img.src === BLANK || $.inArray(img, loaded) !== -1) {
					return
				}

				// store element in loaded images array
				loaded.push(img)

				// keep track of broken and properly loaded images
				if (isBroken) {
					broken.push(img)
				} else {
					proper.push(img)
				}

				// cache image and its state for future calls
				$.data(img, 'imagesLoaded', { isBroken: isBroken, src: img.src })

				// trigger deferred progress method if present
				if (hasNotify) {
					deferred.notifyWith($(img), [isBroken, $images, $(proper), $(broken)])
				}

				// call doneLoading and clean listeners if all images are loaded
				if ($images.length === loaded.length) {
					setTimeout(doneLoading)
					$images.unbind('.imagesLoaded')
				}
			}

			// if no images, trigger immediately
			if (!$images.length) {
				doneLoading()
			} else {
				$images
					.bind('load.imagesLoaded error.imagesLoaded', function(event) {
						// trigger imgLoaded
						imgLoaded(event.target, event.type === 'error')
					})
					.each(function(i, el) {
						var src = el.src

						// find out if this image has been already checked for status
						// if it was, and src has not changed, call imgLoaded on it
						var cached = $.data(el, 'imagesLoaded')
						if (cached && cached.src === src) {
							imgLoaded(el, cached.isBroken)
							return
						}

						// if complete is true and browser supports natural sizes, try
						// to check for image status manually
						if (el.complete && el.naturalWidth !== undefined) {
							imgLoaded(el, el.naturalWidth === 0 || el.naturalHeight === 0)
							return
						}

						// cached images don't fire load sometimes, so we reset src, but only when
						// dealing with IE, or image is complete (loaded) and failed manual check
						// webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
						if (el.readyState || el.complete) {
							el.src = BLANK
							el.src = src
						}
					})
			}

			return deferred ? deferred.promise($this) : $this
		}
	})(jQuery)
	return $
})

/**
 *		`new CropImage($el, options, coordinates)`
 *
 *		$el // the <.jcrop> container
 *		options // {} to override default jcrop options
 *			aspectRatio : auto  //   automatically sets aspectRatio to default rectangle
 *		coordinates // {} to override default first time coordinates // note self <inputs> for coords override all else
 */

define(
	'admin/modules/CropImage',
	[
		'rosy/base/DOMClass',
		'$',
		'$plugin!jcrop',
		'$plugin!naturalWidth',
		'$plugin!throttle-debounce',
		'$plugin!imagesloaded',
	],
	function(DOMClass, $, $jcrop, $naturalWidth, $throttle, $imagesLoaded) {
		var $win = $(window),
			EVENTS = {
				COMPLETE: 'cropimage:complete',
			}

		return DOMClass.extend({
			static: EVENTS,

			options: {
				// initial options, override with `new CropImage(el, options, coordinates)`
				aspectRatio: 0,
			},

			$: null,
			$win: $(window),
			$img: null,
			$preview: null,
			_jcrop: null,
			cropScale: null, // { w : 100, h: 100} // special case for scaling the resulting crop to a specified size in the preview

			init: function($el, options, extra) {
				this.sup()

				this.$ = $el
				this.$img = this.$.find('.original')
				this.$preview = this.$.find('.preview')
				this.$thumb = this.$preview.find('.thumb')
				this.options = options

				this.$img.imagesLoaded(this.onReady)
			},

			onReady: function() {
				this.setConstraints()
				this.setupPreview()
				this.setupJcrop()
			},

			setupJcrop: function() {
				var self = this,
					options = $.extend({}, this.options, {
						onSelect: $.proxy(this.updatePreview, this),
						onChange: $.proxy(this.updatePreview, this),
						aspectRatio: this.constrainRatio
							? this.cropScale.w / this.cropScale.h
							: 0,
						allowSelect: this.constrainRatio ? true : false,
						boxWidth: this.$.width() * 0.75,
						minSize: [20, 20],
					})

				if (this._jcrop) {
					this._jcrop.destroy()
				}

				this.$img.Jcrop(options, function() {
					self._jcrop = this
					self.onJCropReady()
				})
			},

			onJCropReady: function() {
				this.setInitialCroparea()
			},

			setConstraints: function() {
				var data = this.$preview.data()

				this.constrainHeight = data.scaleH === 'None' ? false : true
				this.constrainWidth = data.scaleW === 'None' ? false : true
				this.constrainRatio = this.constrainHeight && this.constrainWidth

				// set aspect ratio for crop;
				// also defines .mask box size
				this.cropScale = {
					w: this.constrainWidth ? data.scaleW : this.$img.naturalWidth(),
					h: this.constrainHeight ? data.scaleH : this.$img.naturalHeight(),
				}
			},

			setupPreview: function() {
				this.$preview
					.find('.mask')
					.css({
						width: this.cropScale.w,
						height: this.cropScale.h,
					})
					.addClass('active')

				if (this.constrainRatio) {
					this.$preview
						.find('strong')
						.text(this.cropScale.w + ' x ' + this.cropScale.h)
				}
			},

			updatePreview: function(coords) {
				clearTimeout(this.refreshTimeout)

				if (parseInt(coords.w, 10) < 0) {
					return
				}

				this.cropCoords = coords

				var scale = this.getScale(), width, height

				if (!this.constrainRatio) {
					if (this.constrainHeight) {
						// update preview width
						width = Math.round(scale.scaleY * coords.w)

						this.$preview
							.find('.mask')
							.css({
								width: width + 'px',
							})
							.end()
							.find('strong')
							.text(width + ' x ' + this.cropScale.h)
					} else if (this.constrainWidth) {
						// update preview height
						height = Math.round(scale.scaleX * coords.h)

						this.$preview
							.find('.mask')
							.css({
								height: height + 'px',
							})
							.end()
							.find('strong')
							.text(this.cropScale.w + ' x ' + height)
					} else {
						// update preview height and width
						height = Math.round(scale.scaleY * coords.h)
						width = Math.round(scale.scaleX * coords.w)

						this.$preview
							.find('.mask')
							.css({
								width: width + 'px',
								height: height + 'px',
							})
							.end()
							.find('strong')
							.text(width + ' x ' + height)
					}
				}

				// update preview img
				this.$thumb.css({
					width: Math.round(scale.scaleX * this.$img.naturalWidth()) + 'px',
					height: Math.round(scale.scaleY * this.$img.naturalHeight()) + 'px',
					marginLeft: '-' + Math.round(scale.scaleX * coords.x) + 'px',
					marginTop: '-' + Math.round(scale.scaleY * coords.y) + 'px',
				})

				// debounce update of coord values (form fields) after interaction
				this.refreshTimeout = setTimeout(this.updateCoords, 250)
			},

			getScale: function() {
				var scaleX, scaleY

				if (this.constrainRatio) {
					scaleX = this.cropScale.w / this.cropCoords.w
					scaleY = this.cropScale.h / this.cropCoords.h
				} else {
					if (this.constrainHeight) {
						// set equal scaling ratio (to prevent distortion)
						scaleX = scaleY = this.cropScale.h / this.cropCoords.h
					} else if (this.constrainWidth) {
						scaleX = scaleY = this.cropScale.w / this.cropCoords.w
					} else {
						scaleX = scaleY =
							this.$img.naturalWidth() /
							this.cropCoords.w /
							(this.$img.naturalHeight() / this.cropCoords.h)
					}
				}

				return {
					scaleX: scaleX,
					scaleY: scaleY,
				}
			},

			// store current crop coordinates as field values
			updateCoords: function() {
				this.loopCoordProps(function(prop) {
					var $coord = $("input[data-property='" + prop + "']")

					if ($coord.length) {
						$coord.attr('value', this.cropCoords[prop]) // sync field val
					}
				})
			},

			// iterate over coordinate property keys
			loopCoordProps: function(cb) {
				var props = ['x', 'y', 'x2', 'y2', 'w', 'h'], i = props.length - 1, prop

				for (i; i >= 0; i--) {
					prop = props[i]
					cb.call(this, prop)
				}
			},

			// set initial croparea from ss field values
			setInitialCroparea: function() {
				this.cropCoords = this.cropCoords || {}

				this.loopCoordProps(function(prop) {
					var $coord = $("input[data-property='" + prop + "']")

					if ($coord.length) {
						this.cropCoords[prop] = $coord.val()
					}
				})

				// set jcrop selection
				this._jcrop.setSelect([
					this.cropCoords.x,
					this.cropCoords.y,
					this.cropCoords.x2,
					this.cropCoords.y2,
				])
			},
		})
	}
)

define('admin/modules/AutoSlug', ['rosy/base/DOMClass', '$'], function(
	DOMClass,
	$
) {
	return DOMClass.extend({
		dom: null,
		origin: null,

		init: function(dom) {
			this.dom = dom
			this.origin = dom
				.parents('fieldset')
				.find('[name=' + dom.data('source-fields') + ']')

			if (this.isValueMatch()) {
				this.addListeners()
			}
		},

		getOriginValue: function() {
			return this.origin.val().replace(/\s+/g, '-').toLowerCase()
		},

		isValueMatch: function() {
			var currVal = this.getOriginValue()

			// if values are different, disable matching
			if (currVal !== this.dom.val()) {
				this.origin.addClass('disable-match')

				return false
			}

			return true
		},

		addListeners: function() {
			this.dom.on('keyup', this.disableSync)
			this.origin.not('.disable-match').on('keyup', this.syncValue)
		},

		syncValue: function() {
			var currVal = this.getOriginValue()
			this.dom.val(currVal)
		},

		disableSync: function() {
			if (!this.isValueMatch()) {
				this.origin.addClass('disable-match').add(this.dom).off('keyup')
			}
		},
	})
})

define('admin/modules/BatchActions', ['rosy/base/DOMClass', '$'], function(
	DOMClass,
	$
) {
	return DOMClass.extend({
		init: function(dom) {
			this.ids = []
			this.dom = dom
			this.$actions = dom.find('.batch-action')
			this.$batchCheck = dom.find('.batch-check')
			this.$selectAll = dom.find('.select-all')

			var self = this

			this.$selectAll.on('click', this.selectAll)

			this.$batchCheck
				.on('click', function() {
					self.selectRow($(this).val())
				})
				.filter(':checked')
				.each(function() {
					self.selectRow($(this).val())
				})

			this.$actions.on('click', function(e) {
				if ($(this).hasClass('disabled')) {
					return false
				}
			})

			this.linkCell()
		},

		linkCell: function() {
			this.dom.find('.link-cell').on('click', function() {
				window.location.href = $(this).data('edit-url')
			})
		},

		selectAll: function(e) {
			var self = this

			this.$batchCheck.each(function() {
				var $this = $(this)
				$this.prop('checked', $(e.currentTarget)[0].checked)
				self.selectRow($this.val())
			})
		},

		selectRow: function(id) {
			var idIndex = $.inArray(id, this.ids)

			if (idIndex > -1) {
				this.ids.splice(idIndex, 1)
			} else {
				this.ids.push(id)
			}

			this.updateActionUrl(idIndex)

			if (this.ids.length) {
				this.enableActions()
			} else {
				this.disableActions()
			}
		},

		updateActionUrl: function(index) {
			var self = this

			this.$actions.each(function() {
				var $this = $(this),
					href = $this.attr('href').replace(/(_selected=)[^\&]+/, '$1')
				$this.attr('href', href + self.ids.join(','))
			})
		},

		enableActions: function() {
			this.$actions.removeClass('disabled')
		},

		disableActions: function() {
			this.$actions.addClass('disabled')
			this.$selectAll.prop('checked', false)
		},
	})
})
define(
	'admin/modules/Widgets',
	[
		'require',
		'exports',
		'module',
		'rosy/base/DOMClass',
		'$',
		'$plugin!select2',
		'$plugin!details',
		'./AssetSelect',
		'./ApiSelect',
		'./Formset',
		'./Tabs',
		'./InsertVideo',
		'./InsertImage',
		'./InsertAudio',
		'./InsertAnnotation',
		'./wysiwyg/Wysiwyg',
		'./WidgetEvents',
		'./WindowPopup',
		'./OnExit',
		'./InlineVideo',
		'./FilterBar',
		'./CropImage',
		'./AutoSlug',
		'./BatchActions',
	],
	function(require, exports, module) {
		var DOMClass = require('rosy/base/DOMClass'),
			$ = require('$'),
			jQuerySelect2 = require('$plugin!select2'),
			jQueryDetails = require('$plugin!details'),
			AssetSelect = require('./AssetSelect'),
			ApiSelect = require('./ApiSelect'),
			Formset = require('./Formset'),
			Tabs = require('./Tabs'),
			InsertVideo = require('./InsertVideo'),
			InsertImage = require('./InsertImage'),
			InsertAudio = require('./InsertAudio'),
			InsertAnnotation = require('./InsertAnnotation'),
			Wysiwyg = require('./wysiwyg/Wysiwyg'),
			WidgetEvents = require('./WidgetEvents'),
			WindowPopup = require('./WindowPopup'),
			OnExit = require('./OnExit'),
			InlineVideo = require('./InlineVideo'),
			FilterBar = require('./FilterBar'),
			CropImage = require('./CropImage'),
			AutoSlug = require('./AutoSlug'),
			BatchActions = require('./BatchActions')

		return DOMClass.extend({
			init: function(dom) {
				this.subscribe(WidgetEvents.RENDER, this._render)
			},

			_render: function(n) {
				var dom = $(n.data.dom)

				// this._renderSelect(dom);
				// this._renderFormset(dom);
				// this._renderAssetSelect(dom);
				// this._renderApiSelect(dom);
				// this._renderDatePicker(dom);
				// this._renderDateTimePicker(dom);
				//this._renderWysiwig(dom);
				// this._renderTabs(dom);
				// this._renderInsertVideo(dom);
				// this._renderInsertImage(dom);
				// this._renderInsertAudio(dom);
				// this._renderInlineVideo(dom);
				// this._renderInsertAnnotation(dom);
				//this._renderFilterBar(dom);
				//this._renderjQueryCrop(dom);
				// this._renderDragWidth(dom);

				//this._autoSlug(dom);
				// this._handlePopup(dom);
				//this._handleBatchActions(dom);
			},

			_handleBatchActions: function(dom) {
				dom.find('.list').each(function(i, el) {
					var actions = new BatchActions($(el))
				})
			},

			_renderDateTimePicker: function(dom) {
				dom.find('input.datetime').each(function(i, el) {
					el = $(el)

					// parse date and time from django format
					var dateTimeFormat = el.data('date-format'),
						sliceAt = dateTimeFormat.toLowerCase().indexOf(' h'),
						dateFormat = dateTimeFormat.slice(0, sliceAt),
						timeFormat = dateTimeFormat.slice(sliceAt)

					el.datetimepicker({
						dateFormat: dateFormat,
						timeFormat: timeFormat,
						showButtonPanel: false,
						showSecond: false,
						timeText: 'Time (' + el.data('timezone') + ')',
					})
				})
			},

			// _renderWysiwig : function (dom) {
			// 	dom.find('.widget-wysiwyg').each(function (i, textarea) {
			// 		var wysiwyg = new Wysiwyg($(textarea));
			// 	});
			// },

			_renderDatePicker: function(dom) {
				dom.find('.date').each(function(i, el) {
					el = $(el)

					el.datepicker({
						dateFormat: el.data('date-format'),
						showButtonPanel: false,
					})
				})
			},

			_renderSelect: function(dom) {
				dom.find('select').select2({
					minimumResultsForSearch: 20,
				})

				dom.find('.widget-tags').select2({
					tags: [],
					tokenSeparators: [','],
				})
			},

			_renderFilterBar: function(dom) {
				var filterBarDom = dom.find('.filters')
				var filterBar = new FilterBar(filterBarDom)
			},

			_renderAssetSelect: function(dom) {
				dom.find('.widget-asset').each(function(i, dom) {
					var picker = new AssetSelect($(dom))
				})
			},

			_renderFormset: function(dom) {
				dom.find('.widget-formset').each(function(i, dom) {
					var formset = new Formset($(dom))
				})
			},

			_renderApiSelect: function(dom) {
				dom.find('.api-select').each(function(i, dom) {
					var select = new ApiSelect($(dom))
				})
			},

			_autoSlug: function() {
				$('[data-source-fields]').each(function(i, dom) {
					var autoSlug = new AutoSlug($(dom))
				})
			},

			_handlePopup: function(dom) {
				if (!window.opener) {
					return
				}

				dom.find('.close-popup').click(function(i, dom) {
					window.close()
				})

				dom.find('.widget-popup-data').each(function(i, dom) {
					WindowPopup.respond($(dom).data())
				})
			},

			_renderTabs: function(dom) {
				dom.find('.widget-tabs').each(function(i, el) {
					var tabs = new Tabs($(el))
				})
			},

			_renderInsertVideo: function(dom) {
				dom.find('.widget-insert-video').each(function(i, el) {
					var insertVideo = new InsertVideo({
						$dom: $(el),
					})
				})
			},

			_renderInsertImage: function(dom) {
				dom.find('.widget-insert-image').each(function(i, el) {
					var insertImage = new InsertImage({
						$dom: $(el),
					})
				})
			},

			_renderInsertAudio: function(dom) {
				dom.find('.widget-insert-audio').each(function(i, el) {
					var insertAudio = new InsertAudio({
						$dom: $(el),
					})
				})
			},

			_renderInlineVideo: function(dom) {
				dom.find('.widget-inline-video').each(function(i, el) {
					var vid = new InlineVideo({
						$dom: $(el),
					})
				})
			},

			_renderInsertAnnotation: function(dom) {
				dom.find('.widget-insert-annotation').each(function(i, el) {
					var insertAnnotation = new InsertAnnotation({
						$dom: $(el),
					})
				})
			},

			_renderjQueryCrop: function(dom) {
				dom.find('.jcrop').each(function(i, el) {
					var cropImage = new CropImage(
						$(el),
						{
							aspectRatio: 'auto',
						},
						{}
					) // options, coordinates, extra
					// this.content = new ContentClass(this.$content, options, this.$content.data(), extra);
				})
			},

			_renderDragWidth: function(dom) {
				// maintain draggable td:last-child width on drag
				dom
					.find('[draggable]')
					.on('mousedown', function(i, el) {
						var $el = $(this).find('td:last-child')
						$el.css('width', $el.outerWidth())
					})
					.on('mouseup', function(i, el) {
						$(this).find('td:last-child').css('width', 'auto')
					})
			},
		})
	}
)

/**
 * details-shim.js
 * A pure JavaScript (no dependencies) solution to make HTML5
 *  Details/Summary tags work in unsupportive browsers
 *
 * Copyright (c) 2013 Tyler Uebele
 * Released under the MIT license.  See included LICENSE.txt
 *  or http://opensource.org/licenses/MIT
 *
 * latest version available at https://github.com/tyleruebele/details-shim
 */

/**
 * Enable proper operation of <details> tags in unsupportive browsers
 */

/**
 * Modified for require js
 **/
define('detailsShim', [], function() {
	function details_shim() {
		//Because <details> must include a <summary>,
		// collecting <summary> tags collects *valid* <details> tags
		var Summaries = document.getElementsByTagName('summary')
		for (var i = 0; i < Summaries.length; i++) {
			if (
				!Summaries[i].parentNode ||
				//sanity check, parent node should be a <details> tag
				'details' != Summaries[i].parentNode.tagName.toLowerCase() ||
				//only run in browsers that don't support <details> natively
				'boolean' == typeof Summaries[i].parentNode.open
			) {
				continue
			}

			var Details = Summaries[i].parentNode

			// Prevent repeat processing
			if (Details.hasAttribute('data-open')) {
				continue
			}

			//Set initial class according to `open` attribute
			var state =
				Details.outerHTML ||
				// OR older firefox doesn't have .outerHTML
				new XMLSerializer().serializeToString(Details)
			state = state.substring(0, state.indexOf('>'))
			//Read: There is an open attribute, and it's not explicitly empty
			state = -1 != state.indexOf('open') && -1 == state.indexOf('open=""')
				? 'open'
				: 'closed'
			Details.setAttribute('data-open', state)
			Details.className += ' ' + state

			//Add onclick handler to toggle visibility class
			Summaries[i].addEventListener('click', function() {
				//current state
				var state = this.parentNode.getAttribute('data-open')
				//new state
				state = state == 'open' ? 'closed' : 'open'
				this.parentNode.setAttribute('data-open', state)
				//replace previous open/close class
				this.parentNode.className =
					this.parentNode.className.replace(/\bopen\b|\bclosed\b/g, ' ') +
					' ' +
					state
			})

			//wrap text nodes in span to expose them to css
			for (var j = 0; j < Details.childNodes.length; j++) {
				if (
					Details.childNodes[j].nodeType == 3 &&
					/[^\s]/.test(Details.childNodes[j].data)
				) {
					var span = document.createElement('span')
					var text = Details.childNodes[j]
					Details.insertBefore(span, text)
					Details.removeChild(text)
					span.appendChild(text)
				}
			}
		} // for(Summaries)
	} // details_shim()

	//Run details_shim() when the page loads
	details_shim()
	/*window.addEventListener
		    ? window.addEventListener('load', details_shim, false)
		    : window.attachEvent && window.attachEvent('onload', details_shim);*/
})
define(
	'admin/views/Admin',
	[
		'./Page',
		'$',
		'$ui',
		'$plugin!select2',
		'../modules/Widgets',
		'../modules/WidgetEvents',
		'detailsShim',
	],
	function(Page, $, $ui, jQuerySelect2, Widgets, WidgetEvents, detailsShim) {
		return Page.extend({
			widgets: null,

			init: function() {
				this.sup()

				this.tableDnD()

				// widgets
				this.widgets = new Widgets()
				this.publish(WidgetEvents.RENDER, {
					dom: document,
				})

				this.transitionIn()
			},

			tableDnD: function() {
				$('table').each(function() {
					var draggable = $(this).find('tr[draggable]').parents('tbody')

					draggable.sortable({
						stop: function(e, ui) {
							var inputs = $(ui.item.context.offsetParent).find(':text')

							for (var i = 0; i < inputs.length; i++) {
								inputs[i].value = i + 1
							}
						},
					})
				})
			},

			update: function() {},

			transitionIn: function() {
				this.sup()
			},

			transitionOut: function() {
				this.sup()
			},

			destroy: function() {
				this.sup()
			},
		})
	}
)

define('admin/Site', ['rosy/base/Class', './views/Admin'], function(
	Class,
	Admin
) {
	var Site = Class.extend({
		initialized: false,
		page: null,

		initialize: function() {
			if (!this.initialized) {
				this.initialized = true

				// create Admin page.
				this.page = new Admin()
			}
		},
	})

	return new Site()
})

require.config({
	paths: {
		$: '//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min',
		$ui: 'libs/jquery.ui',
		$plugin: 'libs/plugins/amd/jquery-plugin',
		'$plugin-ui': 'libs/plugins/amd/jquery-ui-plugin',
		wysihtml5: 'libs/wysihtml5',
		text: 'libs/plugins/amd/text',
		rosy: 'libs/rosy/src',
		detailsShim: 'libs/details-shim',
	},

	waitSeconds: 15,

	shim: {
		$: {
			exports: 'jQuery',
		},

		$ui: {
			exports: 'jQueryUi',
			deps: ['$'],
		},

		'zynga/Scroller': {
			exports: 'Scroller',
			deps: ['zynga/Animate'],
		},

		wysihtml5: {
			exports: 'wysihtml5',
		},

		CFInstall: {
			exports: 'CFInstall',
		},

		Handlebars: {
			exports: 'Handlebars',
		},
	},
})

define('config.js', function() {})
