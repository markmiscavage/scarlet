import datetime
import unittest
import json
from urllib import urlencode

from django.test import TestCase
from django.test.client import Client, RequestFactory
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.template import TemplateDoesNotExist
from django.forms.models import inlineformset_factory

from scarlet.cms import bundles, views, actions
from scarlet.cms.item import FormView
from scarlet.versioning import manager

from .forms import TestPostForm
from models import *


class TestCaseDeactivate(TestCase):
    def tearDown(self):
        manager.deactivate()


class BundleViewsTestCase(TestCase):

    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()

        author = Author.objects.create(
                    name='Joe Tester',
                    bio='I like testing.'
                )

        # Create a category
        category = Category.objects.create(
                    category='Category Test',
                    slug='category_test'
                )

        # Create  a post
        self.post = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.'
                )

        # Create a post image
        post_image = PostImage.objects.create(
                    post=self.post,
                    caption='This is a test caption for the post image object.'
                )

        # create a comment
        comment = Comment.objects.create(
                    post=self.post,
                    name='Test Commenter',
                    text='Test comment.  Great blog post!'
                )

    def test_list(self):
        resp = self.client.get('/admin/blog/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue('list' in resp.context)
        self.assertEqual([row.instance.id for row in resp.context['list']], [self.post.pk])

    def test_add(self):
        resp = self.client.get('/admin/blog/add/')
        self.assertEqual(resp.status_code, 200)


    #AUTHOR
    def test_addedit_author(self):
        #add author - good
        resp = self.client.post('/admin/blog/author/add/', data={'name':'John', 'bio' : 'boring'})
        self.assertEqual(resp.status_code, 302)
        a = Author.objects.filter(name='John')
        self.assertEqual(a.count(), 1)

        #edit author - good
        resp = self.client.post('/admin/blog/author/%s/edit/' % a[0].pk,
                        data= {'view_tags':'author,john', 'name':'John', 'bio' : 'edit'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Author.objects.filter(name='John', bio='edit').count(), 1)
        self.assertEqual(Author.objects.filter(name='John', bio='boring').count(), 0)

        #edit author - bad
        resp = self.client.post('/admin/blog/author/%s/edit/' % a[0].pk,
                        data= {'view_tags':'author,john', 'name':'John', 'bio' : ''})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Author.objects.filter(name='John', bio='edit').count(), 1)
        self.assertEqual(Author.objects.filter(name='John', bio='boring').count(), 0)

    def test_addauthor_bad(self):
        resp = self.client.post('/admin/blog/author/add/',data={'name':'Jim', 'bio' : ''})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Author.objects.filter(name='Jim', bio = '').count(), 0)

    def test_deleteauthor(self):
        resp = self.client.post('/admin/blog/author/add/',
                            data={'name':'Doomed', 'bio' : 'sorry'})
        self.assertEqual(resp.status_code, 302)
        a = Author.objects.filter(name='Doomed')

        resp = self.client.post('/admin/blog/author/%s/delete/?o=/admin/blog/author/?' %a[0].pk,
                             data = {'modify': ''})
        self.assertEqual(Author.objects.filter(name='Doomed').count(), 1)

        resp = self.client.post('/admin/blog/author/%s/delete/?o=/admin/blog/author/?' %a[0].pk,
                             data = {'modify': 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Author.objects.filter(name='Doomed').count(), 0)

    #CATEGORY
    def test_addedit_category(self):
        #add category - good
        resp = self.client.post('/admin/blog/category/add/', data={'category':'Cat'})
        self.assertEqual(resp.status_code, 302)
        a = Category.objects.filter(category='Cat')
        self.assertEqual(a.count(), 1)

        #edit category - good
        resp = self.client.post('/admin/blog/category/%s/edit/' % a[0].pk,
                        data= {'view_tags':'categorys,cat', 'category':'Kat'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Category.objects.filter(category='Kat').count(), 1)
        self.assertEqual(Category.objects.filter(category='Cat').count(), 0)

        #edit category - bad
        a = Category.objects.filter(category='Kat')
        resp = self.client.post('/admin/blog/category/%s/edit/' % a[0].pk,
                        data= {'view_tags':'categorys,kat', 'category' : ''})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Category.objects.filter(category='Kat').count(), 1)
        self.assertEqual(Category.objects.filter(category='Cat').count(), 0)

    def test_addcategory_bad(self):
        resp = self.client.post('/admin/blog/category/add/',data={'category' : ''})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Category.objects.filter(category='').count(), 0)

    def test_deletecategory(self):
        resp = self.client.post('/admin/blog/category/add/',
                            data={'category' : 'SadCat'})
        self.assertEqual(resp.status_code, 302)
        a = Category.objects.filter(category = 'SadCat')

        resp = self.client.post('/admin/blog/category/%s/delete/?o=/admin/blog/category/?' %a[0].pk,
                             data = {'modify': ''})
        self.assertEqual(Category.objects.filter(category = 'SadCat').count(), 1)

        resp = self.client.post('/admin/blog/category/%s/delete/?o=/admin/blog/category/?' %a[0].pk,
                             data = {'modify': 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Category.objects.filter(category = 'SadCat').count(), 0)

    #POST
    def test_addedit_post(self):
        author = Author.objects.create(
                    name='Joe Poster',
                    bio='I like posting.'
                )

        category = Category.objects.create(
                    category='Posts',
                    slug='dumb_category'
                )
        # add good post
        resp = self.client.post('/admin/blog/add/',
                            data = {'date' : '2013-06-20', 'title' : 'Test',
                            'body' : 'Test Body', 'author' : author.pk, 'category' : category.pk})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Post.objects.filter(title = 'Test').count(), 1)

        # add bad posts
        resp = self.client.post('/admin/blog/add/',
                            data = {'date' : '2013-06-21', 'title' : 'Test',
                            'body' : 'Test Body 2', 'author' : '0', 'category' : category.pk})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Post.objects.filter(title = 'Test').count(), 1)

        resp = self.client.post('/admin/blog/add/',
                            data = {'date' : '20130621', 'title' : 'Test',
                            'body' : 'Test Body 2', 'author' : '0', 'category' : category.pk})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Post.objects.filter(title = 'Test').count(), 1)

        resp = self.client.post('/admin/blog/add/',
                            data = {'date' : '2013-06-21', 'title' : 'Test',
                            'body' : '', 'author' : '0', 'category' : category.pk})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Post.objects.filter(title = 'Test').count(), 1)

        #make good edit
        a = Post.objects.filter(title = 'Test')
        resp = self.client.post('/admin/blog/%s/edit/' % a[0].pk, data = {
                    'view_tags' : 'posts,posts,test', 'date' : '2013-06-20', 'title' : 'Test', 'body' : 'Test Body!',
                    'author' : author.pk, 'category' : category.pk, 'postimageformformset-TOTAL_FORMS' : '0',
                    'postimageformformset-INITIAL_FORMS' : '0', 'postimageformformset-MAX_NUM_FORMS' : ''})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Post.objects.filter(body = 'Test Body!').count(), 1)

        #edit to create Image
        resp = self.client.post('/admin/blog/%s/edit/' % a[0].pk, data = {
                    'view_tags' : 'posts,posts,test', 'date' : '2013-06-20', 'title' : 'Test', 'body' : 'Test Body!',
                    'author' : author.pk, 'category' : category.pk, 'postimageformformset-TOTAL_FORMS' : '1',
                    'postimageformformset-INITIAL_FORMS' : '0', 'postimageformformset-MAX_NUM_FORMS' : '',
                    'postimageformformset-0-post' : a[0].pk, 'postimageformformset-0-caption' : 'Captions are cool.',
                    'postimageformformset-0-order' : '0', 'postimageformformset-0-id' : '',
                    'postimageformformset-0-ORDER' : '100'})
        self.assertEqual(resp.status_code, 302)
        p = PostImage.objects.filter(caption = 'Captions are cool.')
        self.assertEqual(p.count(), 1)

        #edit to create bad image
        resp = self.client.post('/admin/blog/%s/edit/' % a[0].pk, data = {
                    'view_tags' : 'posts,posts,test', 'date' : '2013-06-20', 'title' : 'Test', 'body' : '',
                    'author' : author.pk, 'category' : category.pk, 'postimageformformset-TOTAL_FORMS' : '1',
                    'postimageformformset-INITIAL_FORMS' : '0', 'postimageformformset-MAX_NUM_FORMS' : '',
                    'postimageformformset-0-post' : a[0].pk, 'postimageformformset-0-caption' : 'Captions are cool.',
                    'postimageformformset-0-order' : '0', 'postimageformformset-0-id' : '',
                    'postimageformformset-0-ORDER' : '0'})
        self.assertEqual(resp.status_code, 200)
        p = PostImage.objects.filter(caption = 'Captions are cool.')
        self.assertEqual(p.count(), 1)

        # Test multiselect widget creatition
        resp = self.client.get('/admin/blog/add/')
        self.assertTrue('<div class="api-select" data-api="/admin/blog/tag/?type=choices" data-add="/admin/blog/tag/add/?popup=1"><input type="hidden" data-multiple data-title="" name="tags" value="" /></div>' in resp.content)

        resp = self.client.get('/admin/blog/%s/edit/' % a[0].pk)
        self.assertTrue('<div class="api-select" data-api="/admin/blog/tag/?type=choices" data-add="/admin/blog/tag/add/?popup=1"><input type="hidden" data-multiple data-title="" name="tags" value="" /></div>' in resp.content)

    def test_delete_post(self):
        author = Author.objects.create(
                    name='Joe Poster',
                    bio='I like posting.'
                )

        category = Category.objects.create(
                    category='Posts',
                    slug='dumb_category'
                )
        resp = self.client.post('/admin/blog/add/',
                            data = {'date' : '2013-06-20', 'title' : 'Apple',
                            'body' : 'Test Body', 'author' : author.pk, 'category' : category.pk})
        self.assertEqual(resp.status_code, 302)
        p = Post.objects.filter(title = 'Apple')
        self.assertEqual(p.count(), 1)

        #good delete
        self.client.post('/admin/blog/%s/edit/delete/?o=/admin/blog/?' % p[0].pk, data = {'modify' : 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Post.objects.filter(title = 'Apple').count(), 0)

        #bad delete
        resp = self.client.post('/admin/blog/add/',
                            data = {'date' : '2013-06-20', 'title' : 'Apple',
                            'body' : 'Test Body', 'author' : author.pk, 'category' : category.pk})
        self.assertEqual(resp.status_code, 302)
        self.client.post('/admin/blog/%s/edit/delete/?o=/admin/blog/?' % p[0].pk, data = {})
        self.assertEqual(Post.objects.filter(title='Apple').count(), 1)

    def test_seo(self):
        resp = self.client.post('/admin/blog/%s/edit/seo/' % self.post.pk, data = {'view_tags' : 'posts,posts,test title',
            'keywords' : 'i love keywords', 'description' : 'and descriptions' })
        self.assertEqual(resp.status_code, 302)
        #TODO : make sure actually in db

    def test_comments(self):
        resp = self.client.post('/admin/blog/%s/edit/comments/add/' % self.post.pk, data = {'view_tags' : 'commentses',
                     'name' : 'Joe Ego', 'text' : 'Man, I have an awesome blog.'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Comment.objects.filter(name = 'Joe Ego').count(), 1)

        #bad comment
        resp = self.client.post('/admin/blog/%s/edit/comments/add/' % self.post.pk, data = {'view_tags' : 'commentses',
                     'name' : 'Joe Ego', 'text' : ''})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Comment.objects.filter(name = 'Joe Ego').count(), 1)

        #edit comment
        c = Comment.objects.filter(name = 'Joe Ego')
        resp = self.client.post('/admin/blog/%s/edit/comments/%s/edit/' % (self.post.pk, c[0].pk), data =
                    {'view_tags' : 'commentses,man,i have an aweso',
                     'name' : 'Joe Ego', 'text' : 'Man, I have the best blog.'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Comment.objects.filter(text='Man, I have the best blog.').count(), 1)
        self.assertEqual(Comment.objects.filter(text='Man, I have an awesome blog.').count(), 0)

        #bad edit
        c = Comment.objects.filter(name = 'Joe Ego')
        resp = self.client.post('/admin/blog/%s/edit/comments/%s/edit/' % (self.post.pk, c[0].pk), data =
                    {'view_tags' : 'commentses,man,i have the best',
                     'name' : 'Joe Ego', 'text' : ''})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Comment.objects.filter(text='Man, I have the best blog.').count(), 1)
        self.assertEqual(Comment.objects.filter(text='').count(), 0)

    def test_edit(self):
        resp = self.client.get('/admin/blog/%s/edit/' % self.post.pk)
        self.assertEqual(resp.status_code, 200)

    def test_delete(self):
        resp = self.client.get('/admin/blog/%s/edit/delete/' % self.post.pk)
        self.assertEqual(resp.status_code, 200)


class MiscViewTestCase(TestCaseDeactivate):

    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()
        self.cat1 = Category.objects.create(category='One')
        self.cat2 = Category.objects.create(category='Two')
        self.cat3 = Category.objects.create(category='Three')

    def test_pagination(self):
        #objects appear on pages in opposite order than they were added
        nums = {1 : "Three", 2 : "Two", 3 : "One"}

        for x in range (1, Category.objects.all().count()):
            resp = self.client.get('/admin/blog/category/?page=%d' % x)
            self.assertEqual(resp.status_code, 200)
            for y in range(1, Category.objects.all().count()):
                if (x == y):
                    self.assertContains(resp, nums[x])
                else:
                    self.assertNotContains(resp, nums[y])

    def test_listviewformsets(self):
        resp = self.client.post('/admin/blog/category/', data = {'form-TOTAL_FORMS' : '1', 'form-INITIAL_FORMS' : '1',
             'form-0-id' : self.cat1.pk, 'form-0-category' : "Uno"})
        self.assertEqual(resp.status_code, 302)
        c = Category.objects.filter(category = "Uno")
        self.assertEqual(c.count(), 1)
        self.assertEqual(Category.objects.filter(category = "One").count(), 0)

        resp = self.client.post('/admin/blog/category/', data = {'form-TOTAL_FORMS' : '1', 'form-INITIAL_FORMS' : '1',
             'form-0-id' : self.cat2.pk, 'form-0-category' : ""})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Category.objects.filter(category = "").count(), 0)
        self.assertEqual(Category.objects.filter(category = "Two").count(), 1)

        resp = self.client.post('/admin/blog/category/?page=2', data = {'form-TOTAL_FORMS' : '1', 'form-INITIAL_FORMS' : '1',
             'form-0-id' : self.cat2.pk, 'form-0-category' : "Dos"})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Category.objects.filter(category="Dos").count(), 1)
        self.assertEqual(Category.objects.filter(category="Two").count(), 0)



    def test_wrong_fields(self):
        f = FormView(model=Post)
        f.form = TestPostForm
        f.fieldsets = (('Post', {'fields': ('title',)}),)
        form_class = f.get_form_class()
        form = form_class()
        self.assertEqual(form.fields.keys(), ['title'])


    def test_inline_model_with_to_field(self): 
        "An inline model with a to_field of a formset with instance have working relations. Regression for #13794" 
        FormSet = inlineformset_factory(User, UserSite) 
        user = User.objects.create(username="guido")
        UserSite.objects.create(user=user, data=10) 
        formset = FormSet(instance=user) 
        formset[0] 
        # Testing the inline model's relation 
        self.assertEqual(formset[0].instance.user_id, "guido") 


