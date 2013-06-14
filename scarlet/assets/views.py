import logging

from django.db.models import FileField

try:
    from ..cms import views, renders
except ValueError:
    from cms import views, renders

from .forms import AssetFilterForm
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


class AssetFormView(views.FormView):
    """
    A view class to manage the asset form
    """
    def __init__(self, *args, **kwargs):
        super(AssetFormView, self).__init__(*args, **kwargs)
        self.renders['popup'] = renders.PopupRender(
                redirect_template='assets/asset_uploaded.html',
                template=self.default_template
        )

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
