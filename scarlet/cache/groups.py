import router

class CacheConfig(object):
    ALL = 'all'
    return_all = False

    def __init__(self, values, instance_values):
        self.values = values and values or []
        self.instance_values = instance_values and instance_values or []


class CacheGroup(object):
    """
    Tracks versions for a collection of models.

    Each instance has a primary version and as many
    secondary versions as you need.

    Secondary versions are automatically cleared when the
    primary version is incremented.

    :param key: This should be unique as this will be used \
    to prefix all version values for this group in your cache.

    :param cache_name: The name of the cache you would like to \
    use. Defaults to DEFAULT_CACHE_ALIAS.

    :param version_expiry: How long before the version expires. \
    default is 30 days. This needs to be at least twice \
    as long as the longest lasting cache entry.
    """

    def __init__(self, key=None, version_expiry=None):
        assert key
        self.key = key

        self.route_group = 'default'

        # Version expiry needs to be at least twice
        # as long as the longest lasting cache entry
        self.version_expiry = version_expiry
        if not self.version_expiry:
            self.version_expiry = 60 * 60 * 24 * 30
        self._models = {}

    def _get_cache(self, key):
        return router.router.get_cache(route_group=self.route_group,
                                           key=key)

    def register_models(self, *models, **kwargs):
        """
        Register multiple models with the same
        arguments.

        Calls register for each argument passed along with
        all keyword arguments.
        """

        for model in models:
            self.register(model, **kwargs)

    def register(self, model, values=None, instance_values=None):
        """
        Registers a model with this group.

        :param values: A list of values that should be incremented \
        whenever invalidate_cache is called for a instance or class \
        of this type.

        :param instance_values: A list of attribute names that will \
        be looked up on the instance of this model that is passed to \
        invalidate_cache. The value resulting from that lookup \
        will then be incremented.
        """

        if model in self._models:
            raise Exception("%s is already registered" % model)

        self._models[model] = CacheConfig(values, instance_values)

    def _get_models(self):
        return self._models.keys()
    models = property(_get_models)

    def _get_cache_extras(self, klass, instance=None, extra=None,
                         force_all=False):
        # Return the extra keys for this klass instance combo
        # Return self.ALL to use the main version.
        if force_all:
            return CacheConfig.ALL

        config = self._models.get(klass)
        result = None

        if config:
            if not config.instance_values and not config.values:
                result = CacheConfig.ALL
            else:
                result = list(config.values)
                for value in config.instance_values:
                    if hasattr(instance, value):
                        result.append(getattr(instance, value))

                if extra:
                    result.extend(extra)

        return result

    def invalidate_cache(self, klass, instance=None, extra=None,
                         force_all=False):
        """
        Use this method to invalidate keys related to a particular
        model or instance. Invalidating a cache is really just
        incrementing the version for the right key(s).

        :param klass: The model class you are invalidating. If the given \
        class was not registered with this group no action will be taken.

        :param instance: The instance you want to use with the registered\
        instance_values. Usually the instance that was just saved. \
        Defaults to None.

        :param extra: A list of extra values that you would like incremented \
        in addition to what was registered for this model.

        :param force_all: Ignore all registered values and provided \
        arguments and increment the major version for this group.
        """

        values = self._get_cache_extras(klass, instance=instance,
                                        extra=extra, force_all=force_all)

        if values == CacheConfig.ALL:
            self._increment_version()
        elif values:
            for value in values:
                self._increment_version(extra=value)

    def _get_extra_key(self, extra):
        # An extra key is based on the main version
        # plus the extra value. So that if the main
        # version changes the keys do too.
        v = self._get_cache(self.key).get(self.key)
        if v == None:
            # Set the base key, otherwise extras
            # that are created first won't be flushed
            # with all.
            v = self._increment_version()

        return '%s.%s.%s' % (self.key, v, extra)

    def get_version(self, extra=None):
        """
        This will return a string that can be used as a prefix
        for django's cache key. Something like key.1 or key.1.2

        If a version was not found '1' will be stored and returned as
        the number for that key.

        If extra is given a version will be returned for that value.
        Otherwise the major version will be returned.

        :param extra: the minor version to get. Defaults to None.
        """

        if extra:
            key = self._get_extra_key(extra)
        else:
            key = self.key

        v = self._get_cache(key).get(key)
        if v == None:
            v = self._increment_version(extra=extra)

        return "%s.%s" % (key, v)

    def _increment_version(self, extra=None):
        # If we made this redis only we could switch to
        # using hashes to save memory. For now this is fine.
        if extra:
            key = self._get_extra_key(extra)
        else:
            key = self.key

        cache = self._get_cache(key)
        try:
            val = cache.incr(key)
            if val > 1000 * 1000:
                val = 0
                cache.set(key, val, timeout=self.version_expiry)
        except ValueError:
            val = 0
            cache.set(key, val, timeout=self.version_expiry)
        return val
