from django.core import cache as settings_cache

class CacheRouter(object):

    cache = None

    def __init__(self, *args, **kwargs):
        self.cache = settings_cache.get_cache('default')

    def get_cache(self, route_group='default', **kwargs):
        return self.cache




class MultiRouter(object):

    cache_router = None

    def get_cache_router(self, *args, **kwargs):
        if self.cache_router:
            return self.cache_router
        self.cache_router = CacheRouter(*args, **kwargs)
        return self.cache_router
