# Accounts settings file.

from django.conf import settings
gettext = lambda s: s

from . import groups

BASE_GROUPS = getattr(settings, 'ACCOUNTS_BASE_GROUPS',
                ( groups.ADMIN,))

ACCOUNTS_WELCOME_EMAIL = getattr(settings,
                                      'ACCOUNTS_WELCOME_EMAIL',
                                      False)

ACCOUNTS_REDIRECT_ON_SIGNOUT = getattr(settings,
                                      'ACCOUNTS_REDIRECT_ON_SIGNOUT',
                                      None)

ACCOUNTS_SIGNIN_REDIRECT_URL = getattr(settings,
                                      'ACCOUNTS_SIGNIN_REDIRECT_URL',
                                      '/accounts/%(username)s/')

ACCOUNTS_ACTIVATION_REQUIRED = getattr(settings,
                                      'ACCOUNTS_ACTIVATION_REQUIRED',
                                      False)

ACCOUNTS_ACTIVATION_DAYS = getattr(settings,
                                  'ACCOUNTS_ACTIVATION_DAYS',
                                  7)

ACCOUNTS_ACTIVATED = getattr(settings,
                            'ACCOUNTS_ACTIVATED',
                            'ALREADY_ACTIVATED')

ACCOUNTS_REMEMBER_ME_DAYS = getattr(settings,
                                   'ACCOUNTS_REMEMBER_ME_DAYS',
                                   (gettext('a month'), 30))

ACCOUNTS_FORBIDDEN_USERNAMES = getattr(settings,
                                      'ACCOUNTS_FORBIDDEN_USERNAMES',
                                      ('signup', 'signout', 'signin',
                                       'activate', 'me', 'password'))

ACCOUNTS_USE_HTTPS = getattr(settings,
                            'ACCOUNTS_USE_HTTPS',
                            False)

ACCOUNTS_USE_MESSAGES = getattr(settings,
                               'ACCOUNTS_USE_MESSAGES',
                               True)

ACCOUNTS_WITHOUT_USERNAMES = getattr(settings,
                                    'ACCOUNTS_WITHOUT_USERNAMES',
                                    False)

ACCOUNTS_PROFILE_DETAIL_TEMPLATE = getattr(
    settings, 'ACCOUNTS_PROFILE_DETAIL_TEMPLATE', 'accounts/profile_detail.html')
