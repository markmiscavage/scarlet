from django.core.management.base import BaseCommand
from django.db.models.loading import get_models
try:
    from django.db.transaction import atomic
except ImportError:
    from django.db.transaction import commit_on_success as atomic

from ...models import Asset
from ...fields import AssetsFileField


class Command(BaseCommand):
    args = None
    help = 'Make sure all uploaded files have the minumum required tags'

    def handle(self, *args, **options):
        seen = {}
        with atomic():
            for m in get_models():
                if hasattr(m._meta, '_view_model') and not (m._meta, 'is_view', False):
                    continue

                for field in m._meta.local_fields:

                    if isinstance(field, AssetsFileField):
                        assert isinstance(field.asset_tags, tuple), (field.name, m)
                        assert isinstance(field.required_tags, tuple), (field.name, m)

                        qs = m.objects.filter().values_list(field.name, flat=True)
                        ids = set([x for x in qs if x])
                        s = seen.get(field.asset_type, set())
                        s = s.union(ids)
                        for t in Asset.TYPES:
                            if t[0] != field.asset_type:
                                has = seen.get(t[0], set())
                                double = s.intersection(has)
                                if double:
                                    raise Exception("%s are in %s and %s" % (double,
                                                                             field.asset_type, t[0]))
                        seen[field.asset_type] = s

                        if ids:
                            Asset.objects.filter(pk__in=ids).update(type=field.asset_type)
                            for asset in Asset.objects.filter(pk__in=ids):
                                has = set([a.name for a in asset.tags.all()])
                                needs = set(field.asset_tags).difference(has)

                                for t in needs:
                                    asset.tags.add(t.lower())
