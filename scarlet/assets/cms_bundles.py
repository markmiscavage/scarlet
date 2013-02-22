from taggit.models import Tag

from assets.views import AssetListView, AssetFormView, TagListView

from cms import site, bundles, views

import models
import forms


class AssetBundle(bundles.Bundle):

    main = AssetListView()
    add = AssetFormView(force_add=True, form_class=forms.UploadAssetForm)
    edit = views.FormView(form_class=forms.UpdateAssetForm)

    class Meta:
        primary_model_bundle = True
        model = models.Asset

site.register('assets', AssetBundle(name='assets'), 20)


class TagBundle(bundles.Bundle):
    main = TagListView()

    class Meta:
        primary_model_bundle = False
        model = Tag

site.register('tags', TagBundle(name='tags'), 20)
