from scarlet.cms import bundles, views
from scarlet.cms.sites import site

from . import models, cms_views, cms_forms


class HotSpotBundle(bundles.Bundle):
    object_view = bundles.PARENT
    navigation = bundles.PARENT

    main = cms_views.HotSpotMainView(default_template='hotspots/edit.html')

    class Meta:
        model = models.HotSpot
        parent_field = 'module'


class HotSpotModuleEditBundle(bundles.ObjectOnlyBundle):
    navigation = (
        ('main', 'Settings'),
        ('hotspots', 'HotSpots'),
    )

    hotspots = HotSpotBundle.as_subbundle(name='hostspot_bundle')
    main = views.FormView(form_class=cms_forms.HotSpotModuleForm)

    class Meta:
        model = models.HotSpotModule


class HotSpotModuleBundle(bundles.Bundle):
    dashboard = (
        ('main', 'Hotspot module'),
    )

    main = views.ListView(
        display_fields=('name', 'image', ),
        paginate_by=20,
    )

    edit = HotSpotModuleEditBundle.as_subbundle(name='hotspot_module_edit')
    add = views.FormView(form_class=cms_forms.HotSpotModuleForm, force_add=True)

    class Meta:
        model = models.HotSpotModule
        primary_model_bundle = True


class HotSpotModuleDashboardBundle(bundles.BlankBundle):
    dashboard = (('hotspots', ), )

    hotspots = HotSpotModuleBundle.as_subbundle(name='hotspots')


# Registering bundles
site.register('hotspots', HotSpotModuleDashboardBundle(name='hotspots'), title='HotSpot Modules', order=5)
