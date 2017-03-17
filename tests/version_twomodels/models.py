from django.db import models

from scarlet.versioning.models import VersionModel, Cloneable, BaseModel


class NameModel(models.Model):
    name = models.CharField(max_length=255)

    class Meta:
        abstract = True
        app_label='version_twomodels'


class AuthorBase(BaseModel):
    class Meta:
        app_label='version_twomodels'


class Author(VersionModel, NameModel):
    associates = models.ManyToManyField(AuthorBase, blank=True)

    class Meta:
        app_label='version_twomodels'
        _base_model = AuthorBase

    def __unicode__(self):
        return self.name


class BookBase(BaseModel):
    class Meta:
        app_label = 'version_twomodels'


class Book(VersionModel, NameModel):
    _clone_related = ['review', 'galleries']

    author = models.ForeignKey(AuthorBase)
    galleries = models.ManyToManyField('Gallery')

    class Meta:
        app_label = 'version_twomodels'
        _base_model = BookBase


class Review(Cloneable):
    book = models.ForeignKey(Book)
    text = models.CharField(max_length=255)

    class Meta:
        app_label = 'version_twomodels'


class StoreBase(BaseModel):
    class Meta:
        app_label = 'version_twomodels'


class Store(VersionModel, NameModel):
    books = models.ManyToManyField(BookBase)

    class Meta:
        _base_model = StoreBase
        app_label = 'version_twomodels'


class Gallery(Cloneable):
    name = models.CharField(max_length=255)

    class Meta:
        app_label = 'version_twomodels'
