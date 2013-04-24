.. toctree::

CMS Tutorial
===================

Welcome to the CSM tutorial; throughout this tutorial, we’ll walk you through the creation of a simple Blog application.

This tutorial assumes you have the CSM installed correctly; if not, see the :ref:`installation instructions <installation>`.


About the CMS
-------------

The main objective of the CMS is to replace the bundled django admin interface, that is based on Models, with a modular
and completely customizable new Admin, based on Class Based Views. Also, it provides additional features out of the box,
like a very efficient cache system, a versioning application, scheduling and much more.

Create an admin interface with the CMS is very similar the classic django admin process, but with two important differences:

* instead of creating an admin.py file, you create a cms_bundles.py inside your app folder.
* instead or registering the models using ModelAdmin class, you use Bundles class to embed views or other bundles (as sub_bundle);
  this approach is really powerful because it allows you to create very complex hierarchical structures. The Bundles class already contains the
  basic CRUD functionality, that you can extend or replace if you want.

IMPORTANT: At this moment the CMS works only with PostgreSQL database. This first version of the CMS does not support South migrations;
we are planning to implement migrations as soon as they will be integrated into Django's core.


Getting Started
---------------

Let's start our tutorial creating a blog application, just like we do with any normal django app:

::

    python manage.py startapp blog


Then we have to create our models:

::

    from django.db import models
    from django.contrib.auth.models import User

    from scarlet.assets.fields import AssetsFileField
    from scarlet.assets.models import Asset
    from scarlet.versioning import fields
    from scarlet.versioning.models import VersionView, Cloneable
    from scarlet.cms.fields import OrderField

    from taggit.managers import TaggableManager


    class Author(models.Model):
        user = models.OneToOneField(User)
        bio = models.TextField()
        avatar = AssetsFileField(type=Asset.IMAGE, tags=['avatar'])

        def __unicode__(self):
            return u"%s" % (self.user, )

        def fullname(self):
            return self.user.get_full_name()


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
        document = AssetsFileField(type=Asset.DOCUMENT, tags=['document'], null=True, blank=True)
        # tags = TaggableManager(blank=True) # disable because it does not work with Publish
        # SEO Section
        keywords = models.TextField(blank=True)
        description = models.TextField(blank=True)

        def __unicode__(self):
            return u"%s" % self.title


    class PostImage(Cloneable):
        post = fields.FKToVersion(Post)
        image = AssetsFileField(type=Asset.IMAGE, tags=['image'])
        caption = models.CharField(max_length=255, blank=True)
        order = OrderField()

        def __unicode__(self):
            if self.caption:
                return self.caption
            else:
                return unicode(self.image)

    Post.register_related(related_name='postimage')

As you can see these are normal django models with a couple of important differences:

* Some models subclass :py:class:`VersionView <scarlet.versioning.models.VersionView>` (Category, Post)
  and :py:class:`Cloneable <scarlet.versioning.models.Cloneable>` (PostImage) instead of models.Model,
  this is how we tell the CMS to make this model versionable. Here you can find more about the :ref:`versioning` system.
* There are some custom fields to manage assets (:py:class:`AssetsFileField <scarlet.assets.fields.AssetsFileField>`),
  ordering (:py:class:`OrderField <scarlet.cms.fields.OrderField>`), and Foreign Key relation
  with other models that have to be cloned when we create a new version of a versioned model object (:py:class:`FKToVersion <scarlet.versioning.fields.FKToVersion>`).
* The last line is necessary to tell the CMS to clone the related Models when you create a new version of a Post model instance.


Creating the Admin
------------------
At this point we have our application and we need to fire up a CMS powered admin: similar to what we do to create the classic admin,
we create a new file inside the app folder called cms_bundles.py, where we put our Classes that inherit from bundles.Bundles instead of admin.ModelAdmin.

The most basic example is the following:
::

    class MyBundle(Bundle):

        class Meta:
            model = MyModel

This way we create a :py:class:`Bundle <scarlet.cms.bundles.Bundle>` that contains the basic CRUD views:

 * **main** - a :py:class:`ListView <scarlet.cms.views.ListView>`
 * **add** - a :py:class:`FormView <scarlet.cms.views.FormView>`
 * **edit** - a :py:class:`FormView <scarlet.cms.views.FormView>`.
 * **delete** - a :py:class:`ListView <scarlet.cms.views.DeleteView>`

Just like in ModelAdmin, we have the possibility to specify options using the class :py:class:`Meta <scarlet.cms.options.Meta>`  inside our Bundle class.


Then we register our bundle using the provided AdminSite:

::

    from scarlet.cms import site
    site.register("mybundle",  MyBundle(name='mybundle', title="My Bundle"), order=1)

Where the first parameter is a unique slug, the second one is an instance of the bundle and the third one is the order that we assign to the bundle in the user interface.

So let's create a cms_bundles.py for our Blog application:

::

    from django.forms.models import inlineformset_factory

    from scarlet.cms import bundles, site, forms, options, views

    from models import Post, PostImage, Category, Author
    from views import PostsListView
    from forms import EditAuthorForm

    postimages_formset = forms.LazyFormSetFactory(
        inlineformset_factory, Post, PostImage, can_order=True)


    class PostImageBundle(bundles.Bundle):
        navigation = bundles.PARENT

        class Meta(options.Orderable):
            model = PostImage


    class CategoryBundle(bundles.Bundle):
        navigation = bundles.PARENT

        class Meta():
            model = Category
            primary_model_bundle = True


    class AuthorBundle(bundles.Bundle):
        navigation = bundles.PARENT
        edit = views.FormView(form_class=EditAuthorForm)

        main = views.ListView(display_fields=('user', 'fullname'))

        class Meta():
            model = Author
            primary_model_bundle = True


    DEFAULT_FIELDS =(
        ("Post", {
            'fields': ('date','title', 'body',
                       'author','category', ) # add 'tags' when it will work
        }),
        ('Assets', {
            'fields': ('document',)
        }),
        )


    class BlogEditBundle(bundles.VersionedObjectOnlyBundle):
        navigation = (
            ('main', 'Post Data'),
            ('seo', 'Page SEO'),
        )

        main = views.FormView(redirect_to_view=None,formsets={
            "Images": postimages_formset},
            fieldsets=DEFAULT_FIELDS)

        edit = bundles.PARENT
        seo = views.FormView(redirect_to_view=None, cancel_view=None,
            fieldsets=(
                ("SEO", {
                    'fields': ('keywords', 'description',)
                }),
            ))

        class Meta:
            model = Post


    class PostAddView(views.FormView):
        def get(self, request, *args, **kwargs):
            if not self.model.category.get_query_set():
                self.write_message(status=30, message="Warning! You need at least one Category to insert new Posts.")
            if not self.model.author.get_query_set():
                self.write_message(status=30, message="Warning! You need at least one Author to insert new Posts.")
            return super(PostAddView, self).get(request, *args, **kwargs)


    class BlogBundle(bundles.DelegatedObjectBundle):
        dashboard = (
            ('main', "Custom"),
            ('author',),
            ('category',),
        )

        main = views.ListView(display_fields=('title', 'author'))
        add = PostAddView(fieldsets=DEFAULT_FIELDS)
        edit = BlogEditBundle.as_subbundle(name='post')
        author = AuthorBundle.as_subbundle(name='author')
        category = CategoryBundle.as_subbundle(name='category')
        preview = views.PreviewWrapper(preview_view=PostsListView,
            pass_through_kwarg=None)

        class Meta:
            model = Post
            primary_model_bundle = True
            item_views = list(options.VersionMeta.item_views) + ['preview']

    site.register("blog", BlogBundle(name='blog'), order=10, title="Blog")

Let's study this code to see how bundle are implemented: since bundle can contains CBV (Class Based Views)
or other bundle (that are CBV as well), the first thing to do is define
how we want to represent our admin interface to compose the main container BlogBundle: in this case I want to be able to
directly access the Post, Category and Author section from the main navigation window:

::

        dashboard = (
            ('main',),
            ('author',),
            ('category',),
        )

'dashboard' take a list of tuples that contains 3 values: a label, the class attribute name and an optional url keyword arguments. Since we didn't define labels for some the bundle titles will be used.
In the bundle we also define:

 * the `main` view that is responsible to show the list of Post objects. In this case we want to show 'title' and 'author'.
 * the `add` view PostAddView, that is the main view responsible to add new objects. In this case we want to define how to organize the fields
   and show a couple of messages when there are no categories or authors defined.
 * `author` and `category` as sub bundle, using Bundle `as_subbundle` class method.
 * `preview` that is responsible to show a preview page of the current object.
   We pass to it the :py:class:`ListView <scarlet.cms.views.ListView>` class, that render the page with the object.
 * `edit` as sub bundle of BlogEditBundle.
 * using Meta, we are also telling that the model we are working on is Post and that this bundle is the 'primary' one.

Category and Author have a simple CRUD interface, however BlogEditBundle is more complex: I want to be able to have
a contextual menu that is visible only when I'm in the 'edit' view within the Post section, that logically divide data input forms.

This task is done subclassing :py:class:`ObjectOnlyBundle <cms.bundles.ObjectOnlyBundle>` and defining a navigation inside it:

::

    navigation = (
        ('main', 'Post Data', None),
        ('seo', 'Page SEO', None),
    )

The value types are the same as dashboard. BlogBundle subclass :py:class:`DelegatedObjectBundle <scarlet.cms.bundles.DelegatedObjectBundle>` that delegates all the normal item views to the sub bundle specified by edit.

Other the that, we define the main FormView to display pictures as inline formset,
and to show an additional SEO section in the secondary menu. Model fields of the SEO section are part of the Post model.


To see the actual admin we need to add it to our urls.py and tell the CMS to autodiscover application that contains cms_bundles.py:

::

    cms.autodiscover()
    urlpatterns = patterns('',
        (r'^admin/', include(cms.site.urls)),
