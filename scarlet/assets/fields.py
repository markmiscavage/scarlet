import logging

from django.template.loader import render_to_string
from django.utils.safestring import mark_safe
from django.db import models
from django.forms.widgets import ClearableFileInput, CheckboxInput
from django.utils.html import escape, conditional_escape
from django.db.models.signals import pre_save

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
from . import settings
from . import utils

from sorl.thumbnail import get_thumbnail

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

class RawImageWidget(ClearableFileInput):
    template_with_initial = u'%(initial_text)s: %(initial)s %(clear_template)s<br />%(input)s'

    def render(self, name, value, attrs=None):
        thumbnail = None
        data = super(RawImageWidget, self).render(name, value, attrs)

        if value and hasattr(value, "url"):
            try:
                thumbnail = get_thumbnail(value.file,
                                  settings.CMS_THUMBNAIL_SIZE).url
            except Exception:
                raise

        if thumbnail:
            data = mark_safe(u'<p class="widget-asset-simple"><span class="widget-asset-simple-preview" style="background-image:url({0})"></span>{1}</p>'.format(escape(thumbnail), data))

        return data

class AssetsFileField(TaggedRelationField):
    default_form_class = AssetsFileFormField
    default_model_class = Asset

    def __init__(self, *args, **kwargs):
        if not 'related_name' in kwargs:
            kwargs['related_name'] = '+'

        if not 'on_delete' in kwargs:
            kwargs['on_delete'] = models.PROTECT

        self.asset_type = kwargs.pop('type', Asset.UNKNOWN)
        self.denormalize = kwargs.pop('denormalize', True)

        return super(AssetsFileField, self).__init__(
            self.default_model_class, **kwargs)

    def get_formfield_defaults(self):
        # This is a fairly standard way to set up some defaults
        # while letting the caller override them.
        defaults = super(AssetsFileField, self).get_formfield_defaults()
        defaults['asset_type'] = self.asset_type
        return defaults

    def contribute_to_class(self, cls, name):
        if self.denormalize:
            denormalize_field = models.FileField(max_length=255, editable=False,
                                                blank=self.blank,
                                                upload_to=utils.assets_dir)
            cache_name = self.get_denormalized_field_name(name)
            cls.add_to_class(cache_name,
                             denormalize_field)

            setattr(cls, "{0}_url".format(name),
                    utils.partial(utils.asset_url, cache_name))

            pre_save.connect(denormalize_assets, sender=cls)

        # add the date field normally
        super(AssetsFileField, self).contribute_to_class(cls, name)

    def get_denormalized_field_name(self, name):
        return u"{0}_cache".format(name)

def denormalize_assets(sender, instance, **kwargs):
    for field in instance._meta.fields:
        if isinstance(field, AssetsFileField):
            cache_name = field.get_denormalized_field_name(field.name)
            try:
                asset_ins = getattr(instance, field.name)
                if asset_ins and field.denormalize:
                    setattr(instance, cache_name, asset_ins.file.name)
            except ObjectDoesNotExist:
                    setattr(instance, cache_name, "")
