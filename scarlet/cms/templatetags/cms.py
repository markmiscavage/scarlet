from django.template.defaulttags import kwarg_re
from django.template import Library, TemplateSyntaxError, Node
from django.utils.encoding import smart_str

try:
    from django.contrib.auth import get_user_model
except ImportError:
    from django.contrib.auth.models import User
else:
    User = get_user_model()

register = Library()


class URLNode(Node):
    def __init__(self, bundle, view_name, kwargs, asvar):
        self.bundle = bundle
        self.view_name = view_name
        self.kwargs = kwargs
        self.asvar = asvar

    def render(self, context):
        from django.core.urlresolvers import NoReverseMatch

        url = ''

        # Resolve vars
        kwargs = dict([(smart_str(k, 'ascii'), v.resolve(context))
                       for k, v in self.kwargs.items()])
        follow_parent = kwargs.pop('follow_parent', True)
        bundle = self.bundle.resolve(context)
        url_params = context['url_params']

        view_name = self.view_name.resolve(context)
        # Try to get the url
        try:
            url = bundle.get_view_url(view_name, context['user'],
                                      url_kwargs=kwargs,
                                      context_kwargs=url_params,
                                      follow_parent=follow_parent)
        except NoReverseMatch:
            pass

        if self.asvar:
            context[self.asvar] = url
            return ''
        else:
            return url


class ViewNode(Node):

    def __init__(self, bundle, view_name, asvar):
        self.bundle = bundle
        self.view_name = view_name
        self.asvar = asvar

    def render(self, context):

        bundle = self.bundle.resolve(context)
        url_params = context['url_params']
        view_name = self.view_name.resolve(context)

        # Get the string
        resp = bundle.get_string_from_view(context['request'],
                                           view_name, url_params)

        if self.asvar:
            context[self.asvar] = resp
            return ''
        else:
            return resp


class StringNode(Node):
    def __init__(self, viewname, kwargs):
        self.viewname = viewname
        self.kwargs = kwargs

    def render(self, context):

        modules = self.viewname.split('.')
        if len(modules) == 1:
            module = modules[0]
            view = __import__(module, globals(), locals(), [], -1)
        else:
            module = '.'.join(modules[:-1])
            view_name = str(modules[-1])
            module = __import__(module, globals(), locals(), [view_name], -1)
            view = getattr(module, view_name)

        kwargs = dict([(smart_str(k, 'ascii'), v.resolve(context))
                       for k, v in self.kwargs.items()])

        class_kwargs = {}
        for k,v in kwargs.items():
            if hasattr(view, k):
                class_kwargs[k] = v

        return view.as_string(**class_kwargs)(context['request'], **kwargs)


@register.tag
def render_view(parser, token):
    """
    Return an string version of a View with as_string method.
    First argument is the name of the view. Any other arguments
    should be keyword arguments and will be passed to the view.

    Example:

    {% render_view viewname var1=xx var2=yy %}
    """
    bits = token.split_contents()

    n = len(bits)
    if n < 2:
        raise TemplateSyntaxError("'%s' takes at least one view as argument")

    viewname = bits[1]

    kwargs = {}
    if n > 2:
        for bit in bits[2:]:
            match = kwarg_re.match(bit)
            if not match:
                raise TemplateSyntaxError("Malformed arguments to render_view tag")
            name, value = match.groups()
            if name:
                kwargs[name] = parser.compile_filter(value)

    return StringNode(viewname, kwargs)


@register.tag
def bundle_view(parser, token):
    """
    Returns an string version of a bundle view. This is done by
    calling the `get_string_from_view` method of the provided bundle.

    This tag expects that the request object as well as the
    the original url_params are available in the context.

    Requires two arguments bundle and the name of the view
    you want to render. In addition, this tag also accepts
    the 'as xxx' syntax.

    Example:

    {% bundle_url bundle main_list as html %}
    """

    bits = token.split_contents()
    if len(bits) < 3:
        raise TemplateSyntaxError("'%s' takes at least two arguments"
                                  " bundle and view_name" % bits[0])

    bundle = parser.compile_filter(bits[1])
    viewname = parser.compile_filter(bits[2])

    asvar = None
    bits = bits[2:]
    if len(bits) >= 2 and bits[-2] == 'as':
        asvar = bits[-1]
        bits = bits[:-2]

    return ViewNode(bundle, viewname, asvar)


@register.tag
def bundle_url(parser, token):
    """
    Returns an a url for given a bundle and a view name.
    This is done by calling the `get_view_url` method
    of the provided bundle.

    This tag expects that the request object as well as the
    the original url_params are available in the context.

    Requires two arguments bundle and the name of the view
    you want to render. In addition, this tag also accepts
    the 'as xxx' syntax.

    By default this tag will follow references to
    parent bundles. To stop this from happening pass
    `follow_parent=False`. Any other keyword arguments
    will be used as url keyword arguments.

    If no match is found a blank string will be returned.

    Example:

    {% bundle_url bundle "edit" obj=obj as html %}
    """

    bits = token.split_contents()
    if len(bits) < 3:
        raise TemplateSyntaxError("'%s' takes at least two arguments"
                                  " bundle and view_name" % bits[0])

    bundle = parser.compile_filter(bits[1])
    viewname = parser.compile_filter(bits[2])

    kwargs = {}
    asvar = None
    bits = bits[2:]
    if len(bits) >= 2 and bits[-2] == 'as':
        asvar = bits[-1]
        bits = bits[:-2]

    if len(bits):
        for bit in bits:
            match = kwarg_re.match(bit)
            if not match:
                raise TemplateSyntaxError("Malformed arguments to url tag")
            name, value = match.groups()
            if name:
                kwargs[name] = parser.compile_filter(value)

    return URLNode(bundle, viewname, kwargs, asvar)


@register.assignment_tag
def user_url(user, bundle):
    """
    Filter for a user object. Checks if a user has
    permission to change other users.
    """
    if not user:
        return False

    bundle = bundle.admin_site.get_bundle_for_model(User)
    edit = None

    if bundle:
        edit = bundle.get_view_url('main', user)
    return edit
