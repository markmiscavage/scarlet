from __future__ import unicode_literals
from django.apps import AppConfig as DjangoAppConfig


class AppConfig(DjangoAppConfig):
    name = 'tests.version_models'
