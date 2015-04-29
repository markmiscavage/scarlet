import os
import uuid

from django.db import models
from django.core.files.uploadedfile import UploadedFile
from django.forms.forms import pretty_name

from . import get_image_cropper
from . import tasks
from . import settings
from . import utils
from . import signals
from .managers import AssetManager
from .fields import AssetRealFileField

try:
    from ..versioning import manager
except ValueError:
    from versioning import manager

try:
    from ..cms.internal_tags.models import AutoTagModel
except ValueError:
    from cms.internal_tags.models import AutoTagModel


class AssetBase(AutoTagModel):
    UNKNOWN = 'unknown'
    IMAGE = 'image'
    DOCUMENT = 'document'
    AUDIO = 'audio'
    VIDEO = 'video'

    TYPES = settings.ASSET_TYPES and settings.ASSET_TYPES or \
        ((UNKNOWN, 'Unknown'),
        (IMAGE, 'Image'),
        (DOCUMENT, 'Document'),
        (AUDIO, 'Audio'),
        (VIDEO, 'Video'),)

    __original_file = None

    title = models.CharField(max_length=255)
    file = AssetRealFileField(upload_to=utils.assets_dir)
    type = models.CharField(max_length=255, choices=TYPES, db_index=True)
    slug = models.SlugField(unique=True, max_length=255)
    user_filename = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    cbversion = models.PositiveIntegerField(editable=False)

    objects = AssetManager()

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        super(AssetBase, self).__init__(*args, **kwargs)
        self.__original_file = self.file

    def rename_file(self):
        if self.type == self.DOCUMENT:
            return False
        return settings.HASH_FILENAME

    def url(self):
        """
        This is a wrapper of file.url
        """
        return self.file.url

    def generate_slug(self):
        return str(uuid.uuid1())

    def assign_tag(self):
        pass

    def delete_real_file(self, file_obj):
        file_obj.storage.delete(file_obj.name)
        signals.file_removed.send(file_obj.name)

    def _can_crop(self):
        return self.type == self.IMAGE

    def reset_crops(self):
        """
        Reset all known crops to the default crop.

        If settings.ASSET_CELERY is specified then
        the task will be run async
        """

        if self._can_crop():
            if settings.CELERY or settings.USE_CELERY_DECORATOR:
                # this means that we are using celery
                tasks.reset_crops.apply_async(args=[self.pk], countdown=5)
            else:
                tasks.reset_crops(None, asset=self)

    def ensure_crops(self, *required_crops):
        """
        Make sure a crop exists for each crop in required_crops.
        Existing crops will not be changed.

        If settings.ASSET_CELERY is specified then
        the task will be run async
        """
        if self._can_crop():
            if settings.CELERY or settings.USE_CELERY_DECORATOR:
                # this means that we are using celery
                args = [self.pk]+list(required_crops)
                tasks.ensure_crops.apply_async(args=args, countdown=5)
            else:
                tasks.ensure_crops(None, *required_crops, asset=self)

    def create_crop(self, name, x, x2, y, y2):
        """
        Create a crop for this asset.
        """
        if self._can_crop():
            spec = get_image_cropper().create_crop(name, self.file, x=x,
                                                   x2=x2, y=y, y2=y2)
            ImageDetail.save_crop_spec(self, spec)

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
            self.cbversion = 0

        if file_changed:
            self.user_filename = os.path.basename(self.file.name)
            self.cbversion = self.cbversion + 1

        if not self.title:
            self.title = self.user_filename

        super(AssetBase, self).save(*args, **kwargs)

        if file_changed:
            signals.file_saved.send(self.file.name)
            utils.update_cache_bust_version(self.file.url, self.cbversion)
            self.reset_crops()

        if self.__original_file and self.file.name != self.__original_file.name:
            with manager.SwitchSchemaManager(None):
                for related in self.__class__._meta.get_all_related_objects(
                        include_hidden=True):
                    field = related.field
                    if getattr(field, 'denormalize', None):
                        cname = field.get_denormalized_field_name(field.name)
                        if getattr(field, 'denormalize'):
                            related.model.objects.filter(**{
                                field.name: self.pk
                            }).update(**{
                                cname: self.file.name
                            })

    def delete(self, *args, **kwargs):
        """
        Deletes the actual file from storage after the object is deleted.

        Calls super to actually delete the object.
        """
        file_obj = self.file
        super(AssetBase, self).delete(*args, **kwargs)
        self.delete_real_file(file_obj)

    def __unicode__(self):
        return '%s' % (self.user_filename)


class ImageDetailBase(models.Model):
    image = models.ForeignKey(settings.ASSET_MODEL)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    name = models.CharField(max_length=255)
    editable = models.BooleanField(editable=False, default=False)

    x = models.PositiveIntegerField(null=True)
    x2 = models.PositiveIntegerField(null=True)
    y = models.PositiveIntegerField(null=True)
    y2 = models.PositiveIntegerField(null=True)

    class Meta:
        abstract = True

    def __unicode__(self):
        return pretty_name(self.name)

    def get_crop_config(self):
        return get_image_cropper().get_crop_config(self.name)

    @classmethod
    def save_crop_spec(cls, asset, spec, update_version=True):
        if spec:
            cdict = spec.to_dict()
            updated = cls.objects.filter(image=asset,
                                         name=cdict['name']).update(**cdict)
            if not updated:
                cls(image=asset, **cdict).save()

            if update_version:
                asset.__class__.objects.filter(pk=asset.pk
                        ).update(cbversion=models.F('cbversion')+1)


class Asset(AssetBase):
    class Meta:
        abstract = False


class ImageDetail(ImageDetailBase):

    class Meta:
        abstract = False
