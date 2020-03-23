
.. toctree::

===================
CMS Documentation
===================

Overview
========

Scarlet is a content administration interface that is based around class based views instead of models, making it easier to implement work flows and other customizations, while keeping the short ramp-up time that django admin provides. Rewriting django admin is a lot of work and some functionality that it provides will be missing for quite some time. But hopefully the added flexibility that this gives us will be worth it.

Bundles
-------------

The key building block is a :py:class:`Bundle <scarlet.cms.bundles.Bundle>`. A bundle is a class that is meant to group together :py:class:`CMSView <scarlet.cms.views.CMSView>` instances and other bundle classes. It contains some methods to help the views know where to find each other, keep track of their url parameters and provide page navigation and headers.

These views and sub bundles are specified as class attributes when creating a new Bundle class. For example:

::

    class ExampleBundle(Bundle):
        extra = ExampleView()
        sub = ExampleSubBundle.as_subbundle(name='sub', title='Example Sub')


Bundles are stored in a file named cms_bundles.py in your application.

Each bundle contains an optional :py:class:`Meta <scarlet.cms.options.Meta>` class stored at _meta. This class allows you configure behaviour for the bundle as well as pass arguments to all or specific views within the bundle. See the :py:class:`Meta <scarlet.cms.options.Meta>` documentation for details.

Each bundle ensures that each view it contains has a unique url name. Since these names are not always obvious and can get rather long it is impractical to refer to views by name. Instead you can get the url for a related view by using the :py:meth:`get_view_url <scarlet.cms.bundles.Bundle.get_view_url>` method. This will also make sure the requesting user has the necessary permissions to view the requested url. There is a template tag :py:func:`bundle_url <scarlet.cms.templatetags.cms.bundle_url>` that can be used to call this method.

Similarly each named url parameter must be unique to avoid conflicts. Bundles keep track of the names of the url groups that are used to get to it in its url_params property. Views or subbundles that need additional url parameters are refered to as item views and should be added to the `item_views` sequence on the bundles :py:class:`Meta <scarlet.cms.options.Meta>` class. See the :py:class:`Meta <scarlet.cms.options.Meta>` class documents for details on how to control that regular expression.

You can also use :py:class:`URLAlias <scarlet.cms.bundles.URLAlias>` to specify that a attribute should point to a different view on the same bundle or on a different bundle.

Bundles can also render their views as a string instead of as a response. The logic works much the same as getting a url. Unlike the normal dispatch method, this will always call the `get` method of a view and never a `post` or any of the other attributes as any actions that modify data should take place on the original url and not when being rendered this way. Methods that vary their behavior on `request.method` checks shoud also include a `self.can_submit` if they can be called by multiple http request methods.  There is a template tag :py:func:`bundle_view <scarlet.cms.templatetags.cms.bundle_view>` that can be used to call this method.

.. _default_bundles_class:

Default bundle classes
~~~~~~~~~~~~~~~~~~~~~~

The default :py:class:`Bundle <scarlet.cms.bundles.Bundle>` class has four views:

 * **main** - a :py:class:`ListView <scarlet.cms.views.ListView>`
 * **add** - a :py:class:`FormView <scarlet.cms.views.FormView>`
 * **edit** - a :py:class:`FormView <scarlet.cms.views.FormView>`.
 * **delete** - a :py:class:`ListView <scarlet.cms.views.DeleteView>`

The items views are 'edit' and 'delete'.

.. _other_bundles:

Other Bundles
~~~~~~~~~~~~~

* :py:class:`BlankBundle <scarlet.cms.bundles.BlankBundle>` is a bundle that does not declare any views. You can use it to add all your views manually.
* :py:class:`VersionedBundle <scarlet.cms.bundles.VersionedBundle>` adds the following item views for managing versioned models:
     * **publish** - a :py:class:`PublishView <scarlet.cms.views.PublishView>`
     * **versions** - a :py:class:`UnPublishView <scarlet.cms.views.UnPublishView>`
     * **unpublish** - a :py:class:`VersionsList <scarlet.cms.views.VersionsList>`.
