from .sites import site

try:
    from django.utils.module_loading import autodiscover_modules

    def autodiscover():
        autodiscover_modules('cms_bundles', register_to=site)

except ImportError:

    def autodiscover():
        """
        Copied from django source

        Auto-discover INSTALLED_APPS cms.py modules and fail silently when
        not present. This forces an import on them to register any admin bits they
        may want.
        """

        import copy
        from django.conf import settings
        from django.utils.importlib import import_module
        from django.utils.module_loading import module_has_submodule

        for app in settings.INSTALLED_APPS:
            mod = import_module(app)
            # Attempt to import the app's admin module.
            try:
                before_import_registry = copy.copy(site._registry)
                import_module('%s.cms_bundles' % app)
            except Exception, e:
                # Reset the model registry to the state before the last import as
                # this import will have to reoccur on the next request and this
                # could raise NotRegistered and AlreadyRegistered exceptions
                # (see #8245).
                site._registry = before_import_registry

                # Decide whether to bubble up this error. If the app just
                # doesn't have an admin module, we can ignore the error
                # attempting to import it, otherwise we want it to bubble up.
                if module_has_submodule(mod, 'cms_bundles'):
                    raise

default_app_config = 'scarlet.cms.apps.ScarletCMSConfig'
