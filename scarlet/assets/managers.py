from django.db import models


class AssetManager(models.Manager):
    """
    A model manager to allow for searching assets
    """
    def search_tags(self, tags):
        """
        Search assets by passing a list of one or more tags.
        """
        qs = self.filter(tags__name__in=tags).order_by('file').distinct()
        return qs
