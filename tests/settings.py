SECRET_KEY = "Please do not spew DeprecationWarnings"

# Must use the versioning backend
DATABASES = {
    'default': {
        'ENGINE': 'scarlet.versioning.postgres_backend',
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
    'scarlet.accounts',
    'scarlet.assets',
    'scarlet.cache',
    'scarlet.cms',
    'scarlet.scheduling',
    'scarlet.versioning',
    'version_models',
    'version_twomodels',
    'cms_bundles',
]

SITE_ID = 1
ROOT_URLCONF = 'cms_bundles.urls'
