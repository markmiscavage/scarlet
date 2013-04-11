from django.db.models.signals import post_syncdb
from django.contrib import auth
from django.contrib.auth.models import Group

from .. import settings


def ensure_groups(app, created_models, verbosity, **kwargs):

    for group in settings.BASE_GROUPS:
        Group.objects.get_or_create(name=group)

post_syncdb.connect(ensure_groups, sender=auth.models,
                    dispatch_uid='ensure_groups')
