import re
from functools import update_wrapper
import random

try:
    from django.conf.urls import include, patterns, url
except ImportError:
    from django.conf.urls.defaults import include, patterns, url
from django.core.urlresolvers import reverse
from django.utils.safestring import mark_safe
from django import http
from django.utils.decorators import classonlymethod
from django.core.exceptions import ImproperlyConfigured

from . import views
from . import options
from . import helpers
from . import actions
from .item import VersionsList

# Constant that defines a attribute points to it's parent
PARENT = 'parent'
ACTION_ALIAS = '_action'

def create_new_viewclass(base, **kwargs):
    #Create a new view class based on a view instance
    data = {}
    kwargs.update(getattr(base, 'changed_kwargs', {}))

    for k, v in kwargs.items():
        if hasattr(base, k):
            data[k] = v

    if isinstance(base, views.CMSView):
        name = "%s%s%s" % (base.__class__.__name__,
                         hex(id(base)),random.random())
        parent = base.__class__
    else:
        name = base.__name__ + "Sub"
        parent = base

    return type(name, (parent,), data)


class PromiseBundle(object):

    def __init__(self, cls, name=None, title=None, title_plural=None):
        assert name
        self.name = name
        self.title = title
        self.title_plural = title_plural
        self.cls = cls
        self.initialized = None

    def __call__(self, child_name, parent, site):
            return self.cls(name=self.name,
                            title=self.title,
                            title_plural=self.title_plural,
                            parent=parent,
                            attr_on_parent=child_name,
                            site=site)

    @staticmethod
    def hidden_name(name):
        return "_%s_promise" % name

class URLAlias(object):
    """
    Alias urls to some other view or bundle. Aliases
    created in this way will not be added to the actual
    urls in the cms site. But when a url is requested
    for an attribute on a bundle that points to a URLAlias
    instance, whether that happens through a template tag
    or one of bundles view getter methods, the url or view
    returned will be the one for the aliased name/bundle.

    :param bundle_attr: The name of the bundle that this alias \
    points to. None means the current bundle, using the `PARENT` \
    constant means the view name will be looked up on the \
    parent bundle. Defaults to None.
    :param alias_to: The name of the view that you want this \
    to point to instead. Defaults to None.
    """

    def __init__(self, bundle_attr=None, alias_to=None):
        self.bundle_attr = bundle_attr
        self.alias_to = alias_to

    def get_bundle(self, current_bundle, url_kwargs, context_kwargs):
        """
        Returns the bundle to get the alias view from.
        If 'self.bundle_attr' is set, that bundle that it points to
        will be returned, otherwise the current_bundle will be
        returned.
        """
        if self.bundle_attr:
            if self.bundle_attr == PARENT:
                return current_bundle.parent

            view, name = current_bundle.get_view_and_name(self.bundle_attr)
            return view

        return current_bundle

    def get_view_name(self, requested):
        """
        Returns the name of the view to lookup.
        If `requested` is equal to 'self.bundle_attr' then
        'main' will be returned. Otherwise if `self.alias_to`
        is set the it's value will be returned. Otherwise
        the `requested` itself will be returned.

        """
        value = self.alias_to and self.alias_to or requested
        if value == self.bundle_attr:
            return 'main'
        return value

class ViewAlias(URLAlias):
    """
    Works the same as URLAlias accept it allows
    you to reuse a view registered somewhere
    else as at different url on this bundle.
    """
    pass

