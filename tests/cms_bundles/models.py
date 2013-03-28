from django.db import models

from scarlet.versioning import fields
from scarlet.versioning.models import VersionView, Cloneable
from scarlet.cms.fields import OrderField


class Author(models.Model):
    name = models.CharField(max_length=100)
    bio = models.TextField()

    def __unicode__(self):
        return u"%s" % (self.name, )


class Category(VersionView):
    category = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, editable=False)

    def __unicode__(self):
        return u"%s" % self.category


class Post(VersionView):
    date = models.DateField()
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, editable=False)
    body = models.TextField()
    author = models.ForeignKey(Author)
    category = models.ForeignKey(Category)
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


class Comment(models.Model):
    post = models.ForeignKey(Post)
    name = models.CharField(max_length=100)
    text = models.TextField()

    def __unicode__(self):
        return u"%s" % (self.text[:20],)

Post.register_related(related_name='postimage')
