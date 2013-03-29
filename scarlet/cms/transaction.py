
try:
    try:
        from ..versioning.transactions import xact as commit_on_success
    except ValueError:
        from versioning.transactions import xact as commit_on_success
except ImportError:
    from django.db.transaction import commit_on_success
