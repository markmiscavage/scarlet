import time
import gc
import os
import shutil

from django.core.management.base import BaseCommand

from ... import get_asset_model


# http://djangosnippets.org/snippets/1949/ + IndexError fix
def queryset_iterator(queryset, chunksize=1000):
    '''''
    Iterate over a Django Queryset ordered by the primary key

    This method loads a maximum of chunksize (default: 1000) rows in it's
    memory at the same time while django normally would load all rows in it's
    memory. Using the iterator() method only causes it to not preload all the
    classes.

    Note that the implementation of the iterator does not support ordered
    query sets.
    '''
    pk = 0
    try:
        last_pk = queryset.order_by('-pk')[0].pk
    except IndexError:
        return
    queryset = queryset.order_by('pk')
    while pk < last_pk:
        for row in queryset.filter(pk__gt=pk)[:chunksize]:
            pk = row.pk
            yield row
        gc.collect()


class Command(BaseCommand):
    args = None
    help = 'Cleanup assets table by checking if the actual file exists in media directory.'
    ASSET_CHUNKSIZE = 1000

    def handle(self, *args, **options):
        t1 = time.time()

        # Process all assets
        qs = queryset_iterator(get_asset_model().objects.all(), self.ASSET_CHUNKSIZE)
        for asset in qs:
            try:
                with open(asset.file.path) as f:
                    pass
            except IOError:
                self.stdout.write('Deleting asset: %s\n' % (asset))
                asset.delete()
            else:
                filename = os.path.basename(asset.file.path)
                if not asset.rename_file() and filename != asset.user_filename:
                    new_name = os.path.join(os.path.dirname(asset.file.path),
                                            asset.user_filename)
                    shutil.move(asset.file.path, new_name)
                    asset.file = os.path.join(os.path.dirname(asset.file.name),
                                              asset.user_filename)
                    asset.save()


        t2 = time.time()
        self.stdout.write('do_work took %0.3f ms\n' % ((t2 - t1) * 1000.0))
