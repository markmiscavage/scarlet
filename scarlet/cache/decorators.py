# -*- coding: utf-8 -*-
from functools import wraps

from django.utils.decorators import available_attrs
from django.middleware.cache import CacheMiddleware

class CacheMethodResponse(object):
    """
    Decorator that can be used to cache a method of a
    class that implements CacheMixin
    """

    def __call__(self, func):
        this = self
        @wraps(func, assigned=available_attrs(func))
        def inner(self, request, *args, **kwargs):
            response = None
            self.cache_middleware = None
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
                response = func(self, request, *args, **kwargs)

            return self._finalize_cached_response(request, response)
        return inner

cache_method_response = CacheMethodResponse
