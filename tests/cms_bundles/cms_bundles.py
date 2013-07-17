from django.forms.models import inlineformset_factory

from scarlet.cms import bundles, site, forms, options, views, renders

from models import Post, PostImage, Comment, Category, Author, DummyModel
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
    main = views.ListView(paginate_by = 1, display_fields=('category',), change_fields=('category',))

    class Meta:
        model = Category
        primary_model_bundle = True


class CommentBundle(bundles.ParentVersionedBundle):
    navigation = bundles.PARENT
    object_view = bundles.PARENT

    main = views.ListView(display_fields=('user', 'text'))

    def get_object_header_view(self, *args, **kwargs):
        kwargs['render_type'] = 'object_header_bare'
        return super(CommentBundle, self).get_object_header_view(
            *args, **kwargs)

    class Meta:
        model = Comment
        parent_field = "post"


class AuthorBundle(bundles.Bundle):
    navigation = bundles.PARENT
    edit = views.FormView(form_class=EditAuthorForm)
    main = views.ListView(filter_form = forms.search_form('name', 'bio',))

    class Meta:
        model = Author

class DummyAliasBundle(bundles.Bundle):
    dummy_edit = views.FormView()
    edit = bundles.URLAlias(alias_to = "dummy_edit")

    class Meta():
        model = DummyModel
        item_views = ('dummy_edit', 'delete')

class DummyRedirectorBundle(bundles.Bundle):
    edit = views.FormView(redirect_to_view='edit')

    class Meta():
        model = DummyModel
        item_views = ('edit', 'delete')


DEFAULT_FIELDS =(
    ("Post", {
        'fields': ('date','title', 'body',
                   'author','category', ) # add 'tags' when it will work
    }),
    )

class PostDeleteView(views.DeleteView):
    def __init__(self, *args, **kwargs):
        super(PostDeleteView, self).__init__(*args, **kwargs)
        self.renders['object_header_bare'] = renders.RenderString(
            template='cms/object_header_bare.html')


class BlogEditBundle(bundles.VersionedObjectOnlyBundle):
    navigation = (
        ('main', 'Post Data'),
        ('comments', 'Comments'),
        ('seo', 'Page SEO'),
    )

    main = views.FormView(redirect_to_view=None,
        formsets={"Images": postimages_formset},
        fieldsets=DEFAULT_FIELDS)

    delete = PostDeleteView()
    edit = bundles.PARENT
    comments = CommentBundle.as_subbundle(name='comments', title="Comments", )
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
        ('main',),
        ('author',),
        ('dummy_alias',),
        ('dummy_redirector',),
        ('category',),
    )

    main = views.ListView(display_fields=('title', 'author'))
    add = PostAddView(fieldsets=DEFAULT_FIELDS)
    edit = BlogEditBundle.as_subbundle(name='post', title="Post")
    author = AuthorBundle.as_subbundle(name='author', title='Author')
    dummy_alias = DummyAliasBundle.as_subbundle(name='dummy_alias', title='Dummy Alias')
    dummy_redirector = DummyRedirectorBundle.as_subbundle(name='dummy_redirector', title='Dummy Redirect')
    category = CategoryBundle.as_subbundle(name='category', title='Category')
    preview = views.PreviewWrapper(preview_view=PostsListView,
        pass_through_kwarg=None)

    class Meta:
        model = Post
        primary_model_bundle = True
        item_views = list(options.VersionMeta.item_views) + ['preview']

class BigAuthorBundle(bundles.DelegatedObjectBundle):
    dashboard = (
        ('author',),
    )

    author = AuthorBundle.as_subbundle(name='author', title='Author')

site.register("blog", BlogBundle(name='blog'), order=10)
site.register("authoronly", BigAuthorBundle(name='authoronly'), order=10)
