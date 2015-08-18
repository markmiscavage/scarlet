from django import forms
from django.db.models import Q, F
from django.core.validators import EMPTY_VALUES

from . import widgets

class BaseFilterForm(forms.Form):
    """
    A base filter form. Implementing classes should
    define their own filter fields.
    """
    exclude = []
    search_fields = None
    SEARCH_KEY = 'search'

    def get_filter_fields(self, exclude=None):
        """
        Get the fields that are normal filter fields
        """

        exclude_set = set(self.exclude)
        if exclude:
            exclude_set = exclude_set.union(set(exclude))

        return [name for name in self.fields
                if name not in exclude_set]

    def get_search_fields(self, exclude=None):
        """
        Get the fields for searching for an item.
        """
        exclude = set(exclude)
        if self.search_fields and len(self.search_fields) > 1:
            exclude = exclude.union(self.search_fields)

        return self.get_filter_fields(exclude=exclude)

    def get_filter_kwargs(self):
        """
        Translates the cleaned data into a dictionary
        that can used to generate the filter removing
        blank values.
        """
        if self.is_valid():
            filter_kwargs = {}
            for field in self.get_filter_fields():
                empty_values = EMPTY_VALUES
                if hasattr(self.fields[field], 'empty_values'):
                    empty_values = self.fields[field].empty_values

                value = self.cleaned_data.get(field)
                if not value in empty_values:
                    if self.search_fields and field in self.search_fields:
                        filter_kwargs["%s__icontains" % field] = value
                    else:
                        filter_kwargs[field] = value
            return filter_kwargs
        else:
            return {}

    def get_filter(self):
        """
        Returns a list of Q objects
        that is created by passing for the keyword arguments
        from `self.get_filter_kwargs`.

        If search_fields are specified and we received
        a seach query all search_fields will be queried use
        using OR (|) for that term and any specific terms for
        those search_fields will be ignored.

        Returns an empty list if there is nothing to filter on.
        """

        args = []
        filter_kwargs = self.get_filter_kwargs()
        search = filter_kwargs.pop('search', None)
        if search and self.search_fields:
            search_args = []
            for f in self.search_fields:
                k = '%s__icontains' % f
                filter_kwargs.pop(k, None)
                q = Q(**{k: search})
                if search_args:
                    q = search_args[0] | q
                    search_args[0] = q
                else:
                    search_args.append(q)
            args.append(search_args[0])

        if filter_kwargs:
            args.append(Q(**filter_kwargs))

        return args


class VersionFilterForm(BaseFilterForm):
    DRAFT = 'draft'
    LIVE = 'live'
    SCHEDULED = 'scheduled'

    exclude = ('item_status',)

    item_status = forms.ChoiceField(required=False,
        choices=(
            ('', 'All'),
            (DRAFT, 'Has unpublished changes'),
            (LIVE, 'Is Live'),
            (SCHEDULED, 'Is scheduled')
    ))

    def get_status_filter(self):
        q = None
        if self.is_valid():
            ftype = self.cleaned_data.get('item_status')
            if ftype == self.DRAFT:
                q = Q(is_published=False)|Q(last_save__gt=F('last_scheduled'))
            elif ftype == self.LIVE:
                q = Q(last_save=F('last_scheduled'),
                      last_scheduled=F('v_last_save'))
            elif ftype == self.SCHEDULED:
                q = Q(last_save=F('last_scheduled'),
                      last_scheduled__gt=F('v_last_save'))
        return q

    def get_filter(self):
        l = super(VersionFilterForm, self).get_filter()
        q = self.get_status_filter()
        if q:
            l.append(q)
        return l


def search_form(*fields, **kwargs):
    """
    Construct a search form filter form using the fields
    provided as arguments to this function.

    By default a field will be created for each field passed
    and hidden field will be created for search. If you pass
    the key work argument `search_only` then only a visible
    search field will be created on the form.

    Passing `status_filter` will include a version status filter
    on this form.
    """

    fdict = {
        'search_fields': set(fields)
    }

    if kwargs.get('search_only'):
        fdict['search'] = forms.CharField(max_length=255, required=False)
    else:
        fdict['search'] = forms.CharField(max_length=255, required=False,
                                          widget=forms.HiddenInput)
        for f in fields:
            fdict[f] = forms.CharField(max_length=255, required=False)

    if kwargs.get('status_filter', False):
        return type("filterform", (VersionFilterForm,), fdict)
    else:
        return type("filterform", (BaseFilterForm,), fdict)

class HiddenObjectForm(forms.ModelForm):
    """
    Base form with no fields. Meant for use with formsets.
    """
    class Meta:
        fields = []


class WhenForm(forms.Form):
    """
    Base form for actions that are date based.
    Set a 'when' DateTimeField that is not required.
    """

    when = forms.DateTimeField(widget=widgets.RadioDateTimeWidget)


class MassActionForm(forms.ModelForm):
    selected = forms.BooleanField(required=False)



class ActionForm(forms.Form):
    action = forms.ChoiceField(label=('Action:'))



class LazyFormSetFactory(object):
    """
    Wrapper class for formset factories, for use with FormView.

    To create a formset, you create an instance of this class
    where the first argument is the factory function. Any other
    arguments will get passed to the factory function when it
    gets called.

    ::

        LazyFormSetFactory(inlineformset_factory, models.Parent, models.Child)

    """

    def __init__(self, *args, **kwargs):
        assert len(args) > 0, "You must provide at least one argument"
        assert callable(args[0]), "The first argument must be a formset factory"
        self.args = args
        self.kwargs = kwargs
        if 'extra' not in self.kwargs:
            self.kwargs['extra'] = 0

    def __call__(self, callback, form_processor):
        """
        Return a formset class. Uses the factory function
        that was specified on initialization.

        :param callback: A callable that will be used as the \
        *formfield_callback*.
        :param form_processor: A callable that will be used to \
        prep the form before the factory is called.
        """

        self.kwargs['formfield_callback'] = callback
        if 'form' in self.kwargs:
            self.kwargs['form'] = form_processor(self.kwargs['form'])
        return self.args[0](*self.args[1:], **self.kwargs)
