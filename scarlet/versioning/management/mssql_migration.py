# -----------------------------------------
# Specific MSSQL commands for migrations
# -----------------------------------------
from django.db import connection, transaction
from django import VERSION as DJANGO_VERSION
from django.conf import settings


class MSSQLBackend(object):
    VIEW_SQL = "DECLARE @SQL as varchar(4000); \
        {declare} \
        SET @SQL = 'SELECT * from {schema}.{version_model} \
            inner join {schema}.{base_model} \
            on {schema}.{base_model}.id = {schema}.{version_model}.object_id' \
            {where} \
        IF OBJECT_ID('{schema}.{model_table}') IS NULL \
            SET @SQL = 'CREATE VIEW {schema}.{model_table} AS ' + @SQL \
        ELSE \
            SET @SQL = 'ALTER VIEW {schema}.{model_table} AS ' + @SQL;  \
        EXEC(@SQL);"

    DROP_SQL = "IF OBJECT_ID('{schema}.{model_table}') IS NOT NULL \
        DROP VIEW {schema}.{model_table}"

    DELETE_PROC = "DECLARE @SQL as varchar(4000); \
        SET @SQL = 'CREATE PROCEDURE {name} @old_id int \
        AS \
        BEGIN \
        SET NOCOUNT ON; \
        DELETE FROM {schema}.{version_model} WHERE object_id=@old_id; \
        DELETE FROM {schema}.{base_model} WHERE id=@old_id; \
        END;'; \
        IF OBJECT_ID('{name}') IS NOT NULL \
            DROP PROCEDURE {name}; \
        EXEC(@SQL)"

    DELETE_TRIGGER = "DECLARE @SQL as varchar(4000); \
        SET @SQL = 'CREATE TRIGGER {name} ON {schema}.{model_table} \
        INSTEAD OF DELETE \
        AS \
        DECLARE \
        @old_id int \
        BEGIN \
        SET NOCOUNT ON; \
        SELECT @old_id=DELETED.id FROM DELETED; \
        EXEC {proc_name} @old_id; \
        END;'; \
        IF OBJECT_ID('{name}') IS NULL \
        EXEC(@SQL)"

    UPDATE_PROC = "DECLARE @SQL as varchar(4000); \
    SET @SQL = 'CREATE PROCEDURE {name} \
    @new_is_published \
    @new_created_date \
    @new_v_last_save \
    @old_id int, \
    @old_vid int, \
    {version_fields_declare} \
    AS \
    BEGIN \
    SET NOCOUNT ON; \
    UPDATE {schema}.{base_model} SET \
        is_published=@new_is_published, \
        created_date=@new_created_date, v_last_save=@new_v_last_save \
    WHERE id=@old_id; \
    UPDATE {schema}.{version_model} SET \
        {version_fields_update} \
    WHERE object_id=@old_id and vid=@old_vid \
    END;'; \
    IF OBJECT_ID('{name}') IS NOT NULL \
    DROP PROCEDURE {name}; \
    EXEC(@SQL)"

    ### TODO: Define `UPDATE_TRIGGER` here

    def __init__(self):
        # When tests are running `DEFAULT_SCHEMA` is `dbo`, otherwise
        # `DEFAULT_SCHEMA` is database name in settings
        database_name = settings.DATABASES.get('default').get('NAME')
        self.DEFAULT_SCHEMA = database_name
        if database_name[:5] == 'test_':
            self.DEFAULT_SCHEMA = 'dbo'
        self.cursor = connection.cursor()

    def _get_declare_cols(self, cols, table, prefix):
        declare_st = ''
        for x in cols:
            sql = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS \
            where TABLE_NAME='{0}' and column_name='{1}'".format(table, x)
            res = self.cursor.execute(sql)
            column_type = res.fetchall()[0][0]
            declare_st += '@{0}_{1} {2}, '.format(prefix, x, column_type)
        return declare_st

    def do_updates(self, m):
        if getattr(m._meta, '_is_view') is None:
            return

        base_model = m._meta._base_model._meta.db_table
        version_model = m._meta._version_model._meta.db_table
        model_table = m._meta.db_table
        schema = self.DEFAULT_SCHEMA

        # View for default schema
        self.cursor.execute(self.DROP_SQL.format(
            schema=schema,
            model_table=model_table,
        ))

        self.cursor.execute(self.VIEW_SQL.format(
            schema=schema,
            version_model=version_model,
            base_model=base_model,
            model_table=model_table,
            where='',
            declare=''
        ))

        # Stored procedures and triggers for default schema
        self.cursor.execute(self.DELETE_PROC.format(
            name='{0}_delete'.format(base_model),
            schema=schema,
            version_model=version_model,
            base_model=base_model,
        ))

        self.cursor.execute(self.DELETE_TRIGGER.format(
            proc_name='{0}_delete'.format(base_model),
            name='{0}_delete_trigger'.format(base_model),
            model_table=model_table,
            schema=schema,
        ))

        for schema in m._meta._version_model.UNIQUE_STATES:
            res = self.cursor.execute("select schema_name FROM \
            information_schema.schemata WHERE schema_name = %s", (schema,))
            if len(res.fetchall()) == 0:
                self.cursor.execute("CREATE SCHEMA %s" % schema)

            # View for given schema
            self.cursor.execute(self.DROP_SQL.format(
                schema=schema,
                model_table=model_table,
            ))

            self.cursor.execute(self.VIEW_SQL.format(
                schema=schema,
                version_model=version_model,
                base_model=base_model,
                model_table=model_table,
                where='',
                declare=''
            ))

            ### TODO: Call to procedures and triggers here

        if DJANGO_VERSION < (1, 6):
            transaction.commit_unless_managed()
