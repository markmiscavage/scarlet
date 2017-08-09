from scarlet.cache import cache_manager
from scarlet.cache.groups import CacheGroup

from . import models


CACHE_KEY = 'hotspot_module'
HOTSPOT_MODULE_DETAIL = 'hotspot_module_detail'


hotspot_module_cache = CacheGroup(CACHE_KEY)
hotspot_module_cache.register(models.HotSpotModule, values=[HOTSPOT_MODULE_DETAIL, ], instance_values=['slug'])


# Registering
cache_manager.register_cache(hotspot_module_cache)
