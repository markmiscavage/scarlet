from . import get_asset_model, get_image_cropper
from . import settings


def optional_celery(**kparms):
    name = kparms.pop('name', None)

    def wrapped(func):
        def inner(*args, **kw):
            return func(*args, **kw)
        return inner

    if settings.USE_CELERY_DECORATOR:
        from celery import task
        wrapper = task(**kparms)

    elif settings.CELERY:
        wrapper = settings.CELERY.task(**kparms)
    else:
        wrapper = wrapped
    return wrapper


@optional_celery(name='assets_ensure_crops')
def ensure_crops(asset_id, *required_crops, **kwargs):
    asset = kwargs.pop('asset', None)
    if not asset or asset_id:
        asset = get_asset_model().objects.get(pk=asset_id)

    required_crops = set(required_crops).union(
                         set(get_image_cropper().required_crops()))

    crops = set(asset.imagedetail_set.all().values_list('name', flat=True))
    needed = required_crops.difference(crops)
    length = len(needed)
    detail_mod = asset.imagedetail_set.model
    for i, size in enumerate(needed):
        last = i == (length-1)
        spec = get_image_cropper().create_crop(size, asset.file)
        detail_mod.save_crop_spec(asset, spec,
                                   update_version=last)


@optional_celery(name='assets_reset_crops')
def reset_crops(asset_id, asset=None, **kwargs):
    if not asset or asset_id:
        asset = get_asset_model().objects.get(pk=asset_id)

    crops = set(asset.imagedetail_set.values_list('name', flat=True))
    crops = crops.union(set(get_image_cropper().required_crops()))
    length = len(crops)
    detail_mod = asset.imagedetail_set.model
    for i, size in enumerate(crops):
        last = i == (length-1)
        spec = get_image_cropper().create_crop(size, asset.file)
        detail_mod.save_crop_spec(asset, spec,
                                   update_version=last)
