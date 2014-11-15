from django.db.models.signals import post_syncdb
from django.contrib import auth
from django.contrib.auth.models import Group
from django.contrib.auth import models as auth_app
from django import VERSION as DJANGO_VERSION
from django.db.models.signals import post_migrate

from .. import settings


def ensure_groups_sync(app, created_models, verbosity, **kwargs):

    for group in settings.BASE_GROUPS:
        Group.objects.get_or_create(name=group)


def ensure_groups(sender=None, **kwargs):
    for group in settings.BASE_GROUPS:
        Group.objects.get_or_create(name=group)

if DJANGO_VERSION < (1, 7):
    post_syncdb.connect(ensure_groups_sync, sender=auth.models,
                    dispatch_uid='ensure_groups')
else:
    post_migrate.connect(ensure_groups, sender=auth_app, dispatch_uid='ensure_groups')
