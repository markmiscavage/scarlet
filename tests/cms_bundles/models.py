from django.db import models
from django.contrib.auth.models import User

from scarlet.versioning import fields
from scarlet.versioning.models import VersionView, Cloneable
from scarlet.cms.fields import OrderField

class UserSite(models.Model):
    user = models.ForeignKey(User, to_field="username")
    data = models.IntegerField()


class Author(models.Model):
    name = models.CharField(max_length=100)
    bio = models.TextField()

    def __unicode__(self):
        return u"%s" % (self.name, )

class DummyModel(models.Model):
    name = models.CharField(max_length=100)

    def __unicode__(self):
        return u"%s" % (self.name, )


class Category(VersionView):
    category = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, editable=False)

    def __unicode__(self):
        return u"%s" % self.category


class Tag(models.Model):
    name = models.CharField(max_length=255)

    def __unicode__(self):
        return self.name


class Post(VersionView):
    date = models.DateField()
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, editable=False)
    body = models.TextField()
    author = models.ForeignKey(Author, on_delete=models.PROTECT)
    category = models.ForeignKey(Category)
    tags = fields.M2MFromVersion(Tag, blank=True)
    # SEO Section
    keywords = models.TextField(blank=True)
    description = models.TextField(blank=True)

    def __unicode__(self):
        return u"%s" % self.title


class PostImage(Cloneable):
    post = fields.FKToVersion(Post)
    caption = models.CharField(max_length=255, blank=True)
    order = OrderField()

    def __unicode__(self):
        if self.caption:
            return self.caption
        else:
            return unicode(self.image)


class Comment(VersionView):
    post = models.ForeignKey(Post)
    name = models.CharField(max_length=100)
    text = models.TextField()

    def __unicode__(self):
        return u"%s" % (self.text[:20],)

Post.register_related(related_name='postimage')
