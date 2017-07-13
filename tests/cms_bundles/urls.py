try:
    from django.conf.urls import include, url
except ImportError:
    from django.conf.urls.defaults import include, patterns, url

from scarlet import cms

cms.autodiscover()
urlpatterns = [
    url(r'^admin/', include(cms.sites.site.urls)),
]

try:
    from scarlet_blog import blog
    urlpatterns += [
        url(r'', include('scarlet_blog.blog.urls')),
    ]
except ImportError:
    pass
