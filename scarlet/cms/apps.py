from django.apps import AppConfig

class ScarletCMSConfig(AppConfig):
    name = 'scarlet.cms'

    def ready(self):
        super(ScarletCMSConfig, self).ready()
        self.module.autodiscover()