class TestMainBundle(bundles.Bundle):
    navigation = bundles.PARENT
    main = views.ListView(display_fields=('user', 'text'))

    class Meta:
        primary_model_bundle = True


class TestBundle1(TestMainBundle):
    navigation = bundles.PARENT

    class Meta:
        primary_model_bundle = True


class TestBundle2(TestMainBundle):
    navigation = bundles.PARENT
    dashboard = (('main',),
         ('tv_main', 'Landing Page',
                    {'adm_tv_pk': 'tv_main'}),)

    class Meta:
        primary_model_bundle = True

class TestBundle3(TestBundle2):
    navigation = bundles.PARENT



class BundleTestCase(TestCaseDeactivate):

    def setUp(self):
        self.tbm = TestMainBundle(name='test-main',title='Test main Title',
                    title_plural='Test main Titles',
                    parent=None, attr_on_parent=None, site=None)

        self.tb1 = TestBundle1(name='test1',title='Test1 Title', title_plural='Test1 Titles',
                    parent=None, attr_on_parent=None, site=None)

        self.tb2 = TestBundle2(name='test2',title='Test2 Title', title_plural='Test2 Titles',
                    parent=None, attr_on_parent=None, site=None)

        self.tb3 = TestBundle3(name='test2', title='Test3 Title', title_plural='Test3 Titles',
                    parent=None, attr_on_parent=None, site=None)

    def test_bundles(self):

        self.tb1.name = 'test1 change'
        self.assertEquals( self.tb1.name, 'test1 change')
        self.assertEquals( self.tb2.name, 'test2')
        self.assertEquals( self.tbm.name, 'test-main')

        self.tbm.title = '333'
        self.assertEquals( self.tb1.title, 'Test1 Title')
        self.assertEquals( self.tb2.title, 'Test2 Title')
        self.assertEquals( self.tbm.title, '333')

        self.tb2.dashboard = (('main'),)
        self.assertEquals( self.tb1.dashboard, ())
        self.assertEquals( self.tb2.dashboard, (('main'),))
        self.assertEquals( self.tbm.dashboard, ())
        self.assertEquals(self.tb3.dashboard, (('main',), ('tv_main', 'Landing Page',{'adm_tv_pk': 'tv_main'}),))

        self.tb1.dashboard = (('main',), ('tv_main', 'Landing Page', {'adm_tv_pk' : 'tv_main'}),)
        self.assertEquals(self.tbm.dashboard, ())
        self.assertEquals(self.tb1.dashboard,  (('main',), ('tv_main', 'Landing Page', {'adm_tv_pk' : 'tv_main'}),))
        self.assertEquals(self.tb2.dashboard, (('main'),))
        self.assertEquals(self.tb3.dashboard, (('main',), ('tv_main', 'Landing Page',{'adm_tv_pk': 'tv_main'}),))

        self.tb3.name = 'test3'
        self.assertEquals(self.tbm.name, 'test-main')
        self.assertEquals(self.tb1.name, 'test1 change')
        self.assertEquals(self.tb2.name, 'test2')
        self.assertEquals(self.tb3.name, 'test3')


