from functools import wraps
import os
import random

from django.core.cache import cache

from . import settings

def partial(func, *parameters, **kparms):
    @wraps(func)
    def wrapped(*args, **kw):
        kw.update(kparms)
        return func(*(args + parameters), **kw)
    return wrapped

def assets_dir(instance, filename):
    name, ext = os.path.splitext(filename)
    if instance.rename_file():
        name = instance.slug
    if settings.DIRECTORY:
        return '/'.join([settings.DIRECTORY, name + ext])
    else:
        return instance.slug + ext

def asset_url(self, name, cbversion=None):
    url = ""
    f_obj = getattr(self, name)

    if f_obj:
        url = f_obj.url

        if settings.USE_CACHE_BUST:
            if not cbversion:
                if getattr(self, 'cbversion', None):
                    cbversion = getattr(self, 'cbversion')

            if not cbversion:
                cbversion = get_cache_bust_version(url)

    if cbversion:
        url = "{0}?v={1}".format(url, cbversion)

    return url

def get_cache_bust_version(url):
    key = "cbversion.{0}".format(url)
    value = cache.get(key)
    if not value:
        # We could look it up but for now just make it up
        value = update_cache_bust_version(url, random.randint(0, 60))
    return value

def update_cache_bust_version(url, value):
    key = "cbversion.{0}".format(url)
    cache.set(key, value, 60*60*24*60)
    return value
