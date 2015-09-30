import datetime

from django import forms
from django.test import TestCase
from django.test.client import Client

from scarlet.cms.item import FormView
from scarlet.cms import bundles, views
from scarlet.versioning import manager
from django.contrib.auth.models import User
from django.forms.models import inlineformset_factory

from models import *

class TestCaseDeactivate(TestCase):
    def tearDown(self):
        manager.deactivate()


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


class TestPatchedDjango(TestCase):
    def test_inline_model_with_to_field(self):
        "An inline model with a to_field of a formset with instance have working relations. Regression for #13794"
        FormSet = inlineformset_factory(User, UserSite)
        user = User.objects.create(username="guido")
        UserSite.objects.create(user=user, data=10)
        formset = FormSet(instance=user)
        formset[0]
        # Testing the inline model's relation
        self.assertEqual(formset[0].instance.user_id, "guido")

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
        resp = self.client.post('/admin/dummy/dummy_redirector/%s/edit/' % self.dummy.pk, data =
                    {'view_tags' : 'dummy redirects, a' ,'name' : 'B'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(DummyModel.objects.filter(name='B').count(), 1)
        self.assertEqual(DummyModel.objects.filter(name='A').count(), 0)
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], '/admin/dummy/dummy_redirector/%s/edit/' % self.dummy.pk)

    def test_URLAlias(self):
        #Dummy_Alias makes 'edit' an alias for 'dummy_edit', and all edits should be made at the latter URL
        resp = self.client.post('/admin/dummy/dummy_alias/%s/dummy_edit/' % self.dummy.pk, data =
                    {'view_tags' : 'dummy aliases, b', 'name' : 'C'})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(DummyModel.objects.filter(name='C').count(), 1)
        self.assertEqual(DummyModel.objects.filter(name='D').count(), 0)

    def test_bundle_independence(self):
        #test bundles that use the same subbundle have independent URLs
        resp = self.client.get('/admin/dummy/author/')
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get('/admin/authoronly/author/')
        self.assertEqual(resp.status_code, 200)

        resp = self.client.post('/admin/dummy/author/add/', data = {'view_tags' : 'authors', 'name' : 'Two', 'bio' : '2'} )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], '/admin/dummy/author/')
        a = Author.objects.filter(name='Two')
        self.assertEqual(a.count(), 1)
        resp = self.client.get('/admin/dummy/author/%s/edit/' % a[0].pk)
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get('/admin/authoronly/author/%s/edit/' % a[0].pk)

        resp = self.client.post('/admin/authoronly/author/add/', data = {'view_tags' : 'authors', 'name' : 'Three', 'bio' : '3'} )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual((resp['Location'])[resp['Location'].find('/admin/'):], '/admin/authoronly/author/')
        a = Author.objects.filter(name='Three')
        self.assertEqual(a.count(), 1)
        resp = self.client.get('/admin/authoronly/author/%s/edit/' % a[0].pk)
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get('/admin/dummy/author/%s/edit/' % a[0].pk)
        self.assertEqual(resp.status_code, 200)


class TestUserForm(forms.ModelForm):
    class Meta:
        model = User


class MiscViewTestCase(TestCaseDeactivate):

    def setup_test_user(self):
        user = User.objects.create_user('tester', 'tester@example.com', '1234')
        user.is_staff = True
        user.is_superuser = True
        user.save()
        self.client.login(username='tester', password='1234')
        self.user = user

    def setUp(self):
        self.client = Client()
        self.setup_test_user()


    def test_wrong_fields(self):
        f = FormView(model=User)
        f.form = TestUserForm
        f.fieldsets = (('User', {'fields': ('first_name',)}),)
        form_class = f.get_form_class()
        form = form_class()
        self.assertEqual(form.fields.keys(), ['first_name'])
