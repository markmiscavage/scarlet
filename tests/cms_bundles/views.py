from django import forms

from models import *

from scarlet.cms import views, renders

class PostsListView(views.ListView):
    """

    """
    #display_fields = ('user_filename',)
    paginate_by = 100
    #filter_form = AssetFilterForm

    def __init__(self, *args, **kwargs):
        super(PostsListView, self).__init__(*args, **kwargs)
        #self.renders['choices'] = AssetRenderer()