class BundleURLTestCase(TestCaseDeactivate):

    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()

        self.dummy = DummyModel.objects.create(name='A')

        author = Author.objects.create(
                    name='Joe Tester',
                    bio='I like testing.'
                )

        # Create a category
        category = Category.objects.create(
                    category='Category Test',
                    slug='category_test'
                )

        # Create  a post
        self.post = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.'
                )


    def test_redirects(self):
        #Dummy_Redirector should redirect from an edit page back to the same edit page upon save.
        resp = self.client.post('/admin/blog/dummy_redirector/%s/edit/' % self.dummy.pk, data =
                    {'view_tags' : 'dummy redirects, a' ,'name' : 'B'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(DummyModel.objects.filter(name='B').count(), 1)
        self.assertEqual(DummyModel.objects.filter(name='A').count(), 0)
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], '/admin/blog/dummy_redirector/%s/edit/' % self.dummy.pk)

    def test_URLAlias(self):
        #Dummy_Alias makes 'edit' an alias for 'dummy_edit', and all edits should be made at the latter URL
        resp = self.client.post('/admin/blog/dummy_alias/%s/dummy_edit/' % self.dummy.pk, data =
                    {'view_tags' : 'dummy aliases, b', 'name' : 'C'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(DummyModel.objects.filter(name='C').count(), 1)
        self.assertEqual(DummyModel.objects.filter(name='D').count(), 0)

    def test_bundle_independence(self):
        #test bundles that use the same subbundle have independent URLs
        resp = self.client.get('/admin/blog/author/')
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get('/admin/authoronly/author/')
        self.assertEqual(resp.status_code, 200)

        resp = self.client.post('/admin/blog/author/add/', data = {'view_tags' : 'authors', 'name' : 'Two', 'bio' : '2'} )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], '/admin/blog/author/')
        a = Author.objects.filter(name='Two')
        self.assertEqual(a.count(), 1)
        resp = self.client.get('/admin/blog/author/%s/edit/' % a[0].pk)
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get('/admin/authoronly/author/%s/edit/' % a[0].pk)

        resp = self.client.post('/admin/authoronly/author/add/', data = {'view_tags' : 'authors', 'name' : 'Three', 'bio' : '3'} )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], '/admin/authoronly/author/')
        a = Author.objects.filter(name='Three')
        self.assertEqual(a.count(), 1)
        resp = self.client.get('/admin/authoronly/author/%s/edit/' % a[0].pk)
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get('/admin/blog/author/%s/edit/' % a[0].pk)
        self.assertEqual(resp.status_code, 200)


