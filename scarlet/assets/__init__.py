import importlib

from django.apps import apps as djapps
from django.core.exceptions import ImproperlyConfigured

from . import settings

default_app_config = 'scarlet.assets.apps.AppConfig'


def get_asset_model():
    try:
        app_label, model_name = settings.ASSET_MODEL.rsplit('.', 1)
    except ValueError:
        raise ImproperlyConfigured("ASSET_MODEL must be of the form 'app_label.model_name'")

    return djapps.get_model(app_label, model_name)


def get_image_cropper():
    parts = settings.IMAGE_CROPPER.rsplit('.', 1)
    importpath = parts[0]
    attr = parts[-1]
    if importpath.startswith('.'):
        mod = importlib.import_module(__name__ + importpath)
    else:
        mod = importlib.import_module(importpath)
    return getattr(mod, attr)
