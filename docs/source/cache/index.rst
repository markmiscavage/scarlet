
.. toctree::

===================
Cache Documentation
===================

Overview
========

This app makes it possible to cache pages for a set time and have the page cache automatically clear when one of the model objects contained within the page is changed. We accomplish this by adding a prefix to each django-cache key. To invalidate the cache for a page or section of the site, we increment the key prefix so the old cache key will no longer match and a new cache will be generated.

It is assumed that the cache backend supports expiring keys;  memcache and Redis both support this, RDBM's ( PostgreSQL & MySQL ) do not.

Each request for a page will make 2 or 3 requests to check for a cache hit.  For very simple pages with few or no database queries and very little template logic this could actually slow performance. Benchmark to be sure that this is really increasing performance before using.

This implementation uses the admin to trigger clearing the cache, although it can work with post_save hooks or any other trigger that you would like.


The Problem
-----------

Let's say you are building a website for a company. There are people in your company, many of the those people  are employees. We've need to display lists of the employees; let's say we want a list of all the employees, a list of the developers, and a list of Django developers.

The problem we face here is that if we are using Django's cache system we are caching entirely at the view level, so if we update a model the views don't update until they are set to expire. This stops us from being able to set long cache times on object and forces us, if we plan to invalidate, to invalidate the entire cache. As you may have experienced, invalidating the entire cache on a complex high traffic site does not have positive results.

People have tried to solve this problem in a number of ways: the most common involve emulating Java's Data persistence model; keep a copy of database query results or a complete copy of every data object in a persistence layer. Let's face it, this only yields performance improvement if you've done a really bad job of modeling your data and indexing tables. Java uses a lot of really complex processes to manage updates in the persistence layer, processes that work well for a threaded high memory distributed architecture.

Django is not that type of architecture. The class of problems we are trying to solve require lighter weight, cheaper, and simpler solutions than those are afforded by EJB's and the JPA. The database is good enough as a persistence layer. What we really want is to serve pages fast, specifically we want to serve views fast, and we want to cache those views for the maximum possible time. Django handles view caching really well but it approaches cache invalidation from the wrong angle. Instead of invalidating a particular cached object when the data changes we want to only invalidate cached data on some time interval. I as a developer want the interval to be once a year, but the person managing the content wants it to be every second. Cache invalidation needs to happen at the model level.


The Solution
------------

So how do we invalidate all the cached objects that contain our model? Well, we map cached objects to models. Lets assume that all your saves are done through the admin and you are using :py:class:`ModelAdmin <scarlet.cache.admin.ModelAdmin>`.

Here's simple example:

::

    from scarlet.cache import cache_manager
    cache_manager.register('company_list', Person, values=['employees'], instance_values=['pk'])

This creates a :py:class:`CacheGroup <scarlet.cache.groups.CacheGroup>` named 'company_list' and registers the Person model with it, and tells the group to track the model based upon its primary key and to also track a value 'employees' that will be incremented any time a Person model is saved.

Let's say you have a list page at '/person/' you can do

::

    cache_manager.get_group('company_list').get_version('employees')

And everytime a person is saved that value will change. You can then use that value when constructing the cache key that you want to check for.

Then when you need to get a version for this url /person/1/ you can ask the manager which will ask the group that was created.

::

    cache_manager.get_group('company_list').get_version('1')

Now saving Person(pk=2) will change the value for *'employees'* and *'2'* but not for *'1'*


Details
=======================

Cache Groups
-------------

A :py:class:`CacheGroup <scarlet.cache.groups.CacheGroup>` tracks versions for a collection of models. When creating a cache group you must specify a key. This should be unique to this group as this will be used to prefix all version values in your cache.

You register a model by calling :py:meth:`register <scarlet.cache.groups.CacheGroup.register>` or :py:meth:`register_models <scarlet.cache.groups.CacheGroup.register_models>` passing the values and instance values you would like tracked. See the :py:meth:`register <scarlet.cache.groups.CacheGroup.register>` method documentation for details.

To invalidate a cache use the method :py:meth:`invalidate_cache <scarlet.cache.groups.CacheGroup.invalidate_cache>`.

To get a string that can be used as a prefix for django's cache keys call :py:meth:`get_version <scarlet.cache.groups.CacheGroup.get_version>`.


Example
~~~~~~~

Let's make a group for caching Person models

::

    c = CacheGroup('company_list')
    c.register(Person, values=['employees'], instance_values=['pk'])
    c.invalidate_cache(Person, instance=Person(pk=2))

We will end up with these keys in our cache.

 * company_list - 0
 * company_list.0.2 - 0
 * company_list.0.employee - 0

The minor version *employee* was created because Person was registered with an value employees. And a minor version *2* was created because the instance has a pk
value of 2 and 'pk' was registered as a instance_value.

Getting the version will give you back a versioned string.

::

    >>>c.get_version('2')
    'company_list.0.2.0'

If you invalidate that instance again:

::

    >>>c.invalidate_cache(Person, instance=Person(pk=2))
    >>>c.get_version('2')
    'company_list.0.2.1'

