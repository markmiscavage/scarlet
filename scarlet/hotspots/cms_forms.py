from django import forms

from . import models


class HotSpotForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(HotSpotForm, self).__init__(*args, **kwargs)
        self.fields.get('order').widget.attrs['class'] = 'order-inp'

    class Meta:
        model = models.HotSpot
        fields = ('x_cord', 'y_cord', 'order', 'icon', 'label', 'text', 'image', 'video_json', )


class HotSpotModuleForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(HotSpotModuleForm, self).__init__(*args, **kwargs)
        self.fields['intro_copy'].widget = forms.Textarea()

    class Meta:
        model = models.HotSpotModule
        fields = ('name', 'image', 'intro_copy')