class FilterTestCase(TestCaseDeactivate):
    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()

        self.author1 = Author.objects.create(
                    name='authornumberone',
                    bio='ab'
                )
        self.author2 = Author.objects.create(
                    name='authornumbertwo',
                    bio='bb')
        self.author3 = Author.objects.create(
                    name='authornumberthree',
                    bio='ca')

    def test_filter(self):
        resp = self.client.get('/admin/blog/author/?name=&bio=a&search=')
        self.assertContains(resp, 'authornumberone')
        self.assertContains(resp, 'authornumberthree')
        self.assertNotContains(resp, 'authornumbertwo')

        resp = self.client.get('/admin/blog/author/?name=number&bio=&search=')
        self.assertContains(resp, 'authornumberone')
        self.assertContains(resp, 'authornumbertwo')
        self.assertContains(resp, 'authornumberthree')

        resp = self.client.get('/admin/blog/author/?name=&bio=&search=')
        self.assertContains(resp, 'authornumberone')
        self.assertContains(resp, 'authornumbertwo')
        self.assertContains(resp, 'authornumberthree')

        resp = self.client.get('/admin/blog/author/?name=number&bio=ab&search=')
        self.assertContains(resp, 'authornumberone')
        self.assertNotContains(resp, 'authornumbertwo')
        self.assertNotContains(resp, 'authornumberthree')

        resp = self.client.get('/admin/blog/author/?name=a&bio=&search=')
        self.assertContains(resp, 'authornumberone')
        self.assertContains(resp, 'authornumbertwo')
        self.assertContains(resp, 'authornumberthree')


