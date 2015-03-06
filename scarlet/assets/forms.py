from django import forms
from django.db import models

try:
    from ..cms.internal_tags.forms import TaggedRelationFilterForm
except ValueError:
    from cms.internal_tags.forms import TaggedRelationFilterForm

from . import get_asset_model
from . models import AssetBase


class UploadAssetForm(forms.ModelForm):
    """
    Form for handling new asset creation
    """
    class Meta:
        model = get_asset_model()
        fields = ('type', 'file', 'tags')

    def __init__(self, *args, **kwargs):
        super(UploadAssetForm, self).__init__(*args, **kwargs)
        self.fields['tags'].widget.attrs['class'] = 'widget-tags'


class UpdateAssetForm(forms.ModelForm):
    """
    Form for handling asset updates
    """
    class Meta:
        model = get_asset_model()
        fields = ('file', 'tags')

    def __init__(self, *args, **kwargs):
        super(UpdateAssetForm, self).__init__(*args, **kwargs)
        self.fields['tags'].widget.attrs['class'] = 'widget-tags'


class AssetFilterForm(TaggedRelationFilterForm):
    """
    Form for handling asset filtering by fields
    """
    choices = [('', '---')] + list(AssetBase.TYPES)
    ftype = forms.ChoiceField(required=False, choices=choices,
                                label="File Type")

    def get_filter(self):
        filter_kwargs = self.get_filter_kwargs()
        args = super(AssetFilterForm, self).get_filter()

        ftype = filter_kwargs.pop('ftype', None)
        if ftype:
            args.append(models.Q(type=ftype))

        return args


class CropForm(forms.Form):
    x = forms.IntegerField()
    x2 = forms.IntegerField()
    y = forms.IntegerField()
    y2 = forms.IntegerField()

    def check_params(self, v, v2):
        if v != None and v2 != None and v2 < v:
            raise forms.ValidationError("Invalid parameters")

    def clean(self):
        cleaned_data = super(CropForm, self).clean()
        self.check_params(cleaned_data.get('x'), cleaned_data.get('x2'))
        self.check_params(cleaned_data.get('y'), cleaned_data.get('y2'))
        return cleaned_data
