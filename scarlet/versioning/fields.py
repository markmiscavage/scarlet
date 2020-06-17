from __future__ import unicode_literals
from builtins import str
from django.db import models
from django.db.models.fields import related

from .models import VersionView


class FKToVersion(models.ForeignKey):
    """
    Field that creates a relation between a
    version and another model
    """

    def __init__(self, *args, **kwargs):
        kwargs["to_field"] = "vid"
        # Two cases that should only be caused from an upgrade
        # of an old project where certain params weren't required
        if kwargs.get("on_delete"):
            on_delete = kwargs.get("on_delete")
            del kwargs["on_delete"]
        else:
            on_delete = models.CASCADE

        if kwargs.get("to"):
            to = kwargs.get("to")
            del kwargs["to"]
        else:
            to = args[0]

        args = (to, on_delete)

        super(FKToVersion, self).__init__(*args, **kwargs)

    def deconstruct(self):
        """
        FK to version always points to a version table
        """
        name, path, args, kwargs = super(FKToVersion, self).deconstruct()
        if not kwargs["to"].endswith("_version"):
            kwargs["to"] = "{0}_version".format(kwargs["to"])
        return name, path, args, kwargs


class M2MFromVersion(models.ManyToManyField):
    """
    Field that creates a many to many relation between a
    version and another model.
    """

    def __init__(self, to, **kwargs):
        # Symmetrical doesn't work with M2m relationships to
        # self and versioning.

        if to == "self":
            kwargs["symmetrical"] = False

        super(M2MFromVersion, self).__init__(to, **kwargs)

    def update_rel_to(self, klass):
        """
        If we have a string for a model, see if we know about it yet,
        if so use it directly otherwise take the lazy approach.
        This check is needed because this is called before
        the main M2M field contribute to class is called.
        """
        if isinstance(related.resolve_relation(klass, self.remote_field.model), str):
            relation = related.resolve_relation(klass, self.remote_field.model)
            try:
                app_label, model_name = relation.split(".")
            except ValueError:
                # If we can't split, assume a model in current app
                app_label = klass._meta.app_label
                model_name = relation

            model = None
            try:
                model = klass._meta.apps.get_registered_model(app_label, model_name)
            # For django < 1.6
            except AttributeError:
                model = models.get_model(
                    app_label, model_name, seed_cache=False, only_installed=False
                )
            except LookupError:
                print(
                    "LookupError: Unable to find model %s.%s." % (app_label, model_name)
                )

            if model:
                self.remote_field.model = model

    def contribute_to_class(self, cls, name):
        """
        Because django doesn't give us a nice way to provide
        a through table without losing functionality. We have to
        provide our own through table creation that uses the
        FKToVersion field to be used for the from field.
        """

        self.update_rel_to(cls)

        # Called to get a name
        self.set_attributes_from_name(name)
        self.model = cls

        # Set the through field
        if not self.remote_field.through and not cls._meta.abstract:
            self.remote_field.through = create_many_to_many_intermediary_model(
                self, cls
            )

        # Do the rest
        super(M2MFromVersion, self).contribute_to_class(cls, name)


def create_many_to_many_intermediary_model(field, klass):
    """
    Copied from django, but uses FKToVersion for the
    'from' field. Fields are also always called 'from' and 'to'
    to avoid problems between version combined models.
    """
    managed = True
    temp_to_model = related.resolve_relation(klass, field.remote_field.model)
    if (
        isinstance(temp_to_model, str)
        and temp_to_model != related.RECURSIVE_RELATIONSHIP_CONSTANT
    ):
        to_model = temp_to_model
        to = to_model.split(".")[-1]

        def set_managed(model, related, through):
            through._meta.managed = model._meta.managed or related._meta.managed

        lazy_name = "%s_%s" % (klass._meta.object_name, field.name)
        related.lazy_related_operation(set_managed, klass, to_model, lazy_name)
    elif isinstance(temp_to_model, str):
        to = klass._meta.object_name
        to_model = klass
        managed = klass._meta.managed
    else:
        to = temp_to_model._meta.object_name
        to_model = temp_to_model
        managed = klass._meta.managed or to_model._meta.managed
        if issubclass(klass, VersionView):
            managed = False

    name = "%s_%s" % (klass._meta.object_name, field.name)
    if (
        temp_to_model == related.RECURSIVE_RELATIONSHIP_CONSTANT
        or to == klass._meta.object_name
    ):
        from_ = "from_%s" % to.lower()
        to = "to_%s" % to.lower()
    else:
        from_ = klass._meta.object_name.lower()
        to = to.lower()

    meta = type(
        "Meta",
        (object,),
        {
            "db_table": field._get_m2m_db_table(klass._meta),
            "managed": managed,
            "auto_created": klass,
            "app_label": klass._meta.app_label,
            "db_tablespace": klass._meta.db_tablespace,
            "unique_together": ("from", "to"),
            "verbose_name": "%(from)s-%(to)s relationship" % {"from": from_, "to": to},
            "verbose_name_plural": "%(from)s-%(to)s relationships"
            % {"from": from_, "to": to},
            "apps": field.model._meta.apps,
        },
    )

    # Construct and return the new class.
    return type(
        str(name),
        (models.Model,),
        {
            "Meta": meta,
            "__module__": klass.__module__,
            "from": FKToVersion(
                klass,
                related_name="%s+" % name,
                db_tablespace=field.db_tablespace,
                db_constraint=field.remote_field.db_constraint,
                on_delete=models.CASCADE,
            ),
            "to": models.ForeignKey(
                to_model,
                related_name="%s+" % name,
                db_tablespace=field.db_tablespace,
                db_constraint=field.remote_field.db_constraint,
                on_delete=models.CASCADE,
            ),
        },
    )
