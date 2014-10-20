from django.contrib import settings
from django.core import cache


class CacheRouter(object):

    def get_cache(self, route_group='default', *kwargs):
        return cache.get_cache('default')



class MultiRouter(object):

    cache_router = None

    def __new__(cls, *args, **kwargs):
        if settings.CACHE_ROUTER:
            router = __import__(settings.CACHE_ROUTER)
            cls._router = router
        else:
            cls._router = CacheRouter

    @classmethod
    def router(self):
        return self.cache_router


