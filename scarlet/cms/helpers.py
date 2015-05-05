from __future__ import unicode_literals

from django import forms
from django.forms.utils import flatatt, ErrorList
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
    models.ManyToManyField:  {'widget': widgets.APIManyChoiceWidget},
    models.DateTimeField:    {'widget': widgets.DateTimeWidget},
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
        self.link_num = 0
        if formset:
            for i, field in enumerate(visible_fields):
                if not formset.empty_form.fields.get(field):
                    self.link_num = i
                    break

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

        if type(self.object_list) == type([]):
            model = self.formset.model
        else:
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
                if sortable and field == self.sort_field:
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
            return get_field_value(field, self.instance)

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

class AdminFormSets(object):

    def __init__(self, formsets, combined_defs):
        self.formsets = formsets
        self.combined_sets = []
        self.hidden_sets = set()

        if combined_defs:
            if type(combined_defs) == dict:
                self._add_combined(combined_defs)

            elif hasattr(combined_defs, '__iter__'):
                for set_def in combined_defs:
                    if not type(set_def) == dict:
                        continue

                    self._add_combined(set_def)

    def _add_combined(self, set_def):
        keys = set_def.get('keys')
        self.hidden_sets = self.hidden_sets.union(set(keys))
        self.combined_sets.append(
            CombinedMultiFormSet(self, **set_def)
        )

    def visible_formsets(self):
        for v in self.combined_sets:
            yield v.title, v
        for k, v in self.formsets.items():
            if not k in self.hidden_sets:
                yield k, v

    def all_formsets(self):
        for k, v in self.formsets.items():
            yield k, v

class CombinedMultiFormSet(object):

    def __init__(self, admin_formset, keys=None, order_by=None, title=None):
        if not order_by:
            order_by = 'order'

        self.title = title
        self.keys = keys
        self.order_by = order_by
        self.admin_formset = admin_formset
        self.combined = True

    @property
    def formsets(self):
        return self.admin_formset.formsets

    def management_form(self):
        return mark_safe(''.join([unicode(x.management_form) for k, x in self.formsets.items() \
                        if k in self.keys]))

    def non_form_errors(self):
        return mark_safe(''.join([unicode(x.non_form_errors()) for k, x in self.formsets.items() \
                        if k in self.keys]))

    def __iter__(self):
        forms = []
        for k, formset in self.formsets.items():
            forms = forms + [(x, k) for x in formset ]

        forms = sorted(forms, key=lambda f: getattr(f[0].instance, self.order_by))
        for f in forms:
            yield f[0], self.formsets[f[1]]



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
            cls = ReadOnlyField
            if (type(field) == str or type(field) == unicode) and \
                                        field in self.form.fields:
                cls = AdminField
            yield cls(self.form, field, is_first=(i == 0))

    def errors(self):
        fields = [f for f in self.fields if f in self.form.fields]
        return mark_safe(u'\n'.join([self.form[f].errors.as_ul()
                         for f in fields]))


class AdminField(object):
    def __init__(self, form, field, is_first):
        self.field = form[field]  # A django.forms.BoundField instance
        self.is_first = is_first  # Whether this field is first on the line
        self.is_checkbox = isinstance(self.field.field.widget,
                                      forms.CheckboxInput)
        self.is_date = isinstance(self.field.field,
                                      forms.DateField) or \
                       isinstance(self.field.field,
                                      forms.SplitDateTimeField)

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


class InnerField(object):
    def __init__(self, field, instance):
        if callable(field):
            class_name = field.__name__ != '<lambda>' and field.__name__ or ''
        else:
            class_name = field

        self.name = class_name
        self.label = label_for_field(field, instance.__class__)
        self.field_repr = get_field_value(field, instance)
        self.help_text = get_field_attr(field, instance, "help_text", "")

    def __unicode__(self):
        return force_unicode(self.field_repr)

class ReadOnlyField(object):
    def __init__(self, form, field, is_first):
        self.field = InnerField(field, form.instance)
        self.form = form
        self.is_first = is_first
        self.is_checkbox = False
        self.is_readonly = True

    def label_tag(self):
        attrs = {}
        if not self.is_first:
            attrs["class"] = "inline"
        label = self.field.label
        return mark_safe('<label{0}>{1}:</label>'.format(
                           conditional_escape(flatatt(attrs)),
                           capfirst(conditional_escape(force_unicode(label)))))

    def errors(self):
        return ErrorList()

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

    If the models has an attribute matching that name
    and that value has an attribute 'sort_field' than
    that value is used.

    TODO: Provide a way to sort based on a non field
    attribute.
    """

    try:
        if model._meta.get_field(attr):
            return attr
    except FieldDoesNotExist:
        if isinstance(attr, basestring):
            val = getattr(model, attr, None)
            if val and hasattr(val, 'sort_field'):
                return getattr(model, attr).sort_field
        return None

def get_field_value(field, instance):
    try:
        f = instance._meta.get_field(field)
        try:
            value = getattr(instance, field)
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
            value = field(instance)
        else:
            attr = getattr(instance, field)
            if callable(attr):
                value = attr()
            else:
                value = attr
    return value

def get_field_attr(field, instance, attr, default=""):
    value = default
    try:
        f = instance._meta.get_field(field)
        value = getattr(f, attr, default)
    except models.FieldDoesNotExist:
        if callable(field):
            value = getattr(field, attr, default)
        else:
            p = getattr(instance, field)
            if callable(p):
                value = getattr(p, attr, default)
    return value

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
