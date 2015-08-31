import logging

from django.utils import timezone
from django.db import models
from django.contrib.contenttypes.models import ContentType

from . import fields

logger = logging.getLogger(__name__)


class Schedulable(models.Model):
    """
    Abstract model that should be implemented
    by models that need to be scheduled.
    """

    class Meta:
        abstract = True

    def get_scheduled_filter_args(self):
        """
        Hook to provide the arguments to identify
        the object being operated on.
        """

        return {
            'pk': self.pk
        }

    def schedule(self, when=None, action=None, **kwargs):
        """
        Schedule an update of this object.

        when: The date for the update.

        action: if provided it will be looked up
        on the implementing class and called with
        **kwargs. If action is not provided each k/v pair
        in kwargs will be set on self and then self
        is saved.

        kwargs: any other arguments you would like passed
        for this change. Saved as a json object so must cleanly
        serialize.
        """

        # when is empty or passed, just save it now.
        if not when or when <= timezone.now():
            self.do_scheduled_update(action, **kwargs)
        else:
            ctype = ContentType.objects.get_for_model(self.__class__)
            Schedule(
                content_type=ctype,
                object_args=self.get_scheduled_filter_args(),
                when=when,
                action=action,
                json_args=kwargs
            ).save()

    def do_scheduled_update(self, action, **kwargs):
        """
        Do the actual update.

        action: if provided it will be looked up
        on the implementing class and called with
        **kwargs. If action is not provided each k/v pair
        in kwargs will be set on self and then self
        is saved.

        kwargs: any other you passed for this update
        passed along to whichever method performs
        the update.
        """

        action = getattr(self, action, None)
        if callable(action):
            return action(**kwargs)
        else:
            for k, v in kwargs.items():
                setattr(self, k, v)
            self.save()


class Schedule(models.Model):
    """
    Model to store scheduled updates.
    """

    content_type = models.ForeignKey(ContentType)
    object_args = fields.JSONField()

    when = models.DateTimeField()
    action = models.CharField(max_length=255, null=True)
    json_args = fields.JSONField()

    def do_updates(self):
        # Only run if we are ready
        if self.when <= timezone.now():
            klass = self.content_type.model_class()
            for obj in klass.objects.filter(**self.object_args):
                obj.do_scheduled_update(self.action, **self.json_args)
        self.delete()

    class Meta:
        app_label = 'scheduling'
