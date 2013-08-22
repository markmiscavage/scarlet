class Meta(object):
    """
    The options class for Bundle objects, every bundle will
    have an instance of this class as a _meta class attribute.

    The following options, if set, are passed to all view instances
    on the bundle. For more information on what each one does
    see the CMS Views documentation.

    * model
    * parent_field
    * parent_lookups
    * base_template
    * custom_model_name
    * custom_model_name_plural

    You can specify additional arguments to all view classes by
    setting a dictionary to `default_kwargs`. You can also specify
    additional arguments to just one view class by using FOO_kwargs.

    Other settings are not passed to views. These are:

    * **item_views** - A tuple of attribute names that should be \
    treated as item views. Meaning that they need additional url \
    keyword arguments to lookup their item. The regular expression \
    to use is set by `item_regex_base` or FOO_regex_base. \
    The order of the regular expressions in the resulting url \
    config matters, so the order specified here is preserved.
    * **item_regex_base** - A regular expression string for 'item \
    views'. This argument must take the string formatter %(name)s \
    followed by '_pk' to keep it distinct from any parent url arguments. \
    Defaults to  '(?P<%(name)s_pk>\d+)/'. You can modify the regex \
    for a particular view by adding a FOO_regex_base attribute to \
    your meta class. The base regex strings should use the string \
    formatters %(group_name)s and %(attname)s. As with the regular \
    regex base, %(group_name)s must be followed by '_pk' to keep \
    it distinct from any parent url arguments.
    * **live_views** - Live views are views that will have their \
    required groups set to the live_groups attribute of the bundle. \
    Set to 'delete' by default.
    * **primary_model_bundle** Specifies that this bundle is the \
    primary bundle for it's model. This allows the custom relationship \
    widgets to be used by other CMS views that contain fields that \
    reference this model.
    """

    view_attributes = (
        'model',
        'parent_field',
        'parent_lookups',
        'base_template',
        'custom_model_name',
        'custom_model_name_plural'
    )

    other_attributes = (
        'item_regex_base',
        'item_views',
        'live_views',
        'defaults',
        'default_kwargs',
        'primary_model_bundle',
        'action_views'
    )

    def __init__(self):
        self.primary_model_bundle = False

        # which items should use item_regex_base
        self.item_views = ('edit',)

        # which items are considered live actions
        self.live_views = ('delete',)

        # which items should be displayed as mass actions
        self.action_views = ('delete',)

        # The regex that should be used to match in
        # urls the value for %s is determined by the bundle
        self.item_regex_base = '(?P<%(name)s_pk>\d+)/'

        # the models that views are based on.
        # If not give all items are ignored.
        self.model = None

        # Custom model name if you don't want to use the default
        self.custom_model_name = None
        self.custom_model_name_plural = None

        # Optional: field on model that refers to a foreign key that must
        # be present in order to work on this bundle.
        self.parent_field = None

        # Optional: Any additional fields that you need to be
        # be included when finding a parent. Only used if parent_field is
        self.parent_lookups = None

        self.add_kwargs = {'force_add': True}

        # Kwargs that get passed to all views
        self.default_kwargs = {}

    def add_meta(self, meta):
        allowed = list(self.view_attributes)
        allowed.extend(list(self.other_attributes))

        if meta:
            for k in [x for x in dir(meta) \
                        if x in allowed or \
                        x.endswith('_kwargs') or \
                        x.endswith('_regex_base')]:

                v = getattr(meta, k)
                if type(v) == type({}) and getattr(self, k, None):
                    tmp = dict(getattr(self, k))
                    tmp.update(v)
                    v = tmp

                setattr(self, k, v)

    def get_kwargs_for_view(self, name):
        """
        Returns the full list of keyword arguments
        for the given view name as a dictionary.
        First the default_kwargs dictionary is copied.
        Then it is updated with the any of the 'view values'
        that can be specified directly on this instance. IE: models.
        Then that dictionary is updated with the values
        particular to this view names from the FOO_kwargs dictionary.
        """

        data = dict(self.default_kwargs)
        for k in self.view_attributes:
            if hasattr(self, k):
                data[k] = getattr(self, k)
        data.update(getattr(self, '%s_kwargs' % name, {}))
        return data


class VersionMeta(object):
    item_views = ('edit', 'versions')
    live_views = ('delete', 'publish', 'unpublish', 'versions')
    action_views = ('delete', 'publish', 'unpublish')

class Orderable(object):
    """
    Allows rows to be reordered on the 'main' list page.
    """
    main_kwargs = {'change_fields': ('order',),
                   'base_template': 'cms/base_bundle_view.html',
                   'can_sort': False}
