from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^(?P<slug>[\d+]+)/get-data/$', views.HotSpotsGetData.as_view(), name='hotspots_submit'),
]
