import os
import uuid

from django.db import models
from django.core.files.uploadedfile import UploadedFile
from django.db.models.deletion import Collector

from sorl.thumbnail import delete

from . import settings
from .managers import AssetManager
from . import utils
try:
    from ..cms.internal_tags.models import AutoTagModel
except ValueError:
    from cms.internal_tags.models import AutoTagModel

class Asset(AutoTagModel):
    UNKNOWN = 'unknown'
    IMAGE = 'image'
    DOCUMENT = 'document'
    AUDIO = 'audio'
    VIDEO = 'video'

    TYPES = (
        (UNKNOWN, 'Unknown'),
        (IMAGE, 'Image'),
        (DOCUMENT, 'Document'),
        (AUDIO, 'Audio'),
        (VIDEO, 'Video'),
    )

    __original_file = None

    def __init__(self, *args, **kwargs):
        super(Asset, self).__init__(*args, **kwargs)
        self.__original_file = self.file

    def rename_file(self):
        if self.type == self.DOCUMENT:
            return False
        return settings.HASH_FILENAME

    file = models.FileField(upload_to=utils.assets_dir)
    type = models.CharField(max_length=255, choices=TYPES, db_index=True)
    slug = models.SlugField(unique=True, max_length=255)
    user_filename = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    cbversion = models.PositiveIntegerField(editable=False)

    objects = AssetManager()

    def url(self):
        """
        This is a wrapper of file.url
        """
        return utils.asset_url(self, 'file', version=self.cbversion)

    def generate_slug(self):
        return str(uuid.uuid1())

    def assign_tag(self):
        pass

    def delete_real_file(self, file_obj):
        storage, path = file_obj.storage, file_obj.path
        storage.delete(path)
        # Tell sorl to remove reference
        delete(file_obj, delete_file=False)

    def save(self, *args, **kwargs):
        """
        For new assets, creates a new slug.
        For updates, deletes the old file from storage.

        Calls super to actually save the object.
        """
        if not self.pk and not self.slug:
            self.slug = self.generate_slug()

        if self.__original_file and self.file != self.__original_file:
            self.delete_real_file(self.__original_file)

        file_changed = True
        if self.pk:
            new_value = getattr(self, 'file')
            if hasattr(new_value, "file"):
                file_changed = isinstance(new_value.file, UploadedFile)
        else:
            self.cbversion = 1

        if file_changed:
            self.user_filename = os.path.basename(self.file.name)
            if file_changed and self.pk:
                self.cbversion = self.cbversion + 1
                utils.update_cache_bust_version(self.file.url, self.cbversion)

        super(Asset, self).save(*args, **kwargs)

        if self.__original_file and self.file.name != self.__original_file.name:
            for related in self.__class__._meta.get_all_related_objects(
                    include_hidden=True):
                field = related.field
                if getattr(field, 'denormalize'):
                    related.model.objects.filter(**{
                        field.name: self.pk
                    }).update(**{
                        field.get_denormalized_field_name(field.name): self.file.name
                    })

    def delete(self, *args, **kwargs):
        """
        Deletes the actual file from storage after the object is deleted.

        Calls super to actually delete the object.
        """
        file_obj = self.file
        super(Asset, self).delete(*args, **kwargs)
        self.delete_real_file(file_obj)

    def __unicode__(self):
        return '%s' % (self.user_filename)
