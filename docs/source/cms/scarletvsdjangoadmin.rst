
.. toctree::

===================
Scarlet vs Django Admin
===================

Why?
========

Every developer has has a love hate relationship with the Django Admin. It is a powerful tool for managing application data, which is what it was designed to do. That it has cut inroads and and survived in the world of content managment is nothing short of astounding. We believe it has done so because of  its unapolegetic view that the people managing a web site need to understand  what types of data compose the website.  Web applicaitons are not folders of documents that one can simply edit in a Microsoft Word like interface. By bringing the administrator a little closer to how their site is composed, Django gives them a lot more power - and saves them a lot of time.

As users mature in their needs the Django Admin begins to break down. One has to start grappling with a number of new questions. How do I enable WYSIWYG editing? How do I empower users to crop images? If one image is used in multiple places, how do I create multiple crops for that one image?  How do I save what I'm working on without making it live? Why do I have to nagivate to 10 different places to update one thing? And so on... When we start asking these questions we have arrived in the world of Content Management. 

At RED we needed content management features, and we believe that the Django Admin was right in its approach. Websites are not flat documents, and approaching content management from that perspective is why Wordpress users can't have nice things. What users really want is to manage the data that their website is composed of and they want to manage it the way that a human thinks of it, not in the way that the database thinks of it. They don't want to know that there are 49 versions of their one image, and the certainly don't want to try and figure out which of those 40 image is the one they should assocaite with a given piece of content. Users don't want to copy and paste the summary of an article into 3 different pages via a WYSIWYG. They want to edit the article and have it appear automatically in the three locations it should appear, AS it should appear. 


How?
=========

We stepped back, looked around, and asked... is Django even the right solution for accomplishing this? The answer was a resounding yes. Django Admin had it right, and alot of the problems we needed to solve are solvable by using existing Django conventions and technolgoies like overriding, extending, and composing new field types, taking advantage of Class Based Views, and lots of Introspection (of both the personal and programatic variety).

Consider a simple Image Gallery app

::
    
    from django.db import models


    # Gallery Model
    class Gallery(models.Model):

        title = models.CharField(max_length=255)
        description = models.TextFeild()
        
        class Meta:
            verbose_name = "Gallery"
            verbose_name_plural = "Galleries"

        def __unicode__(self):
            return self.title


    # Image model - One to Many with Gallery
    class Image(models.Model):

        gallery = models.ForeignKey(Gallery)
        image = models.ImageField()
        title = models.CharField(max_length=255, blank=True)
        link = models.CharField(max_length=255, blank=True)
        order = models.PositiveInteger()


An admin for this app that lets a user perfom simple gallery editing might look like this

:: 
    
    from models import Image, Gallery

    class ImageInline(admin.TabularInline):
        model = models.Image
        

    class GalleryAdmin(admin.ModelAdmin):
        inlines = [
            ImageInline,
        ]

    site.register(models.Gallery, GalleryAdmin)


This would produce an Admin page that lets a user update both the Gallery and the Image on the same page. The user could then type a number into the order field to control the order of the images in the Gallery. We could simplfy and let the user drag and drop the inline fields to set order by installing an admin extension like Grapelli or we could create a ModelForm, and include some javascript in the Django Form, like so


::

    from django import forms

    class ImageForm(forms.ModelForm):
        model = Image
        class Media:
            js = (
                '/static/js/jquery-latest.js',
                '/static/js/ui.base.js',
                '/static/js/ui.sortable.js',
                '/static/js/menu-sort.js',
            )

    class Image(models.Model):

        gallery = models.ForeignKey(Gallery)
        image = models.ImageField()
        title = models.CharField(max_length=255, blank=True)
        link = models.CharField(max_length=255, blank=True)
        order = models.PositiveInteger()

        Meta:
            ordering = ('order',)


    class ImageInline(admin.TabularInline):
        model = models.Image

    admin.site.register(Menu, inlines = [ImageInline], form = ImageForm, )


