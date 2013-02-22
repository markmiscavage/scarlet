from django.conf import settings
from django.utils.hashcompat import sha_constructor
from django.contrib.auth.models import SiteProfileNotAvailable
from django.db.models import get_model

from accounts import settings as accounts_settings

import random


def signin_redirect(redirect=None, user=None):
    """
    Redirect user after successful sign in.

    First looks for a ``requested_redirect``. If not supplied will fall-back to
    the user specific account page. If all fails, will fall-back to the standard
    Django ``LOGIN_REDIRECT_URL`` setting. Returns a string defining the URI to
    go next.

    :param redirect:
        A value normally supplied by ``next`` form field. Gets preference
        before the default view which requires the user.

    :param user:
        A ``User`` object specifying the user who has just signed in.

    :return: String containing the URI to redirect to.

    """
    if redirect:
        return redirect
    elif user is not None:
        return accounts_settings.ACCOUNTS_SIGNIN_REDIRECT_URL % \
                {'username': user.username}
    else:
        return settings.LOGIN_REDIRECT_URL


def generate_sha1(string, salt=None):
    """
    Generates a sha1 hash for supplied string. Doesn't need to be very secure
    because it's not used for password checking. We got Django for that.

    :param string:
        The string that needs to be encrypted.

    :param salt:
        Optionally define your own salt. If none is supplied, will use a random
        string of 5 characters.

    :return: Tuple containing the salt and hash.

    """
    if not salt:
        salt = sha_constructor(str(random.random())).hexdigest()[:5]
    hashval = sha_constructor(salt + str(string)).hexdigest()

    return (salt, hashval)


def get_profile_model():
    """
    Return the model class for the currently-active user profile
    model, as defined by the ``AUTH_PROFILE_MODULE`` setting.

    :return: The model that is used as profile.

    """
    if hasattr(settings, 'AUTH_PROFILE_MODULE') and \
           settings.AUTH_PROFILE_MODULE:
        profile_mod = get_model(*settings.AUTH_PROFILE_MODULE.split('.'))
        if profile_mod is None:
            raise SiteProfileNotAvailable
        return profile_mod


def get_protocol():
    """
    Returns a string with the current protocol.

    This can be either 'http' or 'https' depending on ``ACCOUNTS_USE_HTTPS``
    setting.

    """
    protocol = 'http'
    if accounts_settings.ACCOUNTS_USE_HTTPS:
        protocol = 'https'
    return protocol


def get_datetime_now():
    """
    Returns datetime object with current point in time.

    In Django 1.4+ it uses Django's django.utils.timezone.now() which returns
    an aware or naive datetime that represents the current point in time
    when ``USE_TZ`` in project's settings is True or False respectively.
    In older versions of Django it uses datetime.datetime.now().

    """
    try:
        from django.utils import timezone
        return timezone.now()  # pragma: no cover
    except ImportError:  # pragma: no cover
        import datetime
        return datetime.datetime.now()
