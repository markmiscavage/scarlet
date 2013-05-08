from django import forms
from django.db import models

try:
    from ..cms.internal_tags.forms import TaggedRelationFilterForm
except ValueError:
    from cms.internal_tags.forms import TaggedRelationFilterForm

from .models import Asset

class UploadAssetForm(forms.ModelForm):
    """
    Form for handling new asset creation
    """
    class Meta:
        model = Asset
        fields = ('type', 'file', 'tags')

    def __init__(self, *args, **kwargs):
        super(UploadAssetForm, self).__init__(*args, **kwargs)
        self.fields['tags'].widget.attrs['class'] = 'widget-tags'


class UpdateAssetForm(forms.ModelForm):
    """
    Form for handling asset updates
    """
    class Meta:
        model = Asset
        fields = ('file', 'tags')

    def __init__(self, *args, **kwargs):
        super(UpdateAssetForm, self).__init__(*args, **kwargs)
        self.fields['tags'].widget.attrs['class'] = 'widget-tags'


class AssetFilterForm(TaggedRelationFilterForm):
    """
    Form for handling asset filtering by fields
    """
    choices = [('', '---')] + list(Asset.TYPES)
    ftype = forms.ChoiceField(required=False, choices=choices)

    def get_filter(self):
        filter_kwargs = self.get_filter_kwargs()
        args = super(AssetFilterForm, self).get_filter()

        ftype = filter_kwargs.pop('ftype', None)
        if ftype:
            args.append(models.Q(type=ftype))

        return args
