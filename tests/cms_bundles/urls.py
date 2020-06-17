from __future__ import unicode_literals

from django.urls import include, path
from scarlet.cms.sites import site
from scarlet import cms

cms.autodiscover()
urlpatterns = [
    path("admin/", site.urls)
]

try:
    from scarlet_blog import blog

    urlpatterns += [
        path(r"", include("scarlet_blog.blog.urls")),
    ]
except ImportError:
    pass