* :py:class:`DelegatedObjectBundle <scarlet.cms.bundles.DelegatedObjectBundle>`. This bundle delegates all the normal item views to the sub bundle specified by edit. Used when your 'edit' view is a :py:class:`ObjectOnlyBundle <scarlet.cms.bundles.ObjectOnlyBundle>` sub bundle.
* :py:class:`ObjectOnlyBundle <scarlet.cms.bundles.ObjectOnlyBundle>`. A bundle that doesn't have a list or add views. Points the 'main_list' attribute to it's parent bundle.
* :py:class:`VersionedObjectOnlyBundle <scarlet.cms.bundles.VersionedObjectOnlyBundle>`. Same as ObjectOnlyBundle but adds version management views.
* :py:class:`ChildBundle <scarlet.cms.bundles.ChildBundle>`. Default setup for child bundles, without delegating the rendering of the page header to it's parent.
* :py:class:`ParentVersionedBundle <scarlet.cms.bundles.ParentVersionedBundle>`. Like child bundle except it delegates rendering of the page header to it's parent.

.. _cms_views:

Views
-----

All views that are included in bundles should inhert from :py:class:`CMSView <scarlet.cms.views.CMSView>`. These views use render classes to render their responses. Most use :py:class:`CMSRender <scarlet.cms.renders.CMSRender>`. A view is made aware of the bundle and the slug_url_kwarg attributes as calculated by the bundle.

There a few default classes included that extend django's generic views to perform common tasks.

* :py:class:`FormView <scarlet.cms.views.FormView>`
* :py:class:`ListView <scarlet.cms.views.ListView>`
* :py:class:`DeleteView <scarlet.cms.actions.DeleteActionView>`
* :py:class:`ActionView <scarlet.cms.actions.ActionView>`

:py:class:`ActionView <scarlet.cms.actions.ActionView>` is meant as a base class for defining actions that can be taken on one or many objects in a bundle. They must be registered with the bundle, but which actions are shown can be specified within an individual :py:class:`ListView <scarlet.cms.views.ListView>`. If there are any actions registered with the bundle, any :py:class:`ListView <scarlet.cms.views.ListView>` will be rendered with checkboxes and a drop-down of available actions to take. In addition, actions can be executed as an `item_view`. If an action is meant only as a single-item action with extra url keyword argument, it should be added to the `item_view` sequence in the bundle :py:class:`Meta <scarlet.cms.options.Meta>` class instead of `action_view`.

There are also of default views particular to versioned models.

* :py:class:`PublishView <scarlet.cms.actions.PublishActionView>`
* :py:class:`UnPublishView <scarlet.cms.actions.UnPublishActionView>`
* :py:class:`VersionsList <scarlet.cms.views.VersionsList>`

Base Templates
~~~~~~~~~~~~~~

The cms site is structured with the following main components:

 * **Site navigation** - This is the main navigation for the site. This is defined by the :py:meth:`get_dashboard_urls <scarlet.cms.bundles.Bundle.get_dashboard_urls>` of the registered bundles.
 * **Local navigation** - This is defined by the navigation and dashboard attributes of the current view. See :py:meth:`get_navigation <scarlet.cms.bundles.Bundle.get_navigation>` for details.
 * **Page header** - This is the title block on every page. The content that gets rendering is controlled by the :py:meth:`get_object_header_view <scarlet.cms.bundles.Bundle.get_object_header_view>` method of the bundle.
 * **Page content** - This is the main content of the view.

This structure is set the following two templates:

 * *base.html* - Main base template, most others inherit from this one.
 * *base_site.html* - This template should be customized with any specific site branding you need.

:py:class:`CMSView <scarlet.cms.views.CMSView>` classes can set a `base_template` attribute to set the base template used for that view. Typically this would be one of:

 * *base_bundle_view.html* - The base template for views that include site headers and navigation.
 * *base_include_list.html* - Renders the related main list after the main content. Used as the base template for some add/edit forms.

These templates are used by certain renders in special cases:

 * *base_popup.html* - The base template for views that are rendered as a popup. Removes object header and navigation markup.
 * *partial.html* - Base template for views when they are rendered as a string. Does not inherit from other templates.

