import json

from django.shortcuts import render_to_response
from django.template.loader import  render_to_string
from django.template import RequestContext
from django.core.serializers.json import DjangoJSONEncoder
from django.template.defaultfilters import slugify
from django.utils.encoding import force_unicode
from django import http

#import serializer

class RenderResponse(object):
    """
    Render a template. Doesn't do anything special with css/js
    as per current front end direction.

    :param template: The template to render.
    :param partial_base: The template to use as a base for \
    partial rendering. IE: ajax requests.
    :param base: The template to use a the base template.
    """

    template = None
    base = 'base.html'
    partial_base = 'partial.html'

    def __init__(self, **kwargs):
        # Go through keyword arguments and save to instance
        for key, value in kwargs.iteritems():
            setattr(self, key, value)

    def get_context_instance(self, request, **kwargs):
        current_app = kwargs.get('current_app')
        return RequestContext(request, current_app=current_app)

    def update_kwargs(self, request, **kwargs):
        """
        Hook for adding data to the context before
        rendering a template.

        :param kwargs: The current context keyword arguments.
        :param request: The current request object.
        """
        if not 'base' in kwargs:
            kwargs['base'] = self.base
            if request.is_ajax() or request.GET.get('json'):
                kwargs['base'] = self.partial_base

        return kwargs

    def render(self, request, redirect_url=None, **kwargs):
        """
        Uses `self.template` to render a response.

        :param request: The current request object.
        :param redirect_url: If given this will return the \
        redirect method instead of rendering the normal template. \
        Renders providing this argument are referred to as a \
        'render redirect' in this documentation.
        :param kwargs: The current context keyword arguments.
        """
        if redirect_url:
            return self.redirect(request, redirect_url, **kwargs)

        kwargs = self.update_kwargs(request, **kwargs)
        context_instance=self.get_context_instance(request, **kwargs)
        return render_to_response(self.template, kwargs,
                        context_instance=context_instance)

    def redirect(self, request, url, **kwargs):
        """
        Hook for changing redirect behavior. Should
        return a HttpResponse object. Default implementation
        redirects to the given url.

        :param request: The current request object.
        :param url: The url to redirect to.
        :param kwargs: The current context keyword arguments.
        """
        return http.HttpResponseRedirect(url)

class CMSRender(RenderResponse):
    """
    Render a template to use in the cms application. Inherits
    from RenderResponse. Used by most CMS views.
    """

    def update_kwargs(self, request, **kwargs):
        """
        Adds variables to the context that are expected by the
        base cms templates.

        * **navigation** - The side navigation for this bundle and user.
        * **dashboard** - The list of dashboard links for this user.
        * **object_header** - If no 'object_header' was passed in the \
        current context and the current bundle is set to get it's \
        object_header from it's parent, this will get that view and render \
        it as a string. Otherwise 'object_header will remain unset.
        * **subitem** - This is set to true if we rendered a new object_header \
        and the object used to render that string is not present in the \
        context args as 'obj'. This effects navigation and wording in the \
        templates.
        """

        kwargs = super(CMSRender, self).update_kwargs(request, **kwargs)

        # Check if we need to to include a separate object
        # bundle for the title
        bundle = kwargs.get('bundle')
        url_kwargs = kwargs.get('url_params')
        view = None
        if bundle:
            view, name = bundle.get_object_header_view(request,
                                                 url_kwargs,
                                                 parent_only=True)

        kwargs['dashboard'] = bundle.admin_site.get_dashboard_urls(request)

        if view:
            obj = view.get_object()
            if not 'object_header' in kwargs:
                kwargs['object_header'] = bundle._render_view_as_string(view,
                                                    name, request, url_kwargs)
            if obj and obj != kwargs.get('obj'):
                kwargs['subitem'] = True
        return kwargs


