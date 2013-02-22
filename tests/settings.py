SECRET_KEY = "Please do not spew DeprecationWarnings"

# Must use the versioning backend
DATABASES = {
    'default': {
        'ENGINE': 'versioning.postgres_backend',
        'NAME': 'cms',
        'USER': '',
        'PASSWORD': '',
        'HOST': 'localhost',
        'PORT': '',
    }
}

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.contenttypes',
    'sorl.thumbnail',
    'taggit',
    'accounts',
    'assets',
    'cache',
    'cms',
    'scheduling',
    'versioning',
    'version_models',
    'version_twomodels',
    'cms_bundles',
]

SITE_ID = 1
ROOT_URLCONF = 'cms_bundles.urls'
