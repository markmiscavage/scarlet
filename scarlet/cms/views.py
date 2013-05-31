from functools import update_wrapper
import urlparse
import copy

from django import http
from django.views import generic
from django.views.generic.edit import ModelFormMixin
from django.views.generic.detail import SingleObjectMixin
from django.views.generic.list import MultipleObjectMixin
from django.utils.decorators import method_decorator, classonlymethod
from django.views.decorators.csrf import csrf_protect
from django import forms
from django.forms import models as model_forms
from django.contrib import messages
from django.core.exceptions import ImproperlyConfigured
from django.contrib.admin.util import flatten_fieldsets
from django.db.models.fields import FieldDoesNotExist
from django.db import models
from django.utils.encoding import force_unicode

from . import fields
from . import helpers
from . import renders
from . import transaction
from . import widgets
from .forms import WhenForm, LazyFormSetFactory, VersionFilterForm
from .models import CMSLog
from .internal_tags import handler as tag_handler


class BaseView(generic.base.View):
    """
    Base view for all Views. This is a class based view
    that uses render classes to handle the preparation of an
    response.

    Render classes are classes that return a response of
    some kind from a view, such as a HttpResponse object or a string.
    The only requirement is that they have a render method that takes
    a request and keyword arguments. Those keyword arguments should be
    considered the context.

    :param renders: A dictionary where the values are render \
    class instances.
    :param render_type: A string that denotes what renderer \
    should be used. This must but a key in the renders dictionary. \
    Default is 'response'.
    """

    render_type = 'response'

    def get_render_data(self, **kwargs):
        """
        Because of the way mixin inheritance works
        we can't have a default implementation of
        get_context_data on the this class, so this
        calls that method if available and returns
        the resulting context.
        """
        if hasattr(self, 'get_context_data'):
            data = self.get_context_data(**kwargs)
        else:
            data = kwargs
        return data

    def render(self, request, collect_render_data=True, **kwargs):
        """
        Render this view. This will call the render method
        on the render class specified.

        :param request: The request object
        :param collect_render_data: If True we will call \
        the get_render_data method to pass a complete context \
        to the renderer.
        :param kwargs: Any other keyword arguments that should \
        be passed to the renderer.
        """
        assert self.render_type in self.renders
        render = self.renders[self.render_type]
        if collect_render_data:
            kwargs = self.get_render_data(**kwargs)

        return render.render(request, **kwargs)


class SiteView(BaseView):
    """
    Base view that provides a classmethod to render
    the view as a string instead of as a HttpResponse.
    """

    def get_as_string(self, request, *args, **kwargs):
        return self.get(request, *args, **kwargs)

    @classonlymethod
    def as_string(cls, **initkwargs):
        """
        Similar to the as_view classmethod except this method will
        render this view as a string. When rendering a view this way
        the request will always be routed to the get method.
        The default render_type is 'string' unless you specify
        something else. If you provide your own render_type be sure
        to specify a render class that returns a string.
        """

        if not 'render_type' in initkwargs:
            initkwargs['render_type'] = 'string'

        for key in initkwargs:
            if key in cls.http_method_names:
                raise TypeError(u"You tried to pass in the %s method name as a"
                                u" keyword argument to %s(). Don't do that."
                                % (key, cls.__name__))
            if not hasattr(cls, key):
                raise TypeError(u"%s() received an invalid keyword %r" % (
                    cls.__name__, key))

        def view(request, *args, **kwargs):
            try:
                self = cls(**initkwargs)
                self.request = request
                self.args = args
                self.kwargs = kwargs
                return self.get_as_string(request, *args, **kwargs)
            except http.Http404:
                return ""

        # take name and docstring from class
        update_wrapper(view, cls, updated=())

        return view


