import logging

from django.template.loader import render_to_string
from django.utils.safestring import mark_safe
from django.db import models

try:
    from ..cms.widgets import APIChoiceWidget
    from ..cms.internal_tags.fields import (TaggedRelationFormField,
                                    TaggedRelationWidget,
                                    TaggedRelationField)
except ValueError:
    from cms.widgets import APIChoiceWidget
    from cms.internal_tags.fields import (TaggedRelationFormField,
                                    TaggedRelationWidget,
                                    TaggedRelationField)

from .models import Asset

logger = logging.getLogger(__name__)


class AssetsFileWidget(TaggedRelationWidget):

    def get_qs(self):
        qs = super(AssetsFileWidget, self).get_qs()
        if self.asset_type:
            qs['ftype'] = self.asset_type
        return qs

    def get_add_qs(self):
        qs = self.get_qs()
        if 'ftype' in qs:
            qs['type'] = qs.pop('ftype')
        return qs

    def render(self, name, value, attrs=None):
        obj = self.obj_for_value(value)

        # Go directly to parent of APIChoiceWidget to get input
        hidden_input = super(APIChoiceWidget, self).render(
            name, value, attrs=attrs)

        context = {
            'hidden_input': hidden_input,
            'object': obj,
            'asset_type': self.asset_type,
            'asset_tags': self.tags,
            'link': self.get_api_link(),
            'add_link': self.get_add_link()
        }
        html = render_to_string('assets/asset_widget.html', context)
        return mark_safe(html)


class AssetsFileFormField(TaggedRelationFormField):
    widget = AssetsFileWidget

    def __init__(self, **kwargs):
        # Type/Tags
        self.asset_type = kwargs.pop('asset_type', None)
        super(AssetsFileFormField, self).__init__(**kwargs)

    def widget_attrs(self, widget):
        widget.required = self.required
        widget.asset_type = self.asset_type
        return {}


class AssetsFileField(TaggedRelationField):
    default_form_class = AssetsFileFormField
    default_model_class = Asset

    def __init__(self, *args, **kwargs):
        if not 'related_name' in kwargs:
            kwargs['related_name'] = '+'

        if not 'on_delete' in kwargs:
            kwargs['on_delete'] = models.PROTECT

        self.asset_type = kwargs.pop('type', Asset.UNKNOWN)

        return super(AssetsFileField, self).__init__(
            self.default_model_class, **kwargs)

    def get_formfield_defaults(self):
        # This is a fairly standard way to set up some defaults
        # while letting the caller override them.
        defaults = super(AssetsFileField, self).get_formfield_defaults()
        defaults['asset_type'] = self.asset_type
        return defaults
