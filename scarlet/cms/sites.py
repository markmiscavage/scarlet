from functools import update_wrapper
from django.http import HttpResponseRedirect
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.views.decorators.csrf import csrf_protect
from django.core.urlresolvers import reverse
from django.core.paginator import Paginator
from django.views.decorators.cache import never_cache
from django.template.response import TemplateResponse
from django.utils.translation import ugettext as _
from django import forms
from django.views.generic import TemplateView

from . import models
from . forms import BaseFilterForm

try:
    try:
        from ..versioning import manager
        from ..versioning.models import BaseVersionedModel
    except ValueError:
        from versioning import manager
        from versioning.models import BaseVersionedModel
except ImportError:
    manager = None

LOGIN_FORM_KEY = 'this_is_the_login_form'


class AlreadyRegistered(Exception):
    pass


class NotRegistered(Exception):
    pass


class AdminSite(object):
    """
    Heavily copied from django's admin site
    but instead of registering models
    we register CMSBundle objects.

    :param login_form: A Form class to use for the login form. \
    Defaults to django's AdminAuthenticationForm.
    :param login_template: Template for login page. Defaults to \
    'cms/login.html'.
    :param logout_template: Template for logout page. Defaults to \
    'cms/logged_out.html'.
    :param password_change_template: Template for password change page. \
    Defaults to 'cms/password_change_form.html'.
    :param password_change_done_template: Template displayed after \
    password is changed. Defaults to 'cms/password_change_done.html'.
    :param dashboard_template: Dashboard template. Defaults to \
    cms/dashboard.html.
    :param dashboard_home_url: Dashboard Homepage URL. Defaults to /admin/.
    """

    login_form = None
    login_template = None
    logout_template = None
    password_change_template = None
    password_change_done_template = None
    dashboard_template = None

    def __init__(self, name='default'):
        self._registry = {}
        self._model_registry = {}
        self._titles = {}
        self._order = {}
        self.name = name

    def register_model(self, model, bundle):
        """
        Registers a bundle as the main bundle for a
        model. Used when we need to lookup urls by
        a model.
        """
        if model in self._model_registry:
            raise AlreadyRegistered('The model %s is already registered' \
                                     % model)

        if bundle.url_params:
            raise Exception("A primary model bundle cannot have dynamic \
                            url_parameters")

        self._model_registry[model] = bundle

    def get_bundle_for_model(self, model):
        """
        Returns the main bundle for the given
        model
        """
        return self._model_registry.get(model)

    def unregister_model(self, model):
        """
        Unregisters the given model.
        """
        if model not in self._model_registry:
            raise NotRegistered('The model %s is not registered' % model)

        del self._model_registry[model]

    def register(self, slug, bundle, order=1, title=None):
        """
        Registers the bundle for a certain slug.

        If a slug is already registered, this will raise AlreadyRegistered.

        :param slug: The slug to register.
        :param bundle: The bundle instance being registered.
        :param order: An integer that controls where this bundle's \
        dashboard links appear in relation to others.
        """

        if slug in self._registry:
            raise AlreadyRegistered('The url %s is already registered' % slug)

        # Instantiate the admin class to save in the registry.
        self._registry[slug] = bundle
        self._order[slug] = order
        if title:
            self._titles[slug] = title
        bundle.set_admin_site(self)

    def unregister(self, slug):
        """
        Unregisters the given url.

        If a slug isn't already registered, this will raise NotRegistered.
        """

        if slug not in self._registry:
            raise NotRegistered('The slug %s is not registered' % slug)
        bundle = self._registry[slug]
        if bundle._meta.model and bundle._meta.primary_model_bundle:
            self.unregister_model(bundle._meta.model)

        del self._registry[slug]
        del self._order[slug]

    def has_permission(self, request):
        """
        Returns True if the given HttpRequest has permission to view
        *at least one* page in the admin site.

        Currently checks that the user is active and a staff member.
        """
        return request.user.is_active and request.user.is_staff

    def admin_view(self, view, cacheable=False):

        def inner(request, *args, **kwargs):
            if manager:
                manager.activate(BaseVersionedModel.DRAFT)
            if not self.has_permission(request):
                if request.path == reverse('admin:cms_logout', current_app=self.name):
                    index_path = reverse('admin:cms_index', current_app=self.name)
                    return HttpResponseRedirect(index_path)
                return self.login(request)
            return view(request, *args, **kwargs)
        if not cacheable:
            inner = never_cache(inner)
        # We add csrf_protect here so this function can be used as a utility
        # function for any view, without having to repeat 'csrf_protect'.
        if not getattr(view, 'csrf_exempt', False):
            inner = csrf_protect(inner)
        return update_wrapper(inner, view)

    def get_urls(self):
        from django.conf.urls import patterns, url, include

        def wrap(view, cacheable=False):
            def wrapper(*args, **kwargs):
                return self.admin_view(view, cacheable)(*args, **kwargs)
            return update_wrapper(wrapper, view)

        # Admin-site-wide views.
        urlpatterns = patterns('',
            url(r'^$',
                wrap(self.index),
                name='cms_index'),
            url(r'^logout/$',
                wrap(self.logout),
                name='cms_logout'),
            url(r'^password_change/$',
                wrap(self.password_change, cacheable=True),
                name='cms_password_change'),
            url(r'^password_change/done/$',
                wrap(self.password_change_done, cacheable=True),
                name='cms_password_change_done'),
        )

        # Add in each model's views.
        for base, bundle in self._registry.iteritems():
            urlpatterns += patterns('',
                url(r'^%s/' % base, include(bundle.get_urls()))
            )
        return urlpatterns

    @property
    def urls(self):
        return self.get_urls(), 'admin', self.name

    def password_change(self, request):
        """
        Handles the "change password" task -- both form display and validation.

        Uses the default auth views.
        """
        from django.contrib.auth.views import password_change
        url = reverse('admin:cms_password_change_done', current_app=self.name)
        defaults = {
            'post_change_redirect': url,
            'template_name': 'cms/password_change_form.html',
            'current_app': self.name,
        }
        if self.password_change_template is not None:
            defaults['template_name'] = self.password_change_template
        return password_change(request, **defaults)

    def password_change_done(self, request, extra_context=None):
        """
        Displays the "success" page after a password change.
        """
        from django.contrib.auth.views import password_change_done
        defaults = {
            'extra_context': extra_context or {},
            'template_name': 'cms/password_change_done.html',
            'current_app': self.name,
        }
        if self.password_change_done_template is not None:
            defaults['template_name'] = self.password_change_done_template
        return password_change_done(request, **defaults)

    @never_cache
    def logout(self, request, extra_context=None):
        """
        Logs out the user for the given HttpRequest.

        This should *not* assume the user is already logged in.
        """
        from django.contrib.auth.views import logout
        defaults = {
            'extra_context': extra_context or {},
            'template_name': 'cms/logged_out.html',
            'current_app': self.name,
        }
        if self.logout_template is not None:
            defaults['template_name'] = self.logout_template
        return logout(request, **defaults)

    @never_cache
    def login(self, request, extra_context=None):
        """
        Displays the login form for the given HttpRequest.
        """
        from django.contrib.auth.views import login
        context = {
            'title': _('Log in'),
            'app_path': request.get_full_path(),
            REDIRECT_FIELD_NAME: request.get_full_path(),
        }
        context.update(extra_context or {})
        defaults = {
            'extra_context': context,
            'authentication_form': self.login_form or AdminAuthenticationForm,
            'template_name': self.login_template or 'cms/login.html',
        }
        return login(request, **defaults)

    def get_dashboard_urls(self, request):
        nav = []
        for k in sorted(self._order, key=self._order.get):
            v = self._registry[k]
            urls = v.get_dashboard_urls(request)
            if urls:
                title = self._titles.get(k, v.get_title())
                nav.append((title, urls, v.name))
        return nav

    def get_dashboard_blocks(self, request):
        blocks = []
        for k in sorted(self._order, key=self._order.get):
            v = self._registry[k]
            block = v.get_dashboard_block(request)
            if block:
                title = self._titles.get(k, v.get_title())
                blocks.append((title, block))
        return blocks

    def _get_allowed_sections(self, dashboard):
        """
        Get the sections to display based on dashboard
        """

        allowed_titles = [x[0] for x in dashboard]
        allowed_sections = [x[2] for x in dashboard]
        return tuple(allowed_sections), tuple(allowed_titles)

    @never_cache
    def index(self, request, extra_context=None):
        """
        Displays the dashboard. Includes the main
        navigation that the user has permission for as well
        as the cms log for those sections. The log list can
        be filtered by those same sections
        and is paginated.
        """

        dashboard = self.get_dashboard_urls(request)
        dash_blocks = self.get_dashboard_blocks(request)

        sections, titles = self._get_allowed_sections(dashboard)
        choices = zip(sections, titles)
        choices.sort(key=lambda tup: tup[1])
        choices.insert(0, ('', 'All'))

        class SectionFilterForm(BaseFilterForm):
            section = forms.ChoiceField(required=False, choices=choices)

        form = SectionFilterForm(request.GET)
        filter_kwargs = form.get_filter_kwargs()

        if not filter_kwargs and not request.user.is_superuser:
            filter_kwargs['section__in'] = sections
        cms_logs = models.CMSLog.objects.filter(**filter_kwargs
                                                ).order_by('-when')

        template = self.dashboard_template or 'cms/dashboard.html'

        paginator = Paginator(cms_logs[:20 * 100], 20,
                              allow_empty_first_page=True)
        page_number = request.GET.get('page') or 1
        try:
            page_number = int(page_number)
        except ValueError:
            page_number = 1

        page = paginator.page(page_number)

        return TemplateResponse(request, [template], {
                            'dashboard': dashboard, 'blocks': dash_blocks,
                            'page': page, 'bundle' : self._registry.values()[0],
                            'form': form}, current_app = self.name)

# This global object represents the default admin site, for the common case.
# You can instantiate AdminSite in your own code to create a custom admin site.
site = AdminSite()