class CMSView(BaseView):
    """
    Base class for CMS Views, should be used as the main view
    class for all views that will be registered with a bundle.

    :param base_template: The default base template, gets passed \
    to the main template as 'base'.
    :param default_template: The main template for this view.
    :param object_header_tmpl: The template to render for an object \
    header.
    :param render_type: The render_type, defaults to 'response'.
    :param renders: The dictionary of render views that this view \
    knows how to set. Unless specified otherwise, this will be set \
    to a CMSRender instance 'response' and RenderString instance \
    'string'; both instances are initialized with the `default_template`.
    :param bundle: The bundle that this view instance is attached \
    to. Set by the bundle on initialization.
    :param can_submit: Does this instance support form submission. \
    Set to false by bundle when necessary.
    :param required_groups: Groups that are required in order to render \
    this view. Defaults to None, may be set by bundle.
    """

    object_header_tmpl = "cms/object_header.html"

    render_type = 'response'

    base_template = 'cms/base_bundle_view.html'

    renders = {}

    bundle = None

    can_submit = True

    required_groups = None

    ORIGIN_ARGUMENT = 'o'

    def __init__(self, *args, **kwargs):
        self.extra_render_data = {}
        self.changed_kwargs = kwargs
        super(CMSView, self).__init__(*args, **kwargs)
        if not self.renders:
            self.renders = {
                'response': renders.CMSRender(template=self.default_template,
                               base=self.base_template),
                'string': renders.RenderString(template=self.default_template,
                               base=self.base_template)
            }

    def customized_return_url(self, default_url):
        redirect_url = self.request.REQUEST.get(self.ORIGIN_ARGUMENT)
        if redirect_url:
            base = self.request.path.split('/')
            if len(base) > 1 and redirect_url.startswith('/%s' % base[1]):
                return redirect_url

        return default_url

    def add_to_render_data(self, **kwargs):
        """
        Any keyword arguments provided will be passed to
        the renderer when this view is rendered.
        """
        self.extra_render_data.update(kwargs)

    def get_tags(self, view_object=None):
        """
        This method return a list of tags to use in the template
        :return: list of tags
        """
        tags = [force_unicode(self.bundle.get_title())]
        back_bundle = self.get_back_bundle()
        if back_bundle and back_bundle != self.bundle:
            tags.append(force_unicode(back_bundle.get_title()))
        if view_object:
            tags.append(force_unicode(view_object))

        return tags

    def get_back_bundle(self):
        try:
            obj = self.object
        except:
            obj = False
        if obj and getattr(self.bundle, 'main_list', None):
            main_list = self.bundle.main_list
            return main_list.get_bundle(self.bundle, {}, self.kwargs)
        return u""

    def get_render_data(self, **kwargs):
        """
        Returns all data that should be passed to the renderer.
        By default adds the following arguments:

        * **bundle** - The bundle that is attached to this view instance.
        * **url_params** - The url keyword arguments. i.e.: self.kwargs.
        * **user** - The user attached to this request.
        * **base** - Unless base was already specified this gets set to \
        'self.base_template'.
        * **object_header_tmpl** - The template to use for the \
        object_header. Set to `self.object_header_tmpl`.
        * **back_bundle** - The back_back bundle is bundle that is linked to \
        from the object header as part of navigation. If there is an 'obj' \
        argument in the context to render, this will be set to the bundle \
        pointed to by the `main_list` attribute of this view's bundle. \
        If this is not set, the template's back link will point to the \
        admin_site's home page.
        """

        obj = getattr(self, 'object', None)
        data = dict(self.extra_render_data)
        data.update(kwargs)
        data.update({
            'bundle': self.bundle,
            'current_app': self.bundle.admin_site.name,
            'url_params': self.kwargs,
            'user': self.request.user,
            'object_header_tmpl': self.object_header_tmpl,
            'view_tags': tag_handler.tags_to_string(self.get_tags(obj))
        })

        if not 'base' in data:
            data['base'] = self.base_template

        if not 'back_bundle' in data:
            data['back_bundle'] = self.get_back_bundle()

        return super(CMSView, self).get_render_data(**data)

    def _user_in_groups(self, user, allowed_groups):
        groups = getattr(user, 'cached_groups', None)
        if groups is None:
            user.cached_groups = user.groups.all()

        for group in user.cached_groups:
            if group.name in allowed_groups:
                return True
        return False

    def can_view(self, user):
        """
        Returns True if user has permission to render this view.

        At minimum this requires an active staff user. If the required_groups
        attribute is not empty then the user must be a member of at least one
        of those groups. If there are no required groups set for the view but
        required groups are set for the bundle then the user must be a member
        of at least one of those groups. If there are no groups to check this
        will return True.
        """

        if user.is_staff and user.is_active:
            if user.is_superuser:
                return True
            elif self.required_groups:
                return self._user_in_groups(user, self.required_groups)
            elif self.bundle.required_groups:
                return self._user_in_groups(user, self.bundle.required_groups)
            else:
                return True

        return False

    def get_url_kwargs(self, request_kwargs=None, **kwargs):
        """
        Get the kwargs needed to reverse this url.

        :param request_kwargs: The kwargs from the current request. \
        These keyword arguments are only retained if they are present \
        in this bundle's known url_parameters.
        :param kwargs: Keyword arguments that will always be kept.
        """

        if not request_kwargs:
            request_kwargs = getattr(self, 'kwargs', {})

        for k in self.bundle.url_params:
            if k in request_kwargs and not k in kwargs:
                kwargs[k] = request_kwargs[k]
        return kwargs

    def customize_form_widgets(self, form_class):
        """
        Hook for customizing widgets for a form_class. This is needed
        for forms that specify their own fields causing the
        default db_field callback to not be run for that field.

        Default implementation checks for APIModelChoiceWidgets and
        runs the update_links method on them. Passing the admin_site
        and request being used.

        Returns a new class that contains the field with the initialized
        custom widget.
        """
        attrs = {}

        for k, f in form_class.base_fields.items():
            if isinstance(f.widget, widgets.APIModelChoiceWidget):
                field = copy.deepcopy(f)
                field.widget.update_links(self.request, self.bundle.admin_site)
                attrs[k] = field

        if attrs:
            form_class = type(form_class.__name__, (form_class,), attrs)

        return form_class

    @method_decorator(csrf_protect)
    def dispatch(self, request, *args, **kwargs):
        """
        Overrides the custom dispatch method to raise a Http404
        if the current user does not have view permissions.
        """

        if not self.can_view(request.user):
            raise http.Http404

        return super(CMSView, self).dispatch(request, *args, **kwargs)


