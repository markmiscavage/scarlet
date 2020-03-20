from django.middleware.cache import CacheMiddleware
from django.utils.cache import patch_response_headers, get_max_age
from models import FancyModel
from django.http import HttpResponse
from django.core import serializers
from cache.manager import cache_manager


def fancy_view(request):
    cache_version = cache_manager.get_group("fancy_model").get_version("content")
    response = process_request(request, cache_version)
    if response:
        return response
    data = serializers.serialize("xml", FancyModel.objects.all())
    response = HttpResponse(data)
    response = process_response(request, response, cache_version)
    return response


def process_request(req, prefix, cache_time=60 * 60):
    # retrieve the cache using the django's CacheMiddleware
    cache_middleware = CacheMiddleware(cache_timeout=cache_time, key_prefix=prefix)
    response = cache_middleware.process_request(req)
    # if no cache is found, return false
    if not response:
        return False
    return response


def process_response(req, res, prefix, cache_time=60 * 60):
    # update the cache using the django's CacheMiddleware
    cache_middleware = CacheMiddleware(cache_timeout=cache_time, key_prefix=prefix)
    response = cache_middleware.process_response(req, res)
    # update some header to prevent wrong client caching
    max_age = get_max_age(response)
    if max_age and max_age < max_age:
        # Remove headers so patch_response works
        for header in ("ETag", "Last-Modified", "Expires"):
            if response.has_header(header):
                del response[header]
        patch_response_headers(response, max_age)
    return response
