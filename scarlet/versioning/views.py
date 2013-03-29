from .middleware import SESSION_KEY
from django.shortcuts import redirect


def switch_state(request):
    """
    Switch the default version state in
    the session.
    """

    if request.session.get(SESSION_KEY):
        request.session[SESSION_KEY] = False
    else:
        request.session[SESSION_KEY] = True

    # Get redirect location
    # Don't go to non local paths
    url = request.GET.get('redirect_to', '/')
    if url.startswith('http'):
        url = '/'
    return redirect(url)
