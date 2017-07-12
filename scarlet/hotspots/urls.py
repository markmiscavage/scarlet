from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^api/modules/(?P<slug>[\w-]+)/$', views.HotSpotModuleView.as_view(), name='hospots_module'),
    url(r'^(?P<slug>[\d+]+)/get-data/$', views.HotSpotsGetData.as_view(), name='hotspots_submit'),
]