class ModelCMSMixin(object):
    """
    Mixin for use with all cms views that interact with database models.

    :param parent_field: The name of the field on the model \
    that points a parent that must be present. This should either be \
    a foreign key or a many to many field. Defaults to None.
    :param parent_lookups: A list of field names to use when constructing \
    the query for the parent object. If `parent_field` is present defaults \
    to ('pk',) otherwise default is None.
    :param slug_field: The name of the field on the model that should \
    be used as the keyword argument when looking up an object. Used in \
    combination with `slug_url_kwarg`. Defaults to 'pk'
    :param slug_url_kwarg: The name of the URLConf keyword argument \
    that contains the value to filter on. Used in combination with \
    `slug_field`. Defaults to 'pk'.
    :param base_filter_kwargs: Attribute to provide a dictionary of \
    default keyword arguments for the base queryset.
    """

    parent_lookups = None
    parent_field = None

    slug_field = 'pk'
    slug_url_kwarg = 'pk'

    base_filter_kwargs = {}

    def get_formfield_overrides(self):
        """
        Hook for specifying the default arguments when
        creating a form field for a db field.

        By default adds DateWidget for date fields,
        TimeChoiceWidget for time fields, SplitDateTime
        for datetime fields, and APIChoiceWidget for
        foreign keys.
        """
        return helpers.FORMFIELD_FOR_DBFIELD_DEFAULTS

    def formfield_for_dbfield(self, db_field, **kwargs):
        """
        Hook for specifying the form Field instance for a given
        database Field instance. If kwargs are given, they're
        passed to the form Field's constructor.

        Default implementation uses the overrides returned by
        `get_formfield_overrides`. If a widget is an instance
        of APIChoiceWidget this will do lookup on the current
        admin site for the bundle that is registered for that
        module as the primary bundle for that one model. If a
        match is found then this will call update_links on that
        widget to store the appropriate urls for the javascript
        to call. Otherwise the widget is removed and the default
        select widget will be used instead.
        """

        overides = self.get_formfield_overrides()

        # If we've got overrides for the formfield defined, use 'em. **kwargs
        # passed to formfield_for_dbfield override the defaults.
        for klass in db_field.__class__.mro():
            if klass in overides:
                kwargs = dict(overides[klass], **kwargs)
                break

        # Our custom widgets need special init
        mbundle = None
        if kwargs.get('widget'):
            widget = kwargs.get('widget')
            extra = kwargs.pop('widget_kwargs', {})
            if widget and isinstance(widget, type) and \
                            issubclass(widget, widgets.APIChoiceWidget):
                mbundle = self.bundle.admin_site.get_bundle_for_model(
                                                db_field.rel.to)
                if mbundle:
                    widget = widget(db_field.rel, **extra)
                else:
                    widget = None
            kwargs['widget'] = widget

        field = db_field.formfield(**kwargs)
        if mbundle:
            field.widget.update_links(self.request, self.bundle.admin_site)
        return field

    def log_action(self, instance, action, action_date=None, url="",
                   update_parent=True):
        """
        Store an action in the database using the CMSLog model.
        The following attributes are calculated and set on the log entry:

         * **model_repr** - A unicode representation of the instance.
         * **object_repr** - The verbose_name of the instance model class.
         * **section** - The name of ancestor bundle that is directly \
         attached to the admin site.

        :param instance: The instance that this action was performed \
        on.
        :param action: The action type. Must be one of the options \
        in CMSLog.ACTIONS.
        :param action_date: The datetime the action occurred.
        :param url: The url that the log entry should point to, \
        Defaults to an empty string.
        :param update_parent: If true this will update the last saved time \
        on the object pointed to by this bundle's object_view. \
        Defaults to True.
        """

        section = None
        if self.bundle:
            bundle = self.bundle
            while bundle.parent:
                bundle = bundle.parent
            section = bundle.name

        # if we have a object view that comes from somewhere else
        # save it too to update it.
        changed_object = instance
        bundle = self.bundle
        while bundle.object_view == bundle.parent_attr:
            bundle = bundle.parent

        if update_parent and changed_object.__class__ != bundle._meta.model:
            object_view, name = bundle.get_initialized_view_and_name(
                                    bundle.object_view, kwargs=self.kwargs)

            changed_object = object_view.get_object()
            changed_object.save()

        if not section:
            section = ""

        if url:
            url = urlparse.urlparse(url).path

        rep = unicode(instance)
        if rep:
            rep = rep[:255]

        log = CMSLog(action=action, url=url, section=section,
                     model_repr=instance._meta.verbose_name,
                     object_repr=rep,
                     user_name=self.request.user.username,
                     action_date=action_date)
        log.save()

    def get_filter(self, **filter_kwargs):
        """
        Returns a list of Q objects that can be passed
        to an queryset for filtering.

        Default implementation returns a Q
        object for `base_filter_kwargs` and any
        passed in keyword arguments.
        """
        filter_kwargs.update(self.base_filter_kwargs)
        if filter_kwargs:
            return [models.Q(**filter_kwargs)]
        return []

    def get_queryset(self, **filter_kwargs):
        """
        Get the list of items for this view. This will
        call the `get_parent_object` method before doing
        anything else to ensure that a valid parent object
        is present. If a parent_object is returned it gets
        set to `self.parent_object`.

        If a queryset has been set then that queryset will be used.
        Otherwise the default manager for the provided
        model will be used.

        Once we have a queryset, the `get_filter` method
        is called and added to the queryset which is then
        returned.
        """
        self.parent_object = self.get_parent_object()

        if self.queryset is not None:
            queryset = self.queryset
            if hasattr(queryset, '_clone'):
                queryset = queryset._clone()
        elif self.model is not None:
            queryset = self.model._default_manager.filter()
        else:
            raise ImproperlyConfigured(u"'%s' must define 'queryset' or 'model'"
                                       % self.__class__.__name__)

        q_objects = self.get_filter(**filter_kwargs)
        queryset = queryset.filter()
        for q in q_objects:
            queryset = queryset.filter(q)

        return queryset

    def get_parent_object(self):
        """
        Lookup a parent object. If parent_field is None
        this will return None. Otherwise this will try to
        return that object.

        The filter arguments are found by using the known url
        parameters of the bundle, finding the value in the url keyword
        arguments and matching them with the arguments in
        `self.parent_lookups`. The first argument in parent_lookups
        matched with the value of the last argument in the list of bundle
        url parameters, the second with the second last and so forth.

        For example let's say the parent_field attribute is 'gallery'
        and the current bundle knows about these url parameters:

        * adm_post
        * adm_post_gallery

        And the current value for 'self.kwargs' is:

        * adm_post = 2
        * adm_post_gallery = 3

        if parent_lookups isn't set the filter for the queryset
        on the gallery model will be:

        * pk = 3

        if parent_lookups is ('pk', 'post__pk') then the filter
        on the queryset will be:

        * pk = 3
        * post__pk = 2

        The model to filter on is found by finding the relationship
        in self.parent_field and filtering on that model.
        If a match is found, 'self.queryset` is changed to
        filter on the parent as described above and the parent
        object is returned. If no match is found, a Http404 error
        is raised.
        """

        if self.parent_field:
            # Get the model we are querying on
            cache = self.model._meta.init_name_map()
            field, mod, direct, m2m = cache[self.parent_field]
            to = None
            field_name = None
            if self.parent_lookups is None:
                self.parent_lookups = ('pk',)

            offset = len(self.bundle.url_params) - len(self.parent_lookups)
            kwargs = {}
            for i in range(len(self.parent_lookups) - 1):
                k = self.bundle.url_params[offset + i]
                value = self.kwargs[k]
                kwargs[self.parent_lookups[i + 1]] = value

            main_arg = self.kwargs[self.bundle.url_params[-1]]
            main_key = self.parent_lookups[0]

            if m2m:
                rel = getattr(self.model, self.parent_field)
                kwargs[main_key] = main_arg
                if direct:
                    to = rel.field.rel.to
                    field_name = self.parent_field
                else:
                    to = rel.related.model
                    field_name = rel.related.field.name
            else:
                to = field.rel.to
                if main_key == 'pk':
                    to_field = field.rel.field_name
                    if to_field == 'vid':
                        to_field = 'object_id'
                else:
                    to_field = main_key
                kwargs[to_field] = main_arg

            # Build the list of arguments
            try:
                obj = to.objects.get(**kwargs)
                if self.queryset is None:
                    if m2m:
                        self.queryset = getattr(obj, field_name)
                    else:
                        self.queryset = self.model.objects.filter(
                                                    **{self.parent_field: obj})
                return obj
            except to.DoesNotExist:
                raise http.Http404
        return None


class ModelCMSView(CMSView):
    """
    Base view for CMS views that interact with models.
    Inherits from CMSView.

    :param custom_model_name: A alternate verbose name for the \
    given model.
    """

    custom_model_name = None
    custom_model_name_plural = None

    def __init__(self, *args, **kwargs):
        super(ModelCMSView, self).__init__(*args, **kwargs)
        self.pk_url_kwarg = None

    def write_message(self, status=messages.INFO, message=None):
        """
        Writes a message to django's messaging framework and
        returns the written message.

        :param status: The message status level. Defaults to \
        messages.INFO.
        :param message: The message to write. If not given, \
        defaults to appending 'saved' to the unicode representation \
        of `self.object`.
        """
        if not message:
            message = u"%s saved" % self.object
        messages.add_message(self.request, status, message)
        return message

    def get_url_kwargs(self, request_kwargs=None, **kwargs):
        """
        If request_kwargs is not specified, self.kwargs is used instead.

        If 'object' is one of the kwargs passed. Replaces it with
        the value of 'self.slug_field' on the given object.
        """

        if not request_kwargs:
            request_kwargs = getattr(self, 'kwargs', {})

        kwargs = super(ModelCMSView, self).get_url_kwargs(request_kwargs,
                                                          **kwargs)
        obj = kwargs.pop('object', None)
        if obj:
            kwargs[self.slug_url_kwarg] = getattr(obj, self.slug_field, None)
        elif self.slug_url_kwarg in request_kwargs:
            kwargs[self.slug_url_kwarg] = request_kwargs[self.slug_url_kwarg]

        return kwargs

    def _model_name(self, plural=False):
        return helpers.model_name(self.model, self.custom_model_name,
                                  self.custom_model_name_plural,
                                  plural=plural)

    @property
    def model_name_plural(self):
        """
        Property for getting the plural verbose name of the given model.
        Returns custom_model_name if present, otherwise returns
        the verbose_name of the model.
        """
        return self._model_name(plural=True)

    @property
    def model_name(self):
        """
        Property for getting the verbose name of the given model.
        Returns custom_model_name if present, otherwise returns
        the verbose_name of the model.
        """
        return self._model_name(plural=False)

    def get_render_data(self, **kwargs):
        """
        Adds the model_name to the context, then calls super.
        """
        kwargs['model_name'] = self.model_name
        kwargs['model_name_plural'] = self.model_name_plural
        return super(ModelCMSView, self).get_render_data(**kwargs)


