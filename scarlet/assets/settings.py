from django.conf import settings


# Main Assets Directory. This will be a subdirectory within MEDIA_ROOT.
# Set to None to use MEDIA_ROOT directly
DIRECTORY = getattr(settings, "ASSETS_DIR", 'assets')

# Which size should be used as CMS thumbnail for images.
CMS_THUMBNAIL_SIZE = getattr(settings, 'ASSETS_CMS_THUMBNAIL_SIZE', '80x80')

# EXTRA SETTINGS
# Convert Filename (UUID)
HASH_FILENAME = getattr(settings, "ASSETS_HASH_FILENAME", True)
