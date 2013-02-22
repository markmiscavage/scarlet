from django.conf.urls.defaults import url, patterns

import views

# Unused views
p_list = (
    url(r'^type/(?P<type_slug>[\w.-]+)/$', views.AssetListView.as_view(),
                                        name='asset_list_type'),
    url(r'^upload/type/(?P<type_slug>[\w.-]+)/$',
                views.AssetFormView.as_view(),
                name='asset_form_type'),
    # temp fallback
    url(r'^upload/$', views.AssetFormView.as_view(), name='asset_form'),
    url(r'^tags/$', views.TagListView.as_view(), name='tag_list'),
    # temp fallback
    url(r'^$', views.AssetListView.as_view(), name='asset_list')
)

urlpatterns = patterns('', [])
