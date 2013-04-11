from .groups import CacheGroup


class CacheManager(object):
    """
    A CacheManager is where you register all the cache groups
    that you are tracking.

    Similar to the django admin, most implementations would only
    have one instance of this class that all managers would be
    registered with. If you don't need any customizations you can
    simply register with the default instance
    """

    _registry = {}

    def get_group(self, key):
        """
        Returns the cache groups that matches the given key,
        if not such key was registered None is returned.
        """

        return self._registry.get(key)

    def register_cache(self, cache_group):
        """
        Register a cache_group with this manager.

        Use this method to register more complicated
        groups that you create yourself. Such as if you
        need to register several models each with different
        parameters.

        :param cache_group: The group to register. \
        The group is registered with the cache_group key attribute. \
        Raises an exception if the key is already registered.
        """

        if cache_group.key in self._registry:
            raise Exception("%s is already registered" % cache_group.key)
        self._registry[cache_group.key] = cache_group

    def register_model(self, key, *models, **kwargs):
        """
        Register a cache_group with this manager.

        Use this method to register more simple
        groups where all models share the same parameters.

        Any arguments are treated as models that you would like
        to register.

        Any keyword arguments received are passed to the
        register method when registering each model.

        :param key: The key to register this group as. \
        Raises an exception if the key is already registered.
        """

        cache_group = CacheGroup(key)
        for model in models:
            cache_group.register(model, **kwargs)

        self.register_cache(cache_group)

    def invalidate_cache(self, klass, extra=None, **kwargs):
        """
        Invalidate a cache for a specific class.

        This will loop through all registered groups that have registered
        the given model class and call their invalidate_cache method.

        All keyword arguments will be directly passed through to the
        group's invalidate_cache method, with the exception of **extra**
        as noted below.

        :param klass: The model class that need some invalidation.

        :param extra: A dictionary where the key corresponds to the name \
        of a group where this model is registered and a value that is a \
        list that will be passed as the extra keyword argument when \
        calling invalidate_cache on that group. In this way you can \
        specify specific extra values to invalidate only for specific \
        groups.
        """

        extra = kwargs.pop('extra', {})
        for group in self._registry.values():
            if klass in group.models:
                e = extra.get(group.key)
                group.invalidate_cache(klass, extra=e, **kwargs)

cache_manager = CacheManager()
