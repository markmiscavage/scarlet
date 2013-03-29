from . import manager
from . import models

SESSION_KEY = 'show_drafts'


class StateMiddleware:
    """
    Middleware that sets state to published unless
    an active staff user is logged in and has flagged
    show drafts in their session.
    """

    def process_request(self, request):
        state = models.BaseVersionedModel.PUBLISHED
        if request.user.is_staff:
            state = request.session.get(SESSION_KEY,
                        models.BaseVersionedModel.DRAFT)

        manager.activate(state)

    def process_response(self, request, response):
        manager.deactivate()
        return response
