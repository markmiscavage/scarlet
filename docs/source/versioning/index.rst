.. _versioning:

==========
Versioning
==========

Basic Implementation
====================


This versioning module provides versioning control capability to Django models.

Each model must be separated into two database tables, the base table that contains the data that does not change from version to version, and the version table that contains the data that can change and is versioned. For example, a book object would require two tables; book_base and book_version.

Behind each row of the "book_base" table, there is the "book_version" table which contains each version of the book. Each row in the "version" table represents a specific version of a book, and it has a foreign key pointing to a book item in the "base" table. "version" table uses "vid" as its primary key.

Each version can have a different STATE such as:
 * **published:** viewable to public audience.
 * **draft:** something you just write, but not ready for the public to view yet.
 * **scheduled:** scheduled to be published in the future.
 * **archived:** archived items, usually when we publish a draft and there is already a published version, the published version will be archived.

There should only be one row per state with the exception of archived, where there can be as many as needed.

The version models provide the following methods for dealing with different versions. For more details see the method documentation:

 * :py:meth:`publish <versioning.models.BaseVersionedModel.publish>`: Publish a version.
 * :py:meth:`make_draft <versioning.models.BaseVersionedModel.make_draft>`: Make a current version the draft.
 * :py:meth:`unpublish <versioning.models.BaseVersionedModel.unpublish>`: Unpublish this item. Not just a version.

With the exception of :py:meth:`make_draft <versioning.models.BaseVersionedModel.make_draft>` all actions should happen on the draft version. For example, if you want to make an archived version published, you should first run make_draft on it. Then you can publish it, which will make the old published instance the archive.

Other methods to know are:

 * :py:meth:`purge_archives <versioning.models.BaseVersionedModel.purge_archives>`: Purge older archived items.
 * :py:meth:`status_line <versioning.models.BaseVersionedModel.status_line>`: Returns a status line for an item.

Versioning also adds two additional signals (published_signal & published_delete_signal) on top of Django's default signals. These signals can be used to add additional behavior when an admin publishes or deletes content, such as invalidating caches or rendering templates.

Uniqueness
----------

RDBMs/Django's uniqueness checks do not work for versions since you want multiple versions that have the same value, but only if they point to the same item. The version models override :py:meth:`validate_unique <versioning.models.BaseVersionedModel.validate_unique>` to allow you to perform some validation. It should be noted that since these checks are not implemented at the database level, they are subject to race conditions.

Transactions
------------

Many of the methods referenced above run within a transaction. All the changes will be rolled back if there is an error. In order to be sure that those methods run in a transaction regardless of where there are called from we use the chainable context manager provided in versioning.transactions.xact in place of django's default transaction management. That will start its own transaction if called directly but use the existing transaction if called by a different piece of code that already has an open transaction. For this reason if you are opening transactions in your own code use versioning.transactions.xact as the context manager.

Cloning
=======

When an item's status is being changed we:

    1. Make an identical copy/clone of this item;
    2. Modify the copy/clone's status to the desired status.

In order to keep versions of related objects separate we can also make a copy of related objects when we make a clone of a versioned item and create a relationship with the new version of our parent item.

This functionality is provided by the :py:class:`Cloneable <versioning.models.Cloneable>` model: any models that are not versioned by themselves but should be attached to a version of on item should inherit from :py:class:`Cloneable <versioning.models.Cloneable>`.

To specify which models should be cloned you add the attribute names of the reverse relations to the **_clone_related** class attribute. Any reverse relations must also implement Cloneable. To register models that may not be known or importable when declaring the parent model, you can also use the :py:meth:`register_related <versioning.models.Cloneable.register_related>` class method to register additional values.

Since there will be mulitple copies of the cloned objects, this is not appropriate to use for models that are meant to be queried directly without a parent instance or used as part of a generic relationship. If that functionality is needed these objects should be versioned and published seperately and not cloned using this method.

When a cloneable instance is cloned the :py:meth:`prep_for_clone <versioning.models.Cloneable.prep_for_clone>` can be used as a hook to customize what gets cleared before a clone. The default behavior is to clear the pk value, so django and the database will see the clone as a new row and set a new one. But if you have any other changes that should be made or auto generated fields that need clearing this would be the appropriate place to make those changes.

When a cloned instance is :py:meth:`deleted <versioning.models.Cloneable.delete>` objects that were cloned along with it are also deleted.

Version Views
=============

