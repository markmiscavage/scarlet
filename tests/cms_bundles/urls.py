from django.conf.urls import include, patterns, url

from scarlet import cms

cms.autodiscover()
urlpatterns = patterns('',
    (r'^admin/', include(cms.site.urls)),
)
