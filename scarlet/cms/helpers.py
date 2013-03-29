from django import forms
from django.utils.encoding import force_unicode
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe
from django.db import models
from django.contrib.admin.util import label_for_field
from django.db.models.fields import FieldDoesNotExist
from django.utils.text import capfirst
from django.core.exceptions import ObjectDoesNotExist

from . import widgets
from . import fields

FORMFIELD_FOR_DBFIELD_DEFAULTS = {
    models.ForeignKey:       {'widget': widgets.APIChoiceWidget},
    models.DateTimeField:    {'form_class': forms.SplitDateTimeField,
                              'widget': widgets.SplitDateTime()},
    models.DateField:        {'widget': widgets.DateWidget},
}


class AdminList(object):
    ASC = 'asc'
    DESC = 'desc'

    def __init__(self, formset, object_list, visible_fields, sort_field,
                    order_type, model_name=None):
        self.formset = formset
        self.object_list = object_list
        self.visible_fields = visible_fields
        self.order_type = order_type
        self.sort_field = sort_field
        self.model_name = model_name
        self.empty = len(object_list) == 0

        self.auto_sort = False
        if self.formset:
            self.auto_sort = len([x for x in \
                                 formset.empty_form.fields.values() \
                                 if isinstance(x, fields.OrderFormField)]) > 0

    def __iter__(self):
        if self.formset:
            for form in self.formset:
                yield AdminListRow(form, form.instance, self.visible_fields)
        else:
            for obj in self.object_list:
                yield AdminListRow(None, obj, self.visible_fields)

    def labels(self):
        """
        Get field label for fields
        """
        model = self.object_list.model

        for field in self.visible_fields:
            name = None
            if self.formset:
                f = self.formset.empty_form.fields.get(field, None)
                if f:
                    name = f.label

            if name is None:
                name = label_for_field(field, model)

            if name == model._meta.verbose_name:
                name = self.model_name and self.model_name or \
                            model._meta.verbose_name

            stype = None
            cur_sorted = False

            sortable = False

            if self.order_type:
                sortable = get_sort_field(field, model)
                stype = self.ASC

                # change order_type so that next sorting on the same
                # field will give reversed results
                if sortable == self.sort_field:
                    cur_sorted = True
                    if self.order_type == self.ASC:
                        stype = self.DESC
                    elif self.order_type == self.DESC:
                        stype = self.ASC
                    else:
                        stype = self.ASC


            yield AdminListLabel(name, field, stype, cur_sorted, bool(sortable))


class AdminListLabel(object):
    def __init__(self, name, attr, order_type, cur_sorted, sortable):
        self.name = name
        self.attr = attr
        self.order_type = order_type
        self.cur_sorted = cur_sorted
        self.sortable = sortable


class AdminListRow(object):
    def __init__(self, form, instance, visible_fields):
        self.form = form
        self.instance = instance
        self.visible_fields = visible_fields

    def get_value(self, field, i):
        if self.form and self.form.fields.get(field):
            return AdminField(self.form, field, is_first=(i == 0))
        else:
            try:
                f = self.instance._meta.get_field(field)
                try:
                    value = getattr(self.instance, field)
                except (AttributeError, ObjectDoesNotExist):
                    value = None

                if hasattr(f, "flatchoices") and f.flatchoices:
                    value = dict(f.flatchoices).get(value)
                elif isinstance(value, models.Manager):
                    value = ', '.join([unicode(x) for x in value.all()])

            except models.FieldDoesNotExist:
                # For non-field values, the value is either a method, property or
                # returned via a callable.
                if callable(field):
                    value = field(self.instance)
                else:
                    attr = getattr(self.instance, field)
                    if callable(attr):
                        value = attr()
                    else:
                        value = attr
            return value

    def __iter__(self):
        for i, field in enumerate(self.visible_fields):
            yield self.get_value(field, i)


class AdminForm(object):
    def __init__(self, form, fieldsets):
        self.form, self.fieldsets = form, normalize_fieldsets(fieldsets)

    def __iter__(self):
        for name, options in self.fieldsets:
            yield Fieldset(self.form, name, **options)

    def first_field(self):
        try:
            fieldset_name, fieldset_options = self.fieldsets[0]
            field_name = fieldset_options['fields'][0]
            if not isinstance(field_name, basestring):
                field_name = field_name[0]
            return self.form[field_name]
        except (KeyError, IndexError):
            pass
        try:
            return iter(self.form).next()
        except StopIteration:
            return None


