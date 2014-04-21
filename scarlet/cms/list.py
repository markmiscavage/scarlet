from urllib import urlencode

from django import http
from django.views.generic.list import MultipleObjectMixin
from django.forms import models as model_forms
from django.db import models
from django.core.exceptions import ImproperlyConfigured

from . import fields
from . import helpers
from . import renders
from . import transaction
from . import widgets
from .actions import ActionView
from .forms import VersionFilterForm
from .models import CMSLog
from .base_views import ModelCMSMixin, ModelCMSView
from .actions import CHECKBOX_NAME


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

    action_views = None

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

    def get_back_bundle(self, start_bundle=None):
        return None

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


    def get_action_context(self, request):
        actions = []

        for action in self.action_views or self.bundle._meta.action_views:
            action_name = '{0}{1}'.format(action, self.bundle.action_alias)
            v, name = self.bundle.get_initialized_view_and_name(action_name,
                                                        **self.kwargs)
            url = self.bundle.get_view_url(action_name,
                                    request.user, url_kwargs=self.kwargs)
            if v and url:
                actions.append((url, v.action_name))

        return actions

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
            default = None
            default_order = helpers.AdminList.ASC
            if self.object_list.ordered:
                if self.object_list.query.order_by:
                    default = self.object_list.query.order_by[0]
                else:
                    default = self.object_list.model._meta.ordering[0]
                if default.startswith('-'):
                    default = default[1:]
                    default_order = helpers.AdminList.DESC

            sort_field = request.GET.get('sf', default)
            order_type = request.GET.get('ot', default_order)

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

        actions = self.get_action_context(request)
        data = {
            'list': adm_list,
            'filter_form': self.get_filter_form(),
            'page_obj': page,
            'is_paginated': is_paginated,
            'show_form': (self.can_submit and formset is not None),
            'paginator': paginator,
            'checkbox_name' : CHECKBOX_NAME,
            'actions' : actions,
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
        msg = None
        action = request.POST.get('actions', None)
        selected = request.POST.getlist(CHECKBOX_NAME)
        if not action == 'None' and action is not None:
            if len(selected) > 0:
                sel = {CHECKBOX_NAME : ','.join(selected)}
                qs = '?' + urlencode(sel)
                return self.render(request, redirect_url = action + qs)

        data = self.get_list_data(request, **kwargs)

        l = data.get('list')
        formset = None
        if l and l.formset:
            formset = l.formset

        url = self.request.build_absolute_uri()
        if formset:
            # Normally calling validate on a formset.
            # will result in a db call for each pk in
            # the formset regardless if the form has
            # changed or not.
            # To try to reduce queries only do a full
            # validate on forms that changed.
            # TODO: Find a way to not have to do
            # a pk lookup for any since we already
            # have the instance we want
            for form in formset.forms:
                if not form.has_changed():
                    form.cleaned_data = {}
                    form._errors = {}

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
            return self.render(request, message = msg, **data)
