from django.contrib.admin.sites import AdminSite as OrgAdminSite
from django.contrib.admin.options import ModelAdmin as OrgModelAdmin

from django.contrib.admin.actions import delete_selected
from django.contrib.auth.admin import UserAdmin, GroupAdmin
from django.contrib.auth.models import Group, User
from django.utils.translation import ugettext_lazy

from .manager import cache_manager


def clear_cache_delete_selected(modeladmin, request, queryset):
    """
    A delete action that will invalidate cache after being called.
    """
    result = delete_selected(modeladmin, request, queryset)

    # A result of None means that the delete happened.
    if not result and hasattr(modeladmin, 'invalidate_cache'):
        modeladmin.invalidate_cache(queryset=queryset)

    return result
clear_cache_delete_selected.short_description = ugettext_lazy("Delete selected %(verbose_name_plural)s")


class AdminSite(OrgAdminSite):
    """
    Admin Class that overrides the default delete action to
    invalidate appropriate cache groups.
    """

    def __init__(self, *args, **kwargs):
        super(AdminSite, self).__init__(*args, **kwargs)
        self._actions = {'delete_selected': clear_cache_delete_selected}
        self._global_actions = self._actions.copy()


class ModelAdmin(OrgModelAdmin):
    """
    ModelAdmin implementation that trys to clear caches
    based on changes you've made.

    **cache_manager:** A CacheController instance that will be used to
    invalidate caches.
    """

    cache_manager = cache_manager

    def invalidate_cache(self, obj=None, queryset=None,
                         extra=None, force_all=False):
        """
        Method that should be called by all tiggers to invalidate the
        cache for an item(s).

        Should be overriden by inheriting classes to customize behavior.
        """

        if self.cache_manager:
            if queryset != None:
                force_all = True

            self.cache_manager.invalidate_cache(self.model, instance=obj,
                                                   extra=extra,
                                                   force_all=force_all)

    def delete_model(self, request, obj):
        result = super(ModelAdmin, self).delete_model(request, obj)
        self.invalidate_cache(obj=obj)
        return result

    def response_change(self, request, new_object):
        result = super(ModelAdmin, self).response_change(request, new_object)
        self.invalidate_cache(obj=new_object)
        return result

    def response_add(self, request, obj, post_url_continue=None):
        result = super(ModelAdmin, self).response_add(request, obj,
                                                      post_url_continue)
        self.invalidate_cache(obj=obj)
        return result

site = AdminSite()
site.register(Group, GroupAdmin)
site.register(User, UserAdmin)