class FormView(ModelCMSMixin, ModelFormMixin, ModelCMSView):
    """
    View for adding or editing an object.
    Inherits from ModelCMSMixin, ModelFormMixin, ModelCMSView.
    Adds a 'popup' value to self.renders that is an instance of
    PopupRender that uses the default_template.

    :param default_template: The default template. Defaults to \
    'cms/edit.html'.
    :param force_add: Treat this form as an add form. Defaults \
    to False.
    :param form_class: A ModelForm class to use instead of using \
    model_form_factory.
    :param fieldsets: The view's fieldsets. Use the same format as \
    django admin. Defaults to None.
    :param formsets: A dictionary where the keys are the formset \
    prefixes and the values are LazyFormSetFactory instances. \
    Defaults to an empty dictionary.
    :param redirect_to_view: The name of a view that we will redirect to \
    after a successful save.
    :param cancel_view: The name of a view the cancel links will point to.
    :param force_instance_values: A dictionary of keyword arguments that \
    will be set on every object before save. Defaults to empty dictionary.
    """

    default_template = 'cms/edit.html'
    force_add = False

    fieldsets = None
    formsets = {}
    redirect_to_view = "main"
    cancel_view = "main"
    readonly_fields = None

    force_instance_values = {}

    def __init__(self, *args, **kwargs):
        if args:
            super(FormView, self).__init__(*args, **kwargs)
        else:
            super(FormView, self).__init__(**kwargs)

        self.renders['popup'] = renders.PopupRender(
                        template=self.default_template
        )

        if self.formsets:
            for k, v in self.formsets.items():
                if not isinstance(v, LazyFormSetFactory):
                    raise TypeError(
                        '%s must be a LazyFormSetFactory instance' % k)


    def get_readonly_fields(self):
        """
        Hook for specifying custom readonly fields.
        """
        return self.readonly_fields

    def get_force_instance_values(self):
        """
        Returns values that must be set on
        any object before save.

        Defaults to returning `self.force_instance_values`.
        """
        return self.force_instance_values

    def get_object_url(self):
        """
        Returns the url where this object can be edited.
        """

        if self.kwargs.get(self.slug_url_kwarg, False) == \
                    unicode(getattr(self.object, self.slug_field, "")) \
                    and not self.force_add:
            url = self.request.build_absolute_uri()
        else:
            url = self.bundle.get_view_url('edit', self.request.user,
                                           {'object': self.object},
                                           self.kwargs)
        return url

    def get_cancel_url(self):
        """
        Returns the cancel url for this view.

        if `self.cancel_view` is None the current url will
        be used. Otherwise the get_view_url will be called with
        the current bundle using `self.cancel_view` as the
        view name.
        """
        if self.cancel_view:
            url = self.bundle.get_view_url(self.cancel_view,
                                            self.request.user, {},
                                            self.kwargs)
        else:
            url = self.request.build_absolute_uri()

        return self.customized_return_url(url)

    def get_success_url(self):
        """
        Returns the url to redirect to after a successful update.

        if `self.redirect_to_view` is None the current url will
        be used. Otherwise the get_view_url will be called
        on the current bundle using `self.redirect_to_view` as the
        view name. If the name is "main" or "main_list" no object
        will be passed. Otherwise `self.object` will be passed as
        a kwarg.
        """

        if self.redirect_to_view:
            kwargs = {}
            if self.redirect_to_view != 'main' and \
                        self.redirect_to_view != 'main_list':
                kwargs['object'] = self.object
            return self.bundle.get_view_url(self.redirect_to_view,
                                            self.request.user, kwargs,
                                            self.kwargs)
        else:
            return self.request.build_absolute_uri()

    def get_object(self):
        """
        Get the object we are working with. Makes sure
        get_queryset is called even when in add mode.
        """

        if not self.force_add and self.kwargs.get(self.slug_url_kwarg, None):
            return super(FormView, self).get_object()
        else:
            self.queryset = self.get_queryset()

        return None

    def get_fieldsets(self):
        """
        Hook for specifying fieldsets. If 'self.fieldsets' is
        empty this will default to include all the fields in
        the form with a title of None.
        """

        if self.fieldsets:
            return self.fieldsets
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        fields = form.base_fields.keys()

        readonly_fields = self.get_readonly_fields()
        if readonly_fields:
            fields.extend(readonly_fields)

        return [(None, {'fields': fields})]

    def get_form_class(self):
        """
        Returns the form class to use in this view. Makes
        sure that the form_field_callback is set to use
        the `formfield_for_dbfield` method and that any
        custom form classes are prepared by the
        `customize_form_widgets` method.
        """

        if self.fieldsets:
            fields = flatten_fieldsets(self.fieldsets)
        else:
            fields = None

        exclude = None
        if self.parent_field:
            exclude = (self.parent_field,)

        readonly_fields = self.get_readonly_fields()
        if readonly_fields:
            if exclude:
                exclude = list(exclude)
            else:
                exclude = []

            for field in readonly_fields:
                try:
                    try:
                        f = self.model._meta.get_field(field)
                        if fields:
                            fields.remove(field)
                        else:
                            exclude.append(field)
                    except models.FieldDoesNotExist:
                        if fields:
                            fields.remove(field)
                except ValueError:
                    pass

        params = {'fields': fields,
                  'exclude': exclude,
                  'formfield_callback': self.formfield_for_dbfield}

        if self.form_class:
            if issubclass(self.form_class, forms.ModelForm) and \
                    getattr(self.form_class._meta, 'model', None):
                model = self.form_class.Meta.model
            else:
                model = self.model
            fc = self.customize_form_widgets(self.form_class)
            params['form'] = fc
        else:
            if self.model is not None:
                # If a model has been explicitly provided, use it
                model = self.model
            elif hasattr(self, 'object') and self.object is not None:
                # If this view is operating on a single object, use
                # the class of that object
                model = self.object.__class__
            else:
                # Try to get a queryset and extract the model class
                # from that
                model = self.get_queryset().model

        return model_forms.modelform_factory(model, **params)

    def get_form_kwargs(self):
        """
        Returns the keyword arguments for instantiating the form.
        """
        kwargs = {'initial': self.get_initial(),
                  'instance': self.object}

        if self.request.method in ('POST', 'PUT') and self.can_submit:
            kwargs.update({
                'data': self.request.POST,
                'files': self.request.FILES
            })
        return kwargs

    def get_formsets_dict(self):
        return self.formsets

    def get_formset_parent_object(self, parent_form, saving=False):
        if parent_form.is_valid() and saving:
            obj = parent_form.save(commit=False)
        elif self.object:
            obj = self.object
        else:
            obj = parent_form._meta.model()
        return obj

    def get_formset_queryset(self, key, klass):
        """
        Hook for specifying a custom queryset for
        a particular formset. Returns None by default.

        :param key: The prefix for the formset. This \
        matches with the key of the formset in the \
        self.formsets dictionary.
        :param klass: The FormSet class.
        """
        return None

    def get_formsets(self, parent_form, saving=False):
        fdict = self.get_formsets_dict()
        if not fdict:
            return {}

        obj = self.get_formset_parent_object(parent_form,
                                             saving=saving)

        formsets = {}
        for k, lazy_klass in fdict.items():
            klass = lazy_klass(self.formfield_for_dbfield,
                               self.customize_form_widgets)
            prefix = klass.__name__.lower()
            queryset = self.get_formset_queryset(k, klass)

            if saving:
                ins = klass(self.request.POST, files=self.request.FILES,
                                    instance=obj, prefix=prefix,
                                    queryset=queryset)
            else:
                ins = klass(instance=obj, prefix=prefix, queryset=queryset)
            formsets[k] = ins
        return formsets

    def form_invalid(self, **context):
        """
        Response for invalid form. Calls the render method
        passing self.request and any passed in keyword arguments.
        """
        return self.render(self.request, **context)

    def save_form(self, form):
        """
        Save a valid form. If there is a parent attribute,
        this will make sure that the parent object is added
        to the saved object. Either as a relationship before
        saving or in the case of many to many relations after
        saving. Any forced instance values are set as well.

        Returns the saved object.
        """

        # Add any force_instance_values
        force = self.get_force_instance_values()
        if force:
            for k, v in force.items():
                setattr(form.instance, k, v)

        # Are we adding to an attr or manager
        should_add = False
        if self.parent_object:
            m2ms = [f.name for f in form.instance._meta.many_to_many]
            m2ms.extend([f.field.rel.related_name for f in \
                form.instance._meta.get_all_related_many_to_many_objects()])

            if self.parent_field in m2ms:
                should_add = True
            else:
                try:
                    form.instance._meta.get_field(self.parent_field)
                    setattr(form.instance, self.parent_field,
                            self.parent_object)
                except FieldDoesNotExist:
                    pass

        obj = form.save()
        # Do we need to add this to a m2m
        if should_add:
            getattr(obj, self.parent_field).add(self.parent_object)

        return obj

    def save_formsets(self, form, formsets, auto_tags=None):
        """
        Hook for saving formsets. Loops through
        all the given formsets and calls their
        save method.
        """
        for formset in formsets.values():
            tag_handler.set_auto_tags_for_formset(formset, auto_tags)
            formset.save()

    def form_valid(self, form, formsets):
        """
        Response for valid form. In one transaction this will
        save the current form and formsets, log the action
        and message the user.

        Returns the results of calling the `success_response` method.
        """
        # check if it's a new object before it save the form
        new_object = False
        if not self.object:
            new_object = True

        auto_tags, changed_tags, old_tags = tag_handler.get_tags_from_data(
            form.data, self.get_tags(form.instance))
        tag_handler.set_auto_tags_for_form(form, auto_tags)

        with transaction.commit_on_success():
            self.object = self.save_form(form)
            self.save_formsets(form, formsets, auto_tags=auto_tags)

            url = self.get_object_url()
            self.log_action(self.object, CMSLog.SAVE, url=url)
            msg = self.write_message()

        # get old and new tags
        if not new_object and changed_tags:
            tag_handler.update_changed_tags(changed_tags, old_tags)

        return self.success_response(msg)

    def success_response(self, message=None):
        """
        Returns a 'render redirect' to the result of the
        `get_success_url` method.
        """

        return self.render(self.request,
                           redirect_url=self.get_success_url(),
                           obj=self.object,
                           message=message,
                           collect_render_data=False)

    def render(self, request, **kwargs):
        """
        Renders this view. Adds cancel_url to the context.
        If the request get parameters contains 'popup' then
        the `render_type` is set to 'popup'.
        """
        if request.REQUEST.get('popup'):
            self.render_type = 'popup'
            kwargs['popup'] = 1

        kwargs['cancel_url'] = self.get_cancel_url()
        if not self.object:
            kwargs['single_title'] = True
        return super(FormView, self).render(request, **kwargs)

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests.
        Calls the `render` method with the following
        items in context.

        * **adminForm** - The main form wrapped in an helper class \
        that helps with fieldset iteration and html attributes.
        * **obj** - The object being edited.
        * **formsets** - Any attached formsets.
        """

        self.object = self.get_object()
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        formsets = self.get_formsets(form)

        adminForm = helpers.AdminForm(form, self.get_fieldsets())

        context = {
            'adminForm': adminForm,
            'obj': self.object,
            'formsets': formsets,
        }
        return self.render(request, **context)

    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests.
        Validates submitted form and
        formsets. Saves if valid, re displays
        page with errors if invalid.
        """

        self.object = self.get_object()
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        formsets = self.get_formsets(form, saving=True)
        adminForm = helpers.AdminForm(form, self.get_fieldsets())
        context = {
            'adminForm': adminForm,
            'formsets': formsets,
            'obj': self.object,
        }

        valid_formsets = True
        for formset in formsets.values():
            if not formset.is_valid():
                valid_formsets = False
                break

        if form.is_valid() and valid_formsets:
            return self.form_valid(form, formsets)
        else:
            return self.form_invalid(form=form, **context)