But what happens when we realize that our image needs to produce a thumbnail, and the user wants to edit the crop of that thumbnail? What's more, let's say the Images in our Gallery are also used on product pages in our store. The store representations of the image have a different aspect ratio, and the user wants to control the crop there as well.  Houston, we have a problem.

These are the types of problems for which we created Scarlet. Almost the entire list of issues in the preceding paragraph is resolved thus.

::

    # In the Models file

    # defines the Potential Cropping sizes for images
    GALLERY_IMAGE_SIZES = {
        'main' : { 'width': 400, 'height' : 250 },
        'preview' : { 'width': 100 }
    }

    class Image(models.Model):
        gallery = models.ForeignKey(Gallery)

        # An asset field that allows us to classify the image and define all of it's potential sizes.
        image = AssetsFileField(type=Asset.IMAGE, required_tags=('gallery image',),
                                image_sizes=GALLERY_IMAGE_SIZES)

        title = models.CharField(max_length=255, blank=True)
        link = models.CharField(max_length=255, blank=True)
        order = OrderField()

    # In the admin file

    # A Django FormSet designed specifically for the problems above. 
    class ImageInlineFormset(forms.LazyFormSetFactory):
        def __init__(self):
            super(ImageInlineFormset, self).__init__(
                    inlineformset_factory, models.Gallery, models.Image,
                    can_order=False, can_delete=True


The above is compatible with the Django Admin.  You'll need to register the templates used for the AssetFileFeild so the JavaScript loads but that's all. 

Where things get interesting is when we start composing objects. Let's say we have a Blog post, aside from allowing the Blog Administrator to just write text we want to allow them to manage Galleries within their posts. 

Here we need to depart from the Django Admin. While the Administrator could do this in the Django Admin, it would involve a lot of clicking around between the Blog and the Gallery Admins. What we want is the galleries that are associated with our blog post to be managed with our blog post. This is where Scarlet shines. The administration interface in Scarlet still acts on Django Models as does the Django Admin, only it adds the concept of Bundles. Bundles are Objects which group Models and Django's Class Based Views to produce an Administrative Interface where associated data can be grouped together.

So let's see a bundle.

::

    # Create a class alot like a regular admin

    class GalleryBundle(bundles.Bundle):

        # Class based views rock so we just extended the Generic ones in Django
        # Bundles allow you to assign class based views to navigation state
        # Below we stay pretty generic.

        # Main view is a list of Galleries and displays the title
        main = views.ListView(display_fields=('title',))

        # A form for editing the details of the Gallery plus an Inline 
        # Formset... just like above
        edit = views.FormView(formsets={"Images": ImageInlineFormset()})

        class Meta(options.Orderable):

            # The model we are producing the Django ModelForm from.
            model = models.Gallery  


Notice there are more lines of comments than lines of code here. This is a Bundle in its simplest form and while it offers more versatility than the Django Admin, it is pretty analagous. When Bundles get interesting is when you begin composing them. We can now make our Gallery Bundle a Subbundle of a Blog Post.

::

    class PostBundle(bundles.Bundle):

        # Set up navigation elements for side navigation
        navigation = (
            ('main', "Post"),
            ('galleries',)
        )

        # What should we display when the above navigation is clicked
        # Show the Edit Class Based View
        main = EditPost()

        # Import the Class based view for Galleries / will only include galleries related
        # to this Post. ( isn't that cool )
        galleries = GalleryBundle.as_subbundle(name='galleries')

        class Meta:
            model = get_model(models.Post)


We then register our bundles with the Scarlet Admin like we would with the Django Admin

::

    site.register('post', PostBundle)


Things get more sophisticated than this. Our hierarchies are not limited to 1 level, Bundles can expose themselves to the homepage dashboard and there are tools like Versioning and Caching to consider. All of these are implemented using Python and Django conventions. 






















