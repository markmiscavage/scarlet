from django.utils.safestring import mark_safe

try:
    from ..cms import site, bundles, views
except ValueError:
    from cms import site, bundles, views

from . import models
from . import forms
from .views import AssetListView, AssetFormView
from . import settings

from sorl.thumbnail import get_thumbnail

def preview(obj):
    if obj.type == obj.IMAGE:
        thumbmail = None
        try:
            thumbnail = get_thumbnail(obj.file.file,
                                  settings.CMS_THUMBNAIL_SIZE).url
        except:
            pass

        if thumbnail:
            return mark_safe('<img src="{0}" />'.format(thumbnail))

    return ""

class AssetBundle(bundles.Bundle):

    main = AssetListView(display_fields=(preview, "user_filename", "modified","type"))
    add = AssetFormView(force_add=True, form_class=forms.UploadAssetForm)
    edit = AssetFormView(form_class=forms.UpdateAssetForm)

    class Meta:
        primary_model_bundle = True
        model = models.Asset

site.register('assets', AssetBundle(name='assets'), 20)
