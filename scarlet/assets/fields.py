import urllib

from django import forms
from django.contrib.admin.sites import site
from django.db import models
from django.template.loader import render_to_string
from django.utils.safestring import mark_safe

from cms.widgets import APIChoiceWidget, APIModelChoiceWidget

from assets.models import Asset

import logging
logger = logging.getLogger(__name__)


class AssetsFileWidget(APIModelChoiceWidget):

    def __init__(self, *args, **kwargs):
        super(AssetsFileWidget, self).__init__(*args, **kwargs)
        if self.attrs:
            self.asset_type = self.attrs.pop('type', Asset.UNKNOWN)
            self.asset_tags = u','.join(self.attrs.pop('asset_tags', [])).lower()
            self.required_tags = u','.join(self.attrs.pop('required_tags', [])).lower()
        else:
            self.asset_type = ''
            self.asset_tags = ''
            self.required_tags = ''

    def get_qs(self):
        qs = {}
        if self.asset_type:
            qs['ftype'] = self.asset_type
        if self.required_tags:
            qs['required_tags'] = self.required_tags
        return qs

    def get_add_qs(self):
        qs = self.get_qs()
        if 'ftype' in qs:
            qs['type'] = qs.pop('ftype')
        return qs

    def get_add_link(self):
        """
        Appends the popup=1 query string to the url so the
        destination url treats it as a popup.
        """

        url = super(AssetsFileWidget, self).get_add_link()
        if url:
            qs = self.get_add_qs()
            if qs:
                url = "%s&%s" % (url, urllib.urlencode(qs))
        return url

    def render(self, name, value, attrs=None):
        obj = self.obj_for_value(value)

        # Go directly to parent of APIChoiceWidget to get input
        hidden_input = super(APIChoiceWidget, self).render(name, value, attrs=attrs)

        context = {
            'hidden_input': hidden_input,
            'object': obj,
            'asset_type': self.asset_type,
            'asset_tags': self.asset_tags,
            'link': self.get_api_link(),
            'add_link' : self.get_add_link()
        }
        html = render_to_string('assets/asset_widget.html', context)
        return mark_safe(html)

    def obj_for_value(self, value, key='pk'):
        if not key:
            key = self.rel.get_related_field().name

        if value is not None:
            try:
                obj = self.model._default_manager.using(self.db
                                                         ).get(**{key: value})
                return obj
            except (ValueError, self.model.DoesNotExist):
                return None
        return None



class AssetsFileFormField(forms.ModelChoiceField):
    widget = AssetsFileWidget

    def __init__(self, **kwargs):
        widget_instance = kwargs.pop('widget', None)

        # Type/Tags
        self.asset_type = kwargs.pop('type', None)
        self.asset_tags = kwargs.pop('asset_tags', None)
        self.required_tags = kwargs.pop('required_tags', None)

        queryset = kwargs.pop('queryset')
        if not isinstance(widget_instance, type) and not \
               isinstance(widget_instance, self.widget):
            attrs = {}
            attrs['type'] = self.asset_type
            attrs['asset_tags'] = self.asset_tags
            attrs['required_tags'] = self.required_tags
            widget_instance = self.widget(queryset.model, attrs=attrs)

        kwargs['widget'] = widget_instance
        super(AssetsFileFormField, self).__init__(queryset, **kwargs)

    def widget_attrs(self, widget):
        widget.required = self.required
        return {}


class AssetsFileField(models.ForeignKey):
    default_form_class = AssetsFileFormField
    default_model_class = Asset

    def __init__(self, *args, **kwargs):
        if not 'related_name' in kwargs:
            kwargs['related_name'] = '+'

        if not 'on_delete' in kwargs:
            kwargs['on_delete'] = models.PROTECT

        self.asset_type = kwargs.pop('type', Asset.UNKNOWN)
        self.required_tags = kwargs.pop('required_tags', tuple())
        self.asset_tags = kwargs.pop('tags', tuple())

        if self.required_tags:
            if self.asset_tags:
                self.asset_tags = tuple(set(self.asset_tags).union(
                                        set(self.required_tags)))
            else:
                self.asset_tags = tuple(self.required_tags)

        return super(AssetsFileField, self).__init__(
            self.default_model_class, **kwargs)

    def formfield(self, **kwargs):
        # This is a fairly standard way to set up some defaults
        # while letting the caller override them.
        defaults = {
            'form_class': self.default_form_class,
            'type': self.asset_type,
            'asset_tags' : self.asset_tags,
            'required_tags' : self.required_tags
        }
        defaults.update(kwargs)
        return super(AssetsFileField, self).formfield(**defaults)
