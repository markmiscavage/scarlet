from django.core.management.commands import dumpdata


class Command(dumpdata.Command):

    def handle(self, *app_labels, **options):
        from django.db.models import get_models
        exclude = options.get('exclude', [])
        for m in get_models():
            if getattr(m._meta, '_is_view', False):
                l = "%s.%s" % (m._meta.app_label, m._meta.object_name)
                exclude.append(l)

        options['exclude'] = exclude
        return super(Command, self).handle(*app_labels, **options)