class ChoicesRender(object):
    """
    A Renderer meant to render an object list view as JSON.
    Used by ListView when called with ?type=choices.
    """

    def get_different_page(self, request, page):
        """
        Returns a url that preserves the current querystring
        while changing the page requested to `page`.
        """

        if page:
            qs = request.GET.copy()
            qs['page'] = page
            return "%s?%s" % (request.path_info, qs.urlencode())
        return None

    def get_label_attr(self, label):
        attr = label.attr
        if label.attr == '__unicode__':
            attr = force_unicode(slugify(label.name))
        if hasattr(attr, '__call__'):
            attr = attr.__name__
        return attr

    def get_object_list(self, adm_list):
        l = []
        labels = list(adm_list.labels())
        for row in adm_list:
            data = {
                'id': row.instance.pk,
            }

            for label in labels:
                d = row.get_value(label.attr, 1)
                if callable(d):
                    d = d()
                data[self.get_label_attr(label)] = force_unicode(d)
            l.append(data)
        return l

    def get_fields(self, adm_list):
        data = {}
        for label in adm_list.labels():
            data[self.get_label_attr(label)] = {
                'name': force_unicode(label.name),
                'sortable': label.sortable,
                'order_type': label.order_type
            }
        return data

    def render(self, request, **kwargs):
        """
        Returns a JSON representation of a objects list page.
        The json has the following attributes:

        * **is_paginated** - Is the list paginated.
        * **results** - A list of objects, where each object has an \
        attribute/value for each field in the list. An 'id' attribute \
        is always included.
        * **fields** - An object who's properties are the fields \
        in the results list. Each property will have an object with \
        the the following attributes:
            * **name** - The verbose name of the field.
            * **sortable** - Can this column be sorted. True or False.
            * **order_type** - What is the current order of this column.

        The following attributes only appear if the list is paginated:

        * **count** - If the list is paginated, how many objects \
        total are there.
        * **page** - Current page number.
        * **next** - The full link to the next page.
        * **previous** - The full link to the previous page.

        If the list can be filtered the following attribute is included:

        * **params** - An object who's properties are the filter options. \
            Each property contains an object with the following attributes:
            * **value** - If the current result list has been filtered by \
            this field then value will contain the filter value that was used.
            * **choices** - If the field is a choice field this will contain \
            the options.

        Example JSON:

        ::

            {"count": 1,
            "fields": {
                "name": {"sortable": true, "name": "name", "order_type": "asc"}
            },
            "results": [{"id": 12, "name": "Test"}],
            "next": "",
            "params": {"name": {"value": null}},
            "is_paginated": true,
            "page": 1,
            "previous": ""}
        """
        data = {
            'is_paginated': kwargs.get('is_paginated')
        }

        if data.get('is_paginated'):
            page = kwargs['page_obj']

            next_p = ''
            previous = ''
            if page.has_next():
                next_p = self.get_different_page(request, page.number + 1)

            if page.has_previous():
                previous = self.get_different_page(request, page.number - 1)

            data.update({
                'count': page.paginator.count,
                'page': page.number,
                'next': next_p,
                'previous': previous,
            })

        if kwargs.get('filter_form'):
            exclude = request.GET.getlist('exclude')
            filter_form = {}
            form = kwargs.get('filter_form')
            for name in form.get_search_fields(exclude):
                k = form[name]
                obj = {}
                obj['value'] = k.value()
                obj['label'] = k.label
                if hasattr(k.field, 'choices'):
                    obj['choices'] = k.field.choices

                filter_form[k.name] = obj

            data['params'] = filter_form

        adm_list = kwargs['list']
        data['fields'] = self.get_fields(adm_list)
        data['results'] = self.get_object_list(adm_list)
        return http.HttpResponse(json.dumps(data, cls=DjangoJSONEncoder))


class RenderString(RenderResponse):
    """
    A Renderer that returns a rendered string instead of
    a HttpResponse object. Inherits from RenderResponse.
    Used by CMS views when called with render_type = 'string'.
    """

    def render(self, request, **kwargs):
        kwargs = self.update_kwargs(request, **kwargs)
        context_instance=self.get_context_instance(request, **kwargs)
        return render_to_string(self.template, kwargs,
                                context_instance=context_instance)

class PopupRender(RenderResponse):
    """
    A Renderer that forces a special popup base template to be
    used. Returns a rendered response when a redirect is requested
    instead of redirecting to the given url. Used by FormView when called
    with ?popup=1.

    :param base: The popup only base template.
    :param redirect_template: The template to use for redirect renders.
    """

    base = 'cms/base_popup.html'
    redirect_template = 'cms/popup_redirect.html'

    def update_kwargs(self, request, **kwargs):
        kwargs['base'] = self.base
        return kwargs

    def redirect(self, request, url, **kwargs):
        context_instance=self.get_context_instance(request, **kwargs)
        return render_to_response(self.redirect_template, kwargs,
                                  context_instance=context_instance)
