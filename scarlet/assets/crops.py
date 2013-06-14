import os
import urllib
import tempfile
from collections import namedtuple

from django.core.files.storage import default_storage
from django.core.files import File

try:
    from PIL import Image, ImageFile
except ImportError:
    import Image, ImageFile
ImageFile.MAXBLOCK = 65536

from . import utils
from . import signals
from . import settings

CropSpec = namedtuple('CropSpec', ['name','editable', 'width',
                                   'height','x', 'x2', 'y', 'y2'])

class CropConfig(object):
    def __init__(self, name, width=None, height=None,
                 quality=90, editable=True, upscale=False):
        self.name = name
        self.width=width
        self.height=height
        self.upscale=upscale
        self.quality=quality
        self.editable=editable

    def _coordinates_for_width(w, h):
        r = self.width / w
        new_height = (r * h)
        diff = h - new_height
        x = 0
        x2 = w * r
        y = diff / 2
        y2 = new_height + (diff/2)
        return x, x2, y, y2

    def _coordinates_for_height(w, h):
        r = self.height / h
        new_width = (r * h)
        diff = h - new_height
        x = diff / 2
        x2 = new_width + (diff/2)
        y = 0
        y2 = r * h
        return x, x2, y, y2

    def get_crop_spec(self, im, x=None, x2=None, y=None, y2=None):
        """
        Returns the default crop points for this image.

        TODO: Calculate coordinates for the crop
        """
        width, height = 100, 100
        x, y = 0, 0
        x2, y2 = 100, 100
        return CropSpec(name=self.name,
                        editable=self.editable,
                        width=width,height=height,
                        x=x,x2=x2,y=y,y2=y2)

    def process_image(self, im, crop_spec=None):
        if crop_spec:
            crop_spec = self.get_crop_spec(im)
        return scale_and_crop(im, crop_spec)

class Cropper(object):
    _registry = {}

    def __init__(self, storage=None):
        self.storage = storage or default_storage
        self._required_crops = []
        for k, v in settings.IMAGE_SIZES.items():
            if v and isinstance(v, dict):
                self.register(CropConfig(k, **v))
                self._required_crops.append(k)

    def required_crops(self):
        return self._required_crops

    def register(self, config):
        assert isinstance(config, CropConfig)
        if config.name in self._registry:
            seen = self._registry[config.name]
            for attr in ('name', 'width', 'height'
                 'scale', 'crop', 'editable'):
                if getattr(seen, attr) != getattr(config, attr):
                    raise ValueError("{0} is already registered as a different crop")
        self._registry[config.name] = config

    def unregister(self, name):
        if name in self._registry:
            del self._registry[name]

    def create_crop(self, name, file_obj,
                    x=None, x2=None, y=None, y2=None):
        """
        Generate Version for an Image.
        value has to be a serverpath relative to MEDIA_ROOT.
        """

        if not name in self._registry:
            return

        file_obj.seek(0)
        im = Image.open(file_obj)
        config = self._registry[name]

        if x and x2 and y and y2 and not config.editable:
            # You can't ask for something special
            # for non editable images
            return

        crop_spec = config.get_crop_spec(im, x=x, x2=x2, y=y, y2=y2 )
        image = config.process_image(im, crop_spec=crop_spec)
        if image:
            crop_name = utils.get_size_filename(file_obj.name, name)
            self._save_file(image, crop_name)
            return crop_spec

    def _save_file(self, im, filename, quality=90):
        tmpfile = File(tempfile.NamedTemporaryFile())
        try:
            root, ext = os.path.splitext(filename)
            try:
                im.save(tmpfile, format=Image.EXTENSION[ext.lower()], quality=quality,
                             optimize=(ext != '.gif'))
            except IOError:
                im.save(tmpfile, format=Image.EXTENSION[ext.lower()], quality=quality)

            if filename != self.storage.get_available_name(filename):
                self.storage.delete(filename)

            self.storage.save(filename, tmpfile)
            url = self.storage.url(filename)
            utils.update_cache_bust_version(url)
            signals.file_saved.send(filename)
            print 'hi'
        finally:
            tmpfile.close()

def scale_and_crop(im, crop_spec):
    """
    Scale and Crop.
    """
    w, h = [float(v) for v in im.size]
    im = im.crop((crop_spec.x, crop_spec.y, crop_spec.x2, crop_spec.y2))

    im = im.resize((crop_spec.width, crop_spec.height),
                   resample=Image.ANTIALIAS)

    return im

cropper = Cropper()
