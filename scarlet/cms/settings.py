from django.conf import settings as django_settings

INTERNAL_TAG_HANDLER = getattr(django_settings, 'SCARLET_INTERNAL_TAG_HANDLER',
                             '.taggit_handler')

USE_SCARLET_DATE_FORMATS = getattr(django_settings, 'USE_SCARLET_DATE_FORMATS',
                             True)
DATETIME_INPUT_FORMATS = getattr(django_settings, 'SCARLET_DATETIME_INPUT_FORMAT',
                             '%m/%d/%Y %I:%M:%S %p',)
DATE_INPUT_FORMATS = getattr(django_settings, 'DATE_INPUT_FORMT',
                             '%m/%d/%Y',)

# -- Icon names used by modules
# --   In order to display icons on FE, models modules should include a
# --   property with one of this values:
# --   Example:
# --     @property
# --     def icon_kind(self):
# --         return 'text'
VALID_MODULES_ICONS = (
    'image',
    'video',
    'text',
    'link',
    'social',
    'promo',
    'newsletter',
    'audio',
    'quote',
    'quiz',
    'poll',
    'seo',
)
SCARLET_MODULES_ICONS = getattr(django_settings, 'SCARLET_MODULES_ICONS', VALID_MODULES_ICONS)
