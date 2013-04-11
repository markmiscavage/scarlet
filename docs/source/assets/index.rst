==========
Assets
==========

Introduction
============

Assets are files uploaded by a CMS user, and can include images, documents, audio, and video.

The assets module manages all of the assets used by the public website.

It supports searching assets by tag or file type, and allows for dynamic image resizing.


Installation
============

Requirements
------------

* django-taggit - https://github.com/alex/django-taggit::

    pip install django-taggit

* sorl-thumbnail - https://github.com/sorl/sorl-thumbnail::

    pip install sorl-thumbnail

Setup
-----

Edit your ``settings.py`` and add ``sorl.thumbnail``, ``taggit``, and ``scarlet.assets`` to your ``INSTALLED_APPS``::

    INSTALLED_APPS = (
        ...
        'taggit',
        'sorl.thumbnail',
        'scarlet.assets',
    )

If using Redis for the image thumbnail store (recommended), add the following to your settings file::

    THUMBNAIL_KVSTORE = 'sorl.thumbnail.kvstores.redis_kvstore.KVStore'

Run syncdb to create the DB tables::

    ./manage.py syncdb


Implementation
==============

The assets module utilizes Django's normal file handling mechanism.  Information about an asset is stored in the :py:class:`Asset <scarlet.assets.models.Asset>` model, which includes a Django FileField as one of its fields.

It is not directory-based, meaning all files are physically stored under one location specified in settings.  By default, uploaded filenames are renamed with a random string, with file extension preserved.

It works independently of Django's file storage system, so any storage class can be used with the Assets app.

The assets module utlizes the CMS bundles framework.  It registers a bundle with the site and extends the CMS base views and filters.


AssetsFileField
---------------

The assets model integrates with other models by exposing the :py:class:`AssetsFileField <scarlet.assets.fields.AssetsFileField>` model field.  Simply include one or more of these fields in your model, specifying optional attributes.  For example::

    class Movie(models.Model):
        name = models.CharField(max_length=255, db_index=True)
        image = AssetsFileField(type=Asset.IMAGE, tags=['movie'],
                                     null=True, blank=True)
        ...

When used in forms, this field will be rendered as a widget using the asset_widget.html template.


Attributes
~~~~~~~~~~

``type`` (optional)
    The file type.  Valid options are IMAGE, DOCUMENT, AUDIO, or VIDEO.

``tags`` (optional)
    A list of tags (strings) to associate with this asset.


Settings
========

The behavior of the assets module can be customized by overriding the settings below in your project's settings file.

Main Settings
-------------

ASSETS_DIR
~~~~~~~~~~
Default: ``assets`` (string)

Main Assets directory.  This will be a subdirectory of MEDIA_ROOT.  Set to None to use MEDIA_ROOT directly.

ASSETS_CMS_THUMBNAIL_SIZE
~~~~~~~~~~~~~~~~~~~~~~~~~
Default: ``80x80`` (string)

The dimensions of the image thumbnail used in the CMS.

ASSETS_HASH_FILENAME
~~~~~~~~~~~~~~~~~~~~
Default: ``True`` (boolean)

Whether to replace the original uploaded filename with a random string.  File extensions are preserved.


Code Documentation
==================

.. toctree::

    reference
