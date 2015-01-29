try:
    try:
        from ..cms.views import SiteView as View
    except ValueError:
        from cms.views import SiteView as View
except ImportError:
    from django.views.generic import View

from django.middleware.cache import CacheMiddleware
from django.utils.cache import patch_response_headers, get_max_age, patch_vary_headers
from django.conf import settings
import router

class CacheMixin(object):

    def should_cache(self):
        """
        Hook for deciding if we want to cache this request or not.

        Default implementation checks that there is not a staff user
        logged in and that the allow_cache attribute has not been
        set to False.
        """
        return not self.request.user.is_staff and \
                    getattr(self, 'allow_cache', True)

    def set_do_not_cache(self):
        """
        Call this method to ensure that this request
        will not be cached when the response is returned.
        """

        self.allow_cache = False
        self.request._cache_update_cache = False

    def get_cache_version(self):
        """
        Hook for getting the version to use in our cache key

        Should use either a cache_manager or cache_group to get
        a version value.

        Raises
        ------
        NotImplementedError
            Unless overridden.

        """
        raise NotImplementedError('get_cache_version() must be overridden')

    def get_cache_route_group(self):
        """
        Hook for getting the route group for caches

        Should use the cache group to get the value

        By default it uses the default route group
        """
        return 'default'

    def get_cache_prefix(self, prefix=''):
        """
        Hook for any extra data you would like
        to prepend to your cache key.

        The default implementation ensures that ajax not non
        ajax requests are cached separately. This can easily
        be extended to differentiate on other criteria
        like mobile os' for example.
        """

        if settings.CACHE_MIDDLEWARE_KEY_PREFIX:
            prefix += settings.CACHE_MIDDLEWARE_KEY_PREFIX

        if self.request.is_ajax():
            prefix += 'ajax'

        return prefix

    def get_vary_headers(self, request, response):
        """
        Hook for patching the vary header
        """

        headers = []
        accessed = False
        try:
            accessed = request.session.accessed
        except AttributeError:
            pass

        if accessed:
            headers.append("Cookie")
        return headers

    def template_response_callback(self, response):
        if self.cache_middleware:
            response = self.cache_middleware.process_response(
                self.request, response)

        # We might want to cache for longer internally than we tell clients
        max_age = get_max_age(response)
        if max_age and self.max_age < max_age:
            # Remove headers so patch_response works
            for header in ('ETag', 'Last-Modified', 'Expires'):
                if response.has_header(header):
                    del response[header]
            patch_response_headers(response, self.max_age)
        return response

    def set_cache_middleware(self, cache_time, prefix):
        name = router.router.get_cache_name(prefix=prefix)
        self.cache_middleware = CacheMiddleware(cache_timeout=cache_time,
                                                  key_prefix=prefix,
                                                cache_alias=name)

    def _finalize_cached_response(self, request, response):
        headers = self.get_vary_headers(request, response)
        if headers:
            patch_vary_headers(response, headers)

        if hasattr(response, 'render') and callable(response.render):
            response.add_post_render_callback(self.template_response_callback)
        else:
            response = self.template_response_callback(response)
        return response


class CacheView(View, CacheMixin):
    """
    A class based view that overrides the default dispatch
    method to determine the cache_prefix.

    If the cms view is available this class will inherit from there
    otherwise it will inherit from django's generic class View.

    :param cache_time: How long should we cache this attribute. \
    This gets passed to django middleware and determines the \
    expiry of the actual cache. Defaults to 1 hour.

    :param max_age: Django will set the max_age header to match the \
    amount of time left before the cache will expire. \
    When using long caches that can be invalidated this is not ideal. \
    This will over ride that behavior ensuring that if django \
    tries to set a max_age header that is greater that whatever \
    you specify here it will be replaced by this value. Defaults to 0.
    """


    cache_time = 60 * 60
    max_age = 0

    def get_as_string(self, request, *args, **kwargs):
        """
        Should only be used when inheriting from cms View.

        Gets the response as a string and caches it with a
        separate prefix
        """

        value = None
        cache = None
        prefix = None
        if self.should_cache():
            prefix = "%s:%s:string" % (self.get_cache_version(),
                                self.get_cache_prefix())
            cache = router.router.get_cache(prefix)
            value = cache.get(prefix)

        if not value:
            value = super(CacheView, self).get_as_string(request, *args,
                                                         **kwargs)
            if self.should_cache() and value and \
                    getattr(self.request, '_cache_update_cache', False):
                cache.set(prefix, value, self.cache_time)

        return value

    def dispatch(self, request, *args, **kwargs):
        """
        Overrides Django's default dispatch to provide caching.

        If the should_cache method returns True, this will call
        two functions get_cache_version and get_cache_prefix
        the results of those two functions are combined and passed to
        the standard django caching middleware.
        """

        self.request = request
        self.args = args
        self.kwargs = kwargs
        self.cache_middleware = None
        response = None

        if self.should_cache():
            prefix = "%s:%s" % (self.get_cache_version(),
                                self.get_cache_prefix())

            # Using middleware here since that is what the decorator uses
            # internally and it avoids making this code all complicated with
            # all sorts of wrappers.
            self.set_cache_middleware(self.cache_time, prefix)
            response = self.cache_middleware.process_request(self.request)
        else:
            self.set_do_not_cache()

        if not response:
            response = super(CacheView, self).dispatch(self.request, *args,
                                                       **kwargs)

        return self._finalize_cached_response(request, response)
