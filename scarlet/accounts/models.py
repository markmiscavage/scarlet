import datetime

from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.sites.models import Site
from django.core.mail import send_mail

from .utils import generate_sha1, get_protocol, get_datetime_now, \
  get_user_model, user_model_label
from .managers import AccountsManager, AccountsBaseProfileManager
from .import settings as accounts_settings

PROFILE_PERMISSIONS = (
            ('view_profile', 'Can view profile'),
)


class AccountsSignup(models.Model):
    """
    Accounts model which stores all the necessary information to have a full
    functional user implementation on your Django website.

    """
    user = models.OneToOneField(user_model_label,
                                verbose_name=_('user'),
                                related_name='accounts_signup')

    last_active = models.DateTimeField(_('last active'),
                                       blank=True,
                                       null=True,
                                       help_text=_('The last date that the user was active.'))

    activation_key = models.CharField(_('activation key'),
                                      max_length=40,
                                      blank=True)

    activation_notification_send = models.BooleanField(_('notification send'),
                                                       default=False,
                                                       help_text=_('Designates whether this user has already got a notification about activating their account.'))

    email_unconfirmed = models.EmailField(_('unconfirmed email address'),
                                          blank=True,
                                          help_text=_('Temporary email address when the user requests an email change.'))

    email_confirmation_key = models.CharField(_('unconfirmed email verification key'),
                                              max_length=40,
                                              blank=True)

    email_confirmation_key_created = models.DateTimeField(_('creation date of email confirmation key'),
                                                          blank=True,
                                                          null=True)

    objects = AccountsManager()

    class Meta:
        verbose_name = _('accounts registration')
        verbose_name_plural = _('accounts registrations')

    def __unicode__(self):
        return '%s' % self.user.username

    def change_email(self, email):
        """
        Changes the email address for a user.

        A user needs to verify this new email address before it becomes
        active. By storing the new email address in a temporary field --
        ``temporary_email`` -- we are able to set this email address after the
        user has verified it by clicking on the verification URI in the email.
        This email gets send out by ``send_verification_email``.

        :param email:
            The new email address that the user wants to use.

        """
        self.email_unconfirmed = email

        salt, hash_val = generate_sha1(self.user.username)
        self.email_confirmation_key = hash_val
        self.email_confirmation_key_created = get_datetime_now()
        self.save()

        # Send email for activation
        self.send_confirmation_email()

    def send_confirmation_email(self):
        """
        Sends an email to confirm the new email address.

        This method sends out two emails. One to the new email address that
        contains the ``email_confirmation_key`` which is used to verify this
        this email address with :func:`AccountsUser.objects.confirm_email`.

        The other email is to the old email address to let the user know that
        a request is made to change this email address.

        """
        context = {'user': self.user,
                  'without_usernames': accounts_settings.ACCOUNTS_WITHOUT_USERNAMES,
                  'new_email': self.email_unconfirmed,
                  'protocol': get_protocol(),
                  'confirmation_key': self.email_confirmation_key,
                  'site': Site.objects.get_current()}

        # Email to the old address
        subject_old = render_to_string('accounts/emails/confirmation_email_subject_old.txt',
                                       context)
        subject_old = ''.join(subject_old.splitlines())

        message_old = render_to_string('accounts/emails/confirmation_email_message_old.txt',
                                       context)

        send_mail(subject_old,
                  message_old,
                  settings.DEFAULT_FROM_EMAIL,
                  [self.user.email])

        # Email to the new address
        subject_new = render_to_string('accounts/emails/confirmation_email_subject_new.txt',
                                       context)
        subject_new = ''.join(subject_new.splitlines())

        message_new = render_to_string('accounts/emails/confirmation_email_message_new.txt',
                                       context)

        send_mail(subject_new,
                  message_new,
                  settings.DEFAULT_FROM_EMAIL,
                  [self.email_unconfirmed])

    def activation_key_expired(self):
        """
        Checks if activation key is expired.

        Returns ``True`` when the ``activation_key`` of the user is expired and
        ``False`` if the key is still valid.

        The key is expired when it's set to the value defined in
        ``ACCOUNTS_ACTIVATED`` or ``activation_key_created`` is beyond the
        amount of days defined in ``ACCOUNTS_ACTIVATION_DAYS``.

        """
        expiration_days = datetime.timedelta(days=accounts_settings.ACCOUNTS_ACTIVATION_DAYS)
        expiration_date = self.user.date_joined + expiration_days
        if self.activation_key == accounts_settings.ACCOUNTS_ACTIVATED:
            return True
        if get_datetime_now() >= expiration_date:
            return True
        return False

    def send_activation_email(self):
        """
        Sends a activation email to the user.

        This email is send when the user wants to activate their newly created
        user.

        """
        context = {'user': self.user,
                  'without_usernames': accounts_settings.ACCOUNTS_WITHOUT_USERNAMES,
                  'protocol': get_protocol(),
                  'activation_days': accounts_settings.ACCOUNTS_ACTIVATION_DAYS,
                  'activation_key': self.activation_key,
                  'site': Site.objects.get_current()}

        subject = render_to_string('accounts/emails/activation_email_subject.txt',
                                   context)
        subject = ''.join(subject.splitlines())

        message = render_to_string('accounts/emails/activation_email_message.txt',
                                   context)
        send_mail(subject,
                  message,
                  settings.DEFAULT_FROM_EMAIL,
                  [self.user.email])

    def send_welcome_email(self):
        """
        Sends a welcome email to the user.
        """
        context = {'user': self.user,
                  'without_usernames': accounts_settings.ACCOUNTS_WITHOUT_USERNAMES,
                  'protocol': get_protocol(),
                  'site': Site.objects.get_current()}

        subject = render_to_string('accounts/emails/welcome_email_subject.txt',
                                   context)
        subject = ''.join(subject.splitlines())

        message = render_to_string('accounts/emails/welcome_email_message.txt',
                                   context)
        send_mail(subject,
                  message,
                  settings.DEFAULT_FROM_EMAIL,
                  [self.user.email])


