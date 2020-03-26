from __future__ import unicode_literals
from builtins import object
from django.db import models

from scarlet.versioning.models import VersionModel, Cloneable, BaseModel


class NameModel(models.Model):
    name = models.CharField(max_length=255)

    class Meta(object):
        abstract = True
        app_label = "version_twomodels"


class AuthorBase(BaseModel):
    class Meta(object):
        app_label = "version_twomodels"


class Author(VersionModel, NameModel):
    associates = models.ManyToManyField(AuthorBase, blank=True)

    class Meta(object):
        app_label = "version_twomodels"
        _base_model = AuthorBase

    def __unicode__(self):
        return self.name


class BookBase(BaseModel):
    class Meta(object):
        app_label = "version_twomodels"


class Book(VersionModel, NameModel):
    _clone_related = ["review", "galleries"]

    author = models.ForeignKey(AuthorBase, on_delete=models.CASCADE)
    galleries = models.ManyToManyField("Gallery")

    class Meta(object):
        app_label = "version_twomodels"
        _base_model = BookBase


class Review(Cloneable):
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    text = models.CharField(max_length=255)

    class Meta(object):
        app_label = "version_twomodels"


class StoreBase(BaseModel):
    class Meta(object):
        app_label = "version_twomodels"


class Store(VersionModel, NameModel):
    books = models.ManyToManyField(BookBase)

    class Meta(object):
        _base_model = StoreBase
        app_label = "version_twomodels"


class Gallery(Cloneable):
    name = models.CharField(max_length=255)

    class Meta(object):
        app_label = "version_twomodels"
