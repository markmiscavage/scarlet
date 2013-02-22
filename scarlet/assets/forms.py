from django import forms
from django.db import models

from taggit.utils import parse_tags

from models import Asset

from cms.forms import BaseFilterForm


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

class AssetFilterForm(BaseFilterForm):
    """
    Form for handling asset filtering by fields
    """
    choices = [('', '---')] + list(Asset.TYPES)
    tag = forms.CharField(max_length=255, required=False)
    required_tags = forms.CharField(max_length=255, required=False,
                                    widget=forms.HiddenInput)
    ftype = forms.ChoiceField(required=False, choices=choices)

    def get_filter(self):
        filter_kwargs = super(AssetFilterForm, self).get_filter_kwargs()
        args = []

        ftype = filter_kwargs.pop('ftype', None)
        if ftype:
            args.append(models.Q(type=ftype))

        tag = filter_kwargs.pop('tag', None)
        if tag:
            args.append(models.Q(tags__name__icontains=tag)| \
                        models.Q(user_filename__icontains=tag))

        required_tags = filter_kwargs.pop('required_tags', None)
        if required_tags:
            targs = None
            if ',' in required_tags:
                tags = parse_tags(required_tags)
            else:
                tags = [required_tags]
            for t in tags:
                args.append(models.Q(tags__name=t))
        return args


class TagFilterForm(BaseFilterForm):
    """
    Form for handling tag filtering by name
    """
    name = forms.CharField(max_length=255, required=False)

    def get_filter_kwargs(self):
        filter_kwargs = super(TagFilterForm, self).get_filter_kwargs()
        name = filter_kwargs.pop('name', None)
        if name:
            filter_kwargs['name__icontains'] = name

        return filter_kwargs