class AccountsBaseProfile(models.Model):
    """ Base model needed for extra profile functionality """
    objects = AccountsBaseProfileManager()

    class Meta:
        """
        Meta options making the model abstract and defining permissions.

        The model is ``abstract`` because it only supplies basic functionality
        to a more custom defined model that extends it. This way there is not
        another join needed.

        We also define custom permissions because we don't know how the model
        that extends this one is going to be called. So we don't know what
        permissions to check. For ex. if the user defines a profile model that
        is called ``MyProfile``, than the permissions would be
        ``add_myprofile`` etc. We want to be able to always check
        ``add_profile``, ``change_profile`` etc.

        """
        abstract = True
        permissions = PROFILE_PERMISSIONS

    def __unicode__(self):
        return 'Profile of %(username)s' % {'username': self.user.username}

    def get_full_name_or_username(self):
        """
        Returns the full name of the user, or if none is supplied will return
        the username.

        Also looks at ``ACCOUNTS_WITHOUT_USERNAMES`` settings to define if it
        should return the username or email address when the full name is not
        supplied.

        :return:
            ``String`` containing the full name of the user. If no name is
            supplied it will return the username or email address depending on
            the ``ACCOUNTS_WITHOUT_USERNAMES`` setting.

        """
        user = self.user
        if user.first_name or user.last_name:
            # We will return this as translated string. Maybe there are some
            # countries that first display the last name.
            name = _("%(first_name)s %(last_name)s") % \
                {'first_name': user.first_name,
                 'last_name': user.last_name}
        else:
            # Fallback to the username if usernames are used
            if not accounts_settings.ACCOUNTS_WITHOUT_USERNAMES:
                name = "%(username)s" % {'username': user.username}
            else:
                name = "%(email)s" % {'email': user.email}
        return name.strip()

    def can_view_profile(self, user):
        """
        Can the :class:`User` view this profile?

        Returns a boolean if a user has the rights to view the profile of this
        user.

        Users are divided into four groups:

            ``Open``
                Everyone can view your profile

            ``Closed``
                Nobody can view your profile.

            ``Registered``
                Users that are registered on the website and signed
                in only.

            ``Admin``
                Special cases like superadmin and the owner of the profile.

        Through the ``privacy`` field a owner of an profile can define what
        they want to show to whom.

        :param user:
            A Django :class:`User` instance.

        """

        # Fallback to closed profile.
        return True
