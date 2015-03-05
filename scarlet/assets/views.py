import logging

from django.db.models import FileField
from django import http

try:
    from ..cms import views, renders
except ValueError:
    from cms import views, renders

from . import get_image_cropper
from .forms import AssetFilterForm, CropForm
from .models import AssetBase
from .renders import AssetRenderer
from . import settings
from . import fields
from . import widgets

# Get an instance of a logger
logger = logging.getLogger(__name__)


class AssetListView(views.ListView):
    """
    A view class to manage the list of all assets
    """
    display_fields = ('user_filename',)
    paginate_by = 100
    filter_form = AssetFilterForm

    def __init__(self, *args, **kwargs):
        super(AssetListView, self).__init__(*args, **kwargs)
        self.renders['choices'] = AssetRenderer()

    def get_queryset(self, **filter_kwargs):
        qs = super(AssetListView, self).get_queryset(**filter_kwargs)
        return qs.distinct()

class CropVersionView(views.FormView):
    default_template = "assets/crop.html"
    slug_field = 'name'
    base_filter_kwargs = {'editable': True}
    readonly_fields = ('width', 'height', 'name')
    cancel_view = "edit_asset"

    def get_object(self):
        try:
            return super(CropVersionView, self).get_object()
        except http.Http404, e:
            if getattr(self, 'parent_object', None):
                name = self.kwargs[self.slug_url_kwarg]
                crop = get_image_cropper().get_crop_config(name)
                if crop and crop.editable:
                    return self.model(editable=True, name=name,
                                      x=0, y=0, x2=0, y2=0,
                                      image=self.parent_object,
                                      width=crop.width, height=crop.height)
            raise

    def get_success_url(self):
        return self.bundle.get_view_url("edit_asset",
                                        self.request.user, {},
                                        self.kwargs)

    def form_valid(self, form, formsets):
        self.object.image.create_crop(self.object.name,
                                      form.cleaned_data['x'],
                                      form.cleaned_data['x2'],
                                      form.cleaned_data['y'],
                                      form.cleaned_data['y2'])
        return self.success_response()


class CropView(views.ModelCMSMixin, views.ModelFormMixin,
                views.ModelCMSView):
    base_template = "cms/partial.html"
    slug_field = 'pk'

    def get_asset_url(self):
        return self.bundle.get_view_url("edit",
                                        self.request.user, {},
                                        self.kwargs)

    def get(self, request, *args, **kwargs):
        self.object = self.get_object()
        form = CropForm()
        context = {
            'form': form,
            'obj': self.object,
            'cancel_url': self.get_asset_url()
        }
        return self.render(request, **context)

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        form = CropForm(request.POST)
        if form.is_valid():
            im = get_image_cropper().replace_image(self.object.file,
                                                   **form.cleaned_data)
            self.object.reset_crops()
            return self.render(self.request,
                               redirect_url=self.get_asset_url())
        else:
            context = {
                'form': form,
                'obj': self.object,
            }
            return self.render(request, **context)


class AssetFormView(views.FormView):
    """
    A view class to manage the asset form
    """
    default_template = "assets/edit.html"

    def __init__(self, *args, **kwargs):
        super(AssetFormView, self).__init__(*args, **kwargs)
        self.renders['popup'] = renders.PopupRender(
                redirect_template='assets/asset_uploaded.html',
                template=self.default_template
        )

    def render(self, *args, **kwargs):
        obj = kwargs.get('obj')
        if obj and obj.type == self.model.IMAGE:
            kwargs['crops'] = obj.imagedetail_set.filter(editable=True)
        return super(AssetFormView, self).render(*args, **kwargs)

    def formfield_for_dbfield(self, db_field, **kwargs):
        if isinstance(db_field, FileField):
            kwargs['widget'] = widgets.RawImageWidget
        return super(AssetFormView, self).formfield_for_dbfield(db_field, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(AssetFormView, self).get_form_kwargs()

        initial = {}
        asset_type = self.request.GET.get('type', AssetBase.UNKNOWN)
        if asset_type:
            initial['type'] = asset_type

        asset_tags = self.request.GET.get('tags', None)
        if asset_tags:
            initial['tags'] = asset_tags

        if len(initial):
            kwargs['initial'].update(initial)

        return kwargs

    def success_response(self, message=None):
        if hasattr(self.object.file, 'admin_url'):
            thumbnail = self.object.file.admin_url

        context = {'obj': self.object, 'thumb_url': thumbnail}

        return self.render(self.request,
                           redirect_url=self.get_success_url(),
                           collect_render_data=False,
                           **context)
