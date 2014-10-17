from django.core import cache as settings_cache

class CacheRouter(object):

    cache = None

    def __new__(self, *args, **kwargs):
        self.cache = settings_cache.get_cache('default')

    def get_cache(self, route_group=None, **kwargs):
        return self.cache
