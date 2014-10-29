from django.conf import settings
from django.core import cache
try:
    from django.utils.module_loading import import_string
except ImportError:
    try:
        from django.utils.module_loading import import_by_path as import_string
    except ImportError:
        from django.utils.importlib import import_module as import_string

class CacheRouter(object):

    def get_cache(self, **kwargs):
        return cache.get_cache(self.get_cache_name(**kwargs))

    def get_cache_name(self, **kwargs):
        return 'default'

def _get_router():
    if getattr(settings, 'CACHE_ROUTER', None):
        router = import_string(settings.CACHE_ROUTER)
        return router()
    else:
        return CacheRouter()

router = _get_router()
