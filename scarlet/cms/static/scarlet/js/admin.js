
define(

	'rosy/utils/Utils',[],function () {

		/*jshint eqeqeq:false, noempty:false, eqnull:true */

		

		function extend(target) {

			var deep, options, name, src, copy, copyIsArray, clone, i, length;

			// Handle case when target is a string or something (possible in deep copy)
			if (typeof target !== "object" && !isFunction(target)) {
				target = {};
			}

			i = isObject(arguments[1]) ? 1 : 2;
			deep = (arguments[1] === true);

			for (length = arguments.length; i < length; i ++) {

				// Only deal with non-null/undefined values
				if ((options = arguments[i]) != null) {

					// Extend the base object
					for (name in options) {

						src = target[name];
						copy = options[name];

						// Prevent never-ending loop
						if (target === copy) {
							continue;
						}

						// Recurse if we're merging plain objects or arrays
						if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {

							if (copyIsArray) {
								copyIsArray = false;
								clone = src && isArray(src) ? src : [];

							}

							else {
								clone = src && isPlainObject(src) ? src : {};
							}

							// Never move original objects, clone them
							target[name] = extend(clone, deep, copy);
						}

						// Don't bring in undefined values
						else if (copy !== undefined) {
							target[name] = copy;
						}
					}
				}
			}

			// Return the modified object
			return target;
		}

		function isObject(obj) {

			var objectTypes = {
				"function": true,
				"object": true,
				"unknown": true
			};

			return obj ? !!objectTypes[typeof obj] : false;
		}

		function isFunction(obj) {
			return typeof obj == "function";
		}

		var isArray = Array.isArray || function (vArg) {
			return Object.prototype.toString.call(vArg) === "[object Array]";
		};

		function isPlainObject(obj) {

			var hasOwn = Object.prototype.hasOwnProperty;

			// Must be an Object.
			// Because of IE, we also have to check the presence of the constructor property.
			// Make sure that DOM nodes and window objects don't pass through, as well
			if (!obj || !isObject(obj) || obj.nodeType || obj === window) {
				return false;
			}

			try {
				// Not own constructor property must be Object
				if (obj.constructor &&
					!hasOwn.call(obj, "constructor") &&
					!hasOwn.call(obj.constructor.prototype, "isPrototypeOf")
				) {
					return false;
				}
			}
			catch (e) {
				// IE8,9 Will throw exceptions on certain host objects #9897
				return false;
			}

			// Own properties are enumerated firstly, so to speed up,
			// if last one is own, then all properties are own.

			var key;
			for (key in obj) {}

			return key === undefined || hasOwn.call(obj, key);
		}

		return {

			extend : extend,
			isArray : isArray,
			isFunction : isFunction,
			isObject : isObject,
			isPlainObject : isPlainObject
		};
	}
);

define(
	'rosy/polyfills/function-bind',[],function () {

		

		if (!Function.prototype.bind) {

			Function.prototype.bind = function (oThis) {
				if (typeof this !== "function") {
					// closest thing possible to the ECMAScript 5 internal IsCallable function
					throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
				}

				var aArgs = Array.prototype.slice.call(arguments, 1),
					fToBind = this,
					FNOP = function () {},
					fBound = function () {
						return fToBind.apply(this instanceof FNOP ? this : oThis || window,
						aArgs.concat(Array.prototype.slice.call(arguments)));
					};

				FNOP.prototype = this.prototype;
				fBound.prototype = new FNOP();
				return fBound;
			};
		}

		return Function.prototype.bind;
	}
);

define(

	'rosy/base/AbstractClass',[
		"../utils/Utils",
		"../polyfills/function-bind"
	],

	function (Utils) {

		

		/*=========================== HELPER FUNCTIONS ===========================*/

		var _createSuperFunction = function (fn, superFn) {
			return function () {
				var r, tmp = this.sup || null;

				// Reference the prototypes method, as super temporarily
				this.sup = superFn;

				r = fn.apply(this, arguments);

				// Reset this.sup
				this.sup = tmp;
				return r;
			};
		};

		/*
		If Function.toString() works as expected, return a regex that checks for `sup()`
		otherwise return a regex that passes everything.
		*/

		var _doesCallSuper = (/xyz/).test(function () {
			var xyz;
			xyz = true;
		}) ? (/\bthis\.sup\b/) : (/.*/);

		/*=========================== END OF HELPER FUNCTIONS ===========================*/

		return (function () {

			/**
			* Allows us to store module id's on Classes for easier debugging, See;
			* https://github.com/jrburke/requirejs/wiki/Internal-API:-onResourceLoad
			**/

			require.onResourceLoad = function (context, map) {
				var module = context.require(map.id);

				if (module && module._isRosyClass) {
					module._moduleID = module.prototype._moduleID = map.id;
				}
			};

			// Setup a dummy constructor for prototype-chaining without any overhead.
			var Prototype = function () {};
			var MClass = function () {};

			MClass.extend = function (props) {

				Prototype.prototype = this.prototype;
				var p, proto = Utils.extend(new Prototype(), props);

				function Class(vars) {

					var fn,
						p;

					/**
					* If the prototype has a vars object and the first argument, is an object,
					* deep copy it to this.vars
					**/
					if (this.vars && typeof vars === "object") {
						this.vars = Utils.extend({}, this.vars, vars);
					}

					if (this.opts) {
						this.opts = Utils.extend({}, this.opts);

						if (this.opts.autoProxy === true) {
							for (p in this) {
								if (typeof this[p] === "function") {
									this[p] = this[p].bind(this);
								}
							}
						}
					}

					fn = this.__init || this.init || this.prototype.constructor;
					return fn.apply(this, arguments);
				}

				for (p in props) {
					if (
						p !== "static" &&
						typeof props[p] === "function" &&
						typeof this.prototype[p] === "function" &&
						_doesCallSuper.test(props[p])
					) {
						// this.sup() magic, as-needed
						proto[p] = _createSuperFunction(props[p], this.prototype[p]);
					}

					else if (typeof props[p] === "object") {

						if (props[p] instanceof Array) {
							proto[p] = props[p].concat();
						}

						else if (props[p] !== null) {

							if (p === "vars" || p === "opts") {
								proto[p] = Utils.extend({}, true, this.prototype[p], props[p]);
							}

							else if (p === "static") {
								proto[p] = Utils.extend({}, this.prototype[p], props[p]);
							}

							else {
								proto[p] = Utils.extend({}, props[p]);
							}
						}
					}
				}

				proto.extend = MClass.extend.bind(Class);

				Class.prototype = proto;
				Utils.extend(Class, this, proto["static"]);
				Class._isRosyClass = true;

				Class.prototype.constructor = Class;

				if (typeof Class.prototype.setup === "function") {
					Class.prototype.setup.call(Class);
				}

				return Class;
			};

			return MClass;

		}());
	}
);

define(
	'rosy/polyfills/array-indexof',[],function () {

		

		if (!Array.prototype.indexOf) {

			Array.prototype.indexOf = function (a, b) {

				if (!this.length || !(this instanceof Array) || arguments.length < 1) {
					return -1;
				}

				b = b || 0;

				if (b >= this.length) {
					return -1;
				}

				while (b < this.length) {
					if (this[b] === a) {
						return b;
					}
					b += 1;
				}
				return -1;
			};
		}

		return Array.prototype.indexOf;
	}
);

define(

	'rosy/base/NotificationManager',[
		"../utils/Utils",
		"../polyfills/array-indexof"
	],

	function (Utils) {

		

		var Notification = function (name, args, callback) {
			this.name = name;
			this.args = args;
			this.data = args && args.length === 1 ? args[0] : null;
			this.callback = callback;
			return this;
		};

		Notification.prototype.data = {};
		Notification.prototype.name = "";
		Notification.prototype.dispatcher = null;
		Notification.prototype.status = 0;
		Notification.prototype.pointer = 0;
		Notification.prototype.callback = null;

		Notification.prototype.hold = function () {
			this.status = 2;
		};

		Notification.prototype.release = function () {
			this.status = 1;
			NotificationManager.releaseNotification(this);
		};

		Notification.prototype.cancel = function () {
			this.data = {};
			this.name = "";
			this.status = 0;
			this.pointer = 0;
			this.dispatcher = null;
			this.callback = null;

			NotificationManager.cancelNotification(this);
		};

		Notification.prototype.dispatch = function (obj) {
			this.status = 1;
			this.pointer = 0;
			this.dispatcher = obj;
			NotificationManager.publishNotification(this);
		};


		Notification.prototype.respond = function () {
			if (this.callback) {
				this.callback.apply(this.dispatcher, arguments);
				this.cancel();
			}
		};

		var _pendingNotifications = [];
		var _interests = {};

		function _publishNotification(notification) {
			_pendingNotifications.push(notification);
			_notifyObjects(notification);
		}

		function _notifyObjects(notification) {

			var name = notification.name;

			if (_interests[name]) {

				var subs = _interests[name].slice(0);
				var len = subs.length;

				while (notification.pointer < len) {
					if (notification.status === 1) {
						subs[notification.pointer].apply(null, [].concat(notification, notification.args));
						notification.pointer ++;
					} else {
						return;
					}
				}

				subs = null;

				/**
				* Notified all subscribers, notification is no longer needed,
				* unless it has a callback to be called later via notification.respond()
				*/
				if (notification.status === 1 && !notification.callback) {
					notification.cancel();
				}
			}
		}

		var NotificationManager = {};

		NotificationManager.subscribe = function (name, fn, priority) {

			priority = isNaN(priority) ? -1 : priority;
			_interests[name] = _interests[name] || [];

			if (priority <= -1 || priority >= _interests[name].length) {
				_interests[name].push(fn);
			} else {
				_interests[name].splice(priority, 0, fn);
			}
		};

		NotificationManager.unsubscribe = function (name, fn) {
			var fnIndex = _interests[name].indexOf(fn);
			if (fnIndex > -1) {
				_interests[name].splice(fnIndex, 1);
			}
		};

		NotificationManager.publish = function () {

			var notification,
				args = Array.prototype.slice.call(arguments),
				name = args[0],
				dispatcher = args[args.length - 1],
				callback = args[args.length - 2];

			callback = Utils.isFunction(callback) ? callback : null;

			args = args.slice(1, (callback ? args.length - 2 : args.length - 1));

			notification = new Notification(name, args, callback);
			notification.status = 1;
			notification.pointer = 0;
			notification.dispatcher = dispatcher;
			_publishNotification(notification);
		};

		NotificationManager.releaseNotification = function (notification) {
			notification.status = 1;
			if (_pendingNotifications.indexOf(notification) > -1) {
				_notifyObjects(notification);
			}
		};

		NotificationManager.cancelNotification = function (notification) {
			_pendingNotifications.splice(_pendingNotifications.indexOf(notification), 1);
			notification = null;
		};

		return NotificationManager;
	}
);

define(

	'rosy/base/Class',[
		"./AbstractClass",
		"./NotificationManager",
		"../polyfills/function-bind",
		"../polyfills/array-indexof"
	],

	function (AbstractClass, NotificationManager) {

		

		return AbstractClass.extend({

			opts : {
				autoProxy : true
			},

			init : function () {},

			/**
			* Subscribes to a notification.
			*/
			subscribe : function (name, handler, priority) {
				this._interestHandlers = this._interestHandlers || {};

				if (handler && !this._interestHandlers[name]) {
					handler = handler;
					NotificationManager.subscribe(name, handler, priority);
					this._interestHandlers[name] = handler;
				}
			},

			/**
			* Unsubscribes from a notification.
			*/
			unsubscribe : function (name) {
				if (!name) {
					return this.unsubscribeAll();
				}

				if (this._interestHandlers && this._interestHandlers[name]) {
					var handler = this._interestHandlers[name];
					this._interestHandlers[name] = null;
					delete this._interestHandlers[name];
					NotificationManager.unsubscribe(name, handler);
				}
			},

			/**
			* Unsubscribes from all notifications registered via this.subscribe();
			*/
			unsubscribeAll : function () {
				for (var interest in this._interestHandlers) {
					if (this._interestHandlers.hasOwnProperty(interest)) {
						this.unsubscribe(interest);
					}
				}
				this._interestHandlers = [];
			},

			/**
			* Publishes a notification with the specified data.
			*/
			publish : function (/*name, arg1, arg2, arg3..., callback*/) {
				var args = Array.prototype.slice.call(arguments);
				NotificationManager.publish.apply(NotificationManager, [].concat(args, this));
			},

			/**
			* Cross-browser shorthand for func.bind(this)
			* or rather, $.proxy(func, this) in jQuery terms
			*/
			proxy : function (fn) {
				return fn ? fn.bind(this) : fn;
			},

			/**
			* Middleware setTimeout method. Allows for scope retention inside timers.
			*/
			setTimeout : function (func, delay) {
				return window.setTimeout(this.proxy(func), delay);
			},

			/**
			* Middleware setInterval method. Allows for scope retention inside timers.
			*/
			setInterval : function (func, delay) {
				return window.setInterval(this.proxy(func), delay);
			},

			/**
			* Add pseudo event listener
			*/
			on : function (name, fn) {
				var listeners = this["on_" + name] = (this["on_" + name] || []);
				listeners.push(fn);
				return true;
			},

			/**
			* Remove pseudo event listener
			*/
			off : function (name, fn) {

				var listeners = this["on_" + name],
					i;

				if (listeners) {

					if (!fn) {
						this["on_" + name] = [];
						return true;
					}

					i = listeners.indexOf(fn);
					while (i > -1) {
						listeners.splice(i, 1);
						i = listeners.indexOf(fn);
					}
					return true;
				}
			},

			/**
			* Trigger pseudo event
			*/
			trigger : function () {

				var listeners,
					evt,
					i,
					l,
					args = Array.prototype.slice.call(arguments),
					name = args.splice(0, 1)[0].split(":");

				while (name.length) {

					evt = name.join(":");
					listeners = this["on_" + evt];

					if (listeners && listeners.length) {

						args = [].concat(evt, this, (args || []));

						for (i = 0, l = listeners.length; i < l; i ++) {
							listeners[i].apply(null, args);
						}
					}

					name.pop();
				}
			},

			destroy : function () {

				var p;

				for (p in this) {
					if (p.indexOf("on_") >= 0) {
						this.off(p.replace("on_"));
					}
				}

				this.unsubscribe();
			}
		});
	}
);

/**
 * @license RequireJS text 2.0.3 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false, location: false */

define('text',['module'], function (module) {
    

    var text, fs,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = [],
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.3',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var strip = false, index = name.indexOf("."),
                modName = name.substring(0, index),
                ext = name.substring(index + 1, name.length);

            index = ext.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = ext.substring(index + 1, ext.length);
                strip = strip === "strip";
                ext = ext.substring(0, index);
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
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
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName + '.' + parsed.ext,
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                nonStripName = parsed.moduleName + '.' + parsed.ext,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + '.' +
                                     parsed.ext) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node)) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback) {
            var file = fs.readFileSync(url, 'utf8');
            //Remove BOM (Byte Mark Order) from utf8 files if it is there.
            if (file.indexOf('\uFEFF') === 0) {
                file = file.substring(1);
            }
            callback(file);
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback) {
            var xhr = text.createXhr();
            xhr.open('GET', url, true);

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        errback(err);
                    } else {
                        callback(xhr.responseText);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                stringBuffer.append(line);

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    }

    return text;
});

define(

	'$plugin',[
		"module",
		"text"
	],

	function (module, text) {

		var prefix = "libs/plugins/jquery/jquery.";

		return {

			load: function (name, req, load, config) {

				req(['$'], function ($) {

					if (!config.isBuild) {

						req(["text!" + prefix + name + ".js"], function (val) {

							var contents = "define('" + module.id + "!" + name  +
							"', ['$'], function ($) {\nvar jQuery = $;\n" + val + ";\nreturn $;\n});\n";

							eval(contents);

							req([module.id + "!" + name], function (val) {
								load(val);
							});

						});

					}
					else {
						load("");
					}
				});
			},

			loadFromFileSystem : function (plugin, name) {
				var fs = nodeRequire('fs');
				var file = require.toUrl(prefix + name) + ".js";
				var contents = fs.readFileSync(file).toString();

				contents = "define('" + plugin + "!" + name  +
				"', ['$'], function ($) {\nvar jQuery = $;\n" + contents + ";\nreturn $;\n});\n";

				return contents;
			},

			write: function (pluginName, moduleName, write, config) {
				write(this.loadFromFileSystem(pluginName, moduleName));
			}

		};
	}
);

define('$plugin!ui', ['$'], function ($) {
var jQuery = $;
/*! jQuery UI - v1.9.2 - 2012-11-26
* http://jqueryui.com
* Includes: jquery.ui.core.js, jquery.ui.widget.js, jquery.ui.mouse.js, jquery.ui.sortable.js
* Copyright (c) 2012 jQuery Foundation and other contributors Licensed MIT */

(function( $, undefined ) {

var uuid = 0,
	runiqueId = /^ui-id-\d+$/;

// prevent duplicate loading
// this is only a problem because we proxy existing functions
// and we don't want to double proxy them
$.ui = $.ui || {};
if ( $.ui.version ) {
	return;
}

$.extend( $.ui, {
	version: "1.9.2",

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
		UP: 38
	}
});

// plugins
$.fn.extend({
	_focus: $.fn.focus,
	focus: function( delay, fn ) {
		return typeof delay === "number" ?
			this.each(function() {
				var elem = this;
				setTimeout(function() {
					$( elem ).focus();
					if ( fn ) {
						fn.call( elem );
					}
				}, delay );
			}) :
			this._focus.apply( this, arguments );
	},

	scrollParent: function() {
		var scrollParent;
		if (($.ui.ie && (/(static|relative)/).test(this.css('position'))) || (/absolute/).test(this.css('position'))) {
			scrollParent = this.parents().filter(function() {
				return (/(relative|absolute|fixed)/).test($.css(this,'position')) && (/(auto|scroll)/).test($.css(this,'overflow')+$.css(this,'overflow-y')+$.css(this,'overflow-x'));
			}).eq(0);
		} else {
			scrollParent = this.parents().filter(function() {
				return (/(auto|scroll)/).test($.css(this,'overflow')+$.css(this,'overflow-y')+$.css(this,'overflow-x'));
			}).eq(0);
		}

		return (/fixed/).test(this.css('position')) || !scrollParent.length ? $(document) : scrollParent;
	},

	zIndex: function( zIndex ) {
		if ( zIndex !== undefined ) {
			return this.css( "zIndex", zIndex );
		}

		if ( this.length ) {
			var elem = $( this[ 0 ] ), position, value;
			while ( elem.length && elem[ 0 ] !== document ) {
				// Ignore z-index if position is set to a value where z-index is ignored by the browser
				// This makes behavior of this function consistent across browsers
				// WebKit always returns auto if the element is positioned
				position = elem.css( "position" );
				if ( position === "absolute" || position === "relative" || position === "fixed" ) {
					// IE returns 0 when zIndex is not specified
					// other browsers return a string
					// we ignore the case of nested elements with an explicit value of 0
					// <div style="z-index: -10;"><div style="z-index: 0;"></div></div>
					value = parseInt( elem.css( "zIndex" ), 10 );
					if ( !isNaN( value ) && value !== 0 ) {
						return value;
					}
				}
				elem = elem.parent();
			}
		}

		return 0;
	},

	uniqueId: function() {
		return this.each(function() {
			if ( !this.id ) {
				this.id = "ui-id-" + (++uuid);
			}
		});
	},

	removeUniqueId: function() {
		return this.each(function() {
			if ( runiqueId.test( this.id ) ) {
				$( this ).removeAttr( "id" );
			}
		});
	}
});

// selectors
function focusable( element, isTabIndexNotNaN ) {
	var map, mapName, img,
		nodeName = element.nodeName.toLowerCase();
	if ( "area" === nodeName ) {
		map = element.parentNode;
		mapName = map.name;
		if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
			return false;
		}
		img = $( "img[usemap=#" + mapName + "]" )[0];
		return !!img && visible( img );
	}
	return ( /input|select|textarea|button|object/.test( nodeName ) ?
		!element.disabled :
		"a" === nodeName ?
			element.href || isTabIndexNotNaN :
			isTabIndexNotNaN) &&
		// the element and all of its ancestors must be visible
		visible( element );
}

function visible( element ) {
	return $.expr.filters.visible( element ) &&
		!$( element ).parents().andSelf().filter(function() {
			return $.css( this, "visibility" ) === "hidden";
		}).length;
}

$.extend( $.expr[ ":" ], {
	data: $.expr.createPseudo ?
		$.expr.createPseudo(function( dataName ) {
			return function( elem ) {
				return !!$.data( elem, dataName );
			};
		}) :
		// support: jQuery <1.8
		function( elem, i, match ) {
			return !!$.data( elem, match[ 3 ] );
		},

	focusable: function( element ) {
		return focusable( element, !isNaN( $.attr( element, "tabindex" ) ) );
	},

	tabbable: function( element ) {
		var tabIndex = $.attr( element, "tabindex" ),
			isTabIndexNaN = isNaN( tabIndex );
		return ( isTabIndexNaN || tabIndex >= 0 ) && focusable( element, !isTabIndexNaN );
	}
});

// support
$(function() {
	var body = document.body,
		div = body.appendChild( div = document.createElement( "div" ) );

	// access offsetHeight before setting the style to prevent a layout bug
	// in IE 9 which causes the element to continue to take up space even
	// after it is removed from the DOM (#8026)
	div.offsetHeight;

	$.extend( div.style, {
		minHeight: "100px",
		height: "auto",
		padding: 0,
		borderWidth: 0
	});

	$.support.minHeight = div.offsetHeight === 100;
	$.support.selectstart = "onselectstart" in div;

	// set display to none to avoid a layout bug in IE
	// http://dev.jquery.com/ticket/4014
	body.removeChild( div ).style.display = "none";
});

// support: jQuery <1.8
if ( !$( "<a>" ).outerWidth( 1 ).jquery ) {
	$.each( [ "Width", "Height" ], function( i, name ) {
		var side = name === "Width" ? [ "Left", "Right" ] : [ "Top", "Bottom" ],
			type = name.toLowerCase(),
			orig = {
				innerWidth: $.fn.innerWidth,
				innerHeight: $.fn.innerHeight,
				outerWidth: $.fn.outerWidth,
				outerHeight: $.fn.outerHeight
			};

		function reduce( elem, size, border, margin ) {
			$.each( side, function() {
				size -= parseFloat( $.css( elem, "padding" + this ) ) || 0;
				if ( border ) {
					size -= parseFloat( $.css( elem, "border" + this + "Width" ) ) || 0;
				}
				if ( margin ) {
					size -= parseFloat( $.css( elem, "margin" + this ) ) || 0;
				}
			});
			return size;
		}

		$.fn[ "inner" + name ] = function( size ) {
			if ( size === undefined ) {
				return orig[ "inner" + name ].call( this );
			}

			return this.each(function() {
				$( this ).css( type, reduce( this, size ) + "px" );
			});
		};

		$.fn[ "outer" + name] = function( size, margin ) {
			if ( typeof size !== "number" ) {
				return orig[ "outer" + name ].call( this, size );
			}

			return this.each(function() {
				$( this).css( type, reduce( this, size, true, margin ) + "px" );
			});
		};
	});
}

// support: jQuery 1.6.1, 1.6.2 (http://bugs.jquery.com/ticket/9413)
if ( $( "<a>" ).data( "a-b", "a" ).removeData( "a-b" ).data( "a-b" ) ) {
	$.fn.removeData = (function( removeData ) {
		return function( key ) {
			if ( arguments.length ) {
				return removeData.call( this, $.camelCase( key ) );
			} else {
				return removeData.call( this );
			}
		};
	})( $.fn.removeData );
}





// deprecated

(function() {
	var uaMatch = /msie ([\w.]+)/.exec( navigator.userAgent.toLowerCase() ) || [];
	$.ui.ie = uaMatch.length ? true : false;
	$.ui.ie6 = parseFloat( uaMatch[ 1 ], 10 ) === 6;
})();

$.fn.extend({
	disableSelection: function() {
		return this.bind( ( $.support.selectstart ? "selectstart" : "mousedown" ) +
			".ui-disableSelection", function( event ) {
				event.preventDefault();
			});
	},

	enableSelection: function() {
		return this.unbind( ".ui-disableSelection" );
	}
});

$.extend( $.ui, {
	// $.ui.plugin is deprecated.  Use the proxy pattern instead.
	plugin: {
		add: function( module, option, set ) {
			var i,
				proto = $.ui[ module ].prototype;
			for ( i in set ) {
				proto.plugins[ i ] = proto.plugins[ i ] || [];
				proto.plugins[ i ].push( [ option, set[ i ] ] );
			}
		},
		call: function( instance, name, args ) {
			var i,
				set = instance.plugins[ name ];
			if ( !set || !instance.element[ 0 ].parentNode || instance.element[ 0 ].parentNode.nodeType === 11 ) {
				return;
			}

			for ( i = 0; i < set.length; i++ ) {
				if ( instance.options[ set[ i ][ 0 ] ] ) {
					set[ i ][ 1 ].apply( instance.element, args );
				}
			}
		}
	},

	contains: $.contains,

	// only used by resizable
	hasScroll: function( el, a ) {

		//If overflow is hidden, the element might have extra content, but the user wants to hide it
		if ( $( el ).css( "overflow" ) === "hidden") {
			return false;
		}

		var scroll = ( a && a === "left" ) ? "scrollLeft" : "scrollTop",
			has = false;

		if ( el[ scroll ] > 0 ) {
			return true;
		}

		// TODO: determine which cases actually cause this to happen
		// if the element doesn't have the scroll set, see if it's possible to
		// set the scroll
		el[ scroll ] = 1;
		has = ( el[ scroll ] > 0 );
		el[ scroll ] = 0;
		return has;
	},

	// these are odd functions, fix the API or move into individual plugins
	isOverAxis: function( x, reference, size ) {
		//Determines when x coordinate is over "b" element axis
		return ( x > reference ) && ( x < ( reference + size ) );
	},
	isOver: function( y, x, top, left, height, width ) {
		//Determines when x, y coordinates is over "b" element
		return $.ui.isOverAxis( y, top, height ) && $.ui.isOverAxis( x, left, width );
	}
});

})( jQuery );
(function( $, undefined ) {

var uuid = 0,
	slice = Array.prototype.slice,
	_cleanData = $.cleanData;
$.cleanData = function( elems ) {
	for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
		try {
			$( elem ).triggerHandler( "remove" );
		// http://bugs.jquery.com/ticket/8235
		} catch( e ) {}
	}
	_cleanData( elems );
};

$.widget = function( name, base, prototype ) {
	var fullName, existingConstructor, constructor, basePrototype,
		namespace = name.split( "." )[ 0 ];

	name = name.split( "." )[ 1 ];
	fullName = namespace + "-" + name;

	if ( !prototype ) {
		prototype = base;
		base = $.Widget;
	}

	// create selector for plugin
	$.expr[ ":" ][ fullName.toLowerCase() ] = function( elem ) {
		return !!$.data( elem, fullName );
	};

	$[ namespace ] = $[ namespace ] || {};
	existingConstructor = $[ namespace ][ name ];
	constructor = $[ namespace ][ name ] = function( options, element ) {
		// allow instantiation without "new" keyword
		if ( !this._createWidget ) {
			return new constructor( options, element );
		}

		// allow instantiation without initializing for simple inheritance
		// must use "new" keyword (the code above always passes args)
		if ( arguments.length ) {
			this._createWidget( options, element );
		}
	};
	// extend with the existing constructor to carry over any static properties
	$.extend( constructor, existingConstructor, {
		version: prototype.version,
		// copy the object used to create the prototype in case we need to
		// redefine the widget later
		_proto: $.extend( {}, prototype ),
		// track widgets that inherit from this widget in case this widget is
		// redefined after a widget inherits from it
		_childConstructors: []
	});

	basePrototype = new base();
	// we need to make the options hash a property directly on the new instance
	// otherwise we'll modify the options hash on the prototype that we're
	// inheriting from
	basePrototype.options = $.widget.extend( {}, basePrototype.options );
	$.each( prototype, function( prop, value ) {
		if ( $.isFunction( value ) ) {
			prototype[ prop ] = (function() {
				var _super = function() {
						return base.prototype[ prop ].apply( this, arguments );
					},
					_superApply = function( args ) {
						return base.prototype[ prop ].apply( this, args );
					};
				return function() {
					var __super = this._super,
						__superApply = this._superApply,
						returnValue;

					this._super = _super;
					this._superApply = _superApply;

					returnValue = value.apply( this, arguments );

					this._super = __super;
					this._superApply = __superApply;

					return returnValue;
				};
			})();
		}
	});
	constructor.prototype = $.widget.extend( basePrototype, {
		// TODO: remove support for widgetEventPrefix
		// always use the name + a colon as the prefix, e.g., draggable:start
		// don't prefix for widgets that aren't DOM-based
		widgetEventPrefix: existingConstructor ? basePrototype.widgetEventPrefix : name
	}, prototype, {
		constructor: constructor,
		namespace: namespace,
		widgetName: name,
		// TODO remove widgetBaseClass, see #8155
		widgetBaseClass: fullName,
		widgetFullName: fullName
	});

	// If this widget is being redefined then we need to find all widgets that
	// are inheriting from it and redefine all of them so that they inherit from
	// the new version of this widget. We're essentially trying to replace one
	// level in the prototype chain.
	if ( existingConstructor ) {
		$.each( existingConstructor._childConstructors, function( i, child ) {
			var childPrototype = child.prototype;

			// redefine the child widget using the same prototype that was
			// originally used, but inherit from the new version of the base
			$.widget( childPrototype.namespace + "." + childPrototype.widgetName, constructor, child._proto );
		});
		// remove the list of existing child constructors from the old constructor
		// so the old child constructors can be garbage collected
		delete existingConstructor._childConstructors;
	} else {
		base._childConstructors.push( constructor );
	}

	$.widget.bridge( name, constructor );
};

$.widget.extend = function( target ) {
	var input = slice.call( arguments, 1 ),
		inputIndex = 0,
		inputLength = input.length,
		key,
		value;
	for ( ; inputIndex < inputLength; inputIndex++ ) {
		for ( key in input[ inputIndex ] ) {
			value = input[ inputIndex ][ key ];
			if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {
				// Clone objects
				if ( $.isPlainObject( value ) ) {
					target[ key ] = $.isPlainObject( target[ key ] ) ?
						$.widget.extend( {}, target[ key ], value ) :
						// Don't extend strings, arrays, etc. with objects
						$.widget.extend( {}, value );
				// Copy everything else by reference
				} else {
					target[ key ] = value;
				}
			}
		}
	}
	return target;
};

$.widget.bridge = function( name, object ) {
	var fullName = object.prototype.widgetFullName || name;
	$.fn[ name ] = function( options ) {
		var isMethodCall = typeof options === "string",
			args = slice.call( arguments, 1 ),
			returnValue = this;

		// allow multiple hashes to be passed on init
		options = !isMethodCall && args.length ?
			$.widget.extend.apply( null, [ options ].concat(args) ) :
			options;

		if ( isMethodCall ) {
			this.each(function() {
				var methodValue,
					instance = $.data( this, fullName );
				if ( !instance ) {
					return $.error( "cannot call methods on " + name + " prior to initialization; " +
						"attempted to call method '" + options + "'" );
				}
				if ( !$.isFunction( instance[options] ) || options.charAt( 0 ) === "_" ) {
					return $.error( "no such method '" + options + "' for " + name + " widget instance" );
				}
				methodValue = instance[ options ].apply( instance, args );
				if ( methodValue !== instance && methodValue !== undefined ) {
					returnValue = methodValue && methodValue.jquery ?
						returnValue.pushStack( methodValue.get() ) :
						methodValue;
					return false;
				}
			});
		} else {
			this.each(function() {
				var instance = $.data( this, fullName );
				if ( instance ) {
					instance.option( options || {} )._init();
				} else {
					$.data( this, fullName, new object( options, this ) );
				}
			});
		}

		return returnValue;
	};
};

$.Widget = function( /* options, element */ ) {};
$.Widget._childConstructors = [];

$.Widget.prototype = {
	widgetName: "widget",
	widgetEventPrefix: "",
	defaultElement: "<div>",
	options: {
		disabled: false,

		// callbacks
		create: null
	},
	_createWidget: function( options, element ) {
		element = $( element || this.defaultElement || this )[ 0 ];
		this.element = $( element );
		this.uuid = uuid++;
		this.eventNamespace = "." + this.widgetName + this.uuid;
		this.options = $.widget.extend( {},
			this.options,
			this._getCreateOptions(),
			options );

		this.bindings = $();
		this.hoverable = $();
		this.focusable = $();

		if ( element !== this ) {
			// 1.9 BC for #7810
			// TODO remove dual storage
			$.data( element, this.widgetName, this );
			$.data( element, this.widgetFullName, this );
			this._on( true, this.element, {
				remove: function( event ) {
					if ( event.target === element ) {
						this.destroy();
					}
				}
			});
			this.document = $( element.style ?
				// element within the document
				element.ownerDocument :
				// element is window or document
				element.document || element );
			this.window = $( this.document[0].defaultView || this.document[0].parentWindow );
		}

		this._create();
		this._trigger( "create", null, this._getCreateEventData() );
		this._init();
	},
	_getCreateOptions: $.noop,
	_getCreateEventData: $.noop,
	_create: $.noop,
	_init: $.noop,

	destroy: function() {
		this._destroy();
		// we can probably remove the unbind calls in 2.0
		// all event bindings should go through this._on()
		this.element
			.unbind( this.eventNamespace )
			// 1.9 BC for #7810
			// TODO remove dual storage
			.removeData( this.widgetName )
			.removeData( this.widgetFullName )
			// support: jquery <1.6.3
			// http://bugs.jquery.com/ticket/9413
			.removeData( $.camelCase( this.widgetFullName ) );
		this.widget()
			.unbind( this.eventNamespace )
			.removeAttr( "aria-disabled" )
			.removeClass(
				this.widgetFullName + "-disabled " +
				"ui-state-disabled" );

		// clean up events and states
		this.bindings.unbind( this.eventNamespace );
		this.hoverable.removeClass( "ui-state-hover" );
		this.focusable.removeClass( "ui-state-focus" );
	},
	_destroy: $.noop,

	widget: function() {
		return this.element;
	},

	option: function( key, value ) {
		var options = key,
			parts,
			curOption,
			i;

		if ( arguments.length === 0 ) {
			// don't return a reference to the internal hash
			return $.widget.extend( {}, this.options );
		}

		if ( typeof key === "string" ) {
			// handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
			options = {};
			parts = key.split( "." );
			key = parts.shift();
			if ( parts.length ) {
				curOption = options[ key ] = $.widget.extend( {}, this.options[ key ] );
				for ( i = 0; i < parts.length - 1; i++ ) {
					curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
					curOption = curOption[ parts[ i ] ];
				}
				key = parts.pop();
				if ( value === undefined ) {
					return curOption[ key ] === undefined ? null : curOption[ key ];
				}
				curOption[ key ] = value;
			} else {
				if ( value === undefined ) {
					return this.options[ key ] === undefined ? null : this.options[ key ];
				}
				options[ key ] = value;
			}
		}

		this._setOptions( options );

		return this;
	},
	_setOptions: function( options ) {
		var key;

		for ( key in options ) {
			this._setOption( key, options[ key ] );
		}

		return this;
	},
	_setOption: function( key, value ) {
		this.options[ key ] = value;

		if ( key === "disabled" ) {
			this.widget()
				.toggleClass( this.widgetFullName + "-disabled ui-state-disabled", !!value )
				.attr( "aria-disabled", value );
			this.hoverable.removeClass( "ui-state-hover" );
			this.focusable.removeClass( "ui-state-focus" );
		}

		return this;
	},

	enable: function() {
		return this._setOption( "disabled", false );
	},
	disable: function() {
		return this._setOption( "disabled", true );
	},

	_on: function( suppressDisabledCheck, element, handlers ) {
		var delegateElement,
			instance = this;

		// no suppressDisabledCheck flag, shuffle arguments
		if ( typeof suppressDisabledCheck !== "boolean" ) {
			handlers = element;
			element = suppressDisabledCheck;
			suppressDisabledCheck = false;
		}

		// no element argument, shuffle and use this.element
		if ( !handlers ) {
			handlers = element;
			element = this.element;
			delegateElement = this.widget();
		} else {
			// accept selectors, DOM elements
			element = delegateElement = $( element );
			this.bindings = this.bindings.add( element );
		}

		$.each( handlers, function( event, handler ) {
			function handlerProxy() {
				// allow widgets to customize the disabled handling
				// - disabled as an array instead of boolean
				// - disabled class as method for disabling individual parts
				if ( !suppressDisabledCheck &&
						( instance.options.disabled === true ||
							$( this ).hasClass( "ui-state-disabled" ) ) ) {
					return;
				}
				return ( typeof handler === "string" ? instance[ handler ] : handler )
					.apply( instance, arguments );
			}

			// copy the guid so direct unbinding works
			if ( typeof handler !== "string" ) {
				handlerProxy.guid = handler.guid =
					handler.guid || handlerProxy.guid || $.guid++;
			}

			var match = event.match( /^(\w+)\s*(.*)$/ ),
				eventName = match[1] + instance.eventNamespace,
				selector = match[2];
			if ( selector ) {
				delegateElement.delegate( selector, eventName, handlerProxy );
			} else {
				element.bind( eventName, handlerProxy );
			}
		});
	},

	_off: function( element, eventName ) {
		eventName = (eventName || "").split( " " ).join( this.eventNamespace + " " ) + this.eventNamespace;
		element.unbind( eventName ).undelegate( eventName );
	},

	_delay: function( handler, delay ) {
		function handlerProxy() {
			return ( typeof handler === "string" ? instance[ handler ] : handler )
				.apply( instance, arguments );
		}
		var instance = this;
		return setTimeout( handlerProxy, delay || 0 );
	},

	_hoverable: function( element ) {
		this.hoverable = this.hoverable.add( element );
		this._on( element, {
			mouseenter: function( event ) {
				$( event.currentTarget ).addClass( "ui-state-hover" );
			},
			mouseleave: function( event ) {
				$( event.currentTarget ).removeClass( "ui-state-hover" );
			}
		});
	},

	_focusable: function( element ) {
		this.focusable = this.focusable.add( element );
		this._on( element, {
			focusin: function( event ) {
				$( event.currentTarget ).addClass( "ui-state-focus" );
			},
			focusout: function( event ) {
				$( event.currentTarget ).removeClass( "ui-state-focus" );
			}
		});
	},

	_trigger: function( type, event, data ) {
		var prop, orig,
			callback = this.options[ type ];

		data = data || {};
		event = $.Event( event );
		event.type = ( type === this.widgetEventPrefix ?
			type :
			this.widgetEventPrefix + type ).toLowerCase();
		// the original event may come from any element
		// so we need to reset the target on the new event
		event.target = this.element[ 0 ];

		// copy original event properties over to the new event
		orig = event.originalEvent;
		if ( orig ) {
			for ( prop in orig ) {
				if ( !( prop in event ) ) {
					event[ prop ] = orig[ prop ];
				}
			}
		}

		this.element.trigger( event, data );
		return !( $.isFunction( callback ) &&
			callback.apply( this.element[0], [ event ].concat( data ) ) === false ||
			event.isDefaultPrevented() );
	}
};

$.each( { show: "fadeIn", hide: "fadeOut" }, function( method, defaultEffect ) {
	$.Widget.prototype[ "_" + method ] = function( element, options, callback ) {
		if ( typeof options === "string" ) {
			options = { effect: options };
		}
		var hasOptions,
			effectName = !options ?
				method :
				options === true || typeof options === "number" ?
					defaultEffect :
					options.effect || defaultEffect;
		options = options || {};
		if ( typeof options === "number" ) {
			options = { duration: options };
		}
		hasOptions = !$.isEmptyObject( options );
		options.complete = callback;
		if ( options.delay ) {
			element.delay( options.delay );
		}
		if ( hasOptions && $.effects && ( $.effects.effect[ effectName ] || $.uiBackCompat !== false && $.effects[ effectName ] ) ) {
			element[ method ]( options );
		} else if ( effectName !== method && element[ effectName ] ) {
			element[ effectName ]( options.duration, options.easing, callback );
		} else {
			element.queue(function( next ) {
				$( this )[ method ]();
				if ( callback ) {
					callback.call( element[ 0 ] );
				}
				next();
			});
		}
	};
});

// DEPRECATED
if ( $.uiBackCompat !== false ) {
	$.Widget.prototype._getCreateOptions = function() {
		return $.metadata && $.metadata.get( this.element[0] )[ this.widgetName ];
	};
}

})( jQuery );
(function( $, undefined ) {

var mouseHandled = false;
$( document ).mouseup( function( e ) {
	mouseHandled = false;
});

$.widget("ui.mouse", {
	version: "1.9.2",
	options: {
		cancel: 'input,textarea,button,select,option',
		distance: 1,
		delay: 0
	},
	_mouseInit: function() {
		var that = this;

		this.element
			.bind('mousedown.'+this.widgetName, function(event) {
				return that._mouseDown(event);
			})
			.bind('click.'+this.widgetName, function(event) {
				if (true === $.data(event.target, that.widgetName + '.preventClickEvent')) {
					$.removeData(event.target, that.widgetName + '.preventClickEvent');
					event.stopImmediatePropagation();
					return false;
				}
			});

		this.started = false;
	},

	// TODO: make sure destroying one instance of mouse doesn't mess with
	// other instances of mouse
	_mouseDestroy: function() {
		this.element.unbind('.'+this.widgetName);
		if ( this._mouseMoveDelegate ) {
			$(document)
				.unbind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
				.unbind('mouseup.'+this.widgetName, this._mouseUpDelegate);
		}
	},

	_mouseDown: function(event) {
		// don't let more than one widget handle mouseStart
		if( mouseHandled ) { return; }

		// we may have missed mouseup (out of window)
		(this._mouseStarted && this._mouseUp(event));

		this._mouseDownEvent = event;

		var that = this,
			btnIsLeft = (event.which === 1),
			// event.target.nodeName works around a bug in IE 8 with
			// disabled inputs (#7620)
			elIsCancel = (typeof this.options.cancel === "string" && event.target.nodeName ? $(event.target).closest(this.options.cancel).length : false);
		if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
			return true;
		}

		this.mouseDelayMet = !this.options.delay;
		if (!this.mouseDelayMet) {
			this._mouseDelayTimer = setTimeout(function() {
				that.mouseDelayMet = true;
			}, this.options.delay);
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted = (this._mouseStart(event) !== false);
			if (!this._mouseStarted) {
				event.preventDefault();
				return true;
			}
		}

		// Click event may never have fired (Gecko & Opera)
		if (true === $.data(event.target, this.widgetName + '.preventClickEvent')) {
			$.removeData(event.target, this.widgetName + '.preventClickEvent');
		}

		// these delegates are required to keep context
		this._mouseMoveDelegate = function(event) {
			return that._mouseMove(event);
		};
		this._mouseUpDelegate = function(event) {
			return that._mouseUp(event);
		};
		$(document)
			.bind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
			.bind('mouseup.'+this.widgetName, this._mouseUpDelegate);

		event.preventDefault();

		mouseHandled = true;
		return true;
	},

	_mouseMove: function(event) {
		// IE mouseup check - mouseup happened when mouse was out of window
		if ($.ui.ie && !(document.documentMode >= 9) && !event.button) {
			return this._mouseUp(event);
		}

		if (this._mouseStarted) {
			this._mouseDrag(event);
			return event.preventDefault();
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted =
				(this._mouseStart(this._mouseDownEvent, event) !== false);
			(this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event));
		}

		return !this._mouseStarted;
	},

	_mouseUp: function(event) {
		$(document)
			.unbind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
			.unbind('mouseup.'+this.widgetName, this._mouseUpDelegate);

		if (this._mouseStarted) {
			this._mouseStarted = false;

			if (event.target === this._mouseDownEvent.target) {
				$.data(event.target, this.widgetName + '.preventClickEvent', true);
			}

			this._mouseStop(event);
		}

		return false;
	},

	_mouseDistanceMet: function(event) {
		return (Math.max(
				Math.abs(this._mouseDownEvent.pageX - event.pageX),
				Math.abs(this._mouseDownEvent.pageY - event.pageY)
			) >= this.options.distance
		);
	},

	_mouseDelayMet: function(event) {
		return this.mouseDelayMet;
	},

	// These are placeholder methods, to be overriden by extending plugin
	_mouseStart: function(event) {},
	_mouseDrag: function(event) {},
	_mouseStop: function(event) {},
	_mouseCapture: function(event) { return true; }
});

})(jQuery);
(function( $, undefined ) {

$.widget("ui.sortable", $.ui.mouse, {
	version: "1.9.2",
	widgetEventPrefix: "sort",
	ready: false,
	options: {
		appendTo: "parent",
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
		helper: "original",
		items: '> *',
		opacity: false,
		placeholder: false,
		revert: false,
		scroll: true,
		scrollSensitivity: 20,
		scrollSpeed: 20,
		scope: "default",
		tolerance: "intersect",
		zIndex: 1000
	},
	_create: function() {

		var o = this.options;
		this.containerCache = {};
		this.element.addClass("ui-sortable");

		//Get the items
		this.refresh();

		//Let's determine if the items are being displayed horizontally
		this.floating = this.items.length ? o.axis === 'x' || (/left|right/).test(this.items[0].item.css('float')) || (/inline|table-cell/).test(this.items[0].item.css('display')) : false;

		//Let's determine the parent's offset
		this.offset = this.element.offset();

		//Initialize mouse events for interaction
		this._mouseInit();

		//We're ready to go
		this.ready = true

	},

	_destroy: function() {
		this.element
			.removeClass("ui-sortable ui-sortable-disabled");
		this._mouseDestroy();

		for ( var i = this.items.length - 1; i >= 0; i-- )
			this.items[i].item.removeData(this.widgetName + "-item");

		return this;
	},

	_setOption: function(key, value){
		if ( key === "disabled" ) {
			this.options[ key ] = value;

			this.widget().toggleClass( "ui-sortable-disabled", !!value );
		} else {
			// Don't call widget base _setOption for disable as it adds ui-state-disabled class
			$.Widget.prototype._setOption.apply(this, arguments);
		}
	},

	_mouseCapture: function(event, overrideHandle) {
		var that = this;

		if (this.reverting) {
			return false;
		}

		if(this.options.disabled || this.options.type == 'static') return false;

		//We have to refresh the items data once first
		this._refreshItems(event);

		//Find out if the clicked node (or one of its parents) is a actual item in this.items
		var currentItem = null, nodes = $(event.target).parents().each(function() {
			if($.data(this, that.widgetName + '-item') == that) {
				currentItem = $(this);
				return false;
			}
		});
		if($.data(event.target, that.widgetName + '-item') == that) currentItem = $(event.target);

		if(!currentItem) return false;
		if(this.options.handle && !overrideHandle) {
			var validHandle = false;

			$(this.options.handle, currentItem).find("*").andSelf().each(function() { if(this == event.target) validHandle = true; });
			if(!validHandle) return false;
		}

		this.currentItem = currentItem;
		this._removeCurrentsFromItems();
		return true;

	},

	_mouseStart: function(event, overrideHandle, noActivation) {

		var o = this.options;
		this.currentContainer = this;

		//We only need to call refreshPositions, because the refreshItems call has been moved to mouseCapture
		this.refreshPositions();

		//Create and append the visible helper
		this.helper = this._createHelper(event);

		//Cache the helper size
		this._cacheHelperProportions();

		/*
		 * - Position generation -
		 * This block generates everything position related - it's the core of draggables.
		 */

		//Cache the margins of the original element
		this._cacheMargins();

		//Get the next scrolling parent
		this.scrollParent = this.helper.scrollParent();

		//The element's absolute position on the page minus margins
		this.offset = this.currentItem.offset();
		this.offset = {
			top: this.offset.top - this.margins.top,
			left: this.offset.left - this.margins.left
		};

		$.extend(this.offset, {
			click: { //Where the click happened, relative to the element
				left: event.pageX - this.offset.left,
				top: event.pageY - this.offset.top
			},
			parent: this._getParentOffset(),
			relative: this._getRelativeOffset() //This is a relative to absolute position minus the actual position calculation - only used for relative positioned helper
		});

		// Only after we got the offset, we can change the helper's position to absolute
		// TODO: Still need to figure out a way to make relative sorting possible
		this.helper.css("position", "absolute");
		this.cssPosition = this.helper.css("position");

		//Generate the original position
		this.originalPosition = this._generatePosition(event);
		this.originalPageX = event.pageX;
		this.originalPageY = event.pageY;

		//Adjust the mouse offset relative to the helper if 'cursorAt' is supplied
		(o.cursorAt && this._adjustOffsetFromHelper(o.cursorAt));

		//Cache the former DOM position
		this.domPosition = { prev: this.currentItem.prev()[0], parent: this.currentItem.parent()[0] };

		//If the helper is not the original, hide the original so it's not playing any role during the drag, won't cause anything bad this way
		if(this.helper[0] != this.currentItem[0]) {
			this.currentItem.hide();
		}

		//Create the placeholder
		this._createPlaceholder();

		//Set a containment if given in the options
		if(o.containment)
			this._setContainment();

		if(o.cursor) { // cursor option
			if ($('body').css("cursor")) this._storedCursor = $('body').css("cursor");
			$('body').css("cursor", o.cursor);
		}

		if(o.opacity) { // opacity option
			if (this.helper.css("opacity")) this._storedOpacity = this.helper.css("opacity");
			this.helper.css("opacity", o.opacity);
		}

		if(o.zIndex) { // zIndex option
			if (this.helper.css("zIndex")) this._storedZIndex = this.helper.css("zIndex");
			this.helper.css("zIndex", o.zIndex);
		}

		//Prepare scrolling
		if(this.scrollParent[0] != document && this.scrollParent[0].tagName != 'HTML')
			this.overflowOffset = this.scrollParent.offset();

		//Call callbacks
		this._trigger("start", event, this._uiHash());

		//Recache the helper size
		if(!this._preserveHelperProportions)
			this._cacheHelperProportions();


		//Post 'activate' events to possible containers
		if(!noActivation) {
			 for (var i = this.containers.length - 1; i >= 0; i--) { this.containers[i]._trigger("activate", event, this._uiHash(this)); }
		}

		//Prepare possible droppables
		if($.ui.ddmanager)
			$.ui.ddmanager.current = this;

		if ($.ui.ddmanager && !o.dropBehaviour)
			$.ui.ddmanager.prepareOffsets(this, event);

		this.dragging = true;

		this.helper.addClass("ui-sortable-helper");
		this._mouseDrag(event); //Execute the drag once - this causes the helper not to be visible before getting its correct position
		return true;

	},

	_mouseDrag: function(event) {

		//Compute the helpers position
		this.position = this._generatePosition(event);
		this.positionAbs = this._convertPositionTo("absolute");

		if (!this.lastPositionAbs) {
			this.lastPositionAbs = this.positionAbs;
		}

		//Do scrolling
		if(this.options.scroll) {
			var o = this.options, scrolled = false;
			if(this.scrollParent[0] != document && this.scrollParent[0].tagName != 'HTML') {

				if((this.overflowOffset.top + this.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity)
					this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop + o.scrollSpeed;
				else if(event.pageY - this.overflowOffset.top < o.scrollSensitivity)
					this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop - o.scrollSpeed;

				if((this.overflowOffset.left + this.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity)
					this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft + o.scrollSpeed;
				else if(event.pageX - this.overflowOffset.left < o.scrollSensitivity)
					this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft - o.scrollSpeed;

			} else {

				if(event.pageY - $(document).scrollTop() < o.scrollSensitivity)
					scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
				else if($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity)
					scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);

				if(event.pageX - $(document).scrollLeft() < o.scrollSensitivity)
					scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
				else if($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
					scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);

			}

			if(scrolled !== false && $.ui.ddmanager && !o.dropBehaviour)
				$.ui.ddmanager.prepareOffsets(this, event);
		}

		//Regenerate the absolute position used for position checks
		this.positionAbs = this._convertPositionTo("absolute");

		//Set the helper position
		if(!this.options.axis || this.options.axis != "y") this.helper[0].style.left = this.position.left+'px';
		if(!this.options.axis || this.options.axis != "x") this.helper[0].style.top = this.position.top+'px';

		//Rearrange
		for (var i = this.items.length - 1; i >= 0; i--) {

			//Cache variables and intersection, continue if no intersection
			var item = this.items[i], itemElement = item.item[0], intersection = this._intersectsWithPointer(item);
			if (!intersection) continue;

			// Only put the placeholder inside the current Container, skip all
			// items form other containers. This works because when moving
			// an item from one container to another the
			// currentContainer is switched before the placeholder is moved.
			//
			// Without this moving items in "sub-sortables" can cause the placeholder to jitter
			// beetween the outer and inner container.
			if (item.instance !== this.currentContainer) continue;

			if (itemElement != this.currentItem[0] //cannot intersect with itself
				&&	this.placeholder[intersection == 1 ? "next" : "prev"]()[0] != itemElement //no useless actions that have been done before
				&&	!$.contains(this.placeholder[0], itemElement) //no action if the item moved is the parent of the item checked
				&& (this.options.type == 'semi-dynamic' ? !$.contains(this.element[0], itemElement) : true)
				//&& itemElement.parentNode == this.placeholder[0].parentNode // only rearrange items within the same container
			) {

				this.direction = intersection == 1 ? "down" : "up";

				if (this.options.tolerance == "pointer" || this._intersectsWithSides(item)) {
					this._rearrange(event, item);
				} else {
					break;
				}

				this._trigger("change", event, this._uiHash());
				break;
			}
		}

		//Post events to containers
		this._contactContainers(event);

		//Interconnect with droppables
		if($.ui.ddmanager) $.ui.ddmanager.drag(this, event);

		//Call callbacks
		this._trigger('sort', event, this._uiHash());

		this.lastPositionAbs = this.positionAbs;
		return false;

	},

	_mouseStop: function(event, noPropagation) {

		if(!event) return;

		//If we are using droppables, inform the manager about the drop
		if ($.ui.ddmanager && !this.options.dropBehaviour)
			$.ui.ddmanager.drop(this, event);

		if(this.options.revert) {
			var that = this;
			var cur = this.placeholder.offset();

			this.reverting = true;

			$(this.helper).animate({
				left: cur.left - this.offset.parent.left - this.margins.left + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollLeft),
				top: cur.top - this.offset.parent.top - this.margins.top + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollTop)
			}, parseInt(this.options.revert, 10) || 500, function() {
				that._clear(event);
			});
		} else {
			this._clear(event, noPropagation);
		}

		return false;

	},

	cancel: function() {

		if(this.dragging) {

			this._mouseUp({ target: null });

			if(this.options.helper == "original")
				this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
			else
				this.currentItem.show();

			//Post deactivating events to containers
			for (var i = this.containers.length - 1; i >= 0; i--){
				this.containers[i]._trigger("deactivate", null, this._uiHash(this));
				if(this.containers[i].containerCache.over) {
					this.containers[i]._trigger("out", null, this._uiHash(this));
					this.containers[i].containerCache.over = 0;
				}
			}

		}

		if (this.placeholder) {
			//$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
			if(this.placeholder[0].parentNode) this.placeholder[0].parentNode.removeChild(this.placeholder[0]);
			if(this.options.helper != "original" && this.helper && this.helper[0].parentNode) this.helper.remove();

			$.extend(this, {
				helper: null,
				dragging: false,
				reverting: false,
				_noFinalSort: null
			});

			if(this.domPosition.prev) {
				$(this.domPosition.prev).after(this.currentItem);
			} else {
				$(this.domPosition.parent).prepend(this.currentItem);
			}
		}

		return this;

	},

	serialize: function(o) {

		var items = this._getItemsAsjQuery(o && o.connected);
		var str = []; o = o || {};

		$(items).each(function() {
			var res = ($(o.item || this).attr(o.attribute || 'id') || '').match(o.expression || (/(.+)[-=_](.+)/));
			if(res) str.push((o.key || res[1]+'[]')+'='+(o.key && o.expression ? res[1] : res[2]));
		});

		if(!str.length && o.key) {
			str.push(o.key + '=');
		}

		return str.join('&');

	},

	toArray: function(o) {

		var items = this._getItemsAsjQuery(o && o.connected);
		var ret = []; o = o || {};

		items.each(function() { ret.push($(o.item || this).attr(o.attribute || 'id') || ''); });
		return ret;

	},

	/* Be careful with the following core functions */
	_intersectsWith: function(item) {

		var x1 = this.positionAbs.left,
			x2 = x1 + this.helperProportions.width,
			y1 = this.positionAbs.top,
			y2 = y1 + this.helperProportions.height;

		var l = item.left,
			r = l + item.width,
			t = item.top,
			b = t + item.height;

		var dyClick = this.offset.click.top,
			dxClick = this.offset.click.left;

		var isOverElement = (y1 + dyClick) > t && (y1 + dyClick) < b && (x1 + dxClick) > l && (x1 + dxClick) < r;

		if(	   this.options.tolerance == "pointer"
			|| this.options.forcePointerForContainers
			|| (this.options.tolerance != "pointer" && this.helperProportions[this.floating ? 'width' : 'height'] > item[this.floating ? 'width' : 'height'])
		) {
			return isOverElement;
		} else {

			return (l < x1 + (this.helperProportions.width / 2) // Right Half
				&& x2 - (this.helperProportions.width / 2) < r // Left Half
				&& t < y1 + (this.helperProportions.height / 2) // Bottom Half
				&& y2 - (this.helperProportions.height / 2) < b ); // Top Half

		}
	},

	_intersectsWithPointer: function(item) {

		var isOverElementHeight = (this.options.axis === 'x') || $.ui.isOverAxis(this.positionAbs.top + this.offset.click.top, item.top, item.height),
			isOverElementWidth = (this.options.axis === 'y') || $.ui.isOverAxis(this.positionAbs.left + this.offset.click.left, item.left, item.width),
			isOverElement = isOverElementHeight && isOverElementWidth,
			verticalDirection = this._getDragVerticalDirection(),
			horizontalDirection = this._getDragHorizontalDirection();

		if (!isOverElement)
			return false;

		return this.floating ?
			( ((horizontalDirection && horizontalDirection == "right") || verticalDirection == "down") ? 2 : 1 )
			: ( verticalDirection && (verticalDirection == "down" ? 2 : 1) );

	},

	_intersectsWithSides: function(item) {

		var isOverBottomHalf = $.ui.isOverAxis(this.positionAbs.top + this.offset.click.top, item.top + (item.height/2), item.height),
			isOverRightHalf = $.ui.isOverAxis(this.positionAbs.left + this.offset.click.left, item.left + (item.width/2), item.width),
			verticalDirection = this._getDragVerticalDirection(),
			horizontalDirection = this._getDragHorizontalDirection();

		if (this.floating && horizontalDirection) {
			return ((horizontalDirection == "right" && isOverRightHalf) || (horizontalDirection == "left" && !isOverRightHalf));
		} else {
			return verticalDirection && ((verticalDirection == "down" && isOverBottomHalf) || (verticalDirection == "up" && !isOverBottomHalf));
		}

	},

	_getDragVerticalDirection: function() {
		var delta = this.positionAbs.top - this.lastPositionAbs.top;
		return delta != 0 && (delta > 0 ? "down" : "up");
	},

	_getDragHorizontalDirection: function() {
		var delta = this.positionAbs.left - this.lastPositionAbs.left;
		return delta != 0 && (delta > 0 ? "right" : "left");
	},

	refresh: function(event) {
		this._refreshItems(event);
		this.refreshPositions();
		return this;
	},

	_connectWith: function() {
		var options = this.options;
		return options.connectWith.constructor == String
			? [options.connectWith]
			: options.connectWith;
	},

	_getItemsAsjQuery: function(connected) {

		var items = [];
		var queries = [];
		var connectWith = this._connectWith();

		if(connectWith && connected) {
			for (var i = connectWith.length - 1; i >= 0; i--){
				var cur = $(connectWith[i]);
				for (var j = cur.length - 1; j >= 0; j--){
					var inst = $.data(cur[j], this.widgetName);
					if(inst && inst != this && !inst.options.disabled) {
						queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element) : $(inst.options.items, inst.element).not(".ui-sortable-helper").not('.ui-sortable-placeholder'), inst]);
					}
				};
			};
		}

		queries.push([$.isFunction(this.options.items) ? this.options.items.call(this.element, null, { options: this.options, item: this.currentItem }) : $(this.options.items, this.element).not(".ui-sortable-helper").not('.ui-sortable-placeholder'), this]);

		for (var i = queries.length - 1; i >= 0; i--){
			queries[i][0].each(function() {
				items.push(this);
			});
		};

		return $(items);

	},

	_removeCurrentsFromItems: function() {

		var list = this.currentItem.find(":data(" + this.widgetName + "-item)");

		this.items = $.grep(this.items, function (item) {
			for (var j=0; j < list.length; j++) {
				if(list[j] == item.item[0])
					return false;
			};
			return true;
		});

	},

	_refreshItems: function(event) {

		this.items = [];
		this.containers = [this];
		var items = this.items;
		var queries = [[$.isFunction(this.options.items) ? this.options.items.call(this.element[0], event, { item: this.currentItem }) : $(this.options.items, this.element), this]];
		var connectWith = this._connectWith();

		if(connectWith && this.ready) { //Shouldn't be run the first time through due to massive slow-down
			for (var i = connectWith.length - 1; i >= 0; i--){
				var cur = $(connectWith[i]);
				for (var j = cur.length - 1; j >= 0; j--){
					var inst = $.data(cur[j], this.widgetName);
					if(inst && inst != this && !inst.options.disabled) {
						queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element[0], event, { item: this.currentItem }) : $(inst.options.items, inst.element), inst]);
						this.containers.push(inst);
					}
				};
			};
		}

		for (var i = queries.length - 1; i >= 0; i--) {
			var targetData = queries[i][1];
			var _queries = queries[i][0];

			for (var j=0, queriesLength = _queries.length; j < queriesLength; j++) {
				var item = $(_queries[j]);

				item.data(this.widgetName + '-item', targetData); // Data for target checking (mouse manager)

				items.push({
					item: item,
					instance: targetData,
					width: 0, height: 0,
					left: 0, top: 0
				});
			};
		};

	},

	refreshPositions: function(fast) {

		//This has to be redone because due to the item being moved out/into the offsetParent, the offsetParent's position will change
		if(this.offsetParent && this.helper) {
			this.offset.parent = this._getParentOffset();
		}

		for (var i = this.items.length - 1; i >= 0; i--){
			var item = this.items[i];

			//We ignore calculating positions of all connected containers when we're not over them
			if(item.instance != this.currentContainer && this.currentContainer && item.item[0] != this.currentItem[0])
				continue;

			var t = this.options.toleranceElement ? $(this.options.toleranceElement, item.item) : item.item;

			if (!fast) {
				item.width = t.outerWidth();
				item.height = t.outerHeight();
			}

			var p = t.offset();
			item.left = p.left;
			item.top = p.top;
		};

		if(this.options.custom && this.options.custom.refreshContainers) {
			this.options.custom.refreshContainers.call(this);
		} else {
			for (var i = this.containers.length - 1; i >= 0; i--){
				var p = this.containers[i].element.offset();
				this.containers[i].containerCache.left = p.left;
				this.containers[i].containerCache.top = p.top;
				this.containers[i].containerCache.width	= this.containers[i].element.outerWidth();
				this.containers[i].containerCache.height = this.containers[i].element.outerHeight();
			};
		}

		return this;
	},

	_createPlaceholder: function(that) {
		that = that || this;
		var o = that.options;

		if(!o.placeholder || o.placeholder.constructor == String) {
			var className = o.placeholder;
			o.placeholder = {
				element: function() {

					var el = $(document.createElement(that.currentItem[0].nodeName))
						.addClass(className || that.currentItem[0].className+" ui-sortable-placeholder")
						.removeClass("ui-sortable-helper")[0];

					if(!className)
						el.style.visibility = "hidden";

					return el;
				},
				update: function(container, p) {

					// 1. If a className is set as 'placeholder option, we don't force sizes - the class is responsible for that
					// 2. The option 'forcePlaceholderSize can be enabled to force it even if a class name is specified
					if(className && !o.forcePlaceholderSize) return;

					//If the element doesn't have a actual height by itself (without styles coming from a stylesheet), it receives the inline height from the dragged item
					if(!p.height()) { p.height(that.currentItem.innerHeight() - parseInt(that.currentItem.css('paddingTop')||0, 10) - parseInt(that.currentItem.css('paddingBottom')||0, 10)); };
					if(!p.width()) { p.width(that.currentItem.innerWidth() - parseInt(that.currentItem.css('paddingLeft')||0, 10) - parseInt(that.currentItem.css('paddingRight')||0, 10)); };
				}
			};
		}

		//Create the placeholder
		that.placeholder = $(o.placeholder.element.call(that.element, that.currentItem));

		//Append it after the actual current item
		that.currentItem.after(that.placeholder);

		//Update the size of the placeholder (TODO: Logic to fuzzy, see line 316/317)
		o.placeholder.update(that, that.placeholder);

	},

	_contactContainers: function(event) {

		// get innermost container that intersects with item
		var innermostContainer = null, innermostIndex = null;


		for (var i = this.containers.length - 1; i >= 0; i--){

			// never consider a container that's located within the item itself
			if($.contains(this.currentItem[0], this.containers[i].element[0]))
				continue;

			if(this._intersectsWith(this.containers[i].containerCache)) {

				// if we've already found a container and it's more "inner" than this, then continue
				if(innermostContainer && $.contains(this.containers[i].element[0], innermostContainer.element[0]))
					continue;

				innermostContainer = this.containers[i];
				innermostIndex = i;

			} else {
				// container doesn't intersect. trigger "out" event if necessary
				if(this.containers[i].containerCache.over) {
					this.containers[i]._trigger("out", event, this._uiHash(this));
					this.containers[i].containerCache.over = 0;
				}
			}

		}

		// if no intersecting containers found, return
		if(!innermostContainer) return;

		// move the item into the container if it's not there already
		if(this.containers.length === 1) {
			this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
			this.containers[innermostIndex].containerCache.over = 1;
		} else {

			//When entering a new container, we will find the item with the least distance and append our item near it
			var dist = 10000; var itemWithLeastDistance = null;
			var posProperty = this.containers[innermostIndex].floating ? 'left' : 'top';
			var sizeProperty = this.containers[innermostIndex].floating ? 'width' : 'height';
			var base = this.positionAbs[posProperty] + this.offset.click[posProperty];
			for (var j = this.items.length - 1; j >= 0; j--) {
				if(!$.contains(this.containers[innermostIndex].element[0], this.items[j].item[0])) continue;
				if(this.items[j].item[0] == this.currentItem[0]) continue;
				var cur = this.items[j].item.offset()[posProperty];
				var nearBottom = false;
				if(Math.abs(cur - base) > Math.abs(cur + this.items[j][sizeProperty] - base)){
					nearBottom = true;
					cur += this.items[j][sizeProperty];
				}

				if(Math.abs(cur - base) < dist) {
					dist = Math.abs(cur - base); itemWithLeastDistance = this.items[j];
					this.direction = nearBottom ? "up": "down";
				}
			}

			if(!itemWithLeastDistance && !this.options.dropOnEmpty) //Check if dropOnEmpty is enabled
				return;

			this.currentContainer = this.containers[innermostIndex];
			itemWithLeastDistance ? this._rearrange(event, itemWithLeastDistance, null, true) : this._rearrange(event, null, this.containers[innermostIndex].element, true);
			this._trigger("change", event, this._uiHash());
			this.containers[innermostIndex]._trigger("change", event, this._uiHash(this));

			//Update the placeholder
			this.options.placeholder.update(this.currentContainer, this.placeholder);

			this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
			this.containers[innermostIndex].containerCache.over = 1;
		}


	},

	_createHelper: function(event) {

		var o = this.options;
		var helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event, this.currentItem])) : (o.helper == 'clone' ? this.currentItem.clone() : this.currentItem);

		if(!helper.parents('body').length) //Add the helper to the DOM if that didn't happen already
			$(o.appendTo != 'parent' ? o.appendTo : this.currentItem[0].parentNode)[0].appendChild(helper[0]);

		if(helper[0] == this.currentItem[0])
			this._storedCSS = { width: this.currentItem[0].style.width, height: this.currentItem[0].style.height, position: this.currentItem.css("position"), top: this.currentItem.css("top"), left: this.currentItem.css("left") };

		if(helper[0].style.width == '' || o.forceHelperSize) helper.width(this.currentItem.width());
		if(helper[0].style.height == '' || o.forceHelperSize) helper.height(this.currentItem.height());

		return helper;

	},

	_adjustOffsetFromHelper: function(obj) {
		if (typeof obj == 'string') {
			obj = obj.split(' ');
		}
		if ($.isArray(obj)) {
			obj = {left: +obj[0], top: +obj[1] || 0};
		}
		if ('left' in obj) {
			this.offset.click.left = obj.left + this.margins.left;
		}
		if ('right' in obj) {
			this.offset.click.left = this.helperProportions.width - obj.right + this.margins.left;
		}
		if ('top' in obj) {
			this.offset.click.top = obj.top + this.margins.top;
		}
		if ('bottom' in obj) {
			this.offset.click.top = this.helperProportions.height - obj.bottom + this.margins.top;
		}
	},

	_getParentOffset: function() {


		//Get the offsetParent and cache its position
		this.offsetParent = this.helper.offsetParent();
		var po = this.offsetParent.offset();

		// This is a special case where we need to modify a offset calculated on start, since the following happened:
		// 1. The position of the helper is absolute, so it's position is calculated based on the next positioned parent
		// 2. The actual offset parent is a child of the scroll parent, and the scroll parent isn't the document, which means that
		//    the scroll is included in the initial calculation of the offset of the parent, and never recalculated upon drag
		if(this.cssPosition == 'absolute' && this.scrollParent[0] != document && $.contains(this.scrollParent[0], this.offsetParent[0])) {
			po.left += this.scrollParent.scrollLeft();
			po.top += this.scrollParent.scrollTop();
		}

		if((this.offsetParent[0] == document.body) //This needs to be actually done for all browsers, since pageX/pageY includes this information
		|| (this.offsetParent[0].tagName && this.offsetParent[0].tagName.toLowerCase() == 'html' && $.ui.ie)) //Ugly IE fix
			po = { top: 0, left: 0 };

		return {
			top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"),10) || 0),
			left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"),10) || 0)
		};

	},

	_getRelativeOffset: function() {

		if(this.cssPosition == "relative") {
			var p = this.currentItem.position();
			return {
				top: p.top - (parseInt(this.helper.css("top"),10) || 0) + this.scrollParent.scrollTop(),
				left: p.left - (parseInt(this.helper.css("left"),10) || 0) + this.scrollParent.scrollLeft()
			};
		} else {
			return { top: 0, left: 0 };
		}

	},

	_cacheMargins: function() {
		this.margins = {
			left: (parseInt(this.currentItem.css("marginLeft"),10) || 0),
			top: (parseInt(this.currentItem.css("marginTop"),10) || 0)
		};
	},

	_cacheHelperProportions: function() {
		this.helperProportions = {
			width: this.helper.outerWidth(),
			height: this.helper.outerHeight()
		};
	},

	_setContainment: function() {

		var o = this.options;
		if(o.containment == 'parent') o.containment = this.helper[0].parentNode;
		if(o.containment == 'document' || o.containment == 'window') this.containment = [
			0 - this.offset.relative.left - this.offset.parent.left,
			0 - this.offset.relative.top - this.offset.parent.top,
			$(o.containment == 'document' ? document : window).width() - this.helperProportions.width - this.margins.left,
			($(o.containment == 'document' ? document : window).height() || document.body.parentNode.scrollHeight) - this.helperProportions.height - this.margins.top
		];

		if(!(/^(document|window|parent)$/).test(o.containment)) {
			var ce = $(o.containment)[0];
			var co = $(o.containment).offset();
			var over = ($(ce).css("overflow") != 'hidden');

			this.containment = [
				co.left + (parseInt($(ce).css("borderLeftWidth"),10) || 0) + (parseInt($(ce).css("paddingLeft"),10) || 0) - this.margins.left,
				co.top + (parseInt($(ce).css("borderTopWidth"),10) || 0) + (parseInt($(ce).css("paddingTop"),10) || 0) - this.margins.top,
				co.left+(over ? Math.max(ce.scrollWidth,ce.offsetWidth) : ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"),10) || 0) - (parseInt($(ce).css("paddingRight"),10) || 0) - this.helperProportions.width - this.margins.left,
				co.top+(over ? Math.max(ce.scrollHeight,ce.offsetHeight) : ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"),10) || 0) - (parseInt($(ce).css("paddingBottom"),10) || 0) - this.helperProportions.height - this.margins.top
			];
		}

	},

	_convertPositionTo: function(d, pos) {

		if(!pos) pos = this.position;
		var mod = d == "absolute" ? 1 : -1;
		var o = this.options, scroll = this.cssPosition == 'absolute' && !(this.scrollParent[0] != document && $.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent, scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

		return {
			top: (
				pos.top																	// The absolute mouse position
				+ this.offset.relative.top * mod										// Only for relative positioned nodes: Relative offset from element to offset parent
				+ this.offset.parent.top * mod											// The offsetParent's offset without borders (offset + border)
				- ( ( this.cssPosition == 'fixed' ? -this.scrollParent.scrollTop() : ( scrollIsRootNode ? 0 : scroll.scrollTop() ) ) * mod)
			),
			left: (
				pos.left																// The absolute mouse position
				+ this.offset.relative.left * mod										// Only for relative positioned nodes: Relative offset from element to offset parent
				+ this.offset.parent.left * mod											// The offsetParent's offset without borders (offset + border)
				- ( ( this.cssPosition == 'fixed' ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft() ) * mod)
			)
		};

	},

	_generatePosition: function(event) {

		var o = this.options, scroll = this.cssPosition == 'absolute' && !(this.scrollParent[0] != document && $.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent, scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

		// This is another very weird special case that only happens for relative elements:
		// 1. If the css position is relative
		// 2. and the scroll parent is the document or similar to the offset parent
		// we have to refresh the relative offset during the scroll so there are no jumps
		if(this.cssPosition == 'relative' && !(this.scrollParent[0] != document && this.scrollParent[0] != this.offsetParent[0])) {
			this.offset.relative = this._getRelativeOffset();
		}

		var pageX = event.pageX;
		var pageY = event.pageY;

		/*
		 * - Position constraining -
		 * Constrain the position to a mix of grid, containment.
		 */

		if(this.originalPosition) { //If we are not dragging yet, we won't check for options

			if(this.containment) {
				if(event.pageX - this.offset.click.left < this.containment[0]) pageX = this.containment[0] + this.offset.click.left;
				if(event.pageY - this.offset.click.top < this.containment[1]) pageY = this.containment[1] + this.offset.click.top;
				if(event.pageX - this.offset.click.left > this.containment[2]) pageX = this.containment[2] + this.offset.click.left;
				if(event.pageY - this.offset.click.top > this.containment[3]) pageY = this.containment[3] + this.offset.click.top;
			}

			if(o.grid) {
				var top = this.originalPageY + Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1];
				pageY = this.containment ? (!(top - this.offset.click.top < this.containment[1] || top - this.offset.click.top > this.containment[3]) ? top : (!(top - this.offset.click.top < this.containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;

				var left = this.originalPageX + Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0];
				pageX = this.containment ? (!(left - this.offset.click.left < this.containment[0] || left - this.offset.click.left > this.containment[2]) ? left : (!(left - this.offset.click.left < this.containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
			}

		}

		return {
			top: (
				pageY																// The absolute mouse position
				- this.offset.click.top													// Click offset (relative to the element)
				- this.offset.relative.top												// Only for relative positioned nodes: Relative offset from element to offset parent
				- this.offset.parent.top												// The offsetParent's offset without borders (offset + border)
				+ ( ( this.cssPosition == 'fixed' ? -this.scrollParent.scrollTop() : ( scrollIsRootNode ? 0 : scroll.scrollTop() ) ))
			),
			left: (
				pageX																// The absolute mouse position
				- this.offset.click.left												// Click offset (relative to the element)
				- this.offset.relative.left												// Only for relative positioned nodes: Relative offset from element to offset parent
				- this.offset.parent.left												// The offsetParent's offset without borders (offset + border)
				+ ( ( this.cssPosition == 'fixed' ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft() ))
			)
		};

	},

	_rearrange: function(event, i, a, hardRefresh) {

		a ? a[0].appendChild(this.placeholder[0]) : i.item[0].parentNode.insertBefore(this.placeholder[0], (this.direction == 'down' ? i.item[0] : i.item[0].nextSibling));

		//Various things done here to improve the performance:
		// 1. we create a setTimeout, that calls refreshPositions
		// 2. on the instance, we have a counter variable, that get's higher after every append
		// 3. on the local scope, we copy the counter variable, and check in the timeout, if it's still the same
		// 4. this lets only the last addition to the timeout stack through
		this.counter = this.counter ? ++this.counter : 1;
		var counter = this.counter;

		this._delay(function() {
			if(counter == this.counter) this.refreshPositions(!hardRefresh); //Precompute after each DOM insertion, NOT on mousemove
		});

	},

	_clear: function(event, noPropagation) {

		this.reverting = false;
		// We delay all events that have to be triggered to after the point where the placeholder has been removed and
		// everything else normalized again
		var delayedTriggers = [];

		// We first have to update the dom position of the actual currentItem
		// Note: don't do it if the current item is already removed (by a user), or it gets reappended (see #4088)
		if(!this._noFinalSort && this.currentItem.parent().length) this.placeholder.before(this.currentItem);
		this._noFinalSort = null;

		if(this.helper[0] == this.currentItem[0]) {
			for(var i in this._storedCSS) {
				if(this._storedCSS[i] == 'auto' || this._storedCSS[i] == 'static') this._storedCSS[i] = '';
			}
			this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
		} else {
			this.currentItem.show();
		}

		if(this.fromOutside && !noPropagation) delayedTriggers.push(function(event) { this._trigger("receive", event, this._uiHash(this.fromOutside)); });
		if((this.fromOutside || this.domPosition.prev != this.currentItem.prev().not(".ui-sortable-helper")[0] || this.domPosition.parent != this.currentItem.parent()[0]) && !noPropagation) delayedTriggers.push(function(event) { this._trigger("update", event, this._uiHash()); }); //Trigger update callback if the DOM position has changed

		// Check if the items Container has Changed and trigger appropriate
		// events.
		if (this !== this.currentContainer) {
			if(!noPropagation) {
				delayedTriggers.push(function(event) { this._trigger("remove", event, this._uiHash()); });
				delayedTriggers.push((function(c) { return function(event) { c._trigger("receive", event, this._uiHash(this)); };  }).call(this, this.currentContainer));
				delayedTriggers.push((function(c) { return function(event) { c._trigger("update", event, this._uiHash(this));  }; }).call(this, this.currentContainer));
			}
		}


		//Post events to containers
		for (var i = this.containers.length - 1; i >= 0; i--){
			if(!noPropagation) delayedTriggers.push((function(c) { return function(event) { c._trigger("deactivate", event, this._uiHash(this)); };  }).call(this, this.containers[i]));
			if(this.containers[i].containerCache.over) {
				delayedTriggers.push((function(c) { return function(event) { c._trigger("out", event, this._uiHash(this)); };  }).call(this, this.containers[i]));
				this.containers[i].containerCache.over = 0;
			}
		}

		//Do what was originally in plugins
		if(this._storedCursor) $('body').css("cursor", this._storedCursor); //Reset cursor
		if(this._storedOpacity) this.helper.css("opacity", this._storedOpacity); //Reset opacity
		if(this._storedZIndex) this.helper.css("zIndex", this._storedZIndex == 'auto' ? '' : this._storedZIndex); //Reset z-index

		this.dragging = false;
		if(this.cancelHelperRemoval) {
			if(!noPropagation) {
				this._trigger("beforeStop", event, this._uiHash());
				for (var i=0; i < delayedTriggers.length; i++) { delayedTriggers[i].call(this, event); }; //Trigger all delayed events
				this._trigger("stop", event, this._uiHash());
			}

			this.fromOutside = false;
			return false;
		}

		if(!noPropagation) this._trigger("beforeStop", event, this._uiHash());

		//$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
		this.placeholder[0].parentNode.removeChild(this.placeholder[0]);

		if(this.helper[0] != this.currentItem[0]) this.helper.remove(); this.helper = null;

		if(!noPropagation) {
			for (var i=0; i < delayedTriggers.length; i++) { delayedTriggers[i].call(this, event); }; //Trigger all delayed events
			this._trigger("stop", event, this._uiHash());
		}

		this.fromOutside = false;
		return true;

	},

	_trigger: function() {
		if ($.Widget.prototype._trigger.apply(this, arguments) === false) {
			this.cancel();
		}
	},

	_uiHash: function(_inst) {
		var inst = _inst || this;
		return {
			helper: inst.helper,
			placeholder: inst.placeholder || $([]),
			position: inst.position,
			originalPosition: inst.originalPosition,
			offset: inst.positionAbs,
			item: inst.currentItem,
			sender: _inst ? _inst.element : null
		};
	}

});

})(jQuery);
;
return $;
});

define(

	'rosy/base/DOMClass',[
		"../base/Class",
		"$"
	],

	function (Class, $) {

		

		function _matchJQueryGUIDs(instance, jqObj, events) {
			var type, i, j, event;
			var func;
			var f;

			for (type in events) {
				for (i = 0, j = events[type].length; i < j; i++) {
					if (!events[type]) {
						break;
					}

					event = events[type][i];

					if (!event) {
						break;
					}

					for (func in instance) {
						f = instance[func];

						if (f && f.guid && typeof f === "function") {
							if (f.guid === event.handler.guid) {
								jqObj.off(type, f);
							}
						}
					}
				}
			}
		}

		function _unbindFromObject(instance, obj) {
			if (!obj) {
				return;
			}

			var key, jqObj, events;

			for (key in obj) {
				jqObj = obj[key];

				if (jqObj instanceof $) {

					var i, j, el;

					for (i = 0, j = jqObj.length; i < j; i++) {
						el = jqObj[i];
						events = $._data(el, "events");

						if (events) {
							_matchJQueryGUIDs(instance, jqObj.eq(i), events);
						}
					}
				} else if ($.isPlainObject(jqObj)) {
					_unbindFromObject(instance, jqObj);
				}
			}
		}

		return Class.extend({

			/**
			* Middleware preventDefault method. A shortcut to avoid delegation for a simple task.
			*/
			preventDefault : function (e) {
				e.preventDefault();
			},

			/**
			* Shorthand for $.proxy(func, this)
			*/
			proxy : function (fn) {
				return $.proxy(fn, this);
			},

			destroy : function () {
				this.unbindEvents();
				this.sup();
			},

			unbindEvents : function () {
				for (var key in this) {
					if ($.isPlainObject(this[key])) {
						_unbindFromObject(this, this[key]);
					}
				}
			}

		});
	}
);

define(

	'admin/views/Page',[
		"rosy/base/DOMClass",
		"$"
	],

	function (DOMClass, $) {

		

		var $body = $("body");

		return DOMClass.extend({

			$content : "",

			init : function () {
				this.sup();
				this.$content = $("#main");
			},

			transitionIn : function () {
				this.$content.animate({opacity : 1}, 500, this.transitionInComplete);
			},

			transitionOut : function () {
				this.$content.animate({opacity : 0}, 500, this.transitionOutComplete);
			},

			destroy : function () {
				this.$content = null;
			}
		});
	}
);

define('$plugin!select2', ['$'], function ($) {
var jQuery = $;
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
 (function ($) {
 	if(typeof $.fn.each2 == "undefined"){
 		$.fn.extend({
 			/*
			* 4-10 times faster .each replacement
			* use it carefully, as it overrides jQuery context of element on each iteration
			*/
			each2 : function (c) {
				var j = $([0]), i = -1, l = this.length;
				while (
					++i < l
					&& (j.context = j[0] = this[i])
					&& c.call(j[0], i, j) !== false //"this"=DOM, i=index, j=jQuery object
				);
				return this;
			}
 		});
 	}
})(jQuery);

(function ($, undefined) {
    
    /*global document, window, jQuery, console */

    if (window.Select2 !== undefined) {
        return;
    }

    var KEY, AbstractSelect2, SingleSelect2, MultiSelect2, nextUid, sizer,
        lastMousePosition, $document;

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
        isArrow: function (k) {
            k = k.which ? k.which : k;
            switch (k) {
            case KEY.LEFT:
            case KEY.RIGHT:
            case KEY.UP:
            case KEY.DOWN:
                return true;
            }
            return false;
        },
        isControl: function (e) {
            var k = e.which;
            switch (k) {
            case KEY.SHIFT:
            case KEY.CTRL:
            case KEY.ALT:
                return true;
            }

            if (e.metaKey) return true;

            return false;
        },
        isFunctionKey: function (k) {
            k = k.which ? k.which : k;
            return k >= 112 && k <= 123;
        }
    };

    $document = $(document);

    nextUid=(function() { var counter=1; return function() { return counter++; }; }());

    function indexOf(value, array) {
        var i = 0, l = array.length, v;

        if (typeof value === "undefined") {
          return -1;
        }

        if (value.constructor === String) {
            for (; i < l; i = i + 1) if (value.localeCompare(array[i]) === 0) return i;
        } else {
            for (; i < l; i = i + 1) {
                v = array[i];
                if (v.constructor === String) {
                    if (v.localeCompare(value) === 0) return i;
                } else {
                    if (v === value) return i;
                }
            }
        }
        return -1;
    }

    /**
     * Compares equality of a and b taking into account that a and b may be strings, in which case localeCompare is used
     * @param a
     * @param b
     */
    function equal(a, b) {
        if (a === b) return true;
        if (a === undefined || b === undefined) return false;
        if (a === null || b === null) return false;
        if (a.constructor === String) return a.localeCompare(b) === 0;
        if (b.constructor === String) return b.localeCompare(a) === 0;
        return false;
    }

    /**
     * Splits the string into an array of values, trimming each value. An empty array is returned for nulls or empty
     * strings
     * @param string
     * @param separator
     */
    function splitVal(string, separator) {
        var val, i, l;
        if (string === null || string.length < 1) return [];
        val = string.split(separator);
        for (i = 0, l = val.length; i < l; i = i + 1) val[i] = $.trim(val[i]);
        return val;
    }

    function getSideBorderPadding(element) {
        return element.outerWidth(false) - element.width();
    }

    function installKeyUpChangeEvent(element) {
        var key="keyup-change-value";
        element.bind("keydown", function () {
            if ($.data(element, key) === undefined) {
                $.data(element, key, element.val());
            }
        });
        element.bind("keyup", function () {
            var val= $.data(element, key);
            if (val !== undefined && element.val() !== val) {
                $.removeData(element, key);
                element.trigger("keyup-change");
            }
        });
    }

    $document.bind("mousemove", function (e) {
        lastMousePosition = {x: e.pageX, y: e.pageY};
    });

    /**
     * filters mouse events so an event is fired only if the mouse moved.
     *
     * filters out mouse events that occur when mouse is stationary but
     * the elements under the pointer are scrolled.
     */
    function installFilteredMouseMove(element) {
	    element.bind("mousemove", function (e) {
            var lastpos = lastMousePosition;
            if (lastpos === undefined || lastpos.x !== e.pageX || lastpos.y !== e.pageY) {
                $(e.target).trigger("mousemove-filtered", e);
            }
        });
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
        ctx = ctx || undefined;
        var timeout;
        return function () {
            var args = arguments;
            window.clearTimeout(timeout);
            timeout = window.setTimeout(function() {
                fn.apply(ctx, args);
            }, quietMillis);
        };
    }

    /**
     * A simple implementation of a thunk
     * @param formula function used to lazily initialize the thunk
     * @return {Function}
     */
    function thunk(formula) {
        var evaluated = false,
            value;
        return function() {
            if (evaluated === false) { value = formula(); evaluated = true; }
            return value;
        };
    };

    function installDebouncedScroll(threshold, element) {
        var notify = debounce(threshold, function (e) { element.trigger("scroll-debounced", e);});
        element.bind("scroll", function (e) {
            if (indexOf(e.target, element.get()) >= 0) notify(e);
        });
    }

    function killEvent(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    function killEventImmediately(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function measureTextWidth(e) {
        if (!sizer){
        	var style = e[0].currentStyle || window.getComputedStyle(e[0], null);
        	sizer = $("<div></div>").css({
	            position: "absolute",
	            left: "-10000px",
	            top: "-10000px",
	            display: "none",
	            fontSize: style.fontSize,
	            fontFamily: style.fontFamily,
	            fontStyle: style.fontStyle,
	            fontWeight: style.fontWeight,
	            letterSpacing: style.letterSpacing,
	            textTransform: style.textTransform,
	            whiteSpace: "nowrap"
	        });
        	$("body").append(sizer);
        }
        sizer.text(e.val());
        return sizer.width();
    }

    function markMatch(text, term, markup) {
        var match=text.toUpperCase().indexOf(term.toUpperCase()),
            tl=term.length;

        if (match<0) {
            markup.push(text);
            return;
        }

        markup.push(text.substring(0, match));
        markup.push("<span class='select2-match'>");
        markup.push(text.substring(match, match + tl));
        markup.push("</span>");
        markup.push(text.substring(match + tl, text.length));
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
            quietMillis = options.quietMillis || 100;

        return function (query) {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(function () {
                requestSequence += 1; // increment the sequence
                var requestNumber = requestSequence, // this request's sequence number
                    data = options.data, // ajax data function
                    transport = options.transport || $.ajax,
                    traditional = options.traditional || false,
                    type = options.type || 'GET'; // set type of request (GET or POST)

                data = data.call(this, query.term, query.page, query.context);

                if( null !== handler) { handler.abort(); }

                handler = transport.call(null, {
                    url: options.url,
                    dataType: options.dataType,
                    data: data,
                    type: type,
                    traditional: traditional,
                    success: function (data) {
                        if (requestNumber < requestSequence) {
                            return;
                        }
                        // TODO 3.0 - replace query.page with query so users have access to term, page, etc.
                        var results = options.results(data, query.page);
                        query.callback(results);
                    }
                });
            }, quietMillis);
        };
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
            text = function (item) { return ""+item.text; }; // function used to retrieve the text portion of a data item that is matched against the search

        if (!$.isArray(data)) {
            text = data.text;
            // if text is not a function we assume it to be a key name
            if (!$.isFunction(text)) {
              dataText = data.text; // we need to store this in a separate variable because in the next step data gets reset and data.text is no longer available
              text = function (item) { return item[dataText]; };
            }
            data = data.results;
        }

        return function (query) {
            var t = query.term, filtered = { results: [] }, process;
            if (t === "") {
                query.callback({results: data});
                return;
            }

            process = function(datum, collection) {
                var group, attr;
                datum = datum[0];
                if (datum.children) {
                    group = {};
                    for (attr in datum) {
                        if (datum.hasOwnProperty(attr)) group[attr]=datum[attr];
                    }
                    group.children=[];
                    $(datum.children).each2(function(i, childDatum) { process(childDatum, group.children); });
                    if (group.children.length || query.matcher(t, text(group))) {
                        collection.push(group);
                    }
                } else {
                    if (query.matcher(t, text(datum))) {
                        collection.push(datum);
                    }
                }
            };

            $(data).each2(function(i, datum) { process(datum, filtered.results); });
            query.callback(filtered);
        };
    }

    // TODO javadoc
    function tags(data) {
        // TODO even for a function we should probably return a wrapper that does the same object/string check as
        // the function for arrays. otherwise only functions that return objects are supported.
        if ($.isFunction(data)) {
            return data;
        }

        // if not a function we assume it to be an array

        return function (query) {
            var t = query.term, filtered = {results: []};
            $(data).each(function () {
                var isObject = this.text !== undefined,
                    text = isObject ? this.text : this;
                if (t === "" || query.matcher(t, text)) {
                    filtered.results.push(isObject ? this : {id: this, text: this});
                }
            });
            query.callback(filtered);
        };
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
        if ($.isFunction(formatter)) return true;
        if (!formatter) return false;
        throw new Error("formatterName must be a function or a falsy value");
    }

    function evaluate(val) {
        return $.isFunction(val) ? val() : val;
    }

    function countResults(results) {
        var count = 0;
        $.each(results, function(i, item) {
            if (item.children) {
                count += countResults(item.children);
            } else {
                count++;
            }
        });
        return count;
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
            i, l, // looping variables
            separator; // the matched separator

        if (!opts.createSearchChoice || !opts.tokenSeparators || opts.tokenSeparators.length < 1) return undefined;

        while (true) {
            index = -1;

            for (i = 0, l = opts.tokenSeparators.length; i < l; i++) {
                separator = opts.tokenSeparators[i];
                index = input.indexOf(separator);
                if (index >= 0) break;
            }

            if (index < 0) break; // did not find any token separator in the input string, bail

            token = input.substring(0, index);
            input = input.substring(index + separator.length);

            if (token.length > 0) {
                token = opts.createSearchChoice(token, selection);
                if (token !== undefined && token !== null && opts.id(token) !== undefined && opts.id(token) !== null) {
                    dupe = false;
                    for (i = 0, l = selection.length; i < l; i++) {
                        if (equal(opts.id(token), opts.id(selection[i]))) {
                            dupe = true; break;
                        }
                    }

                    if (!dupe) selectCallback(token);
                }
            }
        }

        if (original.localeCompare(input) != 0) return input;
    }

    /**
     * blurs any Select2 container that has focus when an element outside them was clicked or received focus
     *
     * also takes care of clicks on label tags that point to the source element
     */
    $document.ready(function () {
        $document.bind("mousedown touchend", function (e) {
            var target = $(e.target).closest("div.select2-container").get(0), attr;
            if (target) {
                $document.find("div.select2-container-active").each(function () {
                    if (this !== target) $(this).data("select2").blur();
                });
            } else {
                target = $(e.target).closest("div.select2-drop").get(0);
                $document.find("div.select2-drop-active").each(function () {
                    if (this !== target) $(this).data("select2").blur();
                });
            }

            target=$(e.target);
            attr = target.attr("for");
            if ("LABEL" === e.target.tagName && attr && attr.length > 0) {
                attr = attr.replace(/([\[\].])/g,'\\$1'); /* escapes [, ], and . so properly selects the id */
                target = $("#"+attr);
                target = target.data("select2");
                if (target !== undefined) { target.focus(); e.preventDefault();}
            }
        });
    });

    /**
     * Creates a new class
     *
     * @param superClass
     * @param methods
     */
    function clazz(SuperClass, methods) {
        var constructor = function () {};
        constructor.prototype = new SuperClass;
        constructor.prototype.constructor = constructor;
        constructor.prototype.parent = SuperClass.prototype;
        constructor.prototype = $.extend(constructor.prototype, methods);
        return constructor;
    }

    AbstractSelect2 = clazz(Object, {

        // abstract
        bind: function (func) {
            var self = this;
            return function () {
                func.apply(self, arguments);
            };
        },

        // abstract
        init: function (opts) {
            var results, search, resultsSelector = ".select2-results";

            // prepare options
            this.opts = opts = this.prepareOpts(opts);

            this.id=opts.id;

            // destroy if called on an existing component
            if (opts.element.data("select2") !== undefined &&
                opts.element.data("select2") !== null) {
                this.destroy();
            }

            this.enabled=true;
            this.container = this.createContainer();

            this.containerId="s2id_"+(opts.element.attr("id") || "autogen"+nextUid());
            this.containerSelector="#"+this.containerId.replace(/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1');
            this.container.attr("id", this.containerId);

            // cache the body so future lookups are cheap
            this.body = thunk(function() { return opts.element.closest("body"); });

            if (opts.element.attr("class") !== undefined) {
                this.container.addClass(opts.element.attr("class").replace(/validate\[[\S ]+] ?/, ''));
            }

            this.container.css(evaluate(opts.containerCss));
            this.container.addClass(evaluate(opts.containerCssClass));

            // swap container for the element
            this.opts.element
                .data("select2", this)
                .hide()
                .before(this.container);
            this.container.data("select2", this);

            this.dropdown = this.container.find(".select2-drop");
            this.dropdown.addClass(evaluate(opts.dropdownCssClass));
            this.dropdown.data("select2", this);

            this.results = results = this.container.find(resultsSelector);
            this.search = search = this.container.find("input.select2-input");

            search.attr("tabIndex", this.opts.element.attr("tabIndex"));

            this.resultsPage = 0;
            this.context = null;

            // initialize the container
            this.initContainer();
            this.initContainerWidth();

            installFilteredMouseMove(this.results);
            this.dropdown.delegate(resultsSelector, "mousemove-filtered", this.bind(this.highlightUnderEvent));

            installDebouncedScroll(80, this.results);
            this.dropdown.delegate(resultsSelector, "scroll-debounced", this.bind(this.loadMoreIfNeeded));

            // if jquery.mousewheel plugin is installed we can prevent out-of-bounds scrolling of results via mousewheel
            if ($.fn.mousewheel) {
                results.mousewheel(function (e, delta, deltaX, deltaY) {
                    var top = results.scrollTop(), height;
                    if (deltaY > 0 && top - deltaY <= 0) {
                        results.scrollTop(0);
                        killEvent(e);
                    } else if (deltaY < 0 && results.get(0).scrollHeight - results.scrollTop() + deltaY <= results.height()) {
                        results.scrollTop(results.get(0).scrollHeight - results.height());
                        killEvent(e);
                    }
                });
            }

            installKeyUpChangeEvent(search);
            search.bind("keyup-change", this.bind(this.updateResults));
            search.bind("focus", function () { search.addClass("select2-focused"); if (search.val() === " ") search.val(""); });
            search.bind("blur", function () { search.removeClass("select2-focused");});

            this.dropdown.delegate(resultsSelector, "mouseup", this.bind(function (e) {
                if ($(e.target).closest(".select2-result-selectable:not(.select2-disabled)").length > 0) {
                    this.highlightUnderEvent(e);
                    this.selectHighlighted(e);
                } else {
                    this.focusSearch();
                }
                killEvent(e);
            }));

            // trap all mouse events from leaving the dropdown. sometimes there may be a modal that is listening
            // for mouse events outside of itself so it can close itself. since the dropdown is now outside the select2's
            // dom it will trigger the popup close, which is not what we want
            this.dropdown.bind("click mouseup mousedown", function (e) { e.stopPropagation(); });

            if ($.isFunction(this.opts.initSelection)) {
                // initialize selection based on the current value of the source element
                this.initSelection();

                // if the user has provided a function that can set selection based on the value of the source element
                // we monitor the change event on the element and trigger it, allowing for two way synchronization
                this.monitorSource();
            }

            if (opts.element.is(":disabled") || opts.element.is("[readonly='readonly']")) this.disable();
        },

        // abstract
        destroy: function () {
            var select2 = this.opts.element.data("select2");
            if (select2 !== undefined) {
                select2.container.remove();
                select2.dropdown.remove();
                select2.opts.element
                    .removeData("select2")
                    .unbind(".select2")
                    .show();
            }
        },

        // abstract
        prepareOpts: function (opts) {
            var element, select, idKey, ajaxUrl;

            element = opts.element;

            if (element.get(0).tagName.toLowerCase() === "select") {
                this.select = select = opts.element;
            }

            if (select) {
                // these options are not allowed when attached to a select because they are picked up off the element itself
                $.each(["id", "multiple", "ajax", "query", "createSearchChoice", "initSelection", "data", "tags"], function () {
                    if (this in opts) {
                        throw new Error("Option '" + this + "' is not allowed for Select2 when attached to a <select> element.");
                    }
                });
            }

            opts = $.extend({}, {
                populateResults: function(container, results, query) {
                    var populate,  data, result, children, id=this.opts.id, self=this;

                    populate=function(results, container, depth) {

                        var i, l, result, selectable, compound, node, label, innerContainer, formatted;
                        for (i = 0, l = results.length; i < l; i = i + 1) {

                            result=results[i];
                            selectable=id(result) !== undefined;
                            compound=result.children && result.children.length > 0;

                            node=$("<li></li>");
                            node.addClass("select2-results-dept-"+depth);
                            node.addClass("select2-result");
                            node.addClass(selectable ? "select2-result-selectable" : "select2-result-unselectable");
                            if (compound) { node.addClass("select2-result-with-children"); }
                            node.addClass(self.opts.formatResultCssClass(result));

                            label=$("<div></div>");
                            label.addClass("select2-result-label");

                            formatted=opts.formatResult(result, label, query);
                            if (formatted!==undefined) {
                                label.html(self.opts.escapeMarkup(formatted));
                            }

                            node.append(label);

                            if (compound) {

                                innerContainer=$("<ul></ul>");
                                innerContainer.addClass("select2-result-sub");
                                populate(result.children, innerContainer, depth+1);
                                node.append(innerContainer);
                            }

                            node.data("select2-data", result);
                            container.append(node);
                        }
                    };

                    populate(results, container, 0);
                }
            }, $.fn.select2.defaults, opts);

            if (typeof(opts.id) !== "function") {
                idKey = opts.id;
                opts.id = function (e) { return e[idKey]; };
            }

            if (select) {
                opts.query = this.bind(function (query) {
                    var data = { results: [], more: false },
                        term = query.term,
                        children, firstChild, process;

                    process=function(element, collection) {
                        var group;
                        if (element.is("option")) {
                            if (query.matcher(term, element.text(), element)) {
                                collection.push({id:element.attr("value"), text:element.text(), element: element.get(), css: element.attr("class")});
                            }
                        } else if (element.is("optgroup")) {
                            group={text:element.attr("label"), children:[], element: element.get(), css: element.attr("class")};
                            element.children().each2(function(i, elm) { process(elm, group.children); });
                            if (group.children.length>0) {
                                collection.push(group);
                            }
                        }
                    };

                    children=element.children();

                    // ignore the placeholder option if there is one
                    if (this.getPlaceholder() !== undefined && children.length > 0) {
                        firstChild = children[0];
                        if ($(firstChild).text() === "") {
                            children=children.not(firstChild);
                        }
                    }

                    children.each2(function(i, elm) { process(elm, data.results); });

                    query.callback(data);
                });
                // this is needed because inside val() we construct choices from options and there id is hardcoded
                opts.id=function(e) { return e.id; };
                opts.formatResultCssClass = function(data) { return data.css; }
            } else {
                if (!("query" in opts)) {
                    if ("ajax" in opts) {
                        ajaxUrl = opts.element.data("ajax-url");
                        if (ajaxUrl && ajaxUrl.length > 0) {
                            opts.ajax.url = ajaxUrl;
                        }
                        opts.query = ajax(opts.ajax);
                    } else if ("data" in opts) {
                        opts.query = local(opts.data);
                    } else if ("tags" in opts) {
                        opts.query = tags(opts.tags);
                        opts.createSearchChoice = function (term) { return {id: term, text: term}; };
                        opts.initSelection = function (element, callback) {
                            var data = [];
                            $(splitVal(element.val(), opts.separator)).each(function () {
                                var id = this, text = this, tags=opts.tags;
                                if ($.isFunction(tags)) tags=tags();
                                $(tags).each(function() { if (equal(this.id, id)) { text = this.text; return false; } });
                                data.push({id: id, text: text});
                            });

                            callback(data);
                        };
                    }
                }
            }
            if (typeof(opts.query) !== "function") {
                throw "query function not defined for Select2 " + opts.element.attr("id");
            }

            return opts;
        },

        /**
         * Monitor the original element for changes and update select2 accordingly
         */
        // abstract
        monitorSource: function () {
            this.opts.element.bind("change.select2", this.bind(function (e) {
                if (this.opts.element.data("select2-change-triggered") !== true) {
                    this.initSelection();
                }
            }));
        },

        /**
         * Triggers the change event on the source element
         */
        // abstract
        triggerChange: function (details) {

            details = details || {};
            details= $.extend({}, details, { type: "change", val: this.val() });
            // prevents recursive triggering
            this.opts.element.data("select2-change-triggered", true);
            this.opts.element.trigger(details);
            this.opts.element.data("select2-change-triggered", false);

            // some validation frameworks ignore the change event and listen instead to keyup, click for selects
            // so here we trigger the click event manually
            this.opts.element.click();

            // ValidationEngine ignorea the change event and listens instead to blur
            // so here we trigger the blur event manually if so desired
            if (this.opts.blurOnChange)
                this.opts.element.blur();
        },


        // abstract
        enable: function() {
            if (this.enabled) return;

            this.enabled=true;
            this.container.removeClass("select2-container-disabled");
            this.opts.element.removeAttr("disabled");
        },

        // abstract
        disable: function() {
            if (!this.enabled) return;

            this.close();

            this.enabled=false;
            this.container.addClass("select2-container-disabled");
            this.opts.element.attr("disabled", "disabled");
        },

        // abstract
        opened: function () {
            return this.container.hasClass("select2-dropdown-open");
        },

        // abstract
        positionDropdown: function() {
            var offset = this.container.offset(),
                height = this.container.outerHeight(false),
                width = this.container.outerWidth(false),
                dropHeight = this.dropdown.outerHeight(false),
                viewportBottom = $(window).scrollTop() + document.documentElement.clientHeight,
                dropTop = offset.top + height,
                dropLeft = offset.left,
                enoughRoomBelow = dropTop + dropHeight <= viewportBottom,
                enoughRoomAbove = (offset.top - dropHeight) >= this.body().scrollTop(),
                aboveNow = this.dropdown.hasClass("select2-drop-above"),
                bodyOffset,
                above,
                css;

            // console.log("below/ droptop:", dropTop, "dropHeight", dropHeight, "sum", (dropTop+dropHeight)+" viewport bottom", viewportBottom, "enough?", enoughRoomBelow);
            // console.log("above/ offset.top", offset.top, "dropHeight", dropHeight, "top", (offset.top-dropHeight), "scrollTop", this.body().scrollTop(), "enough?", enoughRoomAbove);

            // fix positioning when body has an offset and is not position: static

            if (this.body().css('position') !== 'static') {
                bodyOffset = this.body().offset();
                dropTop -= bodyOffset.top;
                dropLeft -= bodyOffset.left;
            }

            // always prefer the current above/below alignment, unless there is not enough room

            if (aboveNow) {
                above = true;
                if (!enoughRoomAbove && enoughRoomBelow) above = false;
            } else {
                above = false;
                if (!enoughRoomBelow && enoughRoomAbove) above = true;
            }

            if (above) {
                dropTop = offset.top - dropHeight;
                this.container.addClass("select2-drop-above");
                this.dropdown.addClass("select2-drop-above");
            }
            else {
                this.container.removeClass("select2-drop-above");
                this.dropdown.removeClass("select2-drop-above");
            }

            css = $.extend({
                top: dropTop,
                left: dropLeft,
                width: width
            }, evaluate(this.opts.dropdownCss));

            this.dropdown.css(css);
        },

        // abstract
        shouldOpen: function() {
            var event;

            if (this.opened()) return false;

            event = $.Event("open");
            this.opts.element.trigger(event);
            return !event.isDefaultPrevented();
        },

        // abstract
        clearDropdownAlignmentPreference: function() {
            // clear the classes used to figure out the preference of where the dropdown should be opened
            this.container.removeClass("select2-drop-above");
            this.dropdown.removeClass("select2-drop-above");
        },

        /**
         * Opens the dropdown
         *
         * @return {Boolean} whether or not dropdown was opened. This method will return false if, for example,
         * the dropdown is already open, or if the 'open' event listener on the element called preventDefault().
         */
        // abstract
        open: function () {

            if (!this.shouldOpen()) return false;

            window.setTimeout(this.bind(this.opening), 1);

            return true;
        },

        /**
         * Performs the opening of the dropdown
         */
        // abstract
        opening: function() {
            var cid = this.containerId, selector = this.containerSelector,
                scroll = "scroll." + cid, resize = "resize." + cid;

            this.container.parents().each(function() {
                $(this).bind(scroll, function() {
                    var s2 = $(selector);
                    if (s2.length == 0) {
                        $(this).unbind(scroll);
                    }
                    s2.select2("close");
                });
            });

            window.setTimeout(function() {
                // this is done inside a timeout because IE will sometimes fire a resize event while opening
                // the dropdown and that causes this handler to immediately close it. this way the dropdown
                // has a chance to fully open before we start listening to resize events
                $(window).bind(resize, function() {
                    var s2 = $(selector);
                    if (s2.length == 0) {
                        $(window).unbind(resize);
                    }
                    s2.select2("close");
                })
            }, 10);

            this.clearDropdownAlignmentPreference();

            if (this.search.val() === " ") { this.search.val(""); }

            this.container.addClass("select2-dropdown-open").addClass("select2-container-active");

            this.updateResults(true);

            if(this.dropdown[0] !== this.body().children().last()[0]) {
                this.dropdown.detach().appendTo(this.body());
            }

            this.dropdown.show();

            this.positionDropdown();
            this.dropdown.addClass("select2-drop-active");

            this.ensureHighlightVisible();

            this.focusSearch();
        },

        // abstract
        close: function () {
            if (!this.opened()) return;

            var self = this;

            this.container.parents().each(function() {
                $(this).unbind("scroll." + self.containerId);
            });
            $(window).unbind("resize." + this.containerId);

            this.clearDropdownAlignmentPreference();

            this.dropdown.hide();
            this.container.removeClass("select2-dropdown-open").removeClass("select2-container-active");
            this.results.empty();
            this.clearSearch();

            this.opts.element.trigger($.Event("close"));
        },

        // abstract
        clearSearch: function () {

        },

        // abstract
        ensureHighlightVisible: function () {
            var results = this.results, children, index, child, hb, rb, y, more;

            index = this.highlight();

            if (index < 0) return;

            if (index == 0) {

                // if the first element is highlighted scroll all the way to the top,
                // that way any unselectable headers above it will also be scrolled
                // into view

                results.scrollTop(0);
                return;
            }

            children = results.find(".select2-result-selectable");

            child = $(children[index]);

            hb = child.offset().top + child.outerHeight(true);

            // if this is the last child lets also make sure select2-more-results is visible
            if (index === children.length - 1) {
                more = results.find("li.select2-more-results");
                if (more.length > 0) {
                    hb = more.offset().top + more.outerHeight(true);
                }
            }

            rb = results.offset().top + results.outerHeight(true);
            if (hb > rb) {
                results.scrollTop(results.scrollTop() + (hb - rb));
            }
            y = child.offset().top - results.offset().top;

            // make sure the top of the element is visible
            if (y < 0 && child.css('display') != 'none' ) {
                results.scrollTop(results.scrollTop() + y); // y is negative
            }
        },

        // abstract
        moveHighlight: function (delta) {
            var choices = this.results.find(".select2-result-selectable"),
                index = this.highlight();

            while (index > -1 && index < choices.length) {
                index += delta;
                var choice = $(choices[index]);
                if (choice.hasClass("select2-result-selectable") && !choice.hasClass("select2-disabled")) {
                    this.highlight(index);
                    break;
                }
            }
        },

        // abstract
        highlight: function (index) {
            var choices = this.results.find(".select2-result-selectable").not(".select2-disabled");

            if (arguments.length === 0) {
                return indexOf(choices.filter(".select2-highlighted")[0], choices.get());
            }

            if (index >= choices.length) index = choices.length - 1;
            if (index < 0) index = 0;

            choices.removeClass("select2-highlighted");

            $(choices[index]).addClass("select2-highlighted");
            this.ensureHighlightVisible();

        },

        // abstract
        countSelectableResults: function() {
            return this.results.find(".select2-result-selectable").not(".select2-disabled").length;
        },

        // abstract
        highlightUnderEvent: function (event) {
            var el = $(event.target).closest(".select2-result-selectable");
            if (el.length > 0 && !el.is(".select2-highlighted")) {
        		var choices = this.results.find('.select2-result-selectable');
                this.highlight(choices.index(el));
            } else if (el.length == 0) {
                // if we are over an unselectable item remove al highlights
                this.results.find(".select2-highlighted").removeClass("select2-highlighted");
            }
        },

        // abstract
        loadMoreIfNeeded: function () {
            var results = this.results,
                more = results.find("li.select2-more-results"),
                below, // pixels the element is below the scroll fold, below==0 is when the element is starting to be visible
                offset = -1, // index of first element without data
                page = this.resultsPage + 1,
                self=this,
                term=this.search.val(),
                context=this.context;

            if (more.length === 0) return;
            below = more.offset().top - results.offset().top - results.height();

            if (below <= 0) {
                more.addClass("select2-active");
                this.opts.query({
                        term: term,
                        page: page,
                        context: context,
                        matcher: this.opts.matcher,
                        callback: this.bind(function (data) {

                    // ignore a response if the select2 has been closed before it was received
                    if (!self.opened()) return;


                    self.opts.populateResults.call(this, results, data.results, {term: term, page: page, context:context});

                    if (data.more===true) {
                        more.detach().appendTo(results).text(self.opts.formatLoadMore(page+1));
                        window.setTimeout(function() { self.loadMoreIfNeeded(); }, 10);
                    } else {
                        more.remove();
                    }
                    self.positionDropdown();
                    self.resultsPage = page;
                })});
            }
        },

        /**
         * Default tokenizer function which does nothing
         */
        tokenize: function() {

        },

        /**
         * @param initial whether or not this is the call to this method right after the dropdown has been opened
         */
        // abstract
        updateResults: function (initial) {
            var search = this.search, results = this.results, opts = this.opts, data, self=this, input;

            // if the search is currently hidden we do not alter the results
            if (initial !== true && (this.showSearchInput === false || !this.opened())) {
                return;
            }

            search.addClass("select2-active");

            function postRender() {
                results.scrollTop(0);
                search.removeClass("select2-active");
                self.positionDropdown();
            }

            function render(html) {
                results.html(self.opts.escapeMarkup(html));
                postRender();
            }

            if (opts.maximumSelectionSize >=1) {
                data = this.data();
                if ($.isArray(data) && data.length >= opts.maximumSelectionSize && checkFormatter(opts.formatSelectionTooBig, "formatSelectionTooBig")) {
            	    render("<li class='select2-selection-limit'>" + opts.formatSelectionTooBig(opts.maximumSelectionSize) + "</li>");
            	    return;
                }
            }

            if (search.val().length < opts.minimumInputLength) {
                if (checkFormatter(opts.formatInputTooShort, "formatInputTooShort")) {
                    render("<li class='select2-no-results'>" + opts.formatInputTooShort(search.val(), opts.minimumInputLength) + "</li>");
                } else {
                    render("");
                }
                return;
            }
            else if (opts.formatSearching()) {
                render("<li class='select2-searching'>" + opts.formatSearching() + "</li>");
            }

            // give the tokenizer a chance to pre-process the input
            input = this.tokenize();
            if (input != undefined && input != null) {
                search.val(input);
            }

            this.resultsPage = 1;
            opts.query({
                    term: search.val(),
                    page: this.resultsPage,
                    context: null,
                    matcher: opts.matcher,
                    callback: this.bind(function (data) {
                var def; // default choice

                // ignore a response if the select2 has been closed before it was received
                if (!this.opened()) return;

                // save context, if any
                this.context = (data.context===undefined) ? null : data.context;

                // create a default choice and prepend it to the list
                if (this.opts.createSearchChoice && search.val() !== "") {
                    def = this.opts.createSearchChoice.call(null, search.val(), data.results);
                    if (def !== undefined && def !== null && self.id(def) !== undefined && self.id(def) !== null) {
                        if ($(data.results).filter(
                            function () {
                                return equal(self.id(this), self.id(def));
                            }).length === 0) {
                            data.results.unshift(def);
                        }
                    }
                }

                if (data.results.length === 0 && checkFormatter(opts.formatNoMatches, "formatNoMatches")) {
                    render("<li class='select2-no-results'>" + opts.formatNoMatches(search.val()) + "</li>");
                    return;
                }

                results.empty();
                self.opts.populateResults.call(this, results, data.results, {term: search.val(), page: this.resultsPage, context:null});

                if (data.more === true && checkFormatter(opts.formatLoadMore, "formatLoadMore")) {
                    results.append("<li class='select2-more-results'>" + self.opts.escapeMarkup(opts.formatLoadMore(this.resultsPage)) + "</li>");
                    window.setTimeout(function() { self.loadMoreIfNeeded(); }, 10);
                }

                this.postprocessResults(data, initial);

                postRender();
            })});
        },

        // abstract
        cancel: function () {
            this.close();
        },

        // abstract
        blur: function () {
            this.close();
            this.container.removeClass("select2-container-active");
            this.dropdown.removeClass("select2-drop-active");
            // synonymous to .is(':focus'), which is available in jquery >= 1.6
            if (this.search[0] === document.activeElement) { this.search.blur(); }
            this.clearSearch();
            this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
            this.opts.element.triggerHandler("blur");
        },

        // abstract
        focusSearch: function () {
            // need to do it here as well as in timeout so it works in IE
            this.search.show();
            this.search.focus();

            /* we do this in a timeout so that current event processing can complete before this code is executed.
             this makes sure the search field is focussed even if the current event would blur it */
            window.setTimeout(this.bind(function () {
                // reset the value so IE places the cursor at the end of the input box
                this.search.show();
                this.search.focus();
                this.search.val(this.search.val());
            }), 10);
        },

        // abstract
        selectHighlighted: function () {
            var index=this.highlight(),
                highlighted=this.results.find(".select2-highlighted").not(".select2-disabled"),
                data = highlighted.closest('.select2-result-selectable').data("select2-data");
            if (data) {
                highlighted.addClass("select2-disabled");
                this.highlight(index);
                this.onSelect(data);
            }
        },

        // abstract
        getPlaceholder: function () {
            return this.opts.element.attr("placeholder") ||
                this.opts.element.attr("data-placeholder") || // jquery 1.4 compat
                this.opts.element.data("placeholder") ||
                this.opts.placeholder;
        },

        /**
         * Get the desired width for the container element.  This is
         * derived first from option `width` passed to select2, then
         * the inline 'style' on the original element, and finally
         * falls back to the jQuery calculated element width.
         */
        // abstract
        initContainerWidth: function () {
            function resolveContainerWidth() {
                var style, attrs, matches, i, l;

                if (this.opts.width === "off") {
                    return null;
                } else if (this.opts.width === "element"){
                    return this.opts.element.outerWidth(false) === 0 ? 'auto' : this.opts.element.outerWidth(false) + 'px';
                } else if (this.opts.width === "copy" || this.opts.width === "resolve") {
                    // check if there is inline style on the element that contains width
                    style = this.opts.element.attr('style');
                    if (style !== undefined) {
                        attrs = style.split(';');
                        for (i = 0, l = attrs.length; i < l; i = i + 1) {
                            matches = attrs[i].replace(/\s/g, '')
                                .match(/width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/);
                            if (matches !== null && matches.length >= 1)
                                return matches[1];
                        }
                    }

                    if (this.opts.width === "resolve") {
                        // next check if css('width') can resolve a width that is percent based, this is sometimes possible
                        // when attached to input type=hidden or elements hidden via css
                        style = this.opts.element.css('width');
                        if (style.indexOf("%") > 0) return style;

                        // finally, fallback on the calculated width of the element
                        return (this.opts.element.outerWidth(false) === 0 ? 'auto' : this.opts.element.outerWidth(false) + 'px');
                    }

                    return null;
                } else if ($.isFunction(this.opts.width)) {
                    return this.opts.width();
                } else {
                    return this.opts.width;
               }
            };

            var width = resolveContainerWidth.call(this);
            if (width !== null) {
                this.container.attr("style", "width: "+width);
            }
        }
    });

    SingleSelect2 = clazz(AbstractSelect2, {

        // single

		createContainer: function () {
            var container = $("<div></div>", {
                "class": "select2-container"
            }).html([
                "    <a href='javascript:void(0)' onclick='return false;' class='select2-choice'>",
                "   <span></span><abbr class='select2-search-choice-close' style='display:none;'></abbr>",
                "   <div><b></b></div>" ,
                "</a>",
                "    <div class='select2-drop select2-offscreen'>" ,
                "   <div class='select2-search'>" ,
                "       <input type='text' autocomplete='off' class='select2-input'/>" ,
                "   </div>" ,
                "   <ul class='select2-results'>" ,
                "   </ul>" ,
                "</div>"].join(""));
            return container;
        },

        // single
        opening: function () {
            this.search.show();
            this.parent.opening.apply(this, arguments);
            this.dropdown.removeClass("select2-offscreen");
        },

        // single
        close: function () {
            if (!this.opened()) return;
            this.parent.close.apply(this, arguments);
            this.dropdown.removeAttr("style").addClass("select2-offscreen").insertAfter(this.selection).show();
        },

        // single
        focus: function () {
            this.close();
            this.selection.focus();
        },

        // single
        isFocused: function () {
            return this.selection[0] === document.activeElement;
        },

        // single
        cancel: function () {
            this.parent.cancel.apply(this, arguments);
            this.selection.focus();
        },

        // single
        initContainer: function () {

            var selection,
                container = this.container,
                dropdown = this.dropdown,
                clickingInside = false;

            this.selection = selection = container.find(".select2-choice");

            this.search.bind("keydown", this.bind(function (e) {
                if (!this.enabled) return;

                if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
                    // prevent the page from scrolling
                    killEvent(e);
                    return;
                }

                if (this.opened()) {
                    switch (e.which) {
                        case KEY.UP:
                        case KEY.DOWN:
                            this.moveHighlight((e.which === KEY.UP) ? -1 : 1);
                            killEvent(e);
                            return;
                        case KEY.TAB:
                        case KEY.ENTER:
                            this.selectHighlighted();
                            killEvent(e);
                            return;
                        case KEY.ESC:
                            this.cancel(e);
                            killEvent(e);
                            return;
                    }
                } else {

                    if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e) || e.which === KEY.ESC) {
                        return;
                    }

                    if (this.opts.openOnEnter === false && e.which === KEY.ENTER) {
                        return;
                    }

                    this.open();

                    if (e.which === KEY.ENTER) {
                        // do not propagate the event otherwise we open, and propagate enter which closes
                        return;
                    }
                }
            }));

            this.search.bind("focus", this.bind(function() {
                this.selection.attr("tabIndex", "-1");
            }));
            this.search.bind("blur", this.bind(function() {
                if (!this.opened()) this.container.removeClass("select2-container-active");
                window.setTimeout(this.bind(function() {
                    // restore original tab index
                    var ti=this.opts.element.attr("tabIndex");
                    if (ti) {
                        this.selection.attr("tabIndex", ti);
                    } else {
                        this.selection.removeAttr("tabIndex");
                    }
                }), 10);
            }));

            selection.delegate("abbr", "mousedown", this.bind(function (e) {
                if (!this.enabled) return;
                this.clear();
                killEventImmediately(e);
                this.close();
                this.triggerChange();
                this.selection.focus();
            }));

            selection.bind("mousedown", this.bind(function (e) {
                clickingInside = true;

                if (this.opened()) {
                    this.close();
                    this.selection.focus();
                } else if (this.enabled) {
                    this.open();
                }

                clickingInside = false;
            }));

            dropdown.bind("mousedown", this.bind(function() { this.search.focus(); }));

            selection.bind("focus", this.bind(function() {
                this.container.addClass("select2-container-active");
                // hide the search so the tab key does not focus on it
                this.search.attr("tabIndex", "-1");
            }));

            selection.bind("blur", this.bind(function() {
                if (!this.opened()) {
                    this.container.removeClass("select2-container-active");
                }
                window.setTimeout(this.bind(function() { this.search.attr("tabIndex", this.opts.element.attr("tabIndex")); }), 10);
            }));

            selection.bind("keydown", this.bind(function(e) {
                if (!this.enabled) return;

                if (e.which == KEY.DOWN || e.which == KEY.UP
                    || (e.which == KEY.ENTER && this.opts.openOnEnter)) {
                    this.open();
                    killEvent(e);
                    return;
                }

                if (e.which == KEY.DELETE || e.which == KEY.BACKSPACE) {
                    if (this.opts.allowClear) {
                        this.clear();
                    }
                    killEvent(e);
                    return;
                }
            }));
            selection.bind("keypress", this.bind(function(e) {
                var key = String.fromCharCode(e.which);
                this.search.val(key);
                this.open();
            }));

            this.setPlaceholder();

            this.search.bind("focus", this.bind(function() {
                this.container.addClass("select2-container-active");
            }));
        },

        // single
        clear: function() {
            this.opts.element.val("");
            this.selection.find("span").empty();
            this.selection.removeData("select2-data");
            this.setPlaceholder();
        },

        /**
         * Sets selection based on source element's value
         */
        // single
        initSelection: function () {
            var selected;
            if (this.opts.element.val() === "" && this.opts.element.text() === "") {
                this.close();
                this.setPlaceholder();
            } else {
                var self = this;
                this.opts.initSelection.call(null, this.opts.element, function(selected){
                    if (selected !== undefined && selected !== null) {
                        self.updateSelection(selected);
                        self.close();
                        self.setPlaceholder();
                    }
                });
            }
        },

        // single
        prepareOpts: function () {
            var opts = this.parent.prepareOpts.apply(this, arguments);

            if (opts.element.get(0).tagName.toLowerCase() === "select") {
                // install the selection initializer
                opts.initSelection = function (element, callback) {
                    var selected = element.find(":selected");
                    // a single select box always has a value, no need to null check 'selected'
                    if ($.isFunction(callback))
                        callback({id: selected.attr("value"), text: selected.text(), element:selected});
                };
            }

            return opts;
        },

        // single
        setPlaceholder: function () {
            var placeholder = this.getPlaceholder();

            if (this.opts.element.val() === "" && placeholder !== undefined) {

                // check for a first blank option if attached to a select
                if (this.select && this.select.find("option:first").text() !== "") return;

                this.selection.find("span").html(this.opts.escapeMarkup(placeholder));

                this.selection.addClass("select2-default");

                this.selection.find("abbr").hide();
            }
        },

        // single
        postprocessResults: function (data, initial) {
            var selected = 0, self = this, showSearchInput = true;

            // find the selected element in the result list

            this.results.find(".select2-result-selectable").each2(function (i, elm) {
                if (equal(self.id(elm.data("select2-data")), self.opts.element.val())) {
                    selected = i;
                    return false;
                }
            });

            // and highlight it

            this.highlight(selected);

            // hide the search box if this is the first we got the results and there are a few of them

            if (initial === true) {
                showSearchInput = this.showSearchInput = countResults(data.results) >= this.opts.minimumResultsForSearch;
                this.dropdown.find(".select2-search")[showSearchInput ? "removeClass" : "addClass"]("select2-search-hidden");

                //add "select2-with-searchbox" to the container if search box is shown
                $(this.dropdown, this.container)[showSearchInput ? "addClass" : "removeClass"]("select2-with-searchbox");
            }

        },

        // single
        onSelect: function (data) {
            var old = this.opts.element.val();

            this.opts.element.val(this.id(data));
            this.updateSelection(data);
            this.close();
            this.selection.focus();

            if (!equal(old, this.id(data))) { this.triggerChange(); }
        },

        // single
        updateSelection: function (data) {

            var container=this.selection.find("span"), formatted;

            this.selection.data("select2-data", data);

            container.empty();
            formatted=this.opts.formatSelection(data, container);
            if (formatted !== undefined) {
                container.append(this.opts.escapeMarkup(formatted));
            }

            this.selection.removeClass("select2-default");

            if (this.opts.allowClear && this.getPlaceholder() !== undefined) {
                this.selection.find("abbr").show();
            }
        },

        // single
        val: function () {
            var val, data = null, self = this;

            if (arguments.length === 0) {
                return this.opts.element.val();
            }

            val = arguments[0];

            if (this.select) {
                this.select
                    .val(val)
                    .find(":selected").each2(function (i, elm) {
                        data = {id: elm.attr("value"), text: elm.text()};
                        return false;
                    });
                this.updateSelection(data);
                this.setPlaceholder();
            } else {
                if (this.opts.initSelection === undefined) {
                    throw new Error("cannot call val() if initSelection() is not defined");
                }
                // val is an id. !val is true for [undefined,null,'']
                if (!val) {
                    this.clear();
                    return;
                }
                this.opts.element.val(val);
                this.opts.initSelection(this.opts.element, function(data){
                    self.opts.element.val(!data ? "" : self.id(data));
                    self.updateSelection(data);
                    self.setPlaceholder();
                });
            }
        },

        // single
        clearSearch: function () {
            this.search.val("");
        },

        // single
        data: function(value) {
            var data;

            if (arguments.length === 0) {
                data = this.selection.data("select2-data");
                if (data == undefined) data = null;
                return data;
            } else {
                if (!value || value === "") {
                    this.clear();
                } else {
                    this.opts.element.val(!value ? "" : this.id(value));
                    this.updateSelection(value);
                }
            }
        }
    });

    MultiSelect2 = clazz(AbstractSelect2, {

        // multi
        createContainer: function () {
            var container = $("<div></div>", {
                "class": "select2-container select2-container-multi"
            }).html([
                "    <ul class='select2-choices'>",
                //"<li class='select2-search-choice'><span>California</span><a href="javascript:void(0)" class="select2-search-choice-close"></a></li>" ,
                "  <li class='select2-search-field'>" ,
                "    <input type='text' autocomplete='off' class='select2-input'>" ,
                "  </li>" ,
                "</ul>" ,
                "<div class='select2-drop select2-drop-multi' style='display:none;'>" ,
                "   <ul class='select2-results'>" ,
                "   </ul>" ,
                "</div>"].join(""));
			return container;
        },

        // multi
        prepareOpts: function () {
            var opts = this.parent.prepareOpts.apply(this, arguments);

            // TODO validate placeholder is a string if specified

            if (opts.element.get(0).tagName.toLowerCase() === "select") {
                // install sthe selection initializer
                opts.initSelection = function (element,callback) {

                    var data = [];
                    element.find(":selected").each2(function (i, elm) {
                        data.push({id: elm.attr("value"), text: elm.text(), element: elm});
                    });

                    if ($.isFunction(callback))
                        callback(data);
                };
            }

            return opts;
        },

        // multi
        initContainer: function () {

            var selector = ".select2-choices", selection;

            this.searchContainer = this.container.find(".select2-search-field");
            this.selection = selection = this.container.find(selector);

            this.search.bind("keydown", this.bind(function (e) {
                if (!this.enabled) return;

                if (e.which === KEY.BACKSPACE && this.search.val() === "") {
                    this.close();

                    var choices,
                        selected = selection.find(".select2-search-choice-focus");
                    if (selected.length > 0) {
                        this.unselect(selected.first());
                        this.search.width(10);
                        killEvent(e);
                        return;
                    }

                    choices = selection.find(".select2-search-choice:not(.select2-locked)");
                    if (choices.length > 0) {
                        choices.last().addClass("select2-search-choice-focus");
                    }
                } else {
                    selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
                }

                if (this.opened()) {
                    switch (e.which) {
                    case KEY.UP:
                    case KEY.DOWN:
                        this.moveHighlight((e.which === KEY.UP) ? -1 : 1);
                        killEvent(e);
                        return;
                    case KEY.ENTER:
                    case KEY.TAB:
                        this.selectHighlighted();
                        killEvent(e);
                        return;
                    case KEY.ESC:
                        this.cancel(e);
                        killEvent(e);
                        return;
                    }
                }

                if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e)
                 || e.which === KEY.BACKSPACE || e.which === KEY.ESC) {
                    return;
                }

                if (this.opts.openOnEnter === false && e.which === KEY.ENTER) {
                    return;
                }

                this.open();

                if (e.which === KEY.PAGE_UP || e.which === KEY.PAGE_DOWN) {
                    // prevent the page from scrolling
                    killEvent(e);
                }
            }));

            this.search.bind("keyup", this.bind(this.resizeSearch));

            this.search.bind("blur", this.bind(function(e) {
                this.container.removeClass("select2-container-active");
                this.search.removeClass("select2-focused");
                this.clearSearch();
                e.stopImmediatePropagation();
            }));

            this.container.delegate(selector, "mousedown", this.bind(function (e) {
                if (!this.enabled) return;
                if ($(e.target).closest(".select2-search-choice").length > 0) {
                    // clicked inside a select2 search choice, do not open
                    return;
                }
                this.clearPlaceholder();
                this.open();
                this.focusSearch();
                e.preventDefault();
            }));

            this.container.delegate(selector, "focus", this.bind(function () {
                if (!this.enabled) return;
                this.container.addClass("select2-container-active");
                this.dropdown.addClass("select2-drop-active");
                this.clearPlaceholder();
            }));

            // set the placeholder if necessary
            this.clearSearch();
        },

        // multi
        enable: function() {
            if (this.enabled) return;

            this.parent.enable.apply(this, arguments);

            this.search.removeAttr("disabled");
        },

        // multi
        disable: function() {
            if (!this.enabled) return;

            this.parent.disable.apply(this, arguments);

            this.search.attr("disabled", true);
        },

        // multi
        initSelection: function () {
            var data;
            if (this.opts.element.val() === "" && this.opts.element.text() === "") {
                this.updateSelection([]);
                this.close();
                // set the placeholder if necessary
                this.clearSearch();
            }
            if (this.select || this.opts.element.val() !== "") {
                var self = this;
                this.opts.initSelection.call(null, this.opts.element, function(data){
                    if (data !== undefined && data !== null) {
                        self.updateSelection(data);
                        self.close();
                        // set the placeholder if necessary
                        self.clearSearch();
                    }
                });
            }
        },

        // multi
        clearSearch: function () {
            var placeholder = this.getPlaceholder();

            if (placeholder !== undefined  && this.getVal().length === 0 && this.search.hasClass("select2-focused") === false) {
                this.search.val(placeholder).addClass("select2-default");
                // stretch the search box to full width of the container so as much of the placeholder is visible as possible
                this.resizeSearch();
            } else {
                // we set this to " " instead of "" and later clear it on focus() because there is a firefox bug
                // that does not properly render the caret when the field starts out blank
                this.search.val(" ").width(10);
            }
        },

        // multi
        clearPlaceholder: function () {
            if (this.search.hasClass("select2-default")) {
                this.search.val("").removeClass("select2-default");
            } else {
                // work around for the space character we set to avoid firefox caret bug
                if (this.search.val() === " ") this.search.val("");
            }
        },

        // multi
        opening: function () {
            this.parent.opening.apply(this, arguments);

            this.clearPlaceholder();
			this.resizeSearch();
            this.focusSearch();
        },

        // multi
        close: function () {
            if (!this.opened()) return;
            this.parent.close.apply(this, arguments);
        },

        // multi
        focus: function () {
            this.close();
            this.search.focus();
        },

        // multi
        isFocused: function () {
            return this.search.hasClass("select2-focused");
        },

        // multi
        updateSelection: function (data) {
            var ids = [], filtered = [], self = this;

            // filter out duplicates
            $(data).each(function () {
                if (indexOf(self.id(this), ids) < 0) {
                    ids.push(self.id(this));
                    filtered.push(this);
                }
            });
            data = filtered;

            this.selection.find(".select2-search-choice").remove();
            $(data).each(function () {
                self.addSelectedChoice(this);
            });
            self.postprocessResults();
        },

        tokenize: function() {
            var input = this.search.val();
            input = this.opts.tokenizer(input, this.data(), this.bind(this.onSelect), this.opts);
            if (input != null && input != undefined) {
                this.search.val(input);
                if (input.length > 0) {
                    this.open();
                }
            }

        },

        // multi
        onSelect: function (data) {
            this.addSelectedChoice(data);
            if (this.select || !this.opts.closeOnSelect) this.postprocessResults();

            if (this.opts.closeOnSelect) {
                this.close();
                this.search.width(10);
            } else {
                if (this.countSelectableResults()>0) {
                    this.search.width(10);
                    this.resizeSearch();
                    this.positionDropdown();
                } else {
                    // if nothing left to select close
                    this.close();
                }
            }

            // since its not possible to select an element that has already been
            // added we do not need to check if this is a new element before firing change
            this.triggerChange({ added: data });

            this.focusSearch();
        },

        // multi
        cancel: function () {
            this.close();
            this.focusSearch();
        },

        addSelectedChoice: function (data) {
            var enableChoice = !data.locked,
                enabledItem = $(
                    "<li class='select2-search-choice'>" +
                    "    <div></div>" +
                    "    <a href='#' onclick='return false;' class='select2-search-choice-close' tabindex='-1'></a>" +
                    "</li>"),
                disabledItem = $(
                    "<li class='select2-search-choice select2-locked'>" +
                    "<div></div>" +
                    "</li>");
            var choice = enableChoice ? enabledItem : disabledItem,
                id = this.id(data),
                val = this.getVal(),
                formatted;

            formatted=this.opts.formatSelection(data, choice.find("div"));
            if (formatted != undefined) {
                choice.find("div").replaceWith("<div>"+this.opts.escapeMarkup(formatted)+"</div>");
            }

            if(enableChoice){
              choice.find(".select2-search-choice-close")
                  .bind("mousedown", killEvent)
                  .bind("click dblclick", this.bind(function (e) {
                  if (!this.enabled) return;

                  $(e.target).closest(".select2-search-choice").fadeOut('fast', this.bind(function(){
                      this.unselect($(e.target));
                      this.selection.find(".select2-search-choice-focus").removeClass("select2-search-choice-focus");
                      this.close();
                      this.focusSearch();
                  })).dequeue();
                  killEvent(e);
              })).bind("focus", this.bind(function () {
                  if (!this.enabled) return;
                  this.container.addClass("select2-container-active");
                  this.dropdown.addClass("select2-drop-active");
              }));
            }

            choice.data("select2-data", data);
            choice.insertBefore(this.searchContainer);

            val.push(id);
            this.setVal(val);
        },

        // multi
        unselect: function (selected) {
            var val = this.getVal(),
                data,
                index;

            selected = selected.closest(".select2-search-choice");

            if (selected.length === 0) {
                throw "Invalid argument: " + selected + ". Must be .select2-search-choice";
            }

            data = selected.data("select2-data");

            index = indexOf(this.id(data), val);

            if (index >= 0) {
                val.splice(index, 1);
                this.setVal(val);
                if (this.select) this.postprocessResults();
            }
            selected.remove();
            this.triggerChange({ removed: data });
        },

        // multi
        postprocessResults: function () {
            var val = this.getVal(),
                choices = this.results.find(".select2-result-selectable"),
                compound = this.results.find(".select2-result-with-children"),
                self = this;

            choices.each2(function (i, choice) {
                var id = self.id(choice.data("select2-data"));
                if (indexOf(id, val) >= 0) {
                    choice.addClass("select2-disabled").removeClass("select2-result-selectable");
                } else {
                    choice.removeClass("select2-disabled").addClass("select2-result-selectable");
                }
            });

            compound.each2(function(i, e) {
                if (!e.is('.select2-result-selectable') && e.find(".select2-result-selectable").length==0) {  // FIX FOR HIRECHAL DATA
                    e.addClass("select2-disabled");
                } else {
                    e.removeClass("select2-disabled");
                }
            });

            if (this.highlight() == -1){
                choices.each2(function (i, choice) {
                    if (!choice.hasClass("select2-disabled") && choice.hasClass("select2-result-selectable")) {
                        self.highlight(0);
                        return false;
                    }
                });
            }

        },

        // multi
        resizeSearch: function () {

            var minimumWidth, left, maxWidth, containerLeft, searchWidth,
            	sideBorderPadding = getSideBorderPadding(this.search);

            minimumWidth = measureTextWidth(this.search) + 10;

            left = this.search.offset().left;

            maxWidth = this.selection.width();
            containerLeft = this.selection.offset().left;

            searchWidth = maxWidth - (left - containerLeft) - sideBorderPadding;
            if (searchWidth < minimumWidth) {
                searchWidth = maxWidth - sideBorderPadding;
            }

            if (searchWidth < 40) {
                searchWidth = maxWidth - sideBorderPadding;
            }
            this.search.width(searchWidth);
        },

        // multi
        getVal: function () {
            var val;
            if (this.select) {
                val = this.select.val();
                return val === null ? [] : val;
            } else {
                val = this.opts.element.val();
                return splitVal(val, this.opts.separator);
            }
        },

        // multi
        setVal: function (val) {
            var unique;
            if (this.select) {
                this.select.val(val);
            } else {
                unique = [];
                // filter out duplicates
                $(val).each(function () {
                    if (indexOf(this, unique) < 0) unique.push(this);
                });
                this.opts.element.val(unique.length === 0 ? "" : unique.join(this.opts.separator));
            }
        },

        // multi
        val: function () {
            var val, data = [], self=this;

            if (arguments.length === 0) {
                return this.getVal();
            }

            val = arguments[0];

            if (!val) {
                this.opts.element.val("");
                this.updateSelection([]);
                this.clearSearch();
                return;
            }

            // val is a list of ids
            this.setVal(val);

            if (this.select) {
                this.select.find(":selected").each(function () {
                    data.push({id: $(this).attr("value"), text: $(this).text()});
                });
                this.updateSelection(data);
            } else {
                if (this.opts.initSelection === undefined) {
                    throw new Error("val() cannot be called if initSelection() is not defined")
                }

                this.opts.initSelection(this.opts.element, function(data){
                    var ids=$(data).map(self.id);
                    self.setVal(ids);
                    self.updateSelection(data);
                    self.clearSearch();
                });
            }
            this.clearSearch();
        },

        // multi
        onSortStart: function() {
            if (this.select) {
                throw new Error("Sorting of elements is not supported when attached to <select>. Attach to <input type='hidden'/> instead.");
            }

            // collapse search field into 0 width so its container can be collapsed as well
            this.search.width(0);
            // hide the container
            this.searchContainer.hide();
        },

        // multi
        onSortEnd:function() {

            var val=[], self=this;

            // show search and move it to the end of the list
            this.searchContainer.show();
            // make sure the search container is the last item in the list
            this.searchContainer.appendTo(this.searchContainer.parent());
            // since we collapsed the width in dragStarted, we resize it here
            this.resizeSearch();

            // update selection

            this.selection.find(".select2-search-choice").each(function() {
                val.push(self.opts.id($(this).data("select2-data")));
            });
            this.setVal(val);
            this.triggerChange();
        },

        // multi
        data: function(values) {
            var self=this, ids;
            if (arguments.length === 0) {
                 return this.selection
                     .find(".select2-search-choice")
                     .map(function() { return $(this).data("select2-data"); })
                     .get();
            } else {
                if (!values) { values = []; }
                ids = $.map(values, function(e) { return self.opts.id(e)});
                this.setVal(ids);
                this.updateSelection(values);
                this.clearSearch();
            }
        }
    });

    $.fn.select2 = function () {

        var args = Array.prototype.slice.call(arguments, 0),
            opts,
            select2,
            value, multiple, allowedMethods = ["val", "destroy", "opened", "open", "close", "focus", "isFocused", "container", "onSortStart", "onSortEnd", "enable", "disable", "positionDropdown", "data"];

        this.each(function () {
            if (args.length === 0 || typeof(args[0]) === "object") {
                opts = args.length === 0 ? {} : $.extend({}, args[0]);
                opts.element = $(this);

                if (opts.element.get(0).tagName.toLowerCase() === "select") {
                    multiple = opts.element.attr("multiple");
                } else {
                    multiple = opts.multiple || false;
                    if ("tags" in opts) {opts.multiple = multiple = true;}
                }

                select2 = multiple ? new MultiSelect2() : new SingleSelect2();
                select2.init(opts);
            } else if (typeof(args[0]) === "string") {

                if (indexOf(args[0], allowedMethods) < 0) {
                    throw "Unknown method: " + args[0];
                }

                value = undefined;
                select2 = $(this).data("select2");
                if (select2 === undefined) return;
                if (args[0] === "container") {
                    value=select2.container;
                } else {
                    value = select2[args[0]].apply(select2, args.slice(1));
                }
                if (value !== undefined) {return false;}
            } else {
                throw "Invalid arguments to select2 plugin: " + args;
            }
        });
        return (value === undefined) ? this : value;
    };

    // plugin defaults, accessible to users
    $.fn.select2.defaults = {
        width: "copy",
        closeOnSelect: true,
        openOnEnter: true,
        containerCss: {},
        dropdownCss: {},
        containerCssClass: "",
        dropdownCssClass: "",
        formatResult: function(result, container, query) {
            var markup=[];
            markMatch(result.text, query.term, markup);
            return markup.join("");
        },
        formatSelection: function (data, container) {
            return data ? data.text : undefined;
        },
        formatResultCssClass: function(data) {return undefined;},
        formatNoMatches: function () { return "No matches found"; },
        formatInputTooShort: function (input, min) { var n = min - input.length; return "Please enter " + n + " more character" + (n == 1? "" : "s"); },
        formatSelectionTooBig: function (limit) { return "You can only select " + limit + " item" + (limit == 1 ? "" : "s"); },
        formatLoadMore: function (pageNumber) { return "Loading more results..."; },
        formatSearching: function () { return "Searching..."; },
        minimumResultsForSearch: 0,
        minimumInputLength: 0,
        maximumSelectionSize: 0,
        id: function (e) { return e.id; },
        matcher: function(term, text) {
            return text.toUpperCase().indexOf(term.toUpperCase()) >= 0;
        },
        separator: ",",
        tokenSeparators: [],
        tokenizer: defaultTokenizer,
        escapeMarkup: function (markup) {
            if (markup && typeof(markup) === "string") {
                return markup.replace(/&/g, "&amp;");
            }
            return markup;
        },
        blurOnChange: false
    };

    // exports
    window.Select2 = {
        query: {
            ajax: ajax,
            local: local,
            tags: tags
        }, util: {
            debounce: debounce,
            markMatch: markMatch
        }, "class": {
            "abstract": AbstractSelect2,
            "single": SingleSelect2,
            "multi": MultiSelect2
        }
    };

}(jQuery));
;
return $;
});

define('$plugin!pickadate', ['$'], function ($) {
var jQuery = $;
/*!
 * pickadate.js v1.3 - 26 November, 2012
 * By Amsul (http://amsul.ca)
 * Hosted on https://github.com/amsul/pickadate.js
 * Licensed under MIT ("expat" flavour) license.
 */
;(function(d,j,o,f){var h=7,q=6,e=q*h,n="div",r="tr",p="/",m="pickadate__",l=d(j),k=Array.isArray||function(t){return{}.toString.call(t)=="[object Array]"},a=function(v,u,t){if(typeof v=="function"){return v.apply(u,t)}},b=function(t){return((t<10)?"0":"")+t},s=function(x,v,t,w,u){v=k(v)?v.join(""):v;w=w?" data-"+w.name+'="'+w.value+'"':"";t=t?' class="'+t+'"':"";u=u?" "+u:"";return"<"+x+w+t+u+">"+v+"</"+x+">"},i=function(y,w,v,u,x){var t="";y.map(function(B,A){A=u?u+A:A;var z=(a(x,y,[A])||"")+"value="+A+(w==A?" selected":"");t+=s("option",B,null,null,z)});return s("select",t,v)},c=function(u){var t;if(k(u)){t=new Date(u[0],u[1],u[2])}else{if(u===true){t=new Date();t.setHours(0,0,0,0)}else{if(!isNaN(u)){t=new Date(u)}}}return{YEAR:t.getFullYear(),MONTH:t.getMonth(),DATE:t.getDate(),DAY:t.getDay(),TIME:t.getTime()}},g=function(N,ah){var K,aa={id:~~(Math.random()*1000000000)},A={open:function(){z();return this},close:function(){u();return this},show:function(aj,ai){Q(--aj,ai);return this},getDate:function(){return(R?R.value:Y.value)},setDate:function(aj,ak,ai){F(c([aj,--ak,ai]));return this}},S=ah.klass,Y=(function(ai){if(ai.nodeName!="INPUT"){ah.format_submit=ah.format_submit||"yyyy-mm-dd"}else{ai.autofocus=(ai==o.activeElement);ai.type="text";ai.readOnly=true}return ai})(N[0]),R=(function(ai){return(ai)?(R=d("<input type=hidden name="+Y.name+ah.hidden_suffix+">").val(Y.value?P(ai):"")[0]):null})(ah.format_submit),O={d:function(){return U.DATE},dd:function(){return b(U.DATE)},ddd:function(){return ah.weekdays_short[U.DAY]},dddd:function(){return ah.weekdays_full[U.DAY]},m:function(){return U.MONTH+1},mm:function(){return b(U.MONTH+1)},mmm:function(){return ah.months_short[U.MONTH]},mmmm:function(){return ah.months_full[U.MONTH]},yy:function(){return U.YEAR.toString().substr(2,2)},yyyy:function(){return U.YEAR},toArray:function(ai){return ai.split(/(?=\b)(d{1,4}|m{1,4}|y{4}|yy)+(\b)/g)}},t=V(),U=y(),C=I(ah.date_min),ae=I(ah.date_max,1),Z=D(),v=(function(ai){if(k(ai)){if(ai[0]===true){aa.disabled=ai.shift()}return ai.map(function(aj){if(!isNaN(aj)){aa.disabledDays=true;return --aj+ah.first_day}--aj[1];return c(aj)})}})(ah.dates_disabled),J=(function(){var ai=function(aj){return this.TIME==aj.TIME||(aa.disabledDays&&v.indexOf(this.DAY)>-1)};if(aa.disabled){return function(aj,ak,al){return(al.map(ai,this).indexOf(true)<0)}}return ai})(),W=(function(ai){if(ah.first_day){ai.push(ai.splice(0,1)[0])}return s("thead",s(r,ai.map(function(aj){return s("th",aj,S.weekdays)})))})((ah.show_weekdays_short?ah.weekdays_short:ah.weekdays_full).slice(0)),x=(function(){K=d(s(n,H(),S.picker_holder)).on({click:M});N.on({keydown:function(ai){if(ai.keyCode==9){u()}},focusin:function(){z()}}).after([K,R]);af();if(Y.autofocus){z()}a(ah.onStart,A)})();function w(){var ai=function(ak){if((ak&&Z.YEAR>=ae.YEAR&&Z.MONTH>=ae.MONTH)||(!ak&&Z.YEAR<=C.YEAR&&Z.MONTH<=C.MONTH)){return""}var aj="month_"+(ak?"next":"prev");return s(n,ah[aj],S[aj],{name:"nav",value:(ak||-1)})};return ai()+ai(1)}function L(){var ai=ah.show_months_full?ah.months_full:ah.months_short;if(ah.month_selector){return i(ai,Z.MONTH,S.month_selector,0,function(aj){return B(aj,Z.YEAR,"disabled ")||""})}return s(n,ai[Z.MONTH],S.month)}function ac(){var ap=Z.YEAR,an=ah.year_selector;if(an){an=(an===true)?5:~~(an/2);var ak=[],ai=ap-an,ao=ad(ai,C.YEAR),am=ap+an+(ao-ai),al=ad(am,ae.YEAR,1);an=am-al;if(an){ao=ad(ai-an,C.YEAR)}for(var aj=0;aj<=al-ao;aj+=1){ak.push(ao+aj)}return i(ak,ap,S.year_selector,ao)}return s(n,ap,S.year)}function E(){var ao,ai,al,ap=[],an="",aq=G(Z.YEAR,Z.MONTH),aj=T(Z.DATE,Z.DAY),am=function(at,au){var av=false,ar=[S.calendar_date,(au?S.day_infocus:S.day_outfocus)];if(at.TIME<C.TIME||at.TIME>ae.TIME||(v&&v.filter(J,at).length)){av=true;ar.push(S.day_disabled)}if(at.TIME==t.TIME){ar.push(S.day_today)}if(at.TIME==U.TIME){ar.push(S.day_selected)}return[ar.join(" "),{name:av?"disabled":"date",value:[at.YEAR,at.MONTH+1,at.DATE,at.DAY,at.TIME].join(p)}]};for(var ak=0;ak<e;ak+=1){ai=ak-aj;ao=c([Z.YEAR,Z.MONTH,ai]);al=am(ao,(ai>0&&ai<=aq));ap.push(s("td",s(n,ao.DATE,al[0],al[1])));if((ak%h)+1==h){an+=s(r,ap.splice(0,h))}}return s("tbody",an,S.calendar_body)}function H(){return s(n,s(n,s(n,w(),S.month_nav)+s(n,L(),S.month_box)+s(n,ac(),S.year_box)+s("table",[W,E()],S.calendar),S.calendar_box),S.calendar_wrap)}function ad(ak,ai,aj){return((aj&&ak<ai)||(!aj&&ak>ai)?ak:ai)}function G(ai,ak){var aj=ak>6?true:false;if(ak==1){return((ai%400)===0||(ai%100)!==0)&&(ai%4)===0?29:28}if(ak%2){return aj?31:30}return aj?30:31}function T(aj,ak){var ai=aj%h,al=ak-ai+(ah.first_day?-1:0);return(ak>=ai)?al:h+al}function V(){return t||(t=c(true))}function y(){return U||(U=(function(ai){if(isNaN(ai)){return t}return c(ai)})(Date.parse(Y.value)))}function F(aj,ak){var ai=ab(S.day_selected);U=k(aj)?{YEAR:+aj[0],MONTH:+aj[1]-1,DATE:+aj[2],DAY:+aj[3],TIME:+aj[4]}:aj;if(ak&&U.MONTH==Z.MONTH){ai.removeClass(S.day_selected);ak.addClass(S.day_selected)}else{Z=U;ag()}Y.value=P();if(R){R.value=P(ah.format_submit)}a(ah.onSelect,A);return aa}function D(){return Z||(Z=y())}function X(aj,ai){return(Z=c([ai,aj,1]))}function I(ai,aj){if(ai===true){return t}if(k(ai)){--ai[1];return c(ai)}if(aj&&ai>0||!aj&&ai<0){return c([t.YEAR,t.MONTH,t.DATE+ai])}ai=aj?Infinity:-Infinity;return{YEAR:ai,MONTH:ai,TIME:ai}}function P(ai){return O.toArray(ai||ah.format).map(function(aj){return a(O[aj])||aj}).join("")}function ab(ai){return K.find("."+ai)}function Q(aj,ai){ai=ai||Z.YEAR;aj=B(aj,ai,C.MONTH,ae.MONTH)||aj;X(aj,ai);ag();return aa}function B(ak,aj,ai,al){if(aj<=C.YEAR&&ak<C.MONTH){return ai}if(aj>=ae.YEAR&&ak>ae.MONTH){return al||ai}}function ag(){K.html(H());af()}function af(){ab(S.month_selector).on({change:function(){Q(+this.value)}});ab(S.year_selector).on({change:function(){Q(Z.MONTH,+this.value)}})}function z(){if(aa.isOpen){return aa}aa.isOpen=true;N.addClass(S.input_focus);K.addClass(S.picker_open);l.on("click.P"+aa.id,function(ai){if(aa.isOpen&&Y!=ai.target){u()}});a(ah.onOpen,A);return aa}function u(){aa.isOpen=false;N.removeClass(S.input_focus);K.removeClass(S.picker_open);l.off("click.P"+aa.id);a(ah.onClose,A);return aa}function M(aj){var ai=d(aj.target),ak=ai.data();aj.stopPropagation();if(ak.date){F(ak.date.split(p),ai);u();return}if(ak.nav){Q(Z.MONTH+ak.nav)}N.focus()}return A};g.defaults={months_full:["January","February","March","April","May","June","July","August","September","October","November","December"],months_short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],weekdays_full:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],weekdays_short:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],month_prev:"&#9664;",month_next:"&#9654;",show_months_full:true,show_weekdays_short:true,format:"d mmmm, yyyy",format_submit:false,hidden_suffix:"_submit",first_day:0,month_selector:false,year_selector:false,date_min:false,date_max:false,dates_disabled:false,disable_picker:false,onOpen:null,onClose:null,onSelect:null,onStart:null,klass:{input_focus:m+"input--focused",picker_holder:m+"holder",picker_open:m+"holder--opened",calendar_wrap:m+"calendar--wrap",calendar_box:m+"calendar--box",calendar:m+"calendar",calendar_body:m+"calendar--body",calendar_date:m+"calendar--date",year:m+"year",year_box:m+"year--box",year_selector:m+"year--selector",month:m+"month",month_box:m+"month--box",month_selector:m+"month--selector",month_nav:m+"month--nav",month_prev:m+"month--prev",month_next:m+"month--next",week:m+"week",weekdays:m+"weekday",day_disabled:m+"day--disabled",day_selected:m+"day--selected",day_today:m+"day--today",day_infocus:m+"day--infocus",day_outfocus:m+"day--outfocus",box_months:m+"holder--months",box_years:m+"holder--years",box_weekdays:m+"holder--weekdays"}};d.fn.pickadate=function(t){var u="pickadate";t=d.extend(true,{},g.defaults,t);if(t.disable_picker){return this}return this.each(function(){var v=d(this);if(!v.data(u)){v.data(u,new g(v,t))}})}})(jQuery,window,document);
;
return $;
});

define('$plugin!details', ['$'], function ($) {
var jQuery = $;
/*! http://mths.be/details v0.1.0 by @mathias | includes http://mths.be/noselect v1.0.3 */
;(function(document, $) {

	var proto = $.fn,
	    details,
	    // :'(
	    isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]',
	    // Feature test for native `<details>` support
	    isDetailsSupported = (function(doc) {
	    	var el = doc.createElement('details'),
	    	    fake,
	    	    root,
	    	    diff;
	    	if (!('open' in el)) {
	    		return false;
	    	}
	    	root = doc.body || (function() {
	    		var de = doc.documentElement;
	    		fake = true;
	    		return de.insertBefore(doc.createElement('body'), de.firstElementChild || de.firstChild);
	    	}());
	    	el.innerHTML = '<summary>a</summary>b';
	    	el.style.display = 'block';
	    	root.appendChild(el);
	    	diff = el.offsetHeight;
	    	el.open = true;
	    	diff = diff != el.offsetHeight;
	    	root.removeChild(el);
	    	if (fake) {
	    		root.parentNode.removeChild(root);
	    	}
	    	return diff;
	    }(document)),
	    toggleOpen = function($details, $detailsSummary, $detailsNotSummary, toggle) {
	    	var isOpen = $details.prop('open'),
	    	    close = isOpen && toggle || !isOpen && !toggle;
	    	if (close) {
	    		$details.removeClass('open').prop('open', false).triggerHandler('close.details');
	    		$detailsSummary.attr('aria-expanded', false);
	    		$detailsNotSummary.hide();
	    	} else {
	    		$details.addClass('open').prop('open', true).triggerHandler('open.details');
	    		$detailsSummary.attr('aria-expanded', true);
	    		$detailsNotSummary.show();
	    	}
	    };

	/* http://mths.be/noselect v1.0.3 */
	proto.noSelect = function() {

		// Since the string 'none' is used three times, storing it in a variable gives better results after minification
		var none = 'none';

		// onselectstart and ondragstart for WebKit & IE
		// onmousedown for WebKit & Opera
		return this.bind('selectstart dragstart mousedown', function() {
			return false;
		}).css({
			'MozUserSelect': none,
			'msUserSelect': none,
			'webkitUserSelect': none,
			'userSelect': none
		});

	};

	// Execute the fallback only if there’s no native `details` support
	if (isDetailsSupported) {

		details = proto.details = function() {

			return this.each(function() {
				var $details = $(this),
				    $summary = $('summary', $details).first();
				$summary.attr({
					'role': 'button',
					'aria-expanded': $details.prop('open')
				}).on('click', function() {
					// the value of the `open` property is the old value
					var close = $details.prop('open');
					$summary.attr('aria-expanded', !close);
					$details.triggerHandler((close ? 'close' : 'open') + '.details');
				});
			});

		};

		details.support = isDetailsSupported;

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
				    $detailsNotSummaryContents = $details.contents(':not(summary)');

				// If there is no `summary` in the current `details` element…
				if (!$detailsSummary.length) {
					// …create one with default text
					$detailsSummary = $('<summary>').text('Details').prependTo($details);
				}

				// Look for direct child text nodes
				if ($detailsNotSummary.length != $detailsNotSummaryContents.length) {
					// Wrap child text nodes in a `span` element
					$detailsNotSummaryContents.filter(function() {
						// Only keep the node in the collection if it’s a text node containing more than only whitespace
						// http://www.whatwg.org/specs/web-apps/current-work/multipage/common-microsyntaxes.html#space-character
						return this.nodeType == 3 && /[^ \t\n\f\r]/.test(this.data);
					}).wrap('<span>');
					// There are now no direct child text nodes anymore — they’re wrapped in `span` elements
					$detailsNotSummary = $details.children(':not(summary)');
				}

				// Hide content unless there’s an `open` attribute
				$details.prop('open', typeof $details.attr('open') == 'string');
				toggleOpen($details, $detailsSummary, $detailsNotSummary);

				// Add `role=button` and set the `tabindex` of the `summary` element to `0` to make it keyboard accessible
				$detailsSummary.attr('role', 'button').noSelect().prop('tabIndex', 0).on('click', function() {
					// Focus on the `summary` element
					$detailsSummary.focus();
					// Toggle the `open` and `aria-expanded` attributes and the `open` property of the `details` element and display the additional info
					toggleOpen($details, $detailsSummary, $detailsNotSummary, true);
				}).keyup(function(event) {
					if (32 == event.keyCode || (13 == event.keyCode && !isOpera)) {
						// Space or Enter is pressed — trigger the `click` event on the `summary` element
						// Opera already seems to trigger the `click` event when Enter is pressed
						event.preventDefault();
						$detailsSummary.click();
					}
				});

			});

		};

		details.support = isDetailsSupported;

	}

}(document, jQuery));
;
return $;
});

define(
	'admin/modules/WidgetEvents',[],function () {

		

		var NS = "admin/modules/widget-events/";

		return {
			RENDER         : NS + "render"
		};
	}
);

define(
	'admin/modules/WindowPopup',['require','exports','module','rosy/base/DOMClass','$'],function (require, exports, module) {

		

		var DOMClass             = require("rosy/base/DOMClass"),
			$                    = require("$"),

			guid = 0,

			WindowPopup = DOMClass.extend({

			init : function (dom) {

			},

			request : function (url, options, cb) {
				var name = 'windowpopupguid',// + (++guid),
					newWin;

				window[name] = function (data) {
					cb(data);
					newWin.close();
					window[name] = null;
					delete window[name];
				};

				newWin = window.open(url, name, options);
			},

			respond : function (data) {
				var name = window.name;

				if (window.opener && window.opener[name] && typeof window.opener[name] === 'function') {
					window.opener[name](data);
				}
			}
		});

		return new WindowPopup();
	}
);

define(

	'admin/modules/AssetSelect',[
		"rosy/base/DOMClass",
		"$",
		"$plugin!select2",
		"./WidgetEvents",
		"./WindowPopup"
	],

	function (DOMClass, $, jQuerySelect2, WidgetEvents, WindowPopup) {

		

		return DOMClass.extend({

			dom : null,
			preview : null,
			input : null,

			count : 0,

			popup : null,

			init : function (dom) {
				this.dom = dom;
				this.input = dom.find('input');
				this.preview = dom.find('.widget-asset-preview');
				this._autoTag();
				this._initSelect2();
			},

			_initSelect2 : function () {
				this.input.select2({
					placeholder : "Choose an asset",
					//minimumInputLength : 2,
					allowClear : true,
					initSelection : this.initSelection,
					formatSelection : this.formatSelection,
					formatResult : this.formatResult,
					ajax : {
						url : this.dom.data('api'),
						quietMillis : 500,
						dataType : "json",
						data : this._ajaxData,
						results : this._ajaxResults
					}
				});

				this.input.on('change', this.onChange);

				this._tag();

				this.dom.on('click', '.button', this._openPopup);
			},

			_openPopup : function (e) {
				var dom = $(e.currentTarget),
					url = dom.attr('href'),
					options = 'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800';

				WindowPopup.request(url, options, this._gotDataFromPopup);

				return false;
			},

			_gotDataFromPopup : function (data) {
				this.input.select2('data', data);
			},

			_autoTag : function () {
				var tags = [];
				$('[data-auto-tag]').each(function (i, dom) {
					var data_auto_tag = $(dom).data('auto-tag');
					if (data_auto_tag) {
						var allTags = data_auto_tag.toLowerCase().split(',');
						while (allTags.length) {
							var tag = allTags.shift();
							var splitTag = tag.split(" ");
							tags.push(tag);

							// if splitTag length > 3, push individual values
							if (tag.match(/[a-z0-9]/i) && splitTag.length > 3) {
								while (splitTag.length) {
									var newTag = splitTag.shift();
									if (tags.indexOf(newTag) === -1) {
										tags.push(newTag);
									}
								}
							}
						}
						tags = tags.concat(allTags);
					}
				});
				$('#auto_tags').val(tags.join(','));
				this._auto_tags = tags;
			},

			_tag : function () {

				if (!this.dom.find('a.button').length) {
					return;
				}

				var dom = this.dom.find('a.button'),
					params = this._unparam(dom[0].search),
					tags = ($(this.dom).data('tags') || '').toLowerCase().split(',');

				tags = tags.concat(this._auto_tags);
				params.tags = encodeURIComponent(tags.join(','));
				dom[0].search = this._param(params);
			},

			_param : function (obj) {
				var op = [],
					i;
				for (i in obj) {
					op.push(i + '=' + obj[i]);
				}
				return "?" + op.join('&');
			},

			_unparam : function (path) {
				var ret = {},
					seg = path.replace(/^\?/, '').split('&'),
					len = seg.length,
					i = 0,
					s;
				for (i; i < len; i++) {
					if (!seg[i]) {
						continue;
					}
					s = seg[i].split('=');
					ret[s[0]] = s[1];
				}
				return ret;
			},

			_ajaxData : function (term, page, context) {
				return {
					page : page,
					tag : term
				};
			},

			_ajaxResults : function (data, page, context) {
				// sanitize data
				$.each(data.results, function (i, result) {
					result.text = result.user_filename;
				});

				return {
					results : data.results,
					more : !!data.next
				};
			},

			onChange : function () {
				if (!this.input.val()) {
					this.preview.css('background-image', "none");
				}
			},

			initSelection : function (element, callback) {
				callback({
					id: element.val(),
					text: this.dom.data('title')
				});
			},

			formatSelection : function (object, container) {
				if (object.thumbnail) {
					this.preview.css('background-image', 'url(' + object.thumbnail + ")");
				}
				if (object.url) {
					this.input.attr('data-src', object.url);
				}
				return object.text;
			},

			formatResult : function (object, container, query) {
				var thumb = $('<div>').addClass('select2-result-image-thumbnail');
				if (object.thumbnail) {
					thumb.css('background-image', 'url(' + object.thumbnail + ")");
				}
				container.addClass('select2-result-image');
				container.append(object.text);
				container.append(thumb);
			}
		});
	}
);

define(

	'admin/modules/ApiSelect',[
		"rosy/base/DOMClass",
		"$",
		"$plugin!select2",
		"./WindowPopup"
	],

	function (DOMClass, $, jQuerySelect2, WindowPopup) {

		

		return DOMClass.extend({

			dom : null,
			input : null,
			label : null,
			name : null,
			toggle : null,
			isMultiple : false,

			select2 : null,

			names : [],

			param : null,
			params : [],

			values : [],

			init : function (dom) {
				this.dom = dom;
				this.dom.on('click', '[data-param]', this.clickParam);
				this.input = dom.find('input');
				this.label = $('label[for="' + this.input.attr('id') + '"]');
				this.name = this.input.attr('name');

				if (this.dom.data('add')) {
					this._initAdd();
				}

				// initialize $.select2
				if (this.input.length) {
					this.isMultiple = this.input.is('[data-multiple]');
					if (this.isMultiple) {
						this.input = this.input.eq(0);
						this.input.on('change.select2', this.updateHiddenValues);
					}

					this._initSelect2();
				}
			},

			/**********************
				Add One
			**********************/

			_initAdd : function () {
				var url = this.dom.data('add'),
					add = $('<a>').attr('href', url).addClass('button add-button').text('+');

				this.dom.prepend(add);
				this.dom.addClass('has-add-button');

				add.on('click', this._openPopup);
			},

			_openPopup : function (e) {
				var dom = $(e.currentTarget),
					url = dom.attr('href'),
					options = 'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800';

				WindowPopup.request(url, options, this._gotDataFromPopup);

				return false;
			},

			_gotDataFromPopup : function (data) {
				if (this.isMultiple) {
					var currData = this.input.select2('data');
					currData.push(data);
					this.input.after($('<input />', { value: data.id, name: this.name, type: 'hidden' })).select2('data', currData);
				} else {
					this.input.select2('data', data);
				}
			},

			/**********************
				Select 2
			**********************/

			_initSelect2 : function () {
				var placeholder = this.label.text() || 'one';
				placeholder = placeholder.replace(/[^a-z0-9]/i, '').toLowerCase();

				var opts = {
					placeholder : "Select " + placeholder,
					//minimumInputLength : 2,
					allowClear : true,
					initSelection : this.initSelection,
					formatResult : this.formatResult,
					minimumResultsForSearch : 5,
					ajax : {
						url : this.dom.data('api'),
						quietMillis : 400,
						dataType : "json",
						data : this._ajaxData,
						results : this._ajaxResults
					}
				};

				if (this.isMultiple) {
					opts.tags = this.initSelection;

					// clone this.input to preserve its value before manipulation
					if (this.input.val()) {
						this.input.after(this.input.clone());
					}

					// suffix this.input name so its comma-delimitted tags won't be submitted
					this.input.attr('name', this.input.attr('name') + '_');
				}

				this.input.select2(opts);
				this.select2 = this.input.data().select2;
			},

			formatResult : function (object, container, query) {
				return object.text;
			},

			initSelection : function (element, callback) {
				var data;

				if (this.isMultiple) {
					data = [];

					// add sibling hidden values as initial value
					this.dom.find('input[name=' + this.name + ']').each(function () {
						data.push({
							id: $(this).val(),
							text: $(this).data('title')
						});
					});

				} else {
					data = {
						id: element.val(),
						text: this.dom.data('title')
					};
				}

				callback(data);
			},

			updateHiddenValues : function (e) {
				if (e.added) {
					this.input.after($('<input />', { name: this.name, value: e.added.id, type: 'hidden' }));
				} else if (e.removed) {
					this.input.siblings('[value=' + e.removed.id + ']').remove();
				}
			},

			/**********************
				Fetching Data
			**********************/

			_ajaxData : function (term, page, context) {
				var output = {
					page : page
				};

				if (this.param) {
					output[this.param] = term;
				}

				return output;
			},

			_ajaxResults : function (data, page, context) {
				var param, field;

				this.names = [];
				this.params = [];

				for (param in data.params) {
					this.param = this.param || param;
					this.params.push({
						id : param,
						name : data.params[param].label
					});
				}

				for (field in data.fields) {
					this.names.push(field);
				}

				// this._initParams();
				// this._toggleSearch();

				// sanitize data
				$.each(data.results, this.proxy(function (index, result) {
					var text = [],
						i;

					for (i = 0; i < this.names.length; i++) {
						text.push(result[this.names[i]]);
					}

					result.text = text.join(' - ');
				}));

				return {
					results : data.results,
					more : !!data.next
				};
			},

			/**********************
				Params
			**********************/

			// TODO: evaluate need (ux) for sort functionality

			_initParams : function () {
				// dont init search option twice
				// dont init if there are no options
				if (this.toggle || this.params.length < 2) {
					return;
				}
				var param, i, dom;

				this.toggle = $('<div>').addClass('toggle');
				this.dom.append(this.toggle);

				for (i = 0; i < this.params.length; i++) {
					param = this.params[i];
					dom = $('<div>').attr('data-param', param.id).text(param.name);
					dom.addClass('toggle-button');
					if (i === 0) {
						dom.addClass('first');
					}
					if (i === this.params.length - 1) {
						dom.addClass('last');
					}
					this.toggle.append(dom);
					this.useParam(param.id);
				}
			},

			useParam : function (param) {
				this.dom.find('[data-param]').removeClass('active');
				this.dom.find('[data-param="' + param + '"]').addClass('active');
				this.param = param;
			},

			clickParam : function (e) {
				this.useParam($(e.currentTarget).data('param'));
			},

			_toggleSearch : function () {
				if (!this.param) {
					this.select2.search.parent().css('display', 'none');
				} else {
					this.select2.search.parent().css('display', '');
				}
			}
		});
	}
);

define(

	'admin/modules/Formset',[
		"rosy/base/DOMClass",
		"$",
		"$plugin!select2",
		"$plugin!ui",
		"./WidgetEvents"
	],

	function (DOMClass, $, jQuerySelect2, jQueryUI, WidgetEvents) {

		

		return DOMClass.extend({

			dom : null,
			forms : null,

			prefix : '',

			isDraggable : false,

			init : function (dom) {
				this.dom = dom;
				this.forms = dom.find('.widget-formset-forms');
				this.prefix = this.dom.data('prefix');

				this.dom.on('click', '.widget-formset-delete', this._delete);
				this.dom.on('click', '.widget-formset-add', this._add);

				this._initSort();
			},

			_delete : function (e) {
				var dom = $(e.currentTarget),
					form = dom.closest('.widget-formset-form');

				dom.find('input').attr('checked', true);

				form.addClass('was-deleted');
				form.find('.widget-formset-order input').val(0);

				this._resort();
			},

			/************************************
				Add
			************************************/

			_count : function () {
				return this.dom.find('.widget-formset-form').length;
			},

			_add : function () {
				var clone = $('<div>').addClass('widget-formset-form added-with-js'),
					html = this.dom.find('.widget-formset-form-template').html();

				html = html.replace(/(__prefix__)/g, this._count());
				clone.html(html);

				this.forms.append(clone);

				if (this.isDraggable) {
					clone.addClass('draggable');
				}

				this.publish(WidgetEvents.RENDER, {
					dom : clone
				});

				this._resort();
			},

			/************************************
				Sorting
			************************************/

			_initSort : function () {
				if (this.forms.find('.widget-formset-order').length) {
					this.forms.sortable({
						update : this._resort,
						change : this._resort
					});
					this.dom.find('.widget-formset-form').addClass('draggable');
					this.isDraggable = true;
				}
				this._resort();
			},

			_resort : function () {
				var order = 0,
					forms = this.dom.find('.widget-formset-form'),
					helper = this.dom.find('.ui-sortable-helper'),
					placeholder = this.dom.find('.ui-sortable-placeholder');

				forms.each(function (i, dom) {
					dom = $(dom);

					if (dom.is('.was-deleted, .ui-sortable-helper')) {
						return;
					}

					if (order % 2) {
						dom.addClass('odd');
					} else {
						dom.removeClass('odd');
					}

					dom.find('.widget-formset-order input').val(order);
					order++;
				});

				if (placeholder.hasClass('odd')) {
					helper.addClass('odd');
				} else {
					helper.removeClass('odd');
				}

				this.dom.find('#id_' + this.prefix + '-TOTAL_FORMS').val(forms.length);
			}
		});
	}
);

define(
	'admin/modules/Tabs',[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		

		return DOMClass.extend({

			dom : null,
			tabs : null,

			init : function (dom) {
				this.dom = dom;
				this.data = this.dom.data();
				this.bindTabEvents();
				this.autoSelectFirstTab();
			},

			bindTabEvents : function () {
				this.$container = $(this.data.tabsContainer);
				this.$tabs = this.dom.find('[data-tabs-content]');

				if (!this.$container.length) {
					return;
				}

				this.$tabs.on('click', this.onTabClick);

			},

			unbindTabEvents : function () {
				if (this.$tabs && this.$tabs.length) {
					this.$tabs.off();
				}
			},

			onTabClick : function (e) {
				e.preventDefault();

				var $tab = $(e.currentTarget);

				this.highlightTab($tab);
				this.selectTab($tab.data('tabsContent'));

			},

			highlightTab : function ($tab) {
				this.$tabs.removeClass('active');
				$tab.addClass('active');
			},

			selectTab : function (selector) {
				var $content = this.$container.find(selector);

				if (!$content.length) {
					return;
				}

				this.hideTabContent();
				$content.show();

			},

			hideTabContent : function () {
				this.$container.children().hide();
			},

			autoSelectFirstTab : function () {
				var $firstTab = this.$tabs.eq(0);
				this.highlightTab($firstTab);
				this.selectTab($firstTab.data('tabsContent'));
			},

			destroy : function () {
				this.unbindTabEvents();
				this.sup();
			}

		});

	});

define(
	'admin/modules/Insert',[
		"rosy/base/DOMClass",
		"$",
		"admin/modules/WindowPopup"
	],
	function (DOMClass, $, WindowPopup) {

		

		return DOMClass.extend({

			$dom : null,

			vars : {
				$inputs : null,
				$form : null,
				$node : false,
				constrain : false,
				size : {
					width : null,
					height : null
				}
			},

			init : function () {

				this.$dom = this.vars.$dom;
				this.vars.$inputs = this.$dom.find("[data-attribute]");
				this.vars.$form = this.$dom.find("form");

				this.bindInputs();
				this.sup();

			},

			bindInputs : function () {
				this.vars.$inputs.on("keypress paste", this.onDelayInput);
				this.vars.$form.on("submit", this.onSubmit);
				this.vars.$form.find(".cancel").on("click", this.onCancel);
				this.$dom.find(".constrain").on("change", this.onConstrainChange);
			},

			unbindInputs : function () {
				this.vars.$inputs.off();
				this.vars.$form.off();
				this.vars.$form.find(".cancel").off();
				this.$dom.find(".constrain").off();
			},

			// Helper to delay onInput call on paste
			// http://stackoverflow.com/a/1503425
			onDelayInput : function (e) {
				this.setTimeout(function () {
					this.onInput(e);
				});
			},

			// NOTE: this method must be overwritten by the extending class.
			onInput : function (e) {
				throw "You must override the `onInput` method.";
			},

			// Helper to constrain proportions
			// given a dimension("width" || "height") and integer value.
			constrainProportion : function (dimension, value) {

				value = parseInt(value, 10);

				if (!this.vars.$node || isNaN(value)) {
					return;
				}

				var opposite = (dimension === "width") ? "height" : "width",
					oppositeValue = this.vars.size[opposite],
					ratio = ((value - this.vars.size[dimension]) / this.vars.size[dimension]) + 1;

				// Sets the opposing axis based on the ratio difference in value.
				this.vars.size[opposite] = Math.round(oppositeValue * ratio);

				// Updates the proportion attribute.
				this.setAttribute(opposite, this.vars.size[opposite]);

			},

			// Helper to set a given attribute
			setAttribute : function (attr, val) {
				this.vars.$inputs.filter("[data-attribute=\"" + attr + "\"]").val(val);
				this.vars.$node.attr(attr, val);
			},

			// Sets the constrain value to the state of the check-box
			onConstrainChange : function (e) {
				this.vars.constrain = !!($(e.currentTarget).is(":checked"));
			},

			// Sends data back to the parent window.
			onSubmit : function (e) {
				e.preventDefault();
				WindowPopup.respond(this.vars.$node);
			},

			onCancel : function () {
				window.close();
			},

			destroy : function () {
				this.unbindInputs();
				this.sup();
			}

		});

	}
);

define(
	'admin/modules/InsertVideo',[
		"./Insert",
		"$",
	],
	function (Insert, $) {

		

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

define(
	'admin/modules/InsertImage',[
		"./Insert",
		"$"
	],
	function (Insert, $) {

		

		return Insert.extend({

			// Extending to bind to a special data-respond attribute for Select2.
			bindInputs : function () {
				this.sup();
				this.$dom.find('[data-respond=\"true\"]').on("change", this.onInput);
			},

			// Generates or updates the image with the latest input value.
			onInput : function (e) {

				var $target = $(e.currentTarget),
					attribute = $target.data('attribute'),
					value = $(e.currentTarget).val(),
					$preview = this.$dom.find(".image-preview"),
					$img = $preview.find('img');

				// Adjusts the source to come from the data attribute.
				if ($target.attr('data-src')) {
					$preview.empty();
					$img = $preview.find('img');
					value = $target.attr('data-src');
				}

				if (!$img.length) {

					$img = $("<img />");
					$preview.append($img);

					this.vars.$node = $img;

					$img.on("load", this.proxy(function (e) {

						var width = $img.width(),
							height = $img.height();

						this.vars.size.width = width;
						this.vars.size.height = height;

						this.setAttribute("width", width);
						this.setAttribute("height", height);

					}));

				} else {
					this.vars.$node = $img;
				}

				if (attribute === "width" || attribute === "height") {

					value = value.replace("px", "");

					if (this.vars.constrain) {
						this.constrainProportion(attribute, value);
					}

					this.vars.size[attribute] = value;

				}

				this.vars.$node = $img.attr(attribute, value);

			}


		});

	});

/*
 wysihtml5 v0.4.0pre
 https://github.com/xing/wysihtml5

 Author: Christopher Blum (https://github.com/tiff)

 Copyright (C) 2012 XING AG
 Licensed under the MIT license (MIT)

 Rangy, a cross-browser JavaScript range and selection library
 http://code.google.com/p/rangy/

 Copyright 2011, Tim Down
 Licensed under the MIT license.
 Version: 1.2.2
 Build date: 13 November 2011
*/
var wysihtml5={version:"0.4.0pre",commands:{},dom:{},quirks:{},toolbar:{},lang:{},selection:{},views:{},INVISIBLE_SPACE:"\ufeff",EMPTY_FUNCTION:function(){},ELEMENT_NODE:1,TEXT_NODE:3,BACKSPACE_KEY:8,ENTER_KEY:13,ESCAPE_KEY:27,SPACE_KEY:32,DELETE_KEY:46};
window.rangy=function(){function b(a,b){var c=typeof a[b];return c==j||!!(c==g&&a[b])||"unknown"==c}function c(a,b){return!!(typeof a[b]==g&&a[b])}function a(a,b){return typeof a[b]!=k}function d(a){return function(b,c){for(var d=c.length;d--;)if(!a(b,c[d]))return!1;return!0}}function e(a){return a&&p(a,u)&&t(a,v)}function f(a){window.alert("Rangy not supported in your browser. Reason: "+a);q.initialized=!0;q.supported=!1}function h(){if(!q.initialized){var a,d=!1,g=!1;b(document,"createRange")&&
(a=document.createRange(),p(a,n)&&t(a,m)&&(d=!0),a.detach());if((a=c(document,"body")?document.body:document.getElementsByTagName("body")[0])&&b(a,"createTextRange"))a=a.createTextRange(),e(a)&&(g=!0);!d&&!g&&f("Neither Range nor TextRange are implemented");q.initialized=!0;q.features={implementsDomRange:d,implementsTextRange:g};d=A.concat(y);g=0;for(a=d.length;g<a;++g)try{d[g](q)}catch(j){c(window,"console")&&b(window.console,"log")&&window.console.log("Init listener threw an exception. Continuing.",
j)}}}function i(a){this.name=a;this.supported=this.initialized=!1}var g="object",j="function",k="undefined",m="startContainer startOffset endContainer endOffset collapsed commonAncestorContainer START_TO_START START_TO_END END_TO_START END_TO_END".split(" "),n="setStart setStartBefore setStartAfter setEnd setEndBefore setEndAfter collapse selectNode selectNodeContents compareBoundaryPoints deleteContents extractContents cloneContents insertNode surroundContents cloneRange toString detach".split(" "),
v="boundingHeight boundingLeft boundingTop boundingWidth htmlText text".split(" "),u="collapse compareEndPoints duplicate getBookmark moveToBookmark moveToElementText parentElement pasteHTML select setEndPoint getBoundingClientRect".split(" "),p=d(b),r=d(c),t=d(a),q={version:"1.2.2",initialized:!1,supported:!0,util:{isHostMethod:b,isHostObject:c,isHostProperty:a,areHostMethods:p,areHostObjects:r,areHostProperties:t,isTextRange:e},features:{},modules:{},config:{alertOnWarn:!1,preferTextRange:!1}};
q.fail=f;q.warn=function(a){a="Rangy warning: "+a;q.config.alertOnWarn?window.alert(a):typeof window.console!=k&&typeof window.console.log!=k&&window.console.log(a)};({}).hasOwnProperty?q.util.extend=function(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c])}:f("hasOwnProperty not supported");var y=[],A=[];q.init=h;q.addInitListener=function(a){q.initialized?a(q):y.push(a)};var B=[];q.addCreateMissingNativeApiListener=function(a){B.push(a)};q.createMissingNativeApi=function(a){a=a||window;h();
for(var b=0,c=B.length;b<c;++b)B[b](a)};i.prototype.fail=function(a){this.initialized=!0;this.supported=!1;throw Error("Module '"+this.name+"' failed to load: "+a);};i.prototype.warn=function(a){q.warn("Module "+this.name+": "+a)};i.prototype.createError=function(a){return Error("Error in Rangy "+this.name+" module: "+a)};q.createModule=function(a,b){var c=new i(a);q.modules[a]=c;A.push(function(a){b(a,c);c.initialized=!0;c.supported=!0})};q.requireModules=function(a){for(var b=0,c=a.length,d,e;b<
c;++b){e=a[b];d=q.modules[e];if(!d||!(d instanceof i))throw Error("Module '"+e+"' not found");if(!d.supported)throw Error("Module '"+e+"' not supported");}};var D=!1,r=function(){D||(D=!0,q.initialized||h())};if(typeof window==k)f("No window found");else if(typeof document==k)f("No document found");else return b(document,"addEventListener")&&document.addEventListener("DOMContentLoaded",r,!1),b(window,"addEventListener")?window.addEventListener("load",r,!1):b(window,"attachEvent")?window.attachEvent("onload",
r):f("Window does not have required addEventListener or attachEvent method"),q}();
rangy.createModule("DomUtil",function(b,c){function a(a){for(var b=0;a=a.previousSibling;)b++;return b}function d(a,b){var c=[],d;for(d=a;d;d=d.parentNode)c.push(d);for(d=b;d;d=d.parentNode)if(p(c,d))return d;return null}function e(a,b,c){for(c=c?a:a.parentNode;c;){a=c.parentNode;if(a===b)return c;c=a}return null}function f(a){a=a.nodeType;return 3==a||4==a||8==a}function h(a,b){var c=b.nextSibling,d=b.parentNode;c?d.insertBefore(a,c):d.appendChild(a);return a}function i(a){if(9==a.nodeType)return a;
if(typeof a.ownerDocument!=n)return a.ownerDocument;if(typeof a.document!=n)return a.document;if(a.parentNode)return i(a.parentNode);throw Error("getDocument: no document found for node");}function g(a){return!a?"[No node]":f(a)?'"'+a.data+'"':1==a.nodeType?"<"+a.nodeName+(a.id?' id="'+a.id+'"':"")+">["+a.childNodes.length+"]":a.nodeName}function j(a){this._next=this.root=a}function k(a,b){this.node=a;this.offset=b}function m(a){this.code=this[a];this.codeName=a;this.message="DOMException: "+this.codeName}
var n="undefined",v=b.util;v.areHostMethods(document,["createDocumentFragment","createElement","createTextNode"])||c.fail("document missing a Node creation method");v.isHostMethod(document,"getElementsByTagName")||c.fail("document missing getElementsByTagName method");var u=document.createElement("div");v.areHostMethods(u,["insertBefore","appendChild","cloneNode"])||c.fail("Incomplete Element implementation");v.isHostProperty(u,"innerHTML")||c.fail("Element is missing innerHTML property");u=document.createTextNode("test");
v.areHostMethods(u,["splitText","deleteData","insertData","appendData","cloneNode"])||c.fail("Incomplete Text Node implementation");var p=function(a,b){for(var c=a.length;c--;)if(a[c]===b)return!0;return!1};j.prototype={_current:null,hasNext:function(){return!!this._next},next:function(){var a=this._current=this._next,b;if(this._current){b=a.firstChild;if(!b)for(b=null;a!==this.root&&!(b=a.nextSibling);)a=a.parentNode;this._next=b}return this._current},detach:function(){this._current=this._next=this.root=
null}};k.prototype={equals:function(a){return this.node===a.node&this.offset==a.offset},inspect:function(){return"[DomPosition("+g(this.node)+":"+this.offset+")]"}};m.prototype={INDEX_SIZE_ERR:1,HIERARCHY_REQUEST_ERR:3,WRONG_DOCUMENT_ERR:4,NO_MODIFICATION_ALLOWED_ERR:7,NOT_FOUND_ERR:8,NOT_SUPPORTED_ERR:9,INVALID_STATE_ERR:11};m.prototype.toString=function(){return this.message};b.dom={arrayContains:p,isHtmlNamespace:function(a){var b;return typeof a.namespaceURI==n||null===(b=a.namespaceURI)||"http://www.w3.org/1999/xhtml"==
b},parentElement:function(a){a=a.parentNode;return 1==a.nodeType?a:null},getNodeIndex:a,getNodeLength:function(a){var b;return f(a)?a.length:(b=a.childNodes)?b.length:0},getCommonAncestor:d,isAncestorOf:function(a,b,c){for(b=c?b:b.parentNode;b;){if(b===a)return!0;b=b.parentNode}return!1},getClosestAncestorIn:e,isCharacterDataNode:f,insertAfter:h,splitDataNode:function(a,b){var c=a.cloneNode(!1);c.deleteData(0,b);a.deleteData(b,a.length-b);h(c,a);return c},getDocument:i,getWindow:function(a){a=i(a);
if(typeof a.defaultView!=n)return a.defaultView;if(typeof a.parentWindow!=n)return a.parentWindow;throw Error("Cannot get a window object for node");},getIframeWindow:function(a){if(typeof a.contentWindow!=n)return a.contentWindow;if(typeof a.contentDocument!=n)return a.contentDocument.defaultView;throw Error("getIframeWindow: No Window object found for iframe element");},getIframeDocument:function(a){if(typeof a.contentDocument!=n)return a.contentDocument;if(typeof a.contentWindow!=n)return a.contentWindow.document;
throw Error("getIframeWindow: No Document object found for iframe element");},getBody:function(a){return v.isHostObject(a,"body")?a.body:a.getElementsByTagName("body")[0]},getRootContainer:function(a){for(var b;b=a.parentNode;)a=b;return a},comparePoints:function(b,c,g,j){var f;if(b==g)return c===j?0:c<j?-1:1;if(f=e(g,b,!0))return c<=a(f)?-1:1;if(f=e(b,g,!0))return a(f)<j?-1:1;c=d(b,g);b=b===c?c:e(b,c,!0);g=g===c?c:e(g,c,!0);if(b===g)throw Error("comparePoints got to case 4 and childA and childB are the same!");
for(c=c.firstChild;c;){if(c===b)return-1;if(c===g)return 1;c=c.nextSibling}throw Error("Should not be here!");},inspectNode:g,fragmentFromNodeChildren:function(a){for(var b=i(a).createDocumentFragment(),c;c=a.firstChild;)b.appendChild(c);return b},createIterator:function(a){return new j(a)},DomPosition:k};b.DOMException=m});
rangy.createModule("DomRange",function(b){function c(a,b){return 3!=a.nodeType&&(l.isAncestorOf(a,b.startContainer,!0)||l.isAncestorOf(a,b.endContainer,!0))}function a(a){return l.getDocument(a.startContainer)}function d(a,b,c){if(b=a._listeners[b])for(var d=0,e=b.length;d<e;++d)b[d].call(a,{target:a,args:c})}function e(a){return new H(a.parentNode,l.getNodeIndex(a))}function f(a){return new H(a.parentNode,l.getNodeIndex(a)+1)}function h(a,b,c){var d=11==a.nodeType?a.firstChild:a;l.isCharacterDataNode(b)?
c==b.length?l.insertAfter(a,b):b.parentNode.insertBefore(a,0==c?b:l.splitDataNode(b,c)):c>=b.childNodes.length?b.appendChild(a):b.insertBefore(a,b.childNodes[c]);return d}function i(b){for(var c,d,e=a(b.range).createDocumentFragment();d=b.next();){c=b.isPartiallySelectedSubtree();d=d.cloneNode(!c);c&&(c=b.getSubtreeIterator(),d.appendChild(i(c)),c.detach(!0));if(10==d.nodeType)throw new C("HIERARCHY_REQUEST_ERR");e.appendChild(d)}return e}function g(a,b,c){for(var d,e,c=c||{stop:!1};d=a.next();)if(a.isPartiallySelectedSubtree())if(!1===
b(d)){c.stop=!0;break}else{if(d=a.getSubtreeIterator(),g(d,b,c),d.detach(!0),c.stop)break}else for(d=l.createIterator(d);e=d.next();)if(!1===b(e)){c.stop=!0;return}}function j(a){for(var b;a.next();)a.isPartiallySelectedSubtree()?(b=a.getSubtreeIterator(),j(b),b.detach(!0)):a.remove()}function k(b){for(var c,d=a(b.range).createDocumentFragment(),e;c=b.next();){b.isPartiallySelectedSubtree()?(c=c.cloneNode(!1),e=b.getSubtreeIterator(),c.appendChild(k(e)),e.detach(!0)):b.remove();if(10==c.nodeType)throw new C("HIERARCHY_REQUEST_ERR");
d.appendChild(c)}return d}function m(a,b,c){var d=!(!b||!b.length),e,j=!!c;d&&(e=RegExp("^("+b.join("|")+")$"));var f=[];g(new v(a,!1),function(a){(!d||e.test(a.nodeType))&&(!j||c(a))&&f.push(a)});return f}function n(a){return"["+("undefined"==typeof a.getName?"Range":a.getName())+"("+l.inspectNode(a.startContainer)+":"+a.startOffset+", "+l.inspectNode(a.endContainer)+":"+a.endOffset+")]"}function v(a,b){this.range=a;this.clonePartiallySelectedTextNodes=b;if(!a.collapsed){this.sc=a.startContainer;
this.so=a.startOffset;this.ec=a.endContainer;this.eo=a.endOffset;var c=a.commonAncestorContainer;this.sc===this.ec&&l.isCharacterDataNode(this.sc)?(this.isSingleCharacterDataNode=!0,this._first=this._last=this._next=this.sc):(this._first=this._next=this.sc===c&&!l.isCharacterDataNode(this.sc)?this.sc.childNodes[this.so]:l.getClosestAncestorIn(this.sc,c,!0),this._last=this.ec===c&&!l.isCharacterDataNode(this.ec)?this.ec.childNodes[this.eo-1]:l.getClosestAncestorIn(this.ec,c,!0))}}function u(a){this.code=
this[a];this.codeName=a;this.message="RangeException: "+this.codeName}function p(a,b,c){this.nodes=m(a,b,c);this._next=this.nodes[0];this._position=0}function r(a){return function(b,c){for(var d,e=c?b:b.parentNode;e;){d=e.nodeType;if(l.arrayContains(a,d))return e;e=e.parentNode}return null}}function t(a,b){if(L(a,b))throw new u("INVALID_NODE_TYPE_ERR");}function q(a){if(!a.startContainer)throw new C("INVALID_STATE_ERR");}function y(a,b){if(!l.arrayContains(b,a.nodeType))throw new u("INVALID_NODE_TYPE_ERR");
}function A(a,b){if(0>b||b>(l.isCharacterDataNode(a)?a.length:a.childNodes.length))throw new C("INDEX_SIZE_ERR");}function B(a,b){if(I(a,!0)!==I(b,!0))throw new C("WRONG_DOCUMENT_ERR");}function D(a){if(T(a,!0))throw new C("NO_MODIFICATION_ALLOWED_ERR");}function z(a,b){if(!a)throw new C(b);}function x(a){q(a);if(!l.arrayContains(M,a.startContainer.nodeType)&&!I(a.startContainer,!0)||!l.arrayContains(M,a.endContainer.nodeType)&&!I(a.endContainer,!0)||!(a.startOffset<=(l.isCharacterDataNode(a.startContainer)?
a.startContainer.length:a.startContainer.childNodes.length))||!(a.endOffset<=(l.isCharacterDataNode(a.endContainer)?a.endContainer.length:a.endContainer.childNodes.length)))throw Error("Range error: Range is no longer valid after DOM mutation ("+a.inspect()+")");}function G(){}function Q(a){a.START_TO_START=U;a.START_TO_END=Y;a.END_TO_END=ca;a.END_TO_START=Z;a.NODE_BEFORE=$;a.NODE_AFTER=aa;a.NODE_BEFORE_AND_AFTER=ba;a.NODE_INSIDE=V}function s(a){Q(a);Q(a.prototype)}function J(a,b){return function(){x(this);
var c=this.startContainer,d=this.startOffset,e=this.commonAncestorContainer,j=new v(this,!0);c!==e&&(c=l.getClosestAncestorIn(c,e,!0),d=f(c),c=d.node,d=d.offset);g(j,D);j.reset();e=a(j);j.detach();b(this,c,d,c,d);return e}}function N(a,d,g){function h(a,b){return function(c){q(this);y(c,E);y(K(c),M);c=(a?e:f)(c);(b?S:i)(this,c.node,c.offset)}}function S(a,b,c){var e=a.endContainer,g=a.endOffset;if(b!==a.startContainer||c!==a.startOffset){if(K(b)!=K(e)||1==l.comparePoints(b,c,e,g))e=b,g=c;d(a,b,c,
e,g)}}function i(a,b,c){var e=a.startContainer,g=a.startOffset;if(b!==a.endContainer||c!==a.endOffset){if(K(b)!=K(e)||-1==l.comparePoints(b,c,e,g))e=b,g=c;d(a,e,g,b,c)}}a.prototype=new G;b.util.extend(a.prototype,{setStart:function(a,b){q(this);t(a,!0);A(a,b);S(this,a,b)},setEnd:function(a,b){q(this);t(a,!0);A(a,b);i(this,a,b)},setStartBefore:h(!0,!0),setStartAfter:h(!1,!0),setEndBefore:h(!0,!1),setEndAfter:h(!1,!1),collapse:function(a){x(this);a?d(this,this.startContainer,this.startOffset,this.startContainer,
this.startOffset):d(this,this.endContainer,this.endOffset,this.endContainer,this.endOffset)},selectNodeContents:function(a){q(this);t(a,!0);d(this,a,0,a,l.getNodeLength(a))},selectNode:function(a){q(this);t(a,!1);y(a,E);var b=e(a),a=f(a);d(this,b.node,b.offset,a.node,a.offset)},extractContents:J(k,d),deleteContents:J(j,d),canSurroundContents:function(){x(this);D(this.startContainer);D(this.endContainer);var a=new v(this,!0),b=a._first&&c(a._first,this)||a._last&&c(a._last,this);a.detach();return!b},
detach:function(){g(this)},splitBoundaries:function(){x(this);var a=this.startContainer,b=this.startOffset,c=this.endContainer,e=this.endOffset,g=a===c;l.isCharacterDataNode(c)&&(0<e&&e<c.length)&&l.splitDataNode(c,e);l.isCharacterDataNode(a)&&(0<b&&b<a.length)&&(a=l.splitDataNode(a,b),g?(e-=b,c=a):c==a.parentNode&&e>=l.getNodeIndex(a)&&e++,b=0);d(this,a,b,c,e)},normalizeBoundaries:function(){x(this);var a=this.startContainer,b=this.startOffset,c=this.endContainer,e=this.endOffset,g=function(a){var b=
a.nextSibling;b&&b.nodeType==a.nodeType&&(c=a,e=a.length,a.appendData(b.data),b.parentNode.removeChild(b))},j=function(d){var g=d.previousSibling;if(g&&g.nodeType==d.nodeType){a=d;var j=d.length;b=g.length;d.insertData(0,g.data);g.parentNode.removeChild(g);a==c?(e+=b,c=a):c==d.parentNode&&(g=l.getNodeIndex(d),e==g?(c=d,e=j):e>g&&e--)}},f=!0;l.isCharacterDataNode(c)?c.length==e&&g(c):(0<e&&(f=c.childNodes[e-1])&&l.isCharacterDataNode(f)&&g(f),f=!this.collapsed);f?l.isCharacterDataNode(a)?0==b&&j(a):
b<a.childNodes.length&&(g=a.childNodes[b])&&l.isCharacterDataNode(g)&&j(g):(a=c,b=e);d(this,a,b,c,e)},collapseToPoint:function(a,b){q(this);t(a,!0);A(a,b);(a!==this.startContainer||b!==this.startOffset||a!==this.endContainer||b!==this.endOffset)&&d(this,a,b,a,b)}});s(a)}function R(a){a.collapsed=a.startContainer===a.endContainer&&a.startOffset===a.endOffset;a.commonAncestorContainer=a.collapsed?a.startContainer:l.getCommonAncestor(a.startContainer,a.endContainer)}function O(a,b,c,e,g){var j=a.startContainer!==
b||a.startOffset!==c,f=a.endContainer!==e||a.endOffset!==g;a.startContainer=b;a.startOffset=c;a.endContainer=e;a.endOffset=g;R(a);d(a,"boundarychange",{startMoved:j,endMoved:f})}function w(a){this.startContainer=a;this.startOffset=0;this.endContainer=a;this.endOffset=0;this._listeners={boundarychange:[],detach:[]};R(this)}b.requireModules(["DomUtil"]);var l=b.dom,H=l.DomPosition,C=b.DOMException;v.prototype={_current:null,_next:null,_first:null,_last:null,isSingleCharacterDataNode:!1,reset:function(){this._current=
null;this._next=this._first},hasNext:function(){return!!this._next},next:function(){var a=this._current=this._next;a&&(this._next=a!==this._last?a.nextSibling:null,l.isCharacterDataNode(a)&&this.clonePartiallySelectedTextNodes&&(a===this.ec&&(a=a.cloneNode(!0)).deleteData(this.eo,a.length-this.eo),this._current===this.sc&&(a=a.cloneNode(!0)).deleteData(0,this.so)));return a},remove:function(){var a=this._current,b,c;l.isCharacterDataNode(a)&&(a===this.sc||a===this.ec)?(b=a===this.sc?this.so:0,c=a===
this.ec?this.eo:a.length,b!=c&&a.deleteData(b,c-b)):a.parentNode&&a.parentNode.removeChild(a)},isPartiallySelectedSubtree:function(){return c(this._current,this.range)},getSubtreeIterator:function(){var b;if(this.isSingleCharacterDataNode)b=this.range.cloneRange(),b.collapse();else{b=new w(a(this.range));var c=this._current,d=c,e=0,g=c,j=l.getNodeLength(c);l.isAncestorOf(c,this.sc,!0)&&(d=this.sc,e=this.so);l.isAncestorOf(c,this.ec,!0)&&(g=this.ec,j=this.eo);O(b,d,e,g,j)}return new v(b,this.clonePartiallySelectedTextNodes)},
detach:function(a){a&&this.range.detach();this.range=this._current=this._next=this._first=this._last=this.sc=this.so=this.ec=this.eo=null}};u.prototype={BAD_BOUNDARYPOINTS_ERR:1,INVALID_NODE_TYPE_ERR:2};u.prototype.toString=function(){return this.message};p.prototype={_current:null,hasNext:function(){return!!this._next},next:function(){this._current=this._next;this._next=this.nodes[++this._position];return this._current},detach:function(){this._current=this._next=this.nodes=null}};var E=[1,3,4,5,
7,8,10],M=[2,9,11],F=[1,3,4,5,7,8,10,11],P=[1,3,4,5,7,8],K=l.getRootContainer,I=r([9,11]),T=r([5,6,10,12]),L=r([6,10,12]),S=document.createElement("style"),W=!1;try{S.innerHTML="<b>x</b>",W=3==S.firstChild.nodeType}catch(da){}b.features.htmlParsingConforms=W;var X="startContainer startOffset endContainer endOffset collapsed commonAncestorContainer".split(" "),U=0,Y=1,ca=2,Z=3,$=0,aa=1,ba=2,V=3;G.prototype={attachListener:function(a,b){this._listeners[a].push(b)},compareBoundaryPoints:function(a,b){x(this);
B(this.startContainer,b.startContainer);var c=a==Z||a==U?"start":"end",d=a==Y||a==U?"start":"end";return l.comparePoints(this[c+"Container"],this[c+"Offset"],b[d+"Container"],b[d+"Offset"])},insertNode:function(a){x(this);y(a,F);D(this.startContainer);if(l.isAncestorOf(a,this.startContainer,!0))throw new C("HIERARCHY_REQUEST_ERR");a=h(a,this.startContainer,this.startOffset);this.setStartBefore(a)},cloneContents:function(){x(this);var b,c;if(this.collapsed)return a(this).createDocumentFragment();if(this.startContainer===
this.endContainer&&l.isCharacterDataNode(this.startContainer))return b=this.startContainer.cloneNode(!0),b.data=b.data.slice(this.startOffset,this.endOffset),c=a(this).createDocumentFragment(),c.appendChild(b),c;c=new v(this,!0);b=i(c);c.detach();return b},canSurroundContents:function(){x(this);D(this.startContainer);D(this.endContainer);var a=new v(this,!0),b=a._first&&c(a._first,this)||a._last&&c(a._last,this);a.detach();return!b},surroundContents:function(a){y(a,P);if(!this.canSurroundContents())throw new u("BAD_BOUNDARYPOINTS_ERR");
var b=this.extractContents();if(a.hasChildNodes())for(;a.lastChild;)a.removeChild(a.lastChild);h(a,this.startContainer,this.startOffset);a.appendChild(b);this.selectNode(a)},cloneRange:function(){x(this);for(var b=new w(a(this)),c=X.length,d;c--;)d=X[c],b[d]=this[d];return b},toString:function(){x(this);var a=this.startContainer;if(a===this.endContainer&&l.isCharacterDataNode(a))return 3==a.nodeType||4==a.nodeType?a.data.slice(this.startOffset,this.endOffset):"";var b=[],a=new v(this,!0);g(a,function(a){(3==
a.nodeType||4==a.nodeType)&&b.push(a.data)});a.detach();return b.join("")},compareNode:function(a){x(this);var b=a.parentNode,c=l.getNodeIndex(a);if(!b)throw new C("NOT_FOUND_ERR");a=this.comparePoint(b,c);b=this.comparePoint(b,c+1);return 0>a?0<b?ba:$:0<b?aa:V},comparePoint:function(a,b){x(this);z(a,"HIERARCHY_REQUEST_ERR");B(a,this.startContainer);return 0>l.comparePoints(a,b,this.startContainer,this.startOffset)?-1:0<l.comparePoints(a,b,this.endContainer,this.endOffset)?1:0},createContextualFragment:W?
function(a){var b=this.startContainer,c=l.getDocument(b);if(!b)throw new C("INVALID_STATE_ERR");var d=null;1==b.nodeType?d=b:l.isCharacterDataNode(b)&&(d=l.parentElement(b));d=null===d||"HTML"==d.nodeName&&l.isHtmlNamespace(l.getDocument(d).documentElement)&&l.isHtmlNamespace(d)?c.createElement("body"):d.cloneNode(!1);d.innerHTML=a;return l.fragmentFromNodeChildren(d)}:function(b){q(this);var c=a(this).createElement("body");c.innerHTML=b;return l.fragmentFromNodeChildren(c)},toHtml:function(){x(this);
var b=a(this).createElement("div");b.appendChild(this.cloneContents());return b.innerHTML},intersectsNode:function(b,c){x(this);z(b,"NOT_FOUND_ERR");if(l.getDocument(b)!==a(this))return!1;var d=b.parentNode,e=l.getNodeIndex(b);z(d,"NOT_FOUND_ERR");var g=l.comparePoints(d,e,this.endContainer,this.endOffset),d=l.comparePoints(d,e+1,this.startContainer,this.startOffset);return c?0>=g&&0<=d:0>g&&0<d},isPointInRange:function(a,b){x(this);z(a,"HIERARCHY_REQUEST_ERR");B(a,this.startContainer);return 0<=
l.comparePoints(a,b,this.startContainer,this.startOffset)&&0>=l.comparePoints(a,b,this.endContainer,this.endOffset)},intersectsRange:function(b,c){x(this);if(a(b)!=a(this))throw new C("WRONG_DOCUMENT_ERR");var d=l.comparePoints(this.startContainer,this.startOffset,b.endContainer,b.endOffset),e=l.comparePoints(this.endContainer,this.endOffset,b.startContainer,b.startOffset);return c?0>=d&&0<=e:0>d&&0<e},intersection:function(a){if(this.intersectsRange(a)){var b=l.comparePoints(this.startContainer,
this.startOffset,a.startContainer,a.startOffset),c=l.comparePoints(this.endContainer,this.endOffset,a.endContainer,a.endOffset),d=this.cloneRange();-1==b&&d.setStart(a.startContainer,a.startOffset);1==c&&d.setEnd(a.endContainer,a.endOffset);return d}return null},union:function(a){if(this.intersectsRange(a,!0)){var b=this.cloneRange();-1==l.comparePoints(a.startContainer,a.startOffset,this.startContainer,this.startOffset)&&b.setStart(a.startContainer,a.startOffset);1==l.comparePoints(a.endContainer,
a.endOffset,this.endContainer,this.endOffset)&&b.setEnd(a.endContainer,a.endOffset);return b}throw new u("Ranges do not intersect");},containsNode:function(a,b){return b?this.intersectsNode(a,!1):this.compareNode(a)==V},containsNodeContents:function(a){return 0<=this.comparePoint(a,0)&&0>=this.comparePoint(a,l.getNodeLength(a))},containsRange:function(a){return this.intersection(a).equals(a)},containsNodeText:function(a){var b=this.cloneRange();b.selectNode(a);var c=b.getNodes([3]);return 0<c.length?
(b.setStart(c[0],0),a=c.pop(),b.setEnd(a,a.length),a=this.containsRange(b),b.detach(),a):this.containsNodeContents(a)},createNodeIterator:function(a,b){x(this);return new p(this,a,b)},getNodes:function(a,b){x(this);return m(this,a,b)},getDocument:function(){return a(this)},collapseBefore:function(a){q(this);this.setEndBefore(a);this.collapse(!1)},collapseAfter:function(a){q(this);this.setStartAfter(a);this.collapse(!0)},getName:function(){return"DomRange"},equals:function(a){return w.rangesEqual(this,
a)},inspect:function(){return n(this)}};N(w,O,function(a){q(a);a.startContainer=a.startOffset=a.endContainer=a.endOffset=null;a.collapsed=a.commonAncestorContainer=null;d(a,"detach",null);a._listeners=null});b.rangePrototype=G.prototype;w.rangeProperties=X;w.RangeIterator=v;w.copyComparisonConstants=s;w.createPrototypeRange=N;w.inspect=n;w.getRangeDocument=a;w.rangesEqual=function(a,b){return a.startContainer===b.startContainer&&a.startOffset===b.startOffset&&a.endContainer===b.endContainer&&a.endOffset===
b.endOffset};b.DomRange=w;b.RangeException=u});
rangy.createModule("WrappedRange",function(b){function c(a,b,c,d){var g=a.duplicate();g.collapse(c);var j=g.parentElement();e.isAncestorOf(b,j,!0)||(j=b);if(!j.canHaveHTML)return new f(j.parentNode,e.getNodeIndex(j));var b=e.getDocument(j).createElement("span"),h,k=c?"StartToStart":"StartToEnd";do j.insertBefore(b,b.previousSibling),g.moveToElementText(b);while(0<(h=g.compareEndPoints(k,a))&&b.previousSibling);k=b.nextSibling;if(-1==h&&k&&e.isCharacterDataNode(k)){g.setEndPoint(c?"EndToStart":"EndToEnd",
a);if(/[\r\n]/.test(k.data)){j=g.duplicate();c=j.text.replace(/\r\n/g,"\r").length;for(c=j.moveStart("character",c);-1==j.compareEndPoints("StartToEnd",j);)c++,j.moveStart("character",1)}else c=g.text.length;j=new f(k,c)}else k=(d||!c)&&b.previousSibling,j=(c=(d||c)&&b.nextSibling)&&e.isCharacterDataNode(c)?new f(c,0):k&&e.isCharacterDataNode(k)?new f(k,k.length):new f(j,e.getNodeIndex(b));b.parentNode.removeChild(b);return j}function a(a,b){var c,d,g=a.offset,j=e.getDocument(a.node),f=j.body.createTextRange(),
h=e.isCharacterDataNode(a.node);h?(c=a.node,d=c.parentNode):(c=a.node.childNodes,c=g<c.length?c[g]:null,d=a.node);j=j.createElement("span");j.innerHTML="&#feff;";c?d.insertBefore(j,c):d.appendChild(j);f.moveToElementText(j);f.collapse(!b);d.removeChild(j);if(h)f[b?"moveStart":"moveEnd"]("character",g);return f}b.requireModules(["DomUtil","DomRange"]);var d,e=b.dom,f=e.DomPosition,h=b.DomRange;if(b.features.implementsDomRange&&(!b.features.implementsTextRange||!b.config.preferTextRange)){var i=function(a){for(var b=
j.length,c;b--;)c=j[b],a[c]=a.nativeRange[c]},g,j=h.rangeProperties,k;d=function(a){if(!a)throw Error("Range must be specified");this.nativeRange=a;i(this)};h.createPrototypeRange(d,function(a,b,c,d,e){var g=a.endContainer!==d||a.endOffset!=e;if(a.startContainer!==b||a.startOffset!=c||g)a.setEnd(d,e),a.setStart(b,c)},function(a){a.nativeRange.detach();a.detached=!0;for(var b=j.length,c;b--;)c=j[b],a[c]=null});g=d.prototype;g.selectNode=function(a){this.nativeRange.selectNode(a);i(this)};g.deleteContents=
function(){this.nativeRange.deleteContents();i(this)};g.extractContents=function(){var a=this.nativeRange.extractContents();i(this);return a};g.cloneContents=function(){return this.nativeRange.cloneContents()};g.surroundContents=function(a){this.nativeRange.surroundContents(a);i(this)};g.collapse=function(a){this.nativeRange.collapse(a);i(this)};g.cloneRange=function(){return new d(this.nativeRange.cloneRange())};g.refresh=function(){i(this)};g.toString=function(){return this.nativeRange.toString()};
var m=document.createTextNode("test");e.getBody(document).appendChild(m);var n=document.createRange();n.setStart(m,0);n.setEnd(m,0);try{n.setStart(m,1),g.setStart=function(a,b){this.nativeRange.setStart(a,b);i(this)},g.setEnd=function(a,b){this.nativeRange.setEnd(a,b);i(this)},k=function(a){return function(b){this.nativeRange[a](b);i(this)}}}catch(v){g.setStart=function(a,b){try{this.nativeRange.setStart(a,b)}catch(c){this.nativeRange.setEnd(a,b),this.nativeRange.setStart(a,b)}i(this)},g.setEnd=function(a,
b){try{this.nativeRange.setEnd(a,b)}catch(c){this.nativeRange.setStart(a,b),this.nativeRange.setEnd(a,b)}i(this)},k=function(a,b){return function(c){try{this.nativeRange[a](c)}catch(d){this.nativeRange[b](c),this.nativeRange[a](c)}i(this)}}}g.setStartBefore=k("setStartBefore","setEndBefore");g.setStartAfter=k("setStartAfter","setEndAfter");g.setEndBefore=k("setEndBefore","setStartBefore");g.setEndAfter=k("setEndAfter","setStartAfter");n.selectNodeContents(m);g.selectNodeContents=n.startContainer==
m&&n.endContainer==m&&0==n.startOffset&&n.endOffset==m.length?function(a){this.nativeRange.selectNodeContents(a);i(this)}:function(a){this.setStart(a,0);this.setEnd(a,h.getEndOffset(a))};n.selectNodeContents(m);n.setEnd(m,3);k=document.createRange();k.selectNodeContents(m);k.setEnd(m,4);k.setStart(m,2);g.compareBoundaryPoints=-1==n.compareBoundaryPoints(n.START_TO_END,k)&1==n.compareBoundaryPoints(n.END_TO_START,k)?function(a,b){b=b.nativeRange||b;a==b.START_TO_END?a=b.END_TO_START:a==b.END_TO_START&&
(a=b.START_TO_END);return this.nativeRange.compareBoundaryPoints(a,b)}:function(a,b){return this.nativeRange.compareBoundaryPoints(a,b.nativeRange||b)};b.util.isHostMethod(n,"createContextualFragment")&&(g.createContextualFragment=function(a){return this.nativeRange.createContextualFragment(a)});e.getBody(document).removeChild(m);n.detach();k.detach();b.createNativeRange=function(a){a=a||document;return a.createRange()}}else b.features.implementsTextRange&&(d=function(a){this.textRange=a;this.refresh()},
d.prototype=new h(document),d.prototype.refresh=function(){var a,b,d=this.textRange;a=d.parentElement();var g=d.duplicate();g.collapse(!0);b=g.parentElement();g=d.duplicate();g.collapse(!1);d=g.parentElement();b=b==d?b:e.getCommonAncestor(b,d);b=b==a?b:e.getCommonAncestor(a,b);0==this.textRange.compareEndPoints("StartToEnd",this.textRange)?b=a=c(this.textRange,b,!0,!0):(a=c(this.textRange,b,!0,!1),b=c(this.textRange,b,!1,!1));this.setStart(a.node,a.offset);this.setEnd(b.node,b.offset)},h.copyComparisonConstants(d),
g=function(){return this}(),"undefined"==typeof g.Range&&(g.Range=d),b.createNativeRange=function(a){a=a||document;return a.body.createTextRange()});b.features.implementsTextRange&&(d.rangeToTextRange=function(b){if(b.collapsed)return a(new f(b.startContainer,b.startOffset),!0);var c=a(new f(b.startContainer,b.startOffset),!0),d=a(new f(b.endContainer,b.endOffset),!1),b=e.getDocument(b.startContainer).body.createTextRange();b.setEndPoint("StartToStart",c);b.setEndPoint("EndToEnd",d);return b});d.prototype.getName=
function(){return"WrappedRange"};b.WrappedRange=d;b.createRange=function(a){a=a||document;return new d(b.createNativeRange(a))};b.createRangyRange=function(a){a=a||document;return new h(a)};b.createIframeRange=function(a){return b.createRange(e.getIframeDocument(a))};b.createIframeRangyRange=function(a){return b.createRangyRange(e.getIframeDocument(a))};b.addCreateMissingNativeApiListener(function(a){a=a.document;"undefined"==typeof a.createRange&&(a.createRange=function(){return b.createRange(this)});
a=a=null})});
rangy.createModule("WrappedSelection",function(b,c){function a(a){return(a||window).getSelection()}function d(a){return(a||window).document.selection}function e(a,b,c){var d=c?"end":"start",c=c?"start":"end";a.anchorNode=b[d+"Container"];a.anchorOffset=b[d+"Offset"];a.focusNode=b[c+"Container"];a.focusOffset=b[c+"Offset"]}function f(a){a.anchorNode=a.focusNode=null;a.anchorOffset=a.focusOffset=0;a.rangeCount=0;a.isCollapsed=!0;a._ranges.length=0}function h(a){var c;a instanceof t?(c=a._selectionNativeRange,
c||(c=b.createNativeRange(p.getDocument(a.startContainer)),c.setEnd(a.endContainer,a.endOffset),c.setStart(a.startContainer,a.startOffset),a._selectionNativeRange=c,a.attachListener("detach",function(){this._selectionNativeRange=null}))):a instanceof q?c=a.nativeRange:b.features.implementsDomRange&&a instanceof p.getWindow(a.startContainer).Range&&(c=a);return c}function i(a){var b=a.getNodes(),c;a:if(!b.length||1!=b[0].nodeType)c=!1;else{c=1;for(var d=b.length;c<d;++c)if(!p.isAncestorOf(b[0],b[c])){c=
!1;break a}c=!0}if(!c)throw Error("getSingleElementFromRange: range "+a.inspect()+" did not consist of a single element");return b[0]}function g(a,b){var c=new q(b);a._ranges=[c];e(a,c,!1);a.rangeCount=1;a.isCollapsed=c.collapsed}function j(a){a._ranges.length=0;if("None"==a.docSelection.type)f(a);else{var c=a.docSelection.createRange();if(c&&"undefined"!=typeof c.text)g(a,c);else{a.rangeCount=c.length;for(var d,j=p.getDocument(c.item(0)),h=0;h<a.rangeCount;++h)d=b.createRange(j),d.selectNode(c.item(h)),
a._ranges.push(d);a.isCollapsed=1==a.rangeCount&&a._ranges[0].collapsed;e(a,a._ranges[a.rangeCount-1],!1)}}}function k(a,b){for(var c=a.docSelection.createRange(),d=i(b),e=p.getDocument(c.item(0)),e=p.getBody(e).createControlRange(),g=0,f=c.length;g<f;++g)e.add(c.item(g));try{e.add(d)}catch(h){throw Error("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");}e.select();j(a)}function m(a,b,c){this.nativeSelection=a;this.docSelection=b;this._ranges=
[];this.win=c;this.refresh()}function n(a,b){for(var c=p.getDocument(b[0].startContainer),c=p.getBody(c).createControlRange(),d=0,e;d<rangeCount;++d){e=i(b[d]);try{c.add(e)}catch(g){throw Error("setRanges(): Element within the one of the specified Ranges could not be added to control selection (does it have layout?)");}}c.select();j(a)}function v(a,b){if(a.anchorNode&&p.getDocument(a.anchorNode)!==p.getDocument(b))throw new y("WRONG_DOCUMENT_ERR");}function u(a){var b=[],c=new A(a.anchorNode,a.anchorOffset),
d=new A(a.focusNode,a.focusOffset),e="function"==typeof a.getName?a.getName():"Selection";if("undefined"!=typeof a.rangeCount)for(var g=0,j=a.rangeCount;g<j;++g)b[g]=t.inspect(a.getRangeAt(g));return"["+e+"(Ranges: "+b.join(", ")+")(anchor: "+c.inspect()+", focus: "+d.inspect()+"]"}b.requireModules(["DomUtil","DomRange","WrappedRange"]);b.config.checkSelectionRanges=!0;var p=b.dom,r=b.util,t=b.DomRange,q=b.WrappedRange,y=b.DOMException,A=p.DomPosition,B,D,z=b.util.isHostMethod(window,"getSelection"),
x=b.util.isHostObject(document,"selection"),G=x&&(!z||b.config.preferTextRange);G?(B=d,b.isSelectionValid=function(a){var a=(a||window).document,b=a.selection;return"None"!=b.type||p.getDocument(b.createRange().parentElement())==a}):z?(B=a,b.isSelectionValid=function(){return!0}):c.fail("Neither document.selection or window.getSelection() detected.");b.getNativeSelection=B;var z=B(),Q=b.createNativeRange(document),s=p.getBody(document),J=r.areHostObjects(z,r.areHostProperties(z,["anchorOffset","focusOffset"]));
b.features.selectionHasAnchorAndFocus=J;var N=r.isHostMethod(z,"extend");b.features.selectionHasExtend=N;var R="number"==typeof z.rangeCount;b.features.selectionHasRangeCount=R;var O=!1,w=!0;if(r.areHostMethods(z,["addRange","getRangeAt","removeAllRanges"])&&"number"==typeof z.rangeCount&&b.features.implementsDomRange){var l=document.createElement("iframe");s.appendChild(l);w=p.getIframeDocument(l);w.open();w.write("<html><head></head><body>12</body></html>");w.close();var H=p.getIframeWindow(l).getSelection(),
C=w.documentElement.lastChild.firstChild,E=w.createRange();E.setStart(C,1);E.collapse(!0);H.addRange(E);w=1==H.rangeCount;H.removeAllRanges();var M=E.cloneRange();E.setStart(C,0);M.setEnd(C,2);H.addRange(E);H.addRange(M);O=2==H.rangeCount;E.detach();M.detach();s.removeChild(l)}b.features.selectionSupportsMultipleRanges=O;b.features.collapsedNonEditableSelectionsSupported=w;var F=!1;s&&r.isHostMethod(s,"createControlRange")&&(s=s.createControlRange(),r.areHostProperties(s,["item","add"])&&(F=!0));
b.features.implementsControlRange=F;D=J?function(a){return a.anchorNode===a.focusNode&&a.anchorOffset===a.focusOffset}:function(a){return a.rangeCount?a.getRangeAt(a.rangeCount-1).collapsed:!1};var P;r.isHostMethod(z,"getRangeAt")?P=function(a,b){try{return a.getRangeAt(b)}catch(c){return null}}:J&&(P=function(a){var c=p.getDocument(a.anchorNode),c=b.createRange(c);c.setStart(a.anchorNode,a.anchorOffset);c.setEnd(a.focusNode,a.focusOffset);c.collapsed!==this.isCollapsed&&(c.setStart(a.focusNode,a.focusOffset),
c.setEnd(a.anchorNode,a.anchorOffset));return c});b.getSelection=function(a){var a=a||window,b=a._rangySelection,c=B(a),e=x?d(a):null;b?(b.nativeSelection=c,b.docSelection=e,b.refresh(a)):(b=new m(c,e,a),a._rangySelection=b);return b};b.getIframeSelection=function(a){return b.getSelection(p.getIframeWindow(a))};s=m.prototype;if(!G&&J&&r.areHostMethods(z,["removeAllRanges","addRange"])){s.removeAllRanges=function(){this.nativeSelection.removeAllRanges();f(this)};var K=function(a,c){var d=t.getRangeDocument(c),
d=b.createRange(d);d.collapseToPoint(c.endContainer,c.endOffset);a.nativeSelection.addRange(h(d));a.nativeSelection.extend(c.startContainer,c.startOffset);a.refresh()};s.addRange=R?function(a,c){if(F&&x&&"Control"==this.docSelection.type)k(this,a);else if(c&&N)K(this,a);else{var d;O?d=this.rangeCount:(this.removeAllRanges(),d=0);this.nativeSelection.addRange(h(a));this.rangeCount=this.nativeSelection.rangeCount;this.rangeCount==d+1?(b.config.checkSelectionRanges&&(d=P(this.nativeSelection,this.rangeCount-
1))&&!t.rangesEqual(d,a)&&(a=new q(d)),this._ranges[this.rangeCount-1]=a,e(this,a,L(this.nativeSelection)),this.isCollapsed=D(this)):this.refresh()}}:function(a,b){b&&N?K(this,a):(this.nativeSelection.addRange(h(a)),this.refresh())};s.setRanges=function(a){if(F&&1<a.length)n(this,a);else{this.removeAllRanges();for(var b=0,c=a.length;b<c;++b)this.addRange(a[b])}}}else if(r.isHostMethod(z,"empty")&&r.isHostMethod(Q,"select")&&F&&G)s.removeAllRanges=function(){try{if(this.docSelection.empty(),"None"!=
this.docSelection.type){var a;if(this.anchorNode)a=p.getDocument(this.anchorNode);else if("Control"==this.docSelection.type){var b=this.docSelection.createRange();b.length&&(a=p.getDocument(b.item(0)).body.createTextRange())}a&&(a.body.createTextRange().select(),this.docSelection.empty())}}catch(c){}f(this)},s.addRange=function(a){"Control"==this.docSelection.type?k(this,a):(q.rangeToTextRange(a).select(),this._ranges[0]=a,this.rangeCount=1,this.isCollapsed=this._ranges[0].collapsed,e(this,a,!1))},
s.setRanges=function(a){this.removeAllRanges();var b=a.length;1<b?n(this,a):b&&this.addRange(a[0])};else return c.fail("No means of selecting a Range or TextRange was found"),!1;s.getRangeAt=function(a){if(0>a||a>=this.rangeCount)throw new y("INDEX_SIZE_ERR");return this._ranges[a]};var I;if(G)I=function(a){var c;b.isSelectionValid(a.win)?c=a.docSelection.createRange():(c=p.getBody(a.win.document).createTextRange(),c.collapse(!0));"Control"==a.docSelection.type?j(a):c&&"undefined"!=typeof c.text?
g(a,c):f(a)};else if(r.isHostMethod(z,"getRangeAt")&&"number"==typeof z.rangeCount)I=function(a){if(F&&x&&"Control"==a.docSelection.type)j(a);else if(a._ranges.length=a.rangeCount=a.nativeSelection.rangeCount,a.rangeCount){for(var c=0,d=a.rangeCount;c<d;++c)a._ranges[c]=new b.WrappedRange(a.nativeSelection.getRangeAt(c));e(a,a._ranges[a.rangeCount-1],L(a.nativeSelection));a.isCollapsed=D(a)}else f(a)};else if(J&&"boolean"==typeof z.isCollapsed&&"boolean"==typeof Q.collapsed&&b.features.implementsDomRange)I=
function(a){var b;b=a.nativeSelection;b.anchorNode?(b=P(b,0),a._ranges=[b],a.rangeCount=1,b=a.nativeSelection,a.anchorNode=b.anchorNode,a.anchorOffset=b.anchorOffset,a.focusNode=b.focusNode,a.focusOffset=b.focusOffset,a.isCollapsed=D(a)):f(a)};else return c.fail("No means of obtaining a Range or TextRange from the user's selection was found"),!1;s.refresh=function(a){var b=a?this._ranges.slice(0):null;I(this);if(a){a=b.length;if(a!=this._ranges.length)return!1;for(;a--;)if(!t.rangesEqual(b[a],this._ranges[a]))return!1;
return!0}};var T=function(a,b){var c=a.getAllRanges(),d=!1;a.removeAllRanges();for(var e=0,g=c.length;e<g;++e)d||b!==c[e]?a.addRange(c[e]):d=!0;a.rangeCount||f(a)};s.removeRange=F?function(a){if("Control"==this.docSelection.type){for(var b=this.docSelection.createRange(),a=i(a),c=p.getDocument(b.item(0)),c=p.getBody(c).createControlRange(),d,e=!1,g=0,f=b.length;g<f;++g)d=b.item(g),d!==a||e?c.add(b.item(g)):e=!0;c.select();j(this)}else T(this,a)}:function(a){T(this,a)};var L;!G&&J&&b.features.implementsDomRange?
(L=function(a){var b=!1;a.anchorNode&&(b=1==p.comparePoints(a.anchorNode,a.anchorOffset,a.focusNode,a.focusOffset));return b},s.isBackwards=function(){return L(this)}):L=s.isBackwards=function(){return!1};s.toString=function(){for(var a=[],b=0,c=this.rangeCount;b<c;++b)a[b]=""+this._ranges[b];return a.join("")};s.collapse=function(a,c){v(this,a);var d=b.createRange(p.getDocument(a));d.collapseToPoint(a,c);this.removeAllRanges();this.addRange(d);this.isCollapsed=!0};s.collapseToStart=function(){if(this.rangeCount){var a=
this._ranges[0];this.collapse(a.startContainer,a.startOffset)}else throw new y("INVALID_STATE_ERR");};s.collapseToEnd=function(){if(this.rangeCount){var a=this._ranges[this.rangeCount-1];this.collapse(a.endContainer,a.endOffset)}else throw new y("INVALID_STATE_ERR");};s.selectAllChildren=function(a){v(this,a);var c=b.createRange(p.getDocument(a));c.selectNodeContents(a);this.removeAllRanges();this.addRange(c)};s.deleteFromDocument=function(){if(F&&x&&"Control"==this.docSelection.type){for(var a=this.docSelection.createRange(),
b;a.length;)b=a.item(0),a.remove(b),b.parentNode.removeChild(b);this.refresh()}else if(this.rangeCount){a=this.getAllRanges();this.removeAllRanges();b=0;for(var c=a.length;b<c;++b)a[b].deleteContents();this.addRange(a[c-1])}};s.getAllRanges=function(){return this._ranges.slice(0)};s.setSingleRange=function(a){this.setRanges([a])};s.containsNode=function(a,b){for(var c=0,d=this._ranges.length;c<d;++c)if(this._ranges[c].containsNode(a,b))return!0;return!1};s.toHtml=function(){var a="";if(this.rangeCount){for(var a=
t.getRangeDocument(this._ranges[0]).createElement("div"),b=0,c=this._ranges.length;b<c;++b)a.appendChild(this._ranges[b].cloneContents());a=a.innerHTML}return a};s.getName=function(){return"WrappedSelection"};s.inspect=function(){return u(this)};s.detach=function(){this.win=this.anchorNode=this.focusNode=this.win._rangySelection=null};m.inspect=u;b.Selection=m;b.selectionPrototype=s;b.addCreateMissingNativeApiListener(function(a){"undefined"==typeof a.getSelection&&(a.getSelection=function(){return b.getSelection(this)});
a=null})});var Base=function(){};
Base.extend=function(b,c){var a=Base.prototype.extend;Base._prototyping=!0;var d=new this;a.call(d,b);d.base=function(){};delete Base._prototyping;var e=d.constructor,f=d.constructor=function(){if(!Base._prototyping)if(this._constructing||this.constructor==f)this._constructing=!0,e.apply(this,arguments),delete this._constructing;else if(null!=arguments[0])return(arguments[0].extend||a).call(arguments[0],d)};f.ancestor=this;f.extend=this.extend;f.forEach=this.forEach;f.implement=this.implement;f.prototype=
d;f.toString=this.toString;f.valueOf=function(a){return"object"==a?f:e.valueOf()};a.call(f,c);"function"==typeof f.init&&f.init();return f};
Base.prototype={extend:function(b,c){if(1<arguments.length){var a=this[b];if(a&&"function"==typeof c&&(!a.valueOf||a.valueOf()!=c.valueOf())&&/\bbase\b/.test(c)){var d=c.valueOf(),c=function(){var b=this.base||Base.prototype.base;this.base=a;var c=d.apply(this,arguments);this.base=b;return c};c.valueOf=function(a){return"object"==a?c:d};c.toString=Base.toString}this[b]=c}else if(b){var e=Base.prototype.extend;!Base._prototyping&&"function"!=typeof this&&(e=this.extend||e);for(var f={toSource:null},
h=["constructor","toString","valueOf"],i=Base._prototyping?0:1;g=h[i++];)b[g]!=f[g]&&e.call(this,g,b[g]);for(var g in b)f[g]||e.call(this,g,b[g])}return this}};
Base=Base.extend({constructor:function(b){this.extend(b)}},{ancestor:Object,version:"1.1",forEach:function(b,c,a){for(var d in b)void 0===this.prototype[d]&&c.call(a,b[d],d,b)},implement:function(){for(var b=0;b<arguments.length;b++)if("function"==typeof arguments[b])arguments[b](this.prototype);else this.prototype.extend(arguments[b]);return this},toString:function(){return String(this.valueOf())}});
wysihtml5.browser=function(){var b=navigator.userAgent,c=document.createElement("div"),a=-1!==b.indexOf("MSIE")&&-1===b.indexOf("Opera"),d=-1!==b.indexOf("Gecko")&&-1===b.indexOf("KHTML"),e=-1!==b.indexOf("AppleWebKit/"),f=-1!==b.indexOf("Chrome/"),h=-1!==b.indexOf("Opera/"),i={formatBlock:a,insertUnorderedList:a||e,insertOrderedList:a||e},g={insertHTML:d};return{USER_AGENT:b,supported:function(){var a=this.USER_AGENT.toLowerCase(),b="contentEditable"in c,d=document.execCommand&&document.queryCommandSupported&&
document.queryCommandState,e=document.querySelector&&document.querySelectorAll,a=this.isIos()&&5>+(/ipad|iphone|ipod/.test(a)&&a.match(/ os (\d+).+? like mac os x/)||[,0])[1]||this.isAndroid()&&4>+(a.match(/android (\d+)/)||[,0])[1]||-1!==a.indexOf("opera mobi")||-1!==a.indexOf("hpwos/");return b&&d&&e&&!a},isTouchDevice:function(){return this.supportsEvent("touchmove")},isIos:function(){return/ipad|iphone|ipod/i.test(this.USER_AGENT)},isAndroid:function(){return-1!==this.USER_AGENT.indexOf("Android")},
supportsSandboxedIframes:function(){return a},throwsMixedContentWarningWhenIframeSrcIsEmpty:function(){return!("querySelector"in document)},displaysCaretInEmptyContentEditableCorrectly:function(){return a},hasCurrentStyleProperty:function(){return"currentStyle"in c},hasHistoryIssue:function(){return d},insertsLineBreaksOnReturn:function(){return d},supportsPlaceholderAttributeOn:function(a){return"placeholder"in a},supportsEvent:function(a){var b;if(!(b="on"+a in c))c.setAttribute("on"+a,"return;"),
b="function"===typeof c["on"+a];return b},supportsEventsInIframeCorrectly:function(){return!h},supportsHTML5Tags:function(a){a=a.createElement("div");a.innerHTML="<article>foo</article>";return"<article>foo</article>"===a.innerHTML.toLowerCase()},supportsCommand:function(a,b){if(!i[b]){try{return a.queryCommandSupported(b)}catch(c){}try{return a.queryCommandEnabled(b)}catch(d){return!!g[b]}}return!1},doesAutoLinkingInContentEditable:function(){return a},canDisableAutoLinking:function(){return this.supportsCommand(document,
"AutoUrlDetect")},clearsContentEditableCorrectly:function(){return d||h||e},supportsGetAttributeCorrectly:function(){return"1"!=document.createElement("td").getAttribute("rowspan")},canSelectImagesInContentEditable:function(){return d||a||h},autoScrollsToCaret:function(){return!e},autoClosesUnclosedTags:function(){var a=c.cloneNode(!1),b;a.innerHTML="<p><div></div>";a=a.innerHTML.toLowerCase();b="<p></p><div></div>"===a||"<p><div></div></p>"===a;this.autoClosesUnclosedTags=function(){return b};return b},
supportsNativeGetElementsByClassName:function(){return-1!==String(document.getElementsByClassName).indexOf("[native code]")},supportsSelectionModify:function(){return"getSelection"in window&&"modify"in window.getSelection()},needsSpaceAfterLineBreak:function(){return h},supportsSpeechApiOn:function(a){return 11<=(b.match(/Chrome\/(\d+)/)||[,0])[1]&&("onwebkitspeechchange"in a||"speech"in a)},crashesWhenDefineProperty:function(b){return a&&("XMLHttpRequest"===b||"XDomainRequest"===b)},doesAsyncFocus:function(){return a},
hasProblemsSettingCaretAfterImg:function(){return a},hasUndoInContextMenu:function(){return d||f||h},hasInsertNodeIssue:function(){return h},hasIframeFocusIssue:function(){return a}}}();
wysihtml5.lang.array=function(b){return{contains:function(c){if(b.indexOf)return-1!==b.indexOf(c);for(var a=0,d=b.length;a<d;a++)if(b[a]===c)return!0;return!1},without:function(c){for(var c=wysihtml5.lang.array(c),a=[],d=0,e=b.length;d<e;d++)c.contains(b[d])||a.push(b[d]);return a},get:function(){for(var c=0,a=b.length,d=[];c<a;c++)d.push(b[c]);return d}}};
wysihtml5.lang.Dispatcher=Base.extend({on:function(b,c){this.events=this.events||{};this.events[b]=this.events[b]||[];this.events[b].push(c);return this},off:function(b,c){this.events=this.events||{};var a=0,d,e;if(b){d=this.events[b]||[];for(e=[];a<d.length;a++)d[a]!==c&&c&&e.push(d[a]);this.events[b]=e}else this.events={};return this},fire:function(b,c){this.events=this.events||{};for(var a=this.events[b]||[],d=0;d<a.length;d++)a[d].call(this,c);return this},observe:function(){return this.on.apply(this,
arguments)},stopObserving:function(){return this.off.apply(this,arguments)}});wysihtml5.lang.object=function(b){return{merge:function(c){for(var a in c)b[a]=c[a];return this},get:function(){return b},clone:function(){var c={},a;for(a in b)c[a]=b[a];return c},isArray:function(){return"[object Array]"===Object.prototype.toString.call(b)}}};
(function(){var b=/^\s+/,c=/\s+$/;wysihtml5.lang.string=function(a){a=String(a);return{trim:function(){return a.replace(b,"").replace(c,"")},interpolate:function(b){for(var c in b)a=this.replace("#{"+c+"}").by(b[c]);return a},replace:function(b){return{by:function(c){return a.split(b).join(c)}}}}}})();
(function(b){function c(i){if(!a.contains(i.nodeName))if(i.nodeType===b.TEXT_NODE&&i.data.match(d)){var g=i.parentNode,j;j=g.ownerDocument;var k=j._wysihtml5_tempElement;k||(k=j._wysihtml5_tempElement=j.createElement("div"));j=k;j.innerHTML="<span></span>"+i.data.replace(d,function(a,b){var c=(b.match(e)||[])[1]||"",d=h[c],b=b.replace(e,"");b.split(d).length>b.split(c).length&&(b+=c,c="");var g=d=b;b.length>f&&(g=g.substr(0,f)+"...");"www."===d.substr(0,4)&&(d="http://"+d);return'<a href="'+d+'">'+
g+"</a>"+c});for(j.removeChild(j.firstChild);j.firstChild;)g.insertBefore(j.firstChild,i);g.removeChild(i)}else{g=b.lang.array(i.childNodes).get();j=g.length;for(k=0;k<j;k++)c(g[k]);return i}}var a=b.lang.array("CODE PRE A SCRIPT HEAD TITLE STYLE".split(" ")),d=/((https?:\/\/|www\.)[^\s<]{3,})/gi,e=/([^\w\/\-](,?))$/i,f=100,h={")":"(","]":"[","}":"{"};b.dom.autoLink=function(b){var d;a:{d=b;for(var e;d.parentNode;){d=d.parentNode;e=d.nodeName;if(a.contains(e)){d=!0;break a}if("body"===e)break}d=!1}if(d)return b;
b===b.ownerDocument.documentElement&&(b=b.ownerDocument.body);return c(b)};b.dom.autoLink.URL_REG_EXP=d})(wysihtml5);
(function(b){var c=b.dom;c.addClass=function(a,b){var e=a.classList;if(e)return e.add(b);c.hasClass(a,b)||(a.className+=" "+b)};c.removeClass=function(a,b){var c=a.classList;if(c)return c.remove(b);a.className=a.className.replace(RegExp("(^|\\s+)"+b+"(\\s+|$)")," ")};c.hasClass=function(a,b){var c=a.classList;if(c)return c.contains(b);c=a.className;return 0<c.length&&(c==b||RegExp("(^|\\s)"+b+"(\\s|$)").test(c))}})(wysihtml5);
wysihtml5.dom.contains=function(){var b=document.documentElement;if(b.contains)return function(b,a){a.nodeType!==wysihtml5.ELEMENT_NODE&&(a=a.parentNode);return b!==a&&b.contains(a)};if(b.compareDocumentPosition)return function(b,a){return!!(b.compareDocumentPosition(a)&16)}}();
wysihtml5.dom.convertToList=function(){function b(b,a){var d=b.createElement("li");a.appendChild(d);return d}return function(c,a){if("UL"===c.nodeName||"OL"===c.nodeName||"MENU"===c.nodeName)return c;var d=c.ownerDocument,e=d.createElement(a),f=c.querySelectorAll("br"),h=f.length,i,g,j,k,m;for(m=0;m<h;m++)for(i=f[m];(g=i.parentNode)&&g!==c&&g.lastChild===i;){if("block"===wysihtml5.dom.getStyle("display").from(g)){g.removeChild(i);break}wysihtml5.dom.insert(i).after(i.parentNode)}f=wysihtml5.lang.array(c.childNodes).get();
h=f.length;for(m=0;m<h;m++)k=k||b(d,e),i=f[m],g="block"===wysihtml5.dom.getStyle("display").from(i),j="BR"===i.nodeName,g?(k=k.firstChild?b(d,e):k,k.appendChild(i),k=null):j?k=k.firstChild?null:k:k.appendChild(i);0===f.length&&b(d,e);c.parentNode.replaceChild(e,c);return e}}();wysihtml5.dom.copyAttributes=function(b){return{from:function(c){return{to:function(a){for(var d,e=0,f=b.length;e<f;e++)d=b[e],"undefined"!==typeof c[d]&&""!==c[d]&&(a[d]=c[d]);return{andTo:arguments.callee}}}}}};
(function(b){var c=["-webkit-box-sizing","-moz-box-sizing","-ms-box-sizing","box-sizing"];b.copyStyles=function(a){return{from:function(d){var e;b:{e=0;for(var f=c.length;e<f;e++)if("border-box"===b.getStyle(c[e]).from(d)){e=c[e];break b}e=void 0}e=e?parseInt(b.getStyle("width").from(d),10)<d.offsetWidth:!1;e&&(a=wysihtml5.lang.array(a).without(c));var h="";e=a.length;for(var f=0,i;f<e;f++)i=a[f],h+=i+":"+b.getStyle(i).from(d)+";";return{to:function(a){b.setStyles(h).on(a);return{andTo:arguments.callee}}}}}}})(wysihtml5.dom);
(function(b){b.dom.delegate=function(c,a,d,e){return b.dom.observe(c,d,function(d){for(var h=d.target,i=b.lang.array(c.querySelectorAll(a));h&&h!==c;){if(i.contains(h)){e.call(h,d);break}h=h.parentNode}})}})(wysihtml5);
wysihtml5.dom.getAsDom=function(){var b="abbr article aside audio bdi canvas command datalist details figcaption figure footer header hgroup keygen mark meter nav output progress rp rt ruby svg section source summary time track video wbr".split(" ");return function(c,a){var a=a||document,d;if("object"===typeof c&&c.nodeType)d=a.createElement("div"),d.appendChild(c);else if(wysihtml5.browser.supportsHTML5Tags(a))d=a.createElement("div"),d.innerHTML=c;else{d=a;if(!d._wysihtml5_supportsHTML5Tags){for(var e=
0,f=b.length;e<f;e++)d.createElement(b[e]);d._wysihtml5_supportsHTML5Tags=!0}d=a;e=d.createElement("div");e.style.display="none";d.body.appendChild(e);try{e.innerHTML=c}catch(h){}d.body.removeChild(e);d=e}return d}}();
wysihtml5.dom.getParentElement=function(){function b(b,a){return!a||!a.length?!0:"string"===typeof a?b===a:wysihtml5.lang.array(a).contains(b)}return function(c,a,d){d=d||50;if(a.className||a.classRegExp){a:{for(var e=a.nodeName,f=a.className,a=a.classRegExp;d--&&c&&"BODY"!==c.nodeName;){var h;if(h=c.nodeType===wysihtml5.ELEMENT_NODE)if(h=b(c.nodeName,e)){h=f;var i=(c.className||"").match(a)||[];h=!h?!!i.length:i[i.length-1]===h}if(h)break a;c=c.parentNode}c=null}return c}a:{e=a.nodeName;for(f=d;f--&&
c&&"BODY"!==c.nodeName;){if(b(c.nodeName,e))break a;c=c.parentNode}c=null}return c}}();
wysihtml5.dom.getStyle=function(){var b={"float":"styleFloat"in document.createElement("div").style?"styleFloat":"cssFloat"},c=/\-[a-z]/g;return function(a){return{from:function(d){if(d.nodeType===wysihtml5.ELEMENT_NODE){var e=d.ownerDocument,f=b[a]||a.replace(c,function(a){return a.charAt(1).toUpperCase()}),h=d.style,i=d.currentStyle,g=h[f];if(g)return g;if(i)try{return i[f]}catch(j){}var f=e.defaultView||e.parentWindow,e=("height"===a||"width"===a)&&"TEXTAREA"===d.nodeName,k;if(f.getComputedStyle)return e&&
(k=h.overflow,h.overflow="hidden"),d=f.getComputedStyle(d,null).getPropertyValue(a),e&&(h.overflow=k||""),d}}}}}();wysihtml5.dom.hasElementWithTagName=function(){var b={},c=1;return function(a,d){var e=(a._wysihtml5_identifier||(a._wysihtml5_identifier=c++))+":"+d,f=b[e];f||(f=b[e]=a.getElementsByTagName(d));return 0<f.length}}();
(function(b){var c={},a=1;b.dom.hasElementWithClassName=function(d,e){if(!b.browser.supportsNativeGetElementsByClassName())return!!d.querySelector("."+e);var f=(d._wysihtml5_identifier||(d._wysihtml5_identifier=a++))+":"+e,h=c[f];h||(h=c[f]=d.getElementsByClassName(e));return 0<h.length}})(wysihtml5);wysihtml5.dom.insert=function(b){return{after:function(c){c.parentNode.insertBefore(b,c.nextSibling)},before:function(c){c.parentNode.insertBefore(b,c)},into:function(c){c.appendChild(b)}}};
wysihtml5.dom.insertCSS=function(b){b=b.join("\n");return{into:function(c){var a=c.createElement("style");a.type="text/css";a.styleSheet?a.styleSheet.cssText=b:a.appendChild(c.createTextNode(b));var d=c.querySelector("head link");d?d.parentNode.insertBefore(a,d):(c=c.querySelector("head"))&&c.appendChild(a)}}};
wysihtml5.dom.observe=function(b,c,a){for(var c="string"===typeof c?[c]:c,d,e,f=0,h=c.length;f<h;f++)e=c[f],b.addEventListener?b.addEventListener(e,a,!1):(d=function(c){"target"in c||(c.target=c.srcElement);c.preventDefault=c.preventDefault||function(){this.returnValue=!1};c.stopPropagation=c.stopPropagation||function(){this.cancelBubble=!0};a.call(b,c)},b.attachEvent("on"+e,d));return{stop:function(){for(var e,g=0,f=c.length;g<f;g++)e=c[g],b.removeEventListener?b.removeEventListener(e,a,!1):b.detachEvent("on"+
e,d)}}};
wysihtml5.dom.parse=function(){function b(c,e){var g=c.childNodes,f=g.length,j=a[c.nodeType],h=0,k,j=j&&j(c);if(!j)return null;for(h=0;h<f;h++)(k=b(g[h],e))&&j.appendChild(k);return e&&1>=j.childNodes.length&&j.nodeName.toLowerCase()===d&&!j.attributes.length?j.firstChild:j}function c(a,b){var b=b.toLowerCase(),c;if(c="IMG"==a.nodeName)if(c="src"==b){var d;a:{try{d=a.complete&&!a.mozMatchesSelector(":-moz-broken");break a}catch(e){if(a.complete&&"complete"===a.readyState){d=!0;break a}}d=void 0}c=
!0===d}return c?a.src:i&&"outerHTML"in a?-1!=a.outerHTML.toLowerCase().indexOf(" "+b+"=")?a.getAttribute(b):null:a.getAttribute(b)}var a={1:function(a){var b,g,j=h.tags;g=a.nodeName.toLowerCase();b=a.scopeName;if(a._wysihtml5)return null;a._wysihtml5=1;if("wysihtml5-temp"===a.className)return null;b&&"HTML"!=b&&(g=b+":"+g);"outerHTML"in a&&!wysihtml5.browser.autoClosesUnclosedTags()&&("P"===a.nodeName&&"</p>"!==a.outerHTML.slice(-4).toLowerCase())&&(g="div");if(g in j){b=j[g];if(!b||b.remove)return null;
b="string"===typeof b?{rename_tag:b}:b}else if(a.firstChild)b={rename_tag:d};else return null;g=a.ownerDocument.createElement(b.rename_tag||g);var j={},f=b.set_class,k=b.add_class,i=b.set_attributes,m=b.check_attributes,n=h.classes,p=0,t=[];b=[];var u=[],r=[],w;i&&(j=wysihtml5.lang.object(i).clone());if(m)for(w in m)if(i=v[m[w]])i=i(c(a,w)),"string"===typeof i&&(j[w]=i);f&&t.push(f);if(k)for(w in k)if(i=q[k[w]])f=i(c(a,w)),"string"===typeof f&&t.push(f);n["_wysihtml5-temp-placeholder"]=1;(r=a.getAttribute("class"))&&
(t=t.concat(r.split(e)));for(k=t.length;p<k;p++)a=t[p],n[a]&&b.push(a);for(n=b.length;n--;)a=b[n],wysihtml5.lang.array(u).contains(a)||u.unshift(a);u.length&&(j["class"]=u.join(" "));for(w in j)try{g.setAttribute(w,j[w])}catch(l){}j.src&&("undefined"!==typeof j.width&&g.setAttribute("width",j.width),"undefined"!==typeof j.height&&g.setAttribute("height",j.height));return g},3:function(a){return a.ownerDocument.createTextNode(a.data)}},d="span",e=/\s+/,f={tags:{},classes:{}},h={},i=!wysihtml5.browser.supportsGetAttributeCorrectly(),
g=/^https?:\/\//i,j=/^(\/|https?:\/\/)/i,k=/^(\/|https?:\/\/|mailto:)/i,m=/[^ a-z0-9_\-]/gi,n=/\D/g,v={url:function(a){return!a||!a.match(g)?null:a.replace(g,function(a){return a.toLowerCase()})},src:function(a){return!a||!a.match(j)?null:a.replace(j,function(a){return a.toLowerCase()})},href:function(a){return!a||!a.match(k)?null:a.replace(k,function(a){return a.toLowerCase()})},alt:function(a){return!a?"":a.replace(m,"")},numbers:function(a){return(a=(a||"").replace(n,""))||null}},u={left:"wysiwyg-float-left",
right:"wysiwyg-float-right"},p={left:"wysiwyg-text-align-left",right:"wysiwyg-text-align-right",center:"wysiwyg-text-align-center",justify:"wysiwyg-text-align-justify"},r={left:"wysiwyg-clear-left",right:"wysiwyg-clear-right",both:"wysiwyg-clear-both",all:"wysiwyg-clear-both"},t={1:"wysiwyg-font-size-xx-small",2:"wysiwyg-font-size-small",3:"wysiwyg-font-size-medium",4:"wysiwyg-font-size-large",5:"wysiwyg-font-size-x-large",6:"wysiwyg-font-size-xx-large",7:"wysiwyg-font-size-xx-large","-":"wysiwyg-font-size-smaller",
"+":"wysiwyg-font-size-larger"},q={align_img:function(a){return u[String(a).toLowerCase()]},align_text:function(a){return p[String(a).toLowerCase()]},clear_br:function(a){return r[String(a).toLowerCase()]},size_font:function(a){return t[String(a).charAt(0)]}};return function(a,c,d,e){wysihtml5.lang.object(h).merge(f).merge(c).get();for(var d=d||a.ownerDocument||document,c=d.createDocumentFragment(),g="string"===typeof a,a=g?wysihtml5.dom.getAsDom(a,d):a;a.firstChild;)d=a.firstChild,a.removeChild(d),
(d=b(d,e))&&c.appendChild(d);a.innerHTML="";a.appendChild(c);return g?wysihtml5.quirks.getCorrectInnerHTML(a):a}}();wysihtml5.dom.removeEmptyTextNodes=function(b){for(var c=wysihtml5.lang.array(b.childNodes).get(),a=c.length,d=0;d<a;d++)b=c[d],b.nodeType===wysihtml5.TEXT_NODE&&""===b.data&&b.parentNode.removeChild(b)};
wysihtml5.dom.renameElement=function(b,c){for(var a=b.ownerDocument.createElement(c),d;d=b.firstChild;)a.appendChild(d);wysihtml5.dom.copyAttributes(["align","className"]).from(b).to(a);b.parentNode.replaceChild(a,b);return a};wysihtml5.dom.replaceWithChildNodes=function(b){if(b.parentNode)if(b.firstChild){for(var c=b.ownerDocument.createDocumentFragment();b.firstChild;)c.appendChild(b.firstChild);b.parentNode.replaceChild(c,b)}else b.parentNode.removeChild(b)};
(function(b){function c(a){var b=a.ownerDocument.createElement("br");a.appendChild(b)}b.resolveList=function(a,d){if(a.nodeName.match(/^(MENU|UL|OL)$/)){var e=a.ownerDocument,f=e.createDocumentFragment(),h=a.previousElementSibling||a.previousSibling,i,g;if(d)for(h&&"block"!==b.getStyle("display").from(h)&&c(f);g=a.firstElementChild||a.firstChild;){for(e=g.lastChild;h=g.firstChild;)i=(i=h===e)&&"block"!==b.getStyle("display").from(h)&&"BR"!==h.nodeName,f.appendChild(h),i&&c(f);g.parentNode.removeChild(g)}else for(;g=
a.firstElementChild||a.firstChild;){if(g.querySelector&&g.querySelector("div, p, ul, ol, menu, blockquote, h1, h2, h3, h4, h5, h6"))for(;h=g.firstChild;)f.appendChild(h);else{for(i=e.createElement("p");h=g.firstChild;)i.appendChild(h);f.appendChild(i)}g.parentNode.removeChild(g)}a.parentNode.replaceChild(f,a)}}})(wysihtml5.dom);
(function(b){var c=document,a="parent top opener frameElement frames localStorage globalStorage sessionStorage indexedDB".split(" "),d="open close openDialog showModalDialog alert confirm prompt openDatabase postMessage XMLHttpRequest XDomainRequest".split(" "),e=["referrer","write","open","close"];b.dom.Sandbox=Base.extend({constructor:function(a,c){this.callback=a||b.EMPTY_FUNCTION;this.config=b.lang.object({}).merge(c).get();this.iframe=this._createIframe()},insertInto:function(a){"string"===typeof a&&
(a=c.getElementById(a));a.appendChild(this.iframe)},getIframe:function(){return this.iframe},getWindow:function(){this._readyError()},getDocument:function(){this._readyError()},destroy:function(){var a=this.getIframe();a.parentNode.removeChild(a)},_readyError:function(){throw Error("wysihtml5.Sandbox: Sandbox iframe isn't loaded yet");},_createIframe:function(){var a=this,d=c.createElement("iframe");d.className="wysihtml5-sandbox";b.dom.setAttributes({security:"restricted",allowtransparency:"true",
frameborder:0,width:0,height:0,marginwidth:0,marginheight:0}).on(d);b.browser.throwsMixedContentWarningWhenIframeSrcIsEmpty()&&(d.src="javascript:'<html></html>'");d.onload=function(){d.onreadystatechange=d.onload=null;a._onLoadIframe(d)};d.onreadystatechange=function(){/loaded|complete/.test(d.readyState)&&(d.onreadystatechange=d.onload=null,a._onLoadIframe(d))};return d},_onLoadIframe:function(f){if(b.dom.contains(c.documentElement,f)){var h=this,i=f.contentWindow,g=f.contentWindow.document,j=this._getHtml({charset:c.characterSet||
c.charset||"utf-8",stylesheets:this.config.stylesheets});g.open("text/html","replace");g.write(j);g.close();this.getWindow=function(){return f.contentWindow};this.getDocument=function(){return f.contentWindow.document};i.onerror=function(a,b,c){throw Error("wysihtml5.Sandbox: "+a,b,c);};if(!b.browser.supportsSandboxedIframes()){var k,j=0;for(k=a.length;j<k;j++)this._unset(i,a[j]);j=0;for(k=d.length;j<k;j++)this._unset(i,d[j],b.EMPTY_FUNCTION);j=0;for(k=e.length;j<k;j++)this._unset(g,e[j]);this._unset(g,
"cookie","",!0)}this.loaded=!0;setTimeout(function(){h.callback(h)},0)}},_getHtml:function(a){var c=a.stylesheets,d="",e=0,j;if(c="string"===typeof c?[c]:c)for(j=c.length;e<j;e++)d+='<link rel="stylesheet" href="'+c[e]+'">';a.stylesheets=d;return b.lang.string('<!DOCTYPE html><html><head><meta charset="#{charset}">#{stylesheets}</head><body></body></html>').interpolate(a)},_unset:function(a,c,d,e){try{a[c]=d}catch(j){}try{a.__defineGetter__(c,function(){return d})}catch(k){}if(e)try{a.__defineSetter__(c,
function(){})}catch(m){}if(!b.browser.crashesWhenDefineProperty(c))try{var n={get:function(){return d}};e&&(n.set=function(){});Object.defineProperty(a,c,n)}catch(v){}}})})(wysihtml5);(function(){var b={className:"class"};wysihtml5.dom.setAttributes=function(c){return{on:function(a){for(var d in c)a.setAttribute(b[d]||d,c[d])}}}})();
wysihtml5.dom.setStyles=function(b){return{on:function(c){c=c.style;if("string"===typeof b)c.cssText+=";"+b;else for(var a in b)"float"===a?(c.cssFloat=b[a],c.styleFloat=b[a]):c[a]=b[a]}}};
(function(b){b.simulatePlaceholder=function(c,a,d){var e=function(){a.hasPlaceholderSet()&&a.clear();a.placeholderSet=!1;b.removeClass(a.element,"placeholder")},f=function(){a.isEmpty()&&(a.placeholderSet=!0,a.setValue(d),b.addClass(a.element,"placeholder"))};c.on("set_placeholder",f).on("unset_placeholder",e).on("focus:composer",e).on("paste:composer",e).on("blur:composer",f);f()}})(wysihtml5.dom);
(function(b){var c=document.documentElement;"textContent"in c?(b.setTextContent=function(a,b){a.textContent=b},b.getTextContent=function(a){return a.textContent}):"innerText"in c?(b.setTextContent=function(a,b){a.innerText=b},b.getTextContent=function(a){return a.innerText}):(b.setTextContent=function(a,b){a.nodeValue=b},b.getTextContent=function(a){return a.nodeValue})})(wysihtml5.dom);
wysihtml5.quirks.cleanPastedHTML=function(){var b={"a u":wysihtml5.dom.replaceWithChildNodes};return function(c,a,d){var a=a||b,d=d||c.ownerDocument||document,e="string"===typeof c,f,h,i,g=0,c=e?wysihtml5.dom.getAsDom(c,d):c;for(i in a){f=c.querySelectorAll(i);d=a[i];for(h=f.length;g<h;g++)d(f[g])}return e?c.innerHTML:c}}();
wysihtml5.quirks.ensureProperClearing=function(){var b=function(){var b=this;setTimeout(function(){var a=b.innerHTML.toLowerCase();if("<p>&nbsp;</p>"==a||"<p>&nbsp;</p><p>&nbsp;</p>"==a)b.innerHTML=""},0)};return function(c){wysihtml5.dom.observe(c.element,["cut","keydown"],b)}}();
(function(b){b.quirks.getCorrectInnerHTML=function(c){var a=c.innerHTML;if(-1===a.indexOf("%7E"))return a;var c=c.querySelectorAll("[href*='~'], [src*='~']"),d,e,f,h;h=0;for(f=c.length;h<f;h++)d=c[h].href||c[h].src,e=b.lang.string(d).replace("~").by("%7E"),a=b.lang.string(a).replace(e).by(d);return a}})(wysihtml5);
(function(b){b.quirks.redraw=function(c){b.dom.addClass(c,"wysihtml5-quirks-redraw");b.dom.removeClass(c,"wysihtml5-quirks-redraw");try{var a=c.ownerDocument;a.execCommand("italic",!1,null);a.execCommand("italic",!1,null)}catch(d){}}})(wysihtml5);
(function(b){var c=b.dom;b.Selection=Base.extend({constructor:function(a){window.rangy.init();this.editor=a;this.composer=a.composer;this.doc=this.composer.doc},getBookmark:function(){var a=this.getRange();return a&&a.cloneRange()},setBookmark:function(a){a&&this.setSelection(a)},setBefore:function(a){var b=rangy.createRange(this.doc);b.setStartBefore(a);b.setEndBefore(a);return this.setSelection(b)},setAfter:function(a){var b=rangy.createRange(this.doc);b.setStartAfter(a);b.setEndAfter(a);return this.setSelection(b)},
selectNode:function(a,d){var e=rangy.createRange(this.doc),f=a.nodeType===b.ELEMENT_NODE,h="canHaveHTML"in a?a.canHaveHTML:"IMG"!==a.nodeName,i=f?a.innerHTML:a.data,i=""===i||i===b.INVISIBLE_SPACE,g=c.getStyle("display").from(a),g="block"===g||"list-item"===g;if(i&&f&&h&&!d)try{a.innerHTML=b.INVISIBLE_SPACE}catch(j){}h?e.selectNodeContents(a):e.selectNode(a);h&&i&&f?e.collapse(g):h&&i&&(e.setStartAfter(a),e.setEndAfter(a));this.setSelection(e)},getSelectedNode:function(a){if(a&&this.doc.selection&&
"Control"===this.doc.selection.type&&(a=this.doc.selection.createRange())&&a.length)return a.item(0);a=this.getSelection(this.doc);return a.focusNode===a.anchorNode?a.focusNode:(a=this.getRange(this.doc))?a.commonAncestorContainer:this.doc.body},executeAndRestore:function(a,d){var e=this.doc.body,f=d&&e.scrollTop,h=d&&e.scrollLeft,i='<span class="_wysihtml5-temp-placeholder">'+b.INVISIBLE_SPACE+"</span>",g=this.getRange(this.doc),j;if(g){b.browser.hasInsertNodeIssue()?this.doc.execCommand("insertHTML",
!1,i):(i=g.createContextualFragment(i),g.insertNode(i));try{a(g.startContainer,g.endContainer)}catch(k){setTimeout(function(){throw k;},0)}(g=this.doc.querySelector("._wysihtml5-temp-placeholder"))?(i=rangy.createRange(this.doc),j=g.nextSibling,b.browser.hasInsertNodeIssue()&&j&&"BR"===j.nodeName?(j=this.doc.createTextNode(b.INVISIBLE_SPACE),c.insert(j).after(g),i.setStartBefore(j),i.setEndBefore(j)):(i.selectNode(g),i.deleteContents()),this.setSelection(i)):e.focus();d&&(e.scrollTop=f,e.scrollLeft=
h);try{g.parentNode.removeChild(g)}catch(m){}}else a(e,e)},executeAndRestoreSimple:function(a){var b,c,f=this.getRange(),h=this.doc.body,i;if(f){b=f.getNodes([3]);h=b[0]||f.startContainer;i=b[b.length-1]||f.endContainer;b=h===f.startContainer?f.startOffset:0;c=i===f.endContainer?f.endOffset:i.length;try{a(f.startContainer,f.endContainer)}catch(g){setTimeout(function(){throw g;},0)}a=rangy.createRange(this.doc);try{a.setStart(h,b)}catch(j){}try{a.setEnd(i,c)}catch(k){}try{this.setSelection(a)}catch(m){}}else a(h,
h)},set:function(a,b){var c=rangy.createRange(this.doc);c.setStart(a,b||0);this.setSelection(c)},insertHTML:function(a){var a=rangy.createRange(this.doc).createContextualFragment(a),b=a.lastChild;this.insertNode(a);b&&this.setAfter(b)},insertNode:function(a){var b=this.getRange();b&&b.insertNode(a)},surround:function(a){var b=this.getRange();if(b)try{b.surroundContents(a),this.selectNode(a)}catch(c){a.appendChild(b.extractContents()),b.insertNode(a)}},scrollIntoView:function(){var a=this.doc,c=a.documentElement.scrollHeight>
a.documentElement.offsetHeight,e;if(!(e=a._wysihtml5ScrollIntoViewElement))e=a.createElement("span"),e.innerHTML=b.INVISIBLE_SPACE;e=a._wysihtml5ScrollIntoViewElement=e;if(c){this.insertNode(e);var c=e,f=0;if(c.parentNode){do f+=c.offsetTop||0,c=c.offsetParent;while(c)}c=f;e.parentNode.removeChild(e);c>=a.body.scrollTop+a.documentElement.offsetHeight-5&&(a.body.scrollTop=c)}},selectLine:function(){b.browser.supportsSelectionModify()?this._selectLine_W3C():this.doc.selection&&this._selectLine_MSIE()},
_selectLine_W3C:function(){var a=this.doc.defaultView.getSelection();a.modify("extend","left","lineboundary");a.modify("extend","right","lineboundary")},_selectLine_MSIE:function(){var a=this.doc.selection.createRange(),b=a.boundingTop,c=this.doc.body.scrollWidth,f;if(a.moveToPoint){0===b&&(f=this.doc.createElement("span"),this.insertNode(f),b=f.offsetTop,f.parentNode.removeChild(f));b+=1;for(f=-10;f<c;f+=2)try{a.moveToPoint(f,b);break}catch(h){}for(f=this.doc.selection.createRange();0<=c;c--)try{f.moveToPoint(c,
b);break}catch(i){}a.setEndPoint("EndToEnd",f);a.select()}},getText:function(){var a=this.getSelection();return a?a.toString():""},getNodes:function(a,b){var c=this.getRange();return c?c.getNodes([a],b):[]},getRange:function(){var a=this.getSelection();return a&&a.rangeCount&&a.getRangeAt(0)},getSelection:function(){return rangy.getSelection(this.doc.defaultView||this.doc.parentWindow)},setSelection:function(a){return rangy.getSelection(this.doc.defaultView||this.doc.parentWindow).setSingleRange(a)}})})(wysihtml5);
(function(b,c){function a(a,b){return c.dom.isCharacterDataNode(a)?0==b?!!a.previousSibling:b==a.length?!!a.nextSibling:!0:0<b&&b<a.childNodes.length}function d(a,b,e){var f;c.dom.isCharacterDataNode(b)&&(0==e?(e=c.dom.getNodeIndex(b),b=b.parentNode):e==b.length?(e=c.dom.getNodeIndex(b)+1,b=b.parentNode):f=c.dom.splitDataNode(b,e));if(!f){f=b.cloneNode(!1);f.id&&f.removeAttribute("id");for(var h;h=b.childNodes[e];)f.appendChild(h);c.dom.insertAfter(f,b)}return b==a?f:d(a,f.parentNode,c.dom.getNodeIndex(f))}
function e(a){this.firstTextNode=(this.isElementMerge=a.nodeType==b.ELEMENT_NODE)?a.lastChild:a;this.textNodes=[this.firstTextNode]}function f(a,b,c,d){this.tagNames=a||[h];this.cssClass=b||"";this.similarClassRegExp=c;this.normalize=d;this.applyToAnyTagName=!1}var h="span",i=/\s+/g;e.prototype={doMerge:function(){for(var a=[],b,c,d=0,e=this.textNodes.length;d<e;++d)b=this.textNodes[d],c=b.parentNode,a[d]=b.data,d&&(c.removeChild(b),c.hasChildNodes()||c.parentNode.removeChild(c));return this.firstTextNode.data=
a=a.join("")},getLength:function(){for(var a=this.textNodes.length,b=0;a--;)b+=this.textNodes[a].length;return b},toString:function(){for(var a=[],b=0,c=this.textNodes.length;b<c;++b)a[b]="'"+this.textNodes[b].data+"'";return"[Merge("+a.join(",")+")]"}};f.prototype={getAncestorWithClass:function(a){for(var d;a;){if(this.cssClass)if(d=this.cssClass,a.className){var e=a.className.match(this.similarClassRegExp)||[];d=e[e.length-1]===d}else d=!1;else d=!0;if(a.nodeType==b.ELEMENT_NODE&&c.dom.arrayContains(this.tagNames,
a.tagName.toLowerCase())&&d)return a;a=a.parentNode}return!1},postApply:function(a,b){for(var c=a[0],d=a[a.length-1],f=[],h,i=c,p=d,r=0,t=d.length,q,y,A=0,B=a.length;A<B;++A)q=a[A],(y=this.getAdjacentMergeableTextNode(q.parentNode,!1))?(h||(h=new e(y),f.push(h)),h.textNodes.push(q),q===c&&(i=h.firstTextNode,r=i.length),q===d&&(p=h.firstTextNode,t=h.getLength())):h=null;if(c=this.getAdjacentMergeableTextNode(d.parentNode,!0))h||(h=new e(d),f.push(h)),h.textNodes.push(c);if(f.length){A=0;for(B=f.length;A<
B;++A)f[A].doMerge();b.setStart(i,r);b.setEnd(p,t)}},getAdjacentMergeableTextNode:function(a,c){var d=a.nodeType==b.TEXT_NODE,e=d?a.parentNode:a,f=c?"nextSibling":"previousSibling";if(d){if((d=a[f])&&d.nodeType==b.TEXT_NODE)return d}else if((d=e[f])&&this.areElementsMergeable(a,d))return d[c?"firstChild":"lastChild"];return null},areElementsMergeable:function(a,b){var d;if(d=c.dom.arrayContains(this.tagNames,(a.tagName||"").toLowerCase()))if(d=c.dom.arrayContains(this.tagNames,(b.tagName||"").toLowerCase()))if(d=
a.className.replace(i," ")==b.className.replace(i," "))a:if(a.attributes.length!=b.attributes.length)d=!1;else{d=0;for(var e=a.attributes.length,f,h;d<e;++d)if(f=a.attributes[d],h=f.name,"class"!=h&&(h=b.attributes.getNamedItem(h),f.specified!=h.specified||f.specified&&f.nodeValue!==h.nodeValue)){d=!1;break a}d=!0}return d},createContainer:function(a){a=a.createElement(this.tagNames[0]);this.cssClass&&(a.className=this.cssClass);return a},applyToTextNode:function(a){var b=a.parentNode;1==b.childNodes.length&&
c.dom.arrayContains(this.tagNames,b.tagName.toLowerCase())?this.cssClass&&(a=this.cssClass,b.className?(b.className&&(b.className=b.className.replace(this.similarClassRegExp,"")),b.className+=" "+a):b.className=a):(b=this.createContainer(c.dom.getDocument(a)),a.parentNode.insertBefore(b,a),b.appendChild(a))},isRemovable:function(a){return c.dom.arrayContains(this.tagNames,a.tagName.toLowerCase())&&b.lang.string(a.className).trim()==this.cssClass},undoToTextNode:function(b,c,e){c.containsNode(e)||
(b=c.cloneRange(),b.selectNode(e),b.isPointInRange(c.endContainer,c.endOffset)&&a(c.endContainer,c.endOffset)&&(d(e,c.endContainer,c.endOffset),c.setEndAfter(e)),b.isPointInRange(c.startContainer,c.startOffset)&&a(c.startContainer,c.startOffset)&&(e=d(e,c.startContainer,c.startOffset)));this.similarClassRegExp&&e.className&&(e.className=e.className.replace(this.similarClassRegExp,""));if(this.isRemovable(e)){c=e;for(e=c.parentNode;c.firstChild;)e.insertBefore(c.firstChild,c);e.removeChild(c)}},applyToRange:function(a){var c=
a.getNodes([b.TEXT_NODE]);if(!c.length)try{var d=this.createContainer(a.endContainer.ownerDocument);a.surroundContents(d);this.selectNode(a,d);return}catch(e){}a.splitBoundaries();c=a.getNodes([b.TEXT_NODE]);if(c.length){for(var f=0,h=c.length;f<h;++f)d=c[f],this.getAncestorWithClass(d)||this.applyToTextNode(d);a.setStart(c[0],0);d=c[c.length-1];a.setEnd(d,d.length);this.normalize&&this.postApply(c,a)}},undoToRange:function(a){var c=a.getNodes([b.TEXT_NODE]),d,e;c.length?(a.splitBoundaries(),c=a.getNodes([b.TEXT_NODE])):
(c=a.endContainer.ownerDocument.createTextNode(b.INVISIBLE_SPACE),a.insertNode(c),a.selectNode(c),c=[c]);for(var f=0,h=c.length;f<h;++f)d=c[f],(e=this.getAncestorWithClass(d))&&this.undoToTextNode(d,a,e);1==h?this.selectNode(a,c[0]):(a.setStart(c[0],0),d=c[c.length-1],a.setEnd(d,d.length),this.normalize&&this.postApply(c,a))},selectNode:function(a,c){var d=c.nodeType===b.ELEMENT_NODE,e="canHaveHTML"in c?c.canHaveHTML:!0,f=d?c.innerHTML:c.data;if((f=""===f||f===b.INVISIBLE_SPACE)&&d&&e)try{c.innerHTML=
b.INVISIBLE_SPACE}catch(h){}a.selectNodeContents(c);f&&d?a.collapse(!1):f&&(a.setStartAfter(c),a.setEndAfter(c))},getTextSelectedByRange:function(a,b){var c=b.cloneRange();c.selectNodeContents(a);var d=c.intersection(b),d=d?d.toString():"";c.detach();return d},isAppliedToRange:function(a){var c=[],d,e=a.getNodes([b.TEXT_NODE]);if(!e.length)return(d=this.getAncestorWithClass(a.startContainer))?[d]:!1;for(var f=0,h=e.length,i;f<h;++f){i=this.getTextSelectedByRange(e[f],a);d=this.getAncestorWithClass(e[f]);
if(""!=i&&!d)return!1;c.push(d)}return c},toggleRange:function(a){this.isAppliedToRange(a)?this.undoToRange(a):this.applyToRange(a)}};b.selection.HTMLApplier=f})(wysihtml5,rangy);
wysihtml5.Commands=Base.extend({constructor:function(b){this.editor=b;this.composer=b.composer;this.doc=this.composer.doc},support:function(b){return wysihtml5.browser.supportsCommand(this.doc,b)},exec:function(b,c){var a=wysihtml5.commands[b],d=wysihtml5.lang.array(arguments).get(),e=a&&a.exec,f=null;this.editor.fire("beforecommand:composer");if(e)d.unshift(this.composer),f=e.apply(a,d);else try{f=this.doc.execCommand(b,!1,c)}catch(h){}this.editor.fire("aftercommand:composer");return f},state:function(b,
c){var a=wysihtml5.commands[b],d=wysihtml5.lang.array(arguments).get(),e=a&&a.state;if(e)return d.unshift(this.composer),e.apply(a,d);try{return this.doc.queryCommandState(b)}catch(f){return!1}}});wysihtml5.commands.bold={exec:function(b,c){return wysihtml5.commands.formatInline.exec(b,c,"b")},state:function(b,c){return wysihtml5.commands.formatInline.state(b,c,"b")}};
(function(b){var c=b.dom;b.commands.createLink={exec:function(a,d,e){var f=this.state(a,d);if(f)a.selection.executeAndRestore(function(){for(var a=f.length,b=0,d,e,g;b<a;b++)d=f[b],e=c.getParentElement(d,{nodeName:"code"}),g=c.getTextContent(d),g.match(c.autoLink.URL_REG_EXP)&&!e?c.renameElement(d,"code"):c.replaceWithChildNodes(d)});else{var d=e="object"===typeof e?e:{href:e},e=a.doc,h="_wysihtml5-temp-"+ +new Date,i=0,g,j,k;b.commands.formatInline.exec(a,void 0,"A",h,/non-matching-class/g);g=e.querySelectorAll("A."+
h);for(h=g.length;i<h;i++)for(k in j=g[i],j.removeAttribute("class"),d)j.setAttribute(k,d[k]);k=j;1===h&&(h=c.getTextContent(j),i=!!j.querySelector("*"),h=""===h||h===b.INVISIBLE_SPACE,!i&&h&&(c.setTextContent(j,d.text||j.href),d=e.createTextNode(" "),a.selection.setAfter(j),c.insert(d).after(j),k=d));a.selection.setAfter(k)}},state:function(a,c){return b.commands.formatInline.state(a,c,"A")}}})(wysihtml5);
(function(b){var c=/wysiwyg-font-size-[0-9a-z\-]+/g;b.commands.fontSize={exec:function(a,d,e){return b.commands.formatInline.exec(a,d,"span","wysiwyg-font-size-"+e,c)},state:function(a,d,e){return b.commands.formatInline.state(a,d,"span","wysiwyg-font-size-"+e,c)},value:function(){}}})(wysihtml5);
(function(b){var c=/wysiwyg-color-[0-9a-z]+/g;b.commands.foreColor={exec:function(a,d,e){return b.commands.formatInline.exec(a,d,"span","wysiwyg-color-"+e,c)},state:function(a,d,e){return b.commands.formatInline.state(a,d,"span","wysiwyg-color-"+e,c)}}})(wysihtml5);
(function(b){function c(a){for(a=a.previousSibling;a&&a.nodeType===b.TEXT_NODE&&!b.lang.string(a.data).trim();)a=a.previousSibling;return a}function a(a){for(a=a.nextSibling;a&&a.nodeType===b.TEXT_NODE&&!b.lang.string(a.data).trim();)a=a.nextSibling;return a}function d(a){return"BR"===a.nodeName||"block"===e.getStyle("display").from(a)?!0:!1}var e=b.dom,f="H1 H2 H3 H4 H5 H6 P BLOCKQUOTE DIV".split(" ");b.commands.formatBlock={exec:function(h,i,g,j,k){var m=h.doc,n=this.state(h,i,g,j,k),v=h.config.useLineBreaks,
u=v?"DIV":"P",p,g="string"===typeof g?g.toUpperCase():g;if(n)h.selection.executeAndRestoreSimple(function(){k&&(n.className=n.className.replace(k,""));if(!b.lang.string(n.className).trim()&&(v||"P"===g)){var f=n,h=f.ownerDocument,j=a(f),i=c(f);j&&!d(j)&&f.parentNode.insertBefore(h.createElement("br"),j);i&&!d(i)&&f.parentNode.insertBefore(h.createElement("br"),f);e.replaceWithChildNodes(n)}else e.renameElement(n,"P"===g?"DIV":u)});else{if(null===g||b.lang.array(f).contains(g))if(p=h.selection.getSelectedNode(),
n=e.getParentElement(p,{nodeName:f})){h.selection.executeAndRestore(function(){g&&(n=e.renameElement(n,g));if(j){var a=n;a.className?(a.className=a.className.replace(k,""),a.className+=" "+j):a.className=j}});return}if(h.commands.support(i)){h=g||u;if(j)var r=e.observe(m,"DOMNodeInserted",function(a){var a=a.target,c;a.nodeType===b.ELEMENT_NODE&&(c=e.getStyle("display").from(a),"inline"!==c.substr(0,6)&&(a.className+=" "+j))});m.execCommand(i,!1,h);r&&r.stop()}else n=m.createElement(g||u),j&&(n.className=
j),i=n,h.selection.selectLine(),h.selection.surround(i),m=a(i),r=c(i),m&&"BR"===m.nodeName&&m.parentNode.removeChild(m),r&&"BR"===r.nodeName&&r.parentNode.removeChild(r),(m=i.lastChild)&&"BR"===m.nodeName&&m.parentNode.removeChild(m),h.selection.selectNode(i,b.browser.displaysCaretInEmptyContentEditableCorrectly())}},state:function(a,b,c,d,f){c="string"===typeof c?c.toUpperCase():c;a=a.selection.getSelectedNode();return e.getParentElement(a,{nodeName:c,className:d,classRegExp:f})}}})(wysihtml5);
(function(b){function c(c,f,h){var i=c+":"+f;if(!d[i]){var g=d,j=b.selection.HTMLApplier,k=a[c],c=k?[c.toLowerCase(),k.toLowerCase()]:[c.toLowerCase()];g[i]=new j(c,f,h,!0)}return d[i]}var a={strong:"b",em:"i",b:"strong",i:"em"},d={};b.commands.formatInline={exec:function(a,b,d,i,g){b=a.selection.getRange();if(!b)return!1;c(d,i,g).toggleRange(b);a.selection.setSelection(b)},state:function(d,f,h,i,g){var f=d.doc,j=a[h]||h;if(!b.dom.hasElementWithTagName(f,h)&&!b.dom.hasElementWithTagName(f,j)||i&&
!b.dom.hasElementWithClassName(f,i))return!1;d=d.selection.getRange();return!d?!1:c(h,i,g).isAppliedToRange(d)}}})(wysihtml5);wysihtml5.commands.insertHTML={exec:function(b,c,a){b.commands.support(c)?b.doc.execCommand(c,!1,a):b.selection.insertHTML(a)},state:function(){return!1}};
(function(b){b.commands.insertImage={exec:function(c,a,d){var d="object"===typeof d?d:{src:d},e=c.doc,a=this.state(c),f;if(a)c.selection.setBefore(a),d=a.parentNode,d.removeChild(a),b.dom.removeEmptyTextNodes(d),"A"===d.nodeName&&!d.firstChild&&(c.selection.setAfter(d),d.parentNode.removeChild(d)),b.quirks.redraw(c.element);else{a=e.createElement("IMG");for(f in d)"className"===f&&(f="class"),a.setAttribute(f,d[f]);c.selection.insertNode(a);b.browser.hasProblemsSettingCaretAfterImg()?(d=e.createTextNode(b.INVISIBLE_SPACE),
c.selection.insertNode(d),c.selection.setAfter(d)):c.selection.setAfter(a)}},state:function(c){var a;if(!b.dom.hasElementWithTagName(c.doc,"IMG"))return!1;a=c.selection.getSelectedNode();if(!a)return!1;if("IMG"===a.nodeName)return a;if(a.nodeType!==b.ELEMENT_NODE)return!1;a=c.selection.getText();if(a=b.lang.string(a).trim())return!1;c=c.selection.getNodes(b.ELEMENT_NODE,function(a){return"IMG"===a.nodeName});return 1!==c.length?!1:c[0]}}})(wysihtml5);
(function(b){var c="<br>"+(b.browser.needsSpaceAfterLineBreak()?" ":"");b.commands.insertLineBreak={exec:function(a,d){a.commands.support(d)?(a.doc.execCommand(d,!1,null),b.browser.autoScrollsToCaret()||a.selection.scrollIntoView()):a.commands.exec("insertHTML",c)},state:function(){return!1}}})(wysihtml5);
wysihtml5.commands.insertOrderedList={exec:function(b,c){var a=b.doc,d=b.selection.getSelectedNode(),e=wysihtml5.dom.getParentElement(d,{nodeName:"OL"}),f=wysihtml5.dom.getParentElement(d,{nodeName:"UL"}),d="_wysihtml5-temp-"+(new Date).getTime(),h;!e&&!f&&b.commands.support(c)?a.execCommand(c,!1,null):e?b.selection.executeAndRestore(function(){wysihtml5.dom.resolveList(e,b.config.useLineBreaks)}):f?b.selection.executeAndRestore(function(){wysihtml5.dom.renameElement(f,"ol")}):(b.commands.exec("formatBlock",
"div",d),h=a.querySelector("."+d),a=""===h.innerHTML||h.innerHTML===wysihtml5.INVISIBLE_SPACE||"<br>"===h.innerHTML,b.selection.executeAndRestore(function(){e=wysihtml5.dom.convertToList(h,"ol")}),a&&b.selection.selectNode(e.querySelector("li"),!0))},state:function(b){b=b.selection.getSelectedNode();return wysihtml5.dom.getParentElement(b,{nodeName:"OL"})}};
wysihtml5.commands.insertUnorderedList={exec:function(b,c){var a=b.doc,d=b.selection.getSelectedNode(),e=wysihtml5.dom.getParentElement(d,{nodeName:"UL"}),f=wysihtml5.dom.getParentElement(d,{nodeName:"OL"}),d="_wysihtml5-temp-"+(new Date).getTime(),h;!e&&!f&&b.commands.support(c)?a.execCommand(c,!1,null):e?b.selection.executeAndRestore(function(){wysihtml5.dom.resolveList(e,b.config.useLineBreaks)}):f?b.selection.executeAndRestore(function(){wysihtml5.dom.renameElement(f,"ul")}):(b.commands.exec("formatBlock",
"div",d),h=a.querySelector("."+d),a=""===h.innerHTML||h.innerHTML===wysihtml5.INVISIBLE_SPACE||"<br>"===h.innerHTML,b.selection.executeAndRestore(function(){e=wysihtml5.dom.convertToList(h,"ul")}),a&&b.selection.selectNode(e.querySelector("li"),!0))},state:function(b){b=b.selection.getSelectedNode();return wysihtml5.dom.getParentElement(b,{nodeName:"UL"})}};
wysihtml5.commands.italic={exec:function(b,c){return wysihtml5.commands.formatInline.exec(b,c,"i")},state:function(b,c){return wysihtml5.commands.formatInline.state(b,c,"i")}};(function(b){var c=/wysiwyg-text-align-[0-9a-z]+/g;b.commands.justifyCenter={exec:function(a){return b.commands.formatBlock.exec(a,"formatBlock",null,"wysiwyg-text-align-center",c)},state:function(a){return b.commands.formatBlock.state(a,"formatBlock",null,"wysiwyg-text-align-center",c)}}})(wysihtml5);
(function(b){var c=/wysiwyg-text-align-[0-9a-z]+/g;b.commands.justifyLeft={exec:function(a){return b.commands.formatBlock.exec(a,"formatBlock",null,"wysiwyg-text-align-left",c)},state:function(a){return b.commands.formatBlock.state(a,"formatBlock",null,"wysiwyg-text-align-left",c)}}})(wysihtml5);
(function(b){var c=/wysiwyg-text-align-[0-9a-z]+/g;b.commands.justifyRight={exec:function(a){return b.commands.formatBlock.exec(a,"formatBlock",null,"wysiwyg-text-align-right",c)},state:function(a){return b.commands.formatBlock.state(a,"formatBlock",null,"wysiwyg-text-align-right",c)}}})(wysihtml5);
(function(b){var c=/wysiwyg-text-align-[0-9a-z]+/g;b.commands.justifyFull={exec:function(a){return b.commands.formatBlock.exec(a,"formatBlock",null,"wysiwyg-text-align-justify",c)},state:function(a){return b.commands.formatBlock.state(a,"formatBlock",null,"wysiwyg-text-align-justify",c)}}})(wysihtml5);wysihtml5.commands.redo={exec:function(b){return b.undoManager.redo()},state:function(){return!1}};
wysihtml5.commands.underline={exec:function(b,c){return wysihtml5.commands.formatInline.exec(b,c,"u")},state:function(b,c){return wysihtml5.commands.formatInline.state(b,c,"u")}};wysihtml5.commands.undo={exec:function(b){return b.undoManager.undo()},state:function(){return!1}};
(function(b){var c='<span id="_wysihtml5-undo" class="_wysihtml5-temp">'+b.INVISIBLE_SPACE+"</span>",a='<span id="_wysihtml5-redo" class="_wysihtml5-temp">'+b.INVISIBLE_SPACE+"</span>",d=b.dom;b.UndoManager=b.lang.Dispatcher.extend({constructor:function(a){this.editor=a;this.composer=a.composer;this.element=this.composer.element;this.position=0;this.historyStr=[];this.historyDom=[];this.transact();this._observe()},_observe:function(){var e=this,f=this.composer.sandbox.getDocument(),h;d.observe(this.element,
"keydown",function(a){if(!(a.altKey||!a.ctrlKey&&!a.metaKey)){var b=a.keyCode,c=90===b&&a.shiftKey||89===b;90===b&&!a.shiftKey?(e.undo(),a.preventDefault()):c&&(e.redo(),a.preventDefault())}});d.observe(this.element,"keydown",function(a){a=a.keyCode;a!==h&&(h=a,(8===a||46===a)&&e.transact())});if(b.browser.hasUndoInContextMenu()){var i,g,j=function(){for(var a;a=f.querySelector("._wysihtml5-temp");)a.parentNode.removeChild(a);clearInterval(i)};d.observe(this.element,"contextmenu",function(){j();e.composer.selection.executeAndRestoreSimple(function(){e.element.lastChild&&
e.composer.selection.setAfter(e.element.lastChild);f.execCommand("insertHTML",!1,c);f.execCommand("insertHTML",!1,a);f.execCommand("undo",!1,null)});i=setInterval(function(){f.getElementById("_wysihtml5-redo")?(j(),e.redo()):f.getElementById("_wysihtml5-undo")||(j(),e.undo())},400);g||(g=!0,d.observe(document,"mousedown",j),d.observe(f,["mousedown","paste","cut","copy"],j))})}this.editor.on("newword:composer",function(){e.transact()}).on("beforecommand:composer",function(){e.transact()})},transact:function(){var a=
this.historyStr[this.position-1],c=this.composer.getValue();if(c!==a){if(25<(this.historyStr.length=this.historyDom.length=this.position))this.historyStr.shift(),this.historyDom.shift(),this.position--;this.position++;var d=this.composer.selection.getRange(),a=d.startContainer||this.element,i=d.startOffset||0,g;a.nodeType===b.ELEMENT_NODE?d=a:(d=a.parentNode,g=this.getChildNodeIndex(d,a));d.setAttribute("data-wysihtml5-selection-offset",i);"undefined"!==typeof g&&d.setAttribute("data-wysihtml5-selection-node",
g);g=this.element.cloneNode(!!c);this.historyDom.push(g);this.historyStr.push(c);d.removeAttribute("data-wysihtml5-selection-offset");d.removeAttribute("data-wysihtml5-selection-node")}},undo:function(){this.transact();this.undoPossible()&&(this.set(this.historyDom[--this.position-1]),this.editor.fire("undo:composer"))},redo:function(){this.redoPossible()&&(this.set(this.historyDom[++this.position-1]),this.editor.fire("redo:composer"))},undoPossible:function(){return 1<this.position},redoPossible:function(){return this.position<
this.historyStr.length},set:function(a){this.element.innerHTML="";for(var b=0,c=a.childNodes,d=a.childNodes.length;b<d;b++)this.element.appendChild(c[b].cloneNode(!0));a.hasAttribute("data-wysihtml5-selection-offset")?(b=a.getAttribute("data-wysihtml5-selection-offset"),c=a.getAttribute("data-wysihtml5-selection-node"),a=this.element):(a=this.element.querySelector("[data-wysihtml5-selection-offset]")||this.element,b=a.getAttribute("data-wysihtml5-selection-offset"),c=a.getAttribute("data-wysihtml5-selection-node"),
a.removeAttribute("data-wysihtml5-selection-offset"),a.removeAttribute("data-wysihtml5-selection-node"));null!==c&&(a=this.getChildNodeByIndex(a,+c));this.composer.selection.set(a,b)},getChildNodeIndex:function(a,b){for(var c=0,d=a.childNodes,g=d.length;c<g;c++)if(d[c]===b)return c},getChildNodeByIndex:function(a,b){return a.childNodes[b]}})})(wysihtml5);
wysihtml5.views.View=Base.extend({constructor:function(b,c,a){this.parent=b;this.element=c;this.config=a;this._observeViewChange()},_observeViewChange:function(){var b=this;this.parent.on("beforeload",function(){b.parent.on("change_view",function(c){c===b.name?(b.parent.currentView=b,b.show(),setTimeout(function(){b.focus()},0)):b.hide()})})},focus:function(){if(this.element.ownerDocument.querySelector(":focus")!==this.element)try{this.element.focus()}catch(b){}},hide:function(){this.element.style.display=
"none"},show:function(){this.element.style.display=""},disable:function(){this.element.setAttribute("disabled","disabled")},enable:function(){this.element.removeAttribute("disabled")}});
(function(b){var c=b.dom,a=b.browser;b.views.Composer=b.views.View.extend({name:"composer",CARET_HACK:"<br>",constructor:function(a,b,c){this.base(a,b,c);this.textarea=this.parent.textarea;this._initSandbox()},clear:function(){this.element.innerHTML=a.displaysCaretInEmptyContentEditableCorrectly()?"":this.CARET_HACK},getValue:function(a){var c=this.isEmpty()?"":b.quirks.getCorrectInnerHTML(this.element);a&&(c=this.parent.parse(c));return c=b.lang.string(c).replace(b.INVISIBLE_SPACE).by("")},setValue:function(a,
b){b&&(a=this.parent.parse(a));try{this.element.innerHTML=a}catch(c){this.element.innerText=a}},show:function(){this.iframe.style.display=this._displayStyle||"";this.textarea.element.disabled||(this.disable(),this.enable())},hide:function(){this._displayStyle=c.getStyle("display").from(this.iframe);"none"===this._displayStyle&&(this._displayStyle=null);this.iframe.style.display="none"},disable:function(){this.parent.fire("disable:composer");this.element.removeAttribute("contentEditable")},enable:function(){this.parent.fire("enable:composer");
this.element.setAttribute("contentEditable","true")},focus:function(a){b.browser.doesAsyncFocus()&&this.hasPlaceholderSet()&&this.clear();this.base();var c=this.element.lastChild;a&&c&&("BR"===c.nodeName?this.selection.setBefore(this.element.lastChild):this.selection.setAfter(this.element.lastChild))},getTextContent:function(){return c.getTextContent(this.element)},hasPlaceholderSet:function(){return this.getTextContent()==this.textarea.element.getAttribute("placeholder")&&this.placeholderSet},isEmpty:function(){var a=
this.element.innerHTML.toLowerCase();return""===a||"<br>"===a||"<p></p>"===a||"<p><br></p>"===a||this.hasPlaceholderSet()},_initSandbox:function(){var a=this;this.sandbox=new c.Sandbox(function(){a._create()},{stylesheets:this.config.stylesheets});this.iframe=this.sandbox.getIframe();var b=this.textarea.element;c.insert(this.iframe).after(b);if(b.form){var f=document.createElement("input");f.type="hidden";f.name="_wysihtml5_mode";f.value=1;c.insert(f).after(b)}},_create:function(){var d=this;this.doc=
this.sandbox.getDocument();this.element=this.doc.body;this.textarea=this.parent.textarea;this.element.innerHTML=this.textarea.getValue(!0);this.selection=new b.Selection(this.parent);this.commands=new b.Commands(this.parent);c.copyAttributes("className spellcheck title lang dir accessKey".split(" ")).from(this.textarea.element).to(this.element);c.addClass(this.element,this.config.composerClassName);this.config.style&&this.style();this.observe();var e=this.config.name;e&&(c.addClass(this.element,e),
c.addClass(this.iframe,e));this.enable();this.textarea.element.disabled&&this.disable();(e="string"===typeof this.config.placeholder?this.config.placeholder:this.textarea.element.getAttribute("placeholder"))&&c.simulatePlaceholder(this.parent,this,e);this.commands.exec("styleWithCSS",!1);this._initAutoLinking();this._initObjectResizing();this._initUndoManager();this._initLineBreaking();(this.textarea.element.hasAttribute("autofocus")||document.querySelector(":focus")==this.textarea.element)&&!a.isIos()&&
setTimeout(function(){d.focus(!0)},100);a.clearsContentEditableCorrectly()||b.quirks.ensureProperClearing(this);this.initSync&&this.config.sync&&this.initSync();this.textarea.hide();this.parent.fire("beforeload").fire("load")},_initAutoLinking:function(){var d=this,e=a.canDisableAutoLinking(),f=a.doesAutoLinkingInContentEditable();e&&this.commands.exec("autoUrlDetect",!1);if(this.config.autoLink){if(!f||f&&e)this.parent.on("newword:composer",function(){c.getTextContent(d.element).match(c.autoLink.URL_REG_EXP)&&
d.selection.executeAndRestore(function(a,b){c.autoLink(b.parentNode)})}),c.observe(this.element,"blur",function(){c.autoLink(d.element)});var h=this.sandbox.getDocument().getElementsByTagName("a"),i=c.autoLink.URL_REG_EXP,g=function(a){a=b.lang.string(c.getTextContent(a)).trim();"www."===a.substr(0,4)&&(a="http://"+a);return a};c.observe(this.element,"keydown",function(a){if(h.length){var a=d.selection.getSelectedNode(a.target.ownerDocument),b=c.getParentElement(a,{nodeName:"A"},4),e;b&&(e=g(b),setTimeout(function(){var a=
g(b);a!==e&&a.match(i)&&b.setAttribute("href",a)},0))}})}},_initObjectResizing:function(){this.commands.exec("enableObjectResizing",!0);if(a.supportsEvent("resizeend")){var d=["width","height"],e=d.length,f=this.element;c.observe(f,"resizeend",function(a){var a=a.target||a.srcElement,c=a.style,g=0,j;if("IMG"===a.nodeName){for(;g<e;g++)j=d[g],c[j]&&(a.setAttribute(j,parseInt(c[j],10)),c[j]="");b.quirks.redraw(f)}})}},_initUndoManager:function(){this.undoManager=new b.UndoManager(this.parent)},_initLineBreaking:function(){function d(a){var b=
c.getParentElement(a,{nodeName:["P","DIV"]},2);b&&e.selection.executeAndRestore(function(){e.config.useLineBreaks?c.replaceWithChildNodes(b):"P"!==b.nodeName&&c.renameElement(b,"p")})}var e=this,f="LI P H1 H2 H3 H4 H5 H6".split(" "),h=["UL","OL","MENU"];this.config.useLineBreaks||c.observe(this.element,["focus","keydown"],function(){if(e.isEmpty()){var b=e.doc.createElement("P");e.element.innerHTML="";e.element.appendChild(b);a.displaysCaretInEmptyContentEditableCorrectly()?e.selection.selectNode(b,
!0):(b.innerHTML="<br>",e.selection.setBefore(b.firstChild))}});c.observe(this.doc,"keydown",function(a){var g=a.keyCode;if(!a.shiftKey&&!(g!==b.ENTER_KEY&&g!==b.BACKSPACE_KEY)){var j=c.getParentElement(e.selection.getSelectedNode(),{nodeName:f},4);j?setTimeout(function(){var a=e.selection.getSelectedNode(),f;if("LI"===j.nodeName){if(!a)return;(f=c.getParentElement(a,{nodeName:h},2))||d(a)}g===b.ENTER_KEY&&j.nodeName.match(/^H[1-6]$/)&&d(a)},0):e.config.useLineBreaks&&(g===b.ENTER_KEY&&!b.browser.insertsLineBreaksOnReturn())&&
(e.commands.exec("insertLineBreak"),a.preventDefault())}})}})})(wysihtml5);
(function(b){var c=b.dom,a=document,d=window,e=a.createElement("div"),f="background-color color cursor font-family font-size font-style font-variant font-weight line-height letter-spacing text-align text-decoration text-indent text-rendering word-break word-wrap word-spacing".split(" "),h="background-color border-collapse border-bottom-color border-bottom-style border-bottom-width border-left-color border-left-style border-left-width border-right-color border-right-style border-right-width border-top-color border-top-style border-top-width clear display float margin-bottom margin-left margin-right margin-top outline-color outline-offset outline-width outline-style padding-left padding-right padding-top padding-bottom position top left right bottom z-index vertical-align text-align -webkit-box-sizing -moz-box-sizing -ms-box-sizing box-sizing -webkit-box-shadow -moz-box-shadow -ms-box-shadow box-shadow -webkit-border-top-right-radius -moz-border-radius-topright border-top-right-radius -webkit-border-bottom-right-radius -moz-border-radius-bottomright border-bottom-right-radius -webkit-border-bottom-left-radius -moz-border-radius-bottomleft border-bottom-left-radius -webkit-border-top-left-radius -moz-border-radius-topleft border-top-left-radius width height".split(" "),i=
["html                 { height: 100%; }","body                 { height: 100%; padding: 1px 0 0 0; margin: -1px 0 0 0; }","body > p:first-child { margin-top: 0; }","._wysihtml5-temp     { display: none; }",b.browser.isGecko?"body.placeholder { color: graytext !important; }":"body.placeholder { color: #a9a9a9 !important; }","img:-moz-broken      { -moz-force-broken-image-icon: 1; height: 24px; width: 24px; }"];b.views.Composer.prototype.style=function(){var g=this,j=a.querySelector(":focus"),k=this.textarea.element,
m=k.hasAttribute("placeholder"),n=m&&k.getAttribute("placeholder"),v=k.style.display,u=k.disabled,p;this.focusStylesHost=e.cloneNode(!1);this.blurStylesHost=e.cloneNode(!1);this.disabledStylesHost=e.cloneNode(!1);m&&k.removeAttribute("placeholder");k===j&&k.blur();k.disabled=!1;k.style.display=p="none";if(k.getAttribute("rows")&&"auto"===c.getStyle("height").from(k)||k.getAttribute("cols")&&"auto"===c.getStyle("width").from(k))k.style.display=p=v;c.copyStyles(h).from(k).to(this.iframe).andTo(this.blurStylesHost);
c.copyStyles(f).from(k).to(this.element).andTo(this.blurStylesHost);c.insertCSS(i).into(this.element.ownerDocument);k.disabled=!0;c.copyStyles(h).from(k).to(this.disabledStylesHost);c.copyStyles(f).from(k).to(this.disabledStylesHost);k.disabled=u;k.style.display=v;if(k.setActive)try{k.setActive()}catch(r){}else{var t=k.style,u=a.documentElement.scrollTop||a.body.scrollTop,q=a.documentElement.scrollLeft||a.body.scrollLeft,t={position:t.position,top:t.top,left:t.left,WebkitUserSelect:t.WebkitUserSelect};
c.setStyles({position:"absolute",top:"-99999px",left:"-99999px",WebkitUserSelect:"none"}).on(k);k.focus();c.setStyles(t).on(k);d.scrollTo&&d.scrollTo(q,u)}k.style.display=p;c.copyStyles(h).from(k).to(this.focusStylesHost);c.copyStyles(f).from(k).to(this.focusStylesHost);k.style.display=v;c.copyStyles(["display"]).from(k).to(this.iframe);var y=b.lang.array(h).without(["display"]);j?j.focus():k.blur();m&&k.setAttribute("placeholder",n);this.parent.on("focus:composer",function(){c.copyStyles(y).from(g.focusStylesHost).to(g.iframe);
c.copyStyles(f).from(g.focusStylesHost).to(g.element)});this.parent.on("blur:composer",function(){c.copyStyles(y).from(g.blurStylesHost).to(g.iframe);c.copyStyles(f).from(g.blurStylesHost).to(g.element)});this.parent.observe("disable:composer",function(){c.copyStyles(y).from(g.disabledStylesHost).to(g.iframe);c.copyStyles(f).from(g.disabledStylesHost).to(g.element)});this.parent.observe("enable:composer",function(){c.copyStyles(y).from(g.blurStylesHost).to(g.iframe);c.copyStyles(f).from(g.blurStylesHost).to(g.element)});
return this}})(wysihtml5);
(function(b){var c=b.dom,a=b.browser,d={66:"bold",73:"italic",85:"underline"};b.views.Composer.prototype.observe=function(){var e=this,f=this.getValue(),h=this.sandbox.getIframe(),i=this.element,g=a.supportsEventsInIframeCorrectly()?i:this.sandbox.getWindow();c.observe(h,"DOMNodeRemoved",function(){clearInterval(j);e.parent.fire("destroy:composer")});var j=setInterval(function(){c.contains(document.documentElement,h)||(clearInterval(j),e.parent.fire("destroy:composer"))},250);c.observe(g,"focus",
function(){e.parent.fire("focus").fire("focus:composer");setTimeout(function(){f=e.getValue()},0)});c.observe(g,"blur",function(){f!==e.getValue()&&e.parent.fire("change").fire("change:composer");e.parent.fire("blur").fire("blur:composer")});c.observe(i,"dragenter",function(){e.parent.fire("unset_placeholder")});c.observe(i,["drop","paste"],function(){setTimeout(function(){e.parent.fire("paste").fire("paste:composer")},0)});c.observe(i,"keyup",function(a){a=a.keyCode;(a===b.SPACE_KEY||a===b.ENTER_KEY)&&
e.parent.fire("newword:composer")});this.parent.on("paste:composer",function(){setTimeout(function(){e.parent.fire("newword:composer")},0)});a.canSelectImagesInContentEditable()||c.observe(i,"mousedown",function(a){var b=a.target;"IMG"===b.nodeName&&(e.selection.selectNode(b),a.preventDefault())});a.hasHistoryIssue()&&a.supportsSelectionModify()&&c.observe(i,"keydown",function(a){if(a.metaKey||a.ctrlKey){var b=a.keyCode,c=i.ownerDocument.defaultView.getSelection();if(37===b||39===b)37===b&&(c.modify("extend",
"left","lineboundary"),a.shiftKey||c.collapseToStart()),39===b&&(c.modify("extend","right","lineboundary"),a.shiftKey||c.collapseToEnd()),a.preventDefault()}});c.observe(i,"keydown",function(a){var b=d[a.keyCode];if((a.ctrlKey||a.metaKey)&&!a.altKey&&b)e.commands.exec(b),a.preventDefault()});c.observe(i,"keydown",function(a){var c=e.selection.getSelectedNode(!0),d=a.keyCode;if(c&&"IMG"===c.nodeName&&(d===b.BACKSPACE_KEY||d===b.DELETE_KEY))d=c.parentNode,d.removeChild(c),"A"===d.nodeName&&!d.firstChild&&
d.parentNode.removeChild(d),setTimeout(function(){b.quirks.redraw(i)},0),a.preventDefault()});a.hasIframeFocusIssue()&&(c.observe(this.iframe,"focus",function(){setTimeout(function(){e.doc.querySelector(":focus")!==e.element&&e.focus()},0)}),c.observe(this.element,"blur",function(){setTimeout(function(){e.selection.getSelection().removeAllRanges()},0)}));var k={IMG:"Image: ",A:"Link: "};c.observe(i,"mouseover",function(a){var a=a.target,b=a.nodeName;!("A"!==b&&"IMG"!==b)&&!a.hasAttribute("title")&&
(b=k[b]+(a.getAttribute("href")||a.getAttribute("src")),a.setAttribute("title",b))})}})(wysihtml5);
(function(b){b.views.Synchronizer=Base.extend({constructor:function(b,a,d){this.editor=b;this.textarea=a;this.composer=d;this._observe()},fromComposerToTextarea:function(c){this.textarea.setValue(b.lang.string(this.composer.getValue()).trim(),c)},fromTextareaToComposer:function(b){var a=this.textarea.getValue();a?this.composer.setValue(a,b):(this.composer.clear(),this.editor.fire("set_placeholder"))},sync:function(b){"textarea"===this.editor.currentView.name?this.fromTextareaToComposer(b):this.fromComposerToTextarea(b)},
_observe:function(){var c,a=this,d=this.textarea.element.form,e=function(){c=setInterval(function(){a.fromComposerToTextarea()},400)},f=function(){clearInterval(c);c=null};e();d&&(b.dom.observe(d,"submit",function(){a.sync(!0)}),b.dom.observe(d,"reset",function(){setTimeout(function(){a.fromTextareaToComposer()},0)}));this.editor.on("change_view",function(b){"composer"===b&&!c?(a.fromTextareaToComposer(!0),e()):"textarea"===b&&(a.fromComposerToTextarea(!0),f())});this.editor.on("destroy:composer",
f)}})})(wysihtml5);
wysihtml5.views.Textarea=wysihtml5.views.View.extend({name:"textarea",constructor:function(b,c,a){this.base(b,c,a);this._observe()},clear:function(){this.element.value=""},getValue:function(b){var c=this.isEmpty()?"":this.element.value;b&&(c=this.parent.parse(c));return c},setValue:function(b,c){c&&(b=this.parent.parse(b));this.element.value=b},hasPlaceholderSet:function(){var b=wysihtml5.browser.supportsPlaceholderAttributeOn(this.element),c=this.element.getAttribute("placeholder")||null,a=this.element.value;
return b&&!a||a===c},isEmpty:function(){return!wysihtml5.lang.string(this.element.value).trim()||this.hasPlaceholderSet()},_observe:function(){var b=this.element,c=this.parent,a={focusin:"focus",focusout:"blur"},d=wysihtml5.browser.supportsEvent("focusin")?["focusin","focusout","change"]:["focus","blur","change"];c.on("beforeload",function(){wysihtml5.dom.observe(b,d,function(b){b=a[b.type]||b.type;c.fire(b).fire(b+":textarea")});wysihtml5.dom.observe(b,["paste","drop"],function(){setTimeout(function(){c.fire("paste").fire("paste:textarea")},
0)})})}});
(function(b){var c=b.dom;b.toolbar.Dialog=b.lang.Dispatcher.extend({constructor:function(a,b){this.link=a;this.container=b},_observe:function(){if(!this._observed){var a=this,d=function(b){var c=a._serialize();c==a.elementToChange?a.fire("edit",c):a.fire("save",c);a.hide();b.preventDefault();b.stopPropagation()};c.observe(a.link,"click",function(){c.hasClass(a.link,"wysihtml5-command-dialog-opened")&&setTimeout(function(){a.hide()},0)});c.observe(this.container,"keydown",function(c){var e=c.keyCode;
e===b.ENTER_KEY&&d(c);e===b.ESCAPE_KEY&&a.hide()});c.delegate(this.container,"[data-wysihtml5-dialog-action=save]","click",d);c.delegate(this.container,"[data-wysihtml5-dialog-action=cancel]","click",function(b){a.fire("cancel");a.hide();b.preventDefault();b.stopPropagation()});for(var e=this.container.querySelectorAll("input, select, textarea"),f=0,h=e.length,i=function(){clearInterval(a.interval)};f<h;f++)c.observe(e[f],"change",i);this._observed=!0}},_serialize:function(){for(var a=this.elementToChange||
{},b=this.container.querySelectorAll("[data-wysihtml5-dialog-field]"),c=b.length,f=0;f<c;f++)a[b[f].getAttribute("data-wysihtml5-dialog-field")]=b[f].value;return a},_interpolate:function(a){for(var b,c,f=document.querySelector(":focus"),h=this.container.querySelectorAll("[data-wysihtml5-dialog-field]"),i=h.length,g=0;g<i;g++)b=h[g],b!==f&&!(a&&"hidden"===b.type)&&(c=b.getAttribute("data-wysihtml5-dialog-field"),c=this.elementToChange?this.elementToChange[c]||"":b.defaultValue,b.value=c)},show:function(a){if(!c.hasClass(this.link,
"wysihtml5-command-dialog-opened")){var b=this,e=this.container.querySelector("input, select, textarea");this.elementToChange=a;this._observe();this._interpolate();a&&(this.interval=setInterval(function(){b._interpolate(!0)},500));c.addClass(this.link,"wysihtml5-command-dialog-opened");this.container.style.display="";this.fire("show");if(e&&!a)try{e.focus()}catch(f){}}},hide:function(){clearInterval(this.interval);this.elementToChange=null;c.removeClass(this.link,"wysihtml5-command-dialog-opened");
this.container.style.display="none";this.fire("hide")}})})(wysihtml5);
(function(b){var c=b.dom,a={position:"relative"},d={left:0,margin:0,opacity:0,overflow:"hidden",padding:0,position:"absolute",top:0,zIndex:1},e={cursor:"inherit",fontSize:"50px",height:"50px",marginTop:"-25px",outline:0,padding:0,position:"absolute",right:"-4px",top:"50%"},f={"x-webkit-speech":"",speech:""};b.toolbar.Speech=function(h,i){var g=document.createElement("input");if(b.browser.supportsSpeechApiOn(g)){var j=h.editor.textarea.element.getAttribute("lang");j&&(f.lang=j);j=document.createElement("div");
b.lang.object(d).merge({width:i.offsetWidth+"px",height:i.offsetHeight+"px"});c.insert(g).into(j);c.insert(j).into(i);c.setStyles(e).on(g);c.setAttributes(f).on(g);c.setStyles(d).on(j);c.setStyles(a).on(i);c.observe(g,"onwebkitspeechchange"in g?"webkitspeechchange":"speechchange",function(){h.execCommand("insertText",g.value);g.value=""});c.observe(g,"click",function(a){c.hasClass(i,"wysihtml5-command-disabled")&&a.preventDefault();a.stopPropagation()})}else i.style.display="none"}})(wysihtml5);
(function(b){var c=b.dom;b.toolbar.Toolbar=Base.extend({constructor:function(a,c){this.editor=a;this.container="string"===typeof c?document.getElementById(c):c;this.composer=a.composer;this._getLinks("command");this._getLinks("action");this._observe();this.show();for(var e=this.container.querySelectorAll("[data-wysihtml5-command=insertSpeech]"),f=e.length,h=0;h<f;h++)new b.toolbar.Speech(this,e[h])},_getLinks:function(a){for(var c=this[a+"Links"]=b.lang.array(this.container.querySelectorAll("[data-wysihtml5-"+
a+"]")).get(),e=c.length,f=0,h=this[a+"Mapping"]={},i,g,j,k,m;f<e;f++)i=c[f],j=i.getAttribute("data-wysihtml5-"+a),k=i.getAttribute("data-wysihtml5-"+a+"-value"),g=this.container.querySelector("[data-wysihtml5-"+a+"-group='"+j+"']"),m=this._getDialog(i,j),h[j+":"+k]={link:i,group:g,name:j,value:k,dialog:m,state:!1}},_getDialog:function(a,c){var e=this,f=this.container.querySelector("[data-wysihtml5-dialog='"+c+"']"),h,i;f&&(h=new b.toolbar.Dialog(a,f),h.on("show",function(){i=e.composer.selection.getBookmark();
e.editor.fire("show:dialog",{command:c,dialogContainer:f,commandLink:a})}),h.on("save",function(b){i&&e.composer.selection.setBookmark(i);e._execCommand(c,b);e.editor.fire("save:dialog",{command:c,dialogContainer:f,commandLink:a})}),h.on("cancel",function(){e.editor.focus(!1);e.editor.fire("cancel:dialog",{command:c,dialogContainer:f,commandLink:a})}));return h},execCommand:function(a,b){if(!this.commandsDisabled){var c=this.commandMapping[a+":"+b];c&&c.dialog&&!c.state?c.dialog.show():this._execCommand(a,
b)}},_execCommand:function(a,b){this.editor.focus(!1);this.composer.commands.exec(a,b);this._updateLinkStates()},execAction:function(a){var b=this.editor;"change_view"===a&&(b.currentView===b.textarea?b.fire("change_view","composer"):b.fire("change_view","textarea"))},_observe:function(){for(var a=this,b=this.editor,e=this.container,f=this.commandLinks.concat(this.actionLinks),h=f.length,i=0;i<h;i++)c.setAttributes({href:"javascript:;",unselectable:"on"}).on(f[i]);c.delegate(e,"[data-wysihtml5-command], [data-wysihtml5-action]",
"mousedown",function(a){a.preventDefault()});c.delegate(e,"[data-wysihtml5-command]","click",function(b){var c=this.getAttribute("data-wysihtml5-command"),d=this.getAttribute("data-wysihtml5-command-value");a.execCommand(c,d);b.preventDefault()});c.delegate(e,"[data-wysihtml5-action]","click",function(b){var c=this.getAttribute("data-wysihtml5-action");a.execAction(c);b.preventDefault()});b.on("focus:composer",function(){a.bookmark=null;clearInterval(a.interval);a.interval=setInterval(function(){a._updateLinkStates()},
500)});b.on("blur:composer",function(){clearInterval(a.interval)});b.on("destroy:composer",function(){clearInterval(a.interval)});b.on("change_view",function(b){setTimeout(function(){a.commandsDisabled="composer"!==b;a._updateLinkStates();a.commandsDisabled?c.addClass(e,"wysihtml5-commands-disabled"):c.removeClass(e,"wysihtml5-commands-disabled")},0)})},_updateLinkStates:function(){var a=this.commandMapping,d=this.actionMapping,e,f,h;for(e in a)h=a[e],this.commandsDisabled?(f=!1,c.removeClass(h.link,
"wysihtml5-command-active"),h.group&&c.removeClass(h.group,"wysihtml5-command-active"),h.dialog&&h.dialog.hide()):(f=this.composer.commands.state(h.name,h.value),b.lang.object(f).isArray()&&(f=1===f.length?f[0]:!0),c.removeClass(h.link,"wysihtml5-command-disabled"),h.group&&c.removeClass(h.group,"wysihtml5-command-disabled")),h.state!==f&&((h.state=f)?(c.addClass(h.link,"wysihtml5-command-active"),h.group&&c.addClass(h.group,"wysihtml5-command-active"),h.dialog&&("object"===typeof f?h.dialog.show(f):
h.dialog.hide())):(c.removeClass(h.link,"wysihtml5-command-active"),h.group&&c.removeClass(h.group,"wysihtml5-command-active"),h.dialog&&h.dialog.hide()));for(e in d)a=d[e],"change_view"===a.name&&(a.state=this.editor.currentView===this.editor.textarea,a.state?c.addClass(a.link,"wysihtml5-action-active"):c.removeClass(a.link,"wysihtml5-action-active"))},show:function(){this.container.style.display=""},hide:function(){this.container.style.display="none"}})})(wysihtml5);
(function(b){var c={name:void 0,style:!0,toolbar:void 0,autoLink:!0,parserRules:{tags:{br:{},span:{},div:{},p:{}},classes:{}},parser:b.dom.parse,composerClassName:"wysihtml5-editor",bodyClassName:"wysihtml5-supported",useLineBreaks:!0,stylesheets:[],placeholderText:void 0,supportTouchDevices:!0};b.Editor=b.lang.Dispatcher.extend({constructor:function(a,d){this.textareaElement="string"===typeof a?document.getElementById(a):a;this.config=b.lang.object({}).merge(c).merge(d).get();this.currentView=this.textarea=
new b.views.Textarea(this,this.textareaElement,this.config);this._isCompatible=b.browser.supported();if(!this._isCompatible||!this.config.supportTouchDevices&&b.browser.isTouchDevice()){var e=this;setTimeout(function(){e.fire("beforeload").fire("load")},0)}else{b.dom.addClass(document.body,this.config.bodyClassName);this.currentView=this.composer=new b.views.Composer(this,this.textareaElement,this.config);"function"===typeof this.config.parser&&this._initParser();this.on("beforeload",function(){this.synchronizer=
new b.views.Synchronizer(this,this.textarea,this.composer);this.config.toolbar&&(this.toolbar=new b.toolbar.Toolbar(this,this.config.toolbar))});try{console.log("Heya! This page is using wysihtml5 for rich text editing. Check out https://github.com/xing/wysihtml5")}catch(f){}}},isCompatible:function(){return this._isCompatible},clear:function(){this.currentView.clear();return this},getValue:function(a){return this.currentView.getValue(a)},setValue:function(a,b){this.fire("unset_placeholder");if(!a)return this.clear();
this.currentView.setValue(a,b);return this},focus:function(a){this.currentView.focus(a);return this},disable:function(){this.currentView.disable();return this},enable:function(){this.currentView.enable();return this},isEmpty:function(){return this.currentView.isEmpty()},hasPlaceholderSet:function(){return this.currentView.hasPlaceholderSet()},parse:function(a){var c=this.config.parser(a,this.config.parserRules,this.composer.sandbox.getDocument(),!0);"object"===typeof a&&b.quirks.redraw(a);return c},
_initParser:function(){this.on("paste:composer",function(){var a=this;a.composer.selection.executeAndRestore(function(){b.quirks.cleanPastedHTML(a.composer.element);a.parse(a.composer.element)},!0)})}})})(wysihtml5);

define("wysihtml5", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.wysihtml5;
    };
}(this)));

// Insert Media WYSIHTML5 Command Module
define(
	'admin/modules/wysiwyg/commands/insertMedia',[
		"$",
		"admin/modules/WindowPopup",
		"wysihtml5"
	],
	function ($, WindowPopup, wysihtml5) {

		return {

			// Launches a centered popup.
			launchWindow : function (url, width, height, top, left, cb) {

				left = left || (screen.width) ? (screen.width - width) / 2 : 0;
				top = top || (screen.height) ? (screen.height - height) / 2 : 0;

				WindowPopup.request(url, [
					'width=' + width,
					'height=' + height,
					'top=' + top,
					'left=' + left,
					'scrollbars=yes',
					'location=no',
					'directories=no',
					'status=no',
					'menubar=no',
					'toolbar=no',
					'resizable=no'
				].join(','), cb);

			},

			// Base execute (executes when "insert media" is clicked)
			exec : function (composer, command, value) {

				// `value` should be valid JSON
				try {
					value = JSON.parse(value);
				} catch (e) {
					throw "You must pass valid JSON to the insertMedia `command-value` data attribute.";
				}

				// Launches a popup, given a URL.
				this.launchWindow(value.mediaUrl, 1025, 600, null, null, function (data) {

					// Inserts the response form the popup as a DOM node
					composer.selection.insertNode($(data)[0]);
				});

			}

		};
	});

define(
	'admin/modules/wysiwyg/commands/commands',[
		"wysihtml5",
		"./insertMedia"
	],
	function (wysihtml5, insertMedia) {

		// Extend list of wysiwyg commands here.
		wysihtml5.commands.insertMedia = insertMedia;

	});

/**
 * Full HTML5 compatibility rule set
 * These rules define which tags and CSS classes are supported and which tags should be specially treated.
 *
 * Examples based on this rule set:
 *
 *    <a href="http://foobar.com">foo</a>
 *    ... becomes ...
 *    <a href="http://foobar.com" target="_blank" rel="nofollow">foo</a>
 *
 *    <img align="left" src="http://foobar.com/image.png">
 *    ... becomes ...
 *    <img class="wysiwyg-float-left" src="http://foobar.com/image.png" alt="">
 *
 *    <div>foo<script>alert(document.cookie)</script></div>
 *    ... becomes ...
 *    <div>foo</div>
 *
 *    <marquee>foo</marquee>
 *    ... becomes ...
 *    <span>foo</span>
 *
 *    foo <br clear="both"> bar
 *    ... becomes ...
 *    foo <br class="wysiwyg-clear-both"> bar
 *
 *    <div>hello <iframe src="http://google.com"></iframe></div>
 *    ... becomes ...
 *    <div>hello </div>
 *
 *    <center>hello</center>
 *    ... becomes ...
 *    <div class="wysiwyg-text-align-center">hello</div>
 */
define('admin/modules/wysiwyg/WysiwygRules',[],function () {
	return {
		/**
		 * CSS Class white-list
		 * Following CSS classes won't be removed when parsed by the wysihtml5 HTML parser
		 */
		"classes": {
			"wysiwyg-clear-both": 1,
			"wysiwyg-clear-left": 1,
			"wysiwyg-clear-right": 1,
			"wysiwyg-float-left": 1,
			"wysiwyg-float-right": 1,
			"wysiwyg-text-align-center": 1,
			"wysiwyg-text-align-justify": 1,
			"wysiwyg-text-align-left": 1,
			"wysiwyg-text-align-right": 1,
			"arrow": 1
		},
		/**
		 * Tag list
		 *
		 * The following options are available:
		 *
		 *    - add_class:        converts and deletes the given HTML4 attribute (align, clear, ...) via the given method to a css class
		 *                        The following methods are implemented in wysihtml5.dom.parse:
		 *                          - align_text:  converts align attribute values (right/left/center/justify) to their corresponding css class "wysiwyg-text-align-*")
		 *                            <p align="center">foo</p> ... becomes ... <p> class="wysiwyg-text-align-center">foo</p>
		 *                          - clear_br:    converts clear attribute values left/right/all/both to their corresponding css class "wysiwyg-clear-*"
		 *                            <br clear="all"> ... becomes ... <br class="wysiwyg-clear-both">
		 *                          - align_img:    converts align attribute values (right/left) on <img> to their corresponding css class "wysiwyg-float-*"
		 *
		 *    - remove:             removes the element and its content
		 *
		 *    - rename_tag:         renames the element to the given tag
		 *
		 *    - set_class:          adds the given class to the element (note: make sure that the class is in the "classes" white list above)
		 *
		 *    - set_attributes:     sets/overrides the given attributes
		 *
		 *    - check_attributes:   checks the given HTML attribute via the given method
		 *                            - url:            allows only valid urls (starting with http:// or https://)
		 *                            - src:            allows something like "/foobar.jpg", "http://google.com", ...
		 *                            - href:           allows something like "mailto:bert@foo.com", "http://google.com", "/foobar.jpg"
		 *                            - alt:            strips unwanted characters. if the attribute is not set, then it gets set (to ensure valid and compatible HTML)
		 *                            - numbers:  ensures that the attribute only contains numeric characters
		 */
		"tags": {
			"tr": {
				"add_class": {
					"align": "align_text"
				}
			},
			"strike": {
				"remove": 1
			},
			"form": {
				"rename_tag": "div"
			},
			"rt": {
				"rename_tag": "span"
			},
			"code": {},
			"acronym": {
				"rename_tag": "span"
			},
			"br": {
				"add_class": {
					"clear": "clear_br"
				}
			},
			"details": {
				"rename_tag": "div"
			},
			"h4": {
				"add_class": {
					"align": "align_text"
				}
			},
			"em": {},
			"title": {
				"remove": 1
			},
			"multicol": {
				"rename_tag": "div"
			},
			"figure": {
				"rename_tag": "div"
			},
			"xmp": {
				"rename_tag": "span"
			},
			"small": {
				"rename_tag": "span",
				"set_class": "wysiwyg-font-size-smaller"
			},
			"area": {
				"remove": 1
			},
			"time": {
				"rename_tag": "span"
			},
			"dir": {
				"rename_tag": "ul"
			},
			"bdi": {
				"rename_tag": "span"
			},
			"command": {
				"remove": 1
			},
			"ul": {},
			"progress": {
				"rename_tag": "span"
			},
			"dfn": {
				"rename_tag": "span"
			},
			"iframe": {
				"remove" : 0,
				"check_attributes": {
					"src": "href",
					"width" : "numbers",
					"height" : "numbers",
					"frameborder" : "numbers",
					"allowfullscreen" : "alt"
				}
			},
			"figcaption": {
				"rename_tag": "div"
			},
			"a": {
				"check_attributes": {
					"href": "href" // if you compiled master manually then change this from 'url' to 'href'
				},
				"set_attributes": {
					"rel": "nofollow",
					"target": "_blank"
				}
			},
			"img": {
				"check_attributes": {
					"width": "numbers",
					"alt": "alt",
					"title": "alt",
					"src": "src", // if you compiled master manually then change this from 'url' to 'src'
					"height": "numbers"
				},
				"add_class": {
					"align": "align_img"
				}
			},
			"rb": {
				"rename_tag": "span"
			},
			"footer": {
				"rename_tag": "div"
			},
			"noframes": {
				"remove": 1
			},
			"abbr": {
				"rename_tag": "span"
			},
			"u": {},
			"bgsound": {
				"remove": 1
			},
			"sup": {
				"rename_tag": "span"
			},
			"address": {
				"rename_tag": "div"
			},
			"basefont": {
				"remove": 1
			},
			"nav": {
				"rename_tag": "div"
			},
			"h1": {
				"add_class": {
					"align": "align_text"
				}
			},
			"head": {
				"remove": 1
			},
			"tbody": {
				"add_class": {
					"align": "align_text"
				}
			},
			"dd": {
				"rename_tag": "div"
			},
			"s": {
				"rename_tag": "span"
			},
			"li": {},
			"td": {
				"check_attributes": {
					"rowspan": "numbers",
					"colspan": "numbers"
				},
				"add_class": {
					"align": "align_text"
				}
			},
			"object": {
				"remove": 1
			},
			"div": {
				"add_class": {
					"align": "align_text"
				}
			},
			"option": {
				"rename_tag": "span"
			},
			"select": {
				"rename_tag": "span"
			},
			"i": {},
			"track": {
				"remove": 1
			},
			"wbr": {
				"remove": 1
			},
			"fieldset": {
				"rename_tag": "div"
			},
			"big": {
				"rename_tag": "span",
				"set_class": "wysiwyg-font-size-larger"
			},
			"button": {
				"rename_tag": "span"
			},
			"noscript": {
				"remove": 1
			},
			"svg": {
				"remove": 1
			},
			"input": {
				"remove": 1
			},
			"table": {},
			"keygen": {
				"remove": 1
			},
			"h5": {
				"add_class": {
					"align": "align_text"
				}
			},
			"meta": {
				"remove": 1
			},
			"map": {
				"rename_tag": "div"
			},
			"isindex": {
				"remove": 1
			},
			"mark": {
				"rename_tag": "span"
			},
			"caption": {
				"add_class": {
					"align": "align_text"
				}
			},
			"tfoot": {
				"add_class": {
					"align": "align_text"
				}
			},
			"base": {
				"remove": 1
			},
			"video": {
				"remove": 1
			},
			"strong": {},
			"canvas": {
				"remove": 1
			},
			"output": {
				"rename_tag": "span"
			},
			"marquee": {
				"rename_tag": "span"
			},
			"b": {},
			"q": {
				"check_attributes": {
					"cite": "url"
				}
			},
			"applet": {
				"remove": 1
			},
			"span": {},
			"rp": {
				"rename_tag": "span"
			},
			"spacer": {
				"remove": 1
			},
			"source": {
				"remove": 1
			},
			"aside": {
				"rename_tag": "div"
			},
			"frame": {
				"remove": 1
			},
			"section": {
				"rename_tag": "div"
			},
			"body": {
				"rename_tag": "div"
			},
			"ol": {},
			"nobr": {
				"rename_tag": "span"
			},
			"html": {
				"rename_tag": "div"
			},
			"summary": {
				"rename_tag": "span"
			},
			"var": {
				"rename_tag": "span"
			},
			"del": {
				"remove": 1
			},
			"blockquote": {
				"check_attributes": {
					"cite": "url"
				}
			},
			"style": {
				"remove": 1
			},
			"device": {
				"remove": 1
			},
			"meter": {
				"rename_tag": "span"
			},
			"h3": {
				"add_class": {
					"align": "align_text"
				}
			},
			"textarea": {
				"rename_tag": "span"
			},
			"embed": {
				"remove": 1
			},
			"hgroup": {
				"rename_tag": "div"
			},
			"font": {
				"rename_tag": "span",
				"add_class": {
					"size": "size_font"
				}
			},
			"tt": {
				"rename_tag": "span"
			},
			"noembed": {
				"remove": 1
			},
			"thead": {
				"add_class": {
					"align": "align_text"
				}
			},
			"blink": {
				"rename_tag": "span"
			},
			"plaintext": {
				"rename_tag": "span"
			},
			"xml": {
				"remove": 1
			},
			"h6": {
				"add_class": {
					"align": "align_text"
				}
			},
			"param": {
				"remove": 1
			},
			"th": {
				"check_attributes": {
					"rowspan": "numbers",
					"colspan": "numbers"
				},
				"add_class": {
					"align": "align_text"
				}
			},
			"legend": {
				"rename_tag": "span"
			},
			"hr": {},
			"label": {
				"rename_tag": "span"
			},
			"dl": {
				"rename_tag": "div"
			},
			"kbd": {
				"rename_tag": "span"
			},
			"listing": {
				"rename_tag": "div"
			},
			"dt": {
				"rename_tag": "span"
			},
			"nextid": {
				"remove": 1
			},
			"pre": {},
			"center": {
				"rename_tag": "div",
				"set_class": "wysiwyg-text-align-center"
			},
			"audio": {
				"remove": 1
			},
			"datalist": {
				"rename_tag": "span"
			},
			"samp": {
				"rename_tag": "span"
			},
			"col": {
				"remove": 1
			},
			"article": {
				"rename_tag": "div"
			},
			"cite": {},
			"link": {
				"remove": 1
			},
			"script": {
				"remove": 1
			},
			"bdo": {
				"rename_tag": "span"
			},
			"menu": {
				"rename_tag": "ul"
			},
			"colgroup": {
				"remove": 1
			},
			"ruby": {
				"rename_tag": "span"
			},
			"h2": {
				"add_class": {
					"align": "align_text"
				}
			},
			"ins": {
				"rename_tag": "span"
			},
			"p": {
				"add_class": {
					"align": "align_text"
				}
			},
			"sub": {
				"rename_tag": "span"
			},
			"comment": {
				"remove": 1
			},
			"frameset": {
				"remove": 1
			},
			"optgroup": {
				"rename_tag": "span"
			},
			"header": {
				"rename_tag": "div"
			}
		}
	};
});

define(

	'admin/modules/wysiwyg/Wysiwyg',[
		"rosy/base/DOMClass",
		"$",
		"wysihtml5",
		"./commands/commands",
		"./WysiwygRules"
	],

	function (DOMClass, $, wysihtml5, commands, wysihtml5ParserRules) {

		

		var guid = 0;

		return DOMClass.extend({

			dom : null,
			toolbar : null,
			textarea : null,

			count : 0,

			init : function (dom) {
				this.dom = dom;
				this.toolbar = this.dom.find('.wysiwyg-toolbar');
				this.textarea = this.dom.find('.wysiwyg-textarea');

				this._initWysihtml5();
			},

			_initWysihtml5 : function () {
				var id = "wysihtml5-" + (++guid),
					textareaId = id + '-textarea',
					toolbarId = id + '-toolbar',
					editor;

				this.toolbar.attr('id', toolbarId);
				this.textarea.attr('id', textareaId);

				editor = new wysihtml5.Editor(textareaId, {
					parserRules: wysihtml5ParserRules,
					style: false,
					toolbar: toolbarId,
					stylesheets: "/static/css/wysiwyg.css"
				});
			}
		});
	}
);

define(
	'admin/modules/OnExit',['require','exports','module','rosy/base/DOMClass','$'],function (require, exports, module) {

		

		var DOMClass             = require("rosy/base/DOMClass"),
			$                    = require("$"),
			OnExit;

		OnExit = DOMClass.extend({

			_isSubmitting : false,

			forms : {},

			init : function (dom) {
				// console.warn("OnExit : init(dom)", dom);
				// console.log("forms", this.forms);
				// $('form').on('submit', this.onSubmit);
				// $(window).on('beforeunload', this.onUnload);
				// this.cacheValues();
			},

			cacheValues : function () {
				// console.warn("OnExit : cacheValues()");
				// console.log("forms", this.forms);
				$('form').each(this.proxy(function (i, form) {
					form = $(form);
					var id = form.data('form-id'),
						values = {};

					if (!id) {
						return;
					}

					form.find('[name]').each(function (i, input) {
						input = $(input);
						values[input.attr('name')] = input.val();
					});

					this.forms[id] = values;
				}));
			},

			isDirty : function () {
				// console.warn("OnExit : isDirty()");
				// console.log("forms", this.forms);
				var isDirty = false;

				$('form').each(this.proxy(function (i, form) {
					form = $(form);
					var id = form.data('form-id'),
						values = this.forms[id],
						value;

					if (!id) {
						return;
					}

					form.find('[name]').each(function (i, input) {
						input = $(input);
						value = values[input.attr('name')];

						if (value !== undefined && value !== input.val()) {
							isDirty = true;
							/*
							window.console.log("In form", id, input.attr('name'),
								'changed from', values[input.attr('name')],
								'to', input.val());
							*/
						}
					});
				}));

				return isDirty;
			},

			onSubmit : function (e) {
				// console.warn("OnExit : onSubmit(e)", e);
				// console.log("forms", this.forms);
				this._isSubmitting = true;
			},

			onUnload : function (e) {
				// console.warn("OnExit : onUnload(e)", e);
				// console.log("forms", this.forms);
				if (!this._isSubmitting && this.isDirty()) {
					if (e) {
						e.returnValue = "You have unsaved changes";
					}
					return "You have unsaved changes";
				}
			}

		});

		return new OnExit();
	}
);

define(
	'admin/modules/InlineVideo',[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		

		return DOMClass.extend({

			vars : {
				$dom : null
			},

			init : function () {
				this.sup();
				this.bindInput();
			},

			bindInput : function () {
				this.vars.$dom.on("click", this.onImageClick);
			},

			onImageClick : function (e) {
				var $el = $(e.currentTarget),
					url = $el.data("videoUrl"),
					width = $el.width(),
					height = $el.height(),
					str;

				str = [
					'<iframe width="' + width + '" height="' + height + '"',
					'src="' + url + '"',
					'frameborder="0" allowfullscreen></iframe>'
				].join("");



				this.vars.$dom.replaceWith(str);
			},

			destroy : function () {
				this.sup();
			}

		});

	}
);

define(
	'admin/modules/FilterBar',[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		

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

			init : function (dom) {
				this.dom = dom;
				this.data = this.dom.data();
				this.bindDropDownEvents();
			},

			bindDropDownEvents : function () {
				var dropDowns = this.dom.find("summary");

				dropDowns.on("click", function () {
					var dropdown = this;
					dropDowns.each(function (i) {
						if (dropdown !== this) {
							var details = $(this).parent();
							if (details.attr("open") !== undefined) {
								details.removeAttr("open");
							} else if (details.hasClass("open")) {
								details.removeClass("open").addClass("closed");
								details.attr("data-open", "closed");
							}
						}
					});
				});
			}

		});
	});
define('$plugin!jcrop', ['$'], function ($) {
var jQuery = $;
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


(function ($) {

  $.Jcrop = function (obj, opt) {
    var options = $.extend({}, $.Jcrop.defaults),
        docOffset,
        _ua = navigator.userAgent.toLowerCase(),
        is_msie = /msie/.test(_ua),
        ie6mode = /msie [1-6]\./.test(_ua);

    // Internal Methods {{{
    function px(n) {
      return Math.round(n) + 'px';
    }
    function cssClass(cl) {
      return options.baseClass + '-' + cl;
    }
    function supportsColorFade() {
      return $.fx.step.hasOwnProperty('backgroundColor');
    }
    function getPos(obj) //{{{
    {
      var pos = $(obj).offset();
      return [pos.left, pos.top];
    }
    //}}}
    function mouseAbs(e) //{{{
    {
      return [(e.pageX - docOffset[0]), (e.pageY - docOffset[1])];
    }
    //}}}
    function setOptions(opt) //{{{
    {
      if (typeof(opt) !== 'object') opt = {};
      options = $.extend(options, opt);

      $.each(['onChange','onSelect','onRelease','onDblClick'],function(i,e) {
        if (typeof(options[e]) !== 'function') options[e] = function () {};
      });
    }
    //}}}
    function startDragMode(mode, pos, touch) //{{{
    {
      docOffset = getPos($img);
      Tracker.setCursor(mode === 'move' ? mode : mode + '-resize');

      if (mode === 'move') {
        return Tracker.activateHandlers(createMover(pos), doneSelect, touch);
      }

      var fc = Coords.getFixed();
      var opp = oppLockCorner(mode);
      var opc = Coords.getCorner(oppLockCorner(opp));

      Coords.setPressed(Coords.getCorner(opp));
      Coords.setCurrent(opc);

      Tracker.activateHandlers(dragmodeHandler(mode, fc), doneSelect, touch);
    }
    //}}}
    function dragmodeHandler(mode, f) //{{{
    {
      return function (pos) {
        if (!options.aspectRatio) {
          switch (mode) {
          case 'e':
            pos[1] = f.y2;
            break;
          case 'w':
            pos[1] = f.y2;
            break;
          case 'n':
            pos[0] = f.x2;
            break;
          case 's':
            pos[0] = f.x2;
            break;
          }
        } else {
          switch (mode) {
          case 'e':
            pos[1] = f.y + 1;
            break;
          case 'w':
            pos[1] = f.y + 1;
            break;
          case 'n':
            pos[0] = f.x + 1;
            break;
          case 's':
            pos[0] = f.x + 1;
            break;
          }
        }
        Coords.setCurrent(pos);
        Selection.update();
      };
    }
    //}}}
    function createMover(pos) //{{{
    {
      var lloc = pos;
      KeyManager.watchKeys();

      return function (pos) {
        Coords.moveOffset([pos[0] - lloc[0], pos[1] - lloc[1]]);
        lloc = pos;

        Selection.update();
      };
    }
    //}}}
    function oppLockCorner(ord) //{{{
    {
      switch (ord) {
      case 'n':
        return 'sw';
      case 's':
        return 'nw';
      case 'e':
        return 'nw';
      case 'w':
        return 'ne';
      case 'ne':
        return 'sw';
      case 'nw':
        return 'se';
      case 'se':
        return 'nw';
      case 'sw':
        return 'ne';
      }
    }
    //}}}
    function createDragger(ord) //{{{
    {
      return function (e) {
        if (options.disabled) {
          return false;
        }
        if ((ord === 'move') && !options.allowMove) {
          return false;
        }

        // Fix position of crop area when dragged the very first time.
        // Necessary when crop image is in a hidden element when page is loaded.
        docOffset = getPos($img);

        btndown = true;
        startDragMode(ord, mouseAbs(e));
        e.stopPropagation();
        e.preventDefault();
        return false;
      };
    }
    //}}}
    function presize($obj, w, h) //{{{
    {
      var natW = $obj.naturalWidth() || $obj.width(),
          natH = $obj.naturalHeight() || $obj.height();

      var nw = natW,
          nh = natH;

      if ((nw > w) && w > 0) {
        nw = w;
        nh = (w / natW) * natH;
      }
      if ((nh > h) && h > 0) {
        nh = h;
        nw = (h / natH) * natW;
      }

      xscale = natW / nw;
      yscale = natH / nh;
      $obj.width(nw).height(nh);
    }
    //}}}
    function unscale(c) //{{{
    {
      var o ={
        x: Math.floor(c.x * xscale),
        y: Math.floor(c.y * yscale),
        x2: Math.floor(c.x2 * xscale),
        y2: Math.floor(c.y2 * yscale),
        w: Math.floor(c.w * xscale),
        h: Math.floor(c.h * yscale)
      };

      return o;
    }
    //}}}
    function doneSelect(pos) //{{{
    {
      var c = Coords.getFixed();
      if ((c.w > options.minSelect[0]) && (c.h > options.minSelect[1])) {
        Selection.enableHandles();
        Selection.done();
      } else {
        Selection.release();
      }
      Tracker.setCursor(options.allowSelect ? 'crosshair' : 'default');
    }
    //}}}
    function newSelection(e) //{{{
    {
      if (options.disabled) {
        return false;
      }
      if (!options.allowSelect) {
        return false;
      }
      btndown = true;
      docOffset = getPos($img);
      Selection.disableHandles();
      Tracker.setCursor('crosshair');
      var pos = mouseAbs(e);
      Coords.setPressed(pos);
      Selection.update();
      Tracker.activateHandlers(selectDrag, doneSelect, e.type.substring(0,5)==='touch');
      KeyManager.watchKeys();

      e.stopPropagation();
      e.preventDefault();
      return false;
    }
    //}}}
    function selectDrag(pos) //{{{
    {
      Coords.setCurrent(pos);
      Selection.update();
    }
    //}}}
    function newTracker() //{{{
    {
      var trk = $('<div></div>').addClass(cssClass('tracker'));
      if (is_msie) {
        trk.css({
          opacity: 0,
          backgroundColor: 'white'
        });
      }
      return trk;
    }
    //}}}

    // }}}
    // Initialization {{{
    // Sanitize some options {{{
    if (typeof(obj) !== 'object') {
      obj = $(obj)[0];
    }
    if (typeof(opt) !== 'object') {
      opt = {};
    }
    // }}}
    setOptions(opt);
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
      left: 0
    };

    var $origimg = $(obj),
      img_mode = true;

    if (obj.tagName == 'IMG') {
      // Fix size of crop image.
      // Necessary when crop image is within a hidden element when page is loaded.
      if ($origimg[0].width != 0 && $origimg[0].height != 0) {
        // Obtain dimensions from contained img element.
        $origimg.width($origimg[0].width);
        $origimg.height($origimg[0].height);
      } else {
        // Obtain dimensions from temporary image in case the original is not loaded yet (e.g. IE 7.0).
        var tempImage = new Image();
        tempImage.src = $origimg[0].src;
        $origimg.width(tempImage.width);
        $origimg.height(tempImage.height);
      }

      var $img = $origimg.clone().removeAttr('id').css(img_css).show();

      $img.width($origimg.width());
      $img.height($origimg.height());
      $origimg.after($img).hide();

    } else {
      $img = $origimg.css(img_css).show();
      img_mode = false;
      if (options.shade === null) { options.shade = true; }
    }

    presize($img, options.boxWidth, options.boxHeight);

    var boundx = $img.width(),
        boundy = $img.height(),


        $div = $('<div />').width(boundx).height(boundy).addClass(cssClass('holder')).css({
        position: 'relative',
        backgroundColor: options.bgColor
      }).insertAfter($origimg).append($img);

    if (options.addClass) {
      $div.addClass(options.addClass);
    }

    var $img2 = $('<div />'),

        $img_holder = $('<div />')
        .width('100%').height('100%').css({
          zIndex: 310,
          position: 'absolute',
          overflow: 'hidden'
        }),

        $hdl_holder = $('<div />')
        .width('100%').height('100%').css('zIndex', 320),

        $sel = $('<div />')
        .css({
          position: 'absolute',
          zIndex: 600
        }).dblclick(function(){
          var c = Coords.getFixed();
          options.onDblClick.call(api,c);
        }).insertBefore($img).append($img_holder, $hdl_holder);

    if (img_mode) {

      $img2 = $('<img />')
          .attr('src', $img.attr('src')).css(img_css).width(boundx).height(boundy),

      $img_holder.append($img2);

    }

    if (ie6mode) {
      $sel.css({
        overflowY: 'hidden'
      });
    }

    var bound = options.boundary;
    var $trk = newTracker().width(boundx + (bound * 2)).height(boundy + (bound * 2)).css({
      position: 'absolute',
      top: px(-bound),
      left: px(-bound),
      zIndex: 290
    }).mousedown(newSelection);

    /* }}} */
    // Set more variables {{{
    var bgcolor = options.bgColor,
        bgopacity = options.bgOpacity,
        xlimit, ylimit, xmin, ymin, xscale, yscale, enabled = true,
        btndown, animating, shift_down;

    docOffset = getPos($img);
    // }}}
    // }}}
    // Internal Modules {{{
    // Touch Module {{{
    var Touch = (function () {
      // Touch support detection function adapted (under MIT License)
      // from code by Jeffrey Sambells - http://github.com/iamamused/
      function hasTouchSupport() {
        var support = {}, events = ['touchstart', 'touchmove', 'touchend'],
            el = document.createElement('div'), i;

        try {
          for(i=0; i<events.length; i++) {
            var eventName = events[i];
            eventName = 'on' + eventName;
            var isSupported = (eventName in el);
            if (!isSupported) {
              el.setAttribute(eventName, 'return;');
              isSupported = typeof el[eventName] == 'function';
            }
            support[events[i]] = isSupported;
          }
          return support.touchstart && support.touchend && support.touchmove;
        }
        catch(err) {
          return false;
        }
      }

      function detectSupport() {
        if ((options.touchSupport === true) || (options.touchSupport === false)) return options.touchSupport;
          else return hasTouchSupport();
      }
      return {
        createDragger: function (ord) {
          return function (e) {
            if (options.disabled) {
              return false;
            }
            if ((ord === 'move') && !options.allowMove) {
              return false;
            }
            docOffset = getPos($img);
            btndown = true;
            startDragMode(ord, mouseAbs(Touch.cfilter(e)), true);
            e.stopPropagation();
            e.preventDefault();
            return false;
          };
        },
        newSelection: function (e) {
          return newSelection(Touch.cfilter(e));
        },
        cfilter: function (e){
          e.pageX = e.originalEvent.changedTouches[0].pageX;
          e.pageY = e.originalEvent.changedTouches[0].pageY;
          return e;
        },
        isSupported: hasTouchSupport,
        support: detectSupport()
      };
    }());
    // }}}
    // Coords Module {{{
    var Coords = (function () {
      var x1 = 0,
          y1 = 0,
          x2 = 0,
          y2 = 0,
          ox, oy;

      function setPressed(pos) //{{{
      {
        pos = rebound(pos);
        x2 = x1 = pos[0];
        y2 = y1 = pos[1];
      }
      //}}}
      function setCurrent(pos) //{{{
      {
        pos = rebound(pos);
        ox = pos[0] - x2;
        oy = pos[1] - y2;
        x2 = pos[0];
        y2 = pos[1];
      }
      //}}}
      function getOffset() //{{{
      {
        return [ox, oy];
      }
      //}}}
      function moveOffset(offset) //{{{
      {
        var ox = offset[0],
            oy = offset[1];

        if (0 > x1 + ox) {
          ox -= ox + x1;
        }
        if (0 > y1 + oy) {
          oy -= oy + y1;
        }

        if (boundy < y2 + oy) {
          oy += boundy - (y2 + oy);
        }
        if (boundx < x2 + ox) {
          ox += boundx - (x2 + ox);
        }

        x1 += ox;
        x2 += ox;
        y1 += oy;
        y2 += oy;
      }
      //}}}
      function getCorner(ord) //{{{
      {
        var c = getFixed();
        switch (ord) {
        case 'ne':
          return [c.x2, c.y];
        case 'nw':
          return [c.x, c.y];
        case 'se':
          return [c.x2, c.y2];
        case 'sw':
          return [c.x, c.y2];
        }
      }
      //}}}
      function getFixed() //{{{
      {
        if (!options.aspectRatio) {
          return getRect();
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
            xx, yy, w, h;

        if (max_x === 0) {
          max_x = boundx * 10;
        }
        if (max_y === 0) {
          max_y = boundy * 10;
        }
        if (real_ratio < aspect) {
          yy = y2;
          w = rha * aspect;
          xx = rw < 0 ? x1 - w : w + x1;

          if (xx < 0) {
            xx = 0;
            h = Math.abs((xx - x1) / aspect);
            yy = rh < 0 ? y1 - h : h + y1;
          } else if (xx > boundx) {
            xx = boundx;
            h = Math.abs((xx - x1) / aspect);
            yy = rh < 0 ? y1 - h : h + y1;
          }
        } else {
          xx = x2;
          h = rwa / aspect;
          yy = rh < 0 ? y1 - h : y1 + h;
          if (yy < 0) {
            yy = 0;
            w = Math.abs((yy - y1) * aspect);
            xx = rw < 0 ? x1 - w : w + x1;
          } else if (yy > boundy) {
            yy = boundy;
            w = Math.abs(yy - y1) * aspect;
            xx = rw < 0 ? x1 - w : w + x1;
          }
        }

        // Magic %-)
        if (xx > x1) { // right side
          if (xx - x1 < min_x) {
            xx = x1 + min_x;
          } else if (xx - x1 > max_x) {
            xx = x1 + max_x;
          }
          if (yy > y1) {
            yy = y1 + (xx - x1) / aspect;
          } else {
            yy = y1 - (xx - x1) / aspect;
          }
        } else if (xx < x1) { // left side
          if (x1 - xx < min_x) {
            xx = x1 - min_x;
          } else if (x1 - xx > max_x) {
            xx = x1 - max_x;
          }
          if (yy > y1) {
            yy = y1 + (x1 - xx) / aspect;
          } else {
            yy = y1 - (x1 - xx) / aspect;
          }
        }

        if (xx < 0) {
          x1 -= xx;
          xx = 0;
        } else if (xx > boundx) {
          x1 -= xx - boundx;
          xx = boundx;
        }

        if (yy < 0) {
          y1 -= yy;
          yy = 0;
        } else if (yy > boundy) {
          y1 -= yy - boundy;
          yy = boundy;
        }

        return makeObj(flipCoords(x1, y1, xx, yy));
      }
      //}}}
      function rebound(p) //{{{
      {
        if (p[0] < 0) p[0] = 0;
        if (p[1] < 0) p[1] = 0;

        if (p[0] > boundx) p[0] = boundx;
        if (p[1] > boundy) p[1] = boundy;

        return [Math.round(p[0]), Math.round(p[1])];
      }
      //}}}
      function flipCoords(x1, y1, x2, y2) //{{{
      {
        var xa = x1,
            xb = x2,
            ya = y1,
            yb = y2;
        if (x2 < x1) {
          xa = x2;
          xb = x1;
        }
        if (y2 < y1) {
          ya = y2;
          yb = y1;
        }
        return [xa, ya, xb, yb];
      }
      //}}}
      function getRect() //{{{
      {
        var xsize = x2 - x1,
            ysize = y2 - y1,
            delta;

        if (xlimit && (Math.abs(xsize) > xlimit)) {
          x2 = (xsize > 0) ? (x1 + xlimit) : (x1 - xlimit);
        }
        if (ylimit && (Math.abs(ysize) > ylimit)) {
          y2 = (ysize > 0) ? (y1 + ylimit) : (y1 - ylimit);
        }

        if (ymin / yscale && (Math.abs(ysize) < ymin / yscale)) {
          y2 = (ysize > 0) ? (y1 + ymin / yscale) : (y1 - ymin / yscale);
        }
        if (xmin / xscale && (Math.abs(xsize) < xmin / xscale)) {
          x2 = (xsize > 0) ? (x1 + xmin / xscale) : (x1 - xmin / xscale);
        }

        if (x1 < 0) {
          x2 -= x1;
          x1 -= x1;
        }
        if (y1 < 0) {
          y2 -= y1;
          y1 -= y1;
        }
        if (x2 < 0) {
          x1 -= x2;
          x2 -= x2;
        }
        if (y2 < 0) {
          y1 -= y2;
          y2 -= y2;
        }
        if (x2 > boundx) {
          delta = x2 - boundx;
          x1 -= delta;
          x2 -= delta;
        }
        if (y2 > boundy) {
          delta = y2 - boundy;
          y1 -= delta;
          y2 -= delta;
        }
        if (x1 > boundx) {
          delta = x1 - boundy;
          y2 -= delta;
          y1 -= delta;
        }
        if (y1 > boundy) {
          delta = y1 - boundy;
          y2 -= delta;
          y1 -= delta;
        }

        return makeObj(flipCoords(x1, y1, x2, y2));
      }
      //}}}
      function makeObj(a) //{{{
      {
        return {
          x: a[0],
          y: a[1],
          x2: a[2],
          y2: a[3],
          w: a[2] - a[0],
          h: a[3] - a[1]
        };
      }
      //}}}

      return {
        flipCoords: flipCoords,
        setPressed: setPressed,
        setCurrent: setCurrent,
        getOffset: getOffset,
        moveOffset: moveOffset,
        getCorner: getCorner,
        getFixed: getFixed
      };
    }());

    //}}}
    // Shade Module {{{
    var Shade = (function() {
      var enabled = false,
          holder = $('<div />').css({
            position: 'absolute',
            zIndex: 240,
            opacity: 0
          }),
          shades = {
            top: createShade(),
            left: createShade().height(boundy),
            right: createShade().height(boundy),
            bottom: createShade()
          };

      function resizeShades(w,h) {
        shades.left.css({ height: px(h) });
        shades.right.css({ height: px(h) });
      }
      function updateAuto()
      {
        return updateShade(Coords.getFixed());
      }
      function updateShade(c)
      {
        shades.top.css({
          left: px(c.x),
          width: px(c.w),
          height: px(c.y)
        });
        shades.bottom.css({
          top: px(c.y2),
          left: px(c.x),
          width: px(c.w),
          height: px(boundy-c.y2)
        });
        shades.right.css({
          left: px(c.x2),
          width: px(boundx-c.x2)
        });
        shades.left.css({
          width: px(c.x)
        });
      }
      function createShade() {
        return $('<div />').css({
          position: 'absolute',
          backgroundColor: options.shadeColor||options.bgColor
        }).appendTo(holder);
      }
      function enableShade() {
        if (!enabled) {
          enabled = true;
          holder.insertBefore($img);
          updateAuto();
          Selection.setBgOpacity(1,0,1);
          $img2.hide();

          setBgColor(options.shadeColor||options.bgColor,1);
          if (Selection.isAwake())
          {
            setOpacity(options.bgOpacity,1);
          }
            else setOpacity(1,1);
        }
      }
      function setBgColor(color,now) {
        colorChangeMacro(getShades(),color,now);
      }
      function disableShade() {
        if (enabled) {
          holder.remove();
          $img2.show();
          enabled = false;
          if (Selection.isAwake()) {
            Selection.setBgOpacity(options.bgOpacity,1,1);
          } else {
            Selection.setBgOpacity(1,1,1);
            Selection.disableHandles();
          }
          colorChangeMacro($div,0,1);
        }
      }
      function setOpacity(opacity,now) {
        if (enabled) {
          if (options.bgFade && !now) {
            holder.animate({
              opacity: 1-opacity
            },{
              queue: false,
              duration: options.fadeTime
            });
          }
          else holder.css({opacity:1-opacity});
        }
      }
      function refreshAll() {
        options.shade ? enableShade() : disableShade();
        if (Selection.isAwake()) setOpacity(options.bgOpacity);
      }
      function getShades() {
        return holder.children();
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
        opacity: setOpacity
      };
    }());
    // }}}
    // Selection Module {{{
    var Selection = (function () {
      var awake,
          hdep = 370,
          borders = {},
          handle = {},
          dragbar = {},
          seehandles = false;

      // Private Methods
      function insertBorder(type) //{{{
      {
        var jq = $('<div />').css({
          position: 'absolute',
          opacity: options.borderOpacity
        }).addClass(cssClass(type));
        $img_holder.append(jq);
        return jq;
      }
      //}}}
      function dragDiv(ord, zi) //{{{
      {
        var jq = $('<div />').mousedown(createDragger(ord)).css({
          cursor: ord + '-resize',
          position: 'absolute',
          zIndex: zi
        }).addClass('ord-'+ord);

        if (Touch.support) {
          jq.bind('touchstart.jcrop', Touch.createDragger(ord));
        }

        $hdl_holder.append(jq);
        return jq;
      }
      //}}}
      function insertHandle(ord) //{{{
      {
        var hs = options.handleSize,

          div = dragDiv(ord, hdep++).css({
            opacity: options.handleOpacity
          }).addClass(cssClass('handle'));

        if (hs) { div.width(hs).height(hs); }

        return div;
      }
      //}}}
      function insertDragbar(ord) //{{{
      {
        return dragDiv(ord, hdep++).addClass('jcrop-dragbar');
      }
      //}}}
      function createDragbars(li) //{{{
      {
        var i;
        for (i = 0; i < li.length; i++) {
          dragbar[li[i]] = insertDragbar(li[i]);
        }
      }
      //}}}
      function createBorders(li) //{{{
      {
        var cl,i;
        for (i = 0; i < li.length; i++) {
          switch(li[i]){
            case'n': cl='hline'; break;
            case's': cl='hline bottom'; break;
            case'e': cl='vline right'; break;
            case'w': cl='vline'; break;
          }
          borders[li[i]] = insertBorder(cl);
        }
      }
      //}}}
      function createHandles(li) //{{{
      {
        var i;
        for (i = 0; i < li.length; i++) {
          handle[li[i]] = insertHandle(li[i]);
        }
      }
      //}}}
      function moveto(x, y) //{{{
      {
        if (!options.shade) {
          $img2.css({
            top: px(-y),
            left: px(-x)
          });
        }
        $sel.css({
          top: px(y),
          left: px(x)
        });
      }
      //}}}
      function resize(w, h) //{{{
      {
        $sel.width(Math.round(w)).height(Math.round(h));
      }
      //}}}
      function refresh() //{{{
      {
        var c = Coords.getFixed();

        Coords.setPressed([c.x, c.y]);
        Coords.setCurrent([c.x2, c.y2]);

        updateVisible();
      }
      //}}}

      // Internal Methods
      function updateVisible(select) //{{{
      {
        if (awake) {
          return update(select);
        }
      }
      //}}}
      function update(select) //{{{
      {
        var c = Coords.getFixed();

        resize(c.w, c.h);
        moveto(c.x, c.y);
        if (options.shade) Shade.updateRaw(c);

        awake || show();

        if (select) {
          options.onSelect.call(api, unscale(c));
        } else {
          options.onChange.call(api, unscale(c));
        }
      }
      //}}}
      function setBgOpacity(opacity,force,now) //{{{
      {
        if (!awake && !force) return;
        if (options.bgFade && !now) {
          $img.animate({
            opacity: opacity
          },{
            queue: false,
            duration: options.fadeTime
          });
        } else {
          $img.css('opacity', opacity);
        }
      }
      //}}}
      function show() //{{{
      {
        $sel.show();

        if (options.shade) Shade.opacity(bgopacity);
          else setBgOpacity(bgopacity,true);

        awake = true;
      }
      //}}}
      function release() //{{{
      {
        disableHandles();
        $sel.hide();

        if (options.shade) Shade.opacity(1);
          else setBgOpacity(1);

        awake = false;
        options.onRelease.call(api);
      }
      //}}}
      function showHandles() //{{{
      {
        if (seehandles) {
          $hdl_holder.show();
        }
      }
      //}}}
      function enableHandles() //{{{
      {
        seehandles = true;
        if (options.allowResize) {
          $hdl_holder.show();
          return true;
        }
      }
      //}}}
      function disableHandles() //{{{
      {
        seehandles = false;
        $hdl_holder.hide();
      }
      //}}}
      function animMode(v) //{{{
      {
        if (v) {
          animating = true;
          disableHandles();
        } else {
          animating = false;
          enableHandles();
        }
      }
      //}}}
      function done() //{{{
      {
        animMode(false);
        refresh();
      }
      //}}}
      // Insert draggable elements {{{
      // Insert border divs for outline

      if (options.dragEdges && $.isArray(options.createDragbars))
        createDragbars(options.createDragbars);

      if ($.isArray(options.createHandles))
        createHandles(options.createHandles);

      if (options.drawBorders && $.isArray(options.createBorders))
        createBorders(options.createBorders);

      //}}}

      // This is a hack for iOS5 to support drag/move touch functionality
      $(document).bind('touchstart.jcrop-ios',function(e) {
        if ($(e.currentTarget).hasClass('jcrop-tracker')) e.stopPropagation();
      });

      var $track = newTracker().mousedown(createDragger('move')).css({
        cursor: 'move',
        position: 'absolute',
        zIndex: 360
      });

      if (Touch.support) {
        $track.bind('touchstart.jcrop', Touch.createDragger('move'));
      }

      $img_holder.append($track);
      disableHandles();

      return {
        updateVisible: updateVisible,
        update: update,
        release: release,
        refresh: refresh,
        isAwake: function () {
          return awake;
        },
        setCursor: function (cursor) {
          $track.css('cursor', cursor);
        },
        enableHandles: enableHandles,
        enableOnly: function () {
          seehandles = true;
        },
        showHandles: showHandles,
        disableHandles: disableHandles,
        animMode: animMode,
        setBgOpacity: setBgOpacity,
        done: done
      };
    }());

    //}}}
    // Tracker Module {{{
    var Tracker = (function () {
      var onMove = function () {},
          onDone = function () {},
          trackDoc = options.trackDocument;

      function toFront(touch) //{{{
      {
        $trk.css({
          zIndex: 450
        });

        if (touch)
          $(document)
            .bind('touchmove.jcrop', trackTouchMove)
            .bind('touchend.jcrop', trackTouchEnd);

        else if (trackDoc)
          $(document)
            .bind('mousemove.jcrop',trackMove)
            .bind('mouseup.jcrop',trackUp);
      }
      //}}}
      function toBack() //{{{
      {
        $trk.css({
          zIndex: 290
        });
        $(document).unbind('.jcrop');
      }
      //}}}
      function trackMove(e) //{{{
      {
        onMove(mouseAbs(e));
        return false;
      }
      //}}}
      function trackUp(e) //{{{
      {
        e.preventDefault();
        e.stopPropagation();

        if (btndown) {
          btndown = false;

          onDone(mouseAbs(e));

          if (Selection.isAwake()) {
            options.onSelect.call(api, unscale(Coords.getFixed()));
          }

          toBack();
          onMove = function () {};
          onDone = function () {};
        }

        return false;
      }
      //}}}
      function activateHandlers(move, done, touch) //{{{
      {
        btndown = true;
        onMove = move;
        onDone = done;
        toFront(touch);
        return false;
      }
      //}}}
      function trackTouchMove(e) //{{{
      {
        onMove(mouseAbs(Touch.cfilter(e)));
        return false;
      }
      //}}}
      function trackTouchEnd(e) //{{{
      {
        return trackUp(Touch.cfilter(e));
      }
      //}}}
      function setCursor(t) //{{{
      {
        $trk.css('cursor', t);
      }
      //}}}

      if (!trackDoc) {
        $trk.mousemove(trackMove).mouseup(trackUp).mouseout(trackUp);
      }

      $img.before($trk);
      return {
        activateHandlers: activateHandlers,
        setCursor: setCursor
      };
    }());
    //}}}
    // KeyManager Module {{{
    var KeyManager = (function () {
      var $keymgr = $('<input type="radio" />').css({
        position: 'fixed',
        left: '-120px',
        width: '12px'
      }).addClass('jcrop-keymgr'),

        $keywrap = $('<div />').css({
          position: 'absolute',
          overflow: 'hidden'
        }).append($keymgr);

      function watchKeys() //{{{
      {
        if (options.keySupport) {
          $keymgr.show();
          $keymgr.focus();
        }
      }
      //}}}
      function onBlur(e) //{{{
      {
        $keymgr.hide();
      }
      //}}}
      function doNudge(e, x, y) //{{{
      {
        if (options.allowMove) {
          Coords.moveOffset([x, y]);
          Selection.updateVisible(true);
        }
        e.preventDefault();
        e.stopPropagation();
      }
      //}}}
      function parseKey(e) //{{{
      {
        if (e.ctrlKey || e.metaKey) {
          return true;
        }
        shift_down = e.shiftKey ? true : false;
        var nudge = shift_down ? 10 : 1;

        switch (e.keyCode) {
        case 37:
          doNudge(e, -nudge, 0);
          break;
        case 39:
          doNudge(e, nudge, 0);
          break;
        case 38:
          doNudge(e, 0, -nudge);
          break;
        case 40:
          doNudge(e, 0, nudge);
          break;
        case 27:
          if (options.allowSelect) Selection.release();
          break;
        case 9:
          return true;
        }

        return false;
      }
      //}}}

      if (options.keySupport) {
        $keymgr.keydown(parseKey).blur(onBlur);
        if (ie6mode || !options.fixedSupport) {
          $keymgr.css({
            position: 'absolute',
            left: '-20px'
          });
          $keywrap.append($keymgr).insertBefore($img);
        } else {
          $keymgr.insertBefore($img);
        }
      }


      return {
        watchKeys: watchKeys
      };
    }());
    //}}}
    // }}}
    // API methods {{{
    function setClass(cname) //{{{
    {
      $div.removeClass().addClass(cssClass('holder')).addClass(cname);
    }
    //}}}
    function animateTo(a, callback) //{{{
    {
      var x1 = a[0] / xscale,
          y1 = a[1] / yscale,
          x2 = a[2] / xscale,
          y2 = a[3] / yscale;

      if (animating) {
        return;
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
          velocity = options.swingSpeed;

      x1 = animat[0];
      y1 = animat[1];
      x2 = animat[2];
      y2 = animat[3];

      Selection.animMode(true);
      var anim_timer;

      function queueAnimator() {
        window.setTimeout(animator, interv);
      }
      var animator = (function () {
        return function () {
          pcent += (100 - pcent) / velocity;

          animat[0] = Math.round(x1 + ((pcent / 100) * ix1));
          animat[1] = Math.round(y1 + ((pcent / 100) * iy1));
          animat[2] = Math.round(x2 + ((pcent / 100) * ix2));
          animat[3] = Math.round(y2 + ((pcent / 100) * iy2));

          if (pcent >= 99.8) {
            pcent = 100;
          }
          if (pcent < 100) {
            setSelectRaw(animat);
            queueAnimator();
          } else {
            Selection.done();
            Selection.animMode(false);
            if (typeof(callback) === 'function') {
              callback.call(api);
            }
          }
        };
      }());
      queueAnimator();
    }
    //}}}
    function setSelect(rect) //{{{
    {
      setSelectRaw([rect[0] / xscale, rect[1] / yscale, rect[2] / xscale, rect[3] / yscale]);
      options.onSelect.call(api, unscale(Coords.getFixed()));
      Selection.enableHandles();
    }
    //}}}
    function setSelectRaw(l) //{{{
    {
      Coords.setPressed([l[0], l[1]]);
      Coords.setCurrent([l[2], l[3]]);
      Selection.update();
    }
    //}}}
    function tellSelect() //{{{
    {
      return unscale(Coords.getFixed());
    }
    //}}}
    function tellScaled() //{{{
    {
      return Coords.getFixed();
    }
    //}}}
    function setOptionsNew(opt) //{{{
    {
      setOptions(opt);
      interfaceUpdate();
    }
    //}}}
    function disableCrop() //{{{
    {
      options.disabled = true;
      Selection.disableHandles();
      Selection.setCursor('default');
      Tracker.setCursor('default');
    }
    //}}}
    function enableCrop() //{{{
    {
      options.disabled = false;
      interfaceUpdate();
    }
    //}}}
    function cancelCrop() //{{{
    {
      Selection.done();
      Tracker.activateHandlers(null, null);
    }
    //}}}
    function destroy() //{{{
    {
      $div.remove();
      $origimg.show();
      $origimg.css('visibility','visible');
      $(obj).removeData('Jcrop');
    }
    //}}}
    function setImage(src, callback) //{{{
    {
      Selection.release();
      disableCrop();
      var img = new Image();
      img.onload = function () {
        var iw = img.width;
        var ih = img.height;
        var bw = options.boxWidth;
        var bh = options.boxHeight;
        $img.width(iw).height(ih);
        $img.attr('src', src);
        $img2.attr('src', src);
        presize($img, bw, bh);
        boundx = $img.width();
        boundy = $img.height();
        $img2.width(boundx).height(boundy);
        $trk.width(boundx + (bound * 2)).height(boundy + (bound * 2));
        $div.width(boundx).height(boundy);
        Shade.resize(boundx,boundy);
        enableCrop();

        if (typeof(callback) === 'function') {
          callback.call(api);
        }
      };
      img.src = src;
    }
    //}}}
    function colorChangeMacro($obj,color,now) {
      var mycolor = color || options.bgColor;
      if (options.bgFade && supportsColorFade() && options.fadeTime && !now) {
        $obj.animate({
          backgroundColor: mycolor
        }, {
          queue: false,
          duration: options.fadeTime
        });
      } else {
        $obj.css('backgroundColor', mycolor);
      }
    }
    function interfaceUpdate(alt) //{{{
    // This method tweaks the interface based on options object.
    // Called when options are changed and at end of initialization.
    {
      if (options.allowResize) {
        if (alt) {
          Selection.enableOnly();
        } else {
          Selection.enableHandles();
        }
      } else {
        Selection.disableHandles();
      }

      Tracker.setCursor(options.allowSelect ? 'crosshair' : 'default');
      Selection.setCursor(options.allowMove ? 'move' : 'default');

      if (options.hasOwnProperty('trueSize')) {
        xscale = options.trueSize[0] / boundx;
        yscale = options.trueSize[1] / boundy;
      }

      if (options.hasOwnProperty('setSelect')) {
        setSelect(options.setSelect);
        Selection.done();
        delete(options.setSelect);
      }

      Shade.refresh();

      if (options.bgColor != bgcolor) {
        colorChangeMacro(
          options.shade? Shade.getShades(): $div,
          options.shade?
            (options.shadeColor || options.bgColor):
            options.bgColor
        );
        bgcolor = options.bgColor;
      }

      if (bgopacity != options.bgOpacity) {
        bgopacity = options.bgOpacity;
        if (options.shade) Shade.refresh();
          else Selection.setBgOpacity(bgopacity);
      }

      xlimit = options.maxSize[0] || 0;
      ylimit = options.maxSize[1] || 0;
      xmin = options.minSize[0] || 0;
      ymin = options.minSize[1] || 0;

      if (options.hasOwnProperty('outerImage')) {
        $img.attr('src', options.outerImage);
        delete(options.outerImage);
      }

      Selection.refresh();
    }
    //}}}
    //}}}

    if (Touch.support) $trk.bind('touchstart.jcrop', Touch.newSelection);

    $hdl_holder.hide();
    interfaceUpdate(true);

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

      getBounds: function () {
        return [boundx * xscale, boundy * yscale];
      },
      getWidgetSize: function () {
        return [boundx, boundy];
      },
      getScaleFactor: function () {
        return [xscale, yscale];
      },
      getOptions: function() {
        // careful: internal values are returned
        return options;
      },

      ui: {
        holder: $div,
        selection: $sel
      }
    };

    if (is_msie) $div.bind('selectstart', function () { return false; });

    $origimg.data('Jcrop', api);
    return api;
  };


  $.fn.Jcrop = function (options, callback) //{{{
  {
    var api;
    // Iterate over each object, attach Jcrop
    this.each(function () {
      // If we've already attached to this object
      if ($(this).data('Jcrop')) {
        // The API can be requested this way (undocumented)
        if (options === 'api') return $(this).data('Jcrop');
        // Otherwise, we just reset the options...
        else $(this).data('Jcrop').setOptions(options);
      }
      // If we haven't been attached, preload and attach
      else {
        if (this.tagName == 'IMG')
          $.Jcrop.Loader(this,function(){
            $(this).css({display:'block',visibility:'hidden'});
            api = $.Jcrop(this, options);
            if ($.isFunction(callback)) callback.call(api);
          });
        else {
          $(this).css({display:'block',visibility:'hidden'});
          api = $.Jcrop(this, options);
          if ($.isFunction(callback)) callback.call(api);
        }
      }
    });

    // Return "this" so the object is chainable (jQuery-style)
    return this;
  };
  //}}}
  // $.Jcrop.Loader - basic image loader {{{

  $.Jcrop.Loader = function(imgobj,success,error){
    var $img = $(imgobj), img = $img[0];

    function completeCheck(){
      if (img.complete) {
        $img.unbind('.jcloader');
        if ($.isFunction(success)) success.call(img);
      }
      else window.setTimeout(completeCheck,50);
    }

    $img
      .bind('load.jcloader',completeCheck)
      .bind('error.jcloader',function(e){
        $img.unbind('.jcloader');
        if ($.isFunction(error)) error.call(img);
      });

    if (img.complete && $.isFunction(success)){
      $img.unbind('.jcloader');
      success.call(img);
    }
  };

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
    createHandles: ['n','s','e','w','nw','ne','se','sw'],
    createDragbars: ['n','s','e','w'],
    createBorders: ['n','s','e','w'],
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
    onChange: function () {},
    onSelect: function () {},
    onDblClick: function () {},
    onRelease: function () {}
  };

  // }}}
}(jQuery));
;
return $;
});

define('$plugin!naturalWidth', ['$'], function ($) {
var jQuery = $;
// jQuery.naturalWidth / jQuery.naturalHeight plugin for (already-loaded) images

// Triple-licensed: Public Domain, MIT and WTFPL license - share and enjoy!

(function($) {
  function img(url) {
    var i = new Image;
    i.src = url;
    return i;
  }

  if ('naturalWidth' in (new Image)) {
    $.fn.naturalWidth  = function() { return this[0].naturalWidth || img($(this).attr("src")).width; };
    $.fn.naturalHeight = function() { return this[0].naturalHeight || img($(this).attr("src")).height; };
    return;
  }

  $.fn.naturalWidth  = function() { return img($(this).attr("src")).width; };
  $.fn.naturalHeight = function() { return img($(this).attr("src")).height; };

})(jQuery);
;
return $;
});

define('$plugin!throttle-debounce', ['$'], function ($) {
var jQuery = $;
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

(function(window,undefined){
  '$:nomunge'; // Used by YUI compressor.

  // Since jQuery really isn't required for this plugin, use `jQuery` as the
  // namespace only if it already exists, otherwise use the `Cowboy` namespace,
  // creating it if necessary.
  var $ = window.jQuery || window.Cowboy || ( window.Cowboy = {} ),

    // Internal method reference.
    jq_throttle;

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

  $.throttle = jq_throttle = function( delay, no_trailing, callback, debounce_mode ) {
    // After wrapper has stopped being called, this timeout ensures that
    // `callback` is executed at the proper times in `throttle` and `end`
    // debounce modes.
    var timeout_id,

      // Keep track of the last time `callback` was executed.
      last_exec = 0;

    // `no_trailing` defaults to falsy.
    if ( typeof no_trailing !== 'boolean' ) {
      debounce_mode = callback;
      callback = no_trailing;
      no_trailing = undefined;
    }

    // The `wrapper` function encapsulates all of the throttling / debouncing
    // functionality and when executed will limit the rate at which `callback`
    // is executed.
    function wrapper() {
      var that = this,
        elapsed = +new Date() - last_exec,
        args = arguments;

      // Execute `callback` and update the `last_exec` timestamp.
      function exec() {
        last_exec = +new Date();
        callback.apply( that, args );
      };

      // If `debounce_mode` is true (at_begin) this is used to clear the flag
      // to allow future `callback` executions.
      function clear() {
        timeout_id = undefined;
      };

      if ( debounce_mode && !timeout_id ) {
        // Since `wrapper` is being called for the first time and
        // `debounce_mode` is true (at_begin), execute `callback`.
        exec();
      }

      // Clear any existing timeout.
      timeout_id && clearTimeout( timeout_id );

      if ( debounce_mode === undefined && elapsed > delay ) {
        // In throttle mode, if `delay` time has been exceeded, execute
        // `callback`.
        exec();

      } else if ( no_trailing !== true ) {
        // In trailing throttle mode, since `delay` time has not been
        // exceeded, schedule `callback` to execute `delay` ms after most
        // recent execution.
        //
        // If `debounce_mode` is true (at_begin), schedule `clear` to execute
        // after `delay` ms.
        //
        // If `debounce_mode` is false (at end), schedule `callback` to
        // execute after `delay` ms.
        timeout_id = setTimeout( debounce_mode ? clear : exec, debounce_mode === undefined ? delay - elapsed : delay );
      }
    };

    // Set the guid of `wrapper` function to the same of original callback, so
    // it can be removed in jQuery 1.4+ .unbind or .die by using the original
    // callback as a reference.
    if ( $.guid ) {
      wrapper.guid = callback.guid = callback.guid || $.guid++;
    }

    // Return the wrapper function.
    return wrapper;
  };

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

  $.debounce = function( delay, at_begin, callback ) {
    return callback === undefined
      ? jq_throttle( delay, at_begin, false )
      : jq_throttle( delay, callback, at_begin !== false );
  };

})(this);
;
return $;
});

define('$plugin!imagesloaded', ['$'], function ($) {
var jQuery = $;
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
var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

$.fn.imagesLoaded = function( callback ) {
	var $this = this,
		deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
		hasNotify = $.isFunction(deferred.notify),
		$images = $this.find('img').add( $this.filter('img') ),
		loaded = [],
		proper = [],
		broken = [];

	// Register deferred callbacks
	if ($.isPlainObject(callback)) {
		$.each(callback, function (key, value) {
			if (key === 'callback') {
				callback = value;
			} else if (deferred) {
				deferred[key](value);
			}
		});
	}

	function doneLoading() {
		var $proper = $(proper),
			$broken = $(broken);

		if ( deferred ) {
			if ( broken.length ) {
				deferred.reject( $images, $proper, $broken );
			} else {
				deferred.resolve( $images );
			}
		}

		if ( $.isFunction( callback ) ) {
			callback.call( $this, $images, $proper, $broken );
		}
	}

	function imgLoaded( img, isBroken ) {
		// don't proceed if BLANK image, or image is already loaded
		if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
			return;
		}

		// store element in loaded images array
		loaded.push( img );

		// keep track of broken and properly loaded images
		if ( isBroken ) {
			broken.push( img );
		} else {
			proper.push( img );
		}

		// cache image and its state for future calls
		$.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );

		// trigger deferred progress method if present
		if ( hasNotify ) {
			deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
		}

		// call doneLoading and clean listeners if all images are loaded
		if ( $images.length === loaded.length ){
			setTimeout( doneLoading );
			$images.unbind( '.imagesLoaded' );
		}
	}

	// if no images, trigger immediately
	if ( !$images.length ) {
		doneLoading();
	} else {
		$images.bind( 'load.imagesLoaded error.imagesLoaded', function( event ){
			// trigger imgLoaded
			imgLoaded( event.target, event.type === 'error' );
		}).each( function( i, el ) {
			var src = el.src;

			// find out if this image has been already checked for status
			// if it was, and src has not changed, call imgLoaded on it
			var cached = $.data( el, 'imagesLoaded' );
			if ( cached && cached.src === src ) {
				imgLoaded( el, cached.isBroken );
				return;
			}

			// if complete is true and browser supports natural sizes, try
			// to check for image status manually
			if ( el.complete && el.naturalWidth !== undefined ) {
				imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
				return;
			}

			// cached images don't fire load sometimes, so we reset src, but only when
			// dealing with IE, or image is complete (loaded) and failed manual check
			// webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
			if ( el.readyState || el.complete ) {
				el.src = BLANK;
				el.src = src;
			}
		});
	}

	return deferred ? deferred.promise( $this ) : $this;
};

})(jQuery);
;
return $;
});

/**
 *		`new CropImage($el, options, coordinates)`
 *
 *		$el // the <.jcrop> container
 *		options // {} to override default jcrop options
 *			aspectRatio : auto  //   automatically sets aspectRatio to default rectangle
 *		coordinates // {} to override default first time coordinates // note self <inputs> for coords override all else
 */

define(
	'admin/modules/CropImage',[
		"rosy/base/DOMClass",
		"$",
		"$plugin!jcrop",
		"$plugin!naturalWidth",
		"$plugin!throttle-debounce",
		"$plugin!imagesloaded"
	],
	function (DOMClass, $, $jcrop, $naturalWidth, $throttle, $imagesLoaded) {

		

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
						onSelect : $.proxy(this.updatePreview, this),
						onChange : $.proxy(this.updatePreview, this),
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

			updatePreview : function (coords) {
				clearTimeout(this.refreshTimeout);

				if (parseInt(coords.w, 10) < 0) {
					return;
				}

				this.cropCoords = coords;

				var scale = this.getScale(),
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
			}
		});
	}
);

define(

	'admin/modules/AutoSlug',[
		"rosy/base/DOMClass",
		"$"
	],

	function (DOMClass, $) {

		

		return DOMClass.extend({

			dom : null,
			origin : null,

			init : function (dom) {
				this.dom = dom;
				this.origin = dom.parents('fieldset').find('[name=' + dom.data('source-fields') + ']');

				if (this.isValueMatch()) {
					this.addListeners();
				}
			},

			getOriginValue : function () {
				return this.origin.val().replace(/\s+/g, '-').toLowerCase();
			},

			isValueMatch : function () {
				var currVal = this.getOriginValue();

				// if values are different, disable matching
				if (currVal !== this.dom.val()) {
					this.origin.addClass("disable-match");

					return false;
				}

				return true;
			},

			addListeners : function () {
				this.dom.on("keyup", this.disableSync);
				this.origin.not(".disable-match").on("keyup", this.syncValue);
			},

			syncValue : function () {
				var currVal = this.getOriginValue();
				this.dom.val(currVal);
			},

			disableSync : function () {
				if (!this.isValueMatch()) {
					this.origin.addClass("disable-match").add(this.dom).off("keyup");
				}
			}
		});
	}
);

define(
	'admin/modules/Widgets',['require','exports','module','rosy/base/DOMClass','$','$plugin!select2','$plugin!pickadate','$plugin!details','./AssetSelect','./ApiSelect','./Formset','./Tabs','./InsertVideo','./InsertImage','./wysiwyg/Wysiwyg','./WidgetEvents','./WindowPopup','./OnExit','./InlineVideo','./FilterBar','./CropImage','./AutoSlug'],function (require, exports, module) {

		

		var DOMClass             = require("rosy/base/DOMClass"),
			$                    = require("$"),
			jQuerySelect2        = require("$plugin!select2"),
			jQueryPickadate      = require("$plugin!pickadate"),
			jQueryDetails        = require("$plugin!details"),
			AssetSelect          = require("./AssetSelect"),
			ApiSelect            = require("./ApiSelect"),
			Formset              = require("./Formset"),
			Tabs                 = require("./Tabs"),
			InsertVideo          = require("./InsertVideo"),
			InsertImage          = require("./InsertImage"),
			Wysiwyg              = require("./wysiwyg/Wysiwyg"),
			WidgetEvents         = require("./WidgetEvents"),
			WindowPopup          = require("./WindowPopup"),
			OnExit               = require("./OnExit"),
			InlineVideo          = require("./InlineVideo"),
			FilterBar            = require("./FilterBar"),
			CropImage            = require("./CropImage"),
			AutoSlug             = require("./AutoSlug");

		return DOMClass.extend({

			init : function (dom) {
				this.subscribe(WidgetEvents.RENDER, this._render);
			},

			_render : function (n) {
				var dom = $(n.data.dom);

				this._renderSelect(dom);
				this._renderAssetSelect(dom);
				this._renderFormset(dom);
				this._renderApiSelect(dom);
				this._renderDatePicker(dom);
				this._renderWysiwig(dom);
				this._renderTabs(dom);
				this._renderInsertVideo(dom);
				this._renderInsertImage(dom);
				this._renderInlineVideo(dom);
				this._renderFilterBar(dom);
				this._renderjQueryCrop(dom);
				this._renderDragWidth(dom);

				this._autoSlug(dom);

				this._handlePopup(dom);
			},

			_renderWysiwig : function (dom) {
				dom.find('.widget-wysiwyg').each(function (i, textarea) {
					var wysiwyg = new Wysiwyg($(textarea));
				});
			},

			_renderDatePicker : function (dom) {
				dom.find("[data-date-format]").each(function (i, el) {
					el = $(el);
					el.attr('placeholder', el.data('date-format').toUpperCase());
					if (!Modernizr.inputtypes.date) { // Use plugin if browser lacks native support for input type="date"
						el.pickadate({
							format: 'yyyy-mm-dd',
							format_submit: false,
							month_prev: 'w',
							month_next: 'e',
						});
					}
				});
			},

			_renderSelect : function (dom) {
				dom.find("select").select2({
					minimumResultsForSearch : 20
				});

				dom.find(".widget-tags").select2({
					tags: [],
					tokenSeparators : [',']
				});
			},

			_renderFilterBar : function (dom) {
				var filterBarDom = dom.find(".filters");
				var filterBar = new FilterBar(filterBarDom);
			},

			_renderAssetSelect : function (dom) {
				dom.find(".widget-asset").each(function (i, dom) {
					var picker = new AssetSelect($(dom));
				});
			},

			_renderFormset : function (dom) {
				dom.find(".widget-formset").each(function (i, dom) {
					var formset = new Formset($(dom));
				});
			},

			_renderApiSelect : function (dom) {
				dom.find(".api-select").each(function (i, dom) {
					var select = new ApiSelect($(dom));
				});
			},

			_autoSlug : function () {
				$("[data-source-fields]").each(function (i, dom) {
					var autoSlug = new AutoSlug($(dom));
				});
			},

			_handlePopup : function (dom) {
				if (!window.opener) {
					return;
				}

				dom.find('.close-popup').click(function (i, dom) {
					window.close();
				});

				dom.find('.widget-popup-data').each(function (i, dom) {
					WindowPopup.respond($(dom).data());
				});
			},

			_renderTabs : function (dom) {
				dom.find(".widget-tabs").each(function (i, el) {
					var tabs = new Tabs($(el));
				});
			},

			_renderInsertVideo : function (dom) {
				dom.find(".widget-insert-video").each(function (i, el) {
					var insertVideo = new InsertVideo({
						$dom : $(el)
					});
				});
			},

			_renderInsertImage : function (dom) {
				dom.find(".widget-insert-image").each(function (i, el) {
					var insertImage = new InsertImage({
						$dom : $(el)
					});
				});
			},

			_renderInlineVideo : function (dom) {
				dom.find(".widget-inline-video").each(function (i, el) {
					var vid = new InlineVideo({
						$dom : $(el)
					});
				});
			},

			_renderjQueryCrop : function (dom) {
				dom.find(".jcrop").each(function (i, el) {
					var cropImage = new CropImage($(el), {
						aspectRatio : 'auto'
					}, {

					}); // options, coordinates, extra
					// this.content = new ContentClass(this.$content, options, this.$content.data(), extra);
				});
			},

			_renderDragWidth : function (dom) {
				// maintain draggable td:last-child width on drag
				dom.find("[draggable]")
				.on("mousedown", function (i, el) {
					var $el = $(this).find("td:last-child");
					$el.css('width', $el.outerWidth());
				})
				.on("mouseup", function (i, el) {
					$(this).find("td:last-child").css('width', 'auto');
				});
			}
		});
	}
);

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
 define ('detailsShim',[], function () {

		function details_shim() {
		    //Because <details> must include a <summary>,
		    // collecting <summary> tags collects *valid* <details> tags
		    var Summaries = document.getElementsByTagName('summary');
		    for (var i = 0; i < Summaries.length; i++) {
		        if (!Summaries[i].parentNode
		            //sanity check, parent node should be a <details> tag
		            || 'details' != Summaries[i].parentNode.tagName.toLowerCase()
		            //only run in browsers that don't support <details> natively
		            || 'boolean' == typeof Summaries[i].parentNode.open
		        ) {
		            continue;
		        }

		        var Details = Summaries[i].parentNode;

		        // Prevent repeat processing
		        if (Details.hasAttribute('data-open')) {
		            continue;
		        }

		        //Set initial class according to `open` attribute
		        var state = Details.outerHTML
		            // OR older firefox doesn't have .outerHTML
		            || new XMLSerializer().serializeToString(Details);
		        state = state.substring(0, state.indexOf('>'));
		        //Read: There is an open attribute, and it's not explicitly empty
		        state = (-1 != state.indexOf('open') && -1 == state.indexOf('open=""'))
		            ? 'open'
		            : 'closed'
		            ;
		        Details.setAttribute('data-open', state);
		        Details.className += ' ' + state;

		        //Add onclick handler to toggle visibility class
		        Summaries[i].addEventListener('click', function () {
		            //current state
		            var state = this.parentNode.getAttribute('data-open');
		            //new state
		            state = state == 'open' ? 'closed' : 'open';
		            this.parentNode.setAttribute('data-open', state);
		            //replace previous open/close class
		            this.parentNode.className = this.parentNode.className
		                .replace(/\bopen\b|\bclosed\b/g, ' ') + ' ' + state;
		        });

		        //wrap text nodes in span to expose them to css
		        for (var j = 0; j < Details.childNodes.length; j++) {
		            if (Details.childNodes[j].nodeType == 3
		                && /[^\s]/.test(Details.childNodes[j].data)
		            ) {
		                var span = document.createElement('span');
		                var text = Details.childNodes[j];
		                Details.insertBefore(span, text);
		                Details.removeChild(text);
		                span.appendChild(text);
		            }
		        }
		    } // for(Summaries)
		} // details_shim()

		//Run details_shim() when the page loads
		details_shim();
		/*window.addEventListener
		    ? window.addEventListener('load', details_shim, false)
		    : window.attachEvent && window.attachEvent('onload', details_shim);*/
	});
define(

	'admin/views/Admin',[
		"./Page",
		"$",
		"$plugin!select2",
		"../modules/Widgets",
		"../modules/WidgetEvents",
		"detailsShim"
	],

	function (Page, $, jQuerySelect2, Widgets, WidgetEvents, detailsShim) {

		

		return Page.extend({

			widgets : null,

			init : function () {
				this.sup();

				this.tableDnD();

				// widgets
				this.widgets = new Widgets();
				this.publish(WidgetEvents.RENDER, {
					dom : document
				});

				this.transitionIn();
			},

			tableDnD : function () {
				$("table").each(function () {
					var draggable = $(this).find("tr[draggable]").parents("tbody");

					draggable.sortable({
						stop: function (e, ui) {
							var inputs = $(ui.item.context.offsetParent).find(":text");

							for (var i = 0; i < inputs.length; i++) {
								inputs[i].value = i + 1;
							}
						}
					});
				});
			},

			update : function () {

			},

			transitionIn : function () {
				this.sup();
			},

			transitionOut : function () {
				this.sup();
			},

			destroy : function () {
				this.sup();
			}
		});
	}
);

define(

	'admin/Site',[
		"rosy/base/Class",
		"$plugin!ui",
		"./views/Admin"
	],

	function (Class, $ui, Admin) {

		

		var Site = Class.extend({

			initialized : false,
			page : null,

			initialize : function () {

				if (!this.initialized) {
					this.initialized = true;

					// create Admin page.
					this.page = new Admin();
				}
			}

		});

		return new Site();
	}
);

require.config({

	paths : {
		"$" : "//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min",
		"$plugin" : "libs/plugins/amd/jquery-plugin",
		"wysihtml5" : "libs/wysihtml5",
		"text" : "libs/plugins/amd/text",
		"rosy" : "libs/rosy/src",
		"detailsShim" : "libs/details-shim"
	},

	waitSeconds : 15,

	shim : {
		"$" : {
			exports : "jQuery"
		},

		"zynga/Scroller" : {
			exports : "Scroller",
			deps : ["zynga/Animate"]
		},

		"wysihtml5" : {
			exports : "wysihtml5"
		},

		"CFInstall" : {
			exports : "CFInstall"
		},

		"Handlebars" : {
			exports : "Handlebars"
		}
	}
});

define("config.js", function(){});
