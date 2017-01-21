from __future__ import unicode_literals
try:
    from django.conf.urls import include, patterns, url
except ImportError:
    from django.conf.urls.defaults import include, patterns, url

from scarlet import cms
from scarlet.cms.sites import site

cms.autodiscover()
urlpatterns = patterns('',
    (r'^admin/', include(site.urls)),
)

try:
    from scarlet_blog import blog
    urlpatterns += patterns('',
        (r'', include('scarlet_blog.blog.urls')),
    )
except ImportError:
    pass
