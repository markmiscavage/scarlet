from django.core.management.commands import dumpdata


class Command(dumpdata.Command):

    def handle(self, *app_labels, **options):
        from django.apps import apps
        exclude = options.get('exclude', [])
        for m in apps.get_models():
            if getattr(m._meta, '_is_view', False):
                l = "%s.%s" % (m._meta.app_label, m._meta.object_name)
                exclude.append(l)

        options['exclude'] = exclude
        return super(Command, self).handle(*app_labels, **options)
