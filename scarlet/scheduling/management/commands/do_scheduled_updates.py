from django.core.management.base import BaseCommand
from django.utils import timezone
try:
    from django.db.transaction import atomic
except ImportError:
    from django.db.transaction import commit_on_success as atomic

from ... import models


class Command(BaseCommand):

    def handle(self, *args, **options):
        with atomic():
            for obj in models.Schedule.objects.select_for_update(
                                    ).filter(when__lte=timezone.now()):
                obj.do_updates()