class PreviewWrapper(ModelCMSMixin, SingleObjectMixin, ModelCMSView):
    """
    Wrapper View for providing a preview that is based on another view.
    Inherits from ModelCMSMixin, SingleObjectMixin and ModelCMSView.

    :param preview_view: A view class with a as_string method that can be \
    called to return a string for previewing an object.
    :param pass_through_kwarg: The name of keyword argument that the \
    `preview_view` callable expects to identify to object being requested. \
    Defaults to 'slug'.
    :param pass_through_attr: The name of the attribute on the object \
    being previewed that should be the value passed to the `preview_view` \
    to identify the object. Defaults to 'slug'.
    :param default_template: The default template to render. Defaults \
    to 'cms/preview.html'.
    """

    pass_through_kwarg = 'slug'
    pass_through_attr = 'slug'
    preview_view = None

    slug_field = 'pk'
    slug_url_kwarg = 'pk'

    default_template = 'cms/preview.html'

    def get_context_data(self, **kwargs):
        """
        Hook for adding arguments to the context.
        """
        return kwargs

    def get_object(self):
        """
        Get the object for previewing.
        Raises a http404 error if the object is not found.
        """
        obj = super(PreviewWrapper, self).get_object()

        if not obj:
            raise http.Http404

        return obj

    def get_preview_kwargs(self, **kwargs):
        """
        Gets the url keyword arguments to pass to the
        `preview_view` callable. If the `pass_through_kwarg`
        attribute is set the value of `pass_through_attr` will
        be looked up on the object.

        So if you are previewing an item Obj<id=2> and

            ::

                self.pass_through_kwarg = 'object_id'
                self.pass_through_attr = 'pk'

        This will return

            ::

                { 'object_id' : 2 }

        """
        if not self.pass_through_kwarg:
            return {}

        obj = self.get_object()
        return {
            self.pass_through_kwarg: getattr(obj, self.pass_through_attr)
        }

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests.
        Sets the renderer to be a RenderResponse instance
        that uses `default_template` as the template.

        The `preview_view` callable is called and passed to `render`
        method as the data keyword argument.
        """

        self.renders = {
            'response': renders.RenderResponse(template=self.default_template),
        }
        kwargs = self.get_preview_kwargs(**kwargs)
        view = self.preview_view.as_string()
        return self.render(request, data=view(request, **kwargs))


class DeleteView(ModelCMSMixin, SingleObjectMixin, ModelCMSView):
    """
    View for deleting an object.
    Inherits from ModelCMSMixin, SingleObjectMixin and ModelCMSView.
    Used through out the CMS as the default object_header view so
    this view by default adds an `object_header` renderer that
    uses the `object_header_tmpl` template.

    :param default_template: Defaults to 'cms/delete.html'.
    :param redirect_to_view: Defaults to 'main_list'.
    """

    default_template = 'cms/delete.html'
    redirect_to_view = "main_list"

    def __init__(self, *args, **kwargs):
        super(DeleteView, self).__init__(*args, **kwargs)
        self.renders['object_header'] = renders.RenderString(
                                            template=self.object_header_tmpl)

    def get_done_url(self):
        """
        Returns the url to redirect to after a successful update.
        The get_view_url will be called on the current bundle using
        `self.redirect_to_view` as the view name.
        """
        data = dict(self.kwargs)
        data.pop(self.slug_url_kwarg, None)
        url = self.bundle.get_view_url(self.redirect_to_view,
                                        self.request.user, data)
        return self.customized_return_url(url)

    def get_object(self):
        """
        Get the object for previewing.
        Raises a http404 error if the object is not found.
        """
        obj = super(DeleteView, self).get_object()

        if not obj:
            raise http.Http404

        return obj

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests.
        Calls the `render` method with the following
        items in context:

        * **obj** - The obj being deleted.
        """

        self.object = self.get_object()
        return self.render(request, obj=self.object)

    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests.
        Deletes the object. Successful deletes are logged.
        Returns a 'render redirect' to the result of the
        `get_done_url` method.

        If a ProtectedError is raised, the `render` method
        is called with message explaining the error added
        to the context as `protected`.
        """

        self.object = self.get_object()
        msg = None
        if request.POST.get('delete'):
            try:
                with transaction.commit_on_success():
                    self.log_action(self.object, CMSLog.DELETE)
                    msg = "%s deleted" % self.object
                    self.object.delete()
            except models.ProtectedError, e:
                protected = []
                for x in e.protected_objects:
                    if hasattr(x, 'delete_blocked_message'):
                        protected.append(x.delete_blocked_message())
                    else:
                        protected.append(u"%s: %s" % (x._meta.verbose_name, x))
                return self.render(request, obj=self.object,
                                   protected=protected)

        return self.render(request, redirect_url=self.get_done_url(),
                           obj=self.object,
                           message=msg,
                           collect_render_data=False)


class ListView(ModelCMSMixin, MultipleObjectMixin, ModelCMSView):
    """
    Class for listing objects and optionally editing those objects.
    Inherits from ModelCMSMixin, MultipleObjectMixin, ModelCMSView.
    This class adds a ChoicesRender instance as a 'choices' render
    type.

    :param display_fields: List of fields to display in the table. \
    Defaults to ('__unicode__',).
    :param change_fields: List of fields that are editable in this \
    view. Defaults to empty tuple.
    :param form_class: A model form class to use.
    :param filter_form: An instance of BaseFilterForm that can return \
    filter parameters that can be used to filer this list. \
    Defaults to None.
    :param default_template: Defaults to 'cms/list.html'.
    :param can_sort: Does this view allow sorting by column. \
    True or False.
    :param action_links: A list of action links to display \
    with each row. See `get_actions` for details.
    :param origin_action_links: A list of action links that should \
    redirect back here preserving the querystring.
    :param paginate_by: How many items per page. Defaults \
    to None, which means no paginating.
    :param paginator_class: The paginator class to use. \
    Defaults to Paginator.
    """

    # Fields that can be edited in this list.
    change_fields = ()

    # Fields that should be displayed. Must include
    display_fields = ('__unicode__',)

    # class that each form should use
    form_class = None

    filter_form = None

    default_template = 'cms/list.html'

    # Are we allowed to sort this list?
    can_sort = True

    action_links = (
        ('edit', 'Edit', 'e'),
        ('delete', 'Delete', 'd', True),
        ('publish', 'Publish', 'P', True),
        ('preview', 'Preview', 'p')
    )

    def __init__(self, *args, **kwargs):
        super(ListView, self).__init__(*args, **kwargs)
        self.renders['choices'] = renders.ChoicesRender()

    def formfield_for_dbfield(self, db_field, **kwargs):
        """
        Same as parent but sets the widget for any OrderFields to
        HiddenTextInput.
        """
        if isinstance(db_field, fields.OrderField):
            kwargs['widget'] = widgets.HiddenTextInput

        return super(ListView, self).formfield_for_dbfield(db_field, **kwargs)

    def _verify_list(self):
        allow_empty = self.get_allow_empty()
        if not allow_empty and len(self.object_list) == 0:
            raise http.Http404

    def get_actions(self):
        """
        Hook for specifying action links.
        Returns `self.action_links` by default.

        The format is a list of tuples. Each tuple
        has four slots:

        * **0** The view name to lookup to get the link.
        * **1** The verbose name of the link.
        * **2** The css attribute for this link.
        * **3** Should this link include an origin redirect
        """

        return self.action_links

    def get_filter_form(self, **kwargs):
        """
        If there is a filter_form, initializes that
        form with the contents of request.GET and
        returns it.
        """

        form = None
        if self.filter_form:
            form = self.filter_form(self.request.GET)
        elif self.model and hasattr(self.model._meta, '_is_view'):
            form = VersionFilterForm(self.request.GET)
        return form

    def get_filter(self, **filter_kwargs):
        """
        Combines the Q objects returned by a valid
        filter form with any other arguments and
        returns a list of Q objects that can be passed
        to a queryset.
        """

        q_objects = super(ListView, self).get_filter(**filter_kwargs)
        form = self.get_filter_form()
        if form:
            q_objects.extend(form.get_filter())

        return q_objects

    def get_formset_form_class(self):
        """
        Returns the form class for use in the formset.

        If a form_class attribute or change_fields
        is provided then a form will be constructed
        with that. Otherwise None is returned.
        """
        if self.form_class or self.change_fields:
            params = {'formfield_callback': self.formfield_for_dbfield}
            if self.form_class:
                fc = self.customize_form_widgets(self.form_class)
                params['form'] = fc
            if self.change_fields:
                params['fields'] = self.change_fields

            return model_forms.modelform_factory(self.model, **params)

    def get_formset_class(self, **kwargs):
        """
        Returns the formset for the queryset,
        if a form class is available.
        """
        form_class = self.get_formset_form_class()
        if form_class:
            kwargs['formfield_callback'] = self.formfield_for_dbfield
            return model_forms.modelformset_factory(self.model,
                        form_class, fields=self.change_fields, extra=0,
                        **kwargs)

    def _add_formset_id(self, data, queryset):
        q = None
        key = self.model._meta.pk.name
        for k, v in data.items():
            if k.endswith('-%s' % key):
                new_q = models.Q(**{key: v})
                if q:
                    q = q | new_q
                else:
                    q = new_q
        queryset = queryset.filter(q)
        return queryset

    def get_formset(self, data=None, queryset=None):
        """
        Returns an instantiated FormSet if available.
        If `self.can_submit` is False then no formset
        is returned.
        """
        if not self.can_submit:
            return None

        FormSet = self.get_formset_class()
        if queryset is None:
            queryset = self.get_queryset()

        if FormSet:
            if data:
                queryset = self._add_formset_id(data, queryset)
            return FormSet(data, queryset=queryset)

    def get_visible_fields(self, formset):
        """
        Returns a list of visible fields. This
        are all the fields in `self.display_fields`
        plus any visible fields in the given formset
        minus any hidden fields in the formset.
        """

        visible_fields = list(self.display_fields)
        if formset:
            for x in formset.empty_form.visible_fields():
                if not x.name in visible_fields:
                    visible_fields.append(x.name)

            for x in formset.empty_form.hidden_fields():
                if x.name in visible_fields:
                    visible_fields.remove(x.name)

        return visible_fields

    def _get_query_string(self, request, exclude_page=True):
        qs = request.GET.copy()
        if 'page' in qs and exclude_page:
            qs.pop('page')

        return '?%s&' % qs.urlencode() if qs else '?'

    def _sort_queryset(self, object_list, sort_field, order_type):
        sort_field = helpers.get_sort_field(sort_field, object_list.model)

        if order_type and sort_field:
            if order_type == helpers.AdminList.ASC:
                queryset = self.object_list.order_by(sort_field)
            else:
                queryset = self.object_list.order_by('-' + sort_field)
        else:
            queryset = self.object_list
            if not queryset.ordered:
                queryset = self.object_list.order_by('-pk')

        return queryset

    def _paginate_queryset(self, queryset):
        page_size = self.get_paginate_by(queryset)
        paginator = None
        if page_size:
            paginator, page, queryset, is_paginated = self.paginate_queryset(
                queryset, page_size)
            is_paginated = True
        else:
            page = None
            is_paginated = False
        return is_paginated, page, paginator, queryset

    def get_list_data(self, request, **kwargs):
        """
        Returns the data needed for displaying the list.
        Returns a dictionary that should be treating as
        context with the following arguments:

        * **list** - The list of data to be displayed. This is \
        an instance of a wrapper class that combines the queryset \
        and formset and provides looping and labels and sorting controls.
        * **filter_form** - An instance of your filter form.
        * **is_paginated** - Is this list paginated, True or False.
        * **paginator** - The paginator object if available.
        * **page_obj** - A pagination object if available.
        * **show_form** - Should the rendering template show form controls.
        """

        self.object_list = self.get_queryset()
        self._verify_list()

        sort_field = None
        order_type = None
        if self.can_sort:
            sort_field = request.GET.get('sf')
            order_type = request.GET.get('ot', helpers.AdminList.ASC)

        queryset = self._sort_queryset(self.object_list, sort_field,
                                       order_type)

        if self.request.method == 'POST' and self.can_submit:
            formset = self.get_formset(data=self.request.POST, queryset=queryset)
            is_paginated, page, paginator, queryset = self._paginate_queryset(queryset)
        else:
            is_paginated, page, paginator, queryset = self._paginate_queryset(queryset)
            formset = self.get_formset(queryset=queryset)

        visible_fields = self.get_visible_fields(formset)
        adm_list = helpers.AdminList(formset, queryset, visible_fields,
                                       sort_field, order_type,
                                       self.model_name)

        data = {
            'list': adm_list,
            'filter_form': self.get_filter_form(),
            'page_obj': page,
            'is_paginated': is_paginated,
            'show_form': self.can_submit and formset is not None,
            'paginator': paginator
        }

        return data

    def get_context_data(self, **kwargs):
        """
        Get the context for this view. Adds the following values:

        * **query_string** - The querystring minus the current page.
        * **action_links** - The results of the `get_actions` method.
        """

        origin_qs = self._get_query_string(self.request, False)
        context = {
            'query_string': self._get_query_string(self.request),
            'origin_qs': self.request.path + origin_qs,
            'origin_var': self.ORIGIN_ARGUMENT,
            'action_links': self.get_actions()
        }
        context.update(kwargs)

        return context

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests. If there is
        a GET parameter type=choice, then the render_type
        will be set to 'choices' to return a JSON version
        of this list. Calls `render` with the data from the
        `get_list_data` method as context.
        """

        if request.GET.get('type') == 'choices':
            self.render_type = 'choices'
            self.can_submit = False

        data = self.get_list_data(request, **kwargs)
        return self.render(request, **data)

    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests.
        If the formset is valid this will
        loop through the formset and save each form.
        A log is generated for each save. The user
        is notified of the total number of changes
        with a message. Returns a 'render redirect' to
        the current url.

        TODO: These formsets suffer from the same potential concurrency
        issues that the django admin has. This is caused by some issues
        with django formsets and concurrent users editing the same
        objects.
        """

        data = self.get_list_data(request, **kwargs)

        l = data.get('list')
        formset = None
        if l and l.formset:
            formset = l.formset

        url = self.request.build_absolute_uri()
        if formset and formset.is_valid():
            changecount = 0
            with transaction.commit_on_success():
                for form in formset.forms:
                    if form.has_changed():
                        obj = form.save()
                        changecount += 1
                        self.log_action(obj, CMSLog.SAVE, url=url,
                                        update_parent=changecount == 1)

            return self.render(request, redirect_url=url,
                           message="%s items updated" % changecount,
                           collect_render_data=False)
        else:
            return self.render(request, **data)


class PublishView(ModelCMSMixin, SingleObjectMixin, ModelCMSView):
    """
    View for publishing an object. Inherits from
    ModelCMSMixin, SingleObjectMixin, ModelCMSView.
    Assumes the given model is versionable.

    :param default_template: Defaults to 'cms/publish.html'.
    :param redirect_to_view: Defaults to 'edit'.
    """

    default_template = 'cms/publish.html'
    redirect_to_view = "edit"
    form = WhenForm

    def get_object(self):
        """
        Get the object for publishing
        Raises a http404 error if the object is not found.
        """
        obj = super(PublishView, self).get_object()

        if not obj or not hasattr(obj, 'publish'):
            raise http.Http404

        return obj

    def get_object_url(self):
        """
        Returns the url to link to the object
        The get_view_url will be called on the current bundle using
        'edit` as the view name.
        """
        return self.bundle.get_view_url('edit',
                                        self.request.user, {}, self.kwargs)

    def get_done_url(self):
        """
        Returns the url to redirect to after a successful update.
        The get_view_url will be called on the current bundle using
        `self.redirect_to_view` as the view name.
        """
        url = self.bundle.get_view_url(self.redirect_to_view,
                                        self.request.user, {}, self.kwargs)
        return self.customized_return_url(url)

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests. Passes the
        following arguments to the context:

        * **obj** - The object to publish.
        * **form** - An instance of WhenForm.
        * **done_url** - The result of the `get_done_url` method.
        """

        self.object = self.get_object()
        return self.render(request, obj=self.object, form=self.form(),
                           done_url=self.get_done_url())

    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests. Publishes
        the object passing the value of 'when' to the object's
        publish method. The object's `purge_archives` method
        is also called to limit the number of old items
        that we keep around. The action is logged as either
        'published' or 'scheduled' depending on the value of
        'when', and the user is notified with a message.

        Returns a 'render redirect' to the result of the
        `get_done_url` method.
        """

        self.object = self.get_object()
        form = self.form()
        url = self.get_done_url()
        if request.POST.get('publish'):
            form = self.form(request.POST)
            if form.is_valid():
                when = form.cleaned_data.get('when')
                self.object.publish(user=request.user, when=when)
                self.object.purge_archives()
                object_url = self.get_object_url()
                if self.object.state == self.object.PUBLISHED:
                    self.log_action(
                        self.object, CMSLog.PUBLISH, url=object_url)
                else:
                    self.log_action(
                        self.object, CMSLog.SCHEDULE, url=object_url)

                message = "%s %s" % (self.object, self.object.state)
                self.write_message(message=message)

                return self.render(request, redirect_url=url,
                           message=message,
                           obj=self.object,
                           collect_render_data=False)
        return self.render(request, obj=self.object, form=form, done_url=url)


class UnPublishView(PublishView):
    """
    View for unpublishing an object. Inherits from PublishView.

    :param default_template: 'cms/unpublish.html'.
    :param redirect_to_view: 'edit'.
    """

    default_template = 'cms/unpublish.html'
    redirect_to_view = "edit"

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests. Passes the
        following arguments to the context:

        * **obj** - The object to publish
        * **done_url** - The result of the `get_done_url` method
        """

        self.object = self.get_object()
        return self.render(request, obj=self.object,
                           done_url=self.get_done_url())

    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests. Unpublishes the
        the object by calling the object's unpublish method.
        The action is logged, the user is notified with a
        message. Returns a 'render redirect' to the result of
        the `get_done_url` method.
        """

        self.object = self.get_object()
        url = self.get_done_url()
        if request.POST.get('unpublish'):
            self.object.unpublish()
            object_url = self.get_object_url()
            self.log_action(self.object, CMSLog.UNPUBLISH, url=object_url)
            msg = self.write_message(message="%s unpublished" % (self.object))
            return self.render(request, redirect_url=url,
                       message=msg,
                       obj=self.object,
                       collect_render_data=False)

        return self.render(request, obj=self.object, done_url=url)


class VersionsList(PublishView):
    """
    View for deleting and reverting to previous versions.
    Inherits from PublishView.

    :param default_template: 'cms/versions.html'.
    :param redirect_to_view: 'edit'.
    """

    default_template = 'cms/versions.html'
    redirect_to_view = "edit"

    def _get_versions(self):
        self.object = self.get_object()
        klass = self.object.get_version_class()
        return klass.normal.filter(object_id=self.object.pk).exclude(
                                state=klass.DRAFT).order_by('-date_published')

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests. Passes the
        following arguments to the context:

        * **versions** - The versions available for this object.\
        These will be instances of the inner version class, and \
        will not have access to the fields on the base model.
        * **done_url** - The result of the `get_done_url` method.
        """
        versions = self._get_versions()
        return self.render(request, obj=self.object, versions=versions,
                           done_url=self.get_done_url())

    def revert(self, version, url):
        """
        Set the given version to be the active draft.
        This is done by calling the object's `make_draft` method.
        Logs the revert as a 'save' and messages the user.
        """
        message = "Draft replaced with %s version. This revert has not been published." % version.date_published
        version.make_draft()

        # Log action as a save
        self.log_action(self.object, CMSLog.SAVE, url=url)
        return self.write_message(message=message)

    def delete(self, version):
        """
        Deletes the given version, not the object itself.
        No log entry is generated but the user is notified
        with a message.
        """
        # Shouldn't be able to delete live or draft version
        if version.state != version.DRAFT and \
                      version.state != version.PUBLISHED:
            version.delete()
            message = "%s version deleted." % version.date_published
            return self.write_message(message=message)

    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests.
        Expects the 'vid' of the version to act on
        to be passed as in the POST variable 'version'.

        If a POST variable 'revert' is present this will
        call the revert method and then return a 'render
        redirect' to the result of the `get_done_url` method.

        If a POST variable 'delete' is present this will
        call the delete method and return a 'render redirect'
        to the result of the `get_done_url` method.

        If this method receives unexpected input, it will
        silently redirect to the result of the `get_done_url`
        method.
        """

        versions = self._get_versions()
        url = self.get_done_url()
        msg = None

        try:
            vid = int(request.POST.get('version', ''))
            version = versions.get(vid=vid)
            if request.POST.get('revert'):
                object_url = self.get_object_url()
                msg = self.revert(version, object_url)
            elif request.POST.get('delete'):
                msg = self.delete(version)
                # Delete should redirect back to itself
                url = self.request.build_absolute_uri()

        # If the give version isn't valid we'll just silently redirect
        except (ValueError, versions.model.DoesNotExist):
            pass

        return self.render(request, redirect_url=url,
                   message=msg,
                   obj=self.object,
                   collect_render_data=False)
