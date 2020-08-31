from __future__ import unicode_literals
from builtins import object
from django.db import models

from . import handler


class AutoTagModel(models.Model):
    tags = handler.get_tag_manager()
    tags.verbose_name = "Search Tags"
    tags.help_text = "Search tags are used to prefilter assets when including an asset on your object"

    def _set_auto_tags(self, value):
        if value:
            self._pending_tags = set(value)

    def _get_auto_tags(self):
        if not getattr(self, "_pending_tags", None):
            self._pending_tags = set()
        return self._pending_tags

    auto_tags = property(_get_auto_tags, _set_auto_tags)

    def add_pending_tags(self, field_tags):
        if self.auto_tags:
            needed_tags = set(field_tags).union(self.auto_tags)
            existing_tags = {}
            for t in handler.get_model().objects.filter(name__in=needed_tags):
                existing_tags[t.name] = t

            current_tags = set([t.pk for t in self.tags.all()])
            for tag in needed_tags:
                t = existing_tags.get(tag)
                if not t:
                    t, created = handler.get_model().objects.get_or_create(name=tag)

                if not t.pk in current_tags:
                    self.tags.add(t)

    class Meta(object):
        abstract = True
