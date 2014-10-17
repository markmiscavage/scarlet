from django.core import cache

class CacheRouter(object):

    def get_cache(self, route_group=None, **kwargs):
        c = cache.get_cache('default')
        return c
