from django.db import models
from django.utils import timezone


class CMSLog(models.Model):
    """
    A log of changes that have happened in the cms.
    Sets constants for the following actions:

    * SAVE
    * DELETE
    * PUBLISH
    * UNPUBLISH
    * SCHEDULE
    """
    SAVE = 0
    DELETE = 2
    PUBLISH = 3
    UNPUBLISH = 4
    SCHEDULE = 5

    ACTIONS = (
        (SAVE, 'Save'),
        (DELETE, 'Delete'),
        (PUBLISH, 'Published'),
        (UNPUBLISH, 'Unpublished'),
        (SCHEDULE, 'Scheduled')
    )

    action = models.PositiveIntegerField(choices=ACTIONS)
    action_date = models.DateTimeField(blank=True, null=True)

    model_repr = models.CharField(max_length=255)
    object_repr = models.CharField(max_length=255)
    url = models.CharField(max_length=255, blank=True)
    section = models.CharField(max_length=255, blank=True)

    user_name = models.CharField(max_length=255)
    when = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = 'cms'
