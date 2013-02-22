from django.db.models.signals import post_syncdb
from django.contrib import auth
from django.contrib.auth.models import Group

from accounts import groups


def ensure_groups(app, created_models, verbosity, **kwargs):

    all_groups = [v for k, v in groups.__dict__.items() \
                        if not k.startswith('_')]
    for group in all_groups:
        Group.objects.get_or_create(name=group)

post_syncdb.connect(ensure_groups, sender=auth.models,
                    dispatch_uid='ensure_groups')