The :py:class:`VersionViews <versioning.models.VersionView>` model points to a database view that is created joining the two tables above. A schema is also created for draft and published items. That restricts the results to objects in that state. This makes it easier to always have django ORM search on the correct state without having to specify the filter for each potential join.

Because this solution depends on schemas it will only work with postgres and you must use the included db backend **versioning.postgres_backend**. That will fix the constraints that are created by syncdb and handles switching the schema search path.

Any time you have a many to many on a versioned model use the :py:class:`M2MFromVersion <versioning.fields.M2MFromVersion>` field. Many to many relations to self must be asymmetrical.

Any time you want to point to a version of a thing use a :py:class:`FKToVersion <versioning.fields.FKToVersion>` field. Use a normal ForeignKey field for pointing to an object itself, not a version of an object, so that even as the version changes the relationship will remain.

Limitations
-----------

You cannot use multi-table inheritence with VersionView models. Generic relations involving VersionView models are not versionable.



Example
-----------

Assume that we want to build a Book model which has chapters, and each book can have multiple authors associated with it.  We should define it like

::

    from django.db import models
    from versioning.models import VersionView, Cloneable
    from versioning import fields

    class Author(VersionView):
        name = models.CharField(max_length=48)
        bio = models.TextField()

    class Book(VersionView):
        _clone_related = ['chapter']

        title = models.CharField(max_length=100)
        authors = fields.M2MFromVersion(Author)

    class Chapter(Cloneable):
        book = fields.FKToVersion(Book)
        number = models.PositiveIntegerField()
        text = models.TextField()

After we install these models and do syncdb, we will have a 'chapter' table, 'author_base' and 'author_version' tables, and 'book_base' and 'book_version' tables in our database.

Let's add some data:

::

    hemingway = Author(name='Hemingway')
    mt = Author(name='Mark Twain')
    hemingway.save()
    mt.save()

    book = Book(title='old man')
    book.save()
    book.authors.add(hemingway)

    cp = Chapter(number=1,text='text', book=book)
    cp.save()


So far everything is pretty clear: we have a book 'old man' that has a M2M relation to the author Hemingway and a Chapter that is related to our book.

book_version_author (the m2m table) looks like this

=== ======= =====
id  from_id to_id
=== ======= =====
3    4       5
=== ======= =====

Lets publish this.

::

    book.publish()
    hemingway.publish()
    mt.publish()

Here the base tables don't really change but if you look at the version tables there are now two copies of each versionable item each with a different vid but with an object_id that points to the same id on the base table.

For the book old man we now have

========== ========= =====
state      object_id vid
========== ========= =====
draft       3         4
published   3         5
========== ========= =====

The many to many table changed too.

=== ======= =====
id  from_id to_id
=== ======= =====
3    4       5
4    5       5
=== ======= =====

There is now a separate row that makes a relation between the book version vid 5 and the author id 5. In this way we can have a separate set of relations for each version of the book. This is because we used the M2MFromVersion. If we had used a normal ManyToManyField the from_id would point to the object_id (3) and there would only be one row.

Similarly there are now rows in the chapter table that point to the different vid's of our book.

=== =======
id  book_id
=== =======
3   4
4   5
=== =======

This means that you can make changes to chapters without effect other versions. If you wanted to version each chapter separately or not version chapters at all you would change the FKToVersion field to use a normal ForeignKey field and remove 'chapter' from _clone_related on Book.

Two Model Version
=================

An alternative approach to the above is to allow django to see the fact that there are two models/tables for this model.

Implementations that use this model will need to take care to specify the correct filter parameters to filter out the states/versions that you are not interested in wherever this model is used in a query. While there is a default manager provided that can help with this, it does not get applied with certain types of joins. This may not always be obvious especially in complex joins or when using select_related or prefetch_related.


Managing State
================

Generally you will want all your queries to run in the same state, ie: draft or published.

The global state is managed by the :py:func:`versioning.manager.activate` and :py:func:`versioning.manager.deactivate` functions.

All version model's default manager is an instance of :py:class:`VersionViews <versioning.manager.VersionManager>` that will automatically filter based on the current active state.

It is recommended you use the :py:class:`StateMiddleware <versioning.middleware.StateMiddleware>`. That will lock your site down to only use published items, unless a logged in user sets a flag in the session. You should also hook up a view :py:func:`versioning.views.switch_state` to allow staff users to switch state.

Code Documentation
==================

.. toctree::

    reference
