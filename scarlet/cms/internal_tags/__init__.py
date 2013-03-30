import importlib

from .. import settings

if settings.INTERNAL_TAG_HANDLER.startswith('.'):
    handler = importlib.import_module(__name__ + settings.INTERNAL_TAG_HANDLER)
else:
    handler = importlib.import_module(settings.INTERNAL_TAG_HANDLER)
