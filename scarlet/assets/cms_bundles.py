from django.utils.safestring import mark_safe

try:
    from ..cms import site, bundles, views, cms_bundles
except ValueError:
    from cms import site, bundles, views, cms_bundles

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

class EmbedView(cms_bundles.EmbedView):

    def get(self, request, *args, **kwargs):
        tags = request.GET.get('tags')
        bundle = self.bundle.admin_site.get_bundle_for_model(models.Asset)
        api_link = ''
        if bundle:
            api_link = bundle.get_view_url("main", request.user)
            if api_link:
                api_link = "{0}?type=choices&ftype=image".format(api_link)

        return self.render(request, tags=tags, api_link=api_link)

class WYSIWYG(cms_bundles.WYSIWYG):
    main = EmbedView(default_template='cms/insert_media.html')


site.unregister('wysiwyg')
site.register('wysiwyg', WYSIWYG(name='wysiwyg'), 21)
site.register('assets', AssetBundle(name='assets'), 20)
