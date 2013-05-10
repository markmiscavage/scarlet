from django import forms
from django.db import models

from . import handler

from ..forms import BaseFilterForm


class TaggedRelationFilterForm(BaseFilterForm):
    """
    Form for filtering a relation by tags
    """

    tag = forms.CharField(max_length=255, required=False)
    required_tags = forms.CharField(max_length=255, required=False,
                                    widget=forms.HiddenInput)

    def get_filter(self):
        filter_kwargs = super(
            TaggedRelationFilterForm, self).get_filter_kwargs()
        args = []

        tag = filter_kwargs.pop('tag', None)
        if tag:
            args.append(models.Q(tags__name__icontains=tag) | \
                        models.Q(user_filename__icontains=tag))

        required_tags = filter_kwargs.pop('required_tags', None)
        if required_tags:
            tags = None
            if ',' in required_tags:
                tags = handler.parse_tags(required_tags)
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
