define(

	[
		"rosy/base/Class",
		"rosy/views/ViewManager",
		"./config/routes",
		"$plugin!ui",
		"./views/Page"
	],

	function (Class, ViewManager, routes, Page) {

		"use strict";

		var Site = Class.extend({

			initialized : false,

			initialize : function () {

				if (!this.initialized) {

					ViewManager.initialize({
						// fallbackMode			:	hard|soft|hash,
						selectors			:	[],
						// bubble				:	true|false,
						// container			:	String|DOMElement,
						defaultRoute			:	location.pathname + location.search,
						// activeClass			:	String,
						// disabledClass		:	String,
						// TransitionManager	:	Class,
						aliases : routes.aliases,
						// selectors : ["[data-route]", "a[href^='/']"],
						viewGroups : routes.viewGroups
					});

					this.initialized = true;
				}
			}

		});

		return new Site();
	}
);
