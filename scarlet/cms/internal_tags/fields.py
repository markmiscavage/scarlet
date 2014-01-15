import urllib
import logging
from django import forms
from django.db import models
from django.utils.safestring import mark_safe
from django.utils.html import conditional_escape
from django.core.exceptions import ObjectDoesNotExist
from django.db.models.signals import pre_save

from .. widgets import APIChoiceWidget, APIModelChoiceWidget

logger = logging.getLogger(__name__)


class TaggedRelationWidget(APIModelChoiceWidget):
    template = u'<div class="api-select" data-tags="%(tags)s" data-title="%(value)s" data-api="%(link)s" data-add="%(add_link)s">%(input)s</div>'

    def __init__(self, *args, **kwargs):
        from . import handler
        super(TaggedRelationWidget, self).__init__(*args, **kwargs)
        if self.attrs:
            self.tags = handler.tags_to_string(self.attrs.pop('tags', []))
            self.required_tags = handler.tags_to_string(
                self.attrs.pop('required_tags', []))
        else:
            self.tags = ''
            self.required_tags = ''

    def get_qs(self):
        qs = {}
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

        url = super(TaggedRelationWidget, self).get_add_link()
        if url:
            qs = self.get_add_qs()
            if qs:
                url = "%s&%s" % (url, urllib.urlencode(qs))
        return url

    def render(self, name, value, attrs=None, choices=()):
        self.auto_tags = None
        data = {
            'input': super(APIChoiceWidget, self).render(name, value,
                                                          attrs=attrs),
            'value': conditional_escape(self.label_for_value(value)),
            'link': self.get_api_link(),
            'add_link': self.get_add_link(),
            'tags': self.tags,
            'required_tags': self.required_tags
        }
        return mark_safe(self.template % data)

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


class TaggedRelationFormField(forms.ModelChoiceField):
    widget = TaggedRelationWidget

    def __init__(self, **kwargs):
        widget_instance = kwargs.pop('widget', None)

        # Type/Tags
        self.tags = kwargs.pop('tags', None)
        self.required_tags = kwargs.pop('required_tags', None)

        queryset = kwargs.pop('queryset')
        if not isinstance(widget_instance, type) and not \
               isinstance(widget_instance, self.widget):
            attrs = {}
            attrs['tags'] = self.tags
            attrs['required_tags'] = self.required_tags
            widget_instance = self.widget(queryset.model, attrs=attrs)

        kwargs['widget'] = widget_instance
        super(TaggedRelationFormField, self).__init__(queryset, **kwargs)

    def widget_attrs(self, widget):
        widget.required = self.required
        return {}


class TaggedRelationField(models.ForeignKey):
    default_form_class = TaggedRelationFormField

    def __init__(self, *args, **kwargs):
        self.required_tags = kwargs.pop('required_tags', tuple())
        self.tags = kwargs.pop('tags', tuple())

        if self.required_tags:
            if self.tags:
                self.tags = tuple(set(self.tags).union(
                                        set(self.required_tags)))
            else:
                self.tags = tuple(self.required_tags)

        return super(TaggedRelationField, self).__init__(
            *args, **kwargs)

    def get_formfield_defaults(self):
        return {
            'form_class': self.default_form_class,
            'tags': self.tags,
            'required_tags': self.required_tags
        }

    def formfield(self, **kwargs):
        # This is a fairly standard way to set up some defaults
        # while letting the caller override them.
        defaults = self.get_formfield_defaults()
        defaults.update(kwargs)
        return super(TaggedRelationField, self).formfield(**defaults)

    def contribute_to_class(self, cls, *args, **kwargs):
        super(TaggedRelationField, self).contribute_to_class(
            cls, *args, **kwargs)
        pre_save.connect(save_auto_tags, sender=cls)


def save_auto_tags(sender, instance, **kwargs):
    if not getattr(sender._meta, '_view_model', None):
        for field in instance._meta.fields:
            if isinstance(field, TaggedRelationField):
                try:
                    ins = getattr(instance, field.name)
                    if ins:
                        ins.add_pending_tags(field.tags)
                except ObjectDoesNotExist:
                    pass
