from django import forms
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import Group
from django.utils.safestring import mark_safe
from django.contrib.auth import get_user_model

from . import settings as accounts_settings

attrs_dict = {'class': 'required'}

USERNAME_RE = r'^[\.\w]+$'


class PasswordLinkWidget(forms.Widget):
    def render(self, name, value, attrs=None):
        return mark_safe(u'<a href="../password/" id="password-link">Change</a>')


class UserForm(forms.ModelForm):
    password = forms.CharField(required=False, widget=PasswordLinkWidget())
    groups = forms.ModelMultipleChoiceField(required=False,
                queryset=Group.objects.all().order_by('name'))

    def clean(self):
        if self.is_valid():
            self.cleaned_data['password'] = self.instance.password
            return self.cleaned_data

        if hasattr(self, 'cleaned_data'):
            return self.cleaned_data
        else:
            return {}

    class Meta:
        model = get_user_model()
        exclude = []


class SignupModelForm(forms.ModelForm):
    """
    Form for creating a new user account.
    Validates that the requested username and e-mail is not already in use.
    Also requires the password to be entered twice.
    """
    first_name = forms.CharField(label=_('First name'), max_length=30)
    last_name = forms.CharField(label=_('Last name'), max_length=30)
    username = forms.RegexField(regex=USERNAME_RE,
                                max_length=30,
                                widget=forms.TextInput(attrs=attrs_dict),
                                label=_("Username"),
                                error_messages={'invalid': _('Username must contain only letters, numbers, dots and underscores.')})
    email = forms.EmailField(widget=forms.TextInput(attrs=dict(attrs_dict,
                                                               maxlength=75)),
                             label=_("Email"))
    password1 = forms.CharField(widget=forms.PasswordInput(attrs=attrs_dict,
                                                           render_value=False),
                                label=_("Create password"))
    password2 = forms.CharField(widget=forms.PasswordInput(attrs=attrs_dict,
                                                           render_value=False),
                                label=_("Repeat password"))

    def clean_username(self):
        """
        Validate that the username is alphanumeric and is not already in use.
        Also validates that the username is not listed in
        ACCOUNTS_FORBIDDEN_USERNAMES list.
        """
        try:
            get_user_model().objects.get(
                username__iexact=self.cleaned_data['username'])
        except get_user_model().DoesNotExist:
            pass
        else:
            raise forms.ValidationError(_('This username is already taken.'))
        if self.cleaned_data['username'].lower() in accounts_settings.ACCOUNTS_FORBIDDEN_USERNAMES:
            raise forms.ValidationError(_('This username is not allowed.'))
        return self.cleaned_data['username']

    def clean_email(self):
        """
        Validate that the e-mail address is unique.
        """
        if get_user_model().objects.filter(
            email__iexact=self.cleaned_data['email']):
            raise forms.ValidationError(_('This email is already in use. Please supply a different email.'))
        return self.cleaned_data['email']

    def clean(self):
        """
        Validates that the values entered into the two password fields match.
        Note that an error here will end up in ``non_field_errors()`` because
        it doesn't apply to a single field.
        """
        if 'password1' in self.cleaned_data and 'password2' in self.cleaned_data:
            if self.cleaned_data['password1'] != self.cleaned_data['password2']:
                raise forms.ValidationError(_('The two password fields didn\'t match.'))
        return self.cleaned_data

    def save(self):
        """ Creates a new user and account. Returns the newly created user. """
        username, email, password, first_name, last_name = (self.cleaned_data['username'],
                                     self.cleaned_data['email'],
                                     self.cleaned_data['password1'],
                                     self.cleaned_data['first_name'],
                                     self.cleaned_data['last_name'],)

        new_user = get_user_model()(username=username,
                                 email=email,
                                 first_name=first_name,
                                 last_name=last_name)
        new_user.set_password(password)
        new_user.save()
        return new_user


    class Meta:
        model = get_user_model()
        fields = ('first_name', 'last_name', 'username',
                  'email', 'password1', 'password2')
