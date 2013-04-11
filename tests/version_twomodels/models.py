from django.db import models

from scarlet.versioning.models import VersionModel, Cloneable, BaseModel


class NameModel(models.Model):
    name = models.CharField(max_length=255)

    class Meta:
        abstract = True


class AuthorBase(BaseModel):
    pass


class Author(VersionModel, NameModel):
    associates = models.ManyToManyField(AuthorBase, blank=True)

    class Meta:
        _base_model = AuthorBase

    def __unicode__(self):
        return self.name


class BookBase(BaseModel):
    pass


class Book(VersionModel, NameModel):
    _clone_related = ['review', 'galleries']

    author = models.ForeignKey(AuthorBase)
    galleries = models.ManyToManyField('Gallery')

    class Meta:
        _base_model = BookBase


class Review(Cloneable):
    book = models.ForeignKey(Book)
    text = models.CharField(max_length=255)


class StoreBase(BaseModel):
    pass


class Store(VersionModel, NameModel):
    books = models.ManyToManyField(BookBase)

    class Meta:
        _base_model = StoreBase


class Gallery(Cloneable):
    name = models.CharField(max_length=255)