class BundleMeta(type):
    """
    Metaclass for bundle that gathers the known views,
    subbundles and meta options from all the parent classes.
    """

    def __new__(cls, name, bases, attrs):
        meta = options.Meta()

        _children = set()
        _views = set()

        # Copy views from bases along with meta
        for base in bases[::-1]:
            val = getattr(base, '_views', None)
            if val and type(val) == tuple:
                _views = _views.union(set(base._views))

            val = getattr(base, '_children', None)
            if val and type(val) == tuple:
                _children = _children.union(set(base._children))

            if hasattr(base, '_meta'):
                meta.add_meta(base._meta)

        m = attrs.pop('Meta', None)
        meta.add_meta(m)
        for k, v in attrs.items():
            if isinstance(v, PromiseBundle):
                _children.add(k)
                _views.add(k)
                attrs[v.hidden_name(k)] = v
            elif isinstance(v, views.CMSView):
                _views.add(k)
            elif isinstance(v, ViewAlias):
                _views.add(k)

        for v in _children:
            attrs.pop(v, None)

        attrs['_children'] = tuple(_children)
        attrs['_views'] = tuple(_views)
        attrs['_meta'] = meta
        cls = super(BundleMeta, cls).__new__(cls, name, bases, attrs)
        return cls


class Bundle(object):
    """
    Base bundle class. A bundle is a class that is meant to group together
    CMSViews and other bundle classes. It contains some methods to
    help the views know where to find each other, keep track of their
    url parameters and provide page navigation and headers.
    Views and sub bundles are specified as class attributes when
    creating a new Bundle class.

    Each bundle class has a options class stored at _meta. When one bundle
    inherits from another the meta class attributes are copied from all
    base classes, with the normal resolution rules applying. The exception
    is attributes containing a dictionary. In that case a copy of the
    dictionary from the further ancestor will be made and then updated
    with the dictionary from the closer. The resulting new dictionary
    is stored as the value for that attribute.

    Any time you set the value of a class attribute to the constant
    `PARENT` (also available on bundle instances as `self.parent_attr`)
    you are saying that attribute should be looked up on the parent object.
    This works for view attributes and some non view attributes like
    `navigation` and `object_header`.

    :param navigation: A list of tuples that represent the side navigation \
    items for this bundle. The format is (attribute_name, title, url_kwargs). \
    Title and url_kwargs are optional. If no title is given the title of the bundle
    that the view is on will be used. Default is an empty tuple.
    :param dashboard: A list of the tuples that represent the main navigation.\
    format is the same as `navigation`. Default is an empty tuple.
    :param required_groups: A list of groups names that a visitor must \
    be a member of to access views in this bundle. Default is an empty tuple.
    :param live_groups: A list of groups names that a visitor must \
    be a member of to access the 'live_views` in this bundle. Default is None \
    which means same as `required_groups`.
    :param object_view: The name of the view that should be rendered as \
    the object header. Defaults to 'delete'.
    :param main_list: A URLAlias for 'main' used by main views as their \
    default redirect target.

    By default the following views are created:

    * **main** - ListView
    * **add*** - FormView
    * **edit** - FormView
    * **delete** - DeleteActionView
    """

    __metaclass__ = BundleMeta

    parent_attr = PARENT
    action_alias = ACTION_ALIAS

    navigation = ()
    dashboard = ()

    required_groups = ()
    live_groups = None

    _children = ()
    _views = ()

    main = views.ListView()
    add = views.FormView(force_add=True)
    edit = views.FormView()
    delete = actions.DeleteActionView()

    main_list = URLAlias(alias_to="main")

    object_view = "delete"

    def __init__(self, title=None, title_plural=None, name=None,
                    parent=None, attr_on_parent=None, site=None):
        assert name

        self.name = name
        self.title = title
        self.title_plural=title_plural
        self.admin_site = site
        self._url_params = ()
        self.attr_on_parent = attr_on_parent

        self.parent = parent
        if self.parent:
            self.name = "%s_%s" % (self.parent.name, self.name)
            reg = r'^%s' % parent.get_regex_for_name(self.name, attr_on_parent)
            url_params = re.compile(reg).groupindex.keys()
            l = list(parent.url_params)
            l.extend(url_params)
            self._url_params = tuple(l)

            if self.required_groups == self.parent_attr:
                self.required_groups = self.parent.required_groups

        self.item_regex = self._meta.item_regex_base % {'name': self.name}

        # Only process defaults if we have a model
        if self._meta.model:
            if site and self._meta.primary_model_bundle:
                site.register_model(self._meta.model, self)

        added_views = []
        action_views = set(self._meta.action_views)
        for view in self._views:
            v = getattr(self, view, None)

            if v and isinstance(v, views.CMSView):
                view_kwargs = self._meta.get_kwargs_for_view(view)

                if self.live_groups and view in self._meta.live_views:
                    view_kwargs['required_groups'] = list(self.live_groups)

                setattr(self, view, create_new_viewclass(v,
                                        **view_kwargs))

                # Create aliases for action views
                if view in action_views:
                    view_name = '{0}{1}'.format(view, ACTION_ALIAS)
                    if not hasattr(self, view_name):
                        setattr(self, view_name, ViewAlias(alias_to=view))
                        added_views.append(view_name)

        if added_views:
            self._views = tuple(list(self._views)+added_views)

    def set_admin_site(self, site):
        self.admin_site = site

        if site and self._meta.primary_model_bundle:
            site.register_model(self._meta.model, self)

    def _get_url_params(self):
        return self._url_params
    url_params = property(_get_url_params)

    def get_object_header_view(self, request, url_kwargs, parent_only=False,
                                render_type='object_header'):
        """
        An object header is the title block of a CMS page. Actions
        to linked to in the header are based on this views
        bundle.

        This returns a view instance and view name of the view that
        should be rendered as an object header the view used is specified
        in `self.object_view`. If not match is found None, None is returned

        :param request: The request object
        :param url_kwargs: Any url keyword arguments as a dictionary
        :param parent_only: If `True` then the view will only \
        be rendered if object_view points to parent. This is usually \
        what you want to avoid extra lookups to get the object \
        you already have.
        :param render_type: The render type to use for the header. \
        Defaults to 'object_header'.
        """

        if parent_only and self.object_view != self.parent_attr:
            return None, None

        if self.object_view == self.parent_attr and self.parent:
            return self.parent.get_object_header_view(request, url_kwargs,
                                                    render_type=render_type)
        elif self.object_view:
            view, name = self.get_initialized_view_and_name(self.object_view,
                                    can_submit=False,
                                    base_template='cms/partial.html',
                                    request=request, kwargs=url_kwargs,
                                    render_type=render_type)
            if view and view.can_view(request.user):
                return view, name
        return None, None

    def get_string_from_view(self, request, view_name, url_kwargs,
                                                render_type='string'):

        """
        Returns a string that is a rendering of the view given a
        request, view_name, and the original url_kwargs. Makes the
        following changes the view before rendering:

        * Sets can_submit to False.
        * Adds action_url to the context. This is the url where \
        this view actually lives.
        * Sets the default base_template to be 'cms/partial.html'

        This will always call GET and never POST as any actions
        that modify data should take place on the original
        url and not like this.

        :param request: The request object.
        :param view_name: The name of the view that you want.
        :param url_kwargs: The url keyword arguments that came \
        with the request object. The view itself is responsible \
        to remove arguments that would not be part of a normal match \
        for that view. This is done by calling  the `get_url_kwargs` \
        method on the view.
        :param render_type: The render type to use. Defaults to \
        'string'.
        """

        response = ""
        try:
            view, name = self.get_initialized_view_and_name(view_name,
                                    render_type=render_type,
                                    can_submit=False,
                                    base_template='cms/partial.html',
                                    request=request, kwargs=url_kwargs)

            if isinstance(view, URLAlias):
                view_name = view.get_view_name(view_name)
                bundle = view.get_bundle(self, url_kwargs, {})
                if bundle and isinstance(bundle, Bundle):
                    return bundle.get_string_from_view(request, view_name,
                                                    url_kwargs,
                                                    render_type=render_type)

            elif view:
                if view and name and view.can_view(request.user):
                    response = self._render_view_as_string(view, name, request,
                                                           url_kwargs)
        except http.Http404:
            pass
        return response

    def _render_view_as_string(self, view, name, request, url_kwargs):
        url_kwargs = view.get_url_kwargs()
        url = reverse("admin:%s" % name, kwargs=url_kwargs,
                        current_app=self.admin_site.name)
        view.add_to_render_data(action_url=url)
        return mark_safe(view.as_string(request, **url_kwargs))

    def get_view_url(self, view_name, user,
                     url_kwargs=None, context_kwargs=None,
                     follow_parent=True, check_permissions=True):
        """
        Returns the url for a given view_name. If the view isn't
        found or the user does not have permission None is returned.
        A NoReverseMatch error may be raised if the view was unable
        to find the correct keyword arguments for the reverse function
        from the given url_kwargs and context_kwargs.

        :param view_name: The name of the view that you want.
        :param user: The user who is requesting the view
        :param url_kwargs: The url keyword arguments that came \
        with the request object. The view itself is responsible \
        to remove arguments that would not be part of a normal match \
        for that view. This is done by calling  the `get_url_kwargs` \
        method on the view.
        :param context_kwargs: Extra arguments that will be passed \
        to the view for consideration in the final keyword arguments \
        for reverse.
        :param follow_parent: If we encounter a parent reference should \
        we follow it. Defaults to True.
        :param check_permisions: Run permissions checks. Defaults to True.
        """

        view, url_name = self.get_initialized_view_and_name(view_name,
                                            follow_parent=follow_parent)

        if isinstance(view, URLAlias):
            view_name = view.get_view_name(view_name)
            bundle = view.get_bundle(self, url_kwargs, context_kwargs)

            if bundle and isinstance(bundle, Bundle):
                return bundle.get_view_url(view_name, user,
                                           url_kwargs=url_kwargs,
                                           context_kwargs=context_kwargs,
                                           follow_parent=follow_parent,
                                           check_permissions=check_permissions)

        elif view:

            # Get kwargs from view
            if not url_kwargs:
                url_kwargs = {}

            url_kwargs = view.get_url_kwargs(context_kwargs, **url_kwargs)
            view.kwargs = url_kwargs

            if check_permissions and not view.can_view(user):
                return None

            url = reverse("admin:%s" % url_name, kwargs=url_kwargs,
                          current_app=self.admin_site.name)
            return url

    def _view_uses_name_as_url_kwarg(self, view_name):
        # Returns True if the given view_name uses
        # self.name in url kwargs
        view_name = view_name.replace(ACTION_ALIAS, '')
        return (view_name in self._meta.item_views) or \
                (view_name in self._meta.action_views)

    def _get_slug_url_kwarg_for_name(self, view_name):
        arg = None

        if self._view_uses_name_as_url_kwarg(view_name):
            arg = '%s_pk' % self.name
        elif self.parent:
            # Get the attribute from the parent so this can be chained
            arg = self.parent._get_slug_url_kwarg_for_name(self.attr_on_parent)

        return arg

    def _get_view_kwargs(self, view, view_name):
        kwargs = {}

        if hasattr(view, 'bundle'):
            kwargs['bundle'] = self

        if hasattr(view, 'slug_url_kwarg'):
            kwargs['slug_url_kwarg'] = self._get_slug_url_kwarg_for_name(view_name)

        return kwargs

    def get_initialized_view_and_name(self, view_name,
                                    follow_parent=True, **extra_kwargs):
        """
        Creates and returns a new instance of a CMSView \
        and it's url_name.

        :param view_name: The name of the view to return.
        :param follow_parent: If we encounter a parent reference should \
        we follow it. Defaults to True.
        :param extra_kwargs: Keyword arguments to pass to the view.
        """

        view, name = self.get_view_and_name(view_name)

        # Initialize the view with the right kwargs
        if hasattr(view, 'as_view'):
            e = dict(extra_kwargs)
            e.update(**self._get_view_kwargs(view, view_name))
            e['name'] = view_name
            view = view(**e)

        # It is a Bundle return the main
        elif isinstance(view, Bundle):
            view, name = view.get_initialized_view_and_name('main',
                                                        **extra_kwargs)
        elif view == self.parent_attr and self.parent:
            if follow_parent:
                return self.parent.get_initialized_view_and_name(view_name,
                                                              **extra_kwargs)
            else:
                view = None
                name = None
        return view, name

    def get_single_title(self):
        return self.get_title(plural=False)

    def get_title(self, plural=True):
        """
        Get's the title of the bundle. Titles can be singular
        or plural.
        """
        value = self.title
        if value == self.parent_attr:
            return self.parent.get_title(plural=plural)

        if not value and self._meta.model:
            value = helpers.model_name(self._meta.model,
                                       self._meta.custom_model_name,
                                       self._meta.custom_model_name_plural,
                                       plural)
        elif self.title and plural:
            value = helpers.pluralize(self.title, self.title_plural)

        return helpers.capfirst_if_needed(value)

    def _get_bundle_from_promise(self, attname):
        assert self.admin_site, "You must specify an admin_site before initializing sub bundles"
        attr = "_%s_bundle" % attname
        view = getattr(self, attr, None)
        if not view:
            promise = getattr(self, PromiseBundle.hidden_name(attname),
                              None)
            if promise:
                view = promise(attname, self, self.admin_site)
                setattr(self, attr, view)
        return view

    def get_view_and_name(self, attname):
        """
        Gets a view or bundle and returns it
        and it's url_name.
        """
        view = getattr(self, attname, None)
        if attname in self._children:
            view = self._get_bundle_from_promise(attname)

        if view:
            if attname in self._children:
                return view, view.name
            elif isinstance(view, ViewAlias):
                view_name = view.get_view_name(attname)
                bundle = view.get_bundle(self, {}, {})
                if bundle and isinstance(bundle, Bundle):
                    view, name = bundle.get_view_and_name(view_name)

            if hasattr(view, 'as_view'):
                if attname != 'main':
                    name = "%s_%s" % (self.name, attname)
                else:
                    name = self.name
                return view, name
            elif view == self.parent_attr and self.parent:
                return self.parent_attr, None
            elif isinstance(view, URLAlias):
                return view, None

        return None, None

    def get_regex_for_name(self, name, attname):

        # Get the regex for this view
        regex = ''
        if name != self.name and attname != 'main':
            regex = "%s/" % attname
            if hasattr(self._meta, "%s_regex_base" % attname):
                regex = getattr(self._meta, "%s_regex_base" % attname)
                regex = regex % {'group_name': self.name,
                                'attname': attname}
            elif attname in self._meta.item_views or \
                    attname in self._meta.action_views:
                regex = "%s%s" % (self.item_regex, regex)
        return regex

    def get_url(self, name, view_obj, attname):

        def wrap(view):
            def wrapper(*args, **kwargs):
                return self.admin_site.admin_view(view)(*args, **kwargs)
            return update_wrapper(wrapper, view)

        regex = self.get_regex_for_name(name, attname)
        if isinstance(view_obj, Bundle):
            reg = r'^%s' % regex
            u = url(reg, include(view_obj.get_urls()))
        else:
            view_kwargs = self._get_view_kwargs(view_obj, attname)
            u = url(r'^%s$' % regex, wrap(view_obj.as_view(**view_kwargs)),
                name=name)
        return u

    def get_urls(self):
        """
        Returns urls handling bundles and views.
        This processes the 'item view' first in order
        and then adds any non item views at the end.
        """
        parts = []
        seen = set()

        # Process item views in order
        for v in list(self._meta.item_views)+list(self._meta.action_views):
            if not v in seen:
                view, name = self.get_view_and_name(v)
                if view and name:
                    parts.append(self.get_url(name, view, v))
                seen.add(v)

        # Process everything else that we have not seen
        for v in set(self._views).difference(seen):
            # Get the url name
            view, name = self.get_view_and_name(v)
            if view and name:
                parts.append(self.get_url(name, view, v))

        return patterns('', *parts)

    def _optional_tuples(self, tup):
        for item in tup:
            if len(item) == 1:
                yield (item[0], None, None)
            elif len(item) == 2:
                yield (item[0], item[1], None)
            else:
                yield item

    def _nav_from_tuple(self, request, tup, **kwargs):
        navigation = []
        for view_name, title, url_kwargs in self._optional_tuples(tup):
            url = self.get_view_url(view_name, request.user,
                              url_kwargs=url_kwargs,
                              context_kwargs=kwargs)
            if url:
                if not title and view_name in self._children:
                    b = self._get_bundle_from_promise(view_name)
                    title = b.get_title()
                elif not title:
                    title = self.get_title()

                navigation.append((url, title))
        return navigation

    def get_dashboard_urls(self, request):
        """
        Generates a list of tuples based on the values
        in `self.dashboard` that are the main navigation links
        for this bundle. The tuple format is (url, title).
        """
        return self._nav_from_tuple(request, self.dashboard)

    def get_dashboard_block(self, request):
        """
        Returns a block of html for display on the dashboard.
        """
        return None

    def get_navigation(self, request, **kwargs):
        """
        Generates a list of tuples based on the values
        in `self.navigation` that are the side navigation links
        for this bundle. The tuple format is (url, title).
        """

        if self.navigation == self.parent_attr:
            if self.parent:
                return self.parent.get_navigation(request, **kwargs)
            return ()
        else:
            return self._nav_from_tuple(request, self.navigation,
                                **kwargs)

    @classonlymethod
    def as_subbundle(cls, name=None, title=None, title_plural=None):
        """
        Wraps the given bundle so that it can be lazily
        instantiated.

        :param name: The slug for this bundle.
        :param title: The verbose name for this bundle.
        """
        return PromiseBundle(cls, name=name, title=title,
                                title_plural=title_plural)


