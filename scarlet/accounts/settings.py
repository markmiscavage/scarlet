from django.conf import settings

from . import groups

BASE_GROUPS = getattr(settings, 'ACCOUNTS_BASE_GROUPS',
                ( groups.ADMIN,))

ACCOUNTS_FORBIDDEN_USERNAMES = getattr(settings,
                                      'ACCOUNTS_FORBIDDEN_USERNAMES',
                                      ('signup', 'signout', 'signin',
                                       'activate', 'me', 'password'))
