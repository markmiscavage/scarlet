from django.db import models

from django.utils.text import slugify

from scarlet.assets.fields import AssetsFileField
from scarlet.assets.models import Asset
from scarlet.cms.fields import OrderField
from scarlet.cms.fields import HTMLTextField


class HotSpotModule(models.Model):
    name = models.CharField(max_length=255)
    image = AssetsFileField(type=Asset.IMAGE)
    slug = models.SlugField(blank=True)

    class Meta:
        verbose_name = 'Hotspot module'
        verbose_name_plural = 'Hotspot modules'

    def __unicode__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.slug = slugify(self.name)
        return super(HotSpotModule, self).save(*args, **kwargs)


class HotSpot(models.Model):
    module = models.ForeignKey(HotSpotModule, related_name='hotspots')

    x_cord = models.IntegerField()
    y_cord = models.IntegerField()

    # These are dimensions for `.HotspotPlugin_Overlay` which defines size of
    # displayed image. `x_cord` and `y_cord` are relative to these dimensions
    overlay_size_x = models.IntegerField()
    overlay_size_y = models.IntegerField()

    title = OrderField()
    # SVG field
    icon = AssetsFileField(type=Asset.UNKNOWN, blank=True, null=True, verbose_name='Icon')
    label = models.CharField(max_length=255, blank=True)
    text = HTMLTextField(blank=True)
    image = AssetsFileField(type=Asset.IMAGE, blank=True, null=True)
    video_json = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Hotspot'
        verbose_name_plural = 'Hotspots'

    def __unicode__(self):
        return self.label
