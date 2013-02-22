import logging
from django import forms
from cms import views, renders
from models import *

class EditAuthorForm(forms.ModelForm):
    """
    Form for handling asset updates
    """
    class Meta:
        model = Author
        #fields = ('file', 'tags')

    def __init__(self, *args, **kwargs):
        super(EditAuthorForm, self).__init__(*args, **kwargs)
