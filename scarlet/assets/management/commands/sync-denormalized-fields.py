from django.core.management.base import BaseCommand
from django.db.models.loading import get_models
from django.db.models import F
try:
    from django.db.transaction import atomic
except ImportError:
    from django.db.transaction import commit_on_success as atomic

from ...fields import AssetsFileField


class Command(BaseCommand):
    args = None
    help = 'Make sure all uploaded files are denormalized'

    def handle(self, *args, **options):
        with atomic():
            for m in get_models():
                if hasattr(m._meta, '_view_model') and not (m._meta, 'is_view', False):
                    continue

                for field in m._meta.local_fields:
                    if isinstance(field, AssetsFileField):
                        cache_name = field.get_denormalized_field_name(field.name)
                        qs = m.objects.exclude(**{
                                    cache_name: F('{0}__file'.format(field.name))
                                }).select_related(field.name)

                        m.objects.filter(**{'{0}__isnull'.format(field.name): True}
                                        ).update(**{cache_name: ""})
                        for ins in qs:
                            name = getattr(ins, field.name).file.name
                            m.objects.filter(pk=ins.pk).update(**{cache_name: name})
