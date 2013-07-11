import os.path

from django.conf import settings as django_settings

INTERNAL_TAG_HANDLER = getattr(django_settings, 'SCARLET_INTERNAL_TAG_HANDLER',
                             '.taggit_handler')
