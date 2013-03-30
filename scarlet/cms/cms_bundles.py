from .internal_tags.forms import TagFilterForm
from .internal_tags import handler

from . import views, bundles
from . import site

class TagListView(views.ListView):
    display_fields = ('name',)
    paginate_by = 100
    filter_form = TagFilterForm

class TagBundle(bundles.Bundle):
    main = TagListView()

    class Meta:
        primary_model_bundle = False
        model = handler.get_model()

site.register('tags', TagBundle(name='tags'), 20)
