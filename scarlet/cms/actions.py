from django import http
from django.views.generic.list import MultipleObjectMixin
from django.views.generic.detail import SingleObjectMixin
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import ProtectedError
from django.utils.decorators import classonlymethod
from django.utils.encoding import force_unicode

from . import renders
from . import transaction
from .forms import WhenForm
from .models import CMSLog
from .base_views import ModelCMSMixin, ModelCMSView


CHECKBOX_NAME = '_selected'


class ActionView(ModelCMSMixin, MultipleObjectMixin, ModelCMSView):
    """
    Base class for defining actions that can be executed on one \
    or many objects. An ActionView subclass that will be used as a 'mass \
    action' should be registered with the Bundle in the Meta class. \
    If it is going to be used as a single-item action, it should be \
    registered as an item_view in the same way. If an ActionView will be \
    used as both a mass action and a single-item action, it can simply be \
    registered as an action view.

        i.e. (in the Bundle)
            class Meta:
                action_views = ['action1', 'action2']

    The actions that appear in a specific ListView class can be specified \
    with the `action_view` kwarg. Any action that appears here should first\
    be registered with the bundle. Views will, by default, show all actions \
    that are registered to the bundle.

    If ListView formsets are also being used, selecting an action will \
    override any edits for the formset. A formset will still process \
    correctly if no action is selected.

    :param default_template: defaults to cms/action_confirmation.html.
    :param short_description: Description of action to display. \
    Defaults to the name of the view.
    :param redirect_to_view: Defaults to 'main'
    :param confirmation_message: Message that the intermediate \
    confirmation page will display to the user before action \
    is executed on multiple items.
    :param confirmation_message_single: Message that the intermediate \
    confirmation page will display to the user before action \
    is executed on a single item.
    """

    short_description = None
    redirect_to_view = 'main_list'
    confirmation_message = u'Please confirm that you want to {action_name} the following {bundle_name}:'
    confirmation_message_single = u'Please confirm that you want to {action_name} the {bundle_name}'
    default_template = 'cms/action_confirmation.html'

    object = None
    action_name = None

    def render(self, *args, **kwargs):
        if 'action' not in kwargs:
            if not self.action_name:
                kwargs['action'] = 'Yes'
            else:
                kwargs['action'] = self.action_name
        return super(ActionView, self).render(*args, **kwargs)

    def get_navigation(self):
        if not self.object and self.name not in self.bundle._meta.action_views:
            if self.bundle.parent:
                return self.bundle.parent.get_navigation(self.request,
                                                         **self.kwargs)
            return None
        return super(ActionView, self).get_navigation()

    def process_action(self, request, queryset):
        """
        Can be overriden to define the actions performed
        on the given queryset.
        Arguments are original request and queryset of
        objects to be modified by the action.

        :param request: Original HTTP request
        :param queryset: Queryset of objects to modify

        Returns render response. By default, a render redirect
        will be returned to the view specified by `redirect_to_view.`
        """
        pass

    def get_confirmation_message(self, queryset):
        confirmation_msg = ""
        if len(queryset) == 1:
            confirmation_msg = self.confirmation_message_single.format(
                    action_name=force_unicode(self.action_name).lower(),
                    bundle_name=force_unicode(self.bundle.get_single_title()).lower())
        else:
            confirmation_msg = self.confirmation_message.format(
                    action_name=force_unicode(self.action_name).lower(),
                    bundle_name=force_unicode(self.bundle.get_title()).lower())
        return confirmation_msg

    def get_context_data(self, **kwargs):
        """
        Hook for adding arguments to the context.
        """

        context = {'obj': self.object }
        if 'queryset' in kwargs:
            context['conf_msg'] = self.get_confirmation_message(kwargs['queryset'])
        context.update(kwargs)
        return context

    def get_object(self):
        """
        If a single object has been requested, will set
        `self.object` and return the object.
        """
        queryset = None
        slug = self.kwargs.get(self.slug_url_kwarg, None)

        if slug is not None:
            queryset = self.get_queryset()
            slug_field = self.slug_field
            queryset = queryset.filter(**{slug_field: slug})
            try:
                self.object = queryset.get()
            except ObjectDoesNotExist:
                raise http.Http404
        return self.object

    def write_message(self, status=messages.INFO, message=None):
        """
        Same behavior as parent, except defaults to the message
        "Saved" if no message is present.
        """
        if not message:
            message = "Saved."
        messages.add_message(self.request, status, message)
        return message

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

    def get_selected(self, request):
        """
        Returns a queryset of the selected objects as specified by \
        a GET or POST request.
        """
        obj = self.get_object()
        queryset = None
        # if single-object URL not used, check for selected objects
        if not obj:
            if request.GET.get(CHECKBOX_NAME):
                selected = request.GET.get(CHECKBOX_NAME).split(',')
            else:
                selected = request.POST.getlist(CHECKBOX_NAME)
        else:
            selected = [obj.pk]

        queryset = self.get_queryset().filter(pk__in=selected)
        return queryset

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests.
        Calls the `render` method with the following
        items in context:

        * **queryset** - Objects to perform action on
        """

        queryset = self.get_selected(request)
        return self.render(request, queryset = queryset)


    def post(self, request, *args, **kwargs):
        """
        Method for handling POST requests.
        Checks for a modify confirmation and performs
        the action by calling `process_action`.

        """
        queryset = self.get_selected(request)

        if request.POST.get('modify'):
            response = self.process_action(request, queryset)
            if not response:
                url = self.get_done_url()
                return self.render(request, redirect_url=url)
            else:
                return response
        else:
            return self.render(request, redirect_url=request.build_absolute_uri())

    def as_string(self, *args, **kwargs):
        if self.render_type == 'option':
            return self.short_description

        return super(ActionView, self).as_string(*args, **kwargs)

class DeleteActionView(ActionView):
    """
    View for deleting one or more objects.
    Inherits from ActionView.
    Used through out the CMS as the default object_header view so
    this view by default adds an `object_header` renderer that
    uses the `object_header_tmpl` template.

    :param redirect_to_view: Defaults to 'main_list'.
    """
    short_description = "Delete selected items"
    action_name = "Delete"

    def __init__(self, *args, **kwargs):
        super(DeleteActionView, self).__init__(*args, **kwargs)
        self.renders['object_header'] = renders.RenderString(
                                            template=self.object_header_tmpl)

    def process_action(self, request, queryset):
        """
        Deletes the object(s). Successful deletes are logged.
        Returns a 'render redirect' to the result of the
        `get_done_url` method.

        If a ProtectedError is raised, the `render` method
        is called with message explaining the error added
        to the context as `protected`.
        """
        count = 0
        try:
            with transaction.commit_on_success():
                for obj in queryset:
                    self.log_action(obj, CMSLog.DELETE)
                    count += 1
                    obj.delete()
            msg = "%s object%s deleted." % (count, ('' if count ==1 else 's'))
            url = self.get_done_url()
            return self.render(request, redirect_url=url, message = msg)
        except ProtectedError, e:
            protected = []
            for x in e.protected_objects:
                if hasattr(x, 'delete_blocked_message'):
                    protected.append(x.delete_blocked_message())
                else:
                    protected.append(u"%s - %s" % (x._meta.verbose_name, x))
            msg = "Cannot delete some objects because the following objects depend on them:"
            return self.render(request, error_msg = msg, errors = protected)

class PublishActionView(ActionView):
    """
    View for publishing an object. Inherits from
    ModelCMSMixin, SingleObjectMixin, ModelCMSView.
    Assumes the given model is versionable.

    :param default_template: Defaults to cms/publish_action.html.
    :param short_description: Defaults to 'Publish selected items'
    """

    default_template = 'cms/publish_action.html'
    short_description = 'Publish selected items'
    form = WhenForm
    action_name = "Publish"

    def get_object(self):
        """
        Get the object for publishing
        Raises a http404 error if the object is not found.
        """
        obj = super(PublishActionView, self).get_object()

        if obj:
            if not hasattr(obj, 'publish'):
                raise http.Http404

        return obj

    def get_object_url(self, obj):
        """
        Returns the url to link to the object
        The get_view_url will be called on the current bundle using
        'edit` as the view name.
        """
        return self.bundle.get_view_url('edit',
                                        self.request.user,
                                        {'object': obj},
                                        self.kwargs)

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests. Passes the
        following arguments to the context:

        * **queryset** - The queryset of objects to publish.
        * **publish_form** - An instance of WhenForm.
        """

        queryset = self.get_selected(request)
        return self.render(request, queryset=queryset, publish_form=self.form())


    def process_action(self, request, queryset):
        """
        Publishes the selected objects by passing the value of \
        'when' to the object's publish method. The object's \
        `purge_archives` method is also called to limit the number \
        of old items that we keep around. The action is logged as \
        either 'published' or 'scheduled' depending on the value of \
        'when', and the user is notified with a message.

        Returns a 'render redirect' to the result of the \
        `get_done_url` method.
        """
        form = self.form(request.POST)
        if form.is_valid():
            when = form.cleaned_data.get('when')
            count = 0
            for obj in queryset:
                count += 1
                obj.publish(user=request.user, when=when)
                obj.purge_archives()
                object_url = self.get_object_url(obj)
                if obj.state == obj.PUBLISHED:
                    self.log_action(
                        obj, CMSLog.PUBLISH, url=object_url)
                else:
                    self.log_action(
                       obj, CMSLog.SCHEDULE, url=object_url)
            message = "%s objects published." % count
            self.write_message(message=message)

            return self.render(request, redirect_url= self.get_done_url(),
                                message=message,
                                collect_render_data=False)
        return self.render(request, queryset=queryset, publish_form=form, action='Publish')

