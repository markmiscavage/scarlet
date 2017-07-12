from django import forms

from . import models


class HotSpotForm(forms.ModelForm):
    class Meta:
        model = models.HotSpot
        fields = ('x_cord', 'y_cord', 'order', 'icon', 'label', 'text', 'image', 'video_json', )


class HotSpotModuleForm(forms.ModelForm):
    class Meta:
        model = models.HotSpotModule
        fields = ('name', 'image', )
