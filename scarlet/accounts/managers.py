import re

from django.db import models
from django.contrib.auth.models import UserManager, Permission
from django.contrib.contenttypes.models import ContentType

from .import settings as accounts_settings
from .utils import generate_sha1, get_profile_model, get_user_model
from .import signals as accounts_signals

SHA1_RE = re.compile('^[a-f0-9]{40}$')

ASSIGNED_PERMISSIONS = {
    'profile':
        (('view_profile', 'Can view profile'),
         ('change_profile', 'Can change profile'),
         ('delete_profile', 'Can delete profile')),
    'user':
        (('change_user', 'Can change user'),
         ('delete_user', 'Can delete user'))
}


class AccountsManager(UserManager):

    def create_user(self, username, email, password,
                    first_name=None, last_name=None,
                    active=False,
                    send_email=True,
                    welcome_email=False):
        """
        A simple wrapper that creates a new :class:`User`.

        :param username:
            String containing the username of the new user.

        :param email:
            String containing the email address of the new user.

        :param password:
            String containing the password for the new user.

        :param active:
            Boolean that defines if the user requires activation by clicking
            on a link in an e-mail. Defaults to ``False``.

        :param send_email:
            Boolean that defines if the user should be send an email. You could
            set this to ``False`` when you want to create a user in your own
            code, but don't want the user to activate through email.

        :return: :class:`User` instance representing the new user.

        """
        new_user = get_user_model().objects.create_user(
            username, email, password)
        new_user.first_name = first_name
        new_user.last_name = last_name
        new_user.is_active = active
        new_user.is_staff = True    # assume staff usage
        new_user.save()

        accounts_profile = self.create_accounts_profile(new_user)

        # All users have an empty profile
        profile_model = get_profile_model()
        if profile_model:
            try:
                new_profile = new_user.get_profile()
            except profile_model.DoesNotExist:
                new_profile = profile_model(user=new_user)
                new_profile.save(using=self._db)

        # Give permissions to view and change profile
        for perm in ASSIGNED_PERMISSIONS['profile']:
            pass
            #assign(perm[0], new_user, new_profile)

        # Give permissions to view and change itself
        for perm in ASSIGNED_PERMISSIONS['user']:
            pass
            #assign(perm[0], new_user, new_user)

        if send_email:
            accounts_profile.send_activation_email()

        if welcome_email:
            accounts_profile.send_welcome_email()

        return new_user

    def create_accounts_profile(self, user):
        """
        Creates an :class:`AccountsSignup` instance for this user.

        :param user:
            Django :class:`User` instance.

        :return: The newly created :class:`AccountsSignup` instance.

        """
        if isinstance(user.username, unicode):
            user.username = user.username.encode('utf-8')
        salt, activation_key = generate_sha1(user.username)

        return self.create(user=user,
                           activation_key=activation_key)

    def activate_user(self, activation_key):
        """
        Activate an :class:`User` by supplying a valid ``activation_key``.

        If the key is valid and an user is found, activates the user and
        return it. Also sends the ``activation_complete`` signal.

        :param activation_key:
            String containing the secret SHA1 for a valid activation.

        :return:
            The newly activated :class:`User` or ``False`` if not successful.

        """
        if SHA1_RE.search(activation_key):
            try:
                accounts = self.get(activation_key=activation_key)
            except self.model.DoesNotExist:
                return False
            if not accounts.activation_key_expired():
                accounts.activation_key = accounts_settings.ACCOUNTS_ACTIVATED
                user = accounts.user
                user.is_active = True
                accounts.save(using=self._db)
                user.save(using=self._db)

                # Send the activation_complete signal
                accounts_signals.activation_complete.send(sender=None,
                                                         user=user)

                return user
        return False

    def confirm_email(self, confirmation_key):
        """
        Confirm an email address by checking a ``confirmation_key``.

        A valid ``confirmation_key`` will set the newly wanted e-mail
        address as the current e-mail address. Returns the user after
        success or ``False`` when the confirmation key is
        invalid. Also sends the ``confirmation_complete`` signal.

        :param confirmation_key:
            String containing the secret SHA1 that is used for verification.

        :return:
            The verified :class:`User` or ``False`` if not successful.

        """
        if SHA1_RE.search(confirmation_key):
            try:
                accounts = self.get(email_confirmation_key=confirmation_key,
                                   email_unconfirmed__isnull=False)
            except self.model.DoesNotExist:
                return False
            else:
                user = accounts.user
                old_email = user.email
                user.email = accounts.email_unconfirmed
                accounts.email_unconfirmed, accounts.email_confirmation_key = '', ''
                accounts.save(using=self._db)
                user.save(using=self._db)

                # Send the confirmation_complete signal
                accounts_signals.confirmation_complete.send(sender=None,
                                                           user=user,
                                                           old_email=old_email)

                return user

        return False

    def delete_expired_users(self):
        """
        Checks for expired users and delete's the ``User`` associated with
        it. Skips if the user ``is_staff``.

        :return: A list containing the deleted users.

        """
        deleted_users = []
        for user in get_user_model().objects.filter(is_staff=False,
                                                    is_active=False):
            if user.accounts_signup.activation_key_expired():
                deleted_users.append(user)
                user.delete()
        return deleted_users

    def disable_user(self, user_id):
        """
        Disables user by setting inactive
        """
        try:
            accounts = self.get(pk=user_id)
        except self.model.DoesNotExist:
            return False

        user = accounts.user
        user.is_active = False
        user.save()
        return True

    def check_permissions(self):
        """
        Checks that all permissions are set correctly for the users.

        :return: A set of users whose permissions was wrong.

        """
        # Variable to supply some feedback
        changed_permissions = []
        changed_users = []
        warnings = []

        # Check that all the permissions are available.
        for model, perms in ASSIGNED_PERMISSIONS.items():
            if model == 'profile':
                model_obj = get_profile_model()
            else:
                model_obj = get_user_model()
            model_content_type = ContentType.objects.get_for_model(model_obj)
            for perm in perms:
                try:
                    Permission.objects.get(codename=perm[0],
                                           content_type=model_content_type)
                except Permission.DoesNotExist:
                    changed_permissions.append(perm[1])
                    Permission.objects.create(name=perm[1],
                                              codename=perm[0],
                                              content_type=model_content_type)

        return (changed_permissions, changed_users, warnings)


class AccountsBaseProfileManager(models.Manager):
    """ Manager for :class:`AccountsProfile` """
    def get_visible_profiles(self, user=None):
        """
        Returns all the visible profiles available to this user.

        For now keeps it simple by just applying the cases when a user is not
        active, a user has it's profile closed to everyone or a user only
        allows registered users to view their profile.

        :param user:
            A Django :class:`User` instance.

        :return:
            All profiles that are visible to this user.

        """
        profiles = self.all()

        filter_kwargs = {'user__is_active': True}

        profiles = profiles.filter(**filter_kwargs)

        return profiles
