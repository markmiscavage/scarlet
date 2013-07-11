import os.path

from django.conf import settings as django_settings

INTERNAL_TAG_HANDLER = getattr(django_settings, 'SCARLET_INTERNAL_TAG_HANDLER',
                             '.taggit_handler')


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__)))
SCARLET_SOURCE_ROOT = os.path.join(PROJECT_ROOT, 'source')
django_settings.STATICFILES_DIRS += (SCARLET_SOURCE_ROOT,)
