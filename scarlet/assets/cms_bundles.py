from views import AssetListView, AssetFormView

try:
    from ..cms import site, bundles, views
except ValueError:
    from cms import site, bundles, views

from . import models
from . import forms


class AssetBundle(bundles.Bundle):

    main = AssetListView()
    add = AssetFormView(force_add=True, form_class=forms.UploadAssetForm)
    edit = views.FormView(form_class=forms.UpdateAssetForm)

    class Meta:
        primary_model_bundle = True
        model = models.Asset

site.register('assets', AssetBundle(name='assets'), 20)
