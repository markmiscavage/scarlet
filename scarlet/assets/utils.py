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


def get_size_filename(filename, size_name):
    filename, ext = os.path.splitext(filename)
    return filename + "_" + size_name + ext



def get_cache_bust_version(url):
    key = "cbversion.{0}".format(url)
    value = cache.get(key)
    if not value:
        # We could look it up but for now just make it up
        value = update_cache_bust_version(url, random.randint(0, 60))
    return value


def update_cache_bust_version(url, value=None):
    key = "cbversion.{0}".format(url)
    if not value:
        value = cache.get(key)
    if value:
        value = int(value) + 1
    else:
        value = 1
    cache.set(key, value, 60*60*24*60)
    return value
