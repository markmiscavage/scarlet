from django.conf import settings as django_settings

INTERNAL_TAG_HANDLER = getattr(django_settings, 'SCARLET_INTERNAL_TAG_HANDLER',
                             '.taggit_handler')

USE_SCARLET_DATE_FORMATS = getattr(django_settings, 'USE_SCARLET_DATE_FORMATS',
                             True)
DATETIME_INPUT_FORMATS = getattr(django_settings, 'SCARLET_DATETIME_INPUT_FORMAT',
                             '%m/%d/%Y %I:%M:%S %p',)
DATE_INPUT_FORMATS = getattr(django_settings, 'DATE_INPUT_FORMT',
                             '%m/%d/%Y',)
