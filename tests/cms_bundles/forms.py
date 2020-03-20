from __future__ import unicode_literals
from builtins import object
import logging

from django import forms

from scarlet.cms import views, renders

from .models import *


class EditAuthorForm(forms.ModelForm):
    """
    Form for handling asset updates
    """

    class Meta(object):
        model = Author
        fields = ("name", "bio")

    def __init__(self, *args, **kwargs):
        super(EditAuthorForm, self).__init__(*args, **kwargs)


class TestPostForm(forms.ModelForm):
    class Meta(object):
        model = Post
        fields = "__all__"