class BlankBundle(Bundle):
    """
    Base bundle that has no preset views. Should be used as a base
    for bundle's that are not meant for typical CRUD operations.
    """

    main = None
    add = None
    edit = None
    delete = None
    publish = None
    versions = None
    unpublish = None
    main_list = None


class VersionMixin(object):
    _views = ('publish', 'unpublish', 'versions')

    publish = actions.PublishActionView()
    unpublish = actions.UnPublishActionView()
    versions = VersionsList()


class VersionedBundle(Bundle, VersionMixin):
    """
    Base bundle for versioned models. Adds views for publishing,
    un-publishing and managing versions.
    """

    class Meta(options.VersionMeta):
        pass


class DelegatedObjectBundle(Bundle):
    """
    Base bundle that delegates the following views to use the
    bundle specified by edit:

    * delete
    * publish
    * unpublish
    * versions

    This is useful for bundles that contain a list but all the actions
    for items in that list are specified on the sub bundle edit.
    """

    delete = URLAlias(bundle_attr='edit')
    publish = URLAlias(bundle_attr='edit')
    unpublish = URLAlias(bundle_attr='edit')
    versions = URLAlias(bundle_attr='edit')

    delete_action = ViewAlias(bundle_attr='edit', alias_to='delete')
    publish_action = ViewAlias(bundle_attr='edit', alias_to='publish')
    unpublish_action = ViewAlias(bundle_attr='edit', alias_to='unpublish')

    class Meta(options.VersionMeta):
        pass


class ObjectOnlyBundle(Bundle):
    """
    Base Bundle for sub bundles that do not contain a list
    page. Makes the following changes

    * Removes add.
    * main is a FormView.
    * edit points to PARENT, since that is what main is.
    * main_list points to PARENT.
    * The item views attribute of meta is set to be empty.
    """

    add = None
    main = views.FormView()
    edit = PARENT

    main_list = URLAlias(bundle_attr=PARENT)
    delegated = True

    class Meta:
        item_views = ()
        action_views = ()
        live_views = ('delete', 'publish', 'unpublish', 'versions')


class VersionedObjectOnlyBundle(ObjectOnlyBundle, VersionMixin):
    """
    Same as ObjectOnlyBundle but adds version management views.
    """
    pass


class ChildBundle(Bundle):
    """
    Base Bundle for sub bundles. Makes the following changes:

    * required_groups is inherited from PARENT.
    """
    required_groups = PARENT

    class Meta:
        pass


class ParentVersionedBundle(ChildBundle):
    """
    Same as ChildBundle expect that is also changes:

    * object_view is inherited from PARENT.
    """

    object_view = PARENT
