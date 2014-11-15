"""
This repeats tons of code from django's implementation
just to overide the ModelState class that is used for each model
so we can change db table for VersionViews to the BasePost for
related fields. It is pretty sucky, and needs a better solution
that will be supported by django long term.

Other options that were considered and discarded:

1) Abusing django's undocumented swappable models doesn't work well because there is no
way for that to be changed once the model class has been loaded. Tests
require migrations to be run which requires the swappable model to be a BaseModel
but then when the tests are actually run the swappable model needs to be
the VersionView. Without a way to force django to reconstruct all apps and models
after a migration this would break testing.

2) Overiding the SchemaEditor for our db backend is a bad option because the methods
there are gigantic without clean hooks that would let us do the subsitution in all
cases when we are dealing with a related field. So we'd end up duplicating even more
way more complex code.

3) Monkey patching the effected related field types is arguably worse/dirtier.
"""

import sys

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.core.management.commands.makemigrations import Command as BaseMakeMigrations
from django.db.models import ManyToManyField
from django.db.migrations import Migration
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.autodetector import MigrationAutodetector
from django.db.migrations.questioner import MigrationQuestioner, InteractiveMigrationQuestioner
from django.db.migrations.state import ProjectState, ModelState
from django.db.migrations.writer import MigrationWriter
from django.utils.six import iteritems

from django.utils.module_loading import import_string

from scarlet.versioning.fields import FKToVersion, M2MFromVersion

class VersionedModelState(ModelState):

    @classmethod
    def from_model(cls, model, exclude_rels=False):
        result = ModelState.from_model(model, exclude_rels=exclude_rels)
        if getattr(model._meta, '_is_view', False):
            result.options['db_table'] = model._meta._base_model._meta.db_table
        return result


class VersionedProjectState(ProjectState):
    @classmethod
    def from_apps(cls, apps):
        "Takes in an Apps and returns a VersionedProjectState matching it"
        app_models = {}
        for model in apps.get_models(include_swapped=True):
            model_state = VersionedModelState.from_model(model)
            app_models[(model_state.app_label, model_state.name.lower())] = model_state
        return cls(app_models)


class Command(BaseMakeMigrations):

    def handle(self, *app_labels, **options):

        self.verbosity = int(options.get('verbosity'))
        self.interactive = options.get('interactive')
        self.dry_run = options.get('dry_run', False)
        self.merge = options.get('merge', False)
        self.empty = options.get('empty', False)

        # Make sure the app they asked for exists
        app_labels = set(app_labels)
        bad_app_labels = set()
        for app_label in app_labels:
            try:
                apps.get_app_config(app_label)
            except LookupError:
                bad_app_labels.add(app_label)
        if bad_app_labels:
            for app_label in bad_app_labels:
                self.stderr.write("App '%s' could not be found. Is it in INSTALLED_APPS?" % app_label)
            sys.exit(2)

        # Load the current graph state. Pass in None for the connection so
        # the loader doesn't try to resolve replaced migrations from DB.
        loader = MigrationLoader(None, ignore_no_migrations=True)

        # Before anything else, see if there's conflicting apps and drop out
        # hard if there are any and they don't want to merge
        conflicts = loader.detect_conflicts()

        # If app_labels is specified, filter out conflicting migrations for unspecified apps
        if app_labels:
            conflicts = dict(
                (app_label, conflict) for app_label, conflict in iteritems(conflicts)
                if app_label in app_labels
            )

        if conflicts and not self.merge:
            name_str = "; ".join(
                "%s in %s" % (", ".join(names), app)
                for app, names in conflicts.items()
            )
            raise CommandError("Conflicting migrations detected (%s).\nTo fix them run 'python manage.py makemigrations --merge'" % name_str)

        # If they want to merge and there's nothing to merge, then politely exit
        if self.merge and not conflicts:
            self.stdout.write("No conflicts detected to merge.")
            return

        # If they want to merge and there is something to merge, then
        # divert into the merge code
        if self.merge and conflicts:
            return self.handle_merge(loader, conflicts)

        # Set up autodetector
        autodetector = MigrationAutodetector(
            loader.project_state(),
            VersionedProjectState.from_apps(apps),
            InteractiveMigrationQuestioner(specified_apps=app_labels, dry_run=self.dry_run),
        )

        # If they want to make an empty migration, make one for each app
        if self.empty:
            if not app_labels:
                raise CommandError("You must supply at least one app label when using --empty.")
            # Make a fake changes() result we can pass to arrange_for_graph
            changes = dict(
                (app, [Migration("custom", app)])
                for app in app_labels
            )
            changes = autodetector.arrange_for_graph(changes, loader.graph)
            self.write_migration_files(changes)
            return

        # Detect changes
        changes = autodetector.changes(
            graph=loader.graph,
            trim_to_apps=app_labels or None,
            convert_apps=app_labels or None,
        )

        # No changes? Tell them.
        if not changes and self.verbosity >= 1:
            if len(app_labels) == 1:
                self.stdout.write("No changes detected in app '%s'" % app_labels.pop())
            elif len(app_labels) > 1:
                self.stdout.write("No changes detected in apps '%s'" % ("', '".join(app_labels)))
            else:
                self.stdout.write("No changes detected")
            return

        self.write_migration_files(changes)
