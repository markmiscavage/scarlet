from django.db import models
from django import forms

from . import widgets


class OrderFormField(forms.IntegerField):
    """
    Form field for order fields.

    :param is_order_field: Set to True
    """

    is_order_field = True


class OrderField(models.PositiveIntegerField):
    """
    PositiveIntegerField that should be used to order the model
    it appears in. Default is set to 0.

    When this field is added to a model that does not specify
    default ordering on its meta class, ordering will be set to
    this field.

    Uses `OrderFormField` as its default form field.
    """

    def __init__(self, *args, **kwargs):
        if 'default' not in kwargs:
            kwargs['default'] = 0
        kwargs['db_index'] = True
        super(OrderField, self).__init__(*args, **kwargs)

    def contribute_to_class(self, cls, name):
        super(OrderField, self).contribute_to_class(cls, name)
        if not cls._meta.ordering:
            cls._meta.ordering = ('order',)

    def formfield(self, form_class=OrderFormField, **kwargs):
        return super(OrderField, self).formfield(form_class=form_class,
                                                 **kwargs)


class HTMLTextField(models.TextField):
    """
    TextField that uses a WYSIWYG editor as its default widget.
    """

    def formfield(self, *args, **kwargs):
        if kwargs.get('widget', None) is None:
            kwargs['widget'] = widgets.HTMLWidget
        return super(HTMLTextField, self).formfield(*args, **kwargs)


class AnnotationHTMLTextField(HTMLTextField):
    """
    TextField that uses a WYSIWYG editor with annotation support as its
    default widget.
    """
    def formfield(self, *args, **kwargs):
        kwargs['widget'] = widgets.AnnotatedHTMLWidget
        return super(HTMLTextField, self).formfield(*args, **kwargs)