Running this:

::

    c.invalidate_cache(Person, instance=Person(pk=1))

Based on the same logic as above, the minor version *employee* was incremented and minor version *1* was created.

 * company_list - 0
 * company_list.0.2 - 1
 * company_list.0.1 - 0
 * company_list.0.employee - 2

Now let's pass an extra:

::

    c.invalidate_cache(Person, instance=None, extra=['extra'])

Since this command is missing an instance only the the minor version *employee* was incremented since it was registered as a value. A minor version *extra* was incremented because that was passed in the extra list.

 * company_list - 0
 * company_list.0.2 - 1
 * company_list.0.1 - 0
 * company_list.0.employee - 3
 * company_list.0.extra - 0


This invalidates the major version

::

    c.invalidate_cache(force_all=True)

The cache now looks like this:

 * company_list - 1
 * company_list.0.2 - 1
 * company_list.0.1 - 0
 * company_list.0.employee - 3
 * company_list.0.extra - 0

The other keys did not change because the major version was incremented; that will change all the minor versions too.

::

    >>>c.get_version('2')
    'company_list.1.2.0'

Running invalidate_cache on a model that was registered with new values will also increment the major version:

::

    >>>c.get_version('2')
    'company_list.1.2.0'
    >>>c.register(Group)
    >>>c.invalidate_cache(Group, instance=Group(pk=1))

    >>>c.get_version('2')
    'company_list.2.2.0'

Manager
----------

A :py:class:`CacheManager <scarlet.cache.manager.CacheManager>` is where you register all the :py:class:`CacheGroup <scarlet.cache.groups.CacheGroup>` instances that you would like to be considered when a purge request is received. Similar to the django admin, most implementations would only have one instance of this class that all managers would be registered with. If you don't need any customizations you can simply register with the default instance

::

    from scarlet.cache.manager import cache_manager
    cache_manager.register_model('key', MyModel, MyModel2, instance_value=['pk'])

or

::

    from scarlet.cache.manager import cache_manager
    from scarlet.cache.groups import CacheGroup
    m = CacheGroup('key')
    cache_manager.register_cache(m)

You can get the group registered for a key by calling :py:meth:`get_group  <scarlet.cache.manager.CacheManager.get_group>`

To invalidate across all groups use the :py:meth:`invalidate_cache <scarlet.cache.manager.CacheManager.invalidate_cache>` method. This will find all registered groups for the given model and call the invalidate_cache method on each of them.


Views
=====

:py:class:`CacheView <scarlet.cache.views.CacheView>` is a class based view that overrides the default dispatch method to determine the cache_prefix. It calls two methods :py:meth:`get_cache_version <scarlet.cache.views.CacheView.get_cache_version>` and :py:meth:`get_cache_prefix <scarlet.cache.views.CacheView.get_cache_prefix>` the results of those two functions are combined and passed to the standard django caching middleware.

Here is a sample get_cache_version function

::

    def get_cache_version(self):
        slug = self.kwargs.get('slug', '')
        return cache_manager.get_group('key').get_version(slug)


As with all class based views, decorating individual methods does not work well so you want a certain response or method to not be cached, call :py:meth:`set_do_not_cache <scarlet.cache.views.CacheView.set_do_not_cache>`

Admin
=====

:py:class:`ModelAdmin <scarlet.cache.admin.ModelAdmin>` is an extension of the default django ModelAdmin that will call invalidate_cache after a deleting or saving a model. In order to ensure that these do not get called until after all m2m relationships have been updated, the update and add hooks are placed in the response_xxx methods.

When creating a ModelAdmin you should ensure that the cache_manager attribute is set to the correct manager.

:py:meth:`invalidate_cache <scarlet.cache.admin.ModelAdmin.invalidate_cache>` simply calls this manager and passes the instance if it knows about it. The default implementation will set force_all to True if it receives a queryset instead of a instance.

If you want to invalidate additional values that have not been registered, override this method to provide that functionality. For example:

::

    def invalidate_cache(self, obj=None, queryset=None, extra=None, force_all=False):
        if obj:
            extra = { 'key' : self._get_parent_slugs(obj) }
        super(MyAdmin, self).invalidate_cache(obj=obj, extra=extra, force_all=force_all)


:py:class:`AdminSite <scarlet.cache.admin.AdminSite>` is a simple extension of the default django AdminSite that calls invalidate_cache if the default delete action is run. If your admin site includes other default actions you should ensure that they call invalidate_cache when appropriate.

Limitations and Drawbacks
=========================

 * Each request for a page will make 2 or 3 requests to check for a cache hit.  For very simple pages with few or no database queries and very little template logic this could actually slow performance. Benchmark to be sure that this is really increasing performance before using.

 * At this point there are only two types of versions: major and minor. There may be situations where you would want a minor version of a minor version. This is not currently supported.

 * No effort is made to avoid key collisions. For example if you register two models with the same group on their pk's. Their versions would not be distinct and an invalidation on one would invalidate the other.

Code Documentation
==================

.. toctree::

    reference
