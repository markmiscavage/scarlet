import json

from django.db import models
from django.core.serializers.json import DjangoJSONEncoder


class JSONField(models.TextField):

    # Used so to_python() is called
    __metaclass__ = models.SubfieldBase

    def __init__(self, *args, **kwargs):
        self.dump_kwargs = kwargs.pop('dump_kwargs',
                                      {'cls': DjangoJSONEncoder})
        self.load_kwargs = kwargs.pop('load_kwargs', {})

        super(JSONField, self).__init__(*args, **kwargs)

    def to_python(self, value):
        if value is None or value == '':
            return {}
        elif isinstance(value, basestring):
            return json.loads(value, **self.load_kwargs)
        else:
            return value

    def get_db_prep_value(self, value, connection, prepared=False):
        """Convert JSON object to a string"""
        if isinstance(value, basestring):
            return value
        return json.dumps(value, **self.dump_kwargs)

    def south_field_triple(self):
        "Returns a suitable description of this field for South."
        # We'll just introspect the _actual_ field.
        field_class = "django.db.models.fields.TextField"
        try:
            from south.modelsinspector import introspector
            args, kwargs = introspector(self)
        except ImportError:
            args, kwargs = [], {}

        # That's our definition!
        return (field_class, args, kwargs)