class ActionViewTestCase(TestCaseDeactivate):
    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()

        author = Author.objects.create(
                    name='Joe Tester',
                    bio='I like testing.'
                )

        # Create a category
        category = Category.objects.create(
                    category='Category Test',
                    slug='category_test'
                )

        # Create  a post
        self.post1 = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.' )

        self.post2 = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test 2',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.')

        self.post3 = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test 3',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.')

        self.comment1 = Comment.objects.create(
                    post=self.post1,
                    name='Commenter1',
                    text='Cool!'
                )
        self.comment2 = Comment.objects.create(
                    post=self.post1,
                    name='Commenter2',
                    text='Awesome!'
                )
        self.comment3 = Comment.objects.create(
                    post=self.post1,
                    name='Commenter3',
                    text='Rad!'
                )

    def check_redirect_and_modify(self, post_to, action, selected):
        redirect_to = post_to + action
        qs = '?' + urlencode({ actions.CHECKBOX_NAME : ','.join(selected)})
        resp = self.client.post(post_to, data =
                {actions.CHECKBOX_NAME : ','.join(selected), 'actions' : redirect_to})
        self.assertEqual(resp.status_code, 302)
        #check that we were redirected to the right place
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], redirect_to + qs)
        resp = self.client.post(redirect_to + qs, data={'modify' : 'Yes'})
        self.assertEqual(resp.status_code, 302)
        return resp


    def test_custom_mass_action(self):
        # test on one target
        post_to = '/admin/blog/'
        action = 'change_action/'
        sel = [str(self.post1.pk)]
        resp = self.check_redirect_and_modify(post_to, action, sel)
        self.assertEqual(Post.objects.filter(title='Dummy').count(), 1)
        self.assertEqual(Post.objects.filter(title='Title Test').count(), 0)

        # multiple targets
        sel = [str(self.post2.pk), str(self.post3.pk)]
        resp = self.check_redirect_and_modify(post_to, action, sel)
        self.assertEqual(Post.objects.filter(title='Dummy').count(), 3)
        self.assertEqual(Post.objects.filter(title__icontains='Title Test').count(), 0)

        # in subbundle
        post_to = '/admin/blog/%s/edit/comments/' % self.post1.pk
        action = 'something_action/'
        sel = [str(self.comment1.pk), str(self.comment2.pk)]
        resp = self.check_redirect_and_modify(post_to, action, sel)
        self.assertEqual(Comment.objects.filter(name='Something').count(), 2)
        self.assertEqual(Comment.objects.filter(name='Commenter1').count(), 0)
        self.assertEqual(Comment.objects.filter(name='Commenter2').count(), 0)


    def test_delete_mass_action(self):
        post_to = '/admin/blog/'
        action = 'delete_action/'
        original_num = Post.objects.all().count()
        sel = [str(self.post1.pk), str(self.post2.pk), str(self.post3.pk)]
        resp = self.check_redirect_and_modify(post_to, action, sel)
        self.assertEqual(Post.objects.all().count(), original_num - len(sel))

    def test_sub_delete_mass_action(self):
        post_to = '/admin/blog/%s/edit/comments/' % self.post1.pk
        action = 'delete_action/'
        sel = [str(self.comment1.pk), str(self.comment2.pk)]
        original_num = Comment.objects.all().count()
        resp = self.check_redirect_and_modify(post_to, action, sel)
        self.assertEqual(Comment.objects.all().count(), original_num - len(sel))
        self.assertEqual(Comment.objects.filter(name = 'Commenter1').count(), 0)
        self.assertEqual(Comment.objects.filter(name = 'Commenter2').count(), 0)


    def test_bad_mass_delete(self):
        redirect_to = '/admin/blog/delete_action/'
        sel = [str(self.post1.pk)]
        qs = '?' + urlencode({actions.CHECKBOX_NAME : ','.join(sel)})
        original_num = Post.objects.all().count()
        resp = self.client.post(redirect_to + qs)
        self.assertEqual(Post.objects.all().count(), original_num)
        self.assertEqual(Post.objects.filter(title="Title Test").count(), 1)

        # in subbundle
        redirect_to = '/admin/blog/%s/edit/comments/' % self.post1.pk
        sel = [str(self.comment1.pk), str(self.comment2.pk)]
        qs = '?' + urlencode({actions.CHECKBOX_NAME : ','.join(sel)})
        original_num = Comment.objects.all().count()
        resp = self.client.post(redirect_to + qs)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Comment.objects.all().count(), original_num)
        self.assertEqual(Comment.objects.filter(name='Commenter1').count(), 1)
        self.assertEqual(Comment.objects.filter(name='Commenter2').count(), 1)

    def test_delete_single_action(self):
        # Using the same view as the mass action
        # Post directly to item_view URL
        original_num = Post.objects.all().count()
        resp = self.client.post('/admin/blog/%s/delete/' % self.post1.pk, data={'modify' : 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Post.objects.all().count(), original_num-1)
        self.assertEqual(Post.objects.filter(title="Title Test").count(), 0)

        #test bad delete single action
        resp = self.client.post('/admin/blog/%s/delete/' % self.post2.pk)
        self.assertEqual(Post.objects.all().count(), original_num-1)

    def test_sub_delete_single_action(self):
        original_num = Comment.objects.all().count()
        resp = self.client.post('/admin/blog/%s/edit/comments/%s/delete/'
                % (self.post1.pk, self.comment1.pk), data = {'modify' : 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Comment.objects.all().count(), original_num -1)
        self.assertEqual(Comment.objects.filter(name="Commenter1").count(), 0)

        resp = self.client.post('/admin/blog/%s/edit/comments/%s/delete/'
                % (self.post1.pk, self.comment2.pk))
        self.assertEqual(Comment.objects.all().count(), original_num-1)

    def test_custom_single_action(self):
        resp = self.client.post('/admin/blog/%s/change/' % self.post1.pk, data={'modify' : 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Post.objects.filter(title="Title Test").count(), 0)
        self.assertEqual(Post.objects.filter(title="Dummy").count(), 1)

        resp = self.client.post('/admin/blog/%s/change/' % self.post2.pk)
        self.assertEqual(Post.objects.filter(title="Title Test 2").count(), 1)
        self.assertEqual(Post.objects.filter(title="Dummy").count(), 1)

        # in subbundle
        resp = self.client.post('/admin/blog/%s/edit/comments/%s/something/' % (self.post1.pk, self.comment1.pk),
                                    data = {'modify' : 'Yes'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Comment.objects.filter(name = "Commenter1").count(), 0)
        self.assertEqual(Comment.objects.filter(name = "Something").count(), 1)

        resp = self.client.post('/admin/blog/%s/edit/comments/%s/something/' % (self.post1.pk, self.comment2.pk))
        self.assertEqual(Comment.objects.filter(name = "Commenter2").count(), 1)
        self.assertEqual(Comment.objects.filter(name = "Something").count(), 1)

    def test_render_subbundle(self):
        resp = self.client.get('/admin/blog/%s/edit/comments/' % self.post1.pk)
        # test that the parent's object header is rendered
        self.assertContains(resp, self.post1.title)

class CustomActionViewsTestCase(TestCaseDeactivate):
    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()

        author = Author.objects.create(
                    name='Joe Tester',
                    bio='I like testing.'
                )

        category = Category.objects.create(
                    category='Category Test',
                    slug='category_test'
                )

        self.post1 = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.' )

        self.post2 = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test 2',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.')

        self.post3 = Post.objects.create(
                    date=datetime.datetime.now(),
                    title='Title Test 3',
                    slug='Slug Test',
                    body='This is a test body for the post object.',
                    author=author,
                    category=category,
                    keywords='keywords test',
                    description='This is a test description for the post object.')

        self.comment1 = Comment.objects.create(
                    post=self.post1,
                    name='Commenter1',
                    text='Cool!'
                )
        self.comment2 = Comment.objects.create(
                    post=self.post1,
                    name='Commenter2',
                    text='Awesome!'
                )
        self.comment3 = Comment.objects.create(
                    post=self.post1,
                    name='Commenter3',
                    text='Rad!'
                )

        now = datetime.datetime.now()
        self.today = now.strftime("%Y-%m-%d")
        self.later = (now + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    def check_redirect_and_modify(self, post_to, action, selected, **kwargs):
        redirect_to = post_to + action
        qs = '?' + urlencode({ actions.CHECKBOX_NAME : ','.join(selected)})
        resp = self.client.post(post_to, data =
                {actions.CHECKBOX_NAME : ','.join(selected), 'actions' : redirect_to})
        self.assertEqual(resp.status_code, 302)
        #check that we were redirected to the right place
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], redirect_to + qs)
        resp = self.client.post(redirect_to + qs, data=kwargs)
        self.assertEqual(resp.status_code, 302)
        return resp

    def test_publish_and_unpublish_actionviews(self):
        # publish one post - bad
        post_to = '/admin/blog/%s/edit/publish/?o=/admin/blog/' % self.post1.pk
        resp = self.client.post(post_to, data={'when_rdi' : 'date', 'when' : 'bad', 'modify' : 'Publish'})
        self.assertEqual(resp.status_code, 200)
        qs_post = Post.objects.filter(pk=self.post1.pk)
        obj = qs_post.get()
        self.assertFalse(obj.status_line().startswith('Publish Scheduled'))

        # publish one post - good
        resp = self.client.post(post_to, data={'when_rdi' : 'date', 'when' : self.later, 'modify' : 'Publish'})
        self.assertEqual(resp.status_code, 302)
        obj = qs_post.get()
        self.assertTrue(obj.status_line().startswith('Publish Scheduled'))
        resp = self.client.post(post_to,  data={'when_rdi' : 'now', 'modify' : 'Publish'})
        self.assertEqual(resp.status_code, 302)
        obj = qs_post.get()
        self.assertTrue(obj.status_line().startswith('Published'))

        # unpublish one post - bad
        post_to = '/admin/blog/%s/edit/unpublish/' % self.post1.pk
        resp = self.client.post(post_to)
        obj = qs_post.get()
        self.assertTrue(obj.status_line().startswith('Published'))
        # unpublish one post - good
        resp = self.client.post(post_to, data={'modify' : 'Unpublish'})
        obj = qs_post.get()
        self.assertTrue(obj.status_line().startswith('Draft'))

        # publish two comments
        post_to = '/admin/blog/%s/edit/comments/' % self.post1.pk
        action = 'publish_action/'
        qs_comment = Comment.objects.all()
        sel = [str(self.comment1.pk), str(self.comment2.pk)]
        resp = self.check_redirect_and_modify(post_to, action, sel, when_rdi='date', when=self.later, modify='Publish')
        obj1 = qs_comment.get(pk=self.comment1.pk)
        obj2 = qs_comment.get(pk=self.comment2.pk)
        self.assertTrue(obj1.status_line().startswith('Publish Scheduled'))
        self.assertTrue(obj2.status_line().startswith('Publish Scheduled'))
        resp = self.check_redirect_and_modify(post_to, action, sel, when_rdi='now', modify='Publish')
        obj1 = qs_comment.get(pk=self.comment1.pk)
        obj2 = qs_comment.get(pk=self.comment2.pk)
        self.assertTrue(obj1.status_line().startswith('Published'))
        self.assertTrue(obj2.status_line().startswith('Published'))

        # unpublish two comments
        post_to = '/admin/blog/%s/edit/comments/' % self.post1.pk
        action = 'unpublish_action/'
        sel = [str(self.comment1.pk), str(self.comment2.pk)]
        resp = self.check_redirect_and_modify(post_to, action, sel, modify='Unpublish')
        obj1 = qs_comment.get(pk=self.comment1.pk)
        obj2 = qs_comment.get(pk=self.comment2.pk)
        self.assertTrue(obj1.status_line().startswith('Draft'))
        self.assertTrue(obj2.status_line().startswith('Draft'))