class Fieldset(object):
    def __init__(self, form, name=None, fields=(),
                 classes=(), description=None):
        self.form = form
        self.name, self.fields = name, fields
        self.classes = u' '.join(classes)
        self.description = description

    def __iter__(self):
        for field in self.fields:
            yield Fieldline(self.form, field)


class Fieldline(object):
    def __init__(self, form, field):
        self.form = form  # A django.forms.Form instance
        if not hasattr(field, "__iter__"):
            self.fields = [field]
        else:
            self.fields = field

    def __iter__(self):
        for i, field in enumerate(self.fields):
                yield AdminField(self.form, field, is_first=(i == 0))

    def errors(self):
        return mark_safe(u'\n'.join([self.form[f].errors.as_ul()
                         for f in self.fields]))


class AdminField(object):
    def __init__(self, form, field, is_first):
        self.field = form[field]  # A django.forms.BoundField instance
        self.is_first = is_first  # Whether this field is first on the line
        self.is_checkbox = isinstance(self.field.field.widget,
                                      forms.CheckboxInput)
        self.is_order_field = isinstance(self.field.field,
                                        fields.OrderFormField)

    def label_tag(self):
        classes = []
        contents = conditional_escape(force_unicode(self.field.label))
        if self.is_checkbox:
            classes.append(u'vCheckboxLabel')
        else:
            contents += u':'
        if self.field.field.required:
            classes.append(u'required')
        if not self.is_first:
            classes.append(u'inline')
        attrs = classes and {'class': u' '.join(classes)} or {}
        return self.field.label_tag(contents=mark_safe(contents), attrs=attrs)

    def errors(self):
        return mark_safe(self.field.errors.as_ul())


def normalize_fieldsets(fieldsets):
    """
    Make sure the keys in fieldset dictionaries are strings. Returns the
    normalized data.
    """
    result = []
    for name, options in fieldsets:
        result.append((name, normalize_dictionary(options)))
    return result


def normalize_dictionary(data_dict):
    """
    Converts all the keys in "data_dict" to strings. The keys must be
    convertible using str().
    """
    for key, value in data_dict.items():
        if not isinstance(key, str):
            del data_dict[key]
            data_dict[str(key)] = value
    return data_dict


def get_sort_field(attr, model):
    """
    Get's the field to sort on for the given
    attr.

    Currently returns attr if it is a field on
    the given model.

    TODO: Provide a way to sort based on a non field
    attribute.
    """

    try:
        if model._meta.get_field(attr):
            return attr
    except FieldDoesNotExist:
        return None

def pluralize(value, custom_plural):
    if custom_plural:
        return custom_plural
    elif value.lower().endswith('s'):
        return value + "es"
    else:
        return value + 's'

def model_name(model, custom_model_name=None,
               custom_model_name_plural=None, plural=False):

    if custom_model_name:
        value = custom_model_name
        if plural:
            value = pluralize(custom_model_name,
                                    custom_model_name_plural)
    else:
        value = model._meta.verbose_name
        if plural:
            value = model._meta.verbose_name_plural
    return capfirst_if_needed(value)

def capfirst_if_needed(value):
    if value and not value[0].isupper():
        value = capfirst(value)
    return value

def tokenize_tags(tags_string):
    """
    This function is responsible to extract usable tags from a text.
    :param tags_string: a string of text
    :return: a string of comma separated tags
    """

    import re
    # text is parsed in two steps:
    # the first step extract every single world that is 3 > chars long
    # and that contains only alphanumeric characters, underscores and dashes
    tags_string = tags_string.lower().strip(",")
    single_worlds = set([ w for w in re.split(';|,|\*|\n| ',tags_string)
                          if len(w) >= 3 and re.match("^[A-Za-z0-9_-]*$", w) ])
    # the second step divide the original string using comma as separator
    comma_separated = set([t for t in tags_string.split(",") if t])
    # resulting set are merged using union
    return list(single_worlds | comma_separated)
