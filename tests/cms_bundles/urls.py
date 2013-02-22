from django.conf.urls.defaults import include, patterns, url

import cms

cms.autodiscover()
urlpatterns = patterns('',
    (r'^admin/', include(cms.site.urls)),
)
