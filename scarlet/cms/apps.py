from django.apps import AppConfig as DjangoAppConfig


class AppConfig(DjangoAppConfig):
    name = 'scarlet.cms'

    def ready(self):
        super(AppConfig, self).ready()
        self.module.autodiscover()
