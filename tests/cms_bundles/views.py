from django import forms
from cms import views, renders
from models import *


class PostsListView(views.ListView):
    """

    """
    #display_fields = ('user_filename',)
    paginate_by = 100
    #filter_form = AssetFilterForm

    def __init__(self, *args, **kwargs):
        super(PostsListView, self).__init__(*args, **kwargs)
        #self.renders['choices'] = AssetRenderer()