class UnPublishActionView(PublishActionView):
    """
    View for unpublishing one or more objects. \
    Inherits from PublishActionView.

    :param default_template: Defaults to cms/publish_action.html.
    :param redirect_to_view: Defaults to 'Unpublish selected items'
    """

    short_description = 'Unpublish selected items'
    action_name = "Unpublish"

    def get(self, request, *args, **kwargs):
        """
        Method for handling GET requests. Passes the
        following arguments to the context:

        * **queryset** - The queryset of objects to unpublish.
        """

        queryset = self.get_selected(request)
        return self.render(request, queryset=queryset, action='Unpublish')

    def process_action(self, request, queryset):
        """
        Unpublishes the selected objects by calling the object's \
        unpublish method. The action is logged and the user is \
        notified with a message.

        Returns a 'render redirect' to the result of the \
        `get_done_url` method.
        """
        count = 0
        for obj in queryset:
            count += 1
            obj.unpublish()
            object_url = self.get_object_url(obj)
            self.log_action(obj, CMSLog.UNPUBLISH, url=object_url)
        url = self.get_done_url()
        msg = self.write_message(message="%s objects unpublished." % count)
        return self.render(request, redirect_url=url,
                                message=msg,
                                collect_render_data=False)

# deprecated views
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
            except ProtectedError, e:
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
