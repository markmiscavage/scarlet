from django.conf import settings
from django.db.models.signals import post_migrate, post_syncdb
from django.db import connection, transaction, utils
from django import VERSION as DJANGO_VERSION

VIEW_SQL = "CREATE OR REPLACE VIEW %(schema)s.%(model_table)s as select * from %(version_model)s inner join %(base_model)s on %(base_model)s.id = %(version_model)s.object_id"
DROP_SQL = "DROP VIEW IF EXISTS %(schema)s.%(model_table)s;"
EXISTS = "SELECT exists(select schema_name FROM information_schema.schemata WHERE schema_name = %s)"
TRIGGER = "CREATE TRIGGER %(trigger_name)s INSTEAD OF UPDATE OR DELETE ON %(schema)s.%(model_table)s FOR EACH ROW EXECUTE PROCEDURE %(function_name)s();"

def trigger_function(base_model, version_model, args):
    qn = connection.ops.quote_name
    base_cols = [f.column for f in base_model._meta.local_fields \
                    if f.column and f.column != 'id']
    version_cols = [f.column for f in version_model._meta.local_fields \
                    if f.column and f.column != 'vid']

    local_args = dict(args)
    local_args.update({
        'base_cols' : 'id=OLD.id,' + ', '.join(['%s=NEW.%s' % (qn(x),qn(x)) for x in base_cols]),
        'version_cols' : 'vid=OLD.vid,' + ', '.join(['%s=NEW.%s' % (qn(x),qn(x)) for x in version_cols]),
    })

    return """
    CREATE OR REPLACE FUNCTION %(function_name)s()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                UPDATE %(base_model)s SET %(base_cols)s WHERE id=OLD.id;
                UPDATE %(version_model)s SET %(version_cols)s WHERE object_id=OLD.id and vid=OLD.vid;
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                DELETE FROM %(base_model)s WHERE id=OLD.id;
                DELETE FROM %(version_model)s WHERE object_id=OLD.id;
                RETURN NULL;
            END IF;
        END;
    $function$;
    """ % local_args

def do_updates(m):
    if getattr(m._meta, '_is_view', None):
        qn = connection.ops.quote_name
        args = {'base_model': qn(m._meta._base_model._meta.db_table),
                'version_model': qn(m._meta._version_model._meta.db_table),
                'model_table': qn(m._meta.db_table),
                'function_name' : qn(m._meta.db_table + '_func'),
                'trigger_name' : qn(m._meta.db_table + '_trigger'),
                'schema': qn('public'),
                'state': qn('state')}

        base_sql = VIEW_SQL % args
        cursor = connection.cursor()

        cursor.execute(DROP_SQL % args)
        cursor.execute(base_sql)

        trigger_sql = trigger_function(m._meta._base_model,
                                       m._meta._version_model, args)
        cursor.execute(trigger_sql)
        cursor.execute(TRIGGER % args)
        for schema in m._meta._version_model.UNIQUE_STATES:
            qn_schema = qn(schema)

            # Make sure schema exists
            cursor.execute("SELECT exists(select schema_name FROM information_schema.schemata WHERE schema_name = %s)", (schema,))
            if not cursor.fetchone()[0]:
                cursor.execute("CREATE SCHEMA %s" % qn_schema)

            args['schema'] = qn_schema

            cursor.execute(DROP_SQL % args)
            where = "WHERE %(version_model)s.%(state)s = %%s" % args

            base_sql = VIEW_SQL % args
            sql = " ".join([base_sql, where])
            cursor.execute(sql, (schema,))
            cursor.execute(TRIGGER % args)

        if DJANGO_VERSION < (1, 6):
            transaction.commit_unless_managed()

def update_schema(sender=None, **kwargs):
    if sender:
        for m in sender.get_models():
            if getattr(m._meta, '_view_model', None):
                do_updates(m._meta._view_model)


def update_syncdb_schema(app, created_models, verbosity, **kwargs):
    for m in created_models:
        do_updates(m)

if DJANGO_VERSION < (1, 7):
    post_syncdb.connect(update_syncdb_schema, dispatch_uid='update_syncdb_schema')
else:
    post_migrate.connect(update_schema, dispatch_uid='update_schema')
