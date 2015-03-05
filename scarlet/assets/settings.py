from django.conf import settings


# Main Assets Directory. This will be a subdirectory within MEDIA_ROOT.
# Set to None to use MEDIA_ROOT directly
DIRECTORY = getattr(settings, "ASSETS_DIR", 'assets')

# Which size should be used as CMS thumbnail for images.
CMS_THUMBNAIL_SIZE = getattr(settings, 'ASSETS_CMS_THUMBNAIL_SIZE', '80x80')

# EXTRA SETTINGS
# Convert Filename (UUID)
HASH_FILENAME = getattr(settings, "ASSETS_HASH_FILENAME", True)

# Append a qs to assets urls for cache busting
USE_CACHE_BUST = getattr(settings, "ASSETS_USE_CACHE_BUST", True)

ASSET_MODEL = getattr(settings, "ASSET_MODEL", "assets.Asset")

ASSET_TYPES = getattr(settings, "ASSET_TYPES", None)

DEFAULT_IMAGE_SIZES = {
    'admin': {
        'width': 100, 'height': 100,
        'editable': False, 'upscale': True,
    },
}

IMAGE_SIZES = getattr(settings, "IMAGE_SIZES", DEFAULT_IMAGE_SIZES)

IMAGE_CROPPER = '.crops.cropper'

CELERY = getattr(settings, "ASSET_CELERY", None)
USE_CELERY_DECORATOR = getattr(settings, "ASSET_USE_CELERY_DECORATOR", False)
