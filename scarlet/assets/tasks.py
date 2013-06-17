try:
    from celery import task
except:
    from .utils import partial as task

from . import get_asset_model, get_image_cropper

@task
def ensure_crops(asset_id, *required_crops, **kwargs):
    """
    Make sure a crop exists for each crop in required_crops.
    Existing crops will not be changed.
    """

    asset = kwargs.pop('asset', None)
    if not asset:
        asset = get_asset_model().objects.get(pk=asset_id)

    required_crops = set(required_crops).union(
                         set(get_image_cropper().required_crops()))

    crops = set(asset.imagedetail_set.all().values_list('name', flat=True))
    needed = required_crops.difference(crops)
    length = len(needed)
    detail_mod = asset.imagedetail_set.model
    for i, size in enumerate(needed):
        last = i==(length-1)
        spec = get_image_cropper().create_crop(size, asset.file)
        detail_mod.save_crop_spec(asset, spec,
                                   update_version=last)


@task
def reset_crops(asset_id, asset=None):
    """
    Reset all known crops to the default crop.

    Done async if settings.ASYNC_CROPS is True and celery is
    installed.
    """

    if not asset:
        asset = get_asset_model().objects.get(pk=asset_id)

    crops = set(asset.imagedetail_set.values_list('name', flat=True))
    crops = crops.union(set(get_image_cropper().required_crops()))
    length = len(crops)
    detail_mod = asset.imagedetail_set.model
    for i, size in enumerate(crops):
        last = i==(length-1)
        spec = get_image_cropper().create_crop(size, asset.file)
        detail_mod.save_crop_spec(asset, spec,
                                   update_version=last)
