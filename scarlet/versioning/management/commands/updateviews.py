from ...management import update_schema

from django.core.management.base import BaseCommand


class Command(BaseCommand):

    def handle(self, *app_labels, **options):
        from django.db import models
        update_schema(None, models.get_models(), True)