The template to use for the object_header is specified by a `object_header_tmpl` on attribute on the view. Typically this would be one of:

 * *object_header.html* - Default template for object headers. Show object title, or bundle title with a back button. Includes an object tools block that adds any versioning and preview actions that are available.
 * *object_header_bare.html* - Removes all the object tools from the object header.
 * *object_header_no_preview.html* - Removes the preview link from an object header.
 * *object_header_stand_alone.html* - Object header without a back button.

The `default_template` attribute of each view only renders its page content and the other pieces are optionally added depending on the base template. These are the default templates of the various default views:

 * *delete.html* - Confirmation template for deletes.
 * *edit.html* - Add/Edit form template.
 * *list.html* - Object list template.
 * *popup_redirect.html* - Rendered in place of a redirect by the popup render. Contains javascript to close the popup and pass back it's value.
 * *preview.html* - Base template for custom previews. Doesn't inherit from the base CMS templates should include the needed scripts and stylesheets for what is being previewed.
 * *publish.html* - Publish form template
 * *unpublish.html* - Unpublish confirmation template
 * *versions.html* - Manage versions template

Previewing
~~~~~~~~~~

Preview links are added to the object lists and the object header for objects that either:

    1. Are rendered by a bundle with a preview view.
    2. The object has a `get_absolute_url` value.

A custom preview view is useful for when you only want to preview part of what will be a full page. When providing a custom preview view you should use :py:class:`PreviewWrapper <scarlet.cms.views.PreviewWrapper>` passing it a :py:class:`SiteView <scarlet.cms.views.SiteView>` view it can render as a string. For example:

::

    views.PreviewWrapper(preview_view=PostView)

The url arguments passed are calculated by the  The :py:meth:`get_preview_kwargs <scarlet.cms.views.PreviewWrapper.get_preview_kwargs>` method.

Fields and Widgets
~~~~~~~~~~~~~~~~~~

The CMS provides some default fields and widgets.

 * :py:class:`OrderField <scarlet.cms.fields.OrderField>` - A PositiveIntegerField that set's itself to be the default ordering field of any model it is added to. When used with a bundle that uses :py:class:`Orderable <scarlet.cms.options.Orderable>` in it's meta class, pagination is disabled and the rows can be reordered with a drag and drop interface.
 * :py:class:`HTMLTextField <scarlet.cms.fields.HTMLTextField>` - A text field that will be rendered in the CMS as a WYSIWYG field.
 * :py:class:`DateWidget <scarlet.cms.widgets.DateWidget>`, :py:class:`TimeChoiceWidget <scarlet.cms.widgets.TimeChoiceWidget>` and :py:class:`SplitDateTime <scarlet.cms.widgets.SplitDateTime>` are used as the field widgets for DateFields, TimeFields and DateTimeFields respectively.
 * When a form contains ForeignKey or ModelChoiceField field, if a bundle for the related model has been registered as a 'primary_model_bundle', a :py:class:`APIChoiceWidget <scarlet.cms.widgets.APIChoiceWidget>` or :py:class:`APIModelChoiceWidget <scarlet.cms.widgets.APIModelChoiceWidget>`. This provides a paginated searchable drop down using :py:class:`ChoicesRender <scarlet.cms.renders.ChoicesRender>` and a popup add link using :py:class:`PopupRender <scarlet.cms.renders.PopupRender>`.


Admin Site
----------

:py:class:`AdminSite <scarlet.cms.sites.AdminSite>` is very similar to the django admin site class. The main difference is that bundles are registered with a slug instead of by model. Slugs must be unique. The default site also includes a dashboard the contents of which are gathered from registered bundles. It also displays the change log.

You register a bundle like this:

::

    from scarlet.cms import site
    site.register(slug, bundle_instance, order)


To add the cms to your add lines like this to your urls.py

::

    cms.autodiscover()
    urlpatterns = patterns('',
        (r'^admin/', include(cms.site.urls)),


Code Documentation
==================

.. toctree::

    reference
