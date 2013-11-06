define(
	[
		"rosy/base/DOMClass",
		"$"
	],
	function (DOMClass, $) {

		"use strict";

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