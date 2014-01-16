define(

	[
		"rosy/base/Class",
		"./views/Admin"
	],

	function (Class, Admin) {

		"use strict";

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
