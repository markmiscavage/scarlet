from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from ... import models


class Command(BaseCommand):

    def handle(self, *args, **options):
        with transaction.commit_on_success():
            for obj in models.Schedule.objects.select_for_update(
                                    ).filter(when__lte=timezone.now()):
                obj.do_updates()
