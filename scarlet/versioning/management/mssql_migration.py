# -----------------------------------------
# Specific MSSQL commands for migrations
# -----------------------------------------
from django.db import connection, transaction
from django import VERSION as DJANGO_VERSION
from django.conf import settings


class MSSQLBackend(object):
    VIEW_SQL = "DECLARE @SQL as varchar(4000); \
    SET @SQL = 'SELECT * from %(version_model)s  inner join %(base_model)s \
    on %(base_model)s.id = %(version_model)s.object_id'; \
    IF OBJECT_ID('%(model_table)s') IS NULL \
    SET @SQL = 'CREATE VIEW %(model_table)s AS ' + @SQL \
    ELSE SET @SQL = 'ALTER VIEW  %(model_table)s AS ' + @SQL; EXEC(@SQL);"
    VIEW_SQL_SCHEMA = "DECLARE @SQL as varchar(4000); \
    SET @SQL = 'SELECT * from %(schema)s.%(version_model)s  \
    inner join %(base_model)s on %(base_model)s.id = %(version_model)s.object_id \
    WHERE %(version_model)s.%(state)s = {schema}';\
    IF OBJECT_ID('%(model_table)s') IS NULL \
    SET @SQL = 'CREATE VIEW %(model_table)s AS ' + @SQL \
    ELSE \
    SET @SQL = 'ALTER VIEW  %(model_table)s AS ' + @SQL"
    DROP_SQL = "IF OBJECT_ID('%(schema)s.%(model_table)s') IS NOT NULL DROP VIEW %(schema)s.%(model_table)s"
    # MS SQL uses database name as default schema
    DEFAULT_SCHEMA = settings.DATABASES.get('default').get('NAME')

    def _get_declare(self, table, cursor, columns):
        declare_st = ''
        for x in columns:
            sql = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS \
            where TABLE_NAME='{0}' and column_name='{1}'".format(table, x)
            res = cursor.execute(sql)
            column_type = res.fetchall()[0][0]
            declare_st += '@new_{0} {1}, '.format(x, column_type)
            declare_st += '@old_{0} {1}, '.format(x, column_type)
        return declare_st

    def _get_insert_or_delete(self, base_cols, action='INSERTED'):
        val = '@new'
        if action == 'DELETED':
            val = '@old'
        st = 'SELECT '
        for x in base_cols:
            st += '{0}_{1}={2}.{1}, '.format(val, x, action)
        st = st[:-2]
        st += ' FROM {0}'.format(action)
        return st

    def _get_insert(self, base_cols):
        return self._get_insert_or_delete(base_cols)

    def _get_delete(self, base_cols):
        return self._get_insert_or_delete(base_cols, 'DELETED')

    def _get_update_1(self, m, base_cols):
        update_1 = 'UPDATE {0} SET '.format(m._meta._base_model._meta.db_table)
        for x in base_cols:
            update_1 += '{0}=@new_{0}, '.format(x)
        update_1 = update_1[:-2]
        update_1 += ' WHERE id={0}_id'.format('@old')
        return update_1

    def _get_update_2(self, m, version_cols):
        update_2 = ' UPDATE {0} SET '.format(m._meta._version_model._meta.db_table)
        for x in version_cols:
            update_2 += '{0}=@new_{0}, '.format(x)
        update_2 = update_2[:-2]
        update_2 += ' WHERE object_id={0} and vid={1}'.format('@old_id', '@old_vid')
        return update_2

    def _get_mssql_trigger(self, base_cols, version_cols, cursor, m, action='UPDATE'):
        trigger_name = '_update_trigger'

        declare_st = 'DECLARE {0} {1} @old_id int, @old_vid int '.format(
            self._get_declare(m._meta._base_model._meta.db_table, cursor, base_cols),
            self._get_declare(m._meta._version_model._meta.db_table, cursor, version_cols))

        inserted = self._get_insert(base_cols)
        deleted = self._get_delete(base_cols)

        update_1 = self._get_update_1(m, base_cols)
        update_2 = self._get_update_2(m, version_cols)

        if action == 'DELETE':
            update_1 = 'DELETE FROM {0} WHERE id=@old_id'.format(m._meta._base_model._meta.db_table)
            update_2 = 'DELETE FROM {0} WHERE object_id=@old_id'.format(m._meta._version_model._meta.db_table)
            trigger_name = '_delete_trigger'

        # Creating trigger when INSERT
        trigger = "SET NOCOUNT ON \
        DECLARE @SQL as varchar(5000); \
        IF OBJECT_ID('{7}{0}') IS NOT NULL \
        DROP TRIGGER {7}{0} \
        ELSE \
        SET @SQL = 'CREATE TRIGGER {7}{0} ON {8}.{7} INSTEAD OF \
        {1} AS BEGIN SET NOCOUNT ON; {2} {3} {4} {5} {6}; END'; EXEC(@SQL)".format(
            trigger_name,
            action,
            declare_st,
            inserted,
            deleted,
            update_1,
            update_2,
            m._meta.db_table,
            self.DEFAULT_SCHEMA,
        )
        return(trigger)

    def do_updates(self, m):
        if getattr(m._meta, '_is_view') is None:
            return

        qn = connection.ops.quote_name

        args = {'base_model': m._meta._base_model._meta.db_table,
                'version_model': m._meta._version_model._meta.db_table,
                'model_table': m._meta.db_table,
                'schema': self.DEFAULT_SCHEMA,
                'state': 'state'}

        cursor = connection.cursor()

        cursor.execute(self.DROP_SQL % args)

        base_sql = self.VIEW_SQL % args
        cursor.execute(base_sql)

        base_cols = [f.column for f in m._meta._base_model._meta.local_fields if f.column and f.column != 'id']
        version_cols = [f.column for f in m._meta._version_model._meta.local_fields if f.column and f.column != 'vid']
        args = dict(args)
        trigger_update = self._get_mssql_trigger(base_cols, version_cols, cursor, m)
        trigger_delete = self._get_mssql_trigger(base_cols, version_cols, cursor, m, 'DELETE')

        for schema in m._meta._version_model.UNIQUE_STATES:
            qn_schema = qn(schema)
            res = cursor.execute("select schema_name FROM information_schema.schemata \
            WHERE schema_name = %s", (schema,))
            if len(res.fetchall()) == 0:
                cursor.execute("CREATE SCHEMA %s" % qn_schema)
            args['schema'] = schema
            cursor.execute(self.DROP_SQL % args)
            base_sql = self.VIEW_SQL_SCHEMA % args
            cursor.execute(base_sql.format(schema=schema))
            cursor.execute(trigger_update)
            cursor.execute(trigger_delete)

        if DJANGO_VERSION < (1, 6):
            transaction.commit_unless_managed()
